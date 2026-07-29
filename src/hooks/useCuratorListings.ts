"use client";

import { useMemo } from "react";
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
import { useIdentityMetadata } from "@/hooks/useIdentityMetadata";
import type { Agent } from "@/types/agent";

/**
 * Active ZenthraCurator listings enriched with Identity Registry metadata
 * (name, description, image) and local registration cache.
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
    return raw as bigint[];
  }, [idsQuery.data]);

  const listingsQuery = useReadContract({
    address: zenthraCuratorAddress,
    abi: zenthraCuratorAbi,
    functionName: "getAgents",
    args: [agentIds],
    chainId: arcTestnet.id,
    query: {
      enabled: agentIds.length > 0,
      staleTime: 15_000,
    },
  });

  const { metaById, isLoading: metaLoading, refetch: refetchMeta } =
    useIdentityMetadata(agentIds);

  const agents: Agent[] = useMemo(() => {
    const localById = new Map(
      getRegisteredAgents().map((a) => [a.id, a] as const)
    );

    // Seed display cache from this browser's registrations so Directory
    // shows real names even before tokenURI RPC completes.
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

    if (agentIds.length === 0) return [];

    const rows = (listingsQuery.data ?? []) as CuratorListing[];

    return rows
      .filter((row) => row && row.isActive)
      .map((row) => {
        const id = Number(row.agentId);
        const local = localById.get(id);
        const onChainMeta = metaById.get(id);

        const capabilities =
          row.capabilities.length > 0
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

        // Prefer real name/description: local registration → identity tokenURI → fallback
        const name = pickDisplayName(
          id,
          local?.name,
          onChainMeta?.name
        );

        const description = pickDisplayDescription(
          local?.description,
          onChainMeta?.description
        );

        const image = onChainMeta?.image || local?.image || undefined;

        return {
          id,
          name,
          description,
          image,
          capabilities,
          categories,
          // No fake default score — 0 means unknown / no feedback loaded yet
          reputation: local?.reputation ?? 0,
          pricePerTask: fromUsdcUnits(row.pricePerTask),
          owner: row.owner,
          x402Endpoint: row.x402Endpoint || local?.x402Endpoint || undefined,
          isOnChain: true,
          isListedOnZenthra: true,
          isFeatured: row.isFeatured,
          listedAt: Number(row.listedAt),
          stakeAmount: fromUsdcUnits(row.stakeAmount),
          txHash: local?.txHash,
          listTxHash: local?.listTxHash,
          registeredAt: local?.registeredAt,
        } satisfies Agent;
      });
  }, [agentIds, listingsQuery.data, metaById]);

  const isLoading =
    idsQuery.isLoading ||
    (agentIds.length > 0 && listingsQuery.isLoading) ||
    (agentIds.length > 0 && metaLoading);

  const isError = idsQuery.isError || listingsQuery.isError;
  const error =
    (idsQuery.error as Error | null) ??
    (listingsQuery.error as Error | null) ??
    null;

  return {
    agents,
    listedCount: agentIds.length,
    isLoading,
    isError,
    error,
    refetch: async () => {
      await idsQuery.refetch();
      if (agentIds.length > 0) {
        await listingsQuery.refetch();
        await refetchMeta();
      }
    },
  };
}
