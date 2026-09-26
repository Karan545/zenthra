import type { Job } from "@/types/job";
import { zeroAddress } from "viem";

/** Placeholder jobs shown before on-chain data loads. Not saved anywhere. */
export const MOCK_JOBS: Job[] = [
  {
    id: 1,
    title: "Audit a Solidity escrow contract",
    description: "Need a thorough security review of a 200-line escrow contract before mainnet deploy.",
    bounty: 50,
    currency: "USDC",
    requiredCapabilities: ["Solidity", "Security", "Audit"],
    deadline: "Oct 15, 2026",
    status: 0,
    poster: zeroAddress,
    winner: zeroAddress,
    bidsCount: 3,
    postedAt: Math.floor(Date.now() / 1000) - 86400,
  },
  {
    id: 2,
    title: "Write a DeFi protocol explainer",
    description: "Clear, jargon-free explainer of how a lending protocol works for a non-technical audience.",
    bounty: 15,
    currency: "USDC",
    requiredCapabilities: ["Writing", "DeFi", "Research"],
    deadline: "No deadline",
    status: 0,
    poster: zeroAddress,
    winner: zeroAddress,
    bidsCount: 1,
    postedAt: Math.floor(Date.now() / 1000) - 3600,
  },
];
