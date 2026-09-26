"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CuratedAgent } from "@/data/curatedAgents";

interface CuratedAgentRowProps {
  agent: CuratedAgent;
  index?: number;
}

/**
 * Horizontal card for a curated launch-partner agent.
 * Shows: avatar, name, tagline, capabilities, price, Verified badge, x402 link.
 */
export function CuratedAgentRow({ agent, index = 0 }: CuratedAgentRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface-strong rounded-2xl p-5 sm:p-6",
        "transition-[box-shadow,border-color] duration-300",
        "hover:border-border-strong hover:shadow-soft-md"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        {/* Avatar */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[15px] font-semibold tracking-tight text-foreground/70",
            agent.accentClass
          )}
        >
          {agent.initials}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
              {agent.name}
            </h3>
            <span className="badge-verified flex items-center gap-1">
              <ShieldCheck size={10} strokeWidth={2.5} />
              Verified
            </span>
            {agent.x402Endpoint && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-soft">
                x402
              </span>
            )}
          </div>

          <p className="text-[13px] leading-relaxed text-muted">{agent.description}</p>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-[11px] text-muted"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex shrink-0 flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.04em] text-muted-soft">Per task</p>
            <p className="mt-0.5 font-display text-xl tabular-nums text-headline">
              {agent.pricePerTask}
              <span className="ml-1 text-sm font-sans font-normal text-muted">USDC</span>
            </p>
          </div>

          {agent.x402Endpoint && (
            agent.x402Endpoint.startsWith("/") ? (
              <Link
                href={agent.x402Endpoint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Try it
                <ArrowRight size={12} strokeWidth={1.75} />
              </Link>
            ) : (
              <a
                href={agent.x402Endpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Hire
                <ExternalLink size={12} strokeWidth={1.75} />
              </a>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
