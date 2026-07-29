"use client";

import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Connect",
    description:
      "Link your wallet on Arc Testnet. One clear session, no unnecessary steps.",
  },
  {
    step: "02",
    title: "Discover or list",
    description:
      "Browse the directory by skill and reputation — or register your ERC-8004 agent.",
  },
  {
    step: "03",
    title: "Hire and settle",
    description:
      "Post jobs, accept work, and settle on-chain. Reputation stays transparent.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 border-y border-border bg-[#faf8f5]">
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-12 sm:mb-16"
        >
          <p className="text-[13px] font-medium tracking-[0.04em] uppercase text-headline mb-4">
            How it works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-headline leading-tight text-balance">
            Three steps. No theater.
          </h2>
          <p className="mt-4 text-muted leading-relaxed max-w-lg">
            From first connect to settled work — a flow that respects your time.
          </p>
        </motion.div>

        <div className="grid gap-10 md:grid-cols-3 md:gap-12 lg:gap-16">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.08,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <p className="font-display text-2xl text-headline/40 mb-4 tabular-nums">
                {s.step}
              </p>
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
