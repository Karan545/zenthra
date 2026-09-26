"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import type { Hash } from "viem";
import { erc20Abi, zenthraCuratorAbi } from "@/config/abis";
import { usdcAddress, zenthraCuratorV2Address } from "@/config/contracts";
import { arcMainnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";

const CONTRACT = zenthraCuratorV2Address;

export type RequestTaskResult = {
  approveHash?: Hash;
  requestHash: Hash;
};

export type RequestTaskOptions = {
  onPhase?: (phase: "approve" | "request" | "confirming") => void;
};

/**
 * Request a task from a listed agent.
 * Escrowed USDC is held by the contract until the task is
 * completed, cancelled, or disputed.
 *
 * Lifecycle after this: agent calls acceptTask → completeTask.
 */
export function useRequestTask() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcMainnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const requestTask = useCallback(
    async (
      agentId: number,
      /** USDC amount as a display number (e.g. 5 = 5 USDC). */
      amountUsdc: number,
      options?: RequestTaskOptions
    ): Promise<RequestTaskResult> => {
      if (!address) throw new Error("Connect your wallet to request a task.");
      if (amountUsdc <= 0) throw new Error("Task amount must be positive.");
      if (!publicClient) throw new Error("Could not reach Arc Mainnet RPC.");

      if (chainId !== arcMainnet.id) {
        try {
          await switchChainAsync({ chainId: arcMainnet.id });
        } catch (e) {
          throw new Error(formatWalletError(e));
        }
      }

      const amountUnits = BigInt(Math.round(amountUsdc * 1_000_000));

      // Approve USDC if needed
      const allowance = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, CONTRACT],
      });

      let approveHash: Hash | undefined;
      if (allowance < amountUnits) {
        options?.onPhase?.("approve");
        try {
          approveHash = await writeContractAsync({
            address: usdcAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [CONTRACT, amountUnits],
            chainId: arcMainnet.id,
          });
        } catch (e) {
          throw new Error(formatWalletError(e, "USDC approval failed."));
        }
        const approveTx = await publicClient.waitForTransactionReceipt({
          hash: approveHash,
          confirmations: 1,
        });
        if (approveTx.status === "reverted")
          throw new Error("USDC approval reverted.");
      }

      options?.onPhase?.("request");
      let requestHash: Hash;
      try {
        requestHash = await writeContractAsync({
          address: CONTRACT,
          abi: zenthraCuratorAbi,
          functionName: "requestTask",
          args: [BigInt(agentId), amountUnits],
          chainId: arcMainnet.id,
        });
      } catch (e) {
        throw new Error(
          formatWalletError(e, "requestTask failed. Ensure the agent is listed.")
        );
      }

      options?.onPhase?.("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: requestHash,
        confirmations: 1,
      });
      if (receipt.status === "reverted")
        throw new Error("requestTask transaction reverted.");

      return { approveHash, requestHash };
    },
    [address, chainId, switchChainAsync, publicClient, writeContractAsync]
  );

  return { requestTask, isPending, reset };
}
