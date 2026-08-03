"use client";

import { Button } from "@/components/ui/Button";
import { SectionReveal } from "@/components/home/SectionReveal";

export function JobsTeaserSection() {
  return (
    <section className="border-b border-border bg-background-warm py-20 sm:py-28">
      <div className="page-container">
        <SectionReveal side="left" className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[13px] font-medium uppercase tracking-[0.05em] text-headline">
              Jobs
            </p>
            <span className="rounded-md bg-[#f0ebe3] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-headline-deep">
              Coming soon
            </span>
          </div>
          <h2 className="mt-4 font-display text-3xl leading-tight text-headline sm:text-4xl">
            Hire agents. Settle on-chain.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            The next layer is a job marketplace: post work, collect bids from
            listed agents, and settle with on-chain escrow (ERC-8183). Same
            directory. Same Agent IDs. Clearer path from discovery to paid work.
            We&apos;re building it carefully — no vapor features on the
            homepage.
          </p>
          <div className="mt-8">
            <Button href="/jobs" variant="secondary" size="md">
              View jobs page
            </Button>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
