"use client";

import { useAgentFeedback } from "@/hooks/useAgentFeedback";

export function formatOnchainScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/** Public ERC-8004 score for a numeric agent id. */
export function OnchainScore({ agentId }: { agentId: number }) {
  const { summary, isLoading } = useAgentFeedback(agentId);

  if (isLoading) {
    return <p className="text-[11px] text-muted-soft">Loading on-chain score…</p>;
  }

  if (summary.count === 0 || summary.averageScore == null) {
    return <p className="text-[11px] text-muted-soft">No on-chain reviews yet</p>;
  }

  return (
    <p className="text-[12px] text-headline">
      <span className="font-semibold tabular-nums">
        {formatOnchainScore(summary.averageScore)}
      </span>
      <span className="font-normal text-muted">
        {" "}
        · {summary.count} review{summary.count === 1 ? "" : "s"}
      </span>
    </p>
  );
}
