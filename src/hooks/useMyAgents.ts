"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useCuratorListings } from "@/hooks/useCuratorListings";
import {
  AGENTS_UPDATED_EVENT,
  getRegisteredAgents,
} from "@/lib/localAgents";
import type { Agent } from "@/types/agent";

export type MyAgentRow = Agent & {
  source: "listed" | "registered";
};

/**
 * Agents belonging to the connected wallet:
 * - Listed on ZenthraCurator (owner match)
 * - Saved locally after Identity Registry mint (owner match)
 */
export function useMyAgents() {
  const { address, isConnected } = useAccount();
  const {
    agents: listed,
    isLoading,
    isError,
    error,
    refetch: refetchCurator,
  } = useCuratorListings();

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(AGENTS_UPDATED_EVENT, bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener(AGENTS_UPDATED_EVENT, bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  const rows: MyAgentRow[] = useMemo(() => {
    void tick;
    if (!address) return [];

    const lower = address.toLowerCase();
    const byId = new Map<number, MyAgentRow>();

    for (const a of getRegisteredAgents()) {
      if (a.owner?.toLowerCase() !== lower) continue;
      byId.set(a.id, {
        ...a,
        isOnChain: true,
        isListedOnZenthra: a.isListedOnZenthra ?? false,
        source: a.isListedOnZenthra ? "listed" : "registered",
      });
    }

    for (const a of listed) {
      if (a.owner?.toLowerCase() !== lower) continue;
      const prev = byId.get(a.id);
      byId.set(a.id, {
        ...prev,
        ...a,
        name: prev?.name || a.name,
        description: prev?.description || a.description,
        image: prev?.image || a.image,
        isListedOnZenthra: true,
        isOnChain: true,
        source: "listed",
      });
    }

    return Array.from(byId.values()).sort((a, b) => {
      if (a.isListedOnZenthra !== b.isListedOnZenthra) {
        return a.isListedOnZenthra ? -1 : 1;
      }
      return b.id - a.id;
    });
  }, [address, listed, tick]);

  const listedCount = rows.filter((r) => r.isListedOnZenthra).length;
  const stakedUsdc = rows.reduce(
    (sum, r) => sum + (r.isListedOnZenthra ? (r.stakeAmount ?? 1) : 0),
    0
  );

  const refetch = useCallback(async () => {
    setTick((n) => n + 1);
    await refetchCurator();
  }, [refetchCurator]);

  return {
    address,
    isConnected,
    agents: rows,
    listedCount,
    registeredOnlyCount: rows.length - listedCount,
    stakedUsdc,
    isLoading: isConnected ? isLoading : false,
    isError,
    error,
    refetch,
  };
}
