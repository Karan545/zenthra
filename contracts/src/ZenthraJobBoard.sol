// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title ZenthraJobBoard
/// @author Zenthra
/// @notice USDC-escrowed job board for ERC-8004 identity agents with bid staking, dispute resolution,
///         and pull-claim settlement.
contract ZenthraJobBoard is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    uint16 public constant MAX_FEE_BPS = 2000;
    uint32 public constant MAX_BIDS_PER_JOB = 50;
    uint256 public constant MAX_JOB_CAPABILITIES = 16;
    uint16 private constant BPS_DENOMINATOR = 10_000;

    IERC721 public immutable identityRegistry;
    IERC20 public immutable usdc;

    address public feeRecipient;
    uint16 public protocolFeeBps;
    uint256 public minBounty;
    uint256 public minBidStake;
    uint256 public jobAcceptTimeout;
    uint256 public deliveryTimeout;
    uint256 public disputeTimeout;
    uint256 public jobExpireTimeout;
    uint256 public totalEscrow;
    uint256 public totalBidStakes;
    uint256 public totalPendingWithdrawals;

    mapping(address => uint256) public pendingWithdrawals;

    uint256 private _nextJobId;
    mapping(uint256 => Job) private _jobs;
    mapping(uint256 => Bid[]) private _bids;

    uint32 public maxOpenJobsPerPoster;
    mapping(address => uint32) private _posterOpenJobCount;

    enum JobStatus {
        Open,
        WinnerSelected,
        Accepted,
        Completed,
        Cancelled,
        Disputed,
        Resolved
    }

    struct Job {
        uint256 jobId;
        address poster;
        string title;
        string description;
        string[] requiredCapabilities;
        uint256 bounty;
        uint64 deadline;
        uint64 postedAt;
        uint64 selectedAt;
        uint64 acceptedAt;
        uint64 disputedAt;
        uint32 maxBids;
        JobStatus status;
        address winner;
        uint256 winnerAgentId;
        uint256 winnerBidIndex;
    }

    struct Bid {
        uint256 agentId;
        address bidder;
        string proposal;
        uint256 stakeAmount;
        uint64 submittedAt;
        bool withdrawn;
    }

    error NotJobPoster();
    error NotJobWinner();
    error NotJobBidder();
    error JobNotOpen();
    error JobNotWinnerSelected();
    error JobNotAccepted();
    error JobNotDisputed();
    error AlreadyBid();
    error MaxBidsReached();
    error BountyTooLow();
    error BidStkTooLow();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidFeeBps();
    error NothingToClaim();
    error DeadlineInPast();
    error DeadlineTooSoon();
    error AcceptWindowExpired();
    error AcceptWindowNotExpired();
    error DeliveryWindowNotExpired();
    error DisputeNotExpired();
    error RescueWouldBreakSolvency();
    error TooManyOpenJobs();
    error NoAgentIdentity();
    error CapsTooMany();
    error EmptyCaps();
    error WinnerAlreadySelected();
    error JobDeadlinePassed();
    error JobNotExpired();
    error PosterCannotBid();
    error BidNotRefundable();

    event JobPosted(
        uint256 indexed jobId,
        address indexed poster,
        uint256 bounty,
        uint64 deadline
    );
    event BidSubmitted(
        uint256 indexed jobId,
        uint256 indexed agentId,
        address indexed bidder,
        uint256 stakeAmount,
        uint64 submittedAt
    );
    event WinnerSelected(
        uint256 indexed jobId,
        uint256 indexed agentId,
        address indexed winner,
        uint256 bidIndex
    );
    event JobAccepted(
        uint256 indexed jobId,
        uint256 indexed agentId,
        address indexed winner,
        uint64 acceptedAt
    );
    event DeliveryConfirmed(
        uint256 indexed jobId,
        address indexed winner,
        uint256 amountPaid,
        uint256 fee
    );
    event JobCancelled(
        uint256 indexed jobId,
        address indexed poster,
        uint256 bountyRefunded
    );
    event JobDisputed(uint256 indexed jobId, address indexed disputedBy);
    event JobDisputeResolved(
        uint256 indexed jobId,
        bool payBuyer,
        uint256 amountPaid,
        uint256 fee
    );
    event JobDisputeAutoResolved(uint256 indexed jobId, uint256 amountRefunded);
    event BidRefunded(
        uint256 indexed jobId,
        uint256 indexed agentId,
        address indexed bidder,
        uint256 stakeRefunded
    );
    event PaymentClaimed(address indexed recipient, uint256 amount);
    event ProtocolFeeUpdated(uint256 oldBps, uint256 newBps);
    event FeeRecipientUpdated(address indexed old, address indexed newAddr);
    event MinBountyUpdated(uint256 old, uint256 newAmt);
    event MinBidStakeUpdated(uint256 old, uint256 newAmt);
    event JobAcceptTimeoutUpdated(uint256 old, uint256 newVal);
    event DeliveryTimeoutUpdated(uint256 old, uint256 newVal);
    event DisputeTimeoutUpdated(uint256 old, uint256 newVal);
    event JobExpireTimeoutUpdated(uint256 old, uint256 newVal);
    event MaxOpenJobsPerPosterUpdated(uint32 old, uint32 newVal);
    event TokensRescued(address indexed token, uint256 amount, address indexed to);

    /// @notice Deploys the job board with immutable token dependencies and risk parameters.
    /// @param identityRegistry_ ERC-721 identity registry used to validate bidder ownership.
    /// @param usdc_ ERC-20 USDC used for bounty escrow and stake bonding.
    /// @param feeRecipient_ Address receiving protocol fees.
    /// @param protocolFeeBps_ Protocol fee in basis points.
    /// @param minBounty_ Minimum bounty amount (0 disables minimum).
    /// @param minBidStake_ Minimum bid stake amount (0 allows free bids).
    /// @param jobAcceptTimeout_ Seconds winner has to accept after selection.
    /// @param deliveryTimeout_ Seconds after acceptance before buyer can reclaim for non-delivery.
    /// @param disputeTimeout_ Seconds after dispute creation before public auto-refund is allowed.
    /// @param jobExpireTimeout_ Seconds after postedAt/deadline before open jobs can be force-expired.
    /// @param maxOpenJobsPerPoster_ Maximum concurrent open jobs per poster (0 disables cap).
    /// @param initialOwner Initial contract owner.
    constructor(
        address identityRegistry_,
        address usdc_,
        address feeRecipient_,
        uint16 protocolFeeBps_,
        uint256 minBounty_,
        uint256 minBidStake_,
        uint256 jobAcceptTimeout_,
        uint256 deliveryTimeout_,
        uint256 disputeTimeout_,
        uint256 jobExpireTimeout_,
        uint32 maxOpenJobsPerPoster_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            identityRegistry_ == address(0) ||
            usdc_ == address(0) ||
            feeRecipient_ == address(0) ||
            initialOwner == address(0)
        ) revert ZeroAddress();
        if (protocolFeeBps_ > MAX_FEE_BPS) revert InvalidFeeBps();
        if (
            jobAcceptTimeout_ == 0 ||
            deliveryTimeout_ == 0 ||
            disputeTimeout_ == 0 ||
            jobExpireTimeout_ == 0
        ) {
            revert ZeroAmount();
        }

        identityRegistry = IERC721(identityRegistry_);
        usdc = IERC20(usdc_);
        feeRecipient = feeRecipient_;
        protocolFeeBps = protocolFeeBps_;
        minBounty = minBounty_;
        minBidStake = minBidStake_;
        jobAcceptTimeout = jobAcceptTimeout_;
        deliveryTimeout = deliveryTimeout_;
        disputeTimeout = disputeTimeout_;
        jobExpireTimeout = jobExpireTimeout_;
        maxOpenJobsPerPoster = maxOpenJobsPerPoster_;
    }

    /// @notice Prevents accidental ownership renounce.
    function renounceOwnership() public view override onlyOwner {
        revert("disabled");
    }

    /// @notice Posts a new USDC-funded job into escrow.
    /// @param title Job title.
    /// @param description Job description.
    /// @param requiredCapabilities Required capability labels.
    /// @param bounty USDC bounty amount.
    /// @param deadline Optional bid deadline (0 for no deadline).
    /// @param maxBids_ Optional per-job bid cap (0 uses MAX_BIDS_PER_JOB).
    function postJob(
        string calldata title,
        string calldata description,
        string[] calldata requiredCapabilities,
        uint256 bounty,
        uint64 deadline,
        uint32 maxBids_
    ) external nonReentrant whenNotPaused {
        if (bounty == 0) revert ZeroAmount();
        if (minBounty > 0 && bounty < minBounty) revert BountyTooLow();
        if (deadline != 0 && deadline <= block.timestamp) revert DeadlineInPast();
        if (requiredCapabilities.length == 0) revert EmptyCaps();
        if (requiredCapabilities.length > MAX_JOB_CAPABILITIES) revert CapsTooMany();
        if (
            maxOpenJobsPerPoster > 0 &&
            _posterOpenJobCount[msg.sender] >= maxOpenJobsPerPoster
        ) {
            revert TooManyOpenJobs();
        }

        usdc.safeTransferFrom(msg.sender, address(this), bounty);
        totalEscrow += bounty;
        _posterOpenJobCount[msg.sender] += 1;

        uint256 jobId = _nextJobId;
        // SAFETY: _nextJobId only increments by one per post and cannot overflow in practical operation.
        unchecked {
            _nextJobId = jobId + 1;
        }

        Job storage job = _jobs[jobId];
        job.jobId = jobId;
        job.poster = msg.sender;
        job.title = title;
        job.description = description;
        job.bounty = bounty;
        job.deadline = deadline;
        job.postedAt = uint64(block.timestamp);
        job.status = JobStatus.Open;
        job.maxBids = maxBids_ > MAX_BIDS_PER_JOB ? MAX_BIDS_PER_JOB : maxBids_;

        for (uint256 i = 0; i < requiredCapabilities.length; ) {
            job.requiredCapabilities.push(requiredCapabilities[i]);
            // SAFETY: loop index is bounded by requiredCapabilities.length and increments once.
            unchecked {
                ++i;
            }
        }

        emit JobPosted(jobId, msg.sender, bounty, deadline);
    }

    /// @notice Submits a bid for an open job and optionally bonds stake.
    /// @param jobId Job id to bid on.
    /// @param agentId Bidder identity token id.
    /// @param proposal Bid proposal metadata.
    /// @param stakeAmount Optional stake amount.
    function submitBid(
        uint256 jobId,
        uint256 agentId,
        string calldata proposal,
        uint256 stakeAmount
    ) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.Open) revert JobNotOpen();
        if (job.deadline != 0 && block.timestamp > job.deadline) {
            revert JobDeadlinePassed();
        }
        if (msg.sender == job.poster) revert PosterCannotBid();

        address owner;
        try identityRegistry.ownerOf(agentId) returns (address currentOwner) {
            owner = currentOwner;
        } catch {
            revert NoAgentIdentity();
        }
        if (owner != msg.sender) revert NoAgentIdentity();

        Bid[] storage bids = _bids[jobId];
        for (uint256 i = 0; i < bids.length; ) {
            Bid storage existing = bids[i];
            if (existing.bidder == msg.sender && !existing.withdrawn) revert AlreadyBid();
            // SAFETY: loop index is bounded by bids.length and increments once.
            unchecked {
                ++i;
            }
        }

        uint256 effectiveCap = job.maxBids > 0 ? job.maxBids : MAX_BIDS_PER_JOB;
        if (bids.length >= effectiveCap) revert MaxBidsReached();

        if (minBidStake > 0 && stakeAmount < minBidStake) revert BidStkTooLow();

        if (stakeAmount > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), stakeAmount);
            totalBidStakes += stakeAmount;
        }

        bids.push(
            Bid({
                agentId: agentId,
                bidder: msg.sender,
                proposal: proposal,
                stakeAmount: stakeAmount,
                submittedAt: uint64(block.timestamp),
                withdrawn: false
            })
        );

        emit BidSubmitted(jobId, agentId, msg.sender, stakeAmount, uint64(block.timestamp));
    }

    /// @notice Selects a winning bid and immediately refunds all losing stake bonds to pull-claim balances.
    /// @param jobId Job id.
    /// @param bidIndex Index of selected winning bid.
    function selectWinner(uint256 jobId, uint256 bidIndex) external whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.poster != msg.sender) revert NotJobPoster();
        if (job.status != JobStatus.Open) revert JobNotOpen();
        if (job.winner != address(0)) revert WinnerAlreadySelected();

        Bid[] storage bids = _bids[jobId];
        if (bidIndex >= bids.length) revert BidNotRefundable();

        Bid storage winningBid = bids[bidIndex];
        if (winningBid.withdrawn) revert BidNotRefundable();

        job.status = JobStatus.WinnerSelected;
        job.winner = winningBid.bidder;
        job.winnerAgentId = winningBid.agentId;
        job.winnerBidIndex = bidIndex;
        job.selectedAt = uint64(block.timestamp);

        for (uint256 i = 0; i < bids.length; ) {
            if (i != bidIndex) {
                Bid storage currentBid = bids[i];
                if (!currentBid.withdrawn && currentBid.stakeAmount > 0) {
                    totalBidStakes -= currentBid.stakeAmount;
                    currentBid.withdrawn = true;
                    _credit(currentBid.bidder, currentBid.stakeAmount);
                    emit BidRefunded(
                        jobId,
                        currentBid.agentId,
                        currentBid.bidder,
                        currentBid.stakeAmount
                    );
                }
            }
            // SAFETY: loop index is bounded by bids.length and increments once.
            unchecked {
                ++i;
            }
        }

        emit WinnerSelected(jobId, winningBid.agentId, winningBid.bidder, bidIndex);
    }

    /// @notice Accepts a selected job by the chosen winner within the acceptance window.
    /// @param jobId Job id.
    function acceptJob(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.WinnerSelected) revert JobNotWinnerSelected();
        if (job.winner != msg.sender) revert NotJobWinner();
        if (block.timestamp > uint256(job.selectedAt) + jobAcceptTimeout) {
            revert AcceptWindowExpired();
        }

        job.status = JobStatus.Accepted;
        job.acceptedAt = uint64(block.timestamp);

        emit JobAccepted(jobId, job.winnerAgentId, msg.sender, job.acceptedAt);
    }

    /// @notice Confirms delivery and settles bounty + protocol fee to pull-claim balances.
    /// @param jobId Job id.
    function confirmDelivery(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.poster != msg.sender) revert NotJobPoster();
        if (job.status != JobStatus.Accepted) revert JobNotAccepted();

        uint256 bounty = job.bounty;
        uint256 fee = (bounty * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 payout = bounty - fee;

        job.status = JobStatus.Completed;
        totalEscrow -= bounty;
        _posterOpenJobCount[job.poster] -= 1;

        _refundWinnerStake(jobId, job);

        _credit(job.winner, payout);
        if (fee > 0) {
            _credit(feeRecipient, fee);
        }

        emit DeliveryConfirmed(jobId, job.winner, payout, fee);
    }

    /// @notice Cancels an open job and refunds bounty to poster via pull-claim balance.
    /// @param jobId Job id.
    function cancelJob(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.poster != msg.sender) revert NotJobPoster();
        if (job.status != JobStatus.Open) revert JobNotOpen();

        uint256 bounty = job.bounty;

        job.status = JobStatus.Cancelled;
        totalEscrow -= bounty;
        _posterOpenJobCount[job.poster] -= 1;

        _credit(job.poster, bounty);

        emit JobCancelled(jobId, job.poster, bounty);
    }

    /// @notice Expires a stale open job, refunding all bid stakes and bounty into pull-claim balances.
    /// @param jobId Job id.
    function expireJob(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.Open) revert JobNotOpen();

        uint256 staleAfter =
            (job.deadline > 0 ? uint256(job.deadline) : uint256(job.postedAt)) +
            jobExpireTimeout;
        if (block.timestamp <= staleAfter) revert JobNotExpired();

        uint256 bounty = job.bounty;

        job.status = JobStatus.Cancelled;
        totalEscrow -= bounty;
        _posterOpenJobCount[job.poster] -= 1;

        Bid[] storage bids = _bids[jobId];
        for (uint256 i = 0; i < bids.length; ) {
            Bid storage bid = bids[i];
            if (!bid.withdrawn && bid.stakeAmount > 0) {
                uint256 stake = bid.stakeAmount;
                bid.withdrawn = true;
                totalBidStakes -= stake;
                _credit(bid.bidder, stake);
                emit BidRefunded(jobId, bid.agentId, bid.bidder, stake);
            }
            // SAFETY: loop index is bounded by bids.length and increments once.
            unchecked {
                ++i;
            }
        }

        _credit(job.poster, bounty);

        emit JobCancelled(jobId, job.poster, bounty);
    }

    /// @notice Reclaims a winner-selected job after acceptance window expiry.
    /// @param jobId Job id.
    function reclaimUnacceptedJob(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        if (job.poster != msg.sender) revert NotJobPoster();
        if (job.status != JobStatus.WinnerSelected) revert JobNotWinnerSelected();
        if (block.timestamp <= uint256(job.selectedAt) + jobAcceptTimeout) {
            revert AcceptWindowNotExpired();
        }

        uint256 bounty = job.bounty;

        job.status = JobStatus.Cancelled;
        totalEscrow -= bounty;
        _posterOpenJobCount[job.poster] -= 1;

        Bid storage winningBid = _bids[jobId][job.winnerBidIndex];
        if (!winningBid.withdrawn && winningBid.stakeAmount > 0) {
            winningBid.withdrawn = true;
            totalBidStakes -= winningBid.stakeAmount;
            _credit(winningBid.bidder, winningBid.stakeAmount);
            emit BidRefunded(
                jobId,
                winningBid.agentId,
                winningBid.bidder,
                winningBid.stakeAmount
            );
        }

        _credit(job.poster, bounty);

        emit JobCancelled(jobId, job.poster, bounty);
    }

    /// @notice Reclaims an accepted job after delivery window expiry.
    /// @param jobId Job id.
    function reclaimUndeliveredJob(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        if (job.poster != msg.sender) revert NotJobPoster();
        if (job.status != JobStatus.Accepted) revert JobNotAccepted();
        if (block.timestamp <= uint256(job.acceptedAt) + deliveryTimeout) {
            revert DeliveryWindowNotExpired();
        }

        uint256 bounty = job.bounty;

        job.status = JobStatus.Cancelled;
        totalEscrow -= bounty;
        _posterOpenJobCount[job.poster] -= 1;

        _refundWinnerStake(jobId, job);

        _credit(job.poster, bounty);

        emit JobCancelled(jobId, job.poster, bounty);
    }

    /// @notice Opens a dispute for an accepted job by either poster or winner.
    /// @param jobId Job id.
    function disputeJob(uint256 jobId) external whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.Accepted) revert JobNotAccepted();
        if (msg.sender != job.poster && msg.sender != job.winner) {
            revert NotJobBidder();
        }

        job.status = JobStatus.Disputed;
        job.disputedAt = uint64(block.timestamp);

        emit JobDisputed(jobId, msg.sender);
    }

    /// @notice Owner-only settlement of disputed jobs.
    /// @param jobId Job id.
    /// @param payBuyer If true, poster receives payout less fee; otherwise winner receives payout less fee.
    function resolveJobDispute(
        uint256 jobId,
        bool payBuyer
    ) external onlyOwner nonReentrant {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.Disputed) revert JobNotDisputed();

        uint256 bounty = job.bounty;
        uint256 fee = (bounty * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 payout = bounty - fee;

        job.status = JobStatus.Resolved;
        totalEscrow -= bounty;
        _posterOpenJobCount[job.poster] -= 1;

        _refundWinnerStake(jobId, job);

        if (payBuyer) {
            _credit(job.poster, payout);
        } else {
            _credit(job.winner, payout);
        }

        if (fee > 0) {
            _credit(feeRecipient, fee);
        }

        emit JobDisputeResolved(jobId, payBuyer, payout, fee);
    }

    /// @notice Auto-resolves stale disputes after timeout in favor of buyer refund.
    /// @param jobId Job id.
    function settleExpiredJobDispute(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.Disputed) revert JobNotDisputed();
        if (block.timestamp < uint256(job.disputedAt) + disputeTimeout) {
            revert DisputeNotExpired();
        }

        uint256 bounty = job.bounty;

        job.status = JobStatus.Resolved;
        totalEscrow -= bounty;
        _posterOpenJobCount[job.poster] -= 1;

        _refundWinnerStake(jobId, job);

        _credit(job.poster, bounty);

        emit JobDisputeAutoResolved(jobId, bounty);
    }

    /// @notice Withdraws a refundable bid stake for a non-winning bidder on terminal jobs.
    /// @param jobId Job id.
    /// @param bidIndex Bid index in the job bid array.
    function withdrawBid(
        uint256 jobId,
        uint256 bidIndex
    ) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        if (
            job.status == JobStatus.Open ||
            job.status == JobStatus.WinnerSelected ||
            job.status == JobStatus.Accepted ||
            job.status == JobStatus.Disputed
        ) {
            revert BidNotRefundable();
        }

        Bid storage bid = _bids[jobId][bidIndex];
        if (bid.bidder != msg.sender) revert NotJobBidder();
        if (bid.withdrawn) revert BidNotRefundable();

        if (
            job.winner == bid.bidder &&
            job.winnerAgentId == bid.agentId &&
            job.winnerBidIndex == bidIndex
        ) {
            revert BidNotRefundable();
        }

        bid.withdrawn = true;

        if (bid.stakeAmount > 0) {
            totalBidStakes -= bid.stakeAmount;
            _credit(bid.bidder, bid.stakeAmount);
        }

        emit BidRefunded(jobId, bid.agentId, bid.bidder, bid.stakeAmount);
    }

    /// @notice Claims accumulated pull-claim USDC credits for caller.
    function claimPayment() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToClaim();

        pendingWithdrawals[msg.sender] = 0;
        totalPendingWithdrawals -= amount;

        usdc.safeTransfer(msg.sender, amount);

        emit PaymentClaimed(msg.sender, amount);
    }

    /// @notice Updates protocol fee bps.
    /// @param newBps New protocol fee in basis points.
    function setProtocolFeeBps(uint16 newBps) external onlyOwner {
        if (newBps > MAX_FEE_BPS) revert InvalidFeeBps();

        uint16 old = protocolFeeBps;
        protocolFeeBps = newBps;

        emit ProtocolFeeUpdated(old, newBps);
    }

    /// @notice Updates protocol fee recipient.
    /// @param newRecipient New fee recipient address.
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();

        address old = feeRecipient;
        feeRecipient = newRecipient;

        emit FeeRecipientUpdated(old, newRecipient);
    }

    /// @notice Updates minimum bounty floor.
    /// @param newAmount New minimum bounty amount (0 disables floor).
    function setMinBounty(uint256 newAmount) external onlyOwner {
        uint256 old = minBounty;
        minBounty = newAmount;

        emit MinBountyUpdated(old, newAmount);
    }

    /// @notice Updates minimum bid stake floor.
    /// @param newAmount New minimum bid stake (0 allows free bids).
    function setMinBidStake(uint256 newAmount) external onlyOwner {
        uint256 old = minBidStake;
        minBidStake = newAmount;

        emit MinBidStakeUpdated(old, newAmount);
    }

    /// @notice Updates winner acceptance timeout.
    /// @param newValue New timeout in seconds.
    function setJobAcceptTimeout(uint256 newValue) external onlyOwner {
        if (newValue == 0) revert ZeroAmount();

        uint256 old = jobAcceptTimeout;
        jobAcceptTimeout = newValue;

        emit JobAcceptTimeoutUpdated(old, newValue);
    }

    /// @notice Updates delivery timeout.
    /// @param newValue New timeout in seconds.
    function setDeliveryTimeout(uint256 newValue) external onlyOwner {
        if (newValue == 0) revert ZeroAmount();

        uint256 old = deliveryTimeout;
        deliveryTimeout = newValue;

        emit DeliveryTimeoutUpdated(old, newValue);
    }

    /// @notice Updates dispute timeout.
    /// @param newValue New timeout in seconds.
    function setDisputeTimeout(uint256 newValue) external onlyOwner {
        if (newValue == 0) revert ZeroAmount();

        uint256 old = disputeTimeout;
        disputeTimeout = newValue;

        emit DisputeTimeoutUpdated(old, newValue);
    }

    /// @notice Updates stale-open-job expiry timeout.
    /// @param newValue New timeout in seconds.
    function setJobExpireTimeout(uint256 newValue) external onlyOwner {
        if (newValue == 0) revert ZeroAmount();

        uint256 old = jobExpireTimeout;
        jobExpireTimeout = newValue;

        emit JobExpireTimeoutUpdated(old, newValue);
    }

    /// @notice Updates max concurrent open jobs per poster.
    /// @param newValue New limit (0 disables cap).
    function setMaxOpenJobsPerPoster(uint32 newValue) external onlyOwner {
        uint32 old = maxOpenJobsPerPoster;
        maxOpenJobsPerPoster = newValue;

        emit MaxOpenJobsPerPosterUpdated(old, newValue);
    }

    /// @notice Pauses whenNotPaused user-facing operations.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses whenNotPaused user-facing operations.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Rescues ERC-20 tokens held by contract while preserving USDC liabilities solvency.
    /// @param token ERC-20 token to rescue.
    /// @param amount Amount to rescue.
    /// @param to Recipient address.
    function rescueTokens(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();

        if (token == address(usdc)) {
            uint256 protectedLiabilities =
                totalEscrow + totalBidStakes + totalPendingWithdrawals;
            uint256 balance = usdc.balanceOf(address(this));
            if (balance < amount || balance - amount < protectedLiabilities) {
                revert RescueWouldBreakSolvency();
            }
        }

        IERC20(token).safeTransfer(to, amount);

        emit TokensRescued(token, amount, to);
    }

    /// @notice Returns a job by id.
    /// @param jobId Job id.
    /// @return job Job struct.
    function getJob(uint256 jobId) external view returns (Job memory job) {
        return _jobs[jobId];
    }

    /// @notice Returns all bids submitted for a job.
    /// @param jobId Job id.
    /// @return bids Job bid array.
    function getJobBids(uint256 jobId) external view returns (Bid[] memory bids) {
        return _bids[jobId];
    }

    /// @notice Returns a single bid for a job.
    /// @param jobId Job id.
    /// @param bidIndex Bid index.
    /// @return bid Bid struct.
    function getBid(
        uint256 jobId,
        uint256 bidIndex
    ) external view returns (Bid memory bid) {
        return _bids[jobId][bidIndex];
    }

    /// @notice Returns all currently open job ids.
    /// @return jobIds Array of open job ids.
    function getOpenJobs() external view returns (uint256[] memory jobIds) {
        uint256 openCount;
        for (uint256 i = 0; i < _nextJobId; ) {
            if (_jobs[i].status == JobStatus.Open) {
                openCount += 1;
            }
            // SAFETY: loop index is bounded by _nextJobId and increments once.
            unchecked {
                ++i;
            }
        }

        jobIds = new uint256[](openCount);
        uint256 cursor;
        for (uint256 i = 0; i < _nextJobId; ) {
            if (_jobs[i].status == JobStatus.Open) {
                jobIds[cursor] = i;
                cursor += 1;
            }
            // SAFETY: loop index is bounded by _nextJobId and increments once.
            unchecked {
                ++i;
            }
        }

        return jobIds;
    }

    /// @notice Returns number of created jobs.
    /// @return count Created job count.
    function getJobCount() external view returns (uint256 count) {
        return _nextJobId;
    }

    /// @notice Returns active open-job count for a poster.
    /// @param poster Poster address.
    /// @return count Open jobs currently attributed to poster.
    function getPosterOpenJobCount(address poster) external view returns (uint32 count) {
        return _posterOpenJobCount[poster];
    }

    /// @notice Credits pull-claim balance and tracked pending liabilities.
    /// @param recipient Recipient address.
    /// @param amount Amount to credit.
    function _credit(address recipient, uint256 amount) internal {
        if (amount == 0) return;
        pendingWithdrawals[recipient] += amount;
        totalPendingWithdrawals += amount;
    }

    /// @notice Refunds selected winner bid stake into pull-claim balance when still locked.
    /// @param jobId Job id.
    /// @param job Job storage reference.
    function _refundWinnerStake(uint256 jobId, Job storage job) internal {
        Bid storage winningBid = _bids[jobId][job.winnerBidIndex];
        if (!winningBid.withdrawn && winningBid.stakeAmount > 0) {
            winningBid.withdrawn = true;
            totalBidStakes -= winningBid.stakeAmount;
            _credit(winningBid.bidder, winningBid.stakeAmount);
            emit BidRefunded(
                jobId,
                winningBid.agentId,
                winningBid.bidder,
                winningBid.stakeAmount
            );
        }
    }
}
