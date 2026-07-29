import type { Job } from "@/types/job";
import { MOCK_JOBS } from "@/data/mockJobs";

const STORAGE_KEY = "zenthra.postedJobs.v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPostedJobs(): Job[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Job[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePostedJob(job: Job): void {
  if (!canUseStorage()) return;
  const existing = getPostedJobs().filter((j) => j.id !== job.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([job, ...existing]));
}

export function getAllJobs(): Job[] {
  const local = getPostedJobs();
  const localIds = new Set(local.map((j) => j.id));
  return [...local, ...MOCK_JOBS.filter((j) => !localIds.has(j.id))];
}

export function nextJobId(): number {
  const all = getAllJobs();
  return all.reduce((max, j) => Math.max(max, j.id), 0) + 1;
}
