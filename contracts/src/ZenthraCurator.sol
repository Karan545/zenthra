// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ZenthraCurator
 * @author Zenthra
 * @notice Curated listing layer for ERC-8004 agents. Agents must already hold an
 *         Identity Registry NFT. Listing requires staking USDC.
 *
 * @dev Arc Testnet reference addresses (for documentation / deploy scripts):
 *      - Identity Registry: 0x8004A818BFB912233c491871b3d84c89A494BD9e
 *      - USDC (native ERC-20 interface, 6 decimals):
 *          0x3600000000000000000000000000000000000000
 *      - Default list stake: 1_000_000 = 1 USDC
 *
 * Security:
 *  - ReentrancyGuard on stake movement
 *  - SafeERC20 for USDC transfers
 *  - Only NFT owner can list; only listing owner can delist / update
 *  - featureAgent is contract owner-only (curation)
 */
contract ZenthraCurator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct AgentListing {
        uint256 agentId;
        address owner;
        string x402Endpoint;
        string[] capabilities;
        /// @dev Marketplace price scale chosen by the lister (e.g. cents or whole USDC).
        uint256 pricePerTask;
        uint64 listedAt;
        bool isActive;
        bool isFeatured;
        /// @dev USDC amount locked at list time (smallest units).
        uint256 stakeAmount;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Config
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice ERC-8004 Identity Registry (ERC-721).
    IERC721 public immutable identityRegistry;

    /// @notice Stake asset (USDC).
    IERC20 public immutable usdc;

    /// @notice Required stake to list (token smallest units).
    uint256 public listStakeAmount;

    /// @notice Soft cap on capability tags (gas / abuse bound).
    uint256 public constant MAX_CAPABILITIES = 32;

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    mapping(uint256 => AgentListing) private _listings;

    /// @dev Active agent ids (swap-and-pop enumerable set).
    uint256[] private _listedAgentIds;

    /// @dev agentId => index in _listedAgentIds + 1 (0 = absent).
    mapping(uint256 => uint256) private _listedIndexPlusOne;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event AgentListed(
        uint256 indexed agentId,
        address indexed owner,
        string x402Endpoint,
        uint256 pricePerTask,
        uint256 stakeAmount,
        uint64 listedAt
    );

    event AgentDelisted(
        uint256 indexed agentId,
        address indexed owner,
        uint256 stakeReturned
    );

    event AgentFeatured(uint256 indexed agentId, bool featured);

    event AgentUpdated(
        uint256 indexed agentId,
        string x402Endpoint,
        uint256 pricePerTask
    );

    event ListStakeAmountUpdated(uint256 oldAmount, uint256 newAmount);

    event CapabilitiesUpdated(uint256 indexed agentId, string[] capabilities);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error NotAgentOwner();
    error AlreadyListed();
    error NotListed();
    error NotListingOwner();
    error ZeroAddress();
    error ZeroStake();
    error EmptyCapabilities();
    error TooManyCapabilities();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param identityRegistry_ ERC-8004 Identity Registry
     * @param usdc_ USDC token used for listing stake
     * @param listStakeAmount_ Stake in smallest units (1e6 = 1 USDC on Arc)
     * @param initialOwner Admin who can feature agents / update stake amount
     */
    constructor(
        address identityRegistry_,
        address usdc_,
        uint256 listStakeAmount_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            identityRegistry_ == address(0) ||
            usdc_ == address(0) ||
            initialOwner == address(0)
        ) {
            revert ZeroAddress();
        }
        if (listStakeAmount_ == 0) revert ZeroStake();

        identityRegistry = IERC721(identityRegistry_);
        usdc = IERC20(usdc_);
        listStakeAmount = listStakeAmount_;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Listing
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Stake USDC and list an ERC-8004 agent on Zenthra.
     * @dev Caller must:
     *      1) Own `agentId` on the Identity Registry
     *      2) `approve` this contract for at least `listStakeAmount` USDC
     */
    function listAgent(
        uint256 agentId,
        string calldata x402Endpoint,
        string[] calldata capabilities,
        uint256 pricePerTask
    ) external nonReentrant {
        if (identityRegistry.ownerOf(agentId) != msg.sender) {
            revert NotAgentOwner();
        }
        if (_listings[agentId].isActive) revert AlreadyListed();
        if (capabilities.length == 0) revert EmptyCapabilities();
        if (capabilities.length > MAX_CAPABILITIES) revert TooManyCapabilities();

        uint256 stake = listStakeAmount;
        usdc.safeTransferFrom(msg.sender, address(this), stake);

        AgentListing storage listing = _listings[agentId];
        listing.agentId = agentId;
        listing.owner = msg.sender;
        listing.x402Endpoint = x402Endpoint;
        listing.pricePerTask = pricePerTask;
        listing.listedAt = uint64(block.timestamp);
        listing.isActive = true;
        listing.isFeatured = false;
        listing.stakeAmount = stake;

        _setCapabilities(listing, capabilities);
        _addToListed(agentId);

        emit AgentListed(
            agentId,
            msg.sender,
            x402Endpoint,
            pricePerTask,
            stake,
            listing.listedAt
        );
        emit CapabilitiesUpdated(agentId, capabilities);
    }

    /**
     * @notice Delist and return the locked USDC stake to the listing owner.
     */
    function delistAgent(uint256 agentId) external nonReentrant {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
        if (listing.owner != msg.sender) revert NotListingOwner();

        uint256 stake = listing.stakeAmount;
        address stakeRecipient = listing.owner;

        listing.isActive = false;
        listing.isFeatured = false;
        listing.stakeAmount = 0;

        _removeFromListed(agentId);

        if (stake > 0) {
            usdc.safeTransfer(stakeRecipient, stake);
        }

        emit AgentDelisted(agentId, stakeRecipient, stake);
    }

    /**
     * @notice Curator flag for homepage / featured rails (contract owner only).
     */
    function featureAgent(uint256 agentId, bool featured) external onlyOwner {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
        listing.isFeatured = featured;
        emit AgentFeatured(agentId, featured);
    }

    /**
     * @notice Update listing metadata. Caller must still own the identity NFT.
     */
    function updateListing(
        uint256 agentId,
        string calldata x402Endpoint,
        string[] calldata capabilities,
        uint256 pricePerTask
    ) external {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
        if (listing.owner != msg.sender) revert NotListingOwner();
        if (identityRegistry.ownerOf(agentId) != msg.sender) {
            revert NotAgentOwner();
        }
        if (capabilities.length == 0) revert EmptyCapabilities();
        if (capabilities.length > MAX_CAPABILITIES) revert TooManyCapabilities();

        listing.x402Endpoint = x402Endpoint;
        listing.pricePerTask = pricePerTask;
        _setCapabilities(listing, capabilities);

        emit AgentUpdated(agentId, x402Endpoint, pricePerTask);
        emit CapabilitiesUpdated(agentId, capabilities);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    function getAgent(uint256 agentId)
        external
        view
        returns (AgentListing memory)
    {
        AgentListing memory listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
        return listing;
    }

    function getAllListedAgents() external view returns (uint256[] memory) {
        return _listedAgentIds;
    }

    function listedCount() external view returns (uint256) {
        return _listedAgentIds.length;
    }

    function isListed(uint256 agentId) external view returns (bool) {
        return _listings[agentId].isActive;
    }

    function getAgents(uint256[] calldata agentIds)
        external
        view
        returns (AgentListing[] memory results)
    {
        results = new AgentListing[](agentIds.length);
        for (uint256 i = 0; i < agentIds.length; ) {
            results[i] = _listings[agentIds[i]];
            unchecked {
                ++i;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Change stake for *future* listings only.
    function setListStakeAmount(uint256 newAmount) external onlyOwner {
        if (newAmount == 0) revert ZeroStake();
        uint256 old = listStakeAmount;
        listStakeAmount = newAmount;
        emit ListStakeAmountUpdated(old, newAmount);
    }

    /**
     * @notice Rescue tokens accidentally sent to this contract.
     * @dev Prefer a multisig as owner in production. Do not use this to
     *      short-change active listing stakes intentionally.
     */
    function rescueTokens(address token, uint256 amount, address to)
        external
        onlyOwner
    {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    function _setCapabilities(
        AgentListing storage listing,
        string[] calldata capabilities
    ) private {
        delete listing.capabilities;
        for (uint256 i = 0; i < capabilities.length; ) {
            listing.capabilities.push(capabilities[i]);
            unchecked {
                ++i;
            }
        }
    }

    function _addToListed(uint256 agentId) private {
        if (_listedIndexPlusOne[agentId] != 0) return;
        _listedAgentIds.push(agentId);
        _listedIndexPlusOne[agentId] = _listedAgentIds.length;
    }

    function _removeFromListed(uint256 agentId) private {
        uint256 indexPlusOne = _listedIndexPlusOne[agentId];
        if (indexPlusOne == 0) return;

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _listedAgentIds.length - 1;

        if (index != lastIndex) {
            uint256 lastAgentId = _listedAgentIds[lastIndex];
            _listedAgentIds[index] = lastAgentId;
            _listedIndexPlusOne[lastAgentId] = index + 1;
        }

        _listedAgentIds.pop();
        delete _listedIndexPlusOne[agentId];
    }
}
