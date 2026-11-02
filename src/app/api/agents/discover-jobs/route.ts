/**
 * GET /api/agents/discover-jobs?jobId=<id>
 *
 * Reads open jobs from JobEscrow + registered agents from ZenthraCurator,
 * runs capability matching, and returns matched agents per job.
 *
 * Optional ?jobId=N — return matches for a single job only.
 * Without jobId — return matches for ALL open jobs.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { rankAgentsForJob } from "@/lib/jobMatching";

// ─── Chain configs ─────────────────────────────────────────────────────────────
const ARC_MAINNET = {
  id: 5042,
  name: "Arc Mainnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } }, // arc-studio-allow-onchain-literal
} as const;

// ZenthraCurator is on Arc Testnet (5042002)
const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } }, // arc-studio-allow-onchain-literal
} as const;

// ─── Addresses from env ────────────────────────────────────────────────────────
const JOB_ESCROW_ADDRESS = (
  process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? ""
) as `0x${string}`;

const CURATOR_ADDRESS = (
  process.env.NEXT_PUBLIC_ZENTHRA_CURATOR_ADDRESS ?? ""
) as `0x${string}`;

const IDENTITY_REGISTRY = (
  process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS ?? ""
) as `0x${string}`;

// ─── RPC URL via proxy or fallback ────────────────────────────────────────────
function getRpcUrl(chainKey: "Arc_Mainnet" | "Arc_Testnet", fallback: string): string {
  const proxyBase = process.env.RPC_PROXY_BASE_URL;
  const proxyToken = process.env.RPC_PROXY_TOKEN;
  const proxyChains = (process.env.RPC_PROXY_CHAINS ?? "").split(",");
  if (proxyBase && proxyToken && proxyChains.includes(chainKey)) {
    return `${proxyBase}/api/rpc/${chainKey}?_rpc_token=${proxyToken}`;
  }
  return fallback;
}

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────
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

const CURATOR_ABI = [
  { name: "getAllListedAgents", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256[]" }] },
  {
    name: "getAgents", type: "function", stateMutability: "view",
    inputs: [{ name: "agentIds", type: "uint256[]" }],
    outputs: [{
      name: "results", type: "tuple[]", components: [
        { name: "agentId", type: "uint256" }, { name: "owner", type: "address" },
        { name: "x402Endpoint", type: "string" }, { name: "capabilities", type: "string[]" },
        { name: "isFeaturedByOwner", type: "bool" }, { name: "featuredUntil", type: "uint256" },
        { name: "bondAmount", type: "uint256" }, { name: "listedAt", type: "uint256" },
      ],
    }],
  },
] as const;

const IDENTITY_ABI = [
  {
    name: "tokenURI", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fromUsdcUnits(raw: bigint): number {
  return parseFloat(formatUnits(raw, 6));
}

async function fetchAgentMeta(
  client: ReturnType<typeof createPublicClient>,
  agentId: bigint
): Promise<{ name: string; description: string; image?: string; pricePerTask: number }> {
  try {
    const uri = await client.readContract({
      address: IDENTITY_REGISTRY, abi: IDENTITY_ABI,
      functionName: "tokenURI", args: [agentId],
    }) as string;

    if (uri.startsWith("data:application/json;base64,")) {
      const json = JSON.parse(atob(uri.replace("data:application/json;base64,", "")));
      return {
        name: json.name ?? `Agent #${agentId}`,
        description: json.description ?? "",
        image: json.image,
        pricePerTask: Number(json.price ?? json.pricePerTask ?? 0),
      };
    }
    if (uri.startsWith("http") || uri.startsWith("ipfs")) {
      const url = uri.startsWith("ipfs://")
        ? uri.replace("ipfs://", "https://ipfs.io/ipfs/")
        : uri;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        return {
          name: json.name ?? `Agent #${agentId}`,
          description: json.description ?? "",
          image: json.image,
          pricePerTask: Number(json.price ?? json.pricePerTask ?? 0),
        };
      }
    }
  } catch {
    // fallback below
  }
  return { name: `Agent #${agentId}`, description: "", pricePerTask: 0 };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!JOB_ESCROW_ADDRESS) {
    return NextResponse.json({ error: "NEXT_PUBLIC_JOB_ESCROW_ADDRESS not configured" }, { status: 500 });
  }

  try {
    const mainnetRpc = getRpcUrl("Arc_Mainnet", ARC_MAINNET.rpcUrls.default.http[0]);
    const testnetRpc = getRpcUrl("Arc_Testnet", ARC_TESTNET.rpcUrls.default.http[0]);
    // JobEscrow lives on Arc Mainnet; ZenthraCurator lives on Arc Testnet
    const client = createPublicClient({ chain: ARC_MAINNET, transport: http(mainnetRpc) });
    const curatorClient = createPublicClient({ chain: ARC_TESTNET, transport: http(testnetRpc) });
    const { searchParams } = new URL(req.url);
    const singleJobId = searchParams.get("jobId");

    // ── 1. Fetch jobs from JobEscrow ───────────────────────────────────────
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

    // ── 2. Fetch curator agents ────────────────────────────────────────────
    if (!CURATOR_ADDRESS) {
      return NextResponse.json({ jobs: openJobs.map((j) => ({ ...j, matchedAgents: [] })), totalAgents: 0 });
    }

    const agentIdsRaw = await curatorClient.readContract({
      address: CURATOR_ADDRESS, abi: CURATOR_ABI, functionName: "getAllListedAgents",
    }) as bigint[];

    if (!agentIdsRaw || agentIdsRaw.length === 0) {
      return NextResponse.json({ jobs: openJobs.map((j) => ({ ...j, matchedAgents: [] })), totalAgents: 0 });
    }

    const listingsRaw = await curatorClient.readContract({
      address: CURATOR_ADDRESS, abi: CURATOR_ABI,
      functionName: "getAgents", args: [agentIdsRaw],
    }) as unknown as Array<{
      agentId: bigint; owner: string; x402Endpoint: string;
      capabilities: string[]; bondAmount: bigint; listedAt: bigint;
    }>;

    // Use testnet identity registry for metadata (same canonical address)
    const metaResults = await Promise.all(
      listingsRaw.map((l) => fetchAgentMeta(curatorClient, l.agentId))
    );

    const agents = listingsRaw.map((l, i) => ({
      id: Number(l.agentId),
      name: metaResults[i].name,
      description: metaResults[i].description,
      image: metaResults[i].image,
      capabilities: l.capabilities,
      x402Endpoint: l.x402Endpoint || undefined,
      pricePerTask: metaResults[i].pricePerTask,
      owner: l.owner,
    }));

    // ── 3. Match agents to each job ────────────────────────────────────────
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
