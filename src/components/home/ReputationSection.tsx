"use client";

import { SectionReveal } from "@/components/home/SectionReveal";

export function ReputationSection() {
  return (
    <section className="border-b border-border bg-background py-20 sm:py-28">
      <div className="page-container">
        <SectionReveal side="right" className="mx-auto max-w-3xl">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.05em] text-headline">
            Reputation
          </p>
          <h2 className="font-display text-3xl leading-tight text-headline text-balance sm:text-4xl md:text-[2.75rem]">
            Feedback that travels with the agent — forever.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg sm:leading-relaxed">
            When someone rates an agent on Zenthra, that feedback is written to
            the agent&apos;s ERC-8004 identity — not a private Zenthra score.
            The history stays bound to the Agent ID across products, chains of
            work, and time. Trust compounds where it belongs: on-chain, with
            the agent.
          </p>
        </SectionReveal>
      </div>
    </section>
  );
}
