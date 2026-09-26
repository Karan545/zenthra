"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { zenthraJobBoardAbi, type OnChainJob, type OnChainBid } from "@/config/abis";
import { zenthraJobBoardAddress } from "@/config/contracts";
import { formatUnits } from "viem";
import type { Bid, Job } from "@/types/job";
import type { Address } from "viem";
import { zeroAddress } from "viem";

/** Convert raw USDC bigint (6 decimals) to JS number */
function fromUsdcUnits(raw: bigint): number {
  return parseFloat(formatUnits(raw, 6));
}

function normaliseJob(j: OnChainJob, bidsLength = 0): Job {
  const deadline =
    j.deadline === BigInt(0)
      ? "No deadline"
      : new Date(Number(j.deadline) * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  return {
    id: Number(j.jobId),
    title: j.title,
    description: j.description,
    bounty: fromUsdcUnits(j.bounty),
    currency: "USDC",
    requiredCapabilities: Array.from(j.requiredCapabilities),
    deadline,
    status: j.status,
    poster: j.poster,
    winner: j.winner,
    bidsCount: bidsLength,
    postedAt: Number(j.postedAt),
  };
}

function normaliseBid(b: OnChainBid, index: number): Bid {
  return {
    agentId: b.agentId,
    bidder: b.bidder,
    proposal: b.proposal,
    stakeAmount: fromUsdcUnits(b.stakeAmount),
    submittedAt: Number(b.submittedAt),
    withdrawn: b.withdrawn,
    index,
  };
}

export type UseJobBoardResult = {
  job: Job | null;
  bids: Bid[];
  isLoading: boolean;
  isError: boolean;
};

/** Read a single job and its bids */
export function useJobBoard(jobId: number | bigint | null): UseJobBoardResult {
  const address = zenthraJobBoardAddress as Address;
  const id = jobId != null ? BigInt(jobId) : undefined;

  const { data: jobData, isLoading: loadingJob, isError: errJob } = useReadContract({
    address,
    abi: zenthraJobBoardAbi,
    functionName: "getJob",
    args: id != null ? [id] : undefined,
    query: { enabled: id != null },
  });

  const { data: bidsData, isLoading: loadingBids } = useReadContract({
    address,
    abi: zenthraJobBoardAbi,
    functionName: "getJobBids",
    args: id != null ? [id] : undefined,
    query: { enabled: id != null },
  });

  const rawBids = (bidsData as OnChainBid[] | undefined) ?? [];
  const bids = rawBids.map((b, i) => normaliseBid(b, i));
  const job = jobData ? normaliseJob(jobData as unknown as OnChainJob, bids.length) : null;

  return {
    job,
    bids,
    isLoading: loadingJob || loadingBids,
    isError: errJob,
  };
}

/** Read all open job IDs, then batch-fetch their data */
export function useOpenJobs(): {
  jobs: Job[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const address = zenthraJobBoardAddress as Address;

  const {
    data: openIds,
    isLoading: loadingIds,
    isError: errIds,
    refetch,
  } = useReadContract({
    address,
    abi: zenthraJobBoardAbi,
    functionName: "getOpenJobs",
  });

  const ids = (openIds as bigint[] | undefined) ?? [];

  const contracts = ids.map((id) => ({
    address,
    abi: zenthraJobBoardAbi,
    functionName: "getJob" as const,
    args: [id] as [bigint],
  }));

  const { data: jobsData, isLoading: loadingJobs, isError: errJobs } = useReadContracts({
    contracts,
    query: { enabled: ids.length > 0 },
  });

  const jobs: Job[] = (jobsData ?? [])
    .filter((r) => r.status === "success" && r.result)
    .map((r) => normaliseJob(r.result as unknown as OnChainJob));

  return {
    jobs,
    isLoading: loadingIds || loadingJobs,
    isError: errIds || errJobs,
    refetch,
  };
}

/** Read bids for a specific job */
export function useJobBids(jobId: number | bigint | null): {
  bids: Bid[];
  isLoading: boolean;
} {
  const address = zenthraJobBoardAddress as Address;
  const id = jobId != null ? BigInt(jobId) : undefined;

  const { data, isLoading } = useReadContract({
    address,
    abi: zenthraJobBoardAbi,
    functionName: "getJobBids",
    args: id != null ? [id] : undefined,
    query: { enabled: id != null },
  });

  const rawBids = (data as OnChainBid[] | undefined) ?? [];
  return {
    bids: rawBids.map((b, i) => normaliseBid(b, i)),
    isLoading,
  };
}

/** Read pending withdrawal for an address */
export function usePendingJobWithdrawal(userAddress: Address | undefined): {
  amount: number;
  isLoading: boolean;
} {
  const contractAddr = zenthraJobBoardAddress as Address;

  const { data, isLoading } = useReadContract({
    address: contractAddr,
    abi: zenthraJobBoardAbi,
    functionName: "pendingWithdrawals",
    args: userAddress ? [userAddress] : [zeroAddress],
    query: { enabled: !!userAddress },
  });

  return {
    amount: fromUsdcUnits((data as bigint | undefined) ?? BigInt(0)),
    isLoading,
  };
}


