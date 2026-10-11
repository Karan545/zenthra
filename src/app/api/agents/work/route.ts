import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address, type Hash } from "viem";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import { getArcPublicClient } from "@/lib/arcClient";
import { fetchAgentMetadata } from "@/lib/agentMetadata";
import {
  isPublicHttpsUrl,
  receiptPaysOwner,
  resolveWorkTarget,
  type AgentWorkTarget,
} from "@/lib/agentWork";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PAYMENT_MAX_AGE_SEC = 30 * 60;

type WorkBody = {
  agentId?: number;
  txHash?: string;
  address?: string;
  message?: string;
};

type LoadedWork =
  | { owner: Address; target: AgentWorkTarget }
  | { error: string; status: number };

async function loadRegistration(url: string): Promise<unknown> {
  if (!isPublicHttpsUrl(url)) {
    throw new Error("blocked");
  }
  const response = await fetch(url, {
    method: "GET",
    redirect: "error",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("status");
  const text = await response.text();
  if (text.length > 100_000) throw new Error("large");
  return JSON.parse(text) as unknown;
}

async function loadAgentWork(agentId: number): Promise<LoadedWork> {
  if (!Number.isSafeInteger(agentId) || agentId < 0) {
    return { error: "Unknown agent.", status: 400 };
  }

  const client = getArcPublicClient();
  let owner: Address;
  let tokenUri = "";
  try {
    owner = (await client.readContract({
      address: identityRegistryAddress,
      abi: identityRegistryAbi,
      functionName: "ownerOf",
      args: [BigInt(agentId)],
    })) as Address;
    tokenUri = String(
      await client.readContract({
        address: identityRegistryAddress,
        abi: identityRegistryAbi,
        functionName: "tokenURI",
        args: [BigInt(agentId)],
      })
    );
  } catch {
    return {
      error: "This agent identity could not be read on Arc.",
      status: 404,
    };
  }

  const target = await resolveWorkTarget(
    await fetchAgentMetadata(tokenUri),
    loadRegistration
  );
  if (!target || !isPublicHttpsUrl(target.endpoint)) {
    return { error: "This agent has no public work endpoint.", status: 400 };
  }
  return { owner, target };
}

export async function GET(request: NextRequest) {
  const agentId = Number(new URL(request.url).searchParams.get("agentId"));
  const loaded = await loadAgentWork(agentId);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }
  return NextResponse.json({
    owner: loaded.owner,
    endpoint: loaded.target.endpoint,
    pricePerTask: loaded.target.pricePerTask,
    scanAddress: loaded.target.scanAddress,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as WorkBody | null;
  const loaded = await loadAgentWork(Number(body?.agentId));
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const { owner, target } = loaded;
  const txHash = typeof body?.txHash === "string" ? body.txHash.trim() : "";
  if (target.pricePerTask > 0) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: "Pay the owner in USDC before requesting work." },
        { status: 402 }
      );
    }
    try {
      const client = getArcPublicClient();
      const receipt = await client.getTransactionReceipt({ hash: txHash as Hash });
      if (!receiptPaysOwner(receipt, owner, target.pricePerTask)) {
        return NextResponse.json(
          { error: "That transaction does not pay this agent's owner." },
          { status: 402 }
        );
      }
      const block = await client.getBlock({ blockNumber: receipt.blockNumber });
      const age = Math.floor(Date.now() / 1000) - Number(block.timestamp);
      if (!Number.isFinite(age) || age > PAYMENT_MAX_AGE_SEC) {
        return NextResponse.json(
          { error: "This payment is too old. Send a new USDC payment." },
          { status: 402 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "The payment transaction is not on Arc yet." },
        { status: 402 }
      );
    }
  }

  const payload = workPayload(target.scanAddress, body);
  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  try {
    const response = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-payment": txHash || "prepaid",
      },
      body: JSON.stringify(payload),
      redirect: "error",
      signal: AbortSignal.timeout(55_000),
    });
    const text = await response.text();
    const parsed = parseJson(text);
    if (!response.ok) {
      return NextResponse.json(
        { error: agentErrorMessage(parsed) },
        { status: response.status }
      );
    }
    return NextResponse.json({
      owner,
      endpoint: target.endpoint,
      result: workResult(parsed, text),
    });
  } catch {
    return NextResponse.json(
      { error: "The agent did not answer. Try the request again." },
      { status: 502 }
    );
  }
}

function workPayload(
  scanAddress: boolean,
  body: WorkBody | null
): { address: string } | { message: string } | { error: string } {
  if (scanAddress) {
    const address = body?.address?.trim().toLowerCase() ?? "";
    if (!isAddress(address)) {
      return { error: "Enter the wallet address you want scanned." };
    }
    return { address };
  }
  const message = body?.message?.trim() ?? "";
  if (message.length < 2 || message.length > 2000) {
    return { error: "Describe the work in a short message." };
  }
  return { message };
}

function parseJson(text: string): { error?: unknown; report?: unknown; text?: unknown } | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object") return null;
    return value as { error?: unknown; report?: unknown; text?: unknown };
  } catch {
    return null;
  }
}

function agentErrorMessage(parsed: { error?: unknown } | null): string {
  const message = typeof parsed?.error === "string" ? parsed.error.trim() : "";
  if (!message || message.length > 240 || message.includes("<")) {
    return "The agent did not accept this request.";
  }
  return message;
}

function workResult(
  parsed: { report?: unknown; text?: unknown } | null,
  text: string
): { report?: string; text?: string } {
  if (typeof parsed?.report === "string" && parsed.report.trim()) {
    return { report: parsed.report.slice(0, 12_000) };
  }
  if (typeof parsed?.text === "string" && parsed.text.trim()) {
    return { text: parsed.text.slice(0, 12_000) };
  }
  const trimmed = text.trim();
  if (trimmed && !trimmed.startsWith("<") && !trimmed.startsWith("{")) {
    return { text: trimmed.slice(0, 4_000) };
  }
  return {};
}
