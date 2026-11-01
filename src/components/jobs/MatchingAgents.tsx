"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Zap, CheckCircle2, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useAccount, useSendTransaction } from "wagmi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AgentMatch } from "@/lib/jobMatching";

interface MatchingAgentsProps {
  jobId: number;
  jobDescription: string;
  jobBudget: number;
  /** Called after a successful auto-bid tx */
  onBidPlaced?: () => void;
}

interface DiscoverResult {
  matchedAgents: AgentMatch[];
  totalAgents: number;
}

export function MatchingAgents({
  jobId,
  jobDescription,
  jobBudget,
  onBidPlaced,
}: MatchingAgentsProps) {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biddingAgentId, setBiddingAgentId] = useState<number | null>(null);
  const [successAgentIds, setSuccessAgentIds] = useState<Set<number>>(new Set());

  const discover = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/discover-jobs?jobId=${jobId}`);
      const data = await res.json() as { jobs?: Array<{ matchedAgents: AgentMatch[] }>; totalAgents?: number; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to load");
      const job = data.jobs?.[0];
      setResult({ matchedAgents: job?.matchedAgents ?? [], totalAgents: data.totalAgents ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load matching agents");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const autoBid = useCallback(async (agent: AgentMatch) => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!agent.x402Endpoint) {
      toast.error("This agent has no x402 endpoint configured");
      return;
    }

    setBiddingAgentId(agent.agentId);
    try {
      // 1. Get proposal + calldata from server
      const res = await fetch("/api/agents/auto-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          agentId: agent.agentId,
          x402Endpoint: agent.x402Endpoint,
          pricePerTask: agent.pricePerTask || 1,
          jobDescription,
          jobBudget,
        }),
      });

      const data = await res.json() as {
        proposal?: string;
        tx?: { to: string; data: string; value: string };
        error?: string;
      };

      if (!res.ok || data.error) throw new Error(data.error ?? "Auto-bid failed");
      if (!data.tx) throw new Error("No transaction returned");

      toast.info(`Auto-bidding for "${agent.name}"...`);

      // 2. Send transaction from connected wallet
      const hash = await sendTransactionAsync({
        to: data.tx.to as `0x${string}`,
        data: data.tx.data as `0x${string}`,
        value: BigInt(0),
      });

      setSuccessAgentIds((prev) => new Set([...prev, agent.agentId]));
      toast.success(
        <span>
          Bid placed!{" "}
          <a
            href={`https://explorer.arc.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View tx
          </a>
        </span>
      );
      onBidPlaced?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      toast.error(msg);
    } finally {
      setBiddingAgentId(null);
    }
  }, [isConnected, address, jobId, jobDescription, jobBudget, sendTransactionAsync, onBidPlaced]);

  return (
    <div className="mt-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot size={15} strokeWidth={1.75} className="text-muted" />
          <span className="text-sm font-medium text-foreground">Matching agents</span>
          {result && (
            <span className="rounded-full bg-surface-1 px-2 py-0.5 text-[11px] text-muted">
              {result.matchedAgents.length} of {result.totalAgents}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={discover}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            "border border-border bg-surface-1 text-foreground hover:bg-surface-2",
            loading && "cursor-not-allowed opacity-60"
          )}
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Zap size={12} strokeWidth={2} />
          )}
          {result ? "Refresh" : "Find matching agents"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            {result.matchedAgents.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-1 px-4 py-6 text-center">
                <p className="text-sm text-muted">
                  No registered agents match this job yet.
                </p>
                <p className="mt-1 text-xs text-muted-soft">
                  Agents with capabilities like{" "}
                  <span className="text-muted">Research, Content, Analytics</span> will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.matchedAgents.map((agent) => {
                  const isDone = successAgentIds.has(agent.agentId);
                  const isBidding = biddingAgentId === agent.agentId;
                  const scorePercent = Math.round(agent.score * 100);

                  return (
                    <motion.div
                      key={agent.agentId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors",
                        isDone
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-border bg-surface-1 hover:bg-surface-2"
                      )}
                    >
                      {/* Left: agent info */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-headline">
                            {agent.name}
                          </span>
                          <span className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            scorePercent >= 70
                              ? "bg-green-500/15 text-green-400"
                              : scorePercent >= 40
                              ? "bg-yellow-500/15 text-yellow-400"
                              : "bg-surface-2 text-muted"
                          )}>
                            {scorePercent}% match
                          </span>
                        </div>

                        {/* Matched capability tags */}
                        <div className="flex flex-wrap gap-1">
                          {agent.matchedTags.slice(0, 5).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-headline/10 px-1.5 py-0.5 text-[10px] font-medium text-headline"
                            >
                              {tag}
                            </span>
                          ))}
                          {agent.matchedTags.length > 5 && (
                            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                              +{agent.matchedTags.length - 5}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted">
                          {agent.pricePerTask > 0 && (
                            <span>{agent.pricePerTask} USDC / task</span>
                          )}
                          {agent.x402Endpoint && (
                            <a
                              href={agent.x402Endpoint}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 hover:text-foreground"
                            >
                              x402 <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Right: auto-bid button */}
                      <div className="shrink-0">
                        {isDone ? (
                          <div className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-green-400">
                            <CheckCircle2 size={13} />
                            Bid placed
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => autoBid(agent)}
                            disabled={isBidding || biddingAgentId !== null}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                              "bg-headline text-bg hover:bg-headline/90",
                              (isBidding || biddingAgentId !== null) && "cursor-not-allowed opacity-60"
                            )}
                          >
                            {isBidding ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Zap size={11} strokeWidth={2} />
                            )}
                            {isBidding ? "Bidding…" : "Auto-bid"}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
