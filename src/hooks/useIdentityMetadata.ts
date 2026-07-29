"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import {
  loadDisplayMeta,
  type DisplayMeta,
} from "@/lib/agentMetadata";
import {
  getCachedDisplayMeta,
  setCachedDisplayMeta,
} from "@/lib/agentMetaCache";
import { isPlaceholderDescription, isPlaceholderName } from "@/lib/agentDisplay";

/**
 * Batch-load Identity Registry tokenURI metadata for agent ids.
 * Uses a direct public client (more reliable than multi-contract batches),
 * localStorage cache for instant names, and UTF-8-safe data URI parsing.
 */
export function useIdentityMetadata(agentIds: bigint[]) {
  const publicClient = usePublicClient({ chainId: arcTestnet.id });

  const idsKey = useMemo(
    () =>
      agentIds
        .map((id) => id.toString())
        .sort()
        .join(","),
    [agentIds]
  );

  const numericIds = useMemo(
    () => agentIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
    [agentIds]
  );

  // Instant seed from localStorage so cards show real names before RPC finishes
  const cachedSeed = useMemo(() => {
    const map = new Map<number, DisplayMeta>();
    for (const id of numericIds) {
      const cached = getCachedDisplayMeta(id);
      if (cached) map.set(id, cached);
    }
    return map;
    // Re-seed when the listed set changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const metaQuery = useQuery({
    queryKey: ["zenthra", "identity-meta-v2", arcTestnet.id, idsKey],
    queryFn: async (): Promise<Record<number, DisplayMeta>> => {
      const result: Record<number, DisplayMeta> = {};

      if (!publicClient || agentIds.length === 0) return result;

      // Parallel tokenURI reads with per-id isolation (one RPC failure won't kill all)
      await Promise.all(
        agentIds.map(async (agentId) => {
          const id = Number(agentId);
          if (!Number.isFinite(id)) return;

          try {
            const uri = await publicClient.readContract({
              address: identityRegistryAddress,
              abi: identityRegistryAbi,
              functionName: "tokenURI",
              args: [agentId],
            });

            const uriStr = typeof uri === "string" ? uri : String(uri ?? "");
            if (!uriStr.trim()) {
              const cached = getCachedDisplayMeta(id);
              if (cached) result[id] = cached;
              return;
            }

            const meta = await loadDisplayMeta(uriStr);

            // Merge with cache so we never drop a previously known good name
            const cached = getCachedDisplayMeta(id);
            const merged: DisplayMeta = {
              name:
                !isPlaceholderName(meta.name)
                  ? meta.name
                  : cached?.name || meta.name,
              description:
                !isPlaceholderDescription(meta.description)
                  ? meta.description
                  : cached?.description || meta.description,
              image: meta.image || cached?.image,
              categories:
                meta.categories?.length
                  ? meta.categories
                  : cached?.categories ?? [],
              capabilities:
                meta.capabilities?.length
                  ? meta.capabilities
                  : cached?.capabilities ?? [],
            };

            result[id] = merged;
            if (
              !isPlaceholderName(merged.name) ||
              !isPlaceholderDescription(merged.description) ||
              merged.image
            ) {
              setCachedDisplayMeta(id, merged);
            }
          } catch {
            const cached = getCachedDisplayMeta(id);
            if (cached) result[id] = cached;
          }
        })
      );

      return result;
    },
    enabled: Boolean(publicClient) && agentIds.length > 0,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  const metaById = useMemo(() => {
    const map = new Map<number, DisplayMeta>(cachedSeed);
    const live = metaQuery.data;
    if (live) {
      for (const [idStr, meta] of Object.entries(live)) {
        const id = Number(idStr);
        if (!Number.isFinite(id)) continue;
        const prev = map.get(id);
        map.set(id, {
          name:
            !isPlaceholderName(meta.name)
              ? meta.name
              : prev?.name || meta.name,
          description:
            !isPlaceholderDescription(meta.description)
              ? meta.description
              : prev?.description || meta.description,
          image: meta.image || prev?.image,
          categories:
            meta.categories?.length
              ? meta.categories
              : prev?.categories ?? [],
          capabilities:
            meta.capabilities?.length
              ? meta.capabilities
              : prev?.capabilities ?? [],
        });
      }
    }
    return map;
  }, [cachedSeed, metaQuery.data]);

  return {
    metaById,
    isLoading:
      agentIds.length > 0 &&
      metaQuery.isLoading &&
      cachedSeed.size === 0,
    refetch: async () => {
      await metaQuery.refetch();
    },
  };
}
