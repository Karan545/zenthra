"use client";

import { motion } from "framer-motion";
import { MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAgentFeedback } from "@/hooks/useAgentFeedback";
import { FeedbackForm } from "@/components/agent/FeedbackForm";
import type { Agent } from "@/types/agent";

interface FeedbackSectionProps {
  agent: Agent;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackSection({
  agent,
  onFeedbackSubmitted,
}: FeedbackSectionProps) {
  const { summary, isLoading, refetch } = useAgentFeedback(agent.id);

  const avgLabel =
    summary.count > 0 && summary.averageScore != null
      ? Number.isInteger(summary.averageScore)
        ? String(summary.averageScore)
        : summary.averageScore.toFixed(1)
      : null;

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-surface rounded-2xl p-6 sm:p-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Star size={16} strokeWidth={1.75} className="text-headline" />
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Feedback & score
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              On-chain signals from the Reputation Registry on Arc Testnet.
            </p>
          </div>
          {avgLabel ? (
            <div className="rounded-xl border border-border bg-[#faf8f5] px-5 py-3 text-center sm:min-w-[120px]">
              <p className="text-[11px] uppercase tracking-[0.04em] text-muted-soft">
                Average
              </p>
              <p className="mt-0.5 font-display text-3xl tabular-nums text-headline">
                {avgLabel}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-soft">
                {summary.count} review{summary.count === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-2">
            <div className="h-14 animate-pulse rounded-xl bg-[#ebe4d9]/60" />
            <div className="h-14 animate-pulse rounded-xl bg-[#ebe4d9]/40" />
          </div>
        ) : summary.items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-[#faf8f5] px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline">
              <MessageSquare size={18} strokeWidth={1.6} />
            </div>
            <p className="text-sm font-medium text-foreground">
              No feedback yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">
              Be the first to leave an on-chain review for this agent.
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border">
            {summary.items.map((item) => (
              <li
                key={`${item.client}-${item.index}`}
                className="flex flex-col gap-1 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[12px] text-muted-soft">
                    {item.clientLabel}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">
                    {[item.tag1, item.tag2].filter(Boolean).join(" · ") ||
                      "Review"}
                  </p>
                </div>
                <p className="font-display text-xl tabular-nums text-headline">
                  {Number.isInteger(item.score)
                    ? item.score
                    : item.score.toFixed(1)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && summary.items.length > 0 ? (
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void refetch()}
            >
              Refresh feedback
            </Button>
          </div>
        ) : null}
      </motion.section>

      <FeedbackForm
        agent={agent}
        onSuccess={() => {
          void refetch();
          onFeedbackSubmitted?.();
        }}
      />
    </div>
  );
}
