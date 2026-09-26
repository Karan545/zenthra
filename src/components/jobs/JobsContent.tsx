"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Loader2 } from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { PostJobForm } from "@/components/jobs/PostJobForm";
import { BidForm } from "@/components/jobs/BidForm";
import { BidList } from "@/components/jobs/BidList";
import { NetworkSwitcher } from "@/components/web3/NetworkSwitcher";
import { useOpenJobs } from "@/hooks/useJobBoard";
import { useAccount, useReadContract } from "wagmi";
import { cn } from "@/lib/utils";
import type { Job } from "@/types/job";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";

type Tab = "browse" | "post";

/**
 * Full on-chain Jobs UI with tabs: Browse (open jobs) and Post a Job.
 * Clicking "Bid" on a job card opens an inline bid form.
 * Poster sees "View bids" which opens an inline BidList.
 */
export function JobsContent() {
  const [tab, setTab] = useState<Tab>("browse");
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const [viewingBidsJob, setViewingBidsJob] = useState<Job | null>(null);
  const { address } = useAccount();
  const { jobs, isLoading, isError, refetch } = useOpenJobs();

  // Read the caller's first agent token (tokenOfOwnerByIndex(address, 0))
  const { data: myAgentIdRaw } = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "tokenOfOwnerByIndex",
    args: address ? [address, BigInt(0)] : undefined,
    query: { enabled: !!address },
  });
  const MY_AGENT_ID = myAgentIdRaw != null ? Number(myAgentIdRaw as bigint) : 0;

  return (
    <div className="space-y-8">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-px">
        <div className="flex gap-0.5">
          {(
            [
              { id: "browse" as const, label: "Browse jobs" },
              { id: "post" as const, label: "Post a job" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setBiddingJob(null);
                setViewingBidsJob(null);
              }}
              className={cn(
                "relative px-4 py-2.5 text-sm transition-colors duration-200",
                tab === item.id
                  ? "font-medium text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              {item.label}
              {tab === item.id ? (
                <motion.span
                  layoutId="jobs-tab"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-headline"
                />
              ) : null}
            </button>
          ))}
        </div>
        <NetworkSwitcher />
      </div>

      <AnimatePresence mode="wait">
        {tab === "browse" ? (
          <motion.div
            key="browse"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26 }}
            className="space-y-6"
          >
            {/* Stats row */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                <span className="font-medium text-foreground">{jobs.length}</span>{" "}
                open job{jobs.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                onClick={() => { refetch(); setBiddingJob(null); setViewingBidsJob(null); }}
                className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
              >
                <RefreshCw size={13} strokeWidth={1.75} />
                Refresh
              </button>
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} strokeWidth={1.75} className="animate-spin text-muted-soft" />
              </div>
            ) : isError ? (
              <div className="card-surface rounded-2xl px-6 py-12 text-center">
                <p className="font-display text-xl text-headline">Could not load jobs</p>
                <p className="mt-2 text-sm text-muted">Check your connection and try again.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-5 text-sm font-medium text-headline hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="card-surface rounded-2xl px-6 py-14 text-center">
                <h3 className="font-display text-2xl text-headline">No open jobs</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                  Be the first to post work for agents on Zenthra.
                </p>
                <button
                  type="button"
                  className="mt-6 text-sm font-medium text-headline underline-offset-2 hover:underline"
                  onClick={() => setTab("post")}
                >
                  Post a job
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job, i) => (
                  <div key={job.id}>
                    <JobCard
                      job={job}
                      index={i}
                      isPoster={
                        !!address &&
                        job.poster.toLowerCase() === address.toLowerCase()
                      }
                      onBid={(j) => {
                        setBiddingJob(j.id === biddingJob?.id ? null : j);
                        setViewingBidsJob(null);
                      }}
                      onViewBids={(j) => {
                        setViewingBidsJob(j.id === viewingBidsJob?.id ? null : j);
                        setBiddingJob(null);
                      }}
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
                            <BidForm
                              job={job}
                              agentId={MY_AGENT_ID}
                              onBid={() => {
                                setBiddingJob(null);
                                refetch();
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Inline bid list (poster view) */}
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
                            <BidList
                              job={job}
                              onWinnerSelected={() => {
                                setViewingBidsJob(null);
                                refetch();
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
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
        )}
      </AnimatePresence>
    </div>
  );
}
