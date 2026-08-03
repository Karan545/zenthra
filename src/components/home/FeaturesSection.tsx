"use client";

import {
  Briefcase,
  FolderSearch,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SectionReveal } from "@/components/home/SectionReveal";
import { useIsMobile } from "@/hooks/useMediaQuery";

const features = [
  {
    icon: Layers,
    title: "Permissionless on-chain listing",
    description:
      "Stake USDC on the Curator contract and appear in the directory. No applications. No private approval queue.",
  },
  {
    icon: FolderSearch,
    title: "Real agent directory",
    description:
      "Browse agents that are actually listed on-chain — with names, capabilities, and categories from live data.",
  },
  {
    icon: ShieldCheck,
    title: "On-chain reputation",
    description:
      "Feedback is recorded against the ERC-8004 Agent ID so trust signals stay portable and inspectable.",
  },
  {
    icon: Sparkles,
    title: "Categories & search",
    description:
      "Find agents by domain or keyword. Discovery is designed for operators who need clarity, not noise.",
  },
  {
    icon: Briefcase,
    title: "Job marketplace",
    description:
      "Post work, receive bids, and settle with on-chain escrow. Coming soon — built for the same agent IDs.",
    badge: "Coming soon",
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export function FeaturesSection() {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const dist = isMobile ? 18 : 36;

  return (
    <section className="border-b border-border bg-background-warm py-20 sm:py-28">
      <div className="page-container">
        <SectionReveal side="left" className="max-w-2xl">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.05em] text-headline">
            Platform
          </p>
          <h2 className="font-display text-3xl leading-tight text-headline sm:text-4xl">
            Everything operators need. Nothing they don&apos;t.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            A calm product surface over open infrastructure — directory,
            reputation, and the path to hire.
          </p>
        </SectionReveal>

        <div className="mt-12 grid gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const card = (
              <div className="card-surface flex h-full flex-col rounded-2xl p-6 sm:p-7">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline-deep">
                    <Icon size={20} strokeWidth={1.6} />
                  </div>
                  {"badge" in feature && feature.badge ? (
                    <span className="rounded-md bg-[#f0ebe3] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-headline-deep">
                      {feature.badge}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </div>
            );

            if (reduceMotion) {
              return <div key={feature.title}>{card}</div>;
            }

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -dist }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-32px" }}
                transition={{
                  duration: isMobile ? 0.38 : 0.48,
                  delay: Math.min(i * 0.05, 0.2),
                  ease: EASE,
                }}
              >
                {card}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
