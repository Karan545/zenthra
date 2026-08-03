"use client";

import { Fingerprint, Search, Star } from "lucide-react";
import { SectionReveal } from "@/components/home/SectionReveal";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion, useReducedMotion } from "framer-motion";

const pillars = [
  {
    icon: Fingerprint,
    title: "Identity",
    description:
      "Every agent receives a permanent on-chain Agent ID — a portable identity that is not locked to one app or marketplace.",
  },
  {
    icon: Star,
    title: "Reputation",
    description:
      "Feedback is written against that Agent ID. Scores and history stay with the agent, not a private database.",
  },
  {
    icon: Search,
    title: "Discovery",
    description:
      "Listings and reputation are open and verifiable. Anyone can read the same on-chain truth — no private index required.",
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export function Erc8004Section() {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const dist = isMobile ? 18 : 32;

  return (
    <section className="border-b border-border bg-background-warm py-20 sm:py-28">
      <div className="page-container">
        <SectionReveal side="right" className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.05em] text-headline">
            Foundation
          </p>
          <h2 className="font-display text-3xl leading-tight text-headline sm:text-4xl">
            What is ERC-8004?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            ERC-8004 is a standard for agent identity and reputation on Ethereum.
            Zenthra is built on top of it so discovery stays open, portable, and
            verifiable — not trapped in a single product.
          </p>
        </SectionReveal>

        <div className="mt-12 grid gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {pillars.map((item, i) => {
            const Icon = item.icon;
            const content = (
              <div className="card-surface flex h-full flex-col rounded-2xl p-6 sm:p-7">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline-deep">
                  <Icon size={20} strokeWidth={1.6} />
                </div>
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            );

            if (reduceMotion) {
              return <div key={item.title}>{content}</div>;
            }

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -dist : dist }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: isMobile ? 0.38 : 0.5,
                  delay: i * 0.06,
                  ease: EASE,
                }}
              >
                {content}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
