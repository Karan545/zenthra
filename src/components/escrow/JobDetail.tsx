"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useGetJob, useGetBids, usePlaceBid, useAcceptBid, useSubmitWork, useApproveJob, useRejectJob } from "@/hooks/useJobEscrow";
import { JobStatusBadge } from "./JobStatusBadge";

const EXPLORER = "https://explorer.arc.io";

function fmt(n: bigint) {
  return Number(formatUnits(n, 6)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

type Props = { jobId: bigint; onBack: () => void };

export function JobDetail({ jobId, onBack }: Props) {
  const { address } = useAccount();
  const { data: job, refetch: refetchJob } = useGetJob(jobId);
  const { data: bids, refetch: refetchBids } = useGetBids(jobId);

  const { placeBid, phase: bidPhase, error: bidError, reset: resetBid } = usePlaceBid();
  const { acceptBid, phase: acceptPhase } = useAcceptBid();
  const { submitWork, phase: submitPhase } = useSubmitWork();
  const { approveJob, phase: approvePhase } = useApproveJob();
  const { rejectJob, phase: rejectPhase } = useRejectJob();

  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [deliverable, setDeliverable] = useState("");

  const refresh = () => { void refetchJob(); void refetchBids(); };

  if (!job) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const isPoster = address?.toLowerCase() === job.poster.toLowerCase();
  const isAcceptedBidder = address?.toLowerCase() === job.acceptedBidder.toLowerCase();
  const status = job.status as number;
  const busy = (phase: string) => phase === "writing" || phase === "confirming" || phase === "approving";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={onBack} className="mb-3 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            ← All jobs
          </button>
          <h2 className="text-lg font-semibold text-slate-900 text-pretty leading-snug">
            {job.description}
          </h2>
        </div>
        <JobStatusBadge status={status} />
      </div>

      {/* Info strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-3.5 py-3">
          <p className="text-xs text-slate-500 mb-0.5">Budget</p>
          <p className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(job.budget)} USDC</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3.5 py-3">
          <p className="text-xs text-slate-500 mb-0.5">Poster</p>
          <a
            href={`${EXPLORER}/address/${job.poster}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            {shortAddr(job.poster)} <ExternalLink size={10} />
          </a>
        </div>
        <div className="rounded-xl bg-slate-50 px-3.5 py-3">
          <p className="text-xs text-slate-500 mb-0.5">Bids</p>
          <p className="text-sm font-semibold text-slate-900">{bids?.length ?? "..."}</p>
        </div>
      </div>

      {/* Deliverable (when submitted or completed) */}
      {(status === 2 || status === 3) && job.deliverable && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Deliverable</p>
          <p className="text-sm text-slate-800 text-pretty whitespace-pre-wrap">{job.deliverable}</p>
        </div>
      )}

      {/* Poster: approve / reject */}
      {isPoster && status === 2 && (
        <div className="flex gap-3">
          <button
            disabled={busy(approvePhase)}
            onClick={async () => { await approveJob(jobId); refresh(); }}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {busy(approvePhase) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Approve & release USDC
          </button>
          <button
            disabled={busy(rejectPhase)}
            onClick={async () => { await rejectJob(jobId); refresh(); }}
            className="flex-1 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {busy(rejectPhase) ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Reject & refund
          </button>
        </div>
      )}

      {/* Accepted bidder: submit work */}
      {isAcceptedBidder && status === 1 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-medium text-blue-900">Submit your deliverable</p>
          <textarea
            className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-none"
            rows={3}
            placeholder="Describe or link to your deliverable..."
            value={deliverable}
            onChange={(e) => setDeliverable(e.target.value)}
            disabled={busy(submitPhase)}
          />
          <button
            disabled={busy(submitPhase) || !deliverable.trim()}
            onClick={async () => { await submitWork(jobId, deliverable.trim()); setDeliverable(""); refresh(); }}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {busy(submitPhase) ? <Loader2 size={14} className="animate-spin" /> : null}
            Submit work
          </button>
        </div>
      )}

      {/* Bids list */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Bids {bids && bids.length > 0 ? `(${bids.length})` : ""}
        </p>
        {!bids || bids.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center rounded-xl border border-dashed border-slate-200">
            No bids yet — be the first to bid.
          </p>
        ) : (
          <div className="space-y-3">
            {bids.map((b, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`${EXPLORER}/address/${b.bidder}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    {shortAddr(b.bidder)} <ExternalLink size={9} />
                  </a>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {fmt(b.amount)} USDC
                  </span>
                </div>
                <p className="text-sm text-slate-600 text-pretty">{b.message}</p>
                {isPoster && status === 0 && (
                  <button
                    disabled={busy(acceptPhase)}
                    onClick={async () => { await acceptBid(jobId, BigInt(i)); refresh(); }}
                    className="mt-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    {busy(acceptPhase) ? <Loader2 size={11} className="animate-spin" /> : null}
                    Accept this bid
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Place a bid (if open and not poster) */}
      {status === 0 && !isPoster && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Place a bid</p>
          <div className="relative">
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-16 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 tabular-nums"
              placeholder="Amount you'll charge"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              disabled={busy(bidPhase)}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">USDC</span>
          </div>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
            rows={2}
            placeholder="Describe your proposal..."
            value={bidMessage}
            onChange={(e) => setBidMessage(e.target.value)}
            disabled={busy(bidPhase)}
          />
          {bidError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{bidError.slice(0, 200)}</p>
          )}
          <button
            disabled={busy(bidPhase) || !bidAmount || !bidMessage.trim()}
            onClick={async () => {
              await placeBid(jobId, Number(bidAmount), bidMessage.trim());
              setBidAmount(""); setBidMessage(""); resetBid(); refresh();
            }}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {busy(bidPhase) ? <Loader2 size={14} className="animate-spin" /> : null}
            Place bid
          </button>
        </div>
      )}
    </div>
  );
}
