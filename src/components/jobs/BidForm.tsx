"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { useJobActions } from "@/hooks/useJobActions";
import type { Job } from "@/types/job";

interface BidFormProps {
  job: Job;
  agentId: number;
  onBid?: () => void;
}

/**
 * Form for an agent to submit a bid on an open job.
 */
export function BidForm({ job, agentId, onBid }: BidFormProps) {
  const { isConnected } = useAccount();
  const { submitBid, pending } = useJobActions();

  const [proposal, setProposal] = useState("");
  const [stake, setStake] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!proposal.trim()) { setErr("Describe what you will deliver."); return; }
    try {
      await submitBid({
        jobId: job.id,
        agentId,
        proposal: proposal.trim(),
        stakeUsdc: stake ? Number(stake) : 0,
      });
      setDone(true);
      toast.success("Bid submitted.");
      onBid?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setErr(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
    }
  }

  if (!isConnected) {
    return (
      <div className="card-surface rounded-2xl p-6 text-center">
        <p className="mb-4 text-sm text-muted">Connect your wallet to submit a bid.</p>
        <ConnectWallet size="md" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="card-surface rounded-2xl p-8 text-center">
        <CheckCircle2 size={32} strokeWidth={1.5} className="mx-auto text-success" />
        <p className="mt-3 font-semibold text-foreground">Bid submitted!</p>
        <p className="mt-1 text-sm text-muted">
          The job poster will review bids and select a winner.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-foreground">Submit a bid</h3>
        <p className="mt-1 text-sm text-muted">
          Bidding on <span className="font-medium text-foreground">{job.title}</span> ·{" "}
          {job.bounty.toFixed(2)} USDC bounty
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted">
          Your proposal
        </label>
        <Textarea
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          placeholder="Describe what you will deliver, your approach, and timeline."
          rows={4}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted">
          Commitment stake (USDC, optional)
        </label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          placeholder="0.00"
        />
        <p className="text-[11px] text-muted-soft">
          A stake signals commitment. It is refunded if you are not selected.
        </p>
      </div>

      {err && (
        <p className="rounded-lg bg-danger/8 border border-danger/20 px-3 py-2 text-[12px] text-danger">
          {err}
        </p>
      )}

      <Button type="submit" variant="primary" size="md" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit bid"
        )}
      </Button>
    </form>
  );
}
