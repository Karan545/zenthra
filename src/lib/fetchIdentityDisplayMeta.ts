import type { PublicClient } from "viem";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import {
  loadDisplayMeta,
  type DisplayMeta,
} from "@/lib/agentMetadata";
import {
  getCachedDisplayMeta,
  setCachedDisplayMeta,
} from "@/lib/agentMetaCache";
import {
  isPlaceholderDescription,
  isPlaceholderName,
} from "@/lib/agentDisplay";
import { getArcPublicClient } from "@/lib/arcClient";

function emptyMeta(): DisplayMeta {
  return {
    name: undefined,
    description: undefined,
    image: undefined,
    categories: [],
    capabilities: [],
  };
}

function mergeMeta(primary: DisplayMeta, fallback?: DisplayMeta | null): DisplayMeta {
  return {
    name: !isPlaceholderName(primary.name)
      ? primary.name
      : fallback?.name || primary.name,
    description: !isPlaceholderDescription(primary.description)
      ? primary.description
      : fallback?.description || primary.description,
    image: primary.image || fallback?.image,
    categories:
      primary.categories?.length > 0
        ? primary.categories
        : fallback?.categories ?? [],
    capabilities:
      primary.capabilities?.length > 0
        ? primary.capabilities
        : fallback?.capabilities ?? [],
  };
}

async function readTokenUri(
  client: PublicClient,
  agentId: bigint
): Promise<string | null> {
  try {
    const uri = await client.readContract({
      address: identityRegistryAddress,
      abi: identityRegistryAbi,
      functionName: "tokenURI",
      args: [agentId],
    });
    const s = typeof uri === "string" ? uri.trim() : String(uri ?? "").trim();
    return s || null;
  } catch {
    return null;
  }
}

/**
 * Load display metadata (name, description, image) for agent IDs from the
 * ERC-8004 Identity Registry tokenURI. Always uses Arc RPC (no wallet needed).
 * Caches successful results in localStorage.
 */
export async function fetchIdentityDisplayMeta(
  agentIds: readonly bigint[],
  client: PublicClient = getArcPublicClient()
): Promise<Map<number, DisplayMeta>> {
  const out = new Map<number, DisplayMeta>();
  if (agentIds.length === 0) return out;

  // Seed from cache so partial RPC failures still show known names
  for (const agentId of agentIds) {
    const id = Number(agentId);
    if (!Number.isFinite(id)) continue;
    const cached = getCachedDisplayMeta(id);
    if (cached) out.set(id, cached);
  }

  // Fetch each tokenURI + parse metadata (isolated failures)
  await Promise.all(
    agentIds.map(async (agentId) => {
      const id = Number(agentId);
      if (!Number.isFinite(id)) return;

      try {
        const uri = await readTokenUri(client, agentId);
        if (!uri) return;

        const loaded = await loadDisplayMeta(uri);
        const cached = getCachedDisplayMeta(id);
        const merged = mergeMeta(loaded, cached);

        out.set(id, merged);

        if (
          !isPlaceholderName(merged.name) ||
          !isPlaceholderDescription(merged.description) ||
          merged.image
        ) {
          setCachedDisplayMeta(id, merged);
        }
      } catch {
        // keep cache entry if any
        if (!out.has(id)) {
          const cached = getCachedDisplayMeta(id);
          if (cached) out.set(id, cached);
          else out.set(id, emptyMeta());
        }
      }
    })
  );

  return out;
}
