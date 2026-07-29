"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { keccak256, toBytes, type Hash } from "viem";
import { reputationRegistryAbi } from "@/config/abis";
import { reputationRegistryAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";

export type GiveFeedbackInput = {
  agentId: number | bigint;
  /** Integer score 1–100 (stored as value with valueDecimals = 0). */
  score: number;
  tag1?: string;
  tag2?: string;
  comment?: string;
};

export type GiveFeedbackResult = {
  hash: Hash;
};

export type GiveFeedbackOptions = {
  onSubmitted?: (hash: Hash) => void;
};

/**
 * Call ReputationRegistry.giveFeedback on Arc Testnet (ERC-8004).
 */
export function useGiveFeedback() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });

  const { writeContractAsync, isPending, error, reset } = useWriteContract();

  const giveFeedback = useCallback(
    async (
      input: GiveFeedbackInput,
      options?: GiveFeedbackOptions
    ): Promise<GiveFeedbackResult> => {
      const score = Math.round(input.score);
      if (!Number.isFinite(score) || score < 1 || score > 100) {
        throw new Error("Score must be an integer between 1 and 100.");
      }

      if (chainId !== arcTestnet.id) {
        try {
          await switchChainAsync({ chainId: arcTestnet.id });
        } catch (switchError) {
          throw new Error(formatWalletError(switchError));
        }
      }

      const tag1 = (input.tag1 ?? "").trim();
      const tag2 = (input.tag2 ?? "").trim();
      const comment = (input.comment ?? "").trim();

      // Optional off-chain feedback file as data URI + integrity hash
      let feedbackURI = "";
      let feedbackHash: `0x${string}` =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

      if (comment) {
        const file = {
          agentRegistry: `eip155:5042002:0x8004A818BFB912233c491871b3d84c89A494BD9e`,
          agentId: Number(input.agentId),
          createdAt: new Date().toISOString(),
          value: score,
          valueDecimals: 0,
          tag1: tag1 || undefined,
          tag2: tag2 || undefined,
          comment,
        };
        const json = JSON.stringify(file);
        const base64 =
          typeof btoa === "function"
            ? btoa(unescape(encodeURIComponent(json)))
            : Buffer.from(json, "utf8").toString("base64");
        feedbackURI = `data:application/json;base64,${base64}`;
        feedbackHash = keccak256(toBytes(json));
      }

      let txHash: Hash;
      try {
        txHash = await writeContractAsync({
          address: reputationRegistryAddress,
          abi: reputationRegistryAbi,
          functionName: "giveFeedback",
          args: [
            BigInt(input.agentId),
            BigInt(score), // int128 value
            0, // valueDecimals — whole score points
            tag1,
            tag2,
            "", // endpoint optional
            feedbackURI,
            feedbackHash,
          ],
          chainId: arcTestnet.id,
        });
      } catch (writeError) {
        throw new Error(
          formatWalletError(writeError, "Feedback transaction failed.")
        );
      }

      options?.onSubmitted?.(txHash);

      if (!publicClient) {
        throw new Error(
          "Could not reach Arc Testnet RPC. Check your connection and try again."
        );
      }

      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });
        if (receipt.status === "reverted") {
          throw new Error(
            "Feedback transaction reverted on Arc Testnet. No feedback was recorded."
          );
        }
      } catch (waitError) {
        if (
          waitError instanceof Error &&
          waitError.message.includes("reverted")
        ) {
          throw waitError;
        }
        throw new Error(formatWalletError(waitError));
      }

      return { hash: txHash };
    },
    [chainId, switchChainAsync, writeContractAsync, publicClient]
  );

  return {
    giveFeedback,
    isPending,
    error,
    reset,
  };
}
