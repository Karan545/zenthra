"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { FeedbackSection } from "@/components/agent/FeedbackSection";
import { useCuratorListings } from "@/hooks/useCuratorListings";
import {
  AGENTS_UPDATED_EVENT,
  getRegisteredAgents,
} from "@/lib/localAgents";
import { categoryNamesFromSlugs } from "@/lib/categories";
import {
  pickDisplayDescription,
  pickDisplayName,
} from "@/lib/agentDisplay";
import { shortenAddress } from "@/lib/format";
import type { Agent } from "@/types/agent";

interface AgentProfileProps {
  id: string;
}

function displayName(agent: Pick<Agent, "id" | "name">): string {
  return pickDisplayName(agent.id, agent.name);
}

function resolveAgent(id: string, listed: Agent[]): Agent | null {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return null;

  const local = getRegisteredAgents().find((a) => a.id === numeric);
  const fromCurator = listed.find((a) => a.id === numeric);

  if (!local && !fromCurator) return null;

  // Prefer Identity Registry / curator-enriched fields (works for all users)
  const name = pickDisplayName(numeric, fromCurator?.name, local?.name);
  const description = pickDisplayDescription(
    fromCurator?.description,
    local?.description
  );

  return {
    ...local,
    ...fromCurator,
    id: numeric,
    name,
    description,
    image: fromCurator?.image || local?.image,
    capabilities:
      fromCurator?.capabilities?.length
        ? fromCurator.capabilities
        : local?.capabilities ?? [],
    categories:
      local?.categories?.length
        ? local.categories
        : fromCurator?.categories,
    reputation: fromCurator?.reputation ?? local?.reputation ?? 0,
    pricePerTask: fromCurator?.pricePerTask ?? local?.pricePerTask ?? 0,
    owner: fromCurator?.owner || local?.owner || "",
    x402Endpoint: local?.x402Endpoint || fromCurator?.x402Endpoint,
    isOnChain: true,
    isListedOnZenthra:
      fromCurator?.isListedOnZenthra ?? local?.isListedOnZenthra ?? false,
    isFeatured: fromCurator?.isFeatured ?? local?.isFeatured,
    stakeAmount: fromCurator?.stakeAmount ?? local?.stakeAmount,
    listedAt: fromCurator?.listedAt ?? local?.listedAt,
    txHash: local?.txHash,
    listTxHash: local?.listTxHash,
  };
}

export function AgentProfile({ id }: AgentProfileProps) {
  const {
    agents: listed,
    isLoading: listingsLoading,
    refetch,
  } = useCuratorListings();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(AGENTS_UPDATED_EVENT, bump);
    return () => window.removeEventListener(AGENTS_UPDATED_EVENT, bump);
  }, []);

  const agent = useMemo(() => {
    void tick;
    return resolveAgent(id, listed);
  }, [id, listed, tick]);

  if (listingsLoading && !agent) {
    return (
      <div className="page-container py-16">
        <div className="card-surface h-48 animate-pulse rounded-2xl bg-[#ebe4d9]/50" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="page-container py-16">
        <div className="card-surface rounded-2xl px-6 py-14 text-center sm:px-10">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
            Not found
          </p>
          <h1 className="mt-3 font-display text-3xl text-headline">
            Agent not found
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            We couldn&apos;t find agent{" "}
            <span className="font-mono text-foreground">#{id}</span>. It may
            not be listed yet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/" variant="primary" size="md">
              Back to directory
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => void refetch()}
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const name = displayName(agent);
  const categoryLabels = categoryNamesFromSlugs(agent.categories ?? []);

  const scrollToFeedback = () => {
    document
      .getElementById("leave-feedback")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <section className="border-b border-border bg-background-warm">
        <div className="page-container py-10 sm:py-14">
          <Button href="/" variant="ghost" size="sm" className="mb-6 -ml-2">
            <ArrowLeft size={15} strokeWidth={1.75} />
            Directory
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between"
          >
            <div className="flex min-w-0 flex-1 gap-5">
              <AgentAvatar name={name} image={agent.image} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
                    Agent #{agent.id}
                  </p>
                  {agent.isListedOnZenthra ? (
                    <span className="rounded-md bg-[#f0ebe3] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-headline-deep">
                      Listed on Zenthra
                    </span>
                  ) : null}
                  {agent.isFeatured ? (
                    <span className="rounded-md bg-charcoal px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Featured
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-1 font-display text-3xl text-headline sm:text-4xl">
                  {name}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                  {agent.description}
                </p>
                {agent.owner ? (
                  <p className="mt-3 font-mono text-[12px] text-muted-soft">
                    Owner {shortenAddress(agent.owner)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="card-surface shrink-0 rounded-2xl px-5 py-4 text-center sm:min-w-[150px]">
              <p className="text-[11px] uppercase tracking-[0.04em] text-muted-soft">
                Price / task
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {agent.pricePerTask}{" "}
                <span className="text-sm font-normal text-muted">USDC</span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={scrollToFeedback}
            >
              <MessageSquare size={16} strokeWidth={1.75} />
              Leave Feedback
            </Button>
            {agent.x402Endpoint ? (
              <a
                href={agent.x402Endpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-transparent px-5 text-sm font-medium text-foreground transition-colors hover:border-headline hover:bg-white"
              >
                <Sparkles size={16} strokeWidth={1.75} />
                x402 endpoint
              </a>
            ) : null}
          </motion.div>
        </div>
      </section>

      <div className="page-container py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-8">
          {categoryLabels.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-surface rounded-2xl p-6 sm:p-7"
            >
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Categories
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {categoryLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-muted"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </motion.section>
          ) : null}

          {agent.capabilities.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-surface rounded-2xl p-6 sm:p-7"
            >
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Capabilities
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-lg bg-[#f0ebe3] px-3 py-1.5 text-[12px] font-medium text-headline-deep"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </motion.section>
          ) : null}

          <FeedbackSection agent={agent} />
        </div>
      </div>
    </div>
  );
}
