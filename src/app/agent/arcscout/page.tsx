"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ArrowLeft, Search, Shield, Globe, ChevronRight, Copy, Check, Star } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { FeedbackSection } from "@/components/agent/FeedbackSection";
import { formatOnchainScore } from "@/components/agent/OnchainScore";
import { erc20Abi } from "@/config/abis";
import { arcMainnet } from "@/config/chains";
import { identityRegistryAddress } from "@/config/contracts";
import { x402Asset, x402PayTo } from "@/config/x402";
import { useAgentFeedback } from "@/hooks/useAgentFeedback";
import { explorerTokenUrl } from "@/lib/format";
import type { Agent } from "@/types/agent";
import {
  arcScoutFeeUnits,
  DEFAULT_ARCSCOUT_PROFILE,
  formatUsdcAmount,
  sanitizeArcScoutProfile,
  type ArcScoutProfile,
} from "@/lib/arcscoutProfile";
import { formatWalletError } from "@/lib/walletErrors";

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

type Phase = "idle" | "checking" | "wallet" | "confirming" | "analyzing";

export default function ArcScoutPage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ArcScoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paidTx, setPaidTx] = useState<{ hash: `0x${string}`; payer: `0x${string}` } | null>(null);
  const [profile, setProfile] = useState<ArcScoutProfile>(DEFAULT_ARCSCOUT_PROFILE);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const busy = useRef(false);

  function rememberProfile(json: { profile?: unknown; tokenId?: unknown }) {
    const next = sanitizeArcScoutProfile(json?.profile);
    if (next) setProfile(next);
    const parsed = Number(json?.tokenId);
    if (Number.isSafeInteger(parsed) && parsed > 0) setTokenId(parsed);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agents/arcscout/profile")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) rememberProfile(json);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const { address: wallet, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: arcMainnet.id });
  const { summary: feedbackSummary, isLoading: feedbackLoading } = useAgentFeedback(
    tokenId ?? undefined
  );
  const reputationAgent = useMemo<Agent | null>(() => {
    if (!tokenId) return null;
    return {
      id: tokenId,
      name: profile.name,
      description: profile.description,
      image: profile.image || undefined,
      capabilities: ["Research", "Wallets", "Multi-chain", "Analytics", "DeFi"],
      reputation: 0,
      pricePerTask: profile.priceUsdc,
      owner: x402PayTo,
      isOnChain: true,
    };
  }, [tokenId, profile]);

  const scoreValue = !tokenId
    ? "—"
    : feedbackLoading
      ? "…"
      : feedbackSummary.count > 0 && feedbackSummary.averageScore != null
        ? formatOnchainScore(feedbackSummary.averageScore)
        : "New";

  const reusePayment =
    Boolean(wallet && paidTx && paidTx.payer.toLowerCase() === wallet.toLowerCase());

  async function analyze() {
    const addr = address.trim();
    if (!isConnected || !wallet) {
      openConnectModal?.();
      setError("Connect your wallet on Arc Mainnet. Each report costs 1 USDC.");
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setError("Enter a valid wallet address (0x and 40 hex characters).");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    let paymentHash: `0x${string}` | undefined;
    let feeProfile = profile;

    try {
      paymentHash =
        paidTx && paidTx.payer.toLowerCase() === wallet.toLowerCase() ? paidTx.hash : undefined;

      if (!paymentHash) {
        setPhase("checking");
        const probe = await fetch("/api/agents/arcscout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: addr }),
        });
        const probeJson = await probe.json().catch(() => ({}));
        if (probe.status !== 402) {
          setError(
            probeJson.error ??
              (probe.ok
                ? "ArcScout did not ask for payment. Refresh and try again."
                : "ArcScout is not available right now.")
          );
          return;
        }

        if (chainId !== arcMainnet.id) {
          setPhase("wallet");
          await switchChainAsync({ chainId: arcMainnet.id });
        }
        if (!publicClient) {
          throw new Error("Could not reach Arc.");
        }

        try {
          const live = await fetch("/api/agents/arcscout/profile").then((res) => res.json());
          const next = sanitizeArcScoutProfile(live?.profile);
          rememberProfile(live);
          if (next) feeProfile = next;
        } catch {
          // The price already on screen is used when the profile request fails.
        }
        const fee = arcScoutFeeUnits(feeProfile);

        let balance: bigint | null = null;
        try {
          balance = await publicClient.readContract({
            address: x402Asset,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [wallet],
          });
        } catch {
          balance = null;
        }
        if (balance !== null && balance < fee) {
          setError(
            `You need at least ${formatUsdcAmount(feeProfile.priceUsdc)} USDC on Arc Mainnet to pay for this report.`
          );
          return;
        }

        setPhase("wallet");
        const hash = await writeContractAsync({
          address: x402Asset,
          abi: erc20Abi,
          functionName: "transfer",
          args: [x402PayTo, fee],
          chainId: arcMainnet.id,
        });
        setPaidTx({ hash, payer: wallet });
        paymentHash = hash;

        setPhase("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 90_000,
        });
        if (receipt.status !== "success") {
          setPaidTx(null);
          setError("The USDC transfer reverted. Nothing was charged for the report.");
          return;
        }
      }

      setPhase("analyzing");
      const res = await fetch("/api/agents/arcscout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, paymentTx: paymentHash, payer: wallet }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = String(json.error ?? "Something went wrong. Please try again.");
        const keepPayment =
          Boolean(paymentHash) &&
          (res.status !== 402 || /not confirmed|Could not verify/.test(message));
        if (!keepPayment) setPaidTx(null);
        setError(
          keepPayment
            ? `${message} Your ${formatUsdcAmount(feeProfile.priceUsdc)} USDC transfer can be reused — press Retry report.`
            : message
        );
      } else {
        setPaidTx(null);
        setResult(json);
      }
    } catch (e) {
      const message =
        e instanceof Error && /^(You need|Could not reach|The USDC)/.test(e.message)
          ? e.message
          : formatWalletError(e);
      setError(
        paymentHash
          ? `${message} If that transfer confirmed, press Retry report instead of paying again.`
          : message
      );
    } finally {
      busy.current = false;
      setLoading(false);
      setPhase("idle");
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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#d4c4b0] text-xl font-bold text-[#3d2c1e]">
            {profile.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.image} alt="" className="h-full w-full object-cover" />
            ) : (
              profile.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-[#1a1410]">{profile.name}</h1>
              <span className="rounded-full bg-[#2d6a4f] px-2.5 py-0.5 text-xs font-semibold text-white">
                Verified
              </span>
              <span className="rounded-full bg-[#b5891a] px-2.5 py-0.5 text-xs font-semibold text-white">
                Launch Partner
              </span>
            </div>
            <p className="mt-1 text-[#5c4a38]">{profile.description}</p>
            {tokenId ? (
              <a
                href={explorerTokenUrl(identityRegistryAddress, tokenId)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-[#3d2c1e] hover:underline"
              >
                Arc identity #{tokenId}
              </a>
            ) : null}
            {wallet?.toLowerCase() === x402PayTo.toLowerCase() ? (
              <Link href="/my-agents" className="mt-2 block text-sm font-semibold text-[#3d2c1e] hover:underline">
                Edit price, picture, and description
              </Link>
            ) : null}
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
            { icon: Star, label: "On-chain score", value: scoreValue },
            { icon: Shield, label: "Price per report", value: `${formatUsdcAmount(profile.priceUsdc)} USDC` },
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
              disabled={loading || (isConnected && !address.trim())}
              className="flex items-center gap-2 rounded-lg bg-[#3d2c1e] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {phase === "checking"
                    ? "Checking…"
                    : phase === "wallet"
                      ? "Confirm in wallet…"
                      : phase === "confirming"
                        ? "Confirming payment…"
                        : "Analyzing…"}
                </>
              ) : !isConnected ? (
                <>
                  <Search className="h-4 w-4" />
                  Connect wallet
                </>
              ) : reusePayment ? (
                <>
                  <Search className="h-4 w-4" />
                  Retry report
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Pay {formatUsdcAmount(profile.priceUsdc)} USDC
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#8a7d6b]">
            Costs {formatUsdcAmount(profile.priceUsdc)} USDC on Arc Mainnet. Your wallet asks you to confirm a transfer to {x402PayTo} before any report is shown.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && phase !== "analyzing" && (
          <p className="mt-4 text-sm text-[#5c4a38]">
            {phase === "wallet"
              ? `Approve the ${formatUsdcAmount(profile.priceUsdc)} USDC transfer in your wallet. The report starts after it confirms.`
              : phase === "confirming"
                ? "Waiting for the USDC transfer to confirm on Arc…"
                : "Checking that ArcScout can run this report…"}
          </p>
        )}

        {/* Loading skeleton */}
        {loading && phase === "analyzing" && (
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

            <a
              href="#leave-feedback"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#3d2c1e] hover:underline"
            >
              Leave an on-chain score for this report
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

      <div id="arcscout-reputation" className="mt-10">
        <h2 className="text-lg font-bold text-[#1a1410]">On-chain reputation</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#5c4a38]">
          A client who hired ArcScout records the score here. Arc stores it on the Reputation Registry, and that public record is what the next client sees before hiring. The owner cannot review their own agent.
        </p>
        {reputationAgent ? (
          <div className="mt-4">
            <FeedbackSection
              agent={reputationAgent}
              extraTags={["Wallet report"]}
              fallbackTag="Wallet report"
              note="Score the report this agent wrote for you. Confirm the transaction in your wallet. Arc charges the network fee in USDC, separate from the report price."
            />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#e8e0d4] bg-white/80 p-6 text-sm text-[#5c4a38]">
            Reputation attaches to ArcScout’s identity on Arc. The owner saves the agent once from My agents, and then any other wallet can record a score after the work.
            {wallet?.toLowerCase() === x402PayTo.toLowerCase() ? (
              <Link href="/my-agents" className="mt-3 block font-semibold text-[#3d2c1e] hover:underline">
                Save ArcScout to my wallet
              </Link>
            ) : null}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
