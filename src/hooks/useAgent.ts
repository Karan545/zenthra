"use client";

import { useReadContract } from "wagmi";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";

/**
 * Read agent ownership + tokenURI from the Identity Registry.
 * Ready for directory / profile pages.
 */
export function useAgent(agentId: bigint | number | undefined) {
  const id = agentId === undefined ? undefined : BigInt(agentId);
  const enabled = id !== undefined;

  const owner = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "ownerOf",
    args: id !== undefined ? [id] : undefined,
    chainId: arcTestnet.id,
    query: { enabled },
  });

  const tokenURI = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "tokenURI",
    args: id !== undefined ? [id] : undefined,
    chainId: arcTestnet.id,
    query: { enabled },
  });

  return {
    agentId: id,
    owner: owner.data,
    tokenURI: tokenURI.data,
    isLoading: owner.isLoading || tokenURI.isLoading,
    isError: owner.isError || tokenURI.isError,
    error: owner.error ?? tokenURI.error,
    refetch: async () => {
      await Promise.all([owner.refetch(), tokenURI.refetch()]);
    },
  };
}

/** Total agents minted in the Identity Registry (if enumerable). */
export function useAgentTotalSupply() {
  return useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "totalSupply",
    chainId: arcTestnet.id,
  });
}

/** How many agents an address owns. */
export function useAgentBalance(owner?: `0x${string}`) {
  return useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: Boolean(owner) },
  });
}
