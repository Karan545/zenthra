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
import { zenthraCuratorV2Address } from "@/config/contracts";
import { arcMainnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";

const CONTRACT = zenthraCuratorV2Address;

export type EndorseAgentResult = { hash: Hash };

/**
 * Endorse another listed agent on-chain (one-time per endorser address per target).
 * The endorser must own a listed agent with at least 1 completed task.
 */
export function useEndorseAgent() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcMainnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const endorseAgent = useCallback(
    async (
      /** Token id of the endorser's own listed agent. */
      endorserAgentId: number,
      /** Token id of the agent being endorsed. */
      targetAgentId: number
    ): Promise<EndorseAgentResult> => {
      if (!address) throw new Error("Connect your wallet to endorse an agent.");
      if (!publicClient) throw new Error("Could not reach Arc Mainnet RPC.");

      if (chainId !== arcMainnet.id) {
        try {
          await switchChainAsync({ chainId: arcMainnet.id });
        } catch (e) {
          throw new Error(formatWalletError(e));
        }
      }

      let hash: Hash;
      try {
        hash = await writeContractAsync({
          address: CONTRACT,
          abi: zenthraCuratorAbi,
          functionName: "endorseAgent",
          args: [BigInt(endorserAgentId), BigInt(targetAgentId)],
          chainId: arcMainnet.id,
        });
      } catch (e) {
        throw new Error(
          formatWalletError(
            e,
            "Endorsement failed. Ensure your agent has at least one completed task and you have not already endorsed this agent."
          )
        );
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });
      if (receipt.status === "reverted")
        throw new Error("endorseAgent transaction reverted.");

      return { hash };
    },
    [address, chainId, switchChainAsync, publicClient, writeContractAsync]
  );

  return { endorseAgent, isPending, reset };
}
