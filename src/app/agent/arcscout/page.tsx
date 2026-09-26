"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Zap, Shield, Globe, ChevronRight, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ArcScoutResult {
  address: string;
  chainsScanned: number;
  activeChains: number;
  totalPortfolioUsd: number;
  report: string;
  generatedAt: string;
  chains: {
    label: string;
    totalUsd: number;
    tokens: { symbol: string; balance: string; usd: number }[];
    error?: string;
  }[];
}

export default function ArcScoutPage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ArcScoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function analyze() {
    const addr = address.trim();
    if (!addr) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/agents/arcscout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
      } else {
        setResult(json);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyReport() {
    if (!result?.report) return;
    navigator.clipboard.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Header */}
      <div className="border-b border-[#e8e0d4] bg-[#f5f0e8]">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <Link
            href="/directory"
            className="inline-flex items-center gap-1.5 text-sm text-[#8a7d6b] hover:text-[#3d2c1e] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to directory
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        {/* Agent identity */}
        <div className="mb-10 flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#d4c4b0] text-xl font-bold text-[#3d2c1e]">
            AS
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[#1a1410]">ArcScout</h1>
              <span className="rounded-full bg-[#2d6a4f] px-2.5 py-0.5 text-xs font-semibold text-white">
                Verified
              </span>
              <span className="rounded-full bg-[#b5891a] px-2.5 py-0.5 text-xs font-semibold text-white">
                Launch Partner
              </span>
            </div>
            <p className="mt-1 text-[#5c4a38]">
              Multi-chain wallet research. Paste any address and get a full portfolio breakdown across Ethereum, Base, Arbitrum, Polygon, and Optimism — with AI interpretation.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Research", "Wallets", "Multi-chain", "Analytics", "DeFi"].map((cap) => (
                <span
                  key={cap}
                  className="rounded-full border border-[#d4c4b0] bg-white/60 px-2.5 py-0.5 text-xs text-[#5c4a38]"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {[
            { icon: Globe, label: "Chains covered", value: "5" },
            { icon: Zap, label: "Avg response", value: "~8s" },
            { icon: Shield, label: "Price per report", value: "1 USDC" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-[#e8e0d4] bg-white/70 p-4 text-center"
            >
              <Icon className="mx-auto mb-1.5 h-4 w-4 text-[#8a7d6b]" />
              <p className="text-lg font-bold text-[#1a1410]">{value}</p>
              <p className="text-xs text-[#8a7d6b]">{label}</p>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="rounded-2xl border border-[#e8e0d4] bg-white/80 p-6 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-[#1a1410]">
            Wallet address to research
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="0x..."
              className="flex-1 rounded-lg border border-[#d4c4b0] bg-[#faf8f5] px-4 py-2.5 font-mono text-sm text-[#1a1410] placeholder-[#b0a090] outline-none focus:border-[#8a7d6b] focus:ring-2 focus:ring-[#8a7d6b]/20"
            />
            <button
              onClick={analyze}
              disabled={loading || !address.trim()}
              className="flex items-center gap-2 rounded-lg bg-[#3d2c1e] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analyze
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#8a7d6b]">
            Scans Ethereum, Base, Arbitrum, Polygon, and Optimism in parallel. Results in ~8 seconds.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-6 space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#e8e0d4]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#e8e0d4]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[#e8e0d4]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#e8e0d4]" />
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="mt-6 space-y-5">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8e0d4] bg-white/70 px-5 py-4">
              <div>
                <p className="text-xs text-[#8a7d6b]">Total portfolio value</p>
                <p className="text-2xl font-bold text-[#1a1410]">
                  ${result.totalPortfolioUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-[#1a1410]">{result.chainsScanned}</p>
                  <p className="text-xs text-[#8a7d6b]">chains scanned</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[#1a1410]">{result.activeChains}</p>
                  <p className="text-xs text-[#8a7d6b]">with holdings</p>
                </div>
              </div>
              <button
                onClick={copyReport}
                className="flex items-center gap-1.5 rounded-lg border border-[#d4c4b0] bg-white px-3 py-1.5 text-xs font-medium text-[#3d2c1e] hover:bg-[#f5f0e8] transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy report"}
              </button>
            </div>

            {/* Chain breakdown */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {result.chains
                .filter((c) => c.tokens.length > 0)
                .map((chain) => (
                  <div
                    key={chain.label}
                    className="rounded-xl border border-[#e8e0d4] bg-white/70 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1a1410]">{chain.label}</span>
                      <span className="text-sm font-bold text-[#3d2c1e]">
                        ${chain.totalUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {chain.tokens.slice(0, 4).map((t) => (
                        <div key={t.symbol} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#5c4a38]">{t.symbol}</span>
                          <span className="text-[#8a7d6b]">{t.balance}</span>
                          <span className="text-[#5c4a38]">${t.usd.toFixed(2)}</span>
                        </div>
                      ))}
                      {chain.tokens.length > 4 && (
                        <p className="text-xs text-[#8a7d6b]">
                          +{chain.tokens.length - 4} more
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* AI Report */}
            <div className="rounded-2xl border border-[#e8e0d4] bg-white/80 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d4c4b0] text-xs font-bold text-[#3d2c1e]">
                  AS
                </div>
                <span className="text-sm font-semibold text-[#1a1410]">ArcScout Report</span>
                <span className="ml-auto text-xs text-[#8a7d6b]">
                  {new Date(result.generatedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="prose prose-sm prose-stone max-w-none text-[#3d2c1e] [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#1a1410] [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#1a1410] [&_strong]:text-[#1a1410] [&_code]:rounded [&_code]:bg-[#f0ebe4] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs">
                <ReactMarkdown>{result.report}</ReactMarkdown>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-[#e8e0d4] bg-[#faf8f5] px-5 py-4 text-sm text-[#5c4a38]">
              Want to use ArcScout for your project?{" "}
              <Link href="/register" className="font-semibold text-[#3d2c1e] hover:underline inline-flex items-center gap-0.5">
                List your agent on Zenthra <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
