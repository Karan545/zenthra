"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { useJobActions } from "@/hooks/useJobActions";
import { TxHashList } from "@/components/jobs/TxHashList";
import { formatWalletError } from "@/lib/walletErrors";
import type { Agent } from "@/types/agent";
import { isAddress } from "viem";

interface HireAgentPanelProps {
  agent: Agent;
  onCreated?: () => void;
}

/**
 * Client flow: create ERC-8183 job for this agent (provider = agent owner).
 * If the connected wallet is the provider, also setBudget + fund in one flow.
 */
export function HireAgentPanel({ agent, onCreated }: HireAgentPanelProps) {
  const { isConnected, address } = useAccount();
  const { createAndMaybeFundJob, isPending } = useJobActions();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(
    agent.pricePerTask > 0 ? String(agent.pricePerTask) : "1"
  );
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [result, setResult] = useState<{
    jobId: number;
    createHash: string;
    setBudgetHash?: string;
    approveHash?: string;
    fundHash?: string;
    autoFunded: boolean;
  } | null>(null);

  const providerOk = isAddress(agent.owner || "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!providerOk) {
      setError("This agent has no valid owner address to hire.");
      return;
    }
    const budgetUsdc = Number(budget);
    try {
      const res = await createAndMaybeFundJob(
        {
          agentId: agent.id,
          agentName: agent.name,
          provider: agent.owner as `0x${string}`,
          description,
          budgetUsdc,
        },
        setPhase
      );
      setResult(res);
      setPhase(null);
      onCreated?.();
    } catch (err) {
      setPhase(null);
      setError(formatWalletError(err));
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
      >
        <Briefcase size={16} strokeWidth={1.75} />
        Hire Agent
      </Button>
    );
  }

  return (
    <div className="card-surface w-full max-w-xl rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
            ERC-8183 job
          </p>
          <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-foreground">
            Post a job &amp; fund escrow
          </h3>
          <p className="mt-1.5 text-sm text-muted">
            Creates an on-chain job with this agent as provider. You are the
            client and evaluator (you can complete after deliverable).
          </p>
        </div>
        <button
          type="button"
          className="text-[13px] text-muted hover:text-foreground"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>

      {!isConnected ? (
        <div className="mt-5">
          <ConnectWallet size="md" />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Textarea
            label="Job description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the work you need this agent to complete…"
            rows={4}
          />
          <Input
            label="Budget (USDC)"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            hint="Escrowed in Arc USDC when the job is funded."
          />

          {address &&
          agent.owner &&
          address.toLowerCase() === agent.owner.toLowerCase() ? (
            <p className="rounded-lg border border-border bg-[#faf8f5] px-3 py-2 text-[12px] text-muted">
              You own this agent — budget will be set and funded in the same
              flow (provider + client = you).
            </p>
          ) : (
            <p className="rounded-lg border border-border bg-[#faf8f5] px-3 py-2 text-[12px] text-muted">
              After create, the agent owner must call{" "}
              <span className="font-medium text-foreground">setBudget</span>{" "}
              on-chain (provider-only). Then you can fund the escrow.
            </p>
          )}

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          {phase ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" />
              {phase === "create" && "Creating job…"}
              {phase === "confirming" && "Confirming create…"}
              {phase === "setBudget" && "Setting budget…"}
              {phase === "approve" && "Approving USDC…"}
              {phase === "fund" && "Funding escrow…"}
              {!["create", "confirming", "setBudget", "approve", "fund"].includes(
                phase
              ) && phase}
            </p>
          ) : null}

          {result ? (
            <div className="rounded-xl border border-border bg-[#faf8f5] px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                Job #{result.jobId}{" "}
                {result.autoFunded ? "created & funded" : "created"}
              </p>
              {!result.autoFunded ? (
                <p className="mt-1 text-[13px] text-muted">
                  Waiting for agent to set budget, then fund from the job card
                  below.
                </p>
              ) : null}
              <TxHashList
                entries={[
                  { label: "Create", hash: result.createHash },
                  { label: "Set budget", hash: result.setBudgetHash },
                  { label: "Approve USDC", hash: result.approveHash },
                  { label: "Fund", hash: result.fundHash },
                ]}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isPending || !providerOk}
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                "Create job"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
