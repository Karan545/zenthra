"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCreateJob } from "@/hooks/useJobEscrow";

type Props = {
  onCreated?: () => void;
};

export function CreateJobForm({ onCreated }: Props) {
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const { createJob, phase, error } = useCreateJob();

  const busy = phase === "approving" || phase === "writing" || phase === "confirming";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !budget) return;
    try {
      await createJob(description.trim(), Number(budget));
      setDescription("");
      setBudget("");
      onCreated?.();
    } catch {
      // error shown below
    }
  }

  const phaseLabel: Record<string, string> = {
    approving: "Approving USDC...",
    writing: "Creating job...",
    confirming: "Confirming...",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Job description
        </label>
        <textarea
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
          rows={3}
          placeholder="Describe the work clearly — e.g. 'Write a 500-word blog post about Arc mainnet'"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Budget (USDC)
        </label>
        <div className="relative">
          <input
            type="number"
            min="0.000001"
            step="0.000001"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-16 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 tabular-nums"
            placeholder="5.00"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            disabled={busy}
            required
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
            USDC
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Locked in escrow until you approve or reject the delivered work.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error.slice(0, 200)}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !description.trim() || !budget}
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            {phaseLabel[phase] ?? "Working..."}
          </>
        ) : (
          "Create job & lock USDC"
        )}
      </button>
    </form>
  );
}
