"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { JobStatus } from "@/config/abis/agenticCommerce";
import { useAgentJobs, type AgentJobView } from "@/hooks/useAgentJobs";
import { useJobActions } from "@/hooks/useJobActions";
import { TxHashList } from "@/components/jobs/TxHashList";
import {
  formatExpiry,
  formatJobBudget,
  jobStatusLabel,
  jobStatusTone,
} from "@/lib/jobFormat";
import { formatWalletError } from "@/lib/walletErrors";
import { shortenAddress } from "@/lib/format";
import type { Agent } from "@/types/agent";

interface AgentJobsSectionProps {
  agent: Agent;
}

function rolesOf(job: AgentJobView, address?: string) {
  const a = (address || "").toLowerCase();
  return {
    isClient: !!a && job.onChain.client.toLowerCase() === a,
    isProvider: !!a && job.onChain.provider.toLowerCase() === a,
    isEvaluator: !!a && job.onChain.evaluator.toLowerCase() === a,
  };
}

export function AgentJobsSection({ agent }: AgentJobsSectionProps) {
  const { address } = useAccount();
  const { jobs, isLoading, refetch, isFetching } = useAgentJobs(
    agent.id,
    agent.owner
  );
  const {
    setBudget,
    fundJob,
    submitDeliverable,
    completeJob,
    rejectJob,
    isPending,
  } = useJobActions();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [success, setSuccess] = useState<Record<number, string>>({});
  const [deliverableDraft, setDeliverableDraft] = useState<
    Record<number, string>
  >({});
  const [budgetDraft, setBudgetDraft] = useState<Record<number, string>>({});

  const run = async (jobId: number, fn: () => Promise<void>) => {
    setBusyId(jobId);
    setErrors((e) => ({ ...e, [jobId]: "" }));
    setSuccess((s) => ({ ...s, [jobId]: "" }));
    try {
      await fn();
      await refetch();
    } catch (err) {
      setErrors((e) => ({ ...e, [jobId]: formatWalletError(err) }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card-surface rounded-2xl p-6 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Jobs (ERC-8183)
          </h2>
          <p className="mt-1 text-sm text-muted">
            On-chain escrow jobs where this agent is the provider. Contract{" "}
            <span className="font-mono text-[12px] text-muted-soft">
              0x0747…4583
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 self-start text-[13px] text-muted hover:text-foreground"
        >
          <RefreshCw
            size={14}
            strokeWidth={1.75}
            className={isFetching ? "animate-spin" : undefined}
          />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-[#ebe4d9]/50" />
          <div className="h-24 animate-pulse rounded-xl bg-[#ebe4d9]/40" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-[#faf8f5] px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No jobs yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">
            Use Hire Agent to create an escrowed job for this agent on Arc.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {jobs.map((job) => {
            const status = job.onChain.status;
            const { isClient, isProvider, isEvaluator } = rolesOf(
              job,
              address
            );
            const isBusy = busyId === job.jobId || isPending;
            const proposed =
              job.local?.proposedBudgetUsdc ||
              (budgetDraft[job.jobId]
                ? Number(budgetDraft[job.jobId])
                : 0) ||
              agent.pricePerTask ||
              1;

            return (
              <li
                key={job.jobId}
                className="rounded-2xl border border-border bg-white px-4 py-4 sm:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[13px] font-medium text-foreground">
                        Job #{job.jobId}
                      </p>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${jobStatusTone(status)}`}
                      >
                        {jobStatusLabel(status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {job.onChain.description ||
                        job.local?.description ||
                        "—"}
                    </p>
                  </div>
                  <div className="text-right text-[12px] text-muted-soft">
                    <p>
                      Budget{" "}
                      <span className="font-medium text-foreground">
                        {formatJobBudget(job.onChain.budget)}
                      </span>
                    </p>
                    <p className="mt-0.5">
                      Expires {formatExpiry(job.onChain.expiredAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-1 text-[12px] text-muted sm:grid-cols-2">
                  <p>
                    Client{" "}
                    <span className="font-mono text-muted-soft">
                      {shortenAddress(job.onChain.client)}
                    </span>
                  </p>
                  <p>
                    Provider{" "}
                    <span className="font-mono text-muted-soft">
                      {shortenAddress(job.onChain.provider)}
                    </span>
                  </p>
                  <p>
                    Evaluator{" "}
                    <span className="font-mono text-muted-soft">
                      {shortenAddress(job.onChain.evaluator)}
                    </span>
                  </p>
                  {job.local?.proposedBudgetUsdc ? (
                    <p>
                      Proposed{" "}
                      <span className="font-medium text-foreground">
                        {job.local.proposedBudgetUsdc} USDC
                      </span>
                    </p>
                  ) : null}
                </div>

                <TxHashList
                  entries={[
                    { label: "Create", hash: job.local?.createTxHash },
                    { label: "Set budget", hash: job.local?.setBudgetTxHash },
                    { label: "Approve", hash: job.local?.approveTxHash },
                    { label: "Fund", hash: job.local?.fundTxHash },
                    { label: "Submit", hash: job.local?.submitTxHash },
                    { label: "Complete", hash: job.local?.completeTxHash },
                    { label: "Reject", hash: job.local?.rejectTxHash },
                  ]}
                />

                {/* Actions */}
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {/* Provider: set budget when Open & budget 0 */}
                  {status === JobStatus.Open &&
                  isProvider &&
                  job.onChain.budget === BigInt(0) ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <Input
                          label="Accept budget (USDC)"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            budgetDraft[job.jobId] ??
                            String(job.local?.proposedBudgetUsdc || proposed)
                          }
                          onChange={(e) =>
                            setBudgetDraft((d) => ({
                              ...d,
                              [job.jobId]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={isBusy}
                        onClick={() =>
                          void run(job.jobId, async () => {
                            const amt = Number(
                              budgetDraft[job.jobId] ??
                                job.local?.proposedBudgetUsdc ??
                                proposed
                            );
                            const hash = await setBudget(job.jobId, amt);
                            setSuccess((s) => ({
                              ...s,
                              [job.jobId]: `Budget set — ${hash}`,
                            }));
                          })
                        }
                      >
                        {isBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : null}
                        Set budget
                      </Button>
                    </div>
                  ) : null}

                  {/* Client: fund when Open & budget > 0 */}
                  {status === JobStatus.Open &&
                  isClient &&
                  job.onChain.budget > BigInt(0) ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      disabled={isBusy}
                      onClick={() =>
                        void run(job.jobId, async () => {
                          const res = await fundJob(
                            job.jobId,
                            job.onChain.budget
                          );
                          setSuccess((s) => ({
                            ...s,
                            [job.jobId]: `Funded — ${res.fundHash}`,
                          }));
                        })
                      }
                    >
                      {isBusy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      Fund job ({formatJobBudget(job.onChain.budget)})
                    </Button>
                  ) : null}

                  {status === JobStatus.Open &&
                  isClient &&
                  !isProvider &&
                  job.onChain.budget === BigInt(0) ? (
                    <p className="text-[13px] text-muted">
                      Waiting for the agent (provider) to set the on-chain
                      budget before you can fund escrow.
                    </p>
                  ) : null}

                  {/* Provider: submit deliverable */}
                  {status === JobStatus.Funded && isProvider ? (
                    <div className="space-y-2">
                      <Textarea
                        label="Deliverable"
                        rows={3}
                        placeholder="Link, summary, or deliverable text (hashed on-chain)…"
                        value={
                          deliverableDraft[job.jobId] ??
                          job.local?.deliverableText ??
                          ""
                        }
                        onChange={(e) =>
                          setDeliverableDraft((d) => ({
                            ...d,
                            [job.jobId]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={isBusy}
                        onClick={() =>
                          void run(job.jobId, async () => {
                            const text =
                              deliverableDraft[job.jobId] ??
                              job.local?.deliverableText ??
                              "";
                            const hash = await submitDeliverable(
                              job.jobId,
                              text
                            );
                            setSuccess((s) => ({
                              ...s,
                              [job.jobId]: `Submitted — ${hash}`,
                            }));
                          })
                        }
                      >
                        {isBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : null}
                        Submit deliverable
                      </Button>
                    </div>
                  ) : null}

                  {status === JobStatus.Funded && isClient && !isProvider ? (
                    <p className="text-[13px] text-muted">
                      Escrow funded. Waiting for the agent to submit a
                      deliverable.
                    </p>
                  ) : null}

                  {/* Evaluator: complete / reject */}
                  {status === JobStatus.Submitted && isEvaluator ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={isBusy}
                        onClick={() =>
                          void run(job.jobId, async () => {
                            const hash = await completeJob(job.jobId);
                            setSuccess((s) => ({
                              ...s,
                              [job.jobId]: `Completed — USDC released. ${hash}`,
                            }));
                          })
                        }
                      >
                        {isBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : null}
                        Complete &amp; release USDC
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        disabled={isBusy}
                        onClick={() =>
                          void run(job.jobId, async () => {
                            const hash = await rejectJob(job.jobId);
                            setSuccess((s) => ({
                              ...s,
                              [job.jobId]: `Rejected — ${hash}`,
                            }));
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}

                  {status === JobStatus.Completed ? (
                    <div className="rounded-xl border border-border bg-[#faf8f5] px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        Job completed — payment released to provider
                      </p>
                      <p className="mt-1 text-[13px] text-muted">
                        Leave on-chain reputation feedback for this agent
                        (ERC-8004).
                      </p>
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("leave-feedback")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              })
                          }
                        >
                          Leave reputation feedback
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {errors[job.jobId] ? (
                    <p className="text-sm text-red-600">{errors[job.jobId]}</p>
                  ) : null}
                  {success[job.jobId] ? (
                    <p className="break-all text-[12px] text-headline">
                      {success[job.jobId]}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
