import { NextResponse } from "next/server";
import { probePrimary } from "@/lib/gatewayReach";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await probePrimary());
}
