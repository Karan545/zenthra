"use client";

import { JOB_STATUS_LABEL, JOB_STATUS_COLOR, type EscrowJobStatus } from "@/config/abis/jobEscrow";

export function JobStatusBadge({ status }: { status: number }) {
  const s = status as EscrowJobStatus;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${JOB_STATUS_COLOR[s] ?? "text-slate-600 bg-slate-100"}`}>
      {JOB_STATUS_LABEL[s] ?? "Unknown"}
    </span>
  );
}
