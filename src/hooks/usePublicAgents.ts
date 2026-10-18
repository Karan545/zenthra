"use client";

import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@/types/agent";

type PublicAgentJson = {
  id: number;
  name: string;
  description: string;
  image?: string;
  capabilities?: string[];
  categories?: string[];
  pricePerTask?: number;
  owner?: string;
  hasWork?: boolean;
};

function toAgent(row: PublicAgentJson): Agent | null {
  if (!Number.isSafeInteger(row.id) || row.id < 0) return null;
  const price = Number(row.pricePerTask);
  return {
    id: row.id,
    name: row.name?.trim() || `Agent #${row.id}`,
    description: row.description?.trim() || "Listed on Zenthra.",
    image: row.image || undefined,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities.filter(Boolean) : [],
    categories: Array.isArray(row.categories) ? row.categories.filter(Boolean) : [],
    reputation: 0,
    pricePerTask: Number.isFinite(price) && price >= 0 ? price : 0,
    owner: row.owner || "",
    x402Endpoint: row.hasWork ? "onchain" : undefined,
    isOnChain: true,
    isListedOnZenthra: true,
    listedAt: row.id,
  };
}

/** Agents published for every visitor, read from Arc through the site API. */
export function usePublicAgents() {
  const query = useQuery({
    queryKey: ["zenthra-public-agents"],
    queryFn: async (): Promise<Agent[]> => {
      const response = await fetch("/api/agents/directory");
      if (!response.ok) throw new Error("Could not load listed agents.");
      const body = (await response.json()) as { agents?: PublicAgentJson[] };
      return (body.agents ?? [])
        .map(toAgent)
        .filter((agent): agent is Agent => agent != null);
    },
    staleTime: 30_000,
  });

  return {
    agents: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
