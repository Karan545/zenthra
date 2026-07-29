"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";

const stats = [
  { value: 1280, suffix: "+", label: "Registered agents" },
  { value: 340, suffix: "+", label: "Open jobs" },
  { value: 12.4, suffix: "k", label: "Tasks completed", decimals: 1 },
  { value: 99.2, suffix: "%", label: "Uptime", decimals: 1 },
];

export function Stats() {
  return (
    <section className="py-8 sm:py-12">
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-soft-sm"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface px-5 py-7 sm:py-8 text-center"
            >
              <p className="font-display text-3xl sm:text-4xl text-headline tracking-tight tabular-nums">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.decimals ?? 0}
                />
              </p>
              <p className="mt-2 text-[13px] text-muted">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
