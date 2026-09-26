import { NextRequest, NextResponse } from "next/server";

const COVALENT_API_KEY = process.env.COVALENT_API_KEY ?? "";
const AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY ?? "";
const AGENTROUTER_BASE = "https://co.agentrouter.org/v1";

// Chains to scan — Covalent chain names
const CHAINS = [
  { id: "eth-mainnet", label: "Ethereum" },
  { id: "base-mainnet", label: "Base" },
  { id: "arbitrum-mainnet", label: "Arbitrum" },
  { id: "matic-mainnet", label: "Polygon" },
  { id: "optimism-mainnet", label: "Optimism" },
];

interface TokenBalance {
  contract_name: string;
  contract_ticker_symbol: string;
  balance: string;
  contract_decimals: number;
  quote: number; // USD value
  quote_rate: number;
  contract_address: string;
  type: string;
  nft_data?: unknown[];
}

interface CovalentResponse {
  data?: {
    items?: TokenBalance[];
    address?: string;
    chain_name?: string;
  };
  error?: boolean;
  error_message?: string;
}

interface ChainResult {
  chain: string;
  label: string;
  totalUsd: number;
  tokens: { symbol: string; balance: string; usd: number; type: string }[];
  error?: string;
}

async function fetchChainBalances(
  address: string,
  chainId: string,
  label: string
): Promise<ChainResult> {
  try {
    const url = `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${COVALENT_API_KEY}&nft=false&no-nft-fetch=true`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      return { chain: chainId, label, totalUsd: 0, tokens: [], error: `HTTP ${res.status}` };
    }
    const json: CovalentResponse = await res.json();
    if (json.error || !json.data?.items) {
      return { chain: chainId, label, totalUsd: 0, tokens: [], error: json.error_message };
    }

    const tokens = json.data.items
      .filter((t) => t.quote > 0.01) // skip dust
      .map((t) => ({
        symbol: t.contract_ticker_symbol || t.contract_name || "UNKNOWN",
        balance: (
          Number(t.balance) / Math.pow(10, t.contract_decimals)
        ).toLocaleString("en-US", { maximumFractionDigits: 4 }),
        usd: Math.round(t.quote * 100) / 100,
        type: t.type,
      }))
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 10); // top 10 per chain

    const totalUsd = tokens.reduce((sum, t) => sum + t.usd, 0);
    return { chain: chainId, label, totalUsd, tokens };
  } catch (e) {
    return {
      chain: chainId,
      label,
      totalUsd: 0,
      tokens: [],
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

function buildPrompt(address: string, results: ChainResult[]): string {
  const totalPortfolio = results.reduce((s, r) => s + r.totalUsd, 0);
  const activeChains = results.filter((r) => r.tokens.length > 0);

  const chainSummaries = results
    .map((r) => {
      if (r.error && r.tokens.length === 0) {
        return `### ${r.label}\n_Could not fetch data: ${r.error}_`;
      }
      if (r.tokens.length === 0) {
        return `### ${r.label}\n_No holdings above $0.01_`;
      }
      const lines = r.tokens.map(
        (t) => `- **${t.symbol}**: ${t.balance} (~$${t.usd.toFixed(2)})`
      );
      return `### ${r.label} (~$${r.totalUsd.toFixed(2)} total)\n${lines.join("\n")}`;
    })
    .join("\n\n");

  return `You are ArcScout, a professional on-chain wallet research agent. Analyze this wallet and produce a clear, useful research report.

**Wallet address:** \`${address}\`
**Active chains:** ${activeChains.length} of ${results.length} scanned
**Total portfolio estimate:** ~$${totalPortfolio.toFixed(2)} USD

## Raw on-chain data
${chainSummaries}

## Instructions
Write a structured research report with these sections:
1. **Portfolio Overview** — total value, chain distribution (which chain holds most value), asset mix (stablecoins vs volatile vs NFTs)
2. **Notable Holdings** — call out any significant or interesting positions
3. **Chain Activity Pattern** — what does the distribution suggest about how this wallet is used?
4. **Risk Flags** — any concentration risk, illiquid tokens, suspicious patterns?
5. **Summary** — 2-3 sentence plain English summary a non-technical person can understand

Keep it factual, concise, and useful. Do not make up data. If a chain had no holdings, note it briefly. Use markdown formatting.`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse + validate input
    const body = await req.json().catch(() => ({}));
    const address: string = (body.address ?? "").trim().toLowerCase();

    if (!address || !/^0x[0-9a-f]{40}$/i.test(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address. Must be 0x followed by 40 hex characters." },
        { status: 400 }
      );
    }

    if (!COVALENT_API_KEY || !AGENTROUTER_API_KEY) {
      return NextResponse.json(
        { error: "Agent not configured — missing API keys." },
        { status: 503 }
      );
    }

    // 2. Fetch all chains in parallel
    const results = await Promise.all(
      CHAINS.map((c) => fetchChainBalances(address, c.id, c.label))
    );

    // 3. Build prompt + call AgentRouter
    const prompt = buildPrompt(address, results);

    const aiRes = await fetch(`${AGENTROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENTROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are ArcScout, a professional on-chain wallet research agent for the Zenthra platform. You produce accurate, structured markdown research reports based on real blockchain data. Be concise, factual, and useful.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "unknown");
      console.error("AgentRouter error:", aiRes.status, errText);
      return NextResponse.json(
        { error: `AI service error: ${aiRes.status}` },
        { status: 502 }
      );
    }

    const aiJson = await aiRes.json();
    const report: string =
      aiJson?.choices?.[0]?.message?.content ?? "No report generated.";

    // 4. Return structured response
    return NextResponse.json({
      address,
      chainsScanned: CHAINS.length,
      activeChains: results.filter((r) => r.tokens.length > 0).length,
      totalPortfolioUsd: Math.round(
        results.reduce((s, r) => s + r.totalUsd, 0) * 100
      ) / 100,
      chains: results,
      report,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("ArcScout error:", e);
    return NextResponse.json(
      { error: "Internal error. Please try again." },
      { status: 500 }
    );
  }
}
