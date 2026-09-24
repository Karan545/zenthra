/**
 * Local cache of ERC-8183 jobs created/touched in this browser.
 * Complements on-chain reads (fast UI + proposed budgets).
 */

export type LocalJobRecord = {
  jobId: number;
  agentId: number;
  agentName?: string;
  description: string;
  /** Client-proposed budget in display USDC (provider must on-chain setBudget). */
  proposedBudgetUsdc: number;
  client: string;
  provider: string;
  evaluator: string;
  createTxHash?: string;
  setBudgetTxHash?: string;
  approveTxHash?: string;
  fundTxHash?: string;
  submitTxHash?: string;
  completeTxHash?: string;
  rejectTxHash?: string;
  deliverableText?: string;
  deliverableHash?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "zenthra.erc8183.jobs.v1";
export const JOBS_UPDATED_EVENT = "zenthra:erc8183-jobs-updated";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function notifyJobsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(JOBS_UPDATED_EVENT));
}

export function getLocalErc8183Jobs(): LocalJobRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (j): j is LocalJobRecord =>
        !!j &&
        typeof j === "object" &&
        typeof (j as LocalJobRecord).jobId === "number"
    );
  } catch {
    return [];
  }
}

export function getLocalJobsForAgent(agentId: number): LocalJobRecord[] {
  return getLocalErc8183Jobs()
    .filter((j) => j.agentId === agentId)
    .sort((a, b) => b.jobId - a.jobId);
}

export function getLocalJob(jobId: number): LocalJobRecord | undefined {
  return getLocalErc8183Jobs().find((j) => j.jobId === jobId);
}

export function upsertLocalJob(
  patch: Partial<LocalJobRecord> & { jobId: number }
): LocalJobRecord {
  const all = getLocalErc8183Jobs();
  const idx = all.findIndex((j) => j.jobId === patch.jobId);
  const now = new Date().toISOString();
  if (idx < 0) {
    const { jobId, ...rest } = patch;
    const created: LocalJobRecord = {
      agentId: 0,
      description: "",
      proposedBudgetUsdc: 0,
      client: "",
      provider: "",
      evaluator: "",
      ...rest,
      jobId,
      createdAt: now,
      updatedAt: now,
    };
    all.unshift(created);
    if (canUseStorage()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 200)));
    }
    notifyJobsUpdated();
    return created;
  }
  const next: LocalJobRecord = {
    ...all[idx],
    ...patch,
    jobId: patch.jobId,
    updatedAt: now,
  };
  all[idx] = next;
  if (canUseStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
  notifyJobsUpdated();
  return next;
}
