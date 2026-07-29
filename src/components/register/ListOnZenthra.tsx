"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { useListOnZenthra } from "@/hooks/useListOnZenthra";
import { explorerTxUrl, shortenAddress } from "@/lib/format";
import { formatWalletError } from "@/lib/walletErrors";
import type { Agent } from "@/types/agent";
import type { Hash } from "viem";
import { ONE_USDC, fromUsdcUnits } from "@/config/contracts";

type Phase = "idle" | "approve" | "list" | "confirming" | "done";

interface ListOnZenthraProps {
  agent: Agent;
  /** True when we know the real on-chain agentId from mint logs. */
  agentIdKnown: boolean;
  onListed?: (listHash: Hash) => void;
}

export function ListOnZenthraCard({
  agent,
  agentIdKnown,
  onListed,
}: ListOnZenthraProps) {
  const { isConnected } = useAccount();
  const { listOnZenthra, isPending, reset } = useListOnZenthra();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [listHash, setListHash] = useState<Hash | null>(null);
  const [skipped, setSkipped] = useState(false);

  const busy =
    phase === "approve" ||
    phase === "list" ||
    phase === "confirming" ||
    isPending;

  if (skipped) return null;

  if (phase === "done" && listHash) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-xl border border-border bg-[#faf8f5] px-4 py-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0ebe3] text-headline">
            <CheckCircle2 size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">
              Listed on Zenthra
            </p>
            <p className="mt-1 text-sm text-muted">
              1 USDC staked. Your agent will appear in the Directory with a
              Zenthra listing badge.
            </p>
            <a
              href={explorerTxUrl(listHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[12px] text-headline hover:underline"
            >
              {shortenAddress(listHash, 6)}
              <ExternalLink size={12} strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  const phaseLabel =
    phase === "approve"
      ? "Approve 1 USDC in your wallet…"
      : phase === "list"
        ? "Confirm listAgent…"
        : phase === "confirming"
          ? "Waiting for Arc confirmation…"
          : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="mt-6 rounded-xl border border-border bg-white px-4 py-5 text-left sm:px-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0ebe3] text-headline">
          <Sparkles size={16} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-tight text-foreground">
            List on Zenthra
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Stake{" "}
            <span className="font-medium text-foreground">
              {fromUsdcUnits(ONE_USDC)} USDC
            </span>{" "}
            to feature this agent on the Zenthra Directory via your Curator
            contract. You can delist later to recover the stake.
          </p>

          {!agentIdKnown ? (
            <p className="mt-2 text-[12px] text-muted-soft">
              Agent ID could not be read from mint logs. Listing may fail —
              confirm the ID on ArcScan first.
            </p>
          ) : null}

          {!isConnected ? (
            <div className="mt-4">
              <ConnectWallet size="md" />
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-border bg-[#faf8f5] px-3 py-3"
            >
              <p className="text-[13px] text-foreground">{error}</p>
              <button
                type="button"
                className="mt-2 text-[13px] font-medium text-headline hover:underline"
                onClick={() => {
                  setError(null);
                  reset();
                }}
              >
                Try again
              </button>
            </div>
          ) : null}

          {phaseLabel ? (
            <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
              <Loader2 size={14} className="animate-spin text-headline" />
              {phaseLabel}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={busy || !isConnected || !agentIdKnown}
              onClick={() => {
                void (async () => {
                  setError(null);
                  reset();
                  try {
                    const result = await listOnZenthra(
                      {
                        agentId: agent.id,
                        x402Endpoint: agent.x402Endpoint,
                        capabilities: agent.capabilities,
                        categories: agent.categories,
                        pricePerTask: agent.pricePerTask,
                        meta: {
                          name: agent.name,
                          description: agent.description,
                          image: agent.image,
                          owner: agent.owner,
                          txHash: agent.txHash,
                          registeredAt: agent.registeredAt,
                          categories: agent.categories,
                        },
                      },
                      {
                        onPhase: (p) => setPhase(p),
                      }
                    );
                    setListHash(result.listHash);
                    setPhase("done");
                    onListed?.(result.listHash);
                  } catch (e) {
                    setPhase("idle");
                    setError(
                      formatWalletError(
                        e,
                        "Something went wrong. Please try again in a moment."
                      )
                    );
                  }
                })();
              }}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Listing…
                </>
              ) : (
                "List on Zenthra"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={busy}
              onClick={() => setSkipped(true)}
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
