"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { reputationRegistryAbi } from "@/config/abis";
import { reputationRegistryAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { shortenAddress } from "@/lib/format";

export type FeedbackItem = {
  client: Address;
  clientLabel: string;
  index: number;
  score: number;
  tag1: string;
  tag2: string;
  isRevoked: boolean;
};

export type AgentFeedbackSummary = {
  count: number;
  averageScore: number | null;
  items: FeedbackItem[];
};

function scoreFromFixed(value: bigint, decimals: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (decimals <= 0) return n;
  return n / 10 ** decimals;
}

/**
 * Load reputation summary + recent feedback for an agent from Reputation Registry.
 */
export function useAgentFeedback(agentId: number | undefined) {
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const enabled = agentId != null && Number.isFinite(agentId) && Boolean(publicClient);

  const query = useQuery({
    queryKey: [
      "zenthra",
      "feedback",
      arcTestnet.id,
      reputationRegistryAddress,
      agentId,
    ],
    enabled,
    staleTime: 20_000,
    queryFn: async (): Promise<AgentFeedbackSummary> => {
      if (!publicClient || agentId == null) {
        return { count: 0, averageScore: null, items: [] };
      }

      const id = BigInt(agentId);

      let clients: Address[] = [];
      try {
        clients = (await publicClient.readContract({
          address: reputationRegistryAddress,
          abi: reputationRegistryAbi,
          functionName: "getClients",
          args: [id],
        })) as Address[];
      } catch {
        return { count: 0, averageScore: null, items: [] };
      }

      if (!clients.length) {
        return { count: 0, averageScore: null, items: [] };
      }

      let averageScore: number | null = null;
      let count = clients.length;

      try {
        const summary = await publicClient.readContract({
          address: reputationRegistryAddress,
          abi: reputationRegistryAbi,
          functionName: "getSummary",
          args: [id, clients, "", ""],
        });
        const [c, summaryValue, summaryDecimals] = summary as [
          bigint,
          bigint,
          number,
        ];
        count = Number(c);
        averageScore = scoreFromFixed(summaryValue, Number(summaryDecimals));
      } catch {
        // keep null average
      }

      // Latest feedback per client (getLastIndex + readFeedback)
      const items: FeedbackItem[] = [];
      const limited = clients.slice(-12).reverse();

      await Promise.all(
        limited.map(async (client) => {
          try {
            const lastIndex = (await publicClient.readContract({
              address: reputationRegistryAddress,
              abi: reputationRegistryAbi,
              functionName: "getLastIndex",
              args: [id, client],
            })) as bigint;

            if (lastIndex === BigInt(0)) return;

            const fb = (await publicClient.readContract({
              address: reputationRegistryAddress,
              abi: reputationRegistryAbi,
              functionName: "readFeedback",
              args: [id, client, lastIndex],
            })) as [bigint, number, string, string, boolean];

            const [value, decimals, tag1, tag2, isRevoked] = fb;
            if (isRevoked) return;

            items.push({
              client,
              clientLabel: shortenAddress(client),
              index: Number(lastIndex),
              score: scoreFromFixed(value, Number(decimals)),
              tag1: tag1 || "",
              tag2: tag2 || "",
              isRevoked,
            });
          } catch {
            // skip client
          }
        })
      );

      items.sort((a, b) => b.index - a.index);

      return {
        count: count || items.length,
        averageScore,
        items,
      };
    },
  });

  return {
    summary: query.data ?? {
      count: 0,
      averageScore: null,
      items: [] as FeedbackItem[],
    },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
