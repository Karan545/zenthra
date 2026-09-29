import https from "node:https";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// agentrouter.org answers the API from Mumbai. US regions get the site HTML.
export const preferredRegion = "bom1";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const COVALENT_API_KEY = process.env.COVALENT_API_KEY ?? "";
const AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY ?? "";
// gpt-6-astra and the Claude models on this key are out of budget.
// deepseek-v4-flash is the model AgentRouter still completes.
const AGENTROUTER_MODEL = process.env.AGENTROUTER_MODEL ?? "deepseek-v4-flash";

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
    const url = `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${COVALENT_API_KEY}&nft=false&no-nft-fetch=true&no-spam=true`;
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

interface UpstreamResult {
  status: number;
  text: string;
  setCookie: string[];
}

const WAF_COOKIE_NAMES = new Set([
  "acw_tc",
  "acw_sc__v2",
  "acw_sc__v3",
  "cdn_sec_tc",
]);

function httpsCall(options: {
  method: "GET" | "POST";
  path: string;
  headers: Record<string, string>;
  body?: string;
}): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = { ...options.headers };
    if (options.body != null) {
      headers["Content-Length"] = Buffer.byteLength(options.body);
    }

    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const req = https.request(
      {
        hostname: "agentrouter.org",
        path: options.path,
        method: options.method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let received = 0;
        res.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > 2_000_000) {
            fail(new Error("AgentRouter response too large"));
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          if (settled) return;
          settled = true;
          const raw = res.headers["set-cookie"];
          const setCookie = Array.isArray(raw) ? raw : raw ? [raw] : [];
          resolve({
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
            setCookie,
          });
        });
      }
    );
    req.on("error", (error) => fail(error));
    req.setTimeout(50_000, () => {
      req.destroy(new Error("AgentRouter request timed out"));
    });
    if (options.body != null) req.write(options.body);
    req.end();
  });
}

function wafCookie(setCookie: string[]): string {
  return setCookie
    .map((line) => line.split(";")[0]?.trim() ?? "")
    .filter((part) => {
      const eq = part.indexOf("=");
      if (eq < 1) return false;
      const name = part.slice(0, eq);
      const value = part.slice(eq + 1);
      return WAF_COOKIE_NAMES.has(name) && value.length > 0;
    })
    .join("; ");
}

function mergeCookies(current: string, fresh: string): string {
  const map = new Map<string, string>();
  for (const part of `${current}; ${fresh}`.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    map.set(trimmed.slice(0, eq), trimmed);
  }
  return [...map.values()].join("; ");
}

async function warmupAgentRouter(): Promise<string> {
  const page = await httpsCall({
    method: "GET",
    path: "/",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  return wafCookie(page.setCookie);
}

function completeAgentRouter(
  body: string,
  apiKey: string,
  cookie: string
): Promise<UpstreamResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${apiKey}`,
    "User-Agent": "opencode/1.18.25",
  };
  if (cookie) headers.Cookie = cookie;
  return httpsCall({
    method: "POST",
    path: "/v1/chat/completions",
    headers,
    body,
  });
}

function isHtml(text: string): boolean {
  return text.trimStart().startsWith("<");
}

function upstreamError(status: number, text: string): string {
  if (isHtml(text)) {
    return `AI gateway returned a web page instead of a report (HTTP ${status}).`;
  }
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const message =
      typeof parsed.error === "string"
        ? parsed.error
        : parsed.error?.message || parsed.message;
    if (message) return message;
  } catch {
    if (text && text.length < 300) return text;
  }
  return `AI gateway returned HTTP ${status}.`;
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

    const payload = JSON.stringify({
      model: AGENTROUTER_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are ArcScout, a professional on-chain wallet research agent for the Zenthra platform. You produce accurate, structured markdown research reports based on real blockchain data. Be concise, factual, and useful.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    // The edge serves the marketing site until it has seen a browser visit
    // and a current CLI user agent.
    let cookie = await warmupAgentRouter();
    let upstream = await completeAgentRouter(
      payload,
      AGENTROUTER_API_KEY,
      cookie
    );
    if (isHtml(upstream.text) || (upstream.status >= 300 && upstream.status < 400)) {
      cookie = mergeCookies(cookie, wafCookie(upstream.setCookie));
      if (!cookie) cookie = await warmupAgentRouter();
      upstream = await completeAgentRouter(
        payload,
        AGENTROUTER_API_KEY,
        cookie
      );
    }

    if (
      upstream.status < 200 ||
      upstream.status >= 300 ||
      isHtml(upstream.text)
    ) {
      const detail = upstreamError(upstream.status, upstream.text);
      console.error("AgentRouter error:", upstream.status, detail);
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const aiJson = JSON.parse(upstream.text) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };
    const message = aiJson?.choices?.[0]?.message;
    const report: string =
      (typeof message?.content === "string" && message.content.trim()) ||
      (typeof message?.reasoning_content === "string" &&
        message.reasoning_content.trim()) ||
      "No report generated.";

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
    const msg = e instanceof Error ? e.message : "Internal error. Please try again.";
    console.error("ArcScout error:", msg);
    const safe =
      msg.length < 200 && !msg.includes("<")
        ? msg
        : "Internal error. Please try again.";
    return NextResponse.json({ error: safe }, { status: 500 });
  }
}
