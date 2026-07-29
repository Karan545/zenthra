"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AGENTS_UPDATED_EVENT } from "@/lib/localAgents";
import { useCuratorListings } from "@/hooks/useCuratorListings";
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
  refetch: () => void;
}

/**
 * Discovery catalog: **only** agents listed on ZenthraCurator.
 * No mocks. No Identity Registry totalSupply.
 */
export function useAgents(options: UseAgentsOptions = {}): UseAgentsResult {
  const { limit, search = "", categorySlug } = options;

  const {
    agents: curatorAgents,
    listedCount,
    isLoading: curatorLoading,
    isError: curatorError,
    error: curatorErr,
    refetch: refetchCurator,
  } = useCuratorListings();

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    window.addEventListener(AGENTS_UPDATED_EVENT, onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener(AGENTS_UPDATED_EVENT, onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, []);

  const allListed = useMemo(() => {
    void tick;
    return sortAgentsRecent(curatorAgents);
  }, [curatorAgents, tick]);

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
  }, [refetchCurator]);

  return {
    agents,
    allListed,
    listedCount: listedCount || allListed.length,
    isLoading: curatorLoading,
    isError: curatorError,
    error: curatorErr,
    refetch,
  };
}
