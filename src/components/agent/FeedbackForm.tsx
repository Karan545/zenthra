"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { useGiveFeedback } from "@/hooks/useGiveFeedback";
import { explorerTxUrl, shortenAddress } from "@/lib/format";
import { formatWalletError } from "@/lib/walletErrors";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types/agent";
import type { Hash } from "viem";

const FEEDBACK_TAGS = [
  "Quality",
  "Speed",
  "Reliability",
  "Communication",
  "Accuracy",
  "Value",
] as const;

type Phase = "idle" | "wallet" | "confirming" | "success";

interface FeedbackFormProps {
  agent: Agent;
  onSuccess?: () => void;
}

export function FeedbackForm({ agent, onSuccess }: FeedbackFormProps) {
  const { address, isConnected } = useAccount();
  const { giveFeedback, isPending, reset } = useGiveFeedback();

  const [score, setScore] = useState(85);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  const isOwnAgent = useMemo(() => {
    if (!address || !agent.owner) return false;
    return address.toLowerCase() === agent.owner.toLowerCase();
  }, [address, agent.owner]);

  const submitting = phase === "wallet" || phase === "confirming" || isPending;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 2) return [prev[1], tag]; // max 2 tags → tag1/tag2
      return [...prev, tag];
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError("Connect your wallet on Arc Testnet to submit feedback.");
      return;
    }
    if (isOwnAgent) {
      setError("You cannot leave feedback on your own agent.");
      return;
    }
    if (score < 1 || score > 100) {
      setError("Score must be between 1 and 100.");
      return;
    }

    try {
      reset();
      setPhase("wallet");
      const { hash } = await giveFeedback(
        {
          agentId: agent.id,
          score,
          tag1: selectedTags[0] ?? "starred",
          tag2: selectedTags[1] ?? "",
          comment,
        },
        { onSubmitted: () => setPhase("confirming") }
      );
      setTxHash(hash);
      setPhase("success");
      onSuccess?.();
    } catch (err) {
      setPhase("idle");
      setError(
        formatWalletError(
          err,
          "Something went wrong. Please try again in a moment."
        )
      );
    }
  };

  if (phase === "success" && txHash) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface rounded-2xl p-6 sm:p-7"
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline">
          <CheckCircle2 size={22} strokeWidth={1.5} />
        </div>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          Feedback submitted
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your score of{" "}
          <span className="font-medium text-foreground">{score}</span> for{" "}
          <span className="font-medium text-foreground">{agent.name}</span> was
          recorded on the Reputation Registry.
        </p>
        <a
          href={explorerTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-headline hover:underline"
        >
          {shortenAddress(txHash, 6)}
          <ExternalLink size={13} strokeWidth={1.75} />
        </a>
        <div className="mt-5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPhase("idle");
              setTxHash(null);
              setComment("");
              setSelectedTags([]);
              setScore(85);
              reset();
            }}
          >
            Submit another
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="card-surface rounded-2xl p-6 sm:p-7"
      id="leave-feedback"
    >
      <div className="mb-1 flex items-center gap-2">
        <MessageSquare size={16} strokeWidth={1.75} className="text-headline" />
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          Leave feedback
        </h2>
      </div>
      <p className="text-sm text-muted">
        Submit an on-chain reputation signal for agent #{agent.id} on Arc
        Testnet.
      </p>

      {isOwnAgent ? (
        <div className="mt-5 rounded-xl border border-border bg-[#faf8f5] px-4 py-3 text-sm text-muted">
          You own this agent. Feedback must come from other clients — the
          Reputation Registry rejects self-reviews.
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-5">
          {/* Score */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="feedback-score"
                className="text-[13px] font-medium text-foreground"
              >
                Score <span className="text-headline">*</span>
              </label>
              <span className="font-display text-2xl tabular-nums text-headline">
                {score}
              </span>
            </div>
            <input
              id="feedback-score"
              type="range"
              min={1}
              max={100}
              step={1}
              value={score}
              onChange={(e) => {
                setScore(Number(e.target.value));
                setError(null);
              }}
              disabled={submitting}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#ebe4d9] accent-[#6f563c]"
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-soft">
              <span>1</span>
              <span>100</span>
            </div>
            <div className="mt-3">
              <input
                type="number"
                min={1}
                max={100}
                value={score}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setScore(Math.min(100, Math.max(1, Math.round(n))));
                  setError(null);
                }}
                disabled={submitting}
                className="h-11 w-full rounded-xl border border-border-strong bg-white px-3.5 text-sm outline-none focus:border-headline focus:ring-2 focus:ring-headline/15"
                aria-label="Score number"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground">
              Tags{" "}
              <span className="font-normal text-muted-soft">
                (optional, up to 2)
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={submitting}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                      selected
                        ? "border-headline bg-[#f0ebe3] text-headline-deep"
                        : "border-border bg-white text-muted hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            label="Comment"
            name="comment"
            placeholder="Optional short note about this agent’s work…"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setError(null);
            }}
            disabled={submitting}
            hint="Stored as a data URI on the feedbackURI field (optional)."
          />

          {!isConnected ? (
            <div className="rounded-xl border border-border bg-[#faf8f5] p-4">
              <p className="mb-3 text-sm text-muted">
                Connect a wallet to submit on-chain feedback.
              </p>
              <ConnectWallet size="md" />
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-border bg-[#faf8f5] px-4 py-3"
            >
              <p className="text-sm text-foreground">{error}</p>
              <button
                type="button"
                className="mt-2 text-[13px] font-medium text-headline hover:underline"
                onClick={() => {
                  setError(null);
                  reset();
                }}
              >
                Try again
              </button>
            </div>
          ) : null}

          {submitting ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted">
              <Loader2 size={16} className="animate-spin text-headline" />
              {phase === "wallet"
                ? "Approve the transaction in your wallet…"
                : "Confirming on Arc Testnet…"}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={submitting || !isConnected || isOwnAgent}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting…
              </>
            ) : error ? (
              "Try again"
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </form>
      )}
    </motion.section>
  );
}
