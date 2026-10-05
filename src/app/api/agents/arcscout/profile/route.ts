import { NextRequest, NextResponse } from "next/server";
import type { Hash } from "viem";
import { learnArcScoutFromTx, loadArcScoutProfile } from "@/lib/arcscoutProfileChain";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  const loaded = await loadArcScoutProfile({ fresh });
  return NextResponse.json(loaded);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const txHash =
    body && typeof body === "object" && !Array.isArray(body)
      ? String((body as { txHash?: unknown }).txHash ?? "")
      : "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Missing the Arc transaction." }, { status: 400 });
  }

  const loaded = await learnArcScoutFromTx(txHash as Hash);
  if (!loaded) {
    return NextResponse.json(
      { error: "That transaction did not save ArcScout for the fee wallet." },
      { status: 400 }
    );
  }
  return NextResponse.json(loaded);
}
