import { NextResponse } from "next/server";
import type { Address } from "viem";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import { PUBLIC_AGENT_IDS } from "@/data/publicAgentIds";
import { getArcPublicClient } from "@/lib/arcClient";
import { fetchAgentMetadata, normalizeAgentMetadata } from "@/lib/agentMetadata";
import { workTargetFromRegistration } from "@/lib/agentWork";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublicAgent = {
  id: number;
  name: string;
  description: string;
  image?: string;
  capabilities: string[];
  categories: string[];
  pricePerTask: number;
  owner: string;
  hasWork: boolean;
};

export async function GET() {
  const client = getArcPublicClient();
  const agents = (
    await Promise.all(PUBLIC_AGENT_IDS.map((id) => readPublicAgent(client, id)))
  ).filter((agent): agent is PublicAgent => agent != null);

  return NextResponse.json({ agents });
}

async function readPublicAgent(
  client: ReturnType<typeof getArcPublicClient>,
  id: number
): Promise<PublicAgent | null> {
  try {
    const owner = (await client.readContract({
      address: identityRegistryAddress,
      abi: identityRegistryAbi,
      functionName: "ownerOf",
      args: [BigInt(id)],
    })) as Address;
    const tokenUri = String(
      await client.readContract({
        address: identityRegistryAddress,
        abi: identityRegistryAbi,
        functionName: "tokenURI",
        args: [BigInt(id)],
      })
    );
    const raw = await fetchAgentMetadata(tokenUri);
    const display = normalizeAgentMetadata(raw);
    const work = workTargetFromRegistration(raw);
    const price = Number(
      raw && typeof raw === "object" && "pricing" in raw
        ? (raw as { pricing?: { pricePerTask?: unknown } }).pricing?.pricePerTask
        : work?.pricePerTask
    );

    return {
      id,
      name: display.name || `Agent #${id}`,
      description: display.description || "Listed on Zenthra.",
      image: display.image,
      capabilities: display.capabilities,
      categories: display.categories,
      pricePerTask: Number.isFinite(price) && price >= 0 ? price : 0,
      owner,
      hasWork: work != null,
    };
  } catch {
    return null;
  }
}
