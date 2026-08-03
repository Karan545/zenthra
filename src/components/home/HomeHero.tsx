"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HeroBinaryRain } from "@/components/discover/HeroBinaryRain";
import { ParticleWordCycle } from "@/components/landing/ParticleWordCycle";
import { useAgents } from "@/hooks/useAgents";
import { useIsMobile } from "@/hooks/useMediaQuery";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Homepage hero — particle word loop, subtle binary rain, dual CTAs, live count.
 */
export function HomeHero() {
  const { listedCount, isLoading } = useAgents();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const y = reduceMotion ? 0 : isMobile ? 12 : 18;

  return (
    <section className="relative overflow-hidden border-b border-border bg-background-warm">
      <HeroBinaryRain opacityScale={0.55} maxDrops={isMobile ? 36 : 100} />
      <div className="page-container relative z-10 pb-20 pt-20 sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-36">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: isMobile ? 0.4 : 0.55, ease: EASE }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="mb-5 text-[13px] font-medium uppercase tracking-[0.06em] text-headline sm:mb-6">
            Arc Testnet · ERC-8004
          </p>
          <h1 className="font-display text-[2.75rem] leading-[1.08] tracking-[-0.025em] text-headline sm:text-6xl sm:leading-[1.06] md:text-[4.35rem] lg:text-[4.85rem] lg:leading-[1.04]">
            <span className="block sm:inline">Discover agents that </span>
            <ParticleWordCycle
              align="center"
              className="text-[2.75rem] sm:text-6xl md:text-[4.35rem] lg:text-[4.85rem]"
            />
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-muted sm:mt-8 sm:max-w-2xl sm:text-lg">
            The permissionless directory for ERC-8004 agents. List on-chain,
            build lasting reputation, and get discovered — without gatekeepers.
          </p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: isMobile ? 10 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.12,
            duration: isMobile ? 0.35 : 0.45,
            ease: EASE,
          }}
          className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:mt-11 sm:flex-row sm:items-center"
        >
          <Button
            href="/directory"
            variant="primary"
            size="lg"
            className="sm:min-w-[180px]"
          >
            Explore Agents
            <ArrowRight size={16} strokeWidth={1.75} />
          </Button>
          <Button
            href="/register"
            variant="secondary"
            size="lg"
            className="sm:min-w-[180px]"
          >
            List your Agent
          </Button>
        </motion.div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          className="mt-9 text-center text-[13px] text-muted-soft sm:mt-10"
        >
          {isLoading ? (
            "Loading on-chain listings…"
          ) : (
            <>
              <span className="font-medium tabular-nums text-headline">
                {listedCount}
              </span>{" "}
              agent{listedCount === 1 ? "" : "s"} listed on-chain
            </>
          )}
        </motion.p>
      </div>
    </section>
  );
}
