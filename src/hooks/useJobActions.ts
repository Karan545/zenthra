"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { zenthraJobBoardAbi, erc20Abi } from "@/config/abis";
import { zenthraJobBoardAddress, usdcAddress } from "@/config/contracts";
import { arcMainnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";
import { getArcPublicClient } from "@/lib/arcClient";

function toUsdcUnits(usdc: number): bigint {
  return parseUnits(usdc.toFixed(6), 6);
}

// ─── postJob ────────────────────────────────────────────────────────────────

export type PostJobInput = {
  title: string;
  description: string;
  requiredCapabilities: string[];
  bountyUsdc: number;
  deadlineUnix?: number; // 0 = no deadline
  maxBids?: number;      // 0 = use contract default
};

// ─── submitBid ──────────────────────────────────────────────────────────────

export type SubmitBidInput = {
  jobId: number;
  agentId: number;
  proposal: string;
  stakeUsdc: number; // 0 = no stake
};

// ─── selectWinner ───────────────────────────────────────────────────────────

export type SelectWinnerInput = {
  jobId: number;
  bidIndex: number;
};

// ─── confirmDelivery ────────────────────────────────────────────────────────

export type ConfirmDeliveryInput = { jobId: number };

/**
 * Write actions for ZenthraJobBoard on Arc Mainnet.
 * All USDC flows use safeTransferFrom — approve is called automatically before
 * any action that requires it.
 */
export function useJobActions() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClientFromWagmi = usePublicClient({ chainId: arcMainnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();
  const [pending, setPending] = useState(false);

  const client = () => publicClientFromWagmi ?? getArcPublicClient();

  const ensureChain = useCallback(async () => {
    if (!address) throw new Error("Connect your wallet on Arc Mainnet.");
    if (chainId !== arcMainnet.id) {
      try {
        await switchChainAsync({ chainId: arcMainnet.id as 5042 });
      } catch (e) {
        throw new Error(formatWalletError(e));
      }
    }
  }, [address, chainId, switchChainAsync]);

  const waitTx = useCallback(async (hash: `0x${string}`) => {
    const c = client();
    if (!c) throw new Error("Could not reach Arc RPC.");
    const receipt = await c.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") throw new Error("Transaction reverted.");
    return receipt;
  }, [publicClientFromWagmi]);

  const approve = useCallback(async (spender: Address, amount: bigint) => {
    if (amount === BigInt(0)) return;
    const hash = await writeContractAsync({
      address: usdcAddress as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
    });
    await waitTx(hash);
  }, [writeContractAsync, waitTx]);

  // ── postJob ──────────────────────────────────────────────────────────────

  const postJob = useCallback(async (input: PostJobInput) => {
    setPending(true);
    try {
      await ensureChain();
      const bounty = toUsdcUnits(input.bountyUsdc);
      await approve(zenthraJobBoardAddress as Address, bounty);
      const hash = await writeContractAsync({
        address: zenthraJobBoardAddress as Address,
        abi: zenthraJobBoardAbi,
        functionName: "postJob",
        args: [
          input.title,
          input.description,
          input.requiredCapabilities,
          bounty,
          BigInt(input.deadlineUnix ?? 0),
          input.maxBids ?? 0,
        ],
      });
      await waitTx(hash);
      return hash;
    } finally {
      setPending(false);
    }
  }, [ensureChain, approve, writeContractAsync, waitTx]);

  // ── submitBid ────────────────────────────────────────────────────────────

  const submitBid = useCallback(async (input: SubmitBidInput) => {
    setPending(true);
    try {
      await ensureChain();
      const stake = toUsdcUnits(input.stakeUsdc);
      if (stake > BigInt(0)) {
        await approve(zenthraJobBoardAddress as Address, stake);
      }
      const hash = await writeContractAsync({
        address: zenthraJobBoardAddress as Address,
        abi: zenthraJobBoardAbi,
        functionName: "submitBid",
        args: [
          BigInt(input.jobId),
          BigInt(input.agentId),
          input.proposal,
          stake,
        ],
      });
      await waitTx(hash);
      return hash;
    } finally {
      setPending(false);
    }
  }, [ensureChain, approve, writeContractAsync, waitTx]);

  // ── selectWinner ─────────────────────────────────────────────────────────

  const selectWinner = useCallback(async (input: SelectWinnerInput) => {
    setPending(true);
    try {
      await ensureChain();
      const hash = await writeContractAsync({
        address: zenthraJobBoardAddress as Address,
        abi: zenthraJobBoardAbi,
        functionName: "selectWinner",
        args: [BigInt(input.jobId), BigInt(input.bidIndex)],
      });
      await waitTx(hash);
      return hash;
    } finally {
      setPending(false);
    }
  }, [ensureChain, writeContractAsync, waitTx]);

  // ── confirmDelivery ──────────────────────────────────────────────────────

  const confirmDelivery = useCallback(async (input: ConfirmDeliveryInput) => {
    setPending(true);
    try {
      await ensureChain();
      const hash = await writeContractAsync({
        address: zenthraJobBoardAddress as Address,
        abi: zenthraJobBoardAbi,
        functionName: "confirmDelivery",
        args: [BigInt(input.jobId)],
      });
      await waitTx(hash);
      return hash;
    } finally {
      setPending(false);
    }
  }, [ensureChain, writeContractAsync, waitTx]);

  // ── claimPayment ─────────────────────────────────────────────────────────

  const claimPayment = useCallback(async () => {
    setPending(true);
    try {
      await ensureChain();
      const hash = await writeContractAsync({
        address: zenthraJobBoardAddress as Address,
        abi: zenthraJobBoardAbi,
        functionName: "claimPayment",
        args: [],
      });
      await waitTx(hash);
      return hash;
    } finally {
      setPending(false);
    }
  }, [ensureChain, writeContractAsync, waitTx]);

  return {
    postJob,
    submitBid,
    selectWinner,
    confirmDelivery,
    claimPayment,
    pending: pending || isPending,
    reset,
  };
}
