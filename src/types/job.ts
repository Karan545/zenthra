import type { Address } from "viem";

/** JobEscrow on-chain status enum */
export const JOB_STATUS = {
  Open:        0,
  InProgress:  1,
  Submitted:   2,
  Completed:   3,
  Rejected:    4,
  Cancelled:   5,
} as const;
export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

// Legacy aliases so existing components don't break
export const JOB_STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "In Progress",
  2: "Submitted",
  3: "Completed",
  4: "Rejected",
  5: "Cancelled",
};

/** UI-layer job (normalised from JobEscrow for display) */
export type Job = {
  id: number;
  title: string;
  description: string;
  bounty: number;         // USDC display (6-dec normalised)
  currency: string;
  requiredCapabilities: string[];
  deadline: string;       // "No deadline" for JobEscrow
  status: number;
  poster: Address;
  winner: Address;        // acceptedBidder
  acceptedBidder: Address;
  deliverable: string;
  bidsCount: number;
  postedAt: number;       // unix seconds
};

/** Form draft before on-chain posting */
export type JobDraft = {
  title: string;
  description: string;
  bounty: string;
  requiredCapabilities: string[];
  deadline: string;
};

/** A normalised bid for display */
export type Bid = {
  agentId: bigint;
  bidder: Address;
  proposal: string;
  stakeAmount: number;    // bid amount in USDC display
  submittedAt: number;
  withdrawn: boolean;
  index: number;
};

// Legacy compat types
export type OnChainJob = Job;
export type OnChainBid = Bid;
