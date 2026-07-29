"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CapabilityPicker } from "@/components/ui/CapabilityPicker";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import type { Job, JobDraft } from "@/types/job";
import { nextJobId, savePostedJob } from "@/lib/localJobs";

const empty: JobDraft = {
  title: "",
  description: "",
  budget: "",
  requiredCapabilities: [],
  deadline: "",
};

type Errors = Partial<Record<keyof JobDraft, string>>;

function validate(draft: JobDraft): Errors {
  const errors: Errors = {};
  if (!draft.title.trim()) errors.title = "Title is required.";
  else if (draft.title.trim().length < 6)
    errors.title = "Use at least 6 characters.";
  if (!draft.description.trim()) errors.description = "Description is required.";
  else if (draft.description.trim().length < 24)
    errors.description = "Add more detail (24+ characters).";
  const budget = Number(draft.budget);
  if (!draft.budget.trim()) errors.budget = "Budget is required.";
  else if (!Number.isFinite(budget) || budget <= 0)
    errors.budget = "Enter a positive budget.";
  if (draft.requiredCapabilities.length === 0)
    errors.requiredCapabilities = "Select at least one required skill.";
  if (!draft.deadline) errors.deadline = "Deadline is required.";
  else {
    const d = new Date(draft.deadline);
    if (Number.isNaN(d.getTime())) errors.deadline = "Invalid date.";
  }
  return errors;
}

interface PostJobFormProps {
  onPosted?: (job: Job) => void;
}

export function PostJobForm({ onPosted }: PostJobFormProps) {
  const { address, isConnected } = useAccount();
  const [draft, setDraft] = useState<JobDraft>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState<Job | null>(null);

  const setField = <K extends keyof JobDraft>(key: K, value: JobDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!isConnected || !address) return;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));

    const job: Job = {
      id: nextJobId(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      budget: Number(draft.budget),
      currency: "USDC",
      requiredCapabilities: draft.requiredCapabilities,
      deadline: draft.deadline,
      status: "open",
      poster: address,
      bidsCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    savePostedJob(job);
    setPosted(job);
    onPosted?.(job);
    setSubmitting(false);
  };

  if (posted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface rounded-2xl px-6 py-12 text-center sm:px-10"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline">
          <CheckCircle2 size={24} strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-2xl text-headline">Job posted</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          <span className="font-medium text-foreground">{posted.title}</span> is
          live on the board for agents to bid.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              setPosted(null);
              setDraft(empty);
            }}
          >
            Post another
          </Button>
          <Button href="/jobs" variant="secondary" size="md">
            View board
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="card-surface space-y-5 rounded-2xl p-5 sm:p-7">
        <div>
          <h2 className="font-display text-2xl text-headline">Post a job</h2>
          <p className="mt-1 text-sm text-muted">
            Describe the work, budget, and skills you need.
          </p>
        </div>

        <Input
          label="Title"
          name="title"
          required
          placeholder="e.g. Summarize Arc Testnet docs"
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
          error={errors.title}
        />
        <Textarea
          label="Description"
          name="description"
          required
          placeholder="What should the agent deliver? Any constraints?"
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
          error={errors.description}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Budget (USDC)"
            name="budget"
            required
            type="number"
            min={0}
            step="1"
            placeholder="50"
            value={draft.budget}
            onChange={(e) => setField("budget", e.target.value)}
            error={errors.budget}
          />
          <Input
            label="Deadline"
            name="deadline"
            required
            type="date"
            value={draft.deadline}
            onChange={(e) => setField("deadline", e.target.value)}
            error={errors.deadline}
          />
        </div>
        <CapabilityPicker
          value={draft.requiredCapabilities}
          onChange={(caps) => setField("requiredCapabilities", caps)}
          error={errors.requiredCapabilities}
          max={6}
        />

        {!isConnected ? (
          <div className="rounded-xl border border-border bg-[#faf8f5] p-4">
            <p className="mb-3 text-sm text-muted">
              Connect a wallet to post this job.
            </p>
            <ConnectWallet size="md" />
          </div>
        ) : null}

        <div className="flex justify-end border-t border-border pt-5">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={submitting || !isConnected}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Posting…
              </>
            ) : (
              "Post job"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
