/**
 * ZenthraJobBoard ABI — on-chain job board with USDC escrow and bidding.
 * Deployed on Arc Mainnet at 0x4bf403f1a3be64e23faa2852fce221898a8a4884
 */
export const zenthraJobBoardAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "identityRegistry_", type: "address" },
      { name: "usdc_", type: "address" },
      { name: "feeRecipient_", type: "address" },
      { name: "protocolFeeBps_", type: "uint16" },
      { name: "minBounty_", type: "uint256" },
      { name: "minBidStake_", type: "uint256" },
      { name: "jobAcceptTimeout_", type: "uint256" },
      { name: "deliveryTimeout_", type: "uint256" },
      { name: "disputeTimeout_", type: "uint256" },
      { name: "jobExpireTimeout_", type: "uint256" },
      { name: "maxOpenJobsPerPoster_", type: "uint32" },
      { name: "initialOwner", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  // ── Write functions ──────────────────────────────────────────────────────
  {
    type: "function", name: "postJob",
    inputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "requiredCapabilities", type: "string[]" },
      { name: "bounty", type: "uint256" },
      { name: "deadline", type: "uint64" },
      { name: "maxBids_", type: "uint32" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "submitBid",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "agentId", type: "uint256" },
      { name: "proposal", type: "string" },
      { name: "stakeAmount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "selectWinner",
    inputs: [{ name: "jobId", type: "uint256" }, { name: "bidIndex", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "acceptJob",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "confirmDelivery",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "cancelJob",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "disputeJob",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "resolveJobDispute",
    inputs: [{ name: "jobId", type: "uint256" }, { name: "payBuyer", type: "bool" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "settleExpiredJobDispute",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "reclaimUnacceptedJob",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "reclaimUndeliveredJob",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "expireJob",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "withdrawBid",
    inputs: [{ name: "jobId", type: "uint256" }, { name: "bidIndex", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "claimPayment",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ── View functions ───────────────────────────────────────────────────────
  {
    type: "function", name: "getJob",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "jobId", type: "uint256" },
          { name: "poster", type: "address" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "requiredCapabilities", type: "string[]" },
          { name: "bounty", type: "uint256" },
          { name: "deadline", type: "uint64" },
          { name: "postedAt", type: "uint64" },
          { name: "selectedAt", type: "uint64" },
          { name: "acceptedAt", type: "uint64" },
          { name: "disputedAt", type: "uint64" },
          { name: "maxBids", type: "uint32" },
          { name: "status", type: "uint8" },
          { name: "winner", type: "address" },
          { name: "winnerAgentId", type: "uint256" },
          { name: "winnerBidIndex", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "getJobBids",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "bidder", type: "address" },
          { name: "proposal", type: "string" },
          { name: "stakeAmount", type: "uint256" },
          { name: "submittedAt", type: "uint64" },
          { name: "withdrawn", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "getBid",
    inputs: [{ name: "jobId", type: "uint256" }, { name: "bidIndex", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "bidder", type: "address" },
          { name: "proposal", type: "string" },
          { name: "stakeAmount", type: "uint256" },
          { name: "submittedAt", type: "uint64" },
          { name: "withdrawn", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "getOpenJobs",
    inputs: [],
    outputs: [{ name: "jobIds", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "getJobCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "pendingWithdrawals",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "totalEscrow",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "totalBidStakes",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "totalPendingWithdrawals",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "minBounty",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "protocolFeeBps",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
    stateMutability: "view",
  },
  // ── Events ───────────────────────────────────────────────────────────────
  {
    type: "event", name: "JobPosted",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "poster", type: "address", indexed: true },
      { name: "bounty", type: "uint256", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event", name: "BidSubmitted",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "stakeAmount", type: "uint256", indexed: false },
      { name: "submittedAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event", name: "WinnerSelected",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "bidIndex", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "JobAccepted",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "acceptedAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event", name: "DeliveryConfirmed",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "amountPaid", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "JobCancelled",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "poster", type: "address", indexed: true },
      { name: "bountyRefunded", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "PaymentClaimed",
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// ── TypeScript types ──────────────────────────────────────────────────────────

export const JOB_STATUS = {
  Open: 0,
  WinnerSelected: 1,
  Accepted: 2,
  Completed: 3,
  Cancelled: 4,
  Disputed: 5,
  Resolved: 6,
} as const;

export type JobStatusValue = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export function jobStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    0: "Open",
    1: "Winner Selected",
    2: "Accepted",
    3: "Completed",
    4: "Cancelled",
    5: "Disputed",
    6: "Resolved",
  };
  return labels[status] ?? "Unknown";
}

export type OnChainJob = {
  jobId: bigint;
  poster: `0x${string}`;
  title: string;
  description: string;
  requiredCapabilities: string[];
  bounty: bigint;
  deadline: bigint;
  postedAt: bigint;
  selectedAt: bigint;
  acceptedAt: bigint;
  disputedAt: bigint;
  maxBids: number;
  status: number;
  winner: `0x${string}`;
  winnerAgentId: bigint;
  winnerBidIndex: bigint;
};

export type OnChainBid = {
  agentId: bigint;
  bidder: `0x${string}`;
  proposal: string;
  stakeAmount: bigint;
  submittedAt: bigint;
  withdrawn: boolean;
};
