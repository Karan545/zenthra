import https from "node:https";
import { NextRequest, NextResponse } from "next/server";
import { arcScoutFeeUnits } from "@/lib/arcscoutProfile";
import { loadArcScoutProfile } from "@/lib/arcscoutProfileChain";
import {
  releaseX402Payment,
  verifyX402Payment,
  x402Requirements,
} from "@/lib/verifyX402Payment";

export const runtime = "nodejs";
// Mumbai receives the gateway website instead of the API, so this route
// runs in Washington unless a closer region is shown to receive JSON.
export const preferredRegion = "iad1";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const COVALENT_API_KEY = process.env.COVALENT_API_KEY ?? "";
const AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY ?? "";
// The alternate official host rejects this project's key, so calls stay here.
const HOST = "agentrouter.org";

// Live catalog: gpt-6-astra (OpenAI wire), then the two Claude models.
// gpt-5.6-sol and glm-5.3 are not in the current pricing list.
// deepseek-v4-flash stays a last resort and is never the only model.
const PRIMARY_MODELS = ["gpt-6-astra", "claude-opus-5", "claude-opus-4-8"];
const LAST_RESORT_MODEL = "deepseek-v4-flash";
const ANTHROPIC_MODELS = new Set([
  "claude-opus-5",
  "claude-opus-4-8",
  "deepseek-v4-flash",
]);

const SYSTEM_PROMPT =
  "You are ArcScout, a professional on-chain wallet research agent for the Zenthra platform. You produce accurate, structured markdown research reports based on real blockchain data. Be concise, factual, and useful.";

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
  quote: number;
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
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return { chain: chainId, label, totalUsd: 0, tokens: [], error: `HTTP ${res.status}` };
    }
    const json: CovalentResponse = await res.json();
    if (json.error || !json.data?.items) {
      return { chain: chainId, label, totalUsd: 0, tokens: [], error: json.error_message };
    }

    const tokens = json.data.items
      .filter((t) => t.quote > 0.01)
      .map((t) => ({
        symbol: t.contract_ticker_symbol || t.contract_name || "UNKNOWN",
        balance: (
          Number(t.balance) / Math.pow(10, t.contract_decimals)
        ).toLocaleString("en-US", { maximumFractionDigits: 4 }),
        usd: Math.round(t.quote * 100) / 100,
        type: t.type,
      }))
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 10);

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

const STABLE_SYMBOLS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "USDE",
  "USDS",
  "FRAX",
  "LUSD",
  "GHO",
  "CRVUSD",
  "PYUSD",
  "TUSD",
  "USDP",
  "GUSD",
  "USD0",
  "USDBC",
  "SUSD",
  "MIM",
  "USDD",
  "USDC.E",
  "USDT.E",
]);

function usd(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildDataReport(address: string, results: ChainResult[]): string {
  const total = results.reduce((sum, chain) => sum + chain.totalUsd, 0);
  const active = results.filter((chain) => chain.tokens.length > 0);
  const failed = results.filter((chain) => chain.error && chain.tokens.length === 0);
  const holdings = results
    .flatMap((chain) => chain.tokens.map((token) => ({ ...token, chain: chain.label })))
    .sort((a, b) => b.usd - a.usd);
  const stableUsd = holdings
    .filter((token) => STABLE_SYMBOLS.has(token.symbol.toUpperCase()))
    .reduce((sum, token) => sum + token.usd, 0);
  const otherUsd = Math.max(0, Math.round((total - stableUsd) * 100) / 100);
  const topChain = [...results].sort((a, b) => b.totalUsd - a.totalUsd)[0];
  const topShare = total > 0 && topChain ? (topChain.totalUsd / total) * 100 : 0;
  const topToken = holdings[0];
  const topTokenShare = total > 0 && topToken ? (topToken.usd / total) * 100 : 0;

  const chainLines = results.map((chain) => {
    if (chain.error && chain.tokens.length === 0) {
      return `- **${chain.label}**: scan failed (${chain.error})`;
    }
    if (chain.tokens.length === 0) {
      return `- **${chain.label}**: no holdings above $0.01`;
    }
    const share = total > 0 ? ` (${((chain.totalUsd / total) * 100).toFixed(0)}%)` : "";
    return `- **${chain.label}**: $${usd(chain.totalUsd)}${share}`;
  });

  const notable = holdings
    .slice(0, 5)
    .map((token) => `- **${token.symbol}** on ${token.chain}: ${token.balance} (~$${usd(token.usd)})`);

  const risks = [
    failed.length
      ? `- ${failed.map((chain) => chain.label).join(", ")} did not return balances, so this report is incomplete.`
      : "",
    total === 0
      ? "- No priced holdings above $0.01 were found on the scanned chains."
      : topToken && topTokenShare >= 50
        ? `- **${topToken.symbol}** is ${topTokenShare.toFixed(0)}% of the priced total, which is a concentration risk.`
        : "",
    "- This scan covers token balances. It leaves out transaction history and token approvals.",
  ].filter(Boolean);

  let pattern =
    "Nothing priced showed up on these five chains. The address may be unused here, or the value may sit on a chain this scan does not cover.";
  if (active.length === 1) {
    pattern = `Priced value shows up on ${active[0].label}. That fits a wallet that mainly operates on one network.`;
  } else if (active.length > 1 && topShare >= 80 && topChain) {
    const others = active.length - 1;
    pattern = `${topShare.toFixed(0)}% of the priced value is on ${topChain.label}, with smaller balances on ${others} other chain${others === 1 ? "" : "s"}.`;
  } else if (active.length > 1) {
    pattern = `Value is spread across ${active.length} chains. That fits a wallet that moves assets between networks.`;
  }

  const where =
    topChain && topChain.totalUsd > 0 ? ` Most of that value is on ${topChain.label}.` : "";
  const mix =
    total === 0
      ? ""
      : stableUsd >= otherUsd
        ? " Recognized stablecoins make up the larger share."
        : " Other priced assets make up the larger share.";
  const summary =
    total === 0
      ? `No holdings above $0.01 were priced on Ethereum, Base, Arbitrum, Polygon, or Optimism for \`${address}\`.${failed.length ? " Some chain scans failed, so a balance could have been missed." : ""}`
      : `This wallet shows about $${usd(total)} across ${active.length} of ${results.length} scanned chains.${where}${mix}`;

  return [
    "## Portfolio Overview",
    `Priced holdings total **$${usd(total)}** across **${active.length} of ${results.length}** scanned chains.`,
    "",
    chainLines.join("\n"),
    "",
    total > 0
      ? `About **$${usd(stableUsd)}** is in recognized stablecoins and **$${usd(otherUsd)}** is in other priced assets.`
      : "There is no stablecoin mix to report.",
    "",
    "## Notable Holdings",
    notable.length ? notable.join("\n") : "_No token above $0.01._",
    "",
    "## Chain Activity Pattern",
    pattern,
    "",
    "## Risk Flags",
    risks.join("\n"),
    "",
    "## Summary",
    summary,
  ].join("\n");
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
}

type Wire = "chat" | "messages";

type Attempt =
  | { kind: "report"; report: string; model: string }
  | { kind: "auth"; error: string }
  | { kind: "model"; error: string }
  | { kind: "timeout"; error: string }
  | { kind: "html"; error: string };

function modelsToTry(): { primary: string[]; lastResort: string } {
  const preferred = (process.env.AGENTROUTER_MODEL ?? "").trim();
  if (!preferred || preferred === LAST_RESORT_MODEL) {
    return { primary: [...PRIMARY_MODELS], lastResort: LAST_RESORT_MODEL };
  }
  return {
    primary: [preferred, ...PRIMARY_MODELS.filter((model) => model !== preferred)],
    lastResort: LAST_RESORT_MODEL,
  };
}

function isHtml(text: string): boolean {
  return text.replace(/^\uFEFF/, "").trimStart().startsWith("<");
}

function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();
  return name.includes("timeout") || message.includes("timed out") || message.includes("timeout");
}

function upstreamError(status: number, text: string): string {
  if (isHtml(text)) {
    return `AI gateway returned its website instead of a report (HTTP ${status}).`;
  }
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
      msg?: string;
    };
    const message =
      typeof parsed.error === "string"
        ? parsed.error
        : parsed.error?.message || parsed.message || parsed.msg;
    if (message) return message.slice(0, 300);
  } catch {
    if (text && text.length < 300 && !text.includes("<")) return text;
  }
  return `AI gateway returned HTTP ${status}.`;
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
      return "";
    })
    .join("")
    .trim();
}

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function reportFromJson(json: {
  choices?: {
    message?: { content?: unknown; reasoning_content?: unknown };
    delta?: { content?: unknown };
  }[];
  content?: { type?: string; text?: string }[];
  output_text?: unknown;
  output?: { type?: string; content?: { text?: unknown }[] }[];
}): string {
  const message = json.choices?.[0]?.message;
  if (message) {
    const content = stripThink(textContent(message.content));
    if (content) return content;
    const reasoning = stripThink(textContent(message.reasoning_content));
    if (reasoning) return reasoning;
  }
  const delta = stripThink(textContent(json.choices?.[0]?.delta?.content));
  if (delta) return delta;
  if (Array.isArray(json.content)) {
    const parts = json.content
      .filter((block) => block?.type !== "thinking" && block?.type !== "redacted_thinking")
      .map((block) => (typeof block?.text === "string" ? block.text.trim() : ""))
      .filter(Boolean);
    if (parts.length) return stripThink(parts.join("\n\n"));
  }
  if (typeof json.output_text === "string" && json.output_text.trim()) {
    return stripThink(json.output_text);
  }
  if (Array.isArray(json.output)) {
    const parts = json.output.flatMap((item) =>
      Array.isArray(item?.content)
        ? item.content.map((part) => (typeof part?.text === "string" ? part.text.trim() : ""))
        : []
    ).filter(Boolean);
    if (parts.length) return stripThink(parts.join("\n\n"));
  }
  return "";
}

function extractReport(text: string): string {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (trimmed.startsWith("data:")) {
    let streamed = "";
    let complete = "";
    for (const line of trimmed.split("\n")) {
      const row = line.trim();
      if (!row.startsWith("data:")) continue;
      const payload = row.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const piece = reportFromJson(JSON.parse(payload));
        if (!piece) continue;
        if (payload.includes('"delta"')) streamed += piece;
        else complete = piece;
      } catch {
        // Ignore a malformed stream event.
      }
    }
    return stripThink(complete || streamed);
  }
  try {
    return reportFromJson(JSON.parse(trimmed));
  } catch {
    return "";
  }
}

function chatBody(model: string, prompt: string): string {
  return JSON.stringify({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_tokens: 1200,
    temperature: 0.3,
    stream: false,
  });
}

function messagesBody(model: string, prompt: string): string {
  return JSON.stringify({
    model,
    max_tokens: 1200,
    temperature: 0.3,
    stream: false,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
}

function requestHeaders(apiKey: string, wire: Wire): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    authorization: `Bearer ${apiKey}`,
    "user-agent": "opencode/1.18.25",
  };
  if (wire === "messages") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  }
  return headers;
}

function httpsCall(
  path: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number,
  family?: number
): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, result?: UpstreamResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result as UpstreamResult);
    };
    const timer = setTimeout(() => {
      req.destroy(new Error("Report request timed out"));
    }, timeoutMs);

    const req = https.request(
      {
        hostname: HOST,
        path,
        method: "POST",
        headers: {
          ...headers,
          host: HOST,
          "Content-Length": Buffer.byteLength(body),
        },
        family,
        servername: HOST,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let received = 0;
        res.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > 4_000_000) {
            finish(new Error("Report response too large"));
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          finish(undefined, {
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", (error) => finish(error));
    req.write(body);
    req.end();
  });
}

async function httpsCallPreferV4(
  path: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<UpstreamResult> {
  try {
    return await httpsCall(path, headers, body, timeoutMs, 4);
  } catch (error) {
    const code =
      error instanceof Error && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";
    if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "EADDRNOTAVAIL") {
      return httpsCall(path, headers, body, timeoutMs);
    }
    throw error;
  }
}

async function fetchCall(
  path: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<UpstreamResult> {
  const res = await fetch(`https://${HOST}${path}`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (text.length > 4_000_000) {
    throw new Error("Report response too large");
  }
  return { status: res.status, text };
}

function classify(
  model: string,
  wire: Wire,
  via: string,
  upstream: UpstreamResult
): Attempt {
  if (isHtml(upstream.text)) {
    console.error("ArcScout upstream html", model, wire, via, upstream.status);
    return {
      kind: "html",
      error: `AI gateway returned its website instead of a report (HTTP ${upstream.status}).`,
    };
  }
  if (upstream.status === 401 || upstream.status === 403) {
    return { kind: "auth", error: upstreamError(upstream.status, upstream.text) };
  }
  if (upstream.status < 200 || upstream.status >= 300) {
    console.error("ArcScout upstream status", model, wire, via, upstream.status);
    return { kind: "model", error: upstreamError(upstream.status, upstream.text) };
  }
  const report = extractReport(upstream.text);
  if (!report) return { kind: "model", error: "No report generated." };
  return { kind: "report", report, model };
}

async function once(
  model: string,
  wire: Wire,
  prompt: string,
  apiKey: string,
  timeoutMs: number
): Promise<Attempt> {
  const path = wire === "chat" ? "/v1/chat/completions" : "/v1/messages";
  const body = wire === "chat" ? chatBody(model, prompt) : messagesBody(model, prompt);
  const headers = requestHeaders(apiKey, wire);
  let last: Attempt = {
    kind: "html",
    error: "AI gateway returned its website instead of a report (HTTP 200).",
  };

  const started = Date.now();
  for (const via of ["https", "fetch"] as const) {
    const slice = Math.min(12_000, timeoutMs - (Date.now() - started));
    if (slice < 3_000) break;
    try {
      const upstream =
        via === "fetch"
          ? await fetchCall(path, headers, body, slice)
          : await httpsCallPreferV4(path, headers, body, slice);
      const attempt = classify(model, wire, via, upstream);
      return attempt;
    } catch (error) {
      if (isTimeout(error)) {
        console.error("ArcScout upstream timeout", model, wire, via);
        last = { kind: "timeout", error: "AI gateway timed out before a report was ready." };
        continue;
      }
      const message = error instanceof Error ? error.message : "Report request failed";
      console.error("ArcScout upstream error", model, wire, via, message);
      last = { kind: "model", error: "AI gateway request failed." };
    }
  }
  return last;
}

function wiresFor(model: string): Wire[] {
  if (model.startsWith("claude")) return ["messages", "chat"];
  if (ANTHROPIC_MODELS.has(model)) return ["chat", "messages"];
  return ["chat"];
}

async function tryModel(
  model: string,
  prompt: string,
  apiKey: string,
  deadline: number,
  capMs: number
): Promise<Attempt> {
  const wires = wiresFor(model);
  let last: Attempt = {
    kind: "html",
    error: "AI gateway returned its website instead of a report (HTTP 200).",
  };

  for (const wire of wires) {
    const budget = Math.min(capMs, deadline - Date.now() - 500, 18_000);
    if (budget < 4_000) return last;
    const attempt = await once(model, wire, prompt, apiKey, budget);
    if (attempt.kind === "report" || attempt.kind === "auth" || attempt.kind === "html" || attempt.kind === "timeout") {
      return attempt;
    }
    last = attempt;
  }
  return last;
}

async function completeReport(
  prompt: string,
  apiKey: string
): Promise<{ report: string; model: string } | { error: string }> {
  const deadline = Date.now() + 48_000;
  const { primary, lastResort } = modelsToTry();
  let lastError = "AI gateway returned its website instead of a report (HTTP 200).";
  let blockedByWebsite = true;

  for (let index = 0; index < primary.length; index++) {
    const model = primary[index];
    const cap = index === 0 ? 34_000 : 16_000;
    if (deadline - Date.now() < 5_000) break;
    const attempt = await tryModel(model, prompt, apiKey, deadline, cap);
    if (attempt.kind === "report") return { report: attempt.report, model: attempt.model };
    if (attempt.kind === "auth") return { error: attempt.error };
    if (attempt.kind === "html") {
      return { error: attempt.error };
    }
    lastError = attempt.error;
    blockedByWebsite = false;
  }

  if (!blockedByWebsite && deadline - Date.now() > 5_000) {
    const attempt = await tryModel(lastResort, prompt, apiKey, deadline, 12_000);
    if (attempt.kind === "report") return { report: attempt.report, model: attempt.model };
    if (attempt.kind !== "html") lastError = attempt.error;
  }

  return { error: lastError };
}

export async function POST(req: NextRequest) {
  let reservedPayment: string | null = null;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const record = body as Record<string, unknown>;
    const address = String(record.address ?? "").trim().toLowerCase();

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

    const paymentTx = String(record.paymentTx ?? "").trim();
    const payer = String(record.payer ?? "").trim();
    const { profile } = await loadArcScoutProfile();
    const fee = arcScoutFeeUnits(profile);
    let paymentError: string | null;
    try {
      paymentError = await verifyX402Payment(paymentTx, payer, fee);
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not verify the USDC payment on Arc. Confirm the transfer in your wallet, then try again.",
          ...x402Requirements(fee),
        },
        { status: 402 }
      );
    }
    if (paymentError) {
      return NextResponse.json(
        { error: paymentError, ...x402Requirements(fee) },
        { status: 402 }
      );
    }
    reservedPayment = paymentTx;

    const results = await Promise.all(
      CHAINS.map((c) => fetchChainBalances(address, c.id, c.label))
    );
    const prompt = buildPrompt(address, results);
    const completed = await completeReport(prompt, AGENTROUTER_API_KEY);
    const report =
      "error" in completed ? buildDataReport(address, results) : completed.report;
    if ("error" in completed) {
      console.error("ArcScout model fallback:", completed.error);
    }

    return NextResponse.json({
      address,
      chainsScanned: CHAINS.length,
      activeChains: results.filter((r) => r.tokens.length > 0).length,
      totalPortfolioUsd:
        Math.round(results.reduce((s, r) => s + r.totalUsd, 0) * 100) / 100,
      chains: results,
      report,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    if (reservedPayment) releaseX402Payment(reservedPayment);
    const msg = e instanceof Error ? e.message : "Internal error. Please try again.";
    console.error("ArcScout error:", msg);
    const safe =
      msg.length < 200 && !msg.includes("<")
        ? msg
        : "Internal error. Please try again.";
    return NextResponse.json({ error: safe }, { status: 500 });
  }
}
