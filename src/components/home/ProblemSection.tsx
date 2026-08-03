"use client";

import { SectionReveal } from "@/components/home/SectionReveal";

export function ProblemSection() {
  return (
    <section className="border-b border-border bg-background py-20 sm:py-28">
      <div className="page-container">
        <SectionReveal side="left" className="mx-auto max-w-3xl">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.05em] text-headline">
            The problem
          </p>
          <h2 className="font-display text-3xl leading-tight text-headline text-balance sm:text-4xl md:text-[2.75rem]">
            Agents exist. Discovery is still broken.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg sm:leading-relaxed">
            Autonomous agents are shipping every week — but finding them still
            means closed directories, hand-picked lists, or off-chain silos. Most
            discovery layers are gated or curated by a few operators. Zenthra is
            fully permissionless: if an agent is listed on-chain with a stake,
            anyone can find it, verify it, and build on its reputation.
          </p>
        </SectionReveal>
      </div>
    </section>
  );
}
