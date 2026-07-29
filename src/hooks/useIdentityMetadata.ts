"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { arcTestnet } from "@/config/chains";
import { fetchIdentityDisplayMeta } from "@/lib/fetchIdentityDisplayMeta";
import { getCachedDisplayMeta } from "@/lib/agentMetaCache";
import type { DisplayMeta } from "@/lib/agentMetadata";

/**
 * Load Identity Registry display metadata for agent IDs.
 * Uses a standalone Arc public client — works without a connected wallet.
 */
export function useIdentityMetadata(agentIds: bigint[]) {
  const idsKey = useMemo(
    () =>
      agentIds
        .map((id) => id.toString())
        .sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1))
        .join(","),
    [agentIds]
  );

  const numericIds = useMemo(
    () => agentIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
    [agentIds]
  );

  // Instant seed from localStorage (synchronous) so first paint can show names
  const cachedSeed = useMemo(() => {
    const map = new Map<number, DisplayMeta>();
    for (const id of numericIds) {
      const cached = getCachedDisplayMeta(id);
      if (cached) map.set(id, cached);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const metaQuery = useQuery({
    queryKey: ["zenthra", "identity-meta-v3", arcTestnet.id, idsKey],
    queryFn: async () => {
      const map = await fetchIdentityDisplayMeta(agentIds);
      // Serialize as plain object for React Query stability
      const obj: Record<string, DisplayMeta> = {};
      map.forEach((meta, id) => {
        obj[String(id)] = meta;
      });
      return obj;
    },
    enabled: agentIds.length > 0,
    staleTime: 30_000,
    gcTime: 15 * 60_000,
    retry: 2,
    refetchOnMount: true,
  });

  const metaById = useMemo(() => {
    const map = new Map<number, DisplayMeta>(cachedSeed);
    const live = metaQuery.data;
    if (live) {
      for (const [idStr, meta] of Object.entries(live)) {
        const id = Number(idStr);
        if (!Number.isFinite(id)) continue;
        map.set(id, meta);
      }
    }
    return map;
  }, [cachedSeed, metaQuery.data]);

  const hasAnyName = useMemo(() => {
    for (const meta of metaById.values()) {
      if (meta.name && !/^Agent\s*#/i.test(meta.name)) return true;
    }
    return false;
  }, [metaById]);

  return {
    metaById,
    /** True only while first fetch is in-flight and we have no cached names */
    isLoading:
      agentIds.length > 0 &&
      metaQuery.isLoading &&
      !hasAnyName &&
      cachedSeed.size === 0,
    isFetching: metaQuery.isFetching,
    refetch: async () => {
      await metaQuery.refetch();
    },
  };
}
