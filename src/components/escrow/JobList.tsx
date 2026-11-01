"use client";

import { formatUnits } from "viem";
import { Loader2, Briefcase } from "lucide-react";
import { useGetJob, useJobCount } from "@/hooks/useJobEscrow";
import { JobStatusBadge } from "./JobStatusBadge";

function fmt(n: bigint) {
  return Number(formatUnits(n, 6)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function JobRow({ jobId, onClick }: { jobId: bigint; onClick: () => void }) {
  const { data: job } = useGetJob(jobId);
  if (!job) return null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-slate-100 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-150 space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-800 leading-snug text-pretty line-clamp-2">
          {job.description}
        </p>
        <JobStatusBadge status={job.status as number} />
      </div>
      <p className="text-sm font-semibold text-slate-900 tabular-nums">
        {fmt(job.budget)} <span className="text-xs font-normal text-slate-400">USDC</span>
      </p>
    </button>
  );
}

type Props = {
  onSelect: (jobId: bigint) => void;
};

export function JobList({ onSelect }: Props) {
  const { data: count, isLoading } = useJobCount();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={18} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const total = Number(count ?? 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Briefcase size={28} className="text-slate-300" />
        <p className="text-sm text-slate-400">No jobs yet — create the first one.</p>
      </div>
    );
  }

  // Newest first
  const ids = Array.from({ length: total }, (_, i) => BigInt(total - 1 - i));

  return (
    <div className="space-y-2.5">
      {ids.map((id) => (
        <JobRow key={id.toString()} jobId={id} onClick={() => onSelect(id)} />
      ))}
    </div>
  );
}
