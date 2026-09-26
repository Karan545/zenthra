import type { Address } from "viem";
import type { OnChainJob, OnChainBid } from "@/config/abis";

export type { OnChainJob, OnChainBid };

/** On-chain job status enum */
export const JOB_STATUS = {
  Open: 0,
  WinnerSelected: 1,
  Accepted: 2,
  Completed: 3,
  Cancelled: 4,
  Disputed: 5,
  Resolved: 6,
} as const;
export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

/** UI-layer job (normalised from chain for display) */
export type Job = {
  id: number;
  title: string;
  description: string;
  bounty: number; // USDC display (6-dec normalised)
  currency: string;
  requiredCapabilities: string[];
  deadline: string; // ISO date string or "No deadline"
  status: number;
  poster: Address;
  winner: Address;
  bidsCount: number;
  postedAt: number; // unix seconds
};

/** Form draft before on-chain posting */
export type JobDraft = {
  title: string;
  description: string;
  bounty: string;
  requiredCapabilities: string[];
  deadline: string; // date input value
};

/** A normalised bid for display */
export type Bid = {
  agentId: bigint;
  bidder: Address;
  proposal: string;
  stakeAmount: number; // USDC display
  submittedAt: number;
  withdrawn: boolean;
  index: number;
};
