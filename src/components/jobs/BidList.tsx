"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { shortenAddress } from "@/lib/format";
import { useJobActions } from "@/hooks/useJobActions";
import { useJobBids } from "@/hooks/useJobBoard";
import type { Job } from "@/types/job";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";

interface BidListProps {
  job: Job;
  onWinnerSelected?: () => void;
}

export function BidList({ job, onWinnerSelected }: BidListProps) {
  const { address } = useAccount();
  const { bids, isLoading } = useJobBids(job.id);
  const { selectWinner, submitWork, approveJob, rejectJob, pending } = useJobActions();
  const [selecting, setSelecting] = useState<number | null>(null);
  const [deliverable, setDeliverable] = useState("");
  const [actionDone, setActionDone] = useState<string | null>(null);

  const isPoster = !!address && job.poster.toLowerCase() === address.toLowerCase();
  const isBidder = !!address && job.acceptedBidder?.toLowerCase() === address.toLowerCase();

  // ── Accept bid (poster, status=Open) ──────────────────────────────────────
  async function handleSelect(bidIndex: number) {
    setSelecting(bidIndex);
    try {
      await selectWinner({ jobId: job.id, bidIndex });
      setActionDone("accepted");
      toast.success("Bid accepted. Bidder can now submit work.");
      onWinnerSelected?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed");
    } finally { setSelecting(null); }
  }

  // ── Submit work (accepted bidder, status=InProgress) ──────────────────────
  async function handleSubmitWork(e: React.FormEvent) {
    e.preventDefault();
    if (!deliverable.trim()) { toast.error("Enter your deliverable."); return; }
    try {
      await submitWork({ jobId: job.id, deliverable: deliverable.trim() });
      setActionDone("submitted");
      toast.success("Work submitted. Awaiting poster review.");
      onWinnerSelected?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed");
    }
  }

  // ── Approve / reject (poster, status=Submitted) ───────────────────────────
  async function handleApprove() {
    try {
      await approveJob({ jobId: job.id });
      setActionDone("approved");
      toast.success("Work approved. USDC released to bidder.");
      onWinnerSelected?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed");
    }
  }

  async function handleReject() {
    try {
      await rejectJob({ jobId: job.id });
      setActionDone("rejected");
      toast.success("Work rejected. USDC returned to you.");
      onWinnerSelected?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} strokeWidth={1.75} className="animate-spin text-muted-soft" />
      </div>
    );
  }

  // ── Status=InProgress: bidder submits work ─────────────────────────────────
  if (job.status === 1 && isBidder && !actionDone) {
    return (
      <div className="card-surface rounded-2xl p-6 space-y-4">
        <p className="font-display text-lg text-headline">Submit your work</p>
        <p className="text-sm text-muted">Describe what you delivered — link, summary, or result.</p>
        <form onSubmit={handleSubmitWork} className="space-y-3">
          <Textarea
            value={deliverable}
            onChange={(e) => setDeliverable(e.target.value)}
            placeholder="e.g. https://github.com/... or describe the deliverable"
            rows={4}
          />
          <Button type="submit" variant="primary" disabled={pending} className="gap-1.5">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit work
          </Button>
        </form>
      </div>
    );
  }

  // ── Status=Submitted: poster approves or rejects ───────────────────────────
  if (job.status === 2 && isPoster && !actionDone) {
    return (
      <div className="card-surface rounded-2xl p-6 space-y-4">
        <p className="font-display text-lg text-headline">Review submitted work</p>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-soft mb-1">Deliverable</p>
          <p className="text-sm leading-relaxed text-foreground">{job.deliverable || "—"}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleApprove} disabled={pending} className="gap-1.5">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Approve — release USDC
          </Button>
          <Button variant="ghost" onClick={handleReject} disabled={pending} className="gap-1.5 text-danger hover:text-danger">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Reject — refund me
          </Button>
        </div>
      </div>
    );
  }

  // ── Done states ────────────────────────────────────────────────────────────
  if (actionDone) {
    const msgs: Record<string, string> = {
      accepted: "Bid accepted. Waiting for bidder to submit work.",
      submitted: "Work submitted. Waiting for poster review.",
      approved: "Work approved. USDC released.",
      rejected: "Work rejected. USDC refunded.",
    };
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <CheckCircle2 size={32} strokeWidth={1.5} className="mx-auto text-success" />
        <p className="mt-3 font-semibold text-foreground">{msgs[actionDone]}</p>
      </div>
    );
  }

  // ── No bids yet ────────────────────────────────────────────────────────────
  if (bids.length === 0) {
    return (
      <div className="card-surface rounded-2xl px-6 py-10 text-center">
        <p className="font-display text-xl text-headline">No bids yet</p>
        <p className="mt-2 text-sm text-muted">Agents will appear here once they submit bids.</p>
      </div>
    );
  }

  const canSelect = job.status === 0 && isPoster;

  return (
    <div className="space-y-3">
      {bids.map((bid) => (
        <div key={bid.index} className="card-surface rounded-xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] text-foreground">
                  {shortenAddress(bid.bidder)}
                </span>
                {bid.stakeAmount > 0 && (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted">
                    {bid.stakeAmount.toFixed(2)} USDC
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{bid.proposal}</p>
            </div>
            {canSelect && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={pending && selecting === bid.index}
                onClick={() => handleSelect(bid.index)}
                className="shrink-0 gap-1.5"
              >
                {pending && selecting === bid.index
                  ? <Loader2 size={13} className="animate-spin" />
                  : <CheckCircle2 size={13} />}
                Accept bid
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
