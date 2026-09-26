"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Loader2, CheckCircle2, PlusCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { usePostJob } from "@/hooks/useJobBoardWrite";
import type { JobDraft } from "@/types/job";

const EMPTY: JobDraft = {
  title: "",
  description: "",
  bounty: "",
  requiredCapabilities: [],
  deadline: "",
};

function validate(draft: JobDraft): Partial<Record<keyof JobDraft, string>> {
  const errors: Partial<Record<keyof JobDraft, string>> = {};
  if (!draft.title.trim()) errors.title = "Title is required.";
  const bounty = Number(draft.bounty);
  if (!draft.bounty.trim()) errors.bounty = "Bounty is required.";
  else if (!Number.isFinite(bounty) || bounty <= 0)
    errors.bounty = "Enter a positive bounty in USDC.";
  if (!draft.description.trim()) errors.description = "Description is required.";
  return errors;
}

interface PostJobFormProps {
  onPosted?: () => void;
}

export function PostJobForm({ onPosted }: PostJobFormProps) {
  const { isConnected } = useAccount();
  const { postJob, isPending } = usePostJob();

  const [draft, setDraft] = useState<JobDraft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof JobDraft, string>>>({});
  const [capInput, setCapInput] = useState("");
  const [posted, setPosted] = useState(false);
  const [err, setErr] = useState("");

  function setField<K extends keyof JobDraft>(key: K, value: JobDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function addCap() {
    const v = capInput.trim();
    if (!v || draft.requiredCapabilities.includes(v)) return;
    setField("requiredCapabilities", [...draft.requiredCapabilities, v]);
    setCapInput("");
  }

  function removeCap(cap: string) {
    setField("requiredCapabilities", draft.requiredCapabilities.filter((c) => c !== cap));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const errs = validate(draft);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const deadlineUnix = draft.deadline
        ? Math.floor(new Date(draft.deadline).getTime() / 1000)
        : 0;
      await postJob({
        title: draft.title.trim(),
        description: draft.description.trim(),
        requiredCapabilities: draft.requiredCapabilities,
        bountyUsdc: Number(draft.bounty),
        deadlineUnix,
        maxBids: 0,
      });
      setPosted(true);
      toast.success("Job posted on-chain.");
      onPosted?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setErr(msg.length > 160 ? msg.slice(0, 160) + "…" : msg);
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p className="text-sm text-[var(--color-text-muted)]">Connect your wallet to post a job.</p>
        <ConnectWallet />
      </div>
    );
  }

  if (posted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Job posted!</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Agents can now discover and bid on your job.
        </p>
        <Button variant="secondary" onClick={() => { setDraft(EMPTY); setPosted(false); }}>
          Post another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
          Job title <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="e.g. Audit my Solidity contract"
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
          error={errors.title}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <Textarea
          placeholder="Describe the work, deliverables, and any requirements."
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
          error={errors.description}
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
          Bounty (USDC) <span className="text-red-500">*</span>
        </label>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="10"
          value={draft.bounty}
          onChange={(e) => setField("bounty", e.target.value)}
          error={errors.bounty}
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          USDC is locked in escrow until you confirm delivery.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
          Required capabilities
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Solidity, Research"
            value={capInput}
            onChange={(e) => setCapInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCap(); } }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={addCap}>
            <PlusCircle className="w-4 h-4" />
          </Button>
        </div>
        {draft.requiredCapabilities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {draft.requiredCapabilities.map((cap) => (
              <span
                key={cap}
                className="flex items-center gap-1 text-xs bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] px-2 py-1 rounded-full"
              >
                {cap}
                <button type="button" onClick={() => removeCap(cap)}>
                  <XCircle className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
          Deadline (optional)
        </label>
        <Input
          type="date"
          value={draft.deadline}
          onChange={(e) => setField("deadline", e.target.value)}
        />
      </div>

      {err && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Posting…</>
        ) : (
          "Post job — lock USDC bounty"
        )}
      </Button>
    </form>
  );
}
