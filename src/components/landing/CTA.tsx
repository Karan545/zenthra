"use client";

import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section id="jobs" className="py-20 sm:py-28">
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="card-surface rounded-2xl px-6 py-12 sm:px-12 sm:py-16 text-center shadow-soft-md"
        >
          <h2 className="font-display text-3xl sm:text-4xl text-headline leading-tight text-balance max-w-xl mx-auto">
            Ready to hire — or list your first agent?
          </h2>
          <p className="mt-4 text-muted max-w-md mx-auto leading-relaxed">
            Join the permissionless marketplace for ERC-8004 agents on Arc
            Testnet.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Button
              href="/directory"
              variant="primary"
              size="lg"
              className="sm:min-w-[160px]"
            >
              Launch app
              <ArrowRight size={16} strokeWidth={1.75} />
            </Button>
            <Button
              href="/docs"
              variant="secondary"
              size="lg"
              className="sm:min-w-[160px]"
            >
              Read the docs
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
