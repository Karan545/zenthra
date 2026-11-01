"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Plus, X } from "lucide-react";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { JobList } from "@/components/escrow/JobList";
import { JobDetail } from "@/components/escrow/JobDetail";
import { CreateJobForm } from "@/components/escrow/CreateJobForm";

export default function EscrowPage() {
  const { isConnected } = useAccount();
  const [selectedJob, setSelectedJob] = useState<bigint | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">JE</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 tracking-tight">JobEscrow</span>
            <span className="hidden sm:inline text-xs text-slate-400 font-normal">on Arc Mainnet</span>
          </div>
          <ConnectWallet size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {!isConnected ? (
          /* ── Not connected ── */
          <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">JE</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
                Job Escrow
              </h1>
              <p className="text-slate-500 text-sm max-w-sm text-pretty">
                Post jobs, bid, deliver work, and release USDC — all trustlessly on Arc Mainnet.
              </p>
            </div>
            <ConnectWallet size="sm" />
          </div>
        ) : (
          /* ── Connected ── */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            {/* Left: job list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Jobs</h2>
                <button
                  onClick={() => { setShowCreate((v) => !v); setSelectedJob(null); }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
                >
                  {showCreate ? <X size={12} /> : <Plus size={12} />}
                  {showCreate ? "Cancel" : "Post job"}
                </button>
              </div>

              <JobList onSelect={(id) => { setSelectedJob(id); setShowCreate(false); }} />
            </div>

            {/* Right: create form or job detail */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 min-h-[400px]">
              {showCreate ? (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-900">Post a new job</h2>
                  <CreateJobForm onCreated={() => setShowCreate(false)} />
                </div>
              ) : selectedJob !== null ? (
                <JobDetail
                  jobId={selectedJob}
                  onBack={() => setSelectedJob(null)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
                  <p className="text-sm text-slate-400 text-pretty max-w-xs">
                    Select a job from the list to view details, place a bid, or manage work delivery.
                  </p>
                  <p className="text-xs text-slate-300">Or post a new job to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Contract info footer */}
      <footer className="border-t border-slate-100 mt-16 py-6">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>JobEscrow — Arc Mainnet (chain 5042)</p>
          <a
            href={`https://explorer.arc.io/address/${process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:text-slate-600 transition-colors"
          >
            {process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? "Contract not set"}
          </a>
        </div>
      </footer>
    </div>
  );
}
