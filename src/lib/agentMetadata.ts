import type { AgentMetadata, AgentStatus } from "@/types/agent";

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";
const ARWEAVE_GATEWAY = "https://arweave.net/";

/** Turn ipfs:// / ar:// / relative URIs into browser-fetchable URLs. */
export function resolveUri(uri: string | undefined | null): string | undefined {
  if (!uri) return undefined;
  const trimmed = uri.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("ipfs://")) {
    const path = trimmed.slice("ipfs://".length).replace(/^ipfs\//, "");
    return `${IPFS_GATEWAY}${path}`;
  }
  if (trimmed.startsWith("ar://")) {
    return `${ARWEAVE_GATEWAY}${trimmed.slice("ar://".length)}`;
  }
  if (trimmed.startsWith("ipfs/")) {
    return `${IPFS_GATEWAY}${trimmed.slice("ipfs/".length)}`;
  }
  return trimmed;
}

function parseDataUriJson(uri: string): AgentMetadata | null {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const b64 = uri.slice("data:application/json;base64,".length);
      const json =
        typeof atob === "function"
          ? atob(b64)
          : Buffer.from(b64, "base64").toString("utf8");
      return JSON.parse(json) as AgentMetadata;
    }
    if (uri.startsWith("data:application/json,")) {
      const raw = decodeURIComponent(uri.slice("data:application/json,".length));
      return JSON.parse(raw) as AgentMetadata;
    }
    if (uri.startsWith("data:application/json;utf8,")) {
      const raw = decodeURIComponent(
        uri.slice("data:application/json;utf8,".length)
      );
      return JSON.parse(raw) as AgentMetadata;
    }
  } catch {
    return null;
  }
  return null;
}

function extractCapabilities(meta: AgentMetadata): string[] {
  if (Array.isArray(meta.capabilities) && meta.capabilities.length > 0) {
    return meta.capabilities.map(String).filter(Boolean);
  }
  if (!Array.isArray(meta.attributes)) return [];

  const fromAttrs = meta.attributes
    .filter((a) => {
      const t = (a.trait_type ?? "").toLowerCase();
      return (
        t === "capability" ||
        t === "capabilities" ||
        t === "skill" ||
        t === "skills" ||
        t === "tag" ||
        t === "tags"
      );
    })
    .map((a) => String(a.value ?? ""))
    .filter(Boolean);

  if (fromAttrs.length > 0) return fromAttrs;

  // Fallback: collect a few non-generic trait values as soft tags
  return meta.attributes
    .slice(0, 4)
    .map((a) => {
      if (a.trait_type && a.value != null) {
        return `${a.trait_type}: ${a.value}`;
      }
      return String(a.value ?? "");
    })
    .filter(Boolean);
}

function normalizeStatus(value: unknown): AgentStatus | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.toLowerCase();
  if (v === "online" || v === "busy" || v === "offline" || v === "unknown") {
    return v;
  }
  return undefined;
}

/**
 * Fetch + normalize agent registration / ERC-721 metadata from a tokenURI.
 * Never throws — returns empty object on failure.
 */
export async function fetchAgentMetadata(
  tokenURI: string | undefined
): Promise<AgentMetadata> {
  if (!tokenURI) return {};

  // Inline JSON data URIs
  if (tokenURI.startsWith("data:")) {
    return parseDataUriJson(tokenURI) ?? {};
  }

  const url = resolveUri(tokenURI);
  if (!url || !/^https?:\/\//i.test(url)) {
    return {};
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return {};
    const contentType = res.headers.get("content-type") ?? "";
    if (
      contentType.includes("application/json") ||
      contentType.includes("text/plain") ||
      contentType.includes("text/json") ||
      url.endsWith(".json")
    ) {
      const data = (await res.json()) as AgentMetadata;
      return data ?? {};
    }
    // Some gateways omit content-type — try JSON parse anyway
    const text = await res.text();
    try {
      return JSON.parse(text) as AgentMetadata;
    } catch {
      return {};
    }
  } catch {
    return {};
  }
}

/** Map raw metadata into display fields used by Agent. */
export function normalizeAgentMetadata(meta: AgentMetadata): {
  name?: string;
  description?: string;
  image?: string;
  capabilities: string[];
  categories: string[];
  reputation: number | null;
  price: string | null;
  status: AgentStatus;
} {
  const capabilities = extractCapabilities(meta);
  const categories = Array.isArray(meta.categories)
    ? meta.categories.map(String).filter(Boolean)
    : [];

  let reputation: number | null =
    typeof meta.reputation === "number" && Number.isFinite(meta.reputation)
      ? meta.reputation
      : null;

  if (reputation == null && Array.isArray(meta.attributes)) {
    const repAttr = meta.attributes.find((a) =>
      (a.trait_type ?? "").toLowerCase().includes("reputation")
    );
    if (repAttr && repAttr.value != null) {
      const n = Number(repAttr.value);
      if (Number.isFinite(n)) reputation = n;
    }
  }

  let price: string | null = null;
  if (meta.price != null) {
    price = typeof meta.price === "number" ? `${meta.price} USDC` : String(meta.price);
  } else if (Array.isArray(meta.attributes)) {
    const priceAttr = meta.attributes.find((a) => {
      const t = (a.trait_type ?? "").toLowerCase();
      return t.includes("price") || t.includes("rate") || t.includes("fee");
    });
    if (priceAttr?.value != null) price = String(priceAttr.value);
  }

  return {
    name: meta.name?.trim() || undefined,
    description: meta.description?.trim() || undefined,
    image: resolveUri(meta.image),
    capabilities,
    categories,
    reputation,
    price,
    status: normalizeStatus(meta.status) ?? "unknown",
  };
}

export type DisplayMeta = {
  name?: string;
  description?: string;
  image?: string;
  categories: string[];
  capabilities: string[];
};

/** Parse tokenURI into display fields (never throws). */
export async function loadDisplayMeta(
  tokenURI: string | undefined
): Promise<DisplayMeta> {
  const raw = await fetchAgentMetadata(tokenURI);
  const n = normalizeAgentMetadata(raw);
  return {
    name: n.name,
    description: n.description,
    image: n.image,
    categories: n.categories,
    capabilities: n.capabilities,
  };
}

