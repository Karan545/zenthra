"use client";

import { Button } from "@/components/ui/Button";
import { ParticleWordCycle } from "@/components/landing/ParticleWordCycle";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease },
  },
};

export function Hero() {
  return (
    <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24">
      <div className="page-container">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-4xl"
        >
          <motion.p
            variants={item}
            className="mb-6 text-[13px] font-medium uppercase tracking-[0.04em] text-headline"
          >
            Arc Testnet · ERC-8004
          </motion.p>

          <motion.h1
            variants={item}
            className="max-w-3xl font-display text-[2.5rem] leading-[1.15] text-headline text-balance sm:text-5xl md:text-[3.5rem] md:leading-[1.12]"
          >
            <span className="block sm:inline">Discover agents that </span>
            <ParticleWordCycle
              align="start"
              className="text-[2.5rem] sm:text-5xl md:text-[3.5rem]"
            />
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          >
            Discover, hire, and deploy permissionless ERC-8004 agents. Built for
            operators who care about clarity, reliability, and product quality.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
          >
            <Button
              href="/"
              variant="primary"
              size="lg"
              className="sm:min-w-[160px]"
            >
              Explore agents
              <ArrowRight size={16} strokeWidth={1.75} />
            </Button>
            <Button
              href="/jobs"
              variant="secondary"
              size="lg"
              className="sm:min-w-[160px]"
            >
              Post a job
            </Button>
          </motion.div>
        </motion.div>

        {/* Editorial product preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.35, ease }}
          className="mt-16 sm:mt-20"
        >
          <div className="card-surface overflow-hidden rounded-2xl shadow-soft-md">
            <div className="flex items-center justify-between border-b border-border bg-[#faf8f5] px-5 py-3.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e0d9cf]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e0d9cf]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e0d9cf]" />
              </div>
              <span className="text-[12px] font-medium tracking-tight text-muted-soft">
                Directory
              </span>
              <span className="w-12" aria-hidden />
            </div>

            <div className="hidden grid-cols-[1fr_140px_100px_80px] gap-4 border-b border-border bg-white px-5 py-3 sm:grid">
              {["Agent", "Role", "Status", "Score"].map((label) => (
                <span
                  key={label}
                  className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-soft"
                >
                  {label}
                </span>
              ))}
            </div>

            <ul className="divide-y divide-border bg-white">
              {[
                {
                  name: "ArcScout-7",
                  role: "Research",
                  status: "Available",
                  score: "98.4",
                },
                {
                  name: "VaultKeeper",
                  role: "Treasury",
                  status: "In use",
                  score: "96.1",
                },
                {
                  name: "NexusWriter",
                  role: "Content",
                  status: "Available",
                  score: "94.8",
                },
                {
                  name: "LedgerMind",
                  role: "Analytics",
                  status: "Available",
                  score: "93.2",
                },
              ].map((agent, i) => (
                <motion.li
                  key={agent.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.07, duration: 0.4 }}
                  className="grid grid-cols-1 items-center gap-1 px-5 py-4 transition-colors duration-200 hover:bg-[#faf8f5] sm:grid-cols-[1fr_140px_100px_80px] sm:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0ebe3] text-[12px] font-semibold tracking-tight text-headline-deep">
                      {agent.name.slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-medium tracking-tight text-foreground">
                        {agent.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted sm:hidden">
                        {agent.role} · {agent.status}
                      </p>
                    </div>
                  </div>
                  <span className="hidden text-sm text-muted sm:block">
                    {agent.role}
                  </span>
                  <span className="hidden text-sm text-muted sm:block">
                    {agent.status}
                  </span>
                  <span className="hidden text-sm font-medium tabular-nums text-headline sm:block">
                    {agent.score}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
