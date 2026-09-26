// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title ZenthraCuratorV2
/// @author Zenthra
/// @notice Curated marketplace for ERC-8004 identity agents with USDC escrow,
///         dispute resolution, featuring fees, and peer endorsements.
contract ZenthraCuratorV2 is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    uint16 public constant MAX_FEE_BPS = 2000;
    uint256 public constant MAX_CAPABILITIES = 32;
    uint16 private constant BPS_DENOMINATOR = 10_000;
    uint16 private constant DISPUTE_SLASH_BPS = 500;

    IERC721 public immutable identityRegistry;
    IERC20 public immutable usdc;

    address public feeRecipient;
    uint16 public protocolFeeBps;
    uint256 public featuredPricePerDay;
    uint256 public optionalStakeAmount;
    uint256 public totalEscrow;
    uint256 public totalOptionalStakes;
    uint256 public totalPendingWithdrawals;
    uint256 public disputeTimeout;
    uint256 public minTaskAmount;
    uint32 public maxConcurrentTasksPerBuyer;
    uint256 public taskAcceptTimeout;

    mapping(address => uint256) public pendingWithdrawals;

    struct AgentListing {
        uint256 agentId;
        address owner;
        string x402Endpoint;
        string[] capabilities;
        uint256 pricePerTask;
        uint64 listedAt;
        uint64 featuredUntil;
        bool isActive;
        bool isFeaturedByOwner;
        uint256 bondAmount;
    }

    enum TaskStatus {
        Open,
        Accepted,
        Completed,
        Cancelled,
        Disputed,
        Resolved
    }

    struct Task {
        uint256 agentId;
        address buyer;
        address agent;
        uint256 amount;
        TaskStatus status;
        uint64 createdAt;
    }

    struct AgentStats {
        uint32 tasksCompleted;
        uint32 tasksDisputed;
        uint32 tasksCancelled;
        uint32 tasksResolved;
        uint256 totalEarned;
        uint256 totalVolume;
    }

    mapping(uint256 => AgentListing) private _listings;
    uint256[] private _listedAgentIds;
    mapping(uint256 => uint256) private _listedIndexPlusOne;

    uint256 private _nextTaskId;
    mapping(uint256 => Task) private _tasks;

    mapping(uint256 => AgentStats) private _stats;
    mapping(uint256 => uint256) private _endorsementCount;
    mapping(address => mapping(uint256 => bool)) private _hasEndorsed;
    mapping(uint256 => uint32) private _openTaskCount;
    mapping(address => uint32) private _buyerOpenTaskCount;

    error NotAgentOwner();
    error AlreadyListed();
    error NotListed();
    error NotListingOwner();
    error ZeroAddress();
    error ZeroAmount();
    error ZeroStake();
    error EmptyCapabilities();
    error TooManyCapabilities();
    error RescueWouldBreakSolvency();
    error TaskNotOpen();
    error TaskNotAccepted();
    error TaskNotDisputed();
    error NotTaskAgent();
    error NotTaskBuyer();
    error NotTaskParty();
    error AlreadyEndorsed();
    error CannotSelfEndorse();
    error EndorserNotListed();
    error EndorserHasNoCompletedTasks();
    error ZeroDays();
    error FeaturedPriceNotSet();
    error HasOpenTasks();
    error InvalidFeeBps();
    error InsufficientBond();
    error NothingToClaim();
    error DisputeNotExpired();
    error TaskAmountTooLow();
    error TooManyOpenTasks();
    error TaskAlreadyAccepted();
    error AcceptWindowExpired();
    error DisputeBeforeAccept();
    error CannotCancelAcceptedTask();
    error AcceptWindowNotExpired();

    event AgentListed(
        uint256 indexed agentId,
        address indexed owner,
        string x402Endpoint,
        uint256 pricePerTask,
        uint256 bondAmount,
        uint64 listedAt
    );
    event AgentDelisted(
        uint256 indexed agentId,
        address indexed owner,
        uint256 bondReturned
    );
    event AgentUpdated(
        uint256 indexed agentId,
        string x402Endpoint,
        uint256 pricePerTask
    );
    event CapabilitiesUpdated(uint256 indexed agentId, string[] capabilities);
    event ListingOwnerSynced(
        uint256 indexed agentId,
        address indexed oldOwner,
        address indexed newOwner
    );
    event AgentFeatured(uint256 indexed agentId, bool featured);
    event AgentFeaturedPaid(
        uint256 indexed agentId,
        uint256 numDays,
        uint256 amount,
        uint64 featuredUntil
    );
    event AgentEndorsed(
        uint256 indexed agentId,
        address indexed endorser,
        uint256 newCount
    );
    event TaskRequested(
        uint256 indexed taskId,
        uint256 indexed agentId,
        address indexed buyer,
        address agent,
        uint256 amount,
        uint64 createdAt
    );
    event TaskAccepted(
        uint256 indexed taskId,
        uint256 indexed agentId,
        address indexed agent
    );
    event TaskCompleted(
        uint256 indexed taskId,
        uint256 indexed agentId,
        address indexed agent,
        uint256 amountPaid,
        uint256 fee
    );
    event TaskCancelled(
        uint256 indexed taskId,
        uint256 indexed agentId,
        address indexed buyer,
        uint256 amountRefunded
    );
    event TaskDisputed(
        uint256 indexed taskId,
        uint256 indexed agentId,
        address disputedBy
    );
    event DisputeResolved(
        uint256 indexed taskId,
        bool payBuyer,
        uint256 amountPaid,
        uint256 fee,
        uint256 slashed
    );
    event DisputeAutoResolved(uint256 indexed taskId, uint256 amountRefunded);
    event ProtocolFeeUpdated(uint256 oldBps, uint256 newBps);
    event FeaturedPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event OptionalStakeUpdated(uint256 oldAmount, uint256 newAmount);
    event FeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );
    event PaymentClaimed(address indexed recipient, uint256 amount);
    event DisputeTimeoutUpdated(uint256 old, uint256 newTimeout);
    event MinTaskAmountUpdated(uint256 old, uint256 newAmount);
    event MaxConcurrentTasksUpdated(uint32 old, uint32 newMax);
    event TaskAcceptTimeoutUpdated(uint256 old, uint256 newTimeout);
    event TokensRescued(address indexed token, uint256 amount, address indexed to);

    /// @notice Deploys the marketplace with immutable token dependencies and fee config.
    /// @param identityRegistry_ ERC-721 identity registry used for agent ownership checks.
    /// @param usdc_ USDC token used for escrow, fees, optional listing bonds, and pull-claim payouts.
    /// @param feeRecipient_ Address receiving protocol fees, featuring fees, and slashes.
    /// @param protocolFeeBps_ Protocol fee in basis points charged when settling tasks.
    /// @param featuredPricePerDay_ USDC (6-decimal units) charged per featured day.
    /// @param optionalStakeAmount_ Minimum optional listing bond (0 means no required minimum).
    /// @param disputeTimeout_ Maximum age in seconds before a disputed task can be auto-resolved.
    /// @param minTaskAmount_ Minimum task escrow amount (0 disables the floor).
    /// @param maxConcurrentTasksPerBuyer_ Maximum open tasks per buyer (0 disables the cap).
    /// @param taskAcceptTimeout_ Maximum seconds for agent acceptance before buyer can reclaim.
    /// @param initialOwner Initial contract owner/admin.
    constructor(
        address identityRegistry_,
        address usdc_,
        address feeRecipient_,
        uint16 protocolFeeBps_,
        uint256 featuredPricePerDay_,
        uint256 optionalStakeAmount_,
        uint256 disputeTimeout_,
        uint256 minTaskAmount_,
        uint32 maxConcurrentTasksPerBuyer_,
        uint256 taskAcceptTimeout_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            identityRegistry_ == address(0) ||
            usdc_ == address(0) ||
            feeRecipient_ == address(0) ||
            initialOwner == address(0)
        ) revert ZeroAddress();
        if (protocolFeeBps_ > MAX_FEE_BPS) revert InvalidFeeBps();
        if (disputeTimeout_ == 0 || taskAcceptTimeout_ == 0) revert ZeroAmount();

        identityRegistry = IERC721(identityRegistry_);
        usdc = IERC20(usdc_);
        feeRecipient = feeRecipient_;
        protocolFeeBps = protocolFeeBps_;
        featuredPricePerDay = featuredPricePerDay_;
        optionalStakeAmount = optionalStakeAmount_;
        disputeTimeout = disputeTimeout_;
        minTaskAmount = minTaskAmount_;
        maxConcurrentTasksPerBuyer = maxConcurrentTasksPerBuyer_;
        taskAcceptTimeout = taskAcceptTimeout_;
    }

    /// @notice Prevents accidental ownership renounce.
    function renounceOwnership() public view override onlyOwner {
        revert("disabled");
    }

    /// @notice Lists an agent for task requests and optionally posts a USDC bond.
    /// @param agentId Identity-registry token id representing the agent.
    /// @param x402Endpoint Agent endpoint metadata.
    /// @param capabilities Agent capabilities metadata.
    /// @param pricePerTask Agent-selected listing price metadata.
    /// @param bond Optional USDC bond amount to lock with the listing.
    function listAgent(
        uint256 agentId,
        string calldata x402Endpoint,
        string[] calldata capabilities,
        uint256 pricePerTask,
        uint256 bond
    ) external nonReentrant whenNotPaused {
        if (identityRegistry.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (_listings[agentId].isActive) revert AlreadyListed();
        if (capabilities.length == 0) revert EmptyCapabilities();
        if (capabilities.length > MAX_CAPABILITIES) revert TooManyCapabilities();
        if (optionalStakeAmount > 0 && bond < optionalStakeAmount) {
            revert InsufficientBond();
        }

        if (bond > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), bond);
            totalOptionalStakes += bond;
        }

        AgentListing storage listing = _listings[agentId];
        listing.agentId = agentId;
        listing.owner = msg.sender;
        listing.x402Endpoint = x402Endpoint;
        listing.pricePerTask = pricePerTask;
        listing.listedAt = uint64(block.timestamp);
        listing.featuredUntil = 0;
        listing.isActive = true;
        listing.isFeaturedByOwner = false;
        listing.bondAmount = bond;

        _setCapabilities(listing, capabilities);
        _addToListed(agentId);

        emit AgentListed(
            agentId,
            msg.sender,
            x402Endpoint,
            pricePerTask,
            bond,
            listing.listedAt
        );
        emit CapabilitiesUpdated(agentId, capabilities);
    }

    /// @notice Delists an active agent and returns its remaining bond.
    /// @param agentId Agent id to delist.
    function delistAgent(uint256 agentId) external nonReentrant whenNotPaused {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
        if (listing.owner != msg.sender) revert NotListingOwner();
        if (_openTaskCount[agentId] > 0) revert HasOpenTasks();

        uint256 bond = listing.bondAmount;
        address owner_ = listing.owner;

        listing.isActive = false;
        listing.isFeaturedByOwner = false;
        listing.bondAmount = 0;
        listing.featuredUntil = 0;

        _removeFromListed(agentId);

        if (bond > 0) {
            totalOptionalStakes -= bond;
            usdc.safeTransfer(owner_, bond);
        }

        emit AgentDelisted(agentId, owner_, bond);
    }

    /// @notice Updates listing metadata and capabilities for an active listing.
    /// @param agentId Agent id to update.
    /// @param x402Endpoint New endpoint metadata.
    /// @param capabilities New capabilities metadata.
    /// @param pricePerTask New price metadata.
    function updateListing(
        uint256 agentId,
        string calldata x402Endpoint,
        string[] calldata capabilities,
        uint256 pricePerTask
    ) external whenNotPaused {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
        if (listing.owner != msg.sender) revert NotListingOwner();
        if (identityRegistry.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (capabilities.length == 0) revert EmptyCapabilities();
        if (capabilities.length > MAX_CAPABILITIES) revert TooManyCapabilities();

        listing.x402Endpoint = x402Endpoint;
        listing.pricePerTask = pricePerTask;
        _setCapabilities(listing, capabilities);

        emit AgentUpdated(agentId, x402Endpoint, pricePerTask);
        emit CapabilitiesUpdated(agentId, capabilities);
    }

    /// @notice Syncs listing owner to current identity NFT owner.
    /// @param agentId Agent id to sync.
    function syncListingOwner(uint256 agentId) external {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();

        address nftOwner = identityRegistry.ownerOf(agentId);
        if (nftOwner == listing.owner) return;

        address oldOwner = listing.owner;
        listing.owner = nftOwner;

        emit ListingOwnerSynced(agentId, oldOwner, nftOwner);
    }

    /// @notice Requests a task and escrows USDC payment in contract custody.
    /// @param agentId Agent id receiving the task request.
    /// @param amount Escrow amount in USDC smallest units.
    function requestTask(
        uint256 agentId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
        if (amount == 0) revert ZeroAmount();
        if (minTaskAmount > 0 && amount < minTaskAmount) revert TaskAmountTooLow();
        if (
            maxConcurrentTasksPerBuyer > 0 &&
            _buyerOpenTaskCount[msg.sender] >= maxConcurrentTasksPerBuyer
        ) {
            revert TooManyOpenTasks();
        }

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalEscrow += amount;

        uint256 taskId = _nextTaskId;
        // SAFETY: _nextTaskId is monotonically increasing and cannot overflow in
        // practical operation (2^256 task creations is unreachable).
        unchecked {
            _nextTaskId = taskId + 1;
        }

        _tasks[taskId] = Task({
            agentId: agentId,
            buyer: msg.sender,
            agent: listing.owner,
            amount: amount,
            status: TaskStatus.Open,
            createdAt: uint64(block.timestamp)
        });

        _openTaskCount[agentId] += 1;
        _buyerOpenTaskCount[msg.sender] += 1;

        emit TaskRequested(
            taskId,
            agentId,
            msg.sender,
            listing.owner,
            amount,
            uint64(block.timestamp)
        );
    }

    /// @notice Accepts an open task during the configured acceptance window.
    /// @param taskId Task id to accept.
    function acceptTask(
        uint256 taskId
    ) external nonReentrant whenNotPaused {
        Task storage task = _tasks[taskId];
        if (task.agent != msg.sender) revert NotTaskAgent();
        if (task.status == TaskStatus.Accepted) revert TaskAlreadyAccepted();
        if (task.status != TaskStatus.Open) revert TaskNotOpen();
        if (block.timestamp > uint256(task.createdAt) + taskAcceptTimeout) {
            revert AcceptWindowExpired();
        }

        task.status = TaskStatus.Accepted;

        emit TaskAccepted(taskId, task.agentId, msg.sender);
    }

    /// @notice Completes an accepted task and allocates escrow minus protocol fee to pull-claim balances.
    /// @param taskId Task id to complete.
    function completeTask(
        uint256 taskId
    ) external nonReentrant whenNotPaused {
        Task storage task = _tasks[taskId];
        if (task.agent != msg.sender) revert NotTaskAgent();
        if (task.status != TaskStatus.Accepted) revert TaskNotAccepted();

        uint256 amount = task.amount;

        task.status = TaskStatus.Completed;
        totalEscrow -= amount;
        _openTaskCount[task.agentId] -= 1;
        _buyerOpenTaskCount[task.buyer] -= 1;

        uint256 fee = (amount * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 payout = amount - fee;

        AgentStats storage s = _stats[task.agentId];
        s.tasksCompleted += 1;
        s.totalEarned += payout;
        s.totalVolume += amount;

        _credit(task.agent, payout);
        if (fee > 0) {
            _credit(feeRecipient, fee);
        }

        emit TaskCompleted(taskId, task.agentId, task.agent, payout, fee);
    }

    /// @notice Cancels a task and allocates refundable escrow to the buyer's pull-claim balance.
    /// @dev Open tasks can always be cancelled by the buyer. Accepted tasks can only be cancelled
    ///      after 2x the acceptance window has elapsed from task creation.
    /// @param taskId Task id to cancel.
    function cancelTask(uint256 taskId) external nonReentrant whenNotPaused {
        Task storage task = _tasks[taskId];
        if (task.buyer != msg.sender) revert NotTaskBuyer();

        if (task.status == TaskStatus.Accepted) {
            if (
                block.timestamp <=
                uint256(task.createdAt) + (taskAcceptTimeout * 2)
            ) {
                revert CannotCancelAcceptedTask();
            }
        } else if (task.status != TaskStatus.Open) {
            revert TaskNotOpen();
        }

        uint256 amount = task.amount;

        task.status = TaskStatus.Cancelled;
        totalEscrow -= amount;
        _openTaskCount[task.agentId] -= 1;
        _buyerOpenTaskCount[task.buyer] -= 1;

        AgentStats storage s = _stats[task.agentId];
        s.tasksCancelled += 1;

        _credit(task.buyer, amount);

        emit TaskCancelled(taskId, task.agentId, task.buyer, amount);
    }

    /// @notice Moves an accepted task into disputed state by either buyer or agent.
    /// @param taskId Task id to dispute.
    function disputeTask(uint256 taskId) external whenNotPaused {
        Task storage task = _tasks[taskId];
        if (msg.sender != task.buyer && msg.sender != task.agent) {
            revert NotTaskParty();
        }
        if (task.status == TaskStatus.Open) revert DisputeBeforeAccept();
        if (task.status != TaskStatus.Accepted) revert TaskNotAccepted();

        task.status = TaskStatus.Disputed;

        AgentStats storage s = _stats[task.agentId];
        s.tasksDisputed += 1;

        emit TaskDisputed(taskId, task.agentId, msg.sender);
    }

    /// @notice Owner-only settlement of disputed tasks with pull-claim payout allocation.
    /// @param taskId Task id to resolve.
    /// @param payBuyer If true, buyer receives payout and optional bond slash may apply.
    function resolveDispute(
        uint256 taskId,
        bool payBuyer
    ) external onlyOwner nonReentrant {
        Task storage task = _tasks[taskId];
        if (task.status != TaskStatus.Disputed) revert TaskNotDisputed();

        uint256 amount = task.amount;

        task.status = TaskStatus.Resolved;
        totalEscrow -= amount;
        _openTaskCount[task.agentId] -= 1;
        _buyerOpenTaskCount[task.buyer] -= 1;

        uint256 fee = (amount * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 payout = amount - fee;
        uint256 slashed = 0;

        AgentStats storage s = _stats[task.agentId];
        s.tasksResolved += 1;
        s.totalVolume += amount;

        if (payBuyer) {
            _credit(task.buyer, payout);
            if (fee > 0) {
                _credit(feeRecipient, fee);
            }

            AgentListing storage listing = _listings[task.agentId];
            if (listing.bondAmount > 0) {
                uint256 maxSlash = (amount * DISPUTE_SLASH_BPS) / BPS_DENOMINATOR;
                slashed = listing.bondAmount < maxSlash
                    ? listing.bondAmount
                    : maxSlash;

                if (slashed > 0) {
                    listing.bondAmount -= slashed;
                    totalOptionalStakes -= slashed;
                    _credit(feeRecipient, slashed);
                }
            }
        } else {
            s.totalEarned += payout;
            _credit(task.agent, payout);
            if (fee > 0) {
                _credit(feeRecipient, fee);
            }
        }

        emit DisputeResolved(taskId, payBuyer, payout, fee, slashed);
    }

    /// @notice Resolves an expired disputed task with a full buyer refund via pull-claim.
    /// @param taskId Task id to settle.
    function settleExpiredDispute(uint256 taskId) external nonReentrant {
        Task storage task = _tasks[taskId];
        if (task.status != TaskStatus.Disputed) revert TaskNotDisputed();
        if (block.timestamp < uint256(task.createdAt) + disputeTimeout) {
            revert DisputeNotExpired();
        }

        uint256 amount = task.amount;

        task.status = TaskStatus.Resolved;
        totalEscrow -= amount;
        _openTaskCount[task.agentId] -= 1;
        _buyerOpenTaskCount[task.buyer] -= 1;

        AgentStats storage s = _stats[task.agentId];
        s.tasksResolved += 1;

        _credit(task.buyer, amount);

        emit DisputeAutoResolved(taskId, amount);
    }

    /// @notice Reclaims escrow when the agent fails to accept before acceptance timeout.
    /// @param taskId Task id to reclaim.
    function reclaimExpiredTask(uint256 taskId) external nonReentrant {
        Task storage task = _tasks[taskId];
        if (task.buyer != msg.sender) revert NotTaskBuyer();
        if (task.status != TaskStatus.Open) revert TaskNotOpen();
        if (block.timestamp <= uint256(task.createdAt) + taskAcceptTimeout) {
            revert AcceptWindowNotExpired();
        }

        uint256 amount = task.amount;

        task.status = TaskStatus.Cancelled;
        totalEscrow -= amount;
        _openTaskCount[task.agentId] -= 1;
        _buyerOpenTaskCount[task.buyer] -= 1;

        AgentStats storage s = _stats[task.agentId];
        s.tasksCancelled += 1;

        _credit(task.buyer, amount);

        emit TaskCancelled(taskId, task.agentId, task.buyer, amount);
    }

    /// @notice Claims accumulated pull-claim USDC payouts for caller.
    function claimPayment() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToClaim();

        pendingWithdrawals[msg.sender] = 0;
        totalPendingWithdrawals -= amount;

        usdc.safeTransfer(msg.sender, amount);
        emit PaymentClaimed(msg.sender, amount);
    }

    /// @notice Endorses a listed target agent as the owner of another active listed agent.
    /// @dev Endorser agent must have completed at least one task.
    /// @param endorserAgentId Active listed agent id controlled by caller.
    /// @param targetAgentId Target listed agent id to endorse.
    function endorseAgent(
        uint256 endorserAgentId,
        uint256 targetAgentId
    ) external whenNotPaused {
        if (
            !_listings[endorserAgentId].isActive ||
            identityRegistry.ownerOf(endorserAgentId) != msg.sender
        ) {
            revert EndorserNotListed();
        }
        if (_stats[endorserAgentId].tasksCompleted == 0) {
            revert EndorserHasNoCompletedTasks();
        }
        if (endorserAgentId == targetAgentId) revert CannotSelfEndorse();
        if (_hasEndorsed[msg.sender][targetAgentId]) revert AlreadyEndorsed();
        if (!_listings[targetAgentId].isActive) revert NotListed();

        _hasEndorsed[msg.sender][targetAgentId] = true;
        _endorsementCount[targetAgentId] += 1;

        emit AgentEndorsed(
            targetAgentId,
            msg.sender,
            _endorsementCount[targetAgentId]
        );
    }

    /// @notice Pays for temporary featured status extension in days.
    /// @param agentId Listed agent id.
    /// @param numDays_ Number of 24-hour periods to purchase.
    function payForFeatured(
        uint256 agentId,
        uint256 numDays_
    ) external nonReentrant whenNotPaused {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
        if (listing.owner != msg.sender) revert NotListingOwner();
        if (numDays_ == 0) revert ZeroDays();
        if (featuredPricePerDay == 0) revert FeaturedPriceNotSet();

        uint256 cost = featuredPricePerDay * numDays_;
        usdc.safeTransferFrom(msg.sender, feeRecipient, cost);

        uint256 start = listing.featuredUntil > block.timestamp
            ? listing.featuredUntil
            : block.timestamp;
        uint256 newFeaturedUntil = start + (numDays_ * 1 days);
        listing.featuredUntil = uint64(newFeaturedUntil);

        emit AgentFeaturedPaid(agentId, numDays_, cost, listing.featuredUntil);
    }

    /// @notice Owner-level featured flag override for listed agents.
    /// @param agentId Listed agent id.
    /// @param featured True to set owner-featured flag, false to unset.
    function featureAgent(uint256 agentId, bool featured) external onlyOwner {
        AgentListing storage listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();

        listing.isFeaturedByOwner = featured;
        emit AgentFeatured(agentId, featured);
    }

    /// @notice Updates protocol fee basis points.
    /// @param newBps New fee in basis points.
    function setProtocolFeeBps(uint16 newBps) external onlyOwner {
        if (newBps > MAX_FEE_BPS) revert InvalidFeeBps();

        uint16 old = protocolFeeBps;
        protocolFeeBps = newBps;

        emit ProtocolFeeUpdated(old, newBps);
    }

    /// @notice Updates per-day featured price (0 disables paid featuring).
    /// @param price New featured price in USDC smallest units.
    function setFeaturedPricePerDay(uint256 price) external onlyOwner {
        uint256 old = featuredPricePerDay;
        featuredPricePerDay = price;
        emit FeaturedPriceUpdated(old, price);
    }

    /// @notice Updates optional listing-bond minimum (0 disables minimum).
    /// @param amount New optional stake minimum in USDC smallest units.
    function setOptionalStakeAmount(uint256 amount) external onlyOwner {
        uint256 old = optionalStakeAmount;
        optionalStakeAmount = amount;
        emit OptionalStakeUpdated(old, amount);
    }

    /// @notice Updates dispute timeout in seconds.
    /// @param newTimeout New timeout in seconds.
    function setDisputeTimeout(uint256 newTimeout) external onlyOwner {
        if (newTimeout == 0) revert ZeroAmount();

        uint256 old = disputeTimeout;
        disputeTimeout = newTimeout;

        emit DisputeTimeoutUpdated(old, newTimeout);
    }

    /// @notice Updates minimum task amount (0 disables floor).
    /// @param amount New minimum amount in USDC smallest units.
    function setMinTaskAmount(uint256 amount) external onlyOwner {
        uint256 old = minTaskAmount;
        minTaskAmount = amount;
        emit MinTaskAmountUpdated(old, amount);
    }

    /// @notice Updates maximum concurrent open tasks per buyer (0 disables cap).
    /// @param max New maximum concurrent tasks.
    function setMaxConcurrentTasksPerBuyer(uint32 max) external onlyOwner {
        uint32 old = maxConcurrentTasksPerBuyer;
        maxConcurrentTasksPerBuyer = max;
        emit MaxConcurrentTasksUpdated(old, max);
    }

    /// @notice Updates task acceptance timeout in seconds.
    /// @param newTimeout New timeout in seconds.
    function setTaskAcceptTimeout(uint256 newTimeout) external onlyOwner {
        if (newTimeout == 0) revert ZeroAmount();

        uint256 old = taskAcceptTimeout;
        taskAcceptTimeout = newTimeout;

        emit TaskAcceptTimeoutUpdated(old, newTimeout);
    }

    /// @notice Updates protocol fee recipient.
    /// @param addr New recipient address.
    function setFeeRecipient(address addr) external onlyOwner {
        if (addr == address(0)) revert ZeroAddress();

        address old = feeRecipient;
        feeRecipient = addr;

        emit FeeRecipientUpdated(old, addr);
    }

    /// @notice Pauses user-facing state-changing operations guarded by whenNotPaused.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses user-facing state-changing operations guarded by whenNotPaused.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Rescues tokens held by contract, preserving solvency for escrowed USDC liabilities.
    /// @param token ERC-20 token address to rescue.
    /// @param amount Amount to rescue.
    /// @param to Recipient address.
    function rescueTokens(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();

        if (token == address(usdc)) {
            uint256 balance = usdc.balanceOf(address(this));
            uint256 liabilities =
                totalEscrow + totalOptionalStakes + totalPendingWithdrawals;
            uint256 surplus = balance > liabilities ? balance - liabilities : 0;
            if (amount > surplus) revert RescueWouldBreakSolvency();
        }

        IERC20(token).safeTransfer(to, amount);
        emit TokensRescued(token, amount, to);
    }

    /// @notice Returns a listed agent; reverts when inactive.
    /// @param agentId Agent id.
    /// @return listing Agent listing struct.
    function getAgent(
        uint256 agentId
    ) external view returns (AgentListing memory listing) {
        listing = _listings[agentId];
        if (!listing.isActive) revert NotListed();
    }

    /// @notice Returns all currently listed agent ids.
    /// @return agentIds Active listed ids.
    function getAllListedAgents() external view returns (uint256[] memory agentIds) {
        return _listedAgentIds;
    }

    /// @notice Returns the number of active listed agents.
    /// @return count Active listing count.
    function listedCount() external view returns (uint256 count) {
        return _listedAgentIds.length;
    }

    /// @notice Returns whether an agent id is currently listed.
    /// @param agentId Agent id.
    /// @return True if listing is active.
    function isListed(uint256 agentId) external view returns (bool) {
        return _listings[agentId].isActive;
    }

    /// @notice Batch fetches listing structs without reverting on inactive ids.
    /// @param agentIds Agent ids to fetch.
    /// @return results Raw listing structs (inactive entries included as stored).
    function getAgents(
        uint256[] calldata agentIds
    ) external view returns (AgentListing[] memory results) {
        results = new AgentListing[](agentIds.length);
        for (uint256 i = 0; i < agentIds.length; ) {
            results[i] = _listings[agentIds[i]];
            // SAFETY: loop index is bounded by agentIds.length and increments once.
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Returns task data by task id.
    /// @param taskId Task id.
    /// @return task Task struct.
    function getTask(uint256 taskId) external view returns (Task memory task) {
        return _tasks[taskId];
    }

    /// @notice Returns aggregate stats for an agent id.
    /// @param agentId Agent id.
    /// @return stats Agent stats struct.
    function getAgentStats(
        uint256 agentId
    ) external view returns (AgentStats memory stats) {
        return _stats[agentId];
    }

    /// @notice Returns endorsement count for an agent id.
    /// @param agentId Agent id.
    /// @return count Number of endorsements.
    function getEndorsementCount(
        uint256 agentId
    ) external view returns (uint256 count) {
        return _endorsementCount[agentId];
    }

    /// @notice Returns whether an address has endorsed an agent id.
    /// @param endorser Endorser address.
    /// @param agentId Target agent id.
    /// @return True if endorsed.
    function hasEndorsed(
        address endorser,
        uint256 agentId
    ) external view returns (bool) {
        return _hasEndorsed[endorser][agentId];
    }

    /// @notice Returns whether agent is currently featured by owner flag or paid timer.
    /// @param agentId Agent id.
    /// @return True when featured.
    function isFeatured(uint256 agentId) external view returns (bool) {
        AgentListing storage listing = _listings[agentId];
        return
            listing.isFeaturedByOwner || listing.featuredUntil > block.timestamp;
    }

    function _setCapabilities(
        AgentListing storage listing,
        string[] calldata capabilities
    ) internal {
        delete listing.capabilities;
        for (uint256 i = 0; i < capabilities.length; ) {
            listing.capabilities.push(capabilities[i]);
            // SAFETY: loop index is bounded by capabilities.length and increments once.
            unchecked {
                ++i;
            }
        }
    }

    function _addToListed(uint256 agentId) internal {
        if (_listedIndexPlusOne[agentId] != 0) return;
        _listedAgentIds.push(agentId);
        _listedIndexPlusOne[agentId] = _listedAgentIds.length;
    }

    function _removeFromListed(uint256 agentId) internal {
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

    function _credit(address recipient, uint256 amount) internal {
        pendingWithdrawals[recipient] += amount;
        totalPendingWithdrawals += amount;
    }
}
