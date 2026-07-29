"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { zenthraCuratorAbi, type CuratorListing } from "@/config/abis";
import {
  fromUsdcUnits,
  zenthraCuratorAddress,
} from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { getRegisteredAgents } from "@/lib/localAgents";
import { inferCategorySlugsFromCapabilities } from "@/lib/categories";
import {
  isPlaceholderDescription,
  isPlaceholderName,
  pickDisplayDescription,
  pickDisplayName,
} from "@/lib/agentDisplay";
import { setCachedDisplayMeta } from "@/lib/agentMetaCache";
import { fetchIdentityDisplayMeta } from "@/lib/fetchIdentityDisplayMeta";
import { getArcPublicClient } from "@/lib/arcClient";
import type { DisplayMeta } from "@/lib/agentMetadata";
import type { Agent } from "@/types/agent";

function toBigIntId(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) {
      return BigInt(Math.trunc(value));
    }
    if (typeof value === "string" && value.trim()) return BigInt(value);
    return null;
  } catch {
    return null;
  }
}

function toNumberId(value: unknown): number | null {
  const bi = toBigIntId(value);
  if (bi == null) return null;
  const n = Number(bi);
  return Number.isFinite(n) ? n : null;
}

/**
 * Active ZenthraCurator listings enriched with ERC-8004 Identity Registry
 * metadata (name, description, image). Works without a connected wallet.
 */
export function useCuratorListings() {
  const idsQuery = useReadContract({
    address: zenthraCuratorAddress,
    abi: zenthraCuratorAbi,
    functionName: "getAllListedAgents",
    chainId: arcTestnet.id,
    query: {
      staleTime: 15_000,
    },
  });

  const agentIds = useMemo(() => {
    const raw = idsQuery.data;
    if (!raw || !Array.isArray(raw)) return [] as bigint[];
    return (raw as unknown[])
      .map((v) => toBigIntId(v))
      .filter((v): v is bigint => v != null);
  }, [idsQuery.data]);

  const idsKey = useMemo(
    () => agentIds.map((id) => id.toString()).join(","),
    [agentIds]
  );

  /**
   * Single enrichment query: curator listings + identity tokenURI metadata.
   * Standalone Arc client — not tied to wallet connection state.
   */
  const enrichedQuery = useQuery({
    queryKey: ["zenthra", "curator-enriched-v1", arcTestnet.id, idsKey],
    enabled: agentIds.length > 0,
    staleTime: 20_000,
    gcTime: 15 * 60_000,
    retry: 2,
    refetchOnMount: true,
    queryFn: async (): Promise<Agent[]> => {
      const client = getArcPublicClient();

      // 1) Curator listing rows
      const rows = (await client.readContract({
        address: zenthraCuratorAddress,
        abi: zenthraCuratorAbi,
        functionName: "getAgents",
        args: [agentIds],
      })) as CuratorListing[];

      // 2) Identity Registry metadata for every listed agentId
      const metaById = await fetchIdentityDisplayMeta(agentIds, client);

      // 3) Local registration cache (same browser as registerer)
      const localById = new Map(
        getRegisteredAgents().map((a) => [a.id, a] as const)
      );

      for (const local of localById.values()) {
        if (
          !isPlaceholderName(local.name) ||
          !isPlaceholderDescription(local.description)
        ) {
          setCachedDisplayMeta(local.id, {
            name: local.name,
            description: local.description,
            image: local.image,
            categories: local.categories ?? [],
            capabilities: local.capabilities ?? [],
          });
        }
      }

      const agents: Agent[] = [];

      for (const row of rows ?? []) {
        if (!row || !row.isActive) continue;

        const id = toNumberId(row.agentId);
        if (id == null) continue;

        const local = localById.get(id);
        const onChainMeta: DisplayMeta | undefined = metaById.get(id);

        // If cache has better local name for this id, merge into on-chain
        const cachedLocalName = local?.name;
        const cachedLocalDesc = local?.description;

        const capabilities =
          Array.isArray(row.capabilities) && row.capabilities.length > 0
            ? [...row.capabilities]
            : onChainMeta?.capabilities?.length
              ? onChainMeta.capabilities
              : local?.capabilities ?? [];

        const categories =
          local?.categories && local.categories.length > 0
            ? local.categories
            : onChainMeta?.categories && onChainMeta.categories.length > 0
              ? onChainMeta.categories
              : inferCategorySlugsFromCapabilities(capabilities);

        // Priority: on-chain identity name (works for all users) → local → fallback
        const name = pickDisplayName(
          id,
          onChainMeta?.name,
          cachedLocalName
        );

        const description = pickDisplayDescription(
          onChainMeta?.description,
          cachedLocalDesc
        );

        const image = onChainMeta?.image || local?.image || undefined;

        agents.push({
          id,
          name,
          description,
          image,
          capabilities,
          categories,
          reputation: local?.reputation ?? 0,
          pricePerTask: fromUsdcUnits(row.pricePerTask),
          owner: row.owner,
          x402Endpoint: row.x402Endpoint || local?.x402Endpoint || undefined,
          isOnChain: true,
          isListedOnZenthra: true,
          isFeatured: Boolean(row.isFeatured),
          listedAt: Number(row.listedAt),
          stakeAmount: fromUsdcUnits(row.stakeAmount),
          txHash: local?.txHash,
          listTxHash: local?.listTxHash,
          registeredAt: local?.registeredAt,
        });
      }

      // Sort newest listed first
      agents.sort((a, b) => (b.listedAt ?? 0) - (a.listedAt ?? 0));
      return agents;
    },
  });

  const isLoading =
    idsQuery.isLoading ||
    (agentIds.length > 0 && enrichedQuery.isLoading);

  const isError = idsQuery.isError || enrichedQuery.isError;
  const error =
    (idsQuery.error as Error | null) ??
    (enrichedQuery.error as Error | null) ??
    null;

  return {
    agents: enrichedQuery.data ?? [],
    listedCount: agentIds.length,
    isLoading,
    isError,
    error,
    refetch: async () => {
      await idsQuery.refetch();
      await enrichedQuery.refetch();
    },
  };
}
