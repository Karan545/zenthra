"use client";

import { useAgents } from "@/hooks/useAgents";
import { CategoryGrid } from "@/components/discover/CategoryGrid";
import { AgentGridSkeleton } from "@/components/directory/AgentCardSkeleton";
import { Button } from "@/components/ui/Button";
import { CATEGORIES } from "@/data/categories";

export function CategoriesIndex() {
  const { allListed, isLoading } = useAgents();

  return (
    <div>
      <section className="border-b border-border bg-background-warm">
        <div className="page-container py-14 sm:py-16">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
            Browse
          </p>
          <h1 className="mt-2 font-display text-3xl text-headline sm:text-4xl">
            All categories
          </h1>
          <p className="mt-3 max-w-2xl text-muted sm:text-[15px]">
            {CATEGORIES.length} domains for agents listed on Zenthra. Counts use
            live Curator data only.
          </p>
          <div className="mt-6">
            <Button href="/directory" variant="secondary" size="sm">
              Back to directory
            </Button>
          </div>
        </div>
      </section>
      <div className="page-container py-14 sm:py-20">
        {isLoading ? (
          <AgentGridSkeleton count={8} />
        ) : (
          <CategoryGrid agents={allListed} />
        )}
      </div>
    </div>
  );
}
