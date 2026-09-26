"use client";

import { useReadContracts } from "wagmi";
import { zenthraCuratorV2Abi } from "@/config/abis/zenthraCuratorV2";
import { zenthraCuratorV2Address } from "@/config/contracts";
import { arcMainnet } from "@/config/chains";


const CONTRACT = zenthraCuratorV2Address;

/**
 * Read on-chain stats, endorsement count, and featured status for a listed agent.
 */
export function useAgentStatsV2(agentId: number | undefined) {
  const enabled = agentId !== undefined && agentId >= 0;
  const agentIdBig = enabled ? BigInt(agentId) : BigInt(0);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: CONTRACT,
        abi: zenthraCuratorV2Abi,
        functionName: "getAgentStats",
        args: [agentIdBig],
        chainId: arcMainnet.id,
      },
      {
        address: CONTRACT,
        abi: zenthraCuratorV2Abi,
        functionName: "getEndorsementCount",
        args: [agentIdBig],
        chainId: arcMainnet.id,
      },
      {
        address: CONTRACT,
        abi: zenthraCuratorV2Abi,
        functionName: "isFeatured",
        args: [agentIdBig],
        chainId: arcMainnet.id,
      },
    ],
    query: { enabled, staleTime: 30_000 },
  });

  const rawStats = data?.[0]?.result as { tasksCompleted: number; tasksDisputed: number; tasksCancelled: number; tasksResolved: number; totalEarned: bigint; totalVolume: bigint; } | undefined;
  const endorsementCount = data?.[1]?.result as bigint | undefined;
  const isFeatured = data?.[2]?.result as boolean | undefined;

  return {
    stats: rawStats,
    endorsementCount: endorsementCount ?? BigInt(0),
    isFeatured: isFeatured ?? false,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Read the pending USDC withdrawal balance for an address (pull-claim model).
 */
export function usePendingWithdrawal(address: `0x${string}` | undefined) {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: CONTRACT,
        abi: zenthraCuratorV2Abi,
        functionName: "pendingWithdrawals",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
        chainId: arcMainnet.id,
      },
    ],
    query: { enabled: !!address, staleTime: 15_000 },
  });

  return {
    pendingUsdc: (data?.[0]?.result as bigint | undefined) ?? BigInt(0),
    isLoading,
    refetch,
  };
}
