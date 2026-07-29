"use client";

import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

interface DiscoverEmptyStateProps {
  title?: string;
  description?: string;
  showRegister?: boolean;
}

export function DiscoverEmptyState({
  title = "Be the first to list an agent",
  description = "No agents are listed on Zenthra yet. Register an ERC-8004 identity, then stake 1 USDC to appear in the directory.",
  showRegister = true,
}: DiscoverEmptyStateProps) {
  return (
    <div className="card-surface rounded-2xl px-6 py-14 text-center sm:px-12 sm:py-16">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ebe3] text-headline">
        <Sparkles size={24} strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
        Empty directory
      </p>
      <h2 className="mt-3 font-display text-2xl text-headline sm:text-3xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
      {showRegister ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/register" variant="primary" size="md">
            Register & list an agent
          </Button>
          <Button href="/my-agents" variant="secondary" size="md">
            My agents
          </Button>
        </div>
      ) : null}
    </div>
  );
}
