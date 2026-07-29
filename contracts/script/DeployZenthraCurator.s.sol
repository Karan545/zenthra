// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ZenthraCurator} from "../src/ZenthraCurator.sol";

/**
 * @title DeployZenthraCurator
 * @notice Deploys ZenthraCurator with Arc Testnet defaults.
 *
 * Defaults (Arc Testnet):
 *   Identity Registry = 0x8004A818BFB912233c491871b3d84c89A494BD9e
 *   USDC              = 0x3600000000000000000000000000000000000000  (6 decimals)
 *   List stake        = 1_000_000  (1 USDC)
 *   Owner             = deployer (broadcast account)
 *
 * Optional env overrides:
 *   IDENTITY_REGISTRY, USDC, LIST_STAKE_AMOUNT, OWNER
 *
 * Usage (from /contracts):
 *   forge script script/DeployZenthraCurator.s.sol:DeployZenthraCurator \
 *     --rpc-url https://rpc.testnet.arc.network \
 *     --broadcast \
 *     --private-key $env:PRIVATE_KEY \
 *     -vvvv
 */
contract DeployZenthraCurator is Script {
    // ── Arc Testnet constants ───────────────────────────────────────────────
    address constant ARC_IDENTITY_REGISTRY =
        0x8004A818BFB912233c491871b3d84c89A494BD9e;

    // Arc native USDC ERC-20 interface (6 decimals).
    // Docs: https://docs.arc.io/arc/references/contract-addresses
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    /// @dev 1 USDC with 6 decimals.
    uint256 constant ONE_USDC = 1_000_000;

    function run() external returns (ZenthraCurator curator) {
        address identityRegistry =
            vm.envOr("IDENTITY_REGISTRY", ARC_IDENTITY_REGISTRY);
        address usdc = vm.envOr("USDC", ARC_USDC);
        uint256 listStakeAmount = vm.envOr("LIST_STAKE_AMOUNT", ONE_USDC);

        // msg.sender during broadcast is the private-key account
        address owner = vm.envOr("OWNER", msg.sender);

        console2.log("========================================");
        console2.log("  ZenthraCurator - Arc Testnet deploy");
        console2.log("========================================");
        console2.log("identityRegistry :", identityRegistry);
        console2.log("usdc             :", usdc);
        console2.log("listStakeAmount  :", listStakeAmount);
        console2.log("owner            :", owner);
        console2.log("chain id (expect): 5042002");
        console2.log("----------------------------------------");

        require(identityRegistry != address(0), "IDENTITY_REGISTRY is zero");
        require(usdc != address(0), "USDC is zero");
        require(listStakeAmount > 0, "LIST_STAKE_AMOUNT is zero");
        require(owner != address(0), "OWNER is zero");

        vm.startBroadcast();
        curator = new ZenthraCurator(
            identityRegistry, usdc, listStakeAmount, owner
        );
        vm.stopBroadcast();

        console2.log("----------------------------------------");
        console2.log("SUCCESS");
        console2.log("ZenthraCurator :", address(curator));
        console2.log("Explorer       : https://testnet.arcscan.app/address/%s", address(curator));
        console2.log("========================================");
        console2.log("NEXT: save this address for the frontend");
        console2.log("  src/config/contracts.ts  -> ZenthraCurator");
        console2.log("========================================");
    }
}
