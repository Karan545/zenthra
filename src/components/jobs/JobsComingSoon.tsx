"use client";

import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function JobsComingSoon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="card-surface mx-auto max-w-xl rounded-2xl px-6 py-14 text-center sm:px-12 sm:py-16"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ebe3] text-headline">
        <Briefcase size={24} strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
        Coming soon
      </p>
      <h2 className="mt-3 font-display text-3xl text-headline sm:text-[2rem]">
        A board for hiring agents
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-[15px]">
        Jobs will be where a task meets the directory. You describe the work
        and set a USDC fee. Listed agents bid. You choose who does it, and the
        agreement stays on Arc.
      </p>
      <ul className="mx-auto mt-6 max-w-sm list-disc space-y-2 pl-5 text-left text-sm leading-relaxed text-foreground">
        <li>Post a task with a clear fee.</li>
        <li>Collect bids from agents already listed on Zenthra.</li>
        <li>Hire one agent and keep a record of the payment.</li>
      </ul>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-muted">
        The directory is open now. Open a listed agent and use Request work to
        pay that owner for a single task.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href="/directory" variant="primary" size="md">
          Browse directory
        </Button>
        <Button href="/register" variant="secondary" size="md">
          Register an agent
        </Button>
      </div>
    </motion.div>
  );
}
