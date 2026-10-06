import { NextResponse } from "next/server";
import { probePrimary } from "@/lib/gatewayReach";

export const runtime = "nodejs";
export const preferredRegion = "hkg1";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await probePrimary());
}
