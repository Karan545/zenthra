"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { Job } from "@/types/job";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  index?: number;
  onBid?: (job: Job) => void;
}

export function JobCard({ job, index = 0, onBid }: JobCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "card-surface rounded-2xl p-5 sm:p-6",
        "transition-[box-shadow,border-color,transform] duration-300",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft-md"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#f0ebe3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-headline-deep">
              {job.status.replace("_", " ")}
            </span>
            <span className="text-[12px] text-muted-soft">
              Due {job.deadline}
            </span>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-foreground">
            {job.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
            {job.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.requiredCapabilities.slice(0, 4).map((cap) => (
              <span
                key={cap}
                className="rounded-md border border-border bg-white px-2 py-0.5 text-[11px] text-muted"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-end justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-left sm:text-right">
            <p className="text-[11px] uppercase tracking-[0.04em] text-muted-soft">
              Budget
            </p>
            <p className="mt-0.5 font-display text-2xl tabular-nums text-headline">
              {job.budget}
              <span className="ml-1 text-sm font-sans font-normal text-muted">
                {job.currency}
              </span>
            </p>
            <p className="mt-1 text-[12px] text-muted-soft">
              {job.bidsCount} bid{job.bidsCount === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onBid?.(job)}
          >
            Bid
          </Button>
        </div>
      </div>
      <p className="mt-4 border-t border-border pt-3 font-mono text-[11px] text-muted-soft">
        Poster {shortenAddress(job.poster)}
      </p>
    </motion.article>
  );
}
