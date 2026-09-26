"use client";
// Legacy ERC-8183 hook — replaced by useJobBoard in V2.
export function useAgentJobs() {
  return { jobs: [], isLoading: false, error: null };
}
