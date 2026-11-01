"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { jobEscrowAbi } from "@/config/abis/jobEscrow";
import { erc20Abi } from "@/config/abis";
import { usdcAddress } from "@/config/contracts";
import { arcMainnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";
import { getArcPublicClient } from "@/lib/arcClient";

const JOB_ESCROW_ADDRESS = (
  process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? ""
) as `0x${string}`;

function toUsdcUnits(usdc: number): bigint {
  return parseUnits(usdc.toFixed(6), 6);
}

// ─── Input types ─────────────────────────────────────────────────────────────

export type PostJobInput = {
  title: string;
  description: string;
  requiredCapabilities: string[];
  bountyUsdc: number;
  deadlineUnix?: number;
  maxBids?: number;
};

export type SubmitBidInput = {
  jobId: number;
  agentId: number;
  proposal: string;
};

export type SelectWinnerInput = {
  jobId: number;
  bidIndex: number;
};

export type ConfirmDeliveryInput = { jobId: number };

/**
 * Write actions for JobEscrow on Arc Mainnet.
 * Mirrors the ZenthraJobBoard API so all existing UI components work unchanged.
 */
export function useJobActions() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClientFromWagmi = usePublicClient({ chainId: arcMainnet.id });
  const { writeContractAsync } = useWriteContract();
  const [pending, setPending] = useState(false);

  const client = () => publicClientFromWagmi ?? getArcPublicClient();

  const ensureChain = useCallback(async () => {
    if (chainId !== arcMainnet.id) {
      try { await switchChainAsync({ chainId: arcMainnet.id }); }
      catch (e) { throw new Error(formatWalletError(e)); }
    }
  }, [chainId, switchChainAsync]);

  // ─── postJob (createJob on JobEscrow) ──────────────────────────────────────
  const postJob = useCallback(async (input: PostJobInput) => {
    if (!address) throw new Error("Connect your wallet first.");
    if (!JOB_ESCROW_ADDRESS) throw new Error("JobEscrow contract not configured.");
    await ensureChain();
    setPending(true);
    try {
      const budget = toUsdcUnits(input.bountyUsdc);

      // 1) Approve USDC
      const allowance = await client().readContract({
        address: usdcAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, JOB_ESCROW_ADDRESS],
      }) as bigint;

      if (allowance < budget) {
        const approveTx = await writeContractAsync({
          address: usdcAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [JOB_ESCROW_ADDRESS, budget],
        });
        await client().waitForTransactionReceipt({ hash: approveTx });
      }

      // 2) createJob — combine title + description as the description field
      const description = input.title
        ? `${input.title}\n\n${input.description}`
        : input.description;

      const tx = await writeContractAsync({
        address: JOB_ESCROW_ADDRESS,
        abi: jobEscrowAbi,
        functionName: "createJob",
        args: [description.trim(), budget],
      });
      await client().waitForTransactionReceipt({ hash: tx });
    } catch (e) {
      throw new Error(formatWalletError(e));
    } finally {
      setPending(false);
    }
  }, [address, ensureChain, writeContractAsync]);

  // ─── submitBid (bid on JobEscrow) ──────────────────────────────────────────
  const submitBid = useCallback(async (input: SubmitBidInput) => {
    if (!address) throw new Error("Connect your wallet first.");
    await ensureChain();
    setPending(true);
    try {
      // Bid amount = 0 (informational only, no stake in JobEscrow)
      const tx = await writeContractAsync({
        address: JOB_ESCROW_ADDRESS,
        abi: jobEscrowAbi,
        functionName: "bid",
        args: [BigInt(input.jobId), BigInt(1), input.proposal],
      });
      await client().waitForTransactionReceipt({ hash: tx });
    } catch (e) {
      throw new Error(formatWalletError(e));
    } finally {
      setPending(false);
    }
  }, [address, ensureChain, writeContractAsync]);

  // ─── selectWinner (acceptBid on JobEscrow) ─────────────────────────────────
  const selectWinner = useCallback(async (input: SelectWinnerInput) => {
    if (!address) throw new Error("Connect your wallet first.");
    await ensureChain();
    setPending(true);
    try {
      const tx = await writeContractAsync({
        address: JOB_ESCROW_ADDRESS,
        abi: jobEscrowAbi,
        functionName: "acceptBid",
        args: [BigInt(input.jobId), BigInt(input.bidIndex)],
      });
      await client().waitForTransactionReceipt({ hash: tx });
    } catch (e) {
      throw new Error(formatWalletError(e));
    } finally {
      setPending(false);
    }
  }, [address, ensureChain, writeContractAsync]);

  // ─── submitWork ────────────────────────────────────────────────────────────
  const submitWork = useCallback(async ({ jobId, deliverable }: { jobId: number; deliverable: string }) => {
    if (!address) throw new Error("Connect your wallet first.");
    await ensureChain();
    setPending(true);
    try {
      const tx = await writeContractAsync({
        address: JOB_ESCROW_ADDRESS,
        abi: jobEscrowAbi,
        functionName: "submitWork",
        args: [BigInt(jobId), deliverable],
      });
      await client().waitForTransactionReceipt({ hash: tx });
    } catch (e) {
      throw new Error(formatWalletError(e));
    } finally {
      setPending(false);
    }
  }, [address, ensureChain, writeContractAsync]);

  // ─── approveJob ────────────────────────────────────────────────────────────
  const approveJob = useCallback(async ({ jobId }: { jobId: number }) => {
    if (!address) throw new Error("Connect your wallet first.");
    await ensureChain();
    setPending(true);
    try {
      const tx = await writeContractAsync({
        address: JOB_ESCROW_ADDRESS,
        abi: jobEscrowAbi,
        functionName: "approve",
        args: [BigInt(jobId)],
      });
      await client().waitForTransactionReceipt({ hash: tx });
    } catch (e) {
      throw new Error(formatWalletError(e));
    } finally {
      setPending(false);
    }
  }, [address, ensureChain, writeContractAsync]);

  // ─── rejectJob ─────────────────────────────────────────────────────────────
  const rejectJob = useCallback(async ({ jobId }: { jobId: number }) => {
    if (!address) throw new Error("Connect your wallet first.");
    await ensureChain();
    setPending(true);
    try {
      const tx = await writeContractAsync({
        address: JOB_ESCROW_ADDRESS,
        abi: jobEscrowAbi,
        functionName: "reject",
        args: [BigInt(jobId)],
      });
      await client().waitForTransactionReceipt({ hash: tx });
    } catch (e) {
      throw new Error(formatWalletError(e));
    } finally {
      setPending(false);
    }
  }, [address, ensureChain, writeContractAsync]);

  // ─── cancelJob ─────────────────────────────────────────────────────────────
  const cancelJob = useCallback(async ({ jobId }: { jobId: number }) => {
    if (!address) throw new Error("Connect your wallet first.");
    await ensureChain();
    setPending(true);
    try {
      const tx = await writeContractAsync({
        address: JOB_ESCROW_ADDRESS,
        abi: jobEscrowAbi,
        functionName: "cancelJob",
        args: [BigInt(jobId)],
      });
      await client().waitForTransactionReceipt({ hash: tx });
    } catch (e) {
      throw new Error(formatWalletError(e));
    } finally {
      setPending(false);
    }
  }, [address, ensureChain, writeContractAsync]);

  // Legacy aliases kept for compat with existing components
  const acceptJob = submitWork;
  const confirmDelivery = approveJob;
  const disputeJob = rejectJob;
  const claimPayment = async () => { /* no-op — JobEscrow auto-transfers on approve */ };

  return {
    postJob, submitBid, selectWinner,
    submitWork, approveJob, rejectJob, cancelJob,
    acceptJob, confirmDelivery, disputeJob, claimPayment,
    pending,
  };
}
