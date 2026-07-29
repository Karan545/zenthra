"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContracts } from "wagmi";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { loadDisplayMeta, type DisplayMeta } from "@/lib/agentMetadata";

/**
 * Batch-load Identity Registry tokenURI metadata for agent ids.
 * Used so Directory/Profile show real names, descriptions, and images.
 */
export function useIdentityMetadata(agentIds: bigint[]) {
  const uriQuery = useReadContracts({
    contracts: agentIds.map((id) => ({
      address: identityRegistryAddress,
      abi: identityRegistryAbi,
      functionName: "tokenURI" as const,
      args: [id] as const,
      chainId: arcTestnet.id,
    })),
    query: {
      enabled: agentIds.length > 0,
      staleTime: 60_000,
    },
  });

  const uriById = useMemo(() => {
    const map = new Map<number, string>();
    agentIds.forEach((id, i) => {
      const row = uriQuery.data?.[i];
      if (row?.status === "success" && row.result) {
        map.set(Number(id), String(row.result));
      }
    });
    return map;
  }, [agentIds, uriQuery.data]);

  const key = useMemo(
    () =>
      Array.from(uriById.entries())
        .map(([id, uri]) => `${id}:${uri.slice(0, 64)}`)
        .join("|"),
    [uriById]
  );

  const metaQuery = useQuery({
    queryKey: ["zenthra", "identity-meta", arcTestnet.id, key],
    queryFn: async () => {
      const entries = Array.from(uriById.entries());
      const results = await Promise.all(
        entries.map(async ([id, uri]) => {
          const meta = await loadDisplayMeta(uri);
          return [id, meta] as const;
        })
      );
      return new Map<number, DisplayMeta>(results);
    },
    enabled: uriById.size > 0,
    staleTime: 60_000,
  });

  return {
    metaById: metaQuery.data ?? new Map<number, DisplayMeta>(),
    isLoading:
      (agentIds.length > 0 && uriQuery.isLoading) ||
      (uriById.size > 0 && metaQuery.isLoading),
    refetch: async () => {
      await uriQuery.refetch();
      await metaQuery.refetch();
    },
  };
}
