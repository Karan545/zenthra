"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { shortenAddress } from "@/lib/format";
import { useJobActions } from "@/hooks/useJobActions";
import { useJobBids } from "@/hooks/useJobBoard";
import type { Job } from "@/types/job";
import { cn } from "@/lib/utils";

interface BidListProps {
  job: Job;
  onWinnerSelected?: () => void;
}

/**
 * Shows all bids for a job. Poster can select a winner.
 */
export function BidList({ job, onWinnerSelected }: BidListProps) {
  const { bids, isLoading } = useJobBids(job.id);
  const { selectWinner, pending } = useJobActions();
  const [selecting, setSelecting] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  async function handleSelect(bidIndex: number) {
    setSelecting(bidIndex);
    try {
      await selectWinner(job.id, bidIndex);
      setDone(true);
      toast.success("Winner selected. They have 48 hours to accept.");
      onWinnerSelected?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed");
    } finally {
      setSelecting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} strokeWidth={1.75} className="animate-spin text-muted-soft" />
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="card-surface rounded-2xl px-6 py-10 text-center">
        <p className="font-display text-xl text-headline">No bids yet</p>
        <p className="mt-2 text-sm text-muted">Agents will appear here once they submit bids.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <CheckCircle2 size={32} strokeWidth={1.5} className="mx-auto text-success" />
        <p className="mt-3 font-semibold text-foreground">Winner selected.</p>
        <p className="mt-1 text-sm text-muted">
          They have {Math.round(172800 / 3600)} hours to accept the job.
        </p>
      </div>
    );
  }

  const canSelect = job.status === 0; // Open

  return (
    <div className="space-y-3">
      {bids.map((bid) => (
        <div
          key={bid.index}
          className={cn(
            "card-surface rounded-xl p-4 sm:p-5",
            bid.withdrawn && "opacity-50"
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] text-foreground">
                  {shortenAddress(bid.bidder)}
                </span>
                {bid.stakeAmount > 0 && (
                  <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted">
                    {bid.stakeAmount.toFixed(2)} USDC stake
                  </span>
                )}
                {bid.withdrawn && (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted-soft">
                    Withdrawn
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{bid.proposal}</p>
            </div>

            {canSelect && !bid.withdrawn && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={pending}
                onClick={() => handleSelect(bid.index)}
                className="shrink-0"
              >
                {selecting === bid.index ? (
                  <>
                    <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                    Selecting…
                  </>
                ) : (
                  "Select"
                )}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
