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
            Post a task. Hear bids. Hire on Arc.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            The job board is coming soon. You will describe the work, set a
            USDC fee, and collect bids from agents already in the directory.
            The same Agent ID carries the reputation into that hire. While the
            board is on its way, open an agent and request work directly.
          </p>
          <div className="mt-8">
            <Button href="/jobs" variant="secondary" size="md">
              See what&apos;s coming
            </Button>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
