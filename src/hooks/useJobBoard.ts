"use client";

import { useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { jobEscrowAbi } from "@/config/abis/jobEscrow";
import { getArcPublicClient } from "@/lib/arcClient";
import type { Bid, Job } from "@/types/job";

const JOB_ESCROW_ADDRESS = (
  process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? ""
) as `0x${string}`;

function fromUsdcUnits(raw: bigint): number {
  return parseFloat(formatUnits(raw, 6));
}

/** Map JobEscrow.JobStatus uint8 → Zenthra UI status numbers
 * JobEscrow:  0=Open 1=InProgress 2=Submitted 3=Completed 4=Rejected 5=Cancelled
 * UI display: 0=Open 1=InProgress 2=Submitted  3=Completed 4=Rejected 5=Cancelled
 */
/** Split "TITLE|||DESCRIPTION" back into title + description.
 *  Falls back gracefully for legacy jobs stored as plain text. */
function splitTitleDescription(raw: string): { title: string; description: string } {
  const SEP = "|||";
  const idx = raw.indexOf(SEP);
  if (idx !== -1) {
    return { title: raw.slice(0, idx).trim(), description: raw.slice(idx + SEP.length).trim() };
  }
  // Legacy: first line is title, rest is description
  const newline = raw.indexOf("\n\n");
  if (newline !== -1) {
    return { title: raw.slice(0, newline).trim(), description: raw.slice(newline + 2).trim() };
  }
  return { title: raw.trim(), description: raw.trim() };
}

function normaliseJob(raw: {
  id: bigint; poster: `0x${string}`; description: string;
  budget: bigint; status: number; acceptedBidder: `0x${string}`;
  deliverable: string; createdAt: bigint; acceptedAt: bigint;
}, bidsCount = 0): Job {
  const { title, description } = splitTitleDescription(raw.description);
  return {
    id: Number(raw.id),
    title,
    description,
    bounty: fromUsdcUnits(raw.budget),
    currency: "USDC",
    requiredCapabilities: [],
    deadline: "No deadline",
    status: raw.status,
    poster: raw.poster,
    winner: raw.acceptedBidder,
    acceptedBidder: raw.acceptedBidder,
    deliverable: raw.deliverable,
    bidsCount,
    postedAt: Number(raw.createdAt),
  };
}

function normaliseBid(b: {
  bidder: `0x${string}`; amount: bigint; message: string; timestamp: bigint;
}, index: number): Bid {
  return {
    agentId: BigInt(0),
    bidder: b.bidder,
    proposal: b.message,
    stakeAmount: fromUsdcUnits(b.amount),
    submittedAt: Number(b.timestamp),
    withdrawn: false,
    index,
  };
}

/** Total job count — used to build the list */
export function useJobCount() {
  return useReadContract({
    address: JOB_ESCROW_ADDRESS,
    abi: jobEscrowAbi,
    functionName: "jobCount",
    query: { enabled: !!JOB_ESCROW_ADDRESS, refetchInterval: 10_000 },
  });
}

/** All jobs (open + all statuses) from JobEscrow */
export function useOpenJobs() {
  const { data: countRaw, isLoading: countLoading } = useJobCount();
  const count = countRaw != null ? Number(countRaw as bigint) : 0;

  const query = useQuery({
    queryKey: ["jobescrow", "all-jobs", count],
    enabled: count > 0 && !!JOB_ESCROW_ADDRESS,
    staleTime: 10_000,
    refetchInterval: 15_000,
    queryFn: async (): Promise<Job[]> => {
      const client = getArcPublicClient();
      const jobs: Job[] = [];
      // Fetch all jobs in parallel
      const results = await Promise.allSettled(
        Array.from({ length: count }, (_, i) =>
          client.readContract({
            address: JOB_ESCROW_ADDRESS,
            abi: jobEscrowAbi,
            functionName: "getJob",
            args: [BigInt(i)],
          })
        )
      );
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled" && r.value) {
          const raw = r.value as Parameters<typeof normaliseJob>[0];
          // Fetch bid count
          let bidsCount = 0;
          try {
            const bids = await client.readContract({
              address: JOB_ESCROW_ADDRESS,
              abi: jobEscrowAbi,
              functionName: "getBids",
              args: [BigInt(i)],
            }) as unknown[];
            bidsCount = bids.length;
          } catch { /* ignore */ }
          jobs.push(normaliseJob(raw, bidsCount));
        }
      }
      // Exclude cancelled jobs from default view; sort Open first then newest
      return jobs
        .filter((j) => j.status !== 5)
        .sort((a, b) => {
          if (a.status === 0 && b.status !== 0) return -1;
          if (a.status !== 0 && b.status === 0) return 1;
          return b.postedAt - a.postedAt;
        });
    },
  });

  return {
    jobs: query.data ?? [],
    isLoading: countLoading || query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** Read bids for a single job */
export function useJobBids(jobId: number) {
  const query = useQuery({
    queryKey: ["jobescrow", "bids", jobId],
    enabled: jobId >= 0 && !!JOB_ESCROW_ADDRESS,
    staleTime: 8_000,
    refetchInterval: 12_000,
    queryFn: async (): Promise<Bid[]> => {
      const client = getArcPublicClient();
      const raw = await client.readContract({
        address: JOB_ESCROW_ADDRESS,
        abi: jobEscrowAbi,
        functionName: "getBids",
        args: [BigInt(jobId)],
      }) as Array<{ bidder: `0x${string}`; amount: bigint; message: string; timestamp: bigint }>;
      return raw.map((b, i) => normaliseBid(b, i));
    },
  });
  return { bids: query.data ?? [], isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}

/** Pending USDC withdrawal — JobEscrow has no separate withdrawal; kept for compat */
export function usePendingWithdrawal() {
  return { amount: 0, isLoading: false };
}
