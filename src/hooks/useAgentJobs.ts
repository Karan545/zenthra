"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { agenticCommerceAbi, type OnChainJob } from "@/config/abis";
import {
  agenticCommerceAddress,
  isDeployedAddress,
} from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { getArcPublicClient } from "@/lib/arcClient";
import {
  getLocalJobsForAgent,
  JOBS_UPDATED_EVENT,
  type LocalJobRecord,
  upsertLocalJob,
} from "@/lib/localErc8183Jobs";

export type AgentJobView = {
  jobId: number;
  onChain: OnChainJob;
  local?: LocalJobRecord;
};

/**
 * Load ERC-8183 jobs related to an agent (provider = agent owner).
 * Merges local cache + on-chain getJob + optional JobCreated logs.
 */
export function useAgentJobs(agentId: number, providerAddress?: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(JOBS_UPDATED_EVENT, bump);
    return () => window.removeEventListener(JOBS_UPDATED_EVENT, bump);
  }, []);

  const provider = (providerAddress || "").toLowerCase();

  const query = useQuery({
    queryKey: [
      "zenthra",
      "agent-jobs",
      arcTestnet.id,
      agentId,
      provider,
      tick,
    ],
    enabled:
      agentId > 0 &&
      Boolean(provider) &&
      isDeployedAddress(agenticCommerceAddress),
    staleTime: 12_000,
    queryFn: async (): Promise<AgentJobView[]> => {
      const client = getArcPublicClient();
      const local = getLocalJobsForAgent(agentId);
      const idSet = new Set<number>(local.map((j) => j.jobId));

      // Indexed JobCreated logs for this provider (chunked to avoid RPC limits)
      try {
        const latest = await client.getBlockNumber();
        const span = BigInt(80_000);
        const fromBlock = latest > span ? latest - span : BigInt(0);
        const logs = await client.getLogs({
          address: agenticCommerceAddress,
          event: {
            type: "event",
            name: "JobCreated",
            inputs: [
              { name: "jobId", type: "uint256", indexed: true },
              { name: "client", type: "address", indexed: true },
              { name: "provider", type: "address", indexed: true },
              { name: "evaluator", type: "address", indexed: false },
              { name: "expiredAt", type: "uint256", indexed: false },
              { name: "hook", type: "address", indexed: false },
            ],
          },
          args: {
            provider: provider as Address,
          },
          fromBlock,
          toBlock: latest,
        });
        for (const log of logs) {
          const jobId = Number(log.args.jobId);
          if (Number.isFinite(jobId)) {
            idSet.add(jobId);
            if (!local.find((l) => l.jobId === jobId)) {
              upsertLocalJob({
                jobId,
                agentId,
                provider,
                client: (log.args.client as string) || "",
                evaluator: (log.args.evaluator as string) || "",
                description: "",
                proposedBudgetUsdc: 0,
              });
            }
          }
        }
      } catch {
        // RPC log range limits — local cache still works
      }

      const ids = Array.from(idSet).sort((a, b) => b - a).slice(0, 40);
      const localMap = new Map(
        getLocalJobsForAgent(agentId).map((j) => [j.jobId, j] as const)
      );

      const views: AgentJobView[] = [];
      await Promise.all(
        ids.map(async (jobId) => {
          try {
            const onChain = (await client.readContract({
              address: agenticCommerceAddress,
              abi: agenticCommerceAbi,
              functionName: "getJob",
              args: [BigInt(jobId)],
            })) as OnChainJob;
            if (!onChain || Number(onChain.id) === 0) return;
            // Only show jobs for this agent provider
            if (onChain.provider.toLowerCase() !== provider) return;
            views.push({
              jobId,
              onChain,
              local: localMap.get(jobId),
            });
          } catch {
            // skip
          }
        })
      );

      views.sort((a, b) => b.jobId - a.jobId);
      return views;
    },
  });

  const refetch = useCallback(async () => {
    setTick((n) => n + 1);
    await query.refetch();
  }, [query]);

  const jobs = useMemo(() => query.data ?? [], [query.data]);

  return {
    jobs,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch,
  };
}
