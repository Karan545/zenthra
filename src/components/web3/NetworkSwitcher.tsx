"use client";

import { useChainId, useSwitchChain } from "wagmi";
import { arcMainnet } from "@/config/chains";
import { cn } from "@/lib/utils";
import { WifiOff } from "lucide-react";

interface NetworkSwitcherProps {
  className?: string;
}

/**
 * Network status pill.
 * - On Arc Mainnet: shows amber "Mainnet" badge.
 * - On any other chain: prompts user to switch to Arc Mainnet.
 */
export function NetworkSwitcher({ className }: NetworkSwitcherProps) {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isMainnet = chainId === arcMainnet.id;

  if (isMainnet) {
    return (
      <div className={cn("flex items-center", className)}>
        <span className="badge-mainnet flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-mainnet" />
          Arc Mainnet
        </span>
      </div>
    );
  }

  // Wrong network — prompt switch
  return (
    <div className={cn("flex items-center", className)}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchChain({ chainId: arcMainnet.id })}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-danger transition-colors hover:bg-danger/12",
          isPending && "opacity-60 cursor-not-allowed"
        )}
      >
        <WifiOff size={10} strokeWidth={2} />
        {isPending ? "Switching…" : "Switch to Mainnet"}
      </button>
    </div>
  );
}
