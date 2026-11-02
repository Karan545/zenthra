/**
 * GET /api/agents/discover-jobs?jobId=<id>
 *
 * Reads open jobs from JobEscrow + ALL agents from the ERC-8004 Identity Registry,
 * runs capability matching, and returns matched agents per job.
 *
 * Agent source: Identity Registry (Arc Mainnet) — no curator required.
 * Enumerates token IDs 1..totalSupply, fetches tokenURI, parses capabilities.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { rankAgentsForJob } from "@/lib/jobMatching";

// ─── Chain config ─────────────────────────────────────────────────────────────
const ARC_MAINNET = {
  id: 5042,
  name: "Arc Mainnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } }, // arc-studio-allow-onchain-literal
} as const;

// ─── Addresses ────────────────────────────────────────────────────────────────
const JOB_ESCROW_ADDRESS = (
  process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? ""
) as `0x${string}`;

const IDENTITY_REGISTRY = (
  process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS
  ?? "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" // arc-studio-allow-onchain-literal
) as `0x${string}`;

// ─── RPC helper ───────────────────────────────────────────────────────────────
function getRpcUrl(): string {
  const base = process.env.RPC_PROXY_BASE_URL;
  const token = process.env.RPC_PROXY_TOKEN;
  const chains = (process.env.RPC_PROXY_CHAINS ?? "").split(",");
  if (base && token && chains.includes("Arc_Mainnet")) {
    return `${base}/api/rpc/Arc_Mainnet?_rpc_token=${token}`;
  }
  return ARC_MAINNET.rpcUrls.default.http[0];
}

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const JOB_ESCROW_ABI = [
  { name: "jobCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "getJob", type: "function", stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [{
      type: "tuple", components: [
        { name: "id", type: "uint256" }, { name: "poster", type: "address" },
        { name: "description", type: "string" }, { name: "budget", type: "uint256" },
        { name: "status", type: "uint8" }, { name: "acceptedBidder", type: "address" },
        { name: "deliverable", type: "string" }, { name: "createdAt", type: "uint256" },
        { name: "acceptedAt", type: "uint256" },
      ],
    }],
  },
] as const;

const IDENTITY_ABI = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "tokenByIndex", type: "function", stateMutability: "view", inputs: [{ name: "index", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "tokenURI", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { name: "ownerOf", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fromUsdcUnits(raw: bigint): number {
  return parseFloat(formatUnits(raw, 6));
}

type AgentMeta = {
  id: number;
  name: string;
  description: string;
  image?: string;
  capabilities: string[];
  x402Endpoint?: string;
  pricePerTask: number;
  owner: string;
};

async function fetchAgentMeta(
  client: ReturnType<typeof createPublicClient>,
  tokenId: bigint
): Promise<AgentMeta | null> {
  try {
    const [uriRaw, ownerRaw] = await Promise.all([
      client.readContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "tokenURI", args: [tokenId] }),
      client.readContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "ownerOf", args: [tokenId] }),
    ]);
    const uri = uriRaw as string;
    const owner = ownerRaw as string;

    let meta: Record<string, unknown> = {};

    if (uri.startsWith("data:application/json;base64,")) {
      try { meta = JSON.parse(atob(uri.replace("data:application/json;base64,", ""))); } catch { /* skip */ }
    } else if (uri.startsWith("http") || uri.startsWith("ipfs")) {
      const url = uri.startsWith("ipfs://") ? uri.replace("ipfs://", "https://ipfs.io/ipfs/") : uri;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) meta = await res.json();
      } catch { /* skip */ }
    }

    if (!meta || typeof meta !== "object") return null;

    // Parse capabilities from various possible fields
    const caps: string[] = [];
    const rawCaps = (meta.capabilities ?? meta.skills ?? meta.tags ?? []) as unknown[];
    if (Array.isArray(rawCaps)) {
      for (const c of rawCaps) {
        if (typeof c === "string" && c.trim()) caps.push(c.trim());
      }
    }

    // Also infer from description if no explicit caps
    const desc = String(meta.description ?? "");
    const x402 = String(meta.x402_endpoint ?? meta.x402Endpoint ?? meta.endpoint ?? "");
    const price = Number(meta.price ?? meta.pricePerTask ?? meta.price_per_task ?? 0);

    return {
      id: Number(tokenId),
      name: String(meta.name ?? `Agent #${tokenId}`),
      description: desc,
      image: meta.image ? String(meta.image) : undefined,
      capabilities: caps,
      x402Endpoint: x402 || undefined,
      pricePerTask: price,
      owner,
    };
  } catch {
    return null;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!JOB_ESCROW_ADDRESS) {
    return NextResponse.json({ error: "NEXT_PUBLIC_JOB_ESCROW_ADDRESS not configured" }, { status: 500 });
  }

  try {
    const rpcUrl = getRpcUrl();
    const client = createPublicClient({ chain: ARC_MAINNET, transport: http(rpcUrl) });
    const { searchParams } = new URL(req.url);
    const singleJobId = searchParams.get("jobId");

    // ── 1. Fetch jobs ──────────────────────────────────────────────────────────
    const countRaw = await client.readContract({
      address: JOB_ESCROW_ADDRESS, abi: JOB_ESCROW_ABI, functionName: "jobCount",
    }) as bigint;
    const count = Number(countRaw);

    const jobIds = singleJobId !== null
      ? [Number(singleJobId)]
      : Array.from({ length: count }, (_, i) => i);

    const jobResults = await Promise.all(
      jobIds.map((id) =>
        client.readContract({
          address: JOB_ESCROW_ADDRESS, abi: JOB_ESCROW_ABI,
          functionName: "getJob", args: [BigInt(id)],
        }).catch(() => null)
      )
    );

    const openJobs = jobResults
      .filter((j): j is NonNullable<typeof j> => j !== null)
      .map((j) => {
        const raw = j as {
          id: bigint; poster: string; description: string; budget: bigint;
          status: number; acceptedBidder: string; deliverable: string;
          createdAt: bigint; acceptedAt: bigint;
        };
        return {
          id: Number(raw.id),
          description: raw.description,
          budget: fromUsdcUnits(raw.budget),
          status: raw.status,
          poster: raw.poster,
          createdAt: Number(raw.createdAt),
        };
      })
      .filter((j) => j.status === 0); // Open only

    if (openJobs.length === 0) {
      return NextResponse.json({ jobs: [], totalAgents: 0 });
    }

    // ── 2. Enumerate agents from Identity Registry ─────────────────────────────
    // Token IDs in this registry are non-sequential (e.g. 96295).
    // We use tokenByIndex(0..totalSupply-1) to get the real token IDs.
    let totalSupply = 0;
    try {
      const supplyRaw = await client.readContract({
        address: IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "totalSupply",
      }) as bigint;
      totalSupply = Number(supplyRaw);
    } catch {
      totalSupply = 0;
    }

    // Fetch token IDs via tokenByIndex — the ONLY reliable way since IDs are non-sequential
    let tokenIds: bigint[] = [];
    if (totalSupply > 0) {
      const SCAN_LIMIT = Math.min(totalSupply, 500); // cap at 500 for perf
      const indexResults = await Promise.allSettled(
        Array.from({ length: SCAN_LIMIT }, (_, i) =>
          client.readContract({
            address: IDENTITY_REGISTRY, abi: IDENTITY_ABI,
            functionName: "tokenByIndex", args: [BigInt(i)],
          })
        )
      );
      tokenIds = indexResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => BigInt((r as PromiseFulfilledResult<unknown>).value as string | number | bigint));
    }

    if (tokenIds.length === 0) {
      return NextResponse.json({ jobs: openJobs.map((j) => ({ ...j, matchedAgents: [] })), totalAgents: 0 });
    }

    // Fetch metadata in parallel with concurrency limit
    const BATCH = 10;
    const agents: AgentMeta[] = [];
    for (let i = 0; i < tokenIds.length; i += BATCH) {
      const batch = tokenIds.slice(i, i + BATCH);
      const results = await Promise.allSettled(batch.map((id) => fetchAgentMeta(client, id)));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) agents.push(r.value);
      }
    }

    // ── 3. Match agents to each job ────────────────────────────────────────────
    const jobs = openJobs.map((job) => ({
      ...job,
      matchedAgents: rankAgentsForJob(agents, job.description),
    }));

    return NextResponse.json({ jobs, totalAgents: agents.length });
  } catch (err) {
    console.error("[discover-jobs]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
