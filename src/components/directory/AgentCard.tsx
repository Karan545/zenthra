"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Agent } from "@/types/agent";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { categoryNamesFromSlugs } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  index?: number;
}

function formatPrice(pricePerTask: number): string {
  if (!Number.isFinite(pricePerTask)) return "—";
  if (Number.isInteger(pricePerTask)) return `${pricePerTask} USDC`;
  return `${pricePerTask.toFixed(2)} USDC`;
}

function displayName(agent: Agent): string {
  const n = agent.name?.trim();
  if (n && !/^Agent #\d+$/i.test(n)) return n;
  return `Agent #${agent.id}`;
}

export function AgentCard({ agent, index = 0 }: AgentCardProps) {
  const name = displayName(agent);
  const categoryLabels = categoryNamesFromSlugs(agent.categories ?? []).slice(
    0,
    3
  );
  // Prefer category chips; fall back to first capability tags
  const chips =
    categoryLabels.length > 0
      ? categoryLabels
      : agent.capabilities.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.04, 0.35),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={`/agent/${agent.id}`}
        className={cn(
          "group card-surface block h-full rounded-2xl p-5 sm:p-6",
          "transition-[box-shadow,border-color,transform] duration-300",
          "hover:-translate-y-1 hover:border-border-strong hover:shadow-soft-md",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-headline"
        )}
      >
        <div className="flex items-start gap-4">
          <AgentAvatar name={name} image={agent.image} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                    {name}
                  </h3>
                  {agent.isListedOnZenthra ? (
                    <span className="shrink-0 rounded-md bg-[#f0ebe3] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-headline-deep">
                      Listed on Zenthra
                    </span>
                  ) : null}
                  {agent.isFeatured ? (
                    <span className="shrink-0 rounded-md bg-charcoal px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Featured
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 font-mono text-[12px] text-muted-soft">
                  #{agent.id}
                </p>
              </div>
              <ArrowUpRight
                size={16}
                strokeWidth={1.6}
                className="mt-0.5 shrink-0 text-muted-soft transition-colors group-hover:text-headline"
              />
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted">
          {agent.description}
        </p>

        {chips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-[#f0ebe3] px-2 py-0.5 text-[11px] font-medium text-headline-deep"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.04em] text-muted-soft">
              Price / task
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {formatPrice(agent.pricePerTask)}
            </p>
          </div>
          {agent.isListedOnZenthra ? (
            <span className="text-[11px] text-muted-soft">On-chain listing</span>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}
