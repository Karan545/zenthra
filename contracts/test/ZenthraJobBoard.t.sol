// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ZenthraJobBoard} from "../src/ZenthraJobBoard.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

// ─── Mock Helpers (reused from ZenthraCurator pattern) ───────────────────────

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

contract JobBoardHandler is Test {
    ZenthraJobBoard public jobBoard;
    MockUSDC public usdc;
    MockIdentity public identity;

    address public poster;
    address public bidder;
    address public owner;

    // Ghost tracking for solvency invariant
    uint256 public ghostTotalEscrow;
    uint256 public ghostTotalBidStakes;
    uint256 public ghostTotalPendingWithdrawals;

    uint256 private _latestJobId;
    bool private _hasOpenJob;
    uint256 private _bidderAgentId;
    bool private _hasBid;

    constructor(
        ZenthraJobBoard _jobBoard,
        MockUSDC _usdc,
        MockIdentity _identity,
        address _poster,
        address _bidder,
        address _owner
    ) {
        jobBoard = _jobBoard;
        usdc = _usdc;
        identity = _identity;
        poster = _poster;
        bidder = _bidder;
        owner = _owner;

        // Mint bidder identity
        vm.prank(_bidder);
        _bidderAgentId = _identity.mint(_bidder);

        // Fund poster and bidder
        _usdc.mint(_poster, 1_000_000e6);
        _usdc.mint(_bidder, 1_000_000e6);
        vm.prank(_poster);
        _usdc.approve(address(_jobBoard), type(uint256).max);
        vm.prank(_bidder);
        _usdc.approve(address(_jobBoard), type(uint256).max);
    }

    function postJob(uint256 bounty) external {
        bounty = bound(bounty, 1e6, 10_000e6);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        vm.prank(poster);
        jobBoard.postJob("Title", "Desc", caps, bounty, 0, 0);
        _latestJobId = jobBoard.getJobCount() - 1;
        _hasOpenJob = true;
        _hasBid = false;
    }

    function submitBid(uint256 stake) external {
        if (!_hasOpenJob) return;
        ZenthraJobBoard.Job memory job = jobBoard.getJob(_latestJobId);
        if (job.status != ZenthraJobBoard.JobStatus.Open) return;
        if (_hasBid) return;
        stake = bound(stake, 0, 100e6);
        vm.prank(bidder);
        jobBoard.submitBid(_latestJobId, _bidderAgentId, "proposal", stake);
        _hasBid = true;
    }

    function cancelJob() external {
        if (!_hasOpenJob) return;
        ZenthraJobBoard.Job memory job = jobBoard.getJob(_latestJobId);
        if (job.status != ZenthraJobBoard.JobStatus.Open) return;
        vm.prank(poster);
        jobBoard.cancelJob(_latestJobId);
        _hasOpenJob = false;
    }

    function claimPayment(address who) external {
        uint256 bal = jobBoard.pendingWithdrawals(who);
        if (bal == 0) return;
        vm.prank(who);
        jobBoard.claimPayment();
    }
}

// ─── Main Test Contract ───────────────────────────────────────────────────────

contract ZenthraJobBoardTest is Test {
    ZenthraJobBoard internal jobBoard;
    MockUSDC internal usdc;
    MockIdentity internal identity;

    address internal owner        = makeAddr("owner");
    address internal feeRecipient = makeAddr("feeRecipient");
    address internal alice        = makeAddr("alice");  // job poster
    address internal bob          = makeAddr("bob");    // bidder
    address internal carol        = makeAddr("carol");  // second bidder
    address internal dave         = makeAddr("dave");   // third party

    uint256 internal constant BOUNTY      = 100e6;   // 100 USDC
    uint256 internal constant MIN_BOUNTY  = 10e6;    // 10 USDC
    uint256 internal constant STAKE       = 5e6;     // 5 USDC
    uint16  internal constant FEE_BPS     = 500;     // 5%
    uint256 internal constant ACCEPT_TO   = 1 days;
    uint256 internal constant DELIVER_TO  = 7 days;
    uint256 internal constant DISPUTE_TO  = 3 days;
    uint256 internal constant EXPIRE_TO   = 30 days;
    uint32  internal constant MAX_OPEN    = 3;

    // agent token ids
    uint256 internal bobAgentId;
    uint256 internal carolAgentId;

    function setUp() public {
        usdc     = new MockUSDC();
        identity = new MockIdentity();

        jobBoard = new ZenthraJobBoard(
            address(identity),
            address(usdc),
            feeRecipient,
            FEE_BPS,
            MIN_BOUNTY,
            0,           // minBidStake – use 0 so basic tests work without stake
            ACCEPT_TO,
            DELIVER_TO,
            DISPUTE_TO,
            EXPIRE_TO,
            MAX_OPEN,
            owner
        );

        // Mint identities for bidders
        vm.prank(bob);
        bobAgentId = identity.mint(bob);
        vm.prank(carol);
        carolAgentId = identity.mint(carol);

        // Fund accounts and pre-approve
        usdc.mint(alice,  1_000_000e6);
        usdc.mint(bob,    1_000_000e6);
        usdc.mint(carol,  1_000_000e6);

        vm.prank(alice);
        usdc.approve(address(jobBoard), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(jobBoard), type(uint256).max);
        vm.prank(carol);
        usdc.approve(address(jobBoard), type(uint256).max);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _defaultCaps() internal pure returns (string[] memory caps) {
        caps = new string[](1);
        caps[0] = "Research";
    }

    /// Post a basic job from alice and return the jobId
    function _postJob() internal returns (uint256 jobId) {
        vm.prank(alice);
        jobBoard.postJob("Title", "Description", _defaultCaps(), BOUNTY, 0, 0);
        jobId = jobBoard.getJobCount() - 1;
    }

    /// Post job, have bob bid, poster selects bob as winner
    function _postJobWithWinner() internal returns (uint256 jobId) {
        jobId = _postJob();
        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "Bob's proposal", 0);
        vm.prank(alice);
        jobBoard.selectWinner(jobId, 0);
    }

    /// Post job → select winner → accept
    function _postJobAccepted() internal returns (uint256 jobId) {
        jobId = _postJobWithWinner();
        vm.prank(bob);
        jobBoard.acceptJob(jobId);
    }

    // ─── POSTING ─────────────────────────────────────────────────────────────

    function test_postJob_basic() public {
        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 boardBefore = usdc.balanceOf(address(jobBoard));

        vm.expectEmit(true, true, false, true, address(jobBoard));
        emit ZenthraJobBoard.JobPosted(0, alice, BOUNTY, 0);

        uint256 jobId = _postJob();

        // State checks
        assertEq(jobId, 0);
        assertEq(usdc.balanceOf(alice), aliceBefore - BOUNTY);
        assertEq(usdc.balanceOf(address(jobBoard)), boardBefore + BOUNTY);
        assertEq(jobBoard.totalEscrow(), BOUNTY);
        assertEq(jobBoard.getPosterOpenJobCount(alice), 1);

        ZenthraJobBoard.Job memory job = jobBoard.getJob(jobId);
        assertEq(job.poster, alice);
        assertEq(job.bounty, BOUNTY);
        assertEq(uint8(job.status), uint8(ZenthraJobBoard.JobStatus.Open));
    }

    function test_postJob_revert_bouncyTooLow() public {
        string[] memory caps = _defaultCaps();
        vm.prank(alice);
        vm.expectRevert(ZenthraJobBoard.BountyTooLow.selector);
        jobBoard.postJob("T", "D", caps, MIN_BOUNTY - 1, 0, 0);
    }

    function test_postJob_revert_tooManyOpenJobs() public {
        // Fill up to cap
        for (uint32 i = 0; i < MAX_OPEN; i++) {
            _postJob();
        }
        // One more should revert
        string[] memory caps = _defaultCaps();
        vm.prank(alice);
        vm.expectRevert(ZenthraJobBoard.TooManyOpenJobs.selector);
        jobBoard.postJob("T", "D", caps, BOUNTY, 0, 0);
    }

    function test_postJob_revert_deadlineInPast() public {
        // Warp to a known non-zero timestamp so block.timestamp - 1 is also non-zero
        vm.warp(1_700_000_000);
        string[] memory caps = _defaultCaps();
        uint64 past = uint64(block.timestamp - 1);
        vm.prank(alice);
        vm.expectRevert(ZenthraJobBoard.DeadlineInPast.selector);
        jobBoard.postJob("T", "D", caps, BOUNTY, past, 0);
    }

    // ─── BIDDING ─────────────────────────────────────────────────────────────

    function test_submitBid_success_noStake() public {
        uint256 jobId = _postJob();

        vm.expectEmit(true, true, true, false, address(jobBoard));
        emit ZenthraJobBoard.BidSubmitted(jobId, bobAgentId, bob, 0, uint64(block.timestamp));

        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "Proposal", 0);

        ZenthraJobBoard.Bid[] memory bids = jobBoard.getJobBids(jobId);
        assertEq(bids.length, 1);
        assertEq(bids[0].bidder, bob);
        assertEq(bids[0].stakeAmount, 0);
        assertEq(jobBoard.totalBidStakes(), 0);
    }

    function test_submitBid_success_withStake() public {
        uint256 jobId = _postJob();
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "Proposal", STAKE);

        assertEq(usdc.balanceOf(bob), bobBefore - STAKE);
        assertEq(jobBoard.totalBidStakes(), STAKE);

        ZenthraJobBoard.Bid[] memory bids = jobBoard.getJobBids(jobId);
        assertEq(bids[0].stakeAmount, STAKE);
    }

    function test_submitBid_revert_posterCannotBid() public {
        uint256 jobId = _postJob();
        // alice also has an identity? No — poster is alice who has no identity.
        // Test that poster address is blocked regardless
        // Mint an identity for alice so she can attempt (revert should be PosterCannotBid)
        vm.prank(alice);
        uint256 aliceAgentId = identity.mint(alice);

        vm.prank(alice);
        vm.expectRevert(ZenthraJobBoard.PosterCannotBid.selector);
        jobBoard.submitBid(jobId, aliceAgentId, "Alice self-bids", 0);
    }

    function test_submitBid_revert_alreadyBid() public {
        uint256 jobId = _postJob();
        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "First", 0);

        vm.prank(bob);
        vm.expectRevert(ZenthraJobBoard.AlreadyBid.selector);
        jobBoard.submitBid(jobId, bobAgentId, "Second", 0);
    }

    function test_submitBid_revert_maxBidsReached() public {
        // Post a job with maxBids = 1
        string[] memory caps = _defaultCaps();
        vm.prank(alice);
        jobBoard.postJob("T", "D", caps, BOUNTY, 0, 1);
        uint256 jobId = jobBoard.getJobCount() - 1;

        // Bob bids → fills the cap
        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "Proposal", 0);

        // Carol should be rejected
        vm.prank(carol);
        vm.expectRevert(ZenthraJobBoard.MaxBidsReached.selector);
        jobBoard.submitBid(jobId, carolAgentId, "Proposal", 0);
    }

    function test_submitBid_revert_noIdentity() public {
        uint256 jobId = _postJob();
        uint256 fakeAgentId = 9999;

        vm.prank(bob);
        vm.expectRevert(ZenthraJobBoard.NoAgentIdentity.selector);
        jobBoard.submitBid(jobId, fakeAgentId, "Proposal", 0);
    }

    // ─── WINNER SELECTION ────────────────────────────────────────────────────

    function test_selectWinner_refundsLosingBids() public {
        uint256 jobId = _postJob();

        // Bob bids with stake
        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "Bob", STAKE);

        // Carol bids with stake
        vm.prank(carol);
        jobBoard.submitBid(jobId, carolAgentId, "Carol", STAKE);

        uint256 carolBefore = jobBoard.pendingWithdrawals(carol);

        // Alice selects bob (index 0)
        vm.prank(alice);
        jobBoard.selectWinner(jobId, 0);

        ZenthraJobBoard.Job memory job = jobBoard.getJob(jobId);
        assertEq(uint8(job.status), uint8(ZenthraJobBoard.JobStatus.WinnerSelected));
        assertEq(job.winner, bob);

        // Carol's stake should be credited to her pull-claim balance
        assertEq(jobBoard.pendingWithdrawals(carol), carolBefore + STAKE);
        // Bob's stake stays locked
        assertEq(jobBoard.totalBidStakes(), STAKE);
        // Total pending increased by carol's stake
        assertEq(jobBoard.totalPendingWithdrawals(), STAKE);
    }

    function test_selectWinner_revert_notPoster() public {
        uint256 jobId = _postJob();
        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "Bob", 0);

        vm.prank(dave);
        vm.expectRevert(ZenthraJobBoard.NotJobPoster.selector);
        jobBoard.selectWinner(jobId, 0);
    }

    function test_selectWinner_revert_jobNotOpen() public {
        uint256 jobId = _postJobWithWinner(); // already WinnerSelected
        vm.prank(alice);
        vm.expectRevert(ZenthraJobBoard.JobNotOpen.selector);
        jobBoard.selectWinner(jobId, 0);
    }

    // ─── ACCEPT ──────────────────────────────────────────────────────────────

    function test_acceptJob_success() public {
        uint256 jobId = _postJobWithWinner();

        vm.expectEmit(true, true, true, false, address(jobBoard));
        emit ZenthraJobBoard.JobAccepted(jobId, bobAgentId, bob, uint64(block.timestamp));

        vm.prank(bob);
        jobBoard.acceptJob(jobId);

        ZenthraJobBoard.Job memory job = jobBoard.getJob(jobId);
        assertEq(uint8(job.status), uint8(ZenthraJobBoard.JobStatus.Accepted));
        assertEq(job.acceptedAt, uint64(block.timestamp));
    }

    function test_acceptJob_revert_notWinner() public {
        uint256 jobId = _postJobWithWinner();
        vm.prank(carol);
        vm.expectRevert(ZenthraJobBoard.NotJobWinner.selector);
        jobBoard.acceptJob(jobId);
    }

    function test_acceptJob_revert_windowExpired() public {
        uint256 jobId = _postJobWithWinner();
        vm.warp(block.timestamp + ACCEPT_TO + 1);

        vm.prank(bob);
        vm.expectRevert(ZenthraJobBoard.AcceptWindowExpired.selector);
        jobBoard.acceptJob(jobId);
    }

    function test_reclaimUnacceptedJob_afterTimeout() public {
        uint256 jobId = _postJobWithWinner();
        uint256 aliceBalBefore = jobBoard.pendingWithdrawals(alice);

        // Warp past acceptance window
        vm.warp(block.timestamp + ACCEPT_TO + 1);

        vm.expectEmit(true, true, false, true, address(jobBoard));
        emit ZenthraJobBoard.JobCancelled(jobId, alice, BOUNTY);

        vm.prank(alice);
        jobBoard.reclaimUnacceptedJob(jobId);

        ZenthraJobBoard.Job memory job = jobBoard.getJob(jobId);
        assertEq(uint8(job.status), uint8(ZenthraJobBoard.JobStatus.Cancelled));
        assertEq(jobBoard.pendingWithdrawals(alice), aliceBalBefore + BOUNTY);
        assertEq(jobBoard.totalEscrow(), 0);
        assertEq(jobBoard.getPosterOpenJobCount(alice), 0);
    }

    // ─── DELIVERY ────────────────────────────────────────────────────────────

    function test_confirmDelivery_releasesPayment() public {
        uint256 jobId = _postJobAccepted();

        uint256 fee    = (BOUNTY * FEE_BPS) / 10_000;
        uint256 payout = BOUNTY - fee;

        vm.expectEmit(true, true, false, true, address(jobBoard));
        emit ZenthraJobBoard.DeliveryConfirmed(jobId, bob, payout, fee);

        vm.prank(alice);
        jobBoard.confirmDelivery(jobId);

        ZenthraJobBoard.Job memory job = jobBoard.getJob(jobId);
        assertEq(uint8(job.status), uint8(ZenthraJobBoard.JobStatus.Completed));
        assertEq(jobBoard.pendingWithdrawals(bob), payout);
        assertEq(jobBoard.pendingWithdrawals(feeRecipient), fee);
        assertEq(jobBoard.totalEscrow(), 0);
        assertEq(jobBoard.getPosterOpenJobCount(alice), 0);
    }

    function test_confirmDelivery_revert_notPoster() public {
        uint256 jobId = _postJobAccepted();
        vm.prank(dave);
        vm.expectRevert(ZenthraJobBoard.NotJobPoster.selector);
        jobBoard.confirmDelivery(jobId);
    }

    function test_reclaimUndeliveredJob_afterTimeout() public {
        uint256 jobId = _postJobAccepted();

        vm.warp(block.timestamp + DELIVER_TO + 1);

        uint256 aliceBefore = jobBoard.pendingWithdrawals(alice);

        vm.prank(alice);
        jobBoard.reclaimUndeliveredJob(jobId);

        ZenthraJobBoard.Job memory job = jobBoard.getJob(jobId);
        assertEq(uint8(job.status), uint8(ZenthraJobBoard.JobStatus.Cancelled));
        assertEq(jobBoard.pendingWithdrawals(alice), aliceBefore + BOUNTY);
        assertEq(jobBoard.totalEscrow(), 0);
    }

    // ─── CANCEL ──────────────────────────────────────────────────────────────

    function test_cancelJob_openJob() public {
        uint256 jobId = _postJob();
        uint256 aliceBefore = jobBoard.pendingWithdrawals(alice);

        vm.expectEmit(true, true, false, true, address(jobBoard));
        emit ZenthraJobBoard.JobCancelled(jobId, alice, BOUNTY);

        vm.prank(alice);
        jobBoard.cancelJob(jobId);

        ZenthraJobBoard.Job memory job = jobBoard.getJob(jobId);
        assertEq(uint8(job.status), uint8(ZenthraJobBoard.JobStatus.Cancelled));
        assertEq(jobBoard.pendingWithdrawals(alice), aliceBefore + BOUNTY);
        assertEq(jobBoard.totalEscrow(), 0);
        assertEq(jobBoard.getPosterOpenJobCount(alice), 0);
    }

    function test_cancelJob_revert_notOpen() public {
        // WinnerSelected status should revert with JobNotOpen
        uint256 jobId = _postJobWithWinner();
        vm.prank(alice);
        vm.expectRevert(ZenthraJobBoard.JobNotOpen.selector);
        jobBoard.cancelJob(jobId);
    }

    // ─── DISPUTE ─────────────────────────────────────────────────────────────

    function test_disputeJob_success() public {
        uint256 jobId = _postJobAccepted();

        vm.expectEmit(true, true, false, false, address(jobBoard));
        emit ZenthraJobBoard.JobDisputed(jobId, alice);

        vm.prank(alice);
        jobBoard.disputeJob(jobId);

        ZenthraJobBoard.Job memory job = jobBoard.getJob(jobId);
        assertEq(uint8(job.status), uint8(ZenthraJobBoard.JobStatus.Disputed));
        assertEq(job.disputedAt, uint64(block.timestamp));
    }

    function test_resolveJobDispute_payBuyer() public {
        uint256 jobId = _postJobAccepted();
        vm.prank(alice);
        jobBoard.disputeJob(jobId);

        uint256 fee    = (BOUNTY * FEE_BPS) / 10_000;
        uint256 payout = BOUNTY - fee;

        vm.expectEmit(true, false, false, true, address(jobBoard));
        emit ZenthraJobBoard.JobDisputeResolved(jobId, true, payout, fee);

        vm.prank(owner);
        jobBoard.resolveJobDispute(jobId, true);

        assertEq(jobBoard.pendingWithdrawals(alice), payout);
        assertEq(jobBoard.pendingWithdrawals(feeRecipient), fee);
        assertEq(uint8(jobBoard.getJob(jobId).status), uint8(ZenthraJobBoard.JobStatus.Resolved));
    }

    function test_resolveJobDispute_payAgent() public {
        uint256 jobId = _postJobAccepted();
        vm.prank(alice);
        jobBoard.disputeJob(jobId);

        uint256 fee    = (BOUNTY * FEE_BPS) / 10_000;
        uint256 payout = BOUNTY - fee;

        vm.prank(owner);
        jobBoard.resolveJobDispute(jobId, false);

        assertEq(jobBoard.pendingWithdrawals(bob), payout);
        assertEq(jobBoard.pendingWithdrawals(feeRecipient), fee);
    }

    function test_settleExpiredJobDispute_afterTimeout() public {
        uint256 jobId = _postJobAccepted();
        vm.prank(alice);
        jobBoard.disputeJob(jobId);

        uint256 aliceBefore = jobBoard.pendingWithdrawals(alice);

        vm.warp(block.timestamp + DISPUTE_TO);

        vm.expectEmit(true, false, false, true, address(jobBoard));
        emit ZenthraJobBoard.JobDisputeAutoResolved(jobId, BOUNTY);

        jobBoard.settleExpiredJobDispute(jobId);

        assertEq(jobBoard.pendingWithdrawals(alice), aliceBefore + BOUNTY);
        assertEq(uint8(jobBoard.getJob(jobId).status), uint8(ZenthraJobBoard.JobStatus.Resolved));
    }

    function test_settleExpiredJobDispute_revert_notExpired() public {
        uint256 jobId = _postJobAccepted();
        vm.prank(alice);
        jobBoard.disputeJob(jobId);

        // Only 1 second has passed — not expired
        vm.warp(block.timestamp + 1);

        vm.expectRevert(ZenthraJobBoard.DisputeNotExpired.selector);
        jobBoard.settleExpiredJobDispute(jobId);
    }

    // ─── EXPIRE ──────────────────────────────────────────────────────────────

    function test_expireJob_returnsAllFundsAndStakes() public {
        uint256 jobId = _postJob();

        // Bob bids with stake
        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "Bob", STAKE);

        uint256 aliceBefore = jobBoard.pendingWithdrawals(alice);
        uint256 bobBefore   = jobBoard.pendingWithdrawals(bob);

        // Warp past expiry
        vm.warp(block.timestamp + EXPIRE_TO + 1);

        vm.expectEmit(true, true, false, true, address(jobBoard));
        emit ZenthraJobBoard.JobCancelled(jobId, alice, BOUNTY);

        jobBoard.expireJob(jobId);

        assertEq(jobBoard.pendingWithdrawals(alice), aliceBefore + BOUNTY);
        assertEq(jobBoard.pendingWithdrawals(bob),   bobBefore + STAKE);
        assertEq(jobBoard.totalEscrow(), 0);
        assertEq(jobBoard.totalBidStakes(), 0);
        assertEq(uint8(jobBoard.getJob(jobId).status), uint8(ZenthraJobBoard.JobStatus.Cancelled));
    }

    function test_expireJob_revert_notExpired() public {
        uint256 jobId = _postJob();
        vm.expectRevert(ZenthraJobBoard.JobNotExpired.selector);
        jobBoard.expireJob(jobId);
    }

    // ─── PULL-CLAIM ──────────────────────────────────────────────────────────

    function test_claimPayment_afterDelivery() public {
        uint256 jobId = _postJobAccepted();

        uint256 fee    = (BOUNTY * FEE_BPS) / 10_000;
        uint256 payout = BOUNTY - fee;

        vm.prank(alice);
        jobBoard.confirmDelivery(jobId);

        uint256 bobBefore = usdc.balanceOf(bob);

        vm.expectEmit(true, false, false, true, address(jobBoard));
        emit ZenthraJobBoard.PaymentClaimed(bob, payout);

        vm.prank(bob);
        jobBoard.claimPayment();

        assertEq(usdc.balanceOf(bob), bobBefore + payout);
        assertEq(jobBoard.pendingWithdrawals(bob), 0);
        assertEq(jobBoard.totalPendingWithdrawals(), fee); // feeRecipient's portion remains
    }

    function test_claimPayment_revert_nothingToClaim() public {
        vm.prank(dave);
        vm.expectRevert(ZenthraJobBoard.NothingToClaim.selector);
        jobBoard.claimPayment();
    }

    // ─── ADMIN ───────────────────────────────────────────────────────────────

    function test_setProtocolFeeBps_updatesAndEmits() public {
        uint16 oldBps = FEE_BPS;
        uint16 newBps = 300;

        vm.expectEmit(false, false, false, true, address(jobBoard));
        emit ZenthraJobBoard.ProtocolFeeUpdated(oldBps, newBps);

        vm.prank(owner);
        jobBoard.setProtocolFeeBps(newBps);

        assertEq(jobBoard.protocolFeeBps(), newBps);
    }

    function test_rescueTokens_surplusOnly() public {
        // Send extra USDC directly to the contract (surplus, not tracked as liability)
        usdc.mint(address(jobBoard), 50e6);

        uint256 ownerBefore = usdc.balanceOf(owner);

        vm.prank(owner);
        jobBoard.rescueTokens(address(usdc), 50e6, owner);

        assertEq(usdc.balanceOf(owner), ownerBefore + 50e6);
    }

    function test_rescueTokens_revert_solvencyBreak() public {
        // Post a job to put BOUNTY into escrow
        _postJob();

        // Attempt to rescue MORE than the surplus (liabilities = BOUNTY, balance = BOUNTY, no surplus)
        vm.prank(owner);
        vm.expectRevert(ZenthraJobBoard.RescueWouldBreakSolvency.selector);
        jobBoard.rescueTokens(address(usdc), 1, owner);
    }

    function test_pause_blocksUserFunctions() public {
        vm.prank(owner);
        jobBoard.pause();

        // postJob should be blocked
        string[] memory caps = _defaultCaps();
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        jobBoard.postJob("T", "D", caps, BOUNTY, 0, 0);

        // submitBid should be blocked
        vm.prank(bob);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        jobBoard.submitBid(0, bobAgentId, "P", 0);
    }

    function test_resolveJobDispute_works_when_paused() public {
        uint256 jobId = _postJobAccepted();
        vm.prank(alice);
        jobBoard.disputeJob(jobId);

        // Pause the contract
        vm.prank(owner);
        jobBoard.pause();

        // resolveJobDispute is onlyOwner + nonReentrant (no whenNotPaused) — should still work
        vm.prank(owner);
        jobBoard.resolveJobDispute(jobId, true);

        assertEq(uint8(jobBoard.getJob(jobId).status), uint8(ZenthraJobBoard.JobStatus.Resolved));
    }

    // ─── FUZZ ────────────────────────────────────────────────────────────────

    function testFuzz_postJob_bountyAccepted(uint256 bounty) public {
        bounty = bound(bounty, MIN_BOUNTY, 1_000_000e6);
        usdc.mint(alice, bounty);

        string[] memory caps = _defaultCaps();
        vm.prank(alice);
        jobBoard.postJob("T", "D", caps, bounty, 0, 0);

        assertEq(jobBoard.totalEscrow(), bounty);
    }

    function testFuzz_deliveryFee(uint256 bounty) public {
        bounty = bound(bounty, MIN_BOUNTY, 500_000e6);
        usdc.mint(alice, bounty);

        // Post with fuzzed bounty
        string[] memory caps = _defaultCaps();
        vm.prank(alice);
        jobBoard.postJob("T", "D", caps, bounty, 0, 0);
        uint256 jobId = jobBoard.getJobCount() - 1;

        vm.prank(bob);
        jobBoard.submitBid(jobId, bobAgentId, "P", 0);
        vm.prank(alice);
        jobBoard.selectWinner(jobId, 0);
        vm.prank(bob);
        jobBoard.acceptJob(jobId);
        vm.prank(alice);
        jobBoard.confirmDelivery(jobId);

        uint256 expectedFee    = (bounty * FEE_BPS) / 10_000;
        uint256 expectedPayout = bounty - expectedFee;
        assertEq(jobBoard.pendingWithdrawals(bob), expectedPayout);
        assertEq(jobBoard.pendingWithdrawals(feeRecipient), expectedFee);
    }
}

// ─── Invariant Test Contract ─────────────────────────────────────────────────

contract ZenthraJobBoardInvariantTest is Test {
    ZenthraJobBoard internal jobBoard;
    MockUSDC internal usdc;
    MockIdentity internal identity;
    JobBoardHandler internal handler;

    address internal owner        = makeAddr("owner");
    address internal feeRecipient = makeAddr("feeRecipient");
    address internal poster       = makeAddr("poster");
    address internal bidder       = makeAddr("bidder");

    function setUp() public {
        usdc     = new MockUSDC();
        identity = new MockIdentity();

        jobBoard = new ZenthraJobBoard(
            address(identity),
            address(usdc),
            feeRecipient,
            500,       // 5% fee
            1e6,       // minBounty
            0,         // minBidStake
            1 days,    // jobAcceptTimeout
            7 days,    // deliveryTimeout
            3 days,    // disputeTimeout
            30 days,   // jobExpireTimeout
            10,        // maxOpenJobsPerPoster
            owner
        );

        handler = new JobBoardHandler(
            jobBoard,
            usdc,
            identity,
            poster,
            bidder,
            owner
        );

        targetContract(address(handler));
    }

    /// @notice The USDC balance held by the contract must always equal or exceed
    ///         the sum of tracked liabilities.
    function invariant_solvency() public view {
        uint256 liabilities =
            jobBoard.totalEscrow() +
            jobBoard.totalBidStakes() +
            jobBoard.totalPendingWithdrawals();
        assertGe(
            usdc.balanceOf(address(jobBoard)),
            liabilities,
            "solvency: balance < liabilities"
        );
    }
}
