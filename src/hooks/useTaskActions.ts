"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import type { Hash } from "viem";
import { zenthraCuratorV2Abi } from "@/config/abis/zenthraCuratorV2";
import { zenthraCuratorV2Address } from "@/config/contracts";
import { arcMainnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";

const CONTRACT = zenthraCuratorV2Address;

export type TaskActionResult = { hash: Hash };

async function ensureArcChain(
  chainId: number | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  switchChainAsync: (...args: any[]) => Promise<any>
) {
  if (chainId !== arcMainnet.id) {
    await switchChainAsync({ chainId: arcMainnet.id });
  }
}

/**
 * Hooks for every on-chain task lifecycle transition:
 * acceptTask, completeTask, cancelTask, disputeTask, claimPayment,
 * settleExpiredDispute, reclaimExpiredTask.
 *
 * All payouts use pull-claim: call claimPayment() after complete/cancel/resolve
 * to receive USDC from pendingWithdrawals.
 */
export function useTaskActions() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcMainnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const _send = useCallback(
    async (
      functionName:
        | "acceptTask"
        | "completeTask"
        | "cancelTask"
        | "disputeTask"
        | "claimPayment"
        | "settleExpiredDispute"
        | "reclaimExpiredTask",
      args: readonly bigint[],
      errorMsg: string
    ): Promise<Hash> => {
      if (!address) throw new Error("Connect your wallet first.");
      if (!publicClient) throw new Error("Could not reach Arc Mainnet RPC.");
      await ensureArcChain(chainId, switchChainAsync);

      let hash: Hash;
      try {
        if (functionName === "claimPayment") {
          hash = await writeContractAsync({
            address: CONTRACT,
            abi: zenthraCuratorV2Abi,
            functionName: "claimPayment",
            args: [],
            chainId: arcMainnet.id,
          });
        } else {
          hash = await writeContractAsync({
            address: CONTRACT,
            abi: zenthraCuratorV2Abi,
            functionName: functionName as
              | "acceptTask"
              | "completeTask"
              | "cancelTask"
              | "disputeTask"
              | "settleExpiredDispute"
              | "reclaimExpiredTask",
            args: args as [bigint],
            chainId: arcMainnet.id,
          });
        }
      } catch (e) {
        throw new Error(formatWalletError(e, errorMsg));
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });
      if (receipt.status === "reverted")
        throw new Error(`${functionName} transaction reverted.`);

      return hash;
    },
    [address, chainId, switchChainAsync, publicClient, writeContractAsync]
  );

  /** Agent accepts an open task (must call within taskAcceptTimeout). */
  const acceptTask = useCallback(
    (taskId: bigint): Promise<TaskActionResult> =>
      _send("acceptTask", [taskId], "acceptTask failed.").then((hash) => ({
        hash,
      })),
    [_send]
  );

  /** Agent marks an accepted task as complete. Payout goes to pendingWithdrawals. */
  const completeTask = useCallback(
    (taskId: bigint): Promise<TaskActionResult> =>
      _send("completeTask", [taskId], "completeTask failed.").then((hash) => ({
        hash,
      })),
    [_send]
  );

  /** Buyer cancels: immediately if Open, or after 2x accept window if Accepted. */
  const cancelTask = useCallback(
    (taskId: bigint): Promise<TaskActionResult> =>
      _send("cancelTask", [taskId], "cancelTask failed.").then((hash) => ({
        hash,
      })),
    [_send]
  );

  /** Buyer or agent disputes an accepted task. Escalates to owner resolution. */
  const disputeTask = useCallback(
    (taskId: bigint): Promise<TaskActionResult> =>
      _send("disputeTask", [taskId], "disputeTask failed.").then((hash) => ({
        hash,
      })),
    [_send]
  );

  /**
   * Pull pending USDC payout from the contract to the caller's wallet.
   * Must be called after completeTask / cancelTask / resolveDispute.
   */
  const claimPayment = useCallback(
    (): Promise<TaskActionResult> =>
      _send("claimPayment", [], "claimPayment failed.").then((hash) => ({
        hash,
      })),
    [_send]
  );

  /** Anyone can auto-resolve a disputed task after the disputeTimeout window. */
  const settleExpiredDispute = useCallback(
    (taskId: bigint): Promise<TaskActionResult> =>
      _send(
        "settleExpiredDispute",
        [taskId],
        "settleExpiredDispute failed."
      ).then((hash) => ({ hash })),
    [_send]
  );

  /** Buyer reclaims funds for a task the agent never accepted within the window. */
  const reclaimExpiredTask = useCallback(
    (taskId: bigint): Promise<TaskActionResult> =>
      _send(
        "reclaimExpiredTask",
        [taskId],
        "reclaimExpiredTask failed."
      ).then((hash) => ({ hash })),
    [_send]
  );

  return {
    acceptTask,
    completeTask,
    cancelTask,
    disputeTask,
    claimPayment,
    settleExpiredDispute,
    reclaimExpiredTask,
    isPending,
    reset,
  };
}
