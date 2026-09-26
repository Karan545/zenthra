"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { Job } from "@/types/job";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { jobStatusLabel } from "@/config/abis";
import { Clock, Users } from "lucide-react";

interface JobCardProps {
  job: Job;
  index?: number;
  onBid?: (job: Job) => void;
  onViewBids?: (job: Job) => void;
  isPoster?: boolean;
}

const STATUS_STYLES: Record<number, string> = {
  0: "bg-[#e8f4ec] text-[#1a7a45] border-[#c4e4cc]",   // Open — green
  1: "bg-[#f0e8f4] text-[#6a3c9a] border-[#dcc4ec]",   // Winner Selected — purple
  2: "bg-[#e8eef8] text-[#2256a0] border-[#c4d4ec]",   // Accepted — blue
  3: "bg-[#f0ebe3] text-headline-deep border-border",    // Completed — warm
  4: "bg-[#f4e8e8] text-danger border-[#ecc4c4]",       // Cancelled — red
  5: "bg-[#f8f0e0] text-warning border-[#ecdcb4]",      // Disputed — amber
  6: "bg-surface-muted text-muted border-border",        // Resolved — grey
};

export function JobCard({ job, index = 0, onBid, onViewBids, isPoster = false }: JobCardProps) {
  const isOpen = job.status === 0;
  const hasWinner = job.status >= 1 && job.status !== 4;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.28), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface rounded-2xl p-5 sm:p-6",
        "transition-[box-shadow,border-color,transform] duration-300",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft-md"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {/* Status + deadline row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]",
                STATUS_STYLES[job.status] ?? STATUS_STYLES[0]
              )}
            >
              {jobStatusLabel(job.status)}
            </span>
            {job.deadline !== "No deadline" && (
              <span className="flex items-center gap-1 text-[12px] text-muted-soft">
                <Clock size={11} strokeWidth={1.75} />
                {job.deadline}
              </span>
            )}
          </div>

          <h3 className="mt-2.5 text-[15px] font-semibold tracking-tight text-foreground">
            {job.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
            {job.description}
          </p>

          {/* Capabilities */}
          {job.requiredCapabilities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.requiredCapabilities.slice(0, 5).map((cap) => (
                <span
                  key={cap}
                  className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-[11px] text-muted"
                >
                  {cap}
                </span>
              ))}
              {job.requiredCapabilities.length > 5 && (
                <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-soft">
                  +{job.requiredCapabilities.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price + actions */}
        <div className="flex shrink-0 flex-row items-end justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-left sm:text-right">
            <p className="text-[11px] uppercase tracking-[0.04em] text-muted-soft">Bounty</p>
            <p className="mt-0.5 font-display text-2xl tabular-nums text-headline">
              {job.bounty.toFixed(2)}
              <span className="ml-1 text-sm font-sans font-normal text-muted">USDC</span>
            </p>
            <p className="mt-1 flex items-center justify-end gap-1 text-[12px] text-muted-soft">
              <Users size={11} strokeWidth={1.75} />
              {job.bidsCount} bid{job.bidsCount === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 sm:items-end">
            {isOpen && !isPoster && onBid && (
              <Button type="button" variant="primary" size="sm" onClick={() => onBid(job)}>
                Bid
              </Button>
            )}
            {isPoster && job.bidsCount > 0 && onViewBids && (
              <Button type="button" variant="secondary" size="sm" onClick={() => onViewBids(job)}>
                View bids
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-4 border-t border-border pt-3 font-mono text-[11px] text-muted-soft">
        Posted by {shortenAddress(job.poster)}
        {hasWinner && job.winner && job.winner !== "0x0000000000000000000000000000000000000000" && (
          <span className="ml-3">
            · Winner {shortenAddress(job.winner)}
          </span>
        )}
      </p>
    </motion.article>
  );
}
