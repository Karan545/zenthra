// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title JobEscrow
 * @notice Escrow contract for USDC-funded jobs on Arc Mainnet.
 *         Flow: createJob → bid → acceptBid → submitWork → approve (or reject)
 * @dev Uses SafeERC20 for USDC transfers and ReentrancyGuard on all state-mutating functions.
 */
contract JobEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Types ────────────────────────────────────────────────────────────────

    enum JobStatus {
        Open,
        InProgress,
        Submitted,
        Completed,
        Rejected,
        Cancelled
    }

    /// Poster can cancel an InProgress job after this delay if bidder never submits.
    uint256 public constant INPROGRESS_TIMEOUT = 48 hours;

    struct Bid {
        address bidder;
        uint256 amount;
        string  message;
        uint256 timestamp;
    }

    struct Job {
        uint256     id;
        address     poster;
        string      description;
        uint256     budget;
        JobStatus   status;
        address     acceptedBidder;
        string      deliverable;
        uint256     createdAt;
        uint256     acceptedAt;  // timestamp when bid was accepted (for InProgress timeout)
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable usdc;

    uint256 private _nextJobId;

    /// jobId → Job
    mapping(uint256 => Job) private _jobs;

    /// jobId → Bid[]
    mapping(uint256 => Bid[]) private _bids;

    // ─── Events ───────────────────────────────────────────────────────────────

    event JobCreated(
        uint256 indexed jobId,
        address indexed poster,
        string  description,
        uint256 budget,
        uint256 createdAt
    );

    event BidPlaced(
        uint256 indexed jobId,
        address indexed bidder,
        uint256 bidIndex,
        uint256 amount,
        string  message,
        uint256 timestamp
    );

    event BidAccepted(
        uint256 indexed jobId,
        address indexed acceptedBidder,
        uint256 bidIndex
    );

    event WorkSubmitted(
        uint256 indexed jobId,
        address indexed bidder,
        string  deliverable,
        uint256 timestamp
    );

    event JobApproved(
        uint256 indexed jobId,
        address indexed bidder,
        uint256 amount
    );

    event JobRejected(
        uint256 indexed jobId,
        address indexed poster,
        uint256 amount
    );

    event JobCancelled(
        uint256 indexed jobId,
        address indexed poster,
        uint256 amount
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdc) {
        require(_usdc != address(0), "JobEscrow: zero USDC address");
        usdc = IERC20(_usdc);
    }

    // ─── External functions ───────────────────────────────────────────────────

    /**
     * @notice Create a new job and lock USDC budget in escrow.
     * @param description  Human-readable job description.
     * @param budget       USDC amount (6 decimals) to lock.
     * @return jobId       Newly created job id.
     */
    function createJob(string calldata description, uint256 budget)
        external
        nonReentrant
        returns (uint256 jobId)
    {
        require(bytes(description).length > 0, "JobEscrow: empty description");
        require(budget > 0, "JobEscrow: zero budget");

        jobId = _nextJobId++;

        _jobs[jobId] = Job({
            id:             jobId,
            poster:         msg.sender,
            description:    description,
            budget:         budget,
            status:         JobStatus.Open,
            acceptedBidder: address(0),
            deliverable:    "",
            createdAt:      block.timestamp,
            acceptedAt:     0
        });

        usdc.safeTransferFrom(msg.sender, address(this), budget);

        emit JobCreated(jobId, msg.sender, description, budget, block.timestamp);
    }

    /**
     * @notice Place a bid on an open job.
     * @param jobId    Target job id.
     * @param amount   Proposed USDC amount (informational; does not lock funds).
     * @param message  Bid proposal message.
     */
    function bid(uint256 jobId, uint256 amount, string calldata message)
        external
        nonReentrant
    {
        Job storage job = _jobs[jobId];
        require(job.createdAt > 0,              "JobEscrow: job not found");
        require(job.status == JobStatus.Open,   "JobEscrow: job not open");
        require(amount > 0,                     "JobEscrow: zero bid amount");
        require(bytes(message).length > 0,      "JobEscrow: empty message");

        uint256 bidIndex = _bids[jobId].length;
        _bids[jobId].push(Bid({
            bidder:    msg.sender,
            amount:    amount,
            message:   message,
            timestamp: block.timestamp
        }));

        emit BidPlaced(jobId, msg.sender, bidIndex, amount, message, block.timestamp);
    }

    /**
     * @notice Accept a bid, moving job to InProgress.
     * @param jobId     Target job id.
     * @param bidIndex  Index in the bids array to accept.
     */
    function acceptBid(uint256 jobId, uint256 bidIndex)
        external
        nonReentrant
    {
        Job storage job = _jobs[jobId];
        require(job.createdAt > 0,              "JobEscrow: job not found");
        require(job.poster == msg.sender,       "JobEscrow: not poster");
        require(job.status == JobStatus.Open,   "JobEscrow: job not open");
        require(bidIndex < _bids[jobId].length, "JobEscrow: invalid bid index");

        address winner = _bids[jobId][bidIndex].bidder;
        job.acceptedBidder = winner;
        job.status = JobStatus.InProgress;
        job.acceptedAt = block.timestamp;

        emit BidAccepted(jobId, winner, bidIndex);
    }

    /**
     * @notice Accepted bidder submits deliverable.
     * @param jobId       Target job id.
     * @param deliverable Description / link to the deliverable.
     */
    function submitWork(uint256 jobId, string calldata deliverable)
        external
        nonReentrant
    {
        Job storage job = _jobs[jobId];
        require(job.createdAt > 0,                          "JobEscrow: job not found");
        require(job.acceptedBidder == msg.sender,           "JobEscrow: not accepted bidder");
        require(job.status == JobStatus.InProgress,         "JobEscrow: not in progress");
        require(bytes(deliverable).length > 0,              "JobEscrow: empty deliverable");

        job.deliverable = deliverable;
        job.status = JobStatus.Submitted;

        emit WorkSubmitted(jobId, msg.sender, deliverable, block.timestamp);
    }

    /**
     * @notice Poster approves work — releases USDC to accepted bidder.
     * @param jobId  Target job id.
     */
    function approve(uint256 jobId)
        external
        nonReentrant
    {
        Job storage job = _jobs[jobId];
        require(job.createdAt > 0,                      "JobEscrow: job not found");
        require(job.poster == msg.sender,               "JobEscrow: not poster");
        require(job.status == JobStatus.Submitted,      "JobEscrow: work not submitted");

        address bidder = job.acceptedBidder;
        uint256 amount = job.budget;
        job.status = JobStatus.Completed;

        usdc.safeTransfer(bidder, amount);

        emit JobApproved(jobId, bidder, amount);
    }

    /**
     * @notice Poster rejects work — returns USDC to poster.
     * @param jobId  Target job id.
     */
    function reject(uint256 jobId)
        external
        nonReentrant
    {
        Job storage job = _jobs[jobId];
        require(job.createdAt > 0,                      "JobEscrow: job not found");
        require(job.poster == msg.sender,               "JobEscrow: not poster");
        require(job.status == JobStatus.Submitted,      "JobEscrow: work not submitted");

        address poster  = job.poster;
        uint256 amount  = job.budget;
        job.status = JobStatus.Rejected;

        usdc.safeTransfer(poster, amount);

        emit JobRejected(jobId, poster, amount);
    }

    /**
     * @notice Cancel a job and refund USDC to poster.
     *         - From Open: always allowed by poster.
     *         - From InProgress: only allowed after INPROGRESS_TIMEOUT (48h) if bidder never submitted.
     * @param jobId  Target job id.
     */
    function cancelJob(uint256 jobId)
        external
        nonReentrant
    {
        Job storage job = _jobs[jobId];
        require(job.createdAt > 0,          "JobEscrow: job not found");
        require(job.poster == msg.sender,   "JobEscrow: not poster");

        if (job.status == JobStatus.Open) {
            // Poster can cancel anytime while open
        } else if (job.status == JobStatus.InProgress) {
            require(
                block.timestamp >= job.acceptedAt + INPROGRESS_TIMEOUT,
                "JobEscrow: timeout not reached"
            );
        } else {
            revert("JobEscrow: cannot cancel in current status");
        }

        uint256 amount = job.budget;
        job.status = JobStatus.Cancelled;

        usdc.safeTransfer(msg.sender, amount);

        emit JobCancelled(jobId, msg.sender, amount);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns full job details.
     */
    function getJob(uint256 jobId)
        external
        view
        returns (Job memory)
    {
        require(_jobs[jobId].createdAt > 0, "JobEscrow: job not found");
        return _jobs[jobId];
    }

    /**
     * @notice Returns all bids for a job.
     */
    function getBids(uint256 jobId)
        external
        view
        returns (Bid[] memory)
    {
        require(_jobs[jobId].createdAt > 0, "JobEscrow: job not found");
        return _bids[jobId];
    }

    /**
     * @notice Total number of jobs ever created.
     */
    function jobCount() external view returns (uint256) {
        return _nextJobId;
    }
}
