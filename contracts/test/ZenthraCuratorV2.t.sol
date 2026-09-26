// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ZenthraCuratorV2} from "../src/ZenthraCuratorV2.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

// ─── Mock Helpers ────────────────────────────────────────────────────────────

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockIdentity is ERC721 {
    uint256 private _nextId = 1;

    constructor() ERC721("Agent", "AGENT") {}

    function mint(address to) external returns (uint256 id) {
        id = _nextId++;
        _mint(to, id);
    }
}

// ─── Invariant Handler ───────────────────────────────────────────────────────

contract CuratorHandler is Test {
    ZenthraCuratorV2 public curator;
    MockUSDC public usdc;
    MockIdentity public identity;

    address public owner;
    address public alice;
    address public bob;
    address public feeRecipient;

    uint256 public aliceAgentId;
    uint256 public lastTaskId;
    bool public taskOpen;
    bool public taskAccepted;

    uint256 public ghostPendingWithdrawals;

    constructor(
        ZenthraCuratorV2 _curator,
        MockUSDC _usdc,
        MockIdentity _identity,
        address _owner,
        address _alice,
        address _bob,
        address _feeRecipient
    ) {
        curator = _curator;
        usdc = _usdc;
        identity = _identity;
        owner = _owner;
        alice = _alice;
        bob = _bob;
        feeRecipient = _feeRecipient;

        // List alice's agent
        vm.startPrank(alice);
        aliceAgentId = identity.mint(alice);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        curator.listAgent(aliceAgentId, "https://agent.example", caps, 100e6, 0);
        vm.stopPrank();
    }

    function requestTask(uint256 amount) external {
        amount = bound(amount, 1e6, 1000e6);
        usdc.mint(bob, amount);
        vm.startPrank(bob);
        usdc.approve(address(curator), amount);
        curator.requestTask(aliceAgentId, amount);
        vm.stopPrank();
        lastTaskId = curator.getTask(0).agentId == 0 ? 0 : _latestTaskId();
        taskOpen = true;
        taskAccepted = false;
    }

    function acceptTask() external {
        if (!taskOpen || taskAccepted) return;
        uint256 tid = _latestTaskId();
        ZenthraCuratorV2.Task memory t = curator.getTask(tid);
        if (t.status != ZenthraCuratorV2.TaskStatus.Open) return;
        vm.prank(alice);
        try curator.acceptTask(tid) {
            taskAccepted = true;
        } catch {}
    }

    function completeTask() external {
        if (!taskAccepted) return;
        uint256 tid = _latestTaskId();
        ZenthraCuratorV2.Task memory t = curator.getTask(tid);
        if (t.status != ZenthraCuratorV2.TaskStatus.Accepted) return;
        vm.prank(alice);
        try curator.completeTask(tid) {
            ghostPendingWithdrawals += t.amount;
            taskOpen = false;
            taskAccepted = false;
        } catch {}
    }

    function cancelTask() external {
        if (!taskOpen) return;
        uint256 tid = _latestTaskId();
        ZenthraCuratorV2.Task memory t = curator.getTask(tid);
        if (t.status != ZenthraCuratorV2.TaskStatus.Open) return;
        vm.prank(bob);
        try curator.cancelTask(tid) {
            ghostPendingWithdrawals += t.amount;
            taskOpen = false;
            taskAccepted = false;
        } catch {}
    }

    function _latestTaskId() internal view returns (uint256) {
        // Walk backward to find most-recent non-default task
        // Since nextTaskId is private, use a stored counter approach
        // We'll use a simple brute-force over small range
        for (uint256 i = 50; i > 0; i--) {
            ZenthraCuratorV2.Task memory t = curator.getTask(i - 1);
            if (t.buyer != address(0)) return i - 1;
        }
        return 0;
    }
}

// ─── Main Test Contract ───────────────────────────────────────────────────────

contract ZenthraCuratorV2Test is Test {
    ZenthraCuratorV2 internal curator;
    MockUSDC internal usdc;
    MockIdentity internal identity;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");   // agent owner
    address internal bob = makeAddr("bob");       // buyer
    address internal carol = makeAddr("carol");   // third party
    address internal feeRecipient = makeAddr("feeRecipient");

    // Config constants
    uint16 internal constant FEE_BPS = 500;           // 5%
    uint256 internal constant FEATURED_PRICE = 10e6;  // 10 USDC/day
    uint256 internal constant STAKE_AMOUNT = 5e6;     // 5 USDC optional bond
    uint256 internal constant DISPUTE_TIMEOUT = 7 days;
    uint256 internal constant MIN_TASK = 1e6;         // 1 USDC
    uint32  internal constant MAX_TASKS = 5;
    uint256 internal constant ACCEPT_TIMEOUT = 1 days;

    uint256 internal constant TASK_AMOUNT = 10e6; // 10 USDC

    // ── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        usdc = new MockUSDC();
        identity = new MockIdentity();

        curator = new ZenthraCuratorV2(
            address(identity),   // identityRegistry_
            address(usdc),       // usdc_
            feeRecipient,        // feeRecipient_
            FEE_BPS,             // protocolFeeBps_
            FEATURED_PRICE,      // featuredPricePerDay_
            STAKE_AMOUNT,        // optionalStakeAmount_
            DISPUTE_TIMEOUT,     // disputeTimeout_
            MIN_TASK,            // minTaskAmount_
            MAX_TASKS,           // maxConcurrentTasksPerBuyer_
            ACCEPT_TIMEOUT,      // taskAcceptTimeout_
            owner                // initialOwner
        );

        // Fund alice (agent) and bob (buyer) with USDC
        usdc.mint(alice, 1000e6);
        usdc.mint(bob, 1000e6);
        usdc.mint(carol, 1000e6);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    /// Mint agent NFT to alice and list with bond=STAKE_AMOUNT
    function _listAlice() internal returns (uint256 agentId) {
        vm.startPrank(alice);
        agentId = identity.mint(alice);
        usdc.approve(address(curator), STAKE_AMOUNT);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        curator.listAgent(agentId, "https://agent.example", caps, 100e6, STAKE_AMOUNT);
        vm.stopPrank();
    }

    /// List with zero bond (when optionalStakeAmount == 0)
    function _listAliceFree() internal returns (uint256 agentId) {
        // deploy fresh curator with optionalStakeAmount=0
        ZenthraCuratorV2 c2 = new ZenthraCuratorV2(
            address(identity), address(usdc), feeRecipient,
            FEE_BPS, FEATURED_PRICE,
            0,              // no mandatory bond
            DISPUTE_TIMEOUT, MIN_TASK, MAX_TASKS, ACCEPT_TIMEOUT, owner
        );
        vm.startPrank(alice);
        agentId = identity.mint(alice);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        c2.listAgent(agentId, "https://agent.example", caps, 100e6, 0);
        vm.stopPrank();
        return agentId;
    }

    /// List alice (on main curator) and have bob request a task, return (agentId, taskId)
    function _listedAndRequested() internal returns (uint256 agentId, uint256 taskId) {
        agentId = _listAlice();
        vm.startPrank(bob);
        usdc.approve(address(curator), TASK_AMOUNT);
        curator.requestTask(agentId, TASK_AMOUNT);
        vm.stopPrank();
        taskId = 0; // first task
    }

    /// List, request, and accept a task
    function _listedRequestedAccepted() internal returns (uint256 agentId, uint256 taskId) {
        (agentId, taskId) = _listedAndRequested();
        vm.prank(alice);
        curator.acceptTask(taskId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  LISTING TESTS
    // ═══════════════════════════════════════════════════════════════════════

    function test_listAgent_free() public {
        // Use a curator with optionalStakeAmount == 0
        ZenthraCuratorV2 c2 = new ZenthraCuratorV2(
            address(identity), address(usdc), feeRecipient,
            FEE_BPS, FEATURED_PRICE, 0,
            DISPUTE_TIMEOUT, MIN_TASK, MAX_TASKS, ACCEPT_TIMEOUT, owner
        );
        vm.startPrank(alice);
        uint256 agentId = identity.mint(alice);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        // No approval needed — zero bond
        c2.listAgent(agentId, "https://agent.example", caps, 100e6, 0);
        vm.stopPrank();

        ZenthraCuratorV2.AgentListing memory listing = c2.getAgent(agentId);
        assertEq(listing.owner, alice);
        assertTrue(listing.isActive);
        assertEq(listing.bondAmount, 0);
        assertEq(usdc.balanceOf(address(c2)), 0);
    }

    function test_listAgent_withBond() public {
        uint256 agentId = _listAlice();

        ZenthraCuratorV2.AgentListing memory listing = curator.getAgent(agentId);
        assertEq(listing.owner, alice);
        assertTrue(listing.isActive);
        assertEq(listing.bondAmount, STAKE_AMOUNT);
        assertEq(usdc.balanceOf(address(curator)), STAKE_AMOUNT);
        assertEq(curator.totalOptionalStakes(), STAKE_AMOUNT);
    }

    function test_listAgent_revert_notNftOwner() public {
        vm.prank(alice);
        uint256 agentId = identity.mint(alice);

        vm.startPrank(bob);
        usdc.approve(address(curator), STAKE_AMOUNT);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        vm.expectRevert(ZenthraCuratorV2.NotAgentOwner.selector);
        curator.listAgent(agentId, "https://agent.example", caps, 100e6, STAKE_AMOUNT);
        vm.stopPrank();
    }

    function test_listAgent_revert_alreadyListed() public {
        uint256 agentId = _listAlice();

        vm.startPrank(alice);
        usdc.approve(address(curator), STAKE_AMOUNT);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        vm.expectRevert(ZenthraCuratorV2.AlreadyListed.selector);
        curator.listAgent(agentId, "https://agent.example", caps, 100e6, STAKE_AMOUNT);
        vm.stopPrank();
    }

    function test_listAgent_revert_insufficientBond() public {
        vm.startPrank(alice);
        uint256 agentId = identity.mint(alice);
        usdc.approve(address(curator), STAKE_AMOUNT);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        // Bond below optionalStakeAmount (which is STAKE_AMOUNT=5e6)
        vm.expectRevert(ZenthraCuratorV2.InsufficientBond.selector);
        curator.listAgent(agentId, "https://agent.example", caps, 100e6, STAKE_AMOUNT - 1);
        vm.stopPrank();
    }

    function test_delistAgent_noOpenTasks_returnsStake() public {
        uint256 agentId = _listAlice();
        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        curator.delistAgent(agentId);

        assertEq(usdc.balanceOf(alice), aliceBefore + STAKE_AMOUNT);
        assertEq(curator.totalOptionalStakes(), 0);
        assertFalse(curator.isListed(agentId));
        assertEq(curator.getAllListedAgents().length, 0);
    }

    function test_delistAgent_revert_hasOpenTasks() public {
        (uint256 agentId,) = _listedAndRequested();

        vm.prank(alice);
        vm.expectRevert(ZenthraCuratorV2.HasOpenTasks.selector);
        curator.delistAgent(agentId);
    }

    function test_updateListing() public {
        uint256 agentId = _listAlice();

        string[] memory newCaps = new string[](2);
        newCaps[0] = "Code";
        newCaps[1] = "Ops";

        vm.expectEmit(true, false, false, true, address(curator));
        emit ZenthraCuratorV2.AgentUpdated(agentId, "https://new.endpoint", 999);

        vm.prank(alice);
        curator.updateListing(agentId, "https://new.endpoint", newCaps, 999);

        ZenthraCuratorV2.AgentListing memory listing = curator.getAgent(agentId);
        assertEq(listing.x402Endpoint, "https://new.endpoint");
        assertEq(listing.pricePerTask, 999);
        assertEq(listing.capabilities.length, 2);
    }

    function test_syncListingOwner() public {
        // alice lists
        uint256 agentId = _listAlice();

        // alice transfers NFT to bob
        vm.prank(alice);
        identity.transferFrom(alice, bob, agentId);

        // bob calls sync
        vm.expectEmit(true, true, true, false, address(curator));
        emit ZenthraCuratorV2.ListingOwnerSynced(agentId, alice, bob);
        vm.prank(bob);
        curator.syncListingOwner(agentId);

        // listing.owner is now bob
        ZenthraCuratorV2.AgentListing memory listing = curator.getAgent(agentId);
        assertEq(listing.owner, bob);

        // bob can now delist (gets the bond back)
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        curator.delistAgent(agentId);
        assertEq(usdc.balanceOf(bob), bobBefore + STAKE_AMOUNT);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  TASK HAPPY PATH
    // ═══════════════════════════════════════════════════════════════════════

    function test_requestTask_createsTask() public {
        uint256 agentId = _listAlice();

        vm.startPrank(bob);
        usdc.approve(address(curator), TASK_AMOUNT);

        vm.expectEmit(true, true, true, false, address(curator));
        emit ZenthraCuratorV2.TaskRequested(0, agentId, bob, alice, TASK_AMOUNT, uint64(block.timestamp));

        curator.requestTask(agentId, TASK_AMOUNT);
        vm.stopPrank();

        ZenthraCuratorV2.Task memory task = curator.getTask(0);
        assertEq(task.agentId, agentId);
        assertEq(task.buyer, bob);
        assertEq(task.agent, alice);
        assertEq(task.amount, TASK_AMOUNT);
        assertEq(uint8(task.status), uint8(ZenthraCuratorV2.TaskStatus.Open));
        assertEq(curator.totalEscrow(), TASK_AMOUNT);
    }

    function test_acceptTask_agentAccepts() public {
        (uint256 agentId, uint256 taskId) = _listedAndRequested();

        vm.expectEmit(true, true, true, false, address(curator));
        emit ZenthraCuratorV2.TaskAccepted(taskId, agentId, alice);

        vm.prank(alice);
        curator.acceptTask(taskId);

        ZenthraCuratorV2.Task memory task = curator.getTask(taskId);
        assertEq(uint8(task.status), uint8(ZenthraCuratorV2.TaskStatus.Accepted));
    }

    function test_completeTask_agentClaims() public {
        (uint256 agentId, uint256 taskId) = _listedRequestedAccepted();

        uint256 expectedFee = (TASK_AMOUNT * FEE_BPS) / 10_000;
        uint256 expectedPayout = TASK_AMOUNT - expectedFee;

        vm.expectEmit(true, true, true, true, address(curator));
        emit ZenthraCuratorV2.TaskCompleted(taskId, agentId, alice, expectedPayout, expectedFee);

        vm.prank(alice);
        curator.completeTask(taskId);

        // Check pull-claim balances
        assertEq(curator.pendingWithdrawals(alice), expectedPayout);
        assertEq(curator.pendingWithdrawals(feeRecipient), expectedFee);
        assertEq(curator.totalEscrow(), 0);
        assertEq(curator.totalPendingWithdrawals(), TASK_AMOUNT);

        // Alice claims
        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        curator.claimPayment();
        assertEq(usdc.balanceOf(alice), aliceBefore + expectedPayout);
        assertEq(curator.pendingWithdrawals(alice), 0);

        // feeRecipient claims
        uint256 feeBefore = usdc.balanceOf(feeRecipient);
        vm.prank(feeRecipient);
        curator.claimPayment();
        assertEq(usdc.balanceOf(feeRecipient), feeBefore + expectedFee);
    }

    function test_cancelTask_beforeAccept_buyerRefunded() public {
        (uint256 agentId, uint256 taskId) = _listedAndRequested();

        vm.expectEmit(true, true, true, true, address(curator));
        emit ZenthraCuratorV2.TaskCancelled(taskId, agentId, bob, TASK_AMOUNT);

        vm.prank(bob);
        curator.cancelTask(taskId);

        assertEq(curator.pendingWithdrawals(bob), TASK_AMOUNT);
        assertEq(curator.totalEscrow(), 0);

        // bob claims refund
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        curator.claimPayment();
        assertEq(usdc.balanceOf(bob), bobBefore + TASK_AMOUNT);
    }

    function test_cancelTask_afterAccept_afterDoubleTimeout() public {
        (, uint256 taskId) = _listedRequestedAccepted();

        // Warp past 2x taskAcceptTimeout
        vm.warp(block.timestamp + ACCEPT_TIMEOUT * 2 + 1);

        vm.prank(bob);
        curator.cancelTask(taskId);

        assertEq(curator.pendingWithdrawals(bob), TASK_AMOUNT);
    }

    function test_disputeTask_fromAccepted() public {
        (uint256 agentId, uint256 taskId) = _listedRequestedAccepted();

        vm.expectEmit(true, true, false, true, address(curator));
        emit ZenthraCuratorV2.TaskDisputed(taskId, agentId, bob);

        vm.prank(bob);
        curator.disputeTask(taskId);

        ZenthraCuratorV2.Task memory task = curator.getTask(taskId);
        assertEq(uint8(task.status), uint8(ZenthraCuratorV2.TaskStatus.Disputed));
    }

    function test_resolveDispute_payBuyer_withSlash() public {
        (uint256 agentId, uint256 taskId) = _listedRequestedAccepted();

        vm.prank(bob);
        curator.disputeTask(taskId);

        uint256 expectedFee = (TASK_AMOUNT * FEE_BPS) / 10_000;
        uint256 expectedPayout = TASK_AMOUNT - expectedFee;
        // slash = min(bond, amount * 500/10000) = min(5e6, 10e6 * 5%) = min(5e6, 500000) = 500000
        uint256 expectedSlash = (TASK_AMOUNT * 500) / 10_000; // 500000

        vm.expectEmit(true, false, false, true, address(curator));
        emit ZenthraCuratorV2.DisputeResolved(taskId, true, expectedPayout, expectedFee, expectedSlash);

        vm.prank(owner);
        curator.resolveDispute(taskId, true);

        assertEq(curator.pendingWithdrawals(bob), expectedPayout);
        assertEq(curator.pendingWithdrawals(feeRecipient), expectedFee + expectedSlash);

        // bond was partially slashed
        ZenthraCuratorV2.AgentListing memory listing = curator.getAgent(agentId);
        assertEq(listing.bondAmount, STAKE_AMOUNT - expectedSlash);
    }

    function test_resolveDispute_payAgent() public {
        (, uint256 taskId) = _listedRequestedAccepted();

        vm.prank(alice);
        curator.disputeTask(taskId);

        uint256 expectedFee = (TASK_AMOUNT * FEE_BPS) / 10_000;
        uint256 expectedPayout = TASK_AMOUNT - expectedFee;

        vm.prank(owner);
        curator.resolveDispute(taskId, false);

        assertEq(curator.pendingWithdrawals(alice), expectedPayout);
        assertEq(curator.pendingWithdrawals(feeRecipient), expectedFee);
    }

    function test_settleExpiredDispute_afterTimeout() public {
        (, uint256 taskId) = _listedRequestedAccepted();

        vm.prank(bob);
        curator.disputeTask(taskId);

        // Warp past disputeTimeout (measured from task.createdAt)
        ZenthraCuratorV2.Task memory t = curator.getTask(taskId);
        vm.warp(uint256(t.createdAt) + DISPUTE_TIMEOUT + 1);

        vm.expectEmit(true, false, false, true, address(curator));
        emit ZenthraCuratorV2.DisputeAutoResolved(taskId, TASK_AMOUNT);

        curator.settleExpiredDispute(taskId);

        assertEq(curator.pendingWithdrawals(bob), TASK_AMOUNT);
        assertEq(curator.totalEscrow(), 0);
    }

    function test_reclaimExpiredTask_afterAcceptTimeout() public {
        (, uint256 taskId) = _listedAndRequested();

        ZenthraCuratorV2.Task memory t = curator.getTask(taskId);
        // Warp just past taskAcceptTimeout
        vm.warp(uint256(t.createdAt) + ACCEPT_TIMEOUT + 1);

        vm.prank(bob);
        curator.reclaimExpiredTask(taskId);

        assertEq(curator.pendingWithdrawals(bob), TASK_AMOUNT);
        assertEq(curator.totalEscrow(), 0);

        ZenthraCuratorV2.Task memory done = curator.getTask(taskId);
        assertEq(uint8(done.status), uint8(ZenthraCuratorV2.TaskStatus.Cancelled));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  TASK REVERT PATHS
    // ═══════════════════════════════════════════════════════════════════════

    function test_requestTask_revert_notListed() public {
        vm.startPrank(bob);
        usdc.approve(address(curator), TASK_AMOUNT);
        vm.expectRevert(ZenthraCuratorV2.NotListed.selector);
        curator.requestTask(999, TASK_AMOUNT);
        vm.stopPrank();
    }

    function test_requestTask_revert_zeroAmount() public {
        uint256 agentId = _listAlice();
        vm.startPrank(bob);
        usdc.approve(address(curator), TASK_AMOUNT);
        vm.expectRevert(ZenthraCuratorV2.ZeroAmount.selector);
        curator.requestTask(agentId, 0);
        vm.stopPrank();
    }

    function test_requestTask_revert_belowMinAmount() public {
        uint256 agentId = _listAlice();
        vm.startPrank(bob);
        usdc.approve(address(curator), TASK_AMOUNT);
        vm.expectRevert(ZenthraCuratorV2.TaskAmountTooLow.selector);
        curator.requestTask(agentId, MIN_TASK - 1);
        vm.stopPrank();
    }

    function test_requestTask_revert_tooManyOpenTasks() public {
        uint256 agentId = _listAlice();

        // bob fills up to MAX_TASKS open tasks
        vm.startPrank(bob);
        usdc.approve(address(curator), TASK_AMOUNT * (MAX_TASKS + 1));
        for (uint256 i = 0; i < MAX_TASKS; i++) {
            curator.requestTask(agentId, TASK_AMOUNT);
        }
        // One more should revert
        vm.expectRevert(ZenthraCuratorV2.TooManyOpenTasks.selector);
        curator.requestTask(agentId, TASK_AMOUNT);
        vm.stopPrank();
    }

    function test_acceptTask_revert_notAgent() public {
        (, uint256 taskId) = _listedAndRequested();
        vm.prank(carol);
        vm.expectRevert(ZenthraCuratorV2.NotTaskAgent.selector);
        curator.acceptTask(taskId);
    }

    function test_acceptTask_revert_windowExpired() public {
        (, uint256 taskId) = _listedAndRequested();
        // Warp past taskAcceptTimeout
        vm.warp(block.timestamp + ACCEPT_TIMEOUT + 1);
        vm.prank(alice);
        vm.expectRevert(ZenthraCuratorV2.AcceptWindowExpired.selector);
        curator.acceptTask(taskId);
    }

    function test_completeTask_revert_notAccepted() public {
        (, uint256 taskId) = _listedAndRequested();
        // Task is Open, not Accepted
        vm.prank(alice);
        vm.expectRevert(ZenthraCuratorV2.TaskNotAccepted.selector);
        curator.completeTask(taskId);
    }

    function test_completeTask_revert_notAgent() public {
        (, uint256 taskId) = _listedRequestedAccepted();
        vm.prank(carol);
        vm.expectRevert(ZenthraCuratorV2.NotTaskAgent.selector);
        curator.completeTask(taskId);
    }

    function test_cancelTask_revert_alreadyAccepted_beforeDoubleTimeout() public {
        (, uint256 taskId) = _listedRequestedAccepted();
        // Warp to just before 2x timeout
        vm.warp(block.timestamp + ACCEPT_TIMEOUT * 2 - 1);
        vm.prank(bob);
        vm.expectRevert(ZenthraCuratorV2.CannotCancelAcceptedTask.selector);
        curator.cancelTask(taskId);
    }

    function test_disputeTask_revert_notAccepted_openState() public {
        (, uint256 taskId) = _listedAndRequested();
        // Task is Open — must revert DisputeBeforeAccept
        vm.prank(bob);
        vm.expectRevert(ZenthraCuratorV2.DisputeBeforeAccept.selector);
        curator.disputeTask(taskId);
    }

    function test_resolveDispute_revert_notDisputed() public {
        (, uint256 taskId) = _listedRequestedAccepted();
        // Still Accepted, not Disputed
        vm.prank(owner);
        vm.expectRevert(ZenthraCuratorV2.TaskNotDisputed.selector);
        curator.resolveDispute(taskId, true);
    }

    function test_settleExpiredDispute_revert_notExpired() public {
        (, uint256 taskId) = _listedRequestedAccepted();
        vm.prank(bob);
        curator.disputeTask(taskId);

        // Dispute timeout not reached yet
        vm.expectRevert(ZenthraCuratorV2.DisputeNotExpired.selector);
        curator.settleExpiredDispute(taskId);
    }

    function test_reclaimExpiredTask_revert_windowNotExpired() public {
        (, uint256 taskId) = _listedAndRequested();
        // Still within acceptance window
        vm.prank(bob);
        vm.expectRevert(ZenthraCuratorV2.AcceptWindowNotExpired.selector);
        curator.reclaimExpiredTask(taskId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ENDORSEMENTS
    // ═══════════════════════════════════════════════════════════════════════

    function test_endorseAgent_success() public {
        // List alice's agent and have her complete a task
        (, uint256 taskId) = _listedRequestedAccepted();
        vm.prank(alice);
        curator.completeTask(taskId);

        // carol lists a second agent
        vm.startPrank(carol);
        uint256 carolAgentId = identity.mint(carol);
        usdc.approve(address(curator), STAKE_AMOUNT);
        string[] memory caps = new string[](1);
        caps[0] = "Ops";
        curator.listAgent(carolAgentId, "https://carol.example", caps, 100e6, STAKE_AMOUNT);
        vm.stopPrank();

        // alice's agentId
        uint256 aliceAgentId = curator.getTask(taskId).agentId;

        // alice endorses carol — need alice to complete a task first (done above)
        vm.expectEmit(true, true, false, true, address(curator));
        emit ZenthraCuratorV2.AgentEndorsed(carolAgentId, alice, 1);

        vm.prank(alice);
        curator.endorseAgent(aliceAgentId, carolAgentId);

        assertEq(curator.getEndorsementCount(carolAgentId), 1);
        assertTrue(curator.hasEndorsed(alice, carolAgentId));
    }

    function test_endorseAgent_revert_noCompletedTasks() public {
        // alice's agent listed but no completed task yet
        uint256 aliceAgentId = _listAlice();

        // carol also listed
        vm.startPrank(carol);
        uint256 carolAgentId = identity.mint(carol);
        usdc.approve(address(curator), STAKE_AMOUNT);
        string[] memory caps = new string[](1);
        caps[0] = "Ops";
        curator.listAgent(carolAgentId, "https://carol.example", caps, 100e6, STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert(ZenthraCuratorV2.EndorserHasNoCompletedTasks.selector);
        curator.endorseAgent(aliceAgentId, carolAgentId);
    }

    function test_endorseAgent_revert_selfEndorse() public {
        (, uint256 taskId) = _listedRequestedAccepted();
        vm.prank(alice);
        curator.completeTask(taskId);

        uint256 aliceAgentId = curator.getTask(taskId).agentId;

        vm.prank(alice);
        vm.expectRevert(ZenthraCuratorV2.CannotSelfEndorse.selector);
        curator.endorseAgent(aliceAgentId, aliceAgentId);
    }

    function test_endorseAgent_revert_alreadyEndorsed() public {
        (, uint256 taskId) = _listedRequestedAccepted();
        vm.prank(alice);
        curator.completeTask(taskId);

        uint256 aliceAgentId = curator.getTask(taskId).agentId;

        // carol lists
        vm.startPrank(carol);
        uint256 carolAgentId = identity.mint(carol);
        usdc.approve(address(curator), STAKE_AMOUNT);
        string[] memory caps = new string[](1);
        caps[0] = "Ops";
        curator.listAgent(carolAgentId, "https://carol.example", caps, 100e6, STAKE_AMOUNT);
        vm.stopPrank();

        vm.prank(alice);
        curator.endorseAgent(aliceAgentId, carolAgentId);

        vm.prank(alice);
        vm.expectRevert(ZenthraCuratorV2.AlreadyEndorsed.selector);
        curator.endorseAgent(aliceAgentId, carolAgentId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FEATURED
    // ═══════════════════════════════════════════════════════════════════════

    function test_payForFeatured_extendsTimestamp() public {
        uint256 agentId = _listAlice();

        uint256 numDays = 3;
        uint256 cost = FEATURED_PRICE * numDays;

        vm.startPrank(alice);
        usdc.approve(address(curator), cost);

        vm.expectEmit(true, false, false, false, address(curator));
        emit ZenthraCuratorV2.AgentFeaturedPaid(
            agentId, numDays, cost,
            uint64(block.timestamp + numDays * 1 days)
        );

        curator.payForFeatured(agentId, numDays);
        vm.stopPrank();

        ZenthraCuratorV2.AgentListing memory listing = curator.getAgent(agentId);
        assertEq(listing.featuredUntil, block.timestamp + numDays * 1 days);
        assertTrue(curator.isFeatured(agentId));
        // Cost goes directly to feeRecipient
        assertEq(usdc.balanceOf(feeRecipient), cost);
    }

    function test_isFeatured_byOwner() public {
        uint256 agentId = _listAlice();

        assertFalse(curator.isFeatured(agentId));

        vm.prank(owner);
        curator.featureAgent(agentId, true);

        assertTrue(curator.isFeatured(agentId));
    }

    function test_isFeatured_byPayment_expiry() public {
        uint256 agentId = _listAlice();

        uint256 numDays = 1;
        uint256 cost = FEATURED_PRICE * numDays;
        vm.startPrank(alice);
        usdc.approve(address(curator), cost);
        curator.payForFeatured(agentId, numDays);
        vm.stopPrank();

        assertTrue(curator.isFeatured(agentId));

        // Warp past featuredUntil
        vm.warp(block.timestamp + 1 days + 1);
        assertFalse(curator.isFeatured(agentId));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════════════════════

    function test_setProtocolFeeBps_updatesAndEmits() public {
        uint16 newBps = 300;

        vm.expectEmit(false, false, false, true, address(curator));
        emit ZenthraCuratorV2.ProtocolFeeUpdated(FEE_BPS, newBps);

        vm.prank(owner);
        curator.setProtocolFeeBps(newBps);

        assertEq(curator.protocolFeeBps(), newBps);
    }

    function test_setProtocolFeeBps_revert_tooHigh() public {
        vm.prank(owner);
        vm.expectRevert(ZenthraCuratorV2.InvalidFeeBps.selector);
        curator.setProtocolFeeBps(2001); // MAX_FEE_BPS = 2000
    }

    function test_rescueTokens_surplusOnly() public {
        // _listedAndRequested() calls _listAlice() internally — one agent, one task
        _listedAndRequested();

        // Add surplus on top of the existing liabilities
        uint256 surplus = 3e6;
        usdc.mint(address(curator), surplus);

        uint256 ownerBefore = usdc.balanceOf(owner);
        vm.prank(owner);
        curator.rescueTokens(address(usdc), surplus, owner);

        assertEq(usdc.balanceOf(owner), ownerBefore + surplus);
        // Liabilities still intact
        assertEq(curator.totalEscrow(), TASK_AMOUNT);
        assertEq(curator.totalOptionalStakes(), STAKE_AMOUNT);
    }

    function test_rescueTokens_revert_solvencyBreak() public {
        _listedAndRequested();

        // Attempt to rescue more than surplus (no surplus exists)
        vm.prank(owner);
        vm.expectRevert(ZenthraCuratorV2.RescueWouldBreakSolvency.selector);
        curator.rescueTokens(address(usdc), 1, owner);
    }

    function test_pause_blocks_userFunctions() public {
        uint256 agentId = _listAlice();

        vm.prank(owner);
        curator.pause();

        // requestTask should revert with EnforcedPause
        vm.startPrank(bob);
        usdc.approve(address(curator), TASK_AMOUNT);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        curator.requestTask(agentId, TASK_AMOUNT);
        vm.stopPrank();

        // listAgent should revert
        vm.startPrank(carol);
        uint256 carolAgent = identity.mint(carol);
        usdc.approve(address(curator), STAKE_AMOUNT);
        string[] memory caps = new string[](1);
        caps[0] = "Ops";
        vm.expectRevert(Pausable.EnforcedPause.selector);
        curator.listAgent(carolAgent, "", caps, 100e6, STAKE_AMOUNT);
        vm.stopPrank();
    }

    function test_resolveDispute_works_when_paused() public {
        // Set up a dispute before pausing
        (, uint256 taskId) = _listedRequestedAccepted();
        vm.prank(bob);
        curator.disputeTask(taskId);

        // Owner pauses
        vm.prank(owner);
        curator.pause();

        // resolveDispute is NOT guarded by whenNotPaused — should still work
        vm.prank(owner);
        curator.resolveDispute(taskId, false); // pay agent

        ZenthraCuratorV2.Task memory t = curator.getTask(taskId);
        assertEq(uint8(t.status), uint8(ZenthraCuratorV2.TaskStatus.Resolved));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  PULL-CLAIM
    // ═══════════════════════════════════════════════════════════════════════

    function test_claimPayment_afterComplete() public {
        (, uint256 taskId) = _listedRequestedAccepted();
        vm.prank(alice);
        curator.completeTask(taskId);

        uint256 expectedPayout = TASK_AMOUNT - (TASK_AMOUNT * FEE_BPS) / 10_000;
        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.expectEmit(true, false, false, true, address(curator));
        emit ZenthraCuratorV2.PaymentClaimed(alice, expectedPayout);

        vm.prank(alice);
        curator.claimPayment();

        assertEq(usdc.balanceOf(alice), aliceBefore + expectedPayout);
        assertEq(curator.pendingWithdrawals(alice), 0);
    }

    function test_claimPayment_revert_nothingToClaim() public {
        vm.prank(carol);
        vm.expectRevert(ZenthraCuratorV2.NothingToClaim.selector);
        curator.claimPayment();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  INVARIANT — solvency
    // ═══════════════════════════════════════════════════════════════════════

    function invariant_solvency() public view {
        uint256 balance = usdc.balanceOf(address(curator));
        uint256 liabilities =
            curator.totalEscrow() +
            curator.totalOptionalStakes() +
            curator.totalPendingWithdrawals();
        assertGe(balance, liabilities, "solvency: balance < liabilities");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FUZZ
    // ═══════════════════════════════════════════════════════════════════════

    function testFuzz_requestTask_amount(uint256 amount) public {
        amount = bound(amount, MIN_TASK, 500e6);
        uint256 agentId = _listAlice();

        usdc.mint(bob, amount);
        vm.startPrank(bob);
        usdc.approve(address(curator), amount);
        curator.requestTask(agentId, amount);
        vm.stopPrank();

        ZenthraCuratorV2.Task memory t = curator.getTask(0);
        assertEq(t.amount, amount);
        assertEq(curator.totalEscrow(), amount);
    }

    function testFuzz_completeTask_feeCalculation(uint256 amount) public {
        amount = bound(amount, MIN_TASK, 500e6);
        uint256 agentId = _listAlice();

        usdc.mint(bob, amount);
        vm.startPrank(bob);
        usdc.approve(address(curator), amount);
        curator.requestTask(agentId, amount);
        vm.stopPrank();

        vm.prank(alice);
        curator.acceptTask(0);

        vm.prank(alice);
        curator.completeTask(0);

        uint256 fee = (amount * FEE_BPS) / 10_000;
        uint256 payout = amount - fee;

        assertEq(curator.pendingWithdrawals(alice), payout);
        assertEq(curator.pendingWithdrawals(feeRecipient), fee);
        assertEq(curator.pendingWithdrawals(alice) + curator.pendingWithdrawals(feeRecipient), amount);
    }

    function testFuzz_payForFeatured_days(uint256 numDays) public {
        numDays = bound(numDays, 1, 365);
        uint256 agentId = _listAlice();

        uint256 cost = FEATURED_PRICE * numDays;
        usdc.mint(alice, cost);

        vm.startPrank(alice);
        usdc.approve(address(curator), cost);
        curator.payForFeatured(agentId, numDays);
        vm.stopPrank();

        ZenthraCuratorV2.AgentListing memory listing = curator.getAgent(agentId);
        assertEq(listing.featuredUntil, block.timestamp + numDays * 1 days);
        assertTrue(curator.isFeatured(agentId));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  INVARIANT SUITE (separate test contract with handler)
// ═══════════════════════════════════════════════════════════════════════════

contract ZenthraCuratorV2InvariantTest is Test {
    ZenthraCuratorV2 internal curator;
    MockUSDC internal usdc;
    MockIdentity internal identity;
    CuratorHandler internal handler;

    address internal owner = makeAddr("inv_owner");
    address internal alice = makeAddr("inv_alice");
    address internal bob = makeAddr("inv_bob");
    address internal feeRecipient = makeAddr("inv_fee");

    uint16 internal constant FEE_BPS = 500;
    uint256 internal constant DISPUTE_TIMEOUT = 7 days;
    uint256 internal constant ACCEPT_TIMEOUT = 1 days;

    function setUp() public {
        usdc = new MockUSDC();
        identity = new MockIdentity();

        curator = new ZenthraCuratorV2(
            address(identity),
            address(usdc),
            feeRecipient,
            FEE_BPS,
            10e6,   // featuredPricePerDay
            0,      // optionalStakeAmount (0 = no minimum bond required)
            DISPUTE_TIMEOUT,
            1e6,    // minTaskAmount
            10,     // maxConcurrentTasksPerBuyer
            ACCEPT_TIMEOUT,
            owner
        );

        usdc.mint(alice, 100_000e6);
        usdc.mint(bob, 100_000e6);

        handler = new CuratorHandler(
            curator, usdc, identity,
            owner, alice, bob, feeRecipient
        );

        // Approve handler to spend on behalf of itself (it does pranks internally)
        vm.prank(alice);
        usdc.approve(address(curator), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(curator), type(uint256).max);

        targetContract(address(handler));
    }

    function invariant_solvency() public view {
        uint256 balance = usdc.balanceOf(address(curator));
        uint256 liabilities =
            curator.totalEscrow() +
            curator.totalOptionalStakes() +
            curator.totalPendingWithdrawals();
        assertGe(balance, liabilities, "INVARIANT: usdc.balance < liabilities");
    }

    function invariant_escrowNonNegative() public view {
        // totalEscrow is uint256, can't go negative, but we verify it tracks correctly
        assertGe(usdc.balanceOf(address(curator)), curator.totalEscrow());
    }
}
