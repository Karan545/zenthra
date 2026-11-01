"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { jobEscrowAbi } from "@/config/abis/jobEscrow";
import { erc20Abi } from "@/config/abis/erc20";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
const ARC_MAINNET_ID = 5042;

// Read from env — testnet address for preview; replace with mainnet address after deploy
const JOB_ESCROW_ADDRESS = (
  process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? ""
) as `0x${string}`;

export function useJobEscrowAddress() {
  return JOB_ESCROW_ADDRESS;
}

export function useJobCount() {
  return useReadContract({
    address: JOB_ESCROW_ADDRESS,
    abi: jobEscrowAbi,
    functionName: "jobCount",
    query: { enabled: !!JOB_ESCROW_ADDRESS, refetchInterval: 8_000 },
  });
}

export function useGetJob(jobId: bigint | undefined) {
  return useReadContract({
    address: JOB_ESCROW_ADDRESS,
    abi: jobEscrowAbi,
    functionName: "getJob",
    args: jobId !== undefined ? [jobId] : undefined,
    query: {
      enabled: !!JOB_ESCROW_ADDRESS && jobId !== undefined,
      refetchInterval: 6_000,
    },
  });
}

export function useGetBids(jobId: bigint | undefined) {
  return useReadContract({
    address: JOB_ESCROW_ADDRESS,
    abi: jobEscrowAbi,
    functionName: "getBids",
    args: jobId !== undefined ? [jobId] : undefined,
    query: {
      enabled: !!JOB_ESCROW_ADDRESS && jobId !== undefined,
      refetchInterval: 6_000,
    },
  });
}

export function useUsdcAllowance(owner: `0x${string}` | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      owner && JOB_ESCROW_ADDRESS
        ? [owner, JOB_ESCROW_ADDRESS]
        : undefined,
    query: {
      enabled: !!owner && !!JOB_ESCROW_ADDRESS,
      refetchInterval: 5_000,
    },
  });
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

type TxPhase = "idle" | "approving" | "writing" | "confirming" | "done";

function useTxFlow() {
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const ensureChain = useCallback(async () => {
    if (chainId !== ARC_MAINNET_ID) {
      await switchChainAsync({ chainId: ARC_MAINNET_ID });
    }
  }, [chainId, switchChainAsync]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
  }, []);

  return { phase, setPhase, error, setError, ensureChain, writeContractAsync, publicClient, reset };
}

export function useCreateJob() {
  const { address } = useAccount();
  const flow = useTxFlow();

  const createJob = useCallback(
    async (description: string, budgetUsdc: number) => {
      if (!address) throw new Error("Connect your wallet first.");
      if (!JOB_ESCROW_ADDRESS) throw new Error("Contract address not set.");

      flow.setError(null);
      const budget = parseUnits(String(budgetUsdc), 6);

      try {
        // 1. Approve USDC
        flow.setPhase("approving");
        const approveTx = await flow.writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [JOB_ESCROW_ADDRESS, budget],
          chainId: ARC_MAINNET_ID,
        });
        await flow.publicClient?.waitForTransactionReceipt({ hash: approveTx });

        // 2. Create job
        flow.setPhase("writing");
        const tx = await flow.writeContractAsync({
          address: JOB_ESCROW_ADDRESS,
          abi: jobEscrowAbi,
          functionName: "createJob",
          args: [description, budget],
          chainId: ARC_MAINNET_ID,
        });

        flow.setPhase("confirming");
        const receipt = await flow.publicClient?.waitForTransactionReceipt({ hash: tx });
        flow.setPhase("done");
        toast.success("Job created and USDC locked in escrow.");
        return receipt;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        flow.setError(msg);
        flow.setPhase("idle");
        throw e;
      }
    },
    [address, flow]
  );

  return { createJob, phase: flow.phase, error: flow.error, reset: flow.reset };
}

export function usePlaceBid() {
  const { address } = useAccount();
  const flow = useTxFlow();

  const placeBid = useCallback(
    async (jobId: bigint, amountUsdc: number, message: string) => {
      if (!address) throw new Error("Connect your wallet first.");
      flow.setError(null);
      flow.setPhase("writing");

      try {
        await flow.ensureChain();
        const amount = parseUnits(String(amountUsdc), 6);
        const tx = await flow.writeContractAsync({
          address: JOB_ESCROW_ADDRESS,
          abi: jobEscrowAbi,
          functionName: "bid",
          args: [jobId, amount, message],
          chainId: ARC_MAINNET_ID,
        });
        flow.setPhase("confirming");
        await flow.publicClient?.waitForTransactionReceipt({ hash: tx });
        flow.setPhase("done");
        toast.success("Bid placed.");
        return tx;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        flow.setError(msg);
        flow.setPhase("idle");
        throw e;
      }
    },
    [address, flow]
  );

  return { placeBid, phase: flow.phase, error: flow.error, reset: flow.reset };
}

export function useAcceptBid() {
  const flow = useTxFlow();

  const acceptBid = useCallback(
    async (jobId: bigint, bidIndex: bigint) => {
      flow.setError(null);
      flow.setPhase("writing");
      try {
        await flow.ensureChain();
        const tx = await flow.writeContractAsync({
          address: JOB_ESCROW_ADDRESS,
          abi: jobEscrowAbi,
          functionName: "acceptBid",
          args: [jobId, bidIndex],
          chainId: ARC_MAINNET_ID,
        });
        flow.setPhase("confirming");
        await flow.publicClient?.waitForTransactionReceipt({ hash: tx });
        flow.setPhase("done");
        toast.success("Bid accepted — bidder can now submit work.");
        return tx;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        flow.setError(msg);
        flow.setPhase("idle");
        throw e;
      }
    },
    [flow]
  );

  return { acceptBid, phase: flow.phase, error: flow.error, reset: flow.reset };
}

export function useSubmitWork() {
  const flow = useTxFlow();

  const submitWork = useCallback(
    async (jobId: bigint, deliverable: string) => {
      flow.setError(null);
      flow.setPhase("writing");
      try {
        await flow.ensureChain();
        const tx = await flow.writeContractAsync({
          address: JOB_ESCROW_ADDRESS,
          abi: jobEscrowAbi,
          functionName: "submitWork",
          args: [jobId, deliverable],
          chainId: ARC_MAINNET_ID,
        });
        flow.setPhase("confirming");
        await flow.publicClient?.waitForTransactionReceipt({ hash: tx });
        flow.setPhase("done");
        toast.success("Work submitted — awaiting poster review.");
        return tx;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        flow.setError(msg);
        flow.setPhase("idle");
        throw e;
      }
    },
    [flow]
  );

  return { submitWork, phase: flow.phase, error: flow.error, reset: flow.reset };
}

export function useApproveJob() {
  const flow = useTxFlow();

  const approveJob = useCallback(
    async (jobId: bigint) => {
      flow.setError(null);
      flow.setPhase("writing");
      try {
        await flow.ensureChain();
        const tx = await flow.writeContractAsync({
          address: JOB_ESCROW_ADDRESS,
          abi: jobEscrowAbi,
          functionName: "approve",
          args: [jobId],
          chainId: ARC_MAINNET_ID,
        });
        flow.setPhase("confirming");
        await flow.publicClient?.waitForTransactionReceipt({ hash: tx });
        flow.setPhase("done");
        toast.success("Work approved — USDC released to bidder.");
        return tx;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        flow.setError(msg);
        flow.setPhase("idle");
        throw e;
      }
    },
    [flow]
  );

  return { approveJob, phase: flow.phase, error: flow.error, reset: flow.reset };
}

export function useRejectJob() {
  const flow = useTxFlow();

  const rejectJob = useCallback(
    async (jobId: bigint) => {
      flow.setError(null);
      flow.setPhase("writing");
      try {
        await flow.ensureChain();
        const tx = await flow.writeContractAsync({
          address: JOB_ESCROW_ADDRESS,
          abi: jobEscrowAbi,
          functionName: "reject",
          args: [jobId],
          chainId: ARC_MAINNET_ID,
        });
        flow.setPhase("confirming");
        await flow.publicClient?.waitForTransactionReceipt({ hash: tx });
        flow.setPhase("done");
        toast.success("Work rejected — USDC returned to you.");
        return tx;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        flow.setError(msg);
        flow.setPhase("idle");
        throw e;
      }
    },
    [flow]
  );

  return { rejectJob, phase: flow.phase, error: flow.error, reset: flow.reset };
}
