"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useDelistAgent } from "@/hooks/useDelistAgent";
import { explorerTxUrl, shortenAddress } from "@/lib/format";
import { removeRegisteredAgent } from "@/lib/localAgents";
import type { Agent } from "@/types/agent";
import type { Hash } from "viem";

interface RemoveAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
  /** Curator has no bytecode on this chain, so a listed flag is only local. */
  curatorMissing?: boolean;
  onRemoved?: () => void;
}

export function RemoveAgentDialog({
  agent,
  open,
  onClose,
  curatorMissing = false,
  onRemoved,
}: RemoveAgentDialogProps) {
  const { delistAgent, isPending, reset } = useDelistAgent();
  const [phase, setPhase] = useState<"confirm" | "wallet" | "confirming" | "done">("confirm");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  const listed = Boolean(agent?.isListedOnZenthra);
  const onChainListing = listed && !curatorMissing;

  useEffect(() => {
    if (open) {
      setPhase("confirm");
      setError(null);
      setTxHash(null);
      reset();
    }
  }, [open, agent?.id, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase !== "wallet" && phase !== "confirming") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  if (!agent) return null;

  const busy = phase === "wallet" || phase === "confirming" || isPending;
  const stakeLabel = agent.stakeAmount != null ? `${agent.stakeAmount} USDC` : "1 USDC";

  function finish() {
    removeRegisteredAgent(agent!.id);
    onRemoved?.();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close dialog backdrop"
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]"
            onClick={() => {
              if (!busy) onClose();
            }}
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
            {phase === "done" ? (
              <div className="text-center">
                <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">Removed</p>
                <h2 id="remove-agent-title" className="mt-2 font-display text-2xl text-headline">
                  {agent.name} is off My agents
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {onChainListing
                    ? `The listing is closed and the ${stakeLabel} stake is back in your wallet.`
                    : "It no longer appears in this list."}
                </p>
                {txHash ? (
                  <a
                    href={explorerTxUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 font-mono text-[13px] text-headline hover:underline"
                  >
                    {shortenAddress(txHash, 6)}
                    <ExternalLink size={13} strokeWidth={1.75} />
                  </a>
                ) : null}
                <div className="mt-6">
                  <Button type="button" variant="primary" size="md" className="w-full" onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline">
                    <AlertTriangle size={18} strokeWidth={1.6} />
                  </div>
                  <div>
                    <h2 id="remove-agent-title" className="font-display text-xl text-headline">
                      Remove this agent?
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      <span className="font-medium text-foreground">{agent.name}</span> (#{agent.id}) will leave My
                      agents.
                      {onChainListing
                        ? ` Because it is listed, your wallet will delist it and return the ${stakeLabel} stake first.`
                        : listed
                          ? " The curator is not on Arc mainnet, so this only takes the row off My agents in this browser. The identity token stays in your wallet."
                          : " The identity token stays in your wallet."}
                    </p>
                  </div>
                </div>

                {error ? (
                  <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
                    {error}
                  </div>
                ) : null}

                {busy ? (
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
                    <Loader2 size={14} className="animate-spin text-headline" />
                    {phase === "wallet" ? "Confirm in your wallet…" : "Waiting for Arc confirmation…"}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" size="md" disabled={busy} onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        setError(null);
                        try {
                          if (onChainListing) {
                            const { hash } = await delistAgent(agent.id, {
                              onPhase: (next) => setPhase(next),
                            });
                            setTxHash(hash);
                          }
                          finish();
                          setPhase("done");
                        } catch (caught) {
                          setPhase("confirm");
                          setError(caught instanceof Error ? caught.message : "Could not remove this agent.");
                        }
                      })();
                    }}
                  >
                    {busy ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Removing…
                      </>
                    ) : onChainListing ? (
                      "Delist and remove"
                    ) : (
                      "Remove"
                    )}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
