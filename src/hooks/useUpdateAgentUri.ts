"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import type { Hash } from "viem";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { formatRegistrationError } from "@/lib/agentRegistration";

/**
 * IdentityRegistry.setAgentURI on Arc. The connected wallet must own the agent.
 */
export function useUpdateAgentUri() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const updateAgentUri = useCallback(
    async (
      agentId: number,
      agentURI: string,
      onSubmitted?: (hash: Hash) => void
    ): Promise<Hash> => {
      if (!agentURI.trim()) {
        throw new Error("Missing registration for this agent.");
      }
      if (!publicClient) {
        throw new Error("Could not reach Arc. Check your connection and try again.");
      }
      if (chainId !== arcTestnet.id) {
        try {
          await switchChainAsync({ chainId: arcTestnet.id });
        } catch (switchError) {
          throw new Error(formatRegistrationError(switchError));
        }
      }

      let txHash: Hash;
      try {
        txHash = await writeContractAsync({
          address: identityRegistryAddress,
          abi: identityRegistryAbi,
          functionName: "setAgentURI",
          args: [BigInt(agentId), agentURI],
          chainId: arcTestnet.id,
        });
      } catch (writeError) {
        throw new Error(formatRegistrationError(writeError));
      }

      onSubmitted?.(txHash);

      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });
        if (receipt.status !== "success") {
          throw new Error("The update did not succeed on Arc.");
        }
      } catch (waitError) {
        if (waitError instanceof Error && waitError.message === "The update did not succeed on Arc.") {
          throw waitError;
        }
        throw new Error(formatRegistrationError(waitError));
      }

      return txHash;
    },
    [chainId, publicClient, switchChainAsync, writeContractAsync]
  );

  return { updateAgentUri, isPending, reset, publicClient };
}
