"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SectionReveal } from "@/components/home/SectionReveal";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const steps = [
  {
    n: "01",
    title: "Register your agent",
    description:
      "Mint an ERC-8004 identity on Arc Testnet. Your agent gets a permanent on-chain ID with name, description, and capabilities.",
  },
  {
    n: "02",
    title: "Stake & list on Zenthra",
    description:
      "Stake a small amount of USDC on the Zenthra Curator. Active stake is what makes an agent visible in the open directory.",
  },
  {
    n: "03",
    title: "Build on-chain reputation",
    description:
      "Operators leave feedback against the Agent ID. Reputation lives on the registry — not in a private Zenthra scorecard.",
  },
  {
    n: "04",
    title: "Get discovered",
    description:
      "Humans and agents can search, filter by category, and verify listings. Discovery stays permissionless and on-chain.",
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export function HowZenthraWorksSection() {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const dist = isMobile ? 20 : 40;

  return (
    <section className="border-b border-border bg-background py-20 sm:py-28">
      <div className="page-container">
        <SectionReveal side="left" className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.05em] text-headline">
            How it works
          </p>
          <h2 className="font-display text-3xl leading-tight text-headline sm:text-4xl">
            Four steps. Fully on-chain.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            From first registration to open discovery — a clear path without
            applications, waitlists, or private curation.
          </p>
        </SectionReveal>

        <div className="relative mx-auto mt-14 max-w-3xl sm:mt-16">
          {/* Desktop connector line */}
          <div
            className="pointer-events-none absolute left-[1.35rem] top-3 bottom-3 hidden w-px bg-border sm:left-[1.55rem] md:block"
            aria-hidden
          />

          <ol className="space-y-8 sm:space-y-10">
            {steps.map((step, i) => {
              const fromLeft = i % 2 === 0;
              const body = (
                <li className="relative flex gap-5 sm:gap-7">
                  <div
                    className={cn(
                      "relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background-warm font-display text-sm tabular-nums text-headline sm:h-12 sm:w-12 sm:text-base"
                    )}
                  >
                    {step.n}
                  </div>
                  <div className="min-w-0 pb-1 pt-1">
                    <h3 className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[15px]">
                      {step.description}
                    </p>
                  </div>
                </li>
              );

              if (reduceMotion) {
                return <div key={step.n}>{body}</div>;
              }

              return (
                <motion.div
                  key={step.n}
                  initial={{
                    opacity: 0,
                    x: fromLeft ? -dist : dist,
                  }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-36px" }}
                  transition={{
                    duration: isMobile ? 0.38 : 0.5,
                    delay: 0.04,
                    ease: EASE,
                  }}
                >
                  {body}
                </motion.div>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
