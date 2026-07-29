// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ZenthraCurator} from "../src/ZenthraCurator.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

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

contract ZenthraCuratorTest is Test {
    ZenthraCurator internal curator;
    MockUSDC internal usdc;
    MockIdentity internal identity;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant STAKE = 1_000_000; // 1 USDC

    function setUp() public {
        usdc = new MockUSDC();
        identity = new MockIdentity();
        curator = new ZenthraCurator(
            address(identity),
            address(usdc),
            STAKE,
            owner
        );

        usdc.mint(alice, 10 * STAKE);
        usdc.mint(bob, 10 * STAKE);
    }

    function test_listAgent_stakesAndLists() public {
        vm.startPrank(alice);
        uint256 agentId = identity.mint(alice);
        usdc.approve(address(curator), STAKE);

        string[] memory caps = new string[](2);
        caps[0] = "Research";
        caps[1] = "Docs";

        curator.listAgent(agentId, "https://api.example.com/x402", caps, 250);
        vm.stopPrank();

        ZenthraCurator.AgentListing memory listing = curator.getAgent(agentId);
        assertEq(listing.owner, alice);
        assertTrue(listing.isActive);
        assertEq(listing.stakeAmount, STAKE);
        assertEq(listing.capabilities.length, 2);
        assertEq(usdc.balanceOf(address(curator)), STAKE);

        uint256[] memory all = curator.getAllListedAgents();
        assertEq(all.length, 1);
        assertEq(all[0], agentId);
    }

    function test_listAgent_revertsIfNotNftOwner() public {
        vm.prank(alice);
        uint256 agentId = identity.mint(alice);

        vm.startPrank(bob);
        usdc.approve(address(curator), STAKE);
        string[] memory caps = new string[](1);
        caps[0] = "Ops";
        vm.expectRevert(ZenthraCurator.NotAgentOwner.selector);
        curator.listAgent(agentId, "", caps, 1);
        vm.stopPrank();
    }

    function test_delistAgent_returnsStake() public {
        vm.startPrank(alice);
        uint256 agentId = identity.mint(alice);
        usdc.approve(address(curator), STAKE);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        curator.listAgent(agentId, "", caps, 100);

        uint256 beforeBal = usdc.balanceOf(alice);
        curator.delistAgent(agentId);
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), beforeBal + STAKE);
        assertEq(curator.getAllListedAgents().length, 0);
        vm.expectRevert(ZenthraCurator.NotListed.selector);
        curator.getAgent(agentId);
    }

    function test_featureAgent_onlyOwner() public {
        vm.startPrank(alice);
        uint256 agentId = identity.mint(alice);
        usdc.approve(address(curator), STAKE);
        string[] memory caps = new string[](1);
        caps[0] = "Research";
        curator.listAgent(agentId, "", caps, 100);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert();
        curator.featureAgent(agentId, true);

        vm.prank(owner);
        curator.featureAgent(agentId, true);
        assertTrue(curator.getAgent(agentId).isFeatured);
    }
}
