"use client";

import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { reputationRegistryAbi } from "@/config/abis";
import { reputationRegistryAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";

/**
 * Read reputation summary for an agent (ERC-8004 getSummary).
 * clientAddresses is required by the spec for spam-resistant filtering.
 */
export function useAgentReputation(
  agentId: bigint | number | undefined,
  clientAddresses: readonly Address[] = []
) {
  const id = agentId === undefined ? undefined : BigInt(agentId);
  const clients = [...clientAddresses];

  return useReadContract({
    address: reputationRegistryAddress,
    abi: reputationRegistryAbi,
    functionName: "getSummary",
    args:
      id !== undefined
        ? [id, clients, "", ""]
        : undefined,
    chainId: arcTestnet.id,
    query: {
      // Spec expects non-empty clients for meaningful results; still allow read when provided
      enabled: id !== undefined && clients.length > 0,
    },
  });
}
