"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  RefreshCw,
  Shield,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { AgentGridSkeleton } from "@/components/directory/AgentCardSkeleton";
import { DelistConfirmDialog } from "@/components/agents/DelistConfirmDialog";
import { useMyAgents, type MyAgentRow } from "@/hooks/useMyAgents";
import { ListOnZenthraCard } from "@/components/register/ListOnZenthra";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types/agent";

export function MyAgentsContent() {
  const {
    isConnected,
    agents,
    listedCount,
    registeredOnlyCount,
    stakedUsdc,
    isLoading,
    refetch,
  } = useMyAgents();

  const [delistTarget, setDelistTarget] = useState<Agent | null>(null);
  const [listTarget, setListTarget] = useState<MyAgentRow | null>(null);
  const [listTick, setListTick] = useState(0);
  void listTick;

  if (!isConnected) {
    return (
      <div className="card-surface mx-auto max-w-lg rounded-2xl px-6 py-14 text-center sm:px-10">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline">
          <Wallet size={22} strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-2xl text-headline">
          Connect to view your agents
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          See agents you registered, stake status on ZenthraCurator, and delist
          to recover USDC.
        </p>
        <div className="mt-6 flex justify-center">
          <ConnectWallet size="md" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted">Loading your agents…</p>
        <AgentGridSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <SummaryTile label="Your agents" value={String(agents.length)} />
        <SummaryTile
          label="Listed on Zenthra"
          value={String(listedCount)}
          accent
        />
        <SummaryTile
          label="USDC staked"
          value={stakedUsdc > 0 ? `${stakedUsdc}` : "0"}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {registeredOnlyCount > 0 ? (
            <>
              {registeredOnlyCount} registered but not listed — stake 1 USDC to
              appear in the Directory.
            </>
          ) : listedCount > 0 ? (
            <>All of your agents with local data are managed below.</>
          ) : (
            <>No agents for this wallet yet.</>
          )}
        </p>
        <div className="flex items-center gap-3">
          <Button href="/register" variant="secondary" size="sm">
            Register agent
          </Button>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            Refresh
          </button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="card-surface rounded-2xl px-6 py-14 text-center">
          <h2 className="font-display text-2xl text-headline">No agents yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Register an ERC-8004 agent, then list it on Zenthra with a 1 USDC
            stake.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/register" variant="primary" size="md">
              Register agent
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {agents.map((agent, index) => (
            <MyAgentRowCard
              key={agent.id}
              agent={agent}
              index={index}
              onDelist={() => setDelistTarget(agent)}
              onList={() => setListTarget(agent)}
              listingOpen={listTarget?.id === agent.id}
              onCloseList={() => setListTarget(null)}
              onListed={() => {
                setListTarget(null);
                setListTick((n) => n + 1);
                void refetch();
              }}
            />
          ))}
        </ul>
      )}

      <DelistConfirmDialog
        agent={delistTarget}
        open={Boolean(delistTarget)}
        onClose={() => setDelistTarget(null)}
        onSuccess={() => {
          void refetch();
        }}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="card-surface rounded-2xl px-5 py-4">
      <p className="text-[11px] uppercase tracking-[0.04em] text-muted-soft">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-3xl tabular-nums",
          accent ? "text-headline" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MyAgentRowCard({
  agent,
  index,
  onDelist,
  onList,
  listingOpen,
  onCloseList,
  onListed,
}: {
  agent: MyAgentRow;
  index: number;
  onDelist: () => void;
  onList: () => void;
  listingOpen: boolean;
  onCloseList: () => void;
  onListed: () => void;
}) {
  const initials = agent.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const stake =
    agent.stakeAmount != null && agent.stakeAmount > 0
      ? `${agent.stakeAmount} USDC`
      : agent.isListedOnZenthra
        ? "1 USDC"
        : "—";

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
      className="card-surface rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f0ebe3] text-[13px] font-semibold text-headline-deep">
            {agent.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agent.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                {agent.name}
              </h3>
              {agent.isListedOnZenthra ? (
                <span className="rounded-md bg-[#f0ebe3] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-headline-deep">
                  Listed on Zenthra
                </span>
              ) : (
                <span className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Not listed
                </span>
              )}
            </div>
            <p className="mt-0.5 font-mono text-[12px] text-muted-soft">
              #{agent.id} · {shortenAddress(agent.owner)}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-muted">
              {agent.description}
            </p>
            {agent.capabilities.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {agent.capabilities.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-[#f0ebe3] px-2 py-0.5 text-[11px] font-medium text-headline-deep"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end lg:flex-col lg:items-stretch lg:min-w-[200px]">
          <div className="rounded-xl border border-border bg-[#faf8f5] px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.04em] text-muted-soft">
              <Shield size={12} strokeWidth={1.75} />
              Stake status
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {agent.isListedOnZenthra ? (
                <>
                  Locked ·{" "}
                  <span className="text-headline">{stake}</span>
                </>
              ) : (
                <span className="text-muted">No stake</span>
              )}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-soft">
              {agent.pricePerTask} USDC / task
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button href={`/agent/${agent.id}`} variant="secondary" size="sm">
              Profile
              <ArrowUpRight size={14} strokeWidth={1.75} />
            </Button>
            {agent.isListedOnZenthra ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onDelist}
              >
                Delist / Unstake
              </Button>
            ) : (
              <Button type="button" variant="primary" size="sm" onClick={onList}>
                List on Zenthra
              </Button>
            )}
          </div>
        </div>
      </div>

      {listingOpen && !agent.isListedOnZenthra ? (
        <div className="mt-2">
          <ListOnZenthraCard
            agent={agent}
            agentIdKnown
            onListed={() => onListed()}
          />
          <button
            type="button"
            className="mt-2 text-[12px] text-muted hover:text-foreground"
            onClick={onCloseList}
          >
            Hide list form
          </button>
        </div>
      ) : null}
    </motion.li>
  );
}
