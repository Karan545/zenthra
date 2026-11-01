/**
 * POST /api/agents/auto-bid
 *
 * Body: { jobId: number, agentId: number, x402Endpoint: string, pricePerTask: number }
 *
 * Flow:
 * 1. Call the agent's x402Endpoint with job details → get proposal text
 * 2. Return the proposal + encoded calldata for the bid() transaction
 *    so the agent owner's browser wallet can sign and submit it.
 *
 * This is a relay helper — no server-side key required.
 * The tx is signed by the user's connected wallet in the browser.
 */

import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, parseUnits } from "viem";

const JOB_ESCROW_ADDRESS = (
  process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? ""
) as `0x${string}`;

const BID_ABI = [
  {
    name: "bid", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "message", type: "string" },
    ],
    outputs: [],
  },
] as const;

interface AutoBidBody {
  jobId: number;
  agentId: number;
  x402Endpoint: string;
  pricePerTask: number;
  jobDescription: string;
  jobBudget: number;
}

/** Call the agent's x402 endpoint with job context, get back a proposal. */
async function fetchAgentProposal(
  x402Endpoint: string,
  job: { id: number; description: string; budget: number },
  agentId: number,
  pricePerTask: number
): Promise<string> {
  try {
    const res = await fetch(x402Endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "job_bid",
        job: {
          id: job.id,
          description: job.description,
          budget: job.budget,
        },
        agentId,
        bidAmount: pricePerTask,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json() as { proposal?: string; message?: string; bid?: string };
      return data.proposal ?? data.message ?? data.bid ?? `I can complete this task for ${pricePerTask} USDC.`;
    }
  } catch {
    // Fallback proposal if x402 endpoint is unreachable
  }

  return `Agent #${agentId} is available to complete this task for ${pricePerTask} USDC. Ready to start immediately.`;
}

export async function POST(req: NextRequest) {
  if (!JOB_ESCROW_ADDRESS) {
    return NextResponse.json({ error: "JOB_ESCROW_ADDRESS not configured" }, { status: 500 });
  }

  let body: AutoBidBody;
  try {
    body = await req.json() as AutoBidBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobId, agentId, x402Endpoint, pricePerTask, jobDescription, jobBudget } = body;

  if (typeof jobId !== "number" || typeof pricePerTask !== "number") {
    return NextResponse.json({ error: "jobId and pricePerTask are required" }, { status: 400 });
  }

  // ── 1. Get proposal from agent's x402 endpoint ──────────────────────────
  const proposal = await fetchAgentProposal(
    x402Endpoint,
    { id: jobId, description: jobDescription ?? "", budget: jobBudget ?? 0 },
    agentId,
    pricePerTask
  );

  // ── 2. Encode the bid() calldata for browser wallet to sign ─────────────
  const bidAmountRaw = parseUnits(String(pricePerTask), 6); // 6 decimals USDC

  const calldata = encodeFunctionData({
    abi: BID_ABI,
    functionName: "bid",
    args: [BigInt(jobId), bidAmountRaw, proposal],
  });

  return NextResponse.json({
    proposal,
    bidAmount: pricePerTask,
    // The browser wallet sends this tx directly to JobEscrow
    tx: {
      to: JOB_ESCROW_ADDRESS,
      data: calldata,
      value: "0x0",
    },
  });
}
