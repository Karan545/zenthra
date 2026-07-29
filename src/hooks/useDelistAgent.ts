"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import type { Hash } from "viem";
import { zenthraCuratorAbi } from "@/config/abis";
import { zenthraCuratorAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";
import { updateRegisteredAgent, notifyAgentsUpdated } from "@/lib/localAgents";

export type DelistAgentResult = {
  hash: Hash;
};

export type DelistAgentOptions = {
  onPhase?: (phase: "wallet" | "confirming") => void;
};

/**
 * Call ZenthraCurator.delistAgent — returns locked USDC stake to listing owner.
 */
export function useDelistAgent() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const delistAgent = useCallback(
    async (
      agentId: number,
      options?: DelistAgentOptions
    ): Promise<DelistAgentResult> => {
      if (!address) {
        throw new Error("Connect your wallet to delist an agent.");
      }

      if (chainId !== arcTestnet.id) {
        try {
          await switchChainAsync({ chainId: arcTestnet.id });
        } catch (e) {
          throw new Error(formatWalletError(e));
        }
      }

      if (!publicClient) {
        throw new Error("Could not reach Arc Testnet RPC.");
      }

      options?.onPhase?.("wallet");

      let hash: Hash;
      try {
        hash = await writeContractAsync({
          address: zenthraCuratorAddress,
          abi: zenthraCuratorAbi,
          functionName: "delistAgent",
          args: [BigInt(agentId)],
          chainId: arcTestnet.id,
        });
      } catch (e) {
        throw new Error(
          formatWalletError(
            e,
            "Delist failed. Only the listing owner can unstake."
          )
        );
      }

      options?.onPhase?.("confirming");

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === "reverted") {
        throw new Error(
          "delistAgent reverted. Ensure this agent is listed and you are the listing owner."
        );
      }

      updateRegisteredAgent(agentId, {
        isListedOnZenthra: false,
        isFeatured: false,
        listedAt: undefined,
        listTxHash: undefined,
        stakeAmount: undefined,
      });
      notifyAgentsUpdated();

      return { hash };
    },
    [address, chainId, switchChainAsync, publicClient, writeContractAsync]
  );

  return {
    delistAgent,
    isPending,
    reset,
  };
}
