"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { JobCard } from "@/components/jobs/JobCard";
import { PostJobForm } from "@/components/jobs/PostJobForm";
import { getAllJobs } from "@/lib/localJobs";
import type { Job } from "@/types/job";
import { cn } from "@/lib/utils";

type Tab = "browse" | "post";

export function JobsContent() {
  const [tab, setTab] = useState<Tab>("browse");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bidMessage, setBidMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setJobs(getAllJobs());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-px">
        {(
          [
            { id: "browse" as const, label: "Browse Jobs" },
            { id: "post" as const, label: "Post a Job" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setBidMessage(null);
              if (item.id === "browse") refresh();
            }}
            className={cn(
              "relative px-4 py-2.5 text-sm transition-colors",
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

      <AnimatePresence mode="wait">
        {tab === "browse" ? (
          <motion.div
            key="browse"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="space-y-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                <span className="font-medium text-foreground">{jobs.length}</span>{" "}
                open listing{jobs.length === 1 ? "" : "s"}
              </p>
              {bidMessage ? (
                <p className="text-sm text-headline">{bidMessage}</p>
              ) : null}
            </div>

            {jobs.length === 0 ? (
              <div className="card-surface rounded-2xl px-6 py-14 text-center">
                <h3 className="font-display text-2xl text-headline">
                  No jobs yet
                </h3>
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
              <div className="grid gap-4">
                {jobs.map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={index}
                    onBid={(j) =>
                      setBidMessage(
                        `Bid noted on "${j.title}". Escrow bidding will connect next.`
                      )
                    }
                  />
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
            transition={{ duration: 0.28 }}
          >
            <PostJobForm
              onPosted={() => {
                refresh();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
