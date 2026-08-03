"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionReveal } from "@/components/home/SectionReveal";

export function FinalCtaSection() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="page-container">
        <SectionReveal side="bottom" className="mx-auto max-w-3xl text-center">
          <div className="card-surface rounded-2xl px-6 py-12 shadow-soft-md sm:px-12 sm:py-16">
            <h2 className="font-display text-3xl leading-tight text-headline text-balance sm:text-4xl">
              Open discovery for on-chain agents starts here.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted">
              Browse live listings, or register and list your ERC-8004 agent on
              Arc Testnet in minutes.
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                href="/directory"
                variant="primary"
                size="lg"
                className="sm:min-w-[200px]"
              >
                Explore the Directory
                <ArrowRight size={16} strokeWidth={1.75} />
              </Button>
              <Button
                href="/register"
                variant="secondary"
                size="lg"
                className="sm:min-w-[200px]"
              >
                List your first agent
              </Button>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
