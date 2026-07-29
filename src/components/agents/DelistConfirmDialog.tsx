"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useDelistAgent } from "@/hooks/useDelistAgent";
import { explorerTxUrl, shortenAddress } from "@/lib/format";
import type { Agent } from "@/types/agent";
import type { Hash } from "viem";

interface DelistConfirmDialogProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (hash: Hash) => void;
}

export function DelistConfirmDialog({
  agent,
  open,
  onClose,
  onSuccess,
}: DelistConfirmDialogProps) {
  const { delistAgent, isPending, reset } = useDelistAgent();
  const [phase, setPhase] = useState<"confirm" | "wallet" | "confirming" | "done">(
    "confirm"
  );
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  useEffect(() => {
    if (open) {
      setPhase("confirm");
      setError(null);
      setTxHash(null);
      reset();
    }
  }, [open, agent?.id, reset]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "wallet" && phase !== "confirming") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  if (!agent) return null;

  const stakeLabel =
    agent.stakeAmount != null
      ? `${agent.stakeAmount} USDC`
      : "1 USDC";

  const busy = phase === "wallet" || phase === "confirming" || isPending;

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
            aria-labelledby="delist-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background-warm p-6 shadow-soft-lg"
          >
            {phase === "done" && txHash ? (
              <div className="text-center">
                <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
                  Delisted
                </p>
                <h2
                  id="delist-title"
                  className="mt-2 font-display text-2xl text-headline"
                >
                  Stake returned
                </h2>
                <p className="mt-2 text-sm text-muted">
                  <span className="font-medium text-foreground">
                    {agent.name}
                  </span>{" "}
                  is no longer listed. Your {stakeLabel} stake is returned to
                  your wallet.
                </p>
                <a
                  href={explorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 font-mono text-[13px] text-headline hover:underline"
                >
                  {shortenAddress(txHash, 6)}
                  <ExternalLink size={13} strokeWidth={1.75} />
                </a>
                <div className="mt-6">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={onClose}
                  >
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
                    <h2
                      id="delist-title"
                      className="font-display text-xl text-headline"
                    >
                      Delist & unstake?
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      You are about to remove{" "}
                      <span className="font-medium text-foreground">
                        {agent.name}
                      </span>{" "}
                      (#
                      {agent.id}) from Zenthra and recover your locked stake.
                    </p>
                  </div>
                </div>

                <dl className="mt-5 divide-y divide-border rounded-xl border border-border bg-white text-sm">
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-soft">Stake to return</dt>
                    <dd className="font-medium text-foreground">{stakeLabel}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-soft">Contract</dt>
                    <dd className="font-mono text-[12px] text-muted">
                      delistAgent()
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-[12px] text-muted-soft">
                  This requires a wallet signature. After confirmation, the agent
                  leaves the Directory listing until you list again.
                </p>

                {error ? (
                  <div
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
                  >
                    {error}
                  </div>
                ) : null}

                {busy ? (
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
                    <Loader2 size={14} className="animate-spin text-headline" />
                    {phase === "wallet"
                      ? "Confirm in your wallet…"
                      : "Waiting for Arc confirmation…"}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    disabled={busy}
                    onClick={onClose}
                  >
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
                          const { hash } = await delistAgent(agent.id, {
                            onPhase: (p) => setPhase(p),
                          });
                          setTxHash(hash);
                          setPhase("done");
                          onSuccess?.(hash);
                        } catch (e) {
                          setPhase("confirm");
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Delist failed. Please try again."
                          );
                        }
                      })();
                    }}
                  >
                    {busy ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Delisting…
                      </>
                    ) : (
                      "Confirm delist & unstake"
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
