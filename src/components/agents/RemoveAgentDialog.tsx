"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { removeRegisteredAgent } from "@/lib/localAgents";
import type { Agent } from "@/types/agent";

interface RemoveAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
  onRemoved?: () => void;
}

export function RemoveAgentDialog({
  agent,
  open,
  onClose,
  onRemoved,
}: RemoveAgentDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && agent ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close dialog backdrop"
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-agent-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background-warm p-6 shadow-soft-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline">
                <AlertTriangle size={18} strokeWidth={1.6} />
              </div>
              <div>
                <h2 id="remove-agent-title" className="font-display text-xl text-headline">
                  Remove this agent?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  <span className="font-medium text-foreground">{agent.name}</span> (#{agent.id}) leaves My
                  agents and this browser&apos;s directory. The identity token stays in your wallet.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  removeRegisteredAgent(agent.id);
                  onRemoved?.();
                  onClose();
                }}
              >
                Remove
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
