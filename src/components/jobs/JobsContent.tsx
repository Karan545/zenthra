"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Loader2, Search, Briefcase, Plus } from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { PostJobForm } from "@/components/jobs/PostJobForm";
import { BidForm } from "@/components/jobs/BidForm";
import { BidList } from "@/components/jobs/BidList";
import { MatchingAgents } from "@/components/jobs/MatchingAgents";
import { useOpenJobs } from "@/hooks/useJobBoard";
import { useAccount, useReadContract } from "wagmi";
import { cn } from "@/lib/utils";
import type { Job } from "@/types/job";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";

type Tab = "browse" | "mine" | "post";

const STATUS_FILTER_OPTIONS = [
  { value: "all",       label: "All" },
  { value: "0",         label: "Open" },
  { value: "1",         label: "In Progress" },
  { value: "2",         label: "Submitted" },
  { value: "3",         label: "Completed" },
  { value: "4",         label: "Rejected" },
  { value: "5",         label: "Cancelled" },
];

export function JobsContent() {
  const [tab, setTab] = useState<Tab>("browse");
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const [viewingBidsJob, setViewingBidsJob] = useState<Job | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { address } = useAccount();
  const { jobs, isLoading, isError, refetch } = useOpenJobs();

  const { data: myAgentIdRaw } = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "tokenOfOwnerByIndex",
    args: address ? [address, BigInt(0)] : undefined,
    query: { enabled: !!address },
  });
  const MY_AGENT_ID = myAgentIdRaw != null ? Number(myAgentIdRaw as bigint) : 0;

  function closeInline() {
    setBiddingJob(null);
    setViewingBidsJob(null);
  }

  // ─── Filtered job lists ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...jobs];
    if (statusFilter !== "all") list = list.filter((j) => j.status === Number(statusFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, search, statusFilter]);

  const myJobs = useMemo(
    () => jobs.filter((j) => address && j.poster.toLowerCase() === address.toLowerCase()),
    [jobs, address]
  );

  const openCount = jobs.filter((j) => j.status === 0).length;

  // ─── Shared job list renderer ─────────────────────────────────────────────
  function renderJobList(list: Job[]) {
    if (isLoading) return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} strokeWidth={1.75} className="animate-spin text-muted-soft" />
      </div>
    );
    if (isError) return (
      <div className="card-surface rounded-2xl px-6 py-12 text-center">
        <p className="font-display text-xl text-headline">Could not load jobs</p>
        <p className="mt-2 text-sm text-muted">Check your connection and try again.</p>
        <button type="button" onClick={() => refetch()} className="mt-5 text-sm font-medium text-headline hover:underline">Retry</button>
      </div>
    );
    if (list.length === 0) return (
      <div className="card-surface rounded-2xl px-6 py-14 text-center">
        <Briefcase size={32} strokeWidth={1.25} className="mx-auto mb-4 text-muted-soft" />
        <h3 className="font-display text-xl text-headline">
          {search || statusFilter !== "all" ? "No matching jobs" : "No jobs yet"}
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          {search || statusFilter !== "all"
            ? "Try a different search or filter."
            : "Be the first to post work for agents on Zenthra."}
        </p>
        {!search && statusFilter === "all" && (
          <button type="button" onClick={() => { setTab("post"); closeInline(); }} className="mt-6 text-sm font-medium text-headline underline-offset-2 hover:underline">
            Post a job
          </button>
        )}
      </div>
    );
    return (
      <div className="space-y-4">
        {list.map((job, i) => {
          const isPoster = !!address && job.poster.toLowerCase() === address.toLowerCase();
          return (
            <div key={job.id}>
              <JobCard
                job={job}
                index={i}
                isPoster={isPoster}
                onRefresh={() => { refetch(); closeInline(); }}
                onBid={(j) => { setBiddingJob(j.id === biddingJob?.id ? null : j); setViewingBidsJob(null); }}
                onViewBids={(j) => { setViewingBidsJob(j.id === viewingBidsJob?.id ? null : j); setBiddingJob(null); }}
              />

              {/* Inline bid form */}
              <AnimatePresence>
                {biddingJob?.id === job.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.26 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 ml-4 border-l-2 border-border pl-4">
                      <BidForm job={job} agentId={MY_AGENT_ID} onBid={() => { setBiddingJob(null); refetch(); }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inline bid list + matching agents (poster view) */}
              <AnimatePresence>
                {viewingBidsJob?.id === job.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.26 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 ml-4 border-l-2 border-border pl-4">
                      <BidList job={job} onWinnerSelected={() => { setViewingBidsJob(null); refetch(); }} />
                      <MatchingAgents
                        jobId={job.id}
                        jobDescription={job.description}
                        jobBudget={job.bounty}
                        onBidPlaced={() => refetch()}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-px">
        <div className="flex gap-0.5">
          {(
            [
              { id: "browse" as const, label: "Browse jobs", count: openCount },
              { id: "mine" as const, label: "My jobs", count: address ? myJobs.length : null },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setTab(item.id); closeInline(); }}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors duration-200",
                tab === item.id ? "font-medium text-foreground" : "text-muted hover:text-foreground"
              )}
            >
              {item.label}
              {item.count != null && item.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  tab === item.id ? "bg-headline/10 text-headline" : "bg-surface-muted text-muted"
                )}>
                  {item.count}
                </span>
              )}
              {tab === item.id && (
                <motion.span layoutId="jobs-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-headline" />
              )}
            </button>
          ))}
        </div>

        {/* Post job button */}
        <button
          type="button"
          onClick={() => { setTab("post"); closeInline(); }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
            tab === "post"
              ? "bg-headline text-white"
              : "border border-border text-muted hover:border-border-strong hover:text-foreground"
          )}
        >
          <Plus size={14} strokeWidth={1.75} />
          Post a job
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "post" ? (
          <motion.div
            key="post"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26 }}
            className="mx-auto max-w-2xl"
          >
            <PostJobForm onPosted={() => { setTab("browse"); refetch(); }} />
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26 }}
            className="space-y-5"
          >
            {/* Search + filter row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs…"
                  className="w-full rounded-xl border border-border bg-surface-muted py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-soft focus:border-headline focus:outline-none focus:ring-1 focus:ring-headline/20 transition-colors"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground focus:border-headline focus:outline-none transition-colors"
              >
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => { refetch(); closeInline(); }}
                className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
              >
                <RefreshCw size={13} strokeWidth={1.75} />
                Refresh
              </button>
            </div>

            {/* Stats */}
            <p className="text-sm text-muted">
              <span className="font-medium text-foreground">
                {tab === "mine" ? myJobs.length : filtered.length}
              </span>{" "}
              {tab === "mine" ? "job" : "result"}{(tab === "mine" ? myJobs.length : filtered.length) === 1 ? "" : "s"}
              {tab === "browse" && ` · ${openCount} open`}
            </p>

            {renderJobList(tab === "mine" ? myJobs : filtered)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
