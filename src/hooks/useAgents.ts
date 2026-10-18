"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AGENTS_UPDATED_EVENT, mergeAgentCatalog } from "@/lib/localAgents";
import { useCuratorListings } from "@/hooks/useCuratorListings";
import { usePublicAgents } from "@/hooks/usePublicAgents";
import {
  filterAgentsByCategory,
  filterAgentsBySearch,
  sortAgentsRecent,
} from "@/lib/agentDiscovery";
import { getCategoryBySlug } from "@/data/categories";
import type { Agent } from "@/types/agent";

export interface UseAgentsOptions {
  limit?: number;
  /** Search query (name, description, capabilities). */
  search?: string;
  /** Category slug filter. */
  categorySlug?: string;
}

export interface UseAgentsResult {
  /** Filtered listed agents only (on-chain Curator). */
  agents: Agent[];
  /** All listed agents before search/category filters. */
  allListed: Agent[];
  listedCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  /** Curator address has no code on this chain. */
  contractMissing: boolean;
  refetch: () => void;
}

function mergePublicAgents(published: Agent[], local: Agent[]): Agent[] {
  const byId = new Map<number, Agent>();
  for (const agent of published) byId.set(agent.id, agent);
  for (const agent of local) {
    const chain = byId.get(agent.id);
    if (!chain) {
      byId.set(agent.id, agent);
      continue;
    }
    byId.set(agent.id, {
      ...agent,
      ...chain,
      image: chain.image || agent.image,
      capabilities:
        chain.capabilities.length > 0 ? chain.capabilities : agent.capabilities,
      categories: chain.categories?.length ? chain.categories : agent.categories,
      x402Endpoint: agent.x402Endpoint?.startsWith("http")
        ? agent.x402Endpoint
        : chain.x402Endpoint || agent.x402Endpoint,
      owner: chain.owner || agent.owner,
      pricePerTask: chain.pricePerTask > 0 ? chain.pricePerTask : agent.pricePerTask,
    });
  }
  return Array.from(byId.values());
}

/**
 * Discovery catalog: agents registered on Zenthra, plus any curator rows.
 * Registration lists an agent directly. No stake and no mocks.
 */
export function useAgents(options: UseAgentsOptions = {}): UseAgentsResult {
  const { limit, search = "", categorySlug } = options;

  const {
    agents: curatorAgents,
    listedCount,
    isLoading: curatorLoading,
    isError: curatorError,
    error: curatorErr,
    contractMissing,
    refetch: refetchCurator,
  } = useCuratorListings();
  const {
    agents: publicAgents,
    isLoading: publicLoading,
    refetch: refetchPublic,
  } = usePublicAgents();

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    window.addEventListener(AGENTS_UPDATED_EVENT, onUpdate);
    return () => {
      window.removeEventListener(AGENTS_UPDATED_EVENT, onUpdate);
    };
  }, []);

  const allListed = useMemo(() => {
    void tick;
    const local = mergeAgentCatalog(curatorAgents, { includeMocks: false });
    return sortAgentsRecent(mergePublicAgents(publicAgents, local));
  }, [curatorAgents, publicAgents, tick]);

  const agents = useMemo(() => {
    let list = allListed;

    if (categorySlug) {
      const cat = getCategoryBySlug(categorySlug);
      if (cat) list = filterAgentsByCategory(list, cat);
    }

    list = filterAgentsBySearch(list, search);

    if (limit != null && limit > 0) list = list.slice(0, limit);
    return list;
  }, [allListed, categorySlug, search, limit]);

  const refetch = useCallback(() => {
    setTick((n) => n + 1);
    void refetchCurator();
    void refetchPublic();
  }, [refetchCurator, refetchPublic]);

  return {
    agents,
    allListed,
    listedCount: Math.max(listedCount, allListed.length),
    isLoading: publicLoading || (curatorLoading && publicAgents.length === 0),
    isError: curatorError,
    error: curatorErr,
    contractMissing,
    refetch,
  };
}
