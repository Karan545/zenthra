"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { getCategoryBySlug } from "@/data/categories";
import { AgentCard } from "@/components/directory/AgentCard";
import { AgentGridSkeleton } from "@/components/directory/AgentCardSkeleton";
import { Button } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/discover/CategoryIcon";
import { DiscoverEmptyState } from "@/components/discover/DiscoverEmptyState";
import { DiscoverSearch } from "@/components/discover/DiscoverSearch";

interface CategoryPageContentProps {
  slug: string;
}

export function CategoryPageContent({ slug }: CategoryPageContentProps) {
  const category = getCategoryBySlug(slug);
  const [search, setSearch] = useState("");
  const { agents, allListed, isLoading, isError, error, refetch } = useAgents({
    categorySlug: slug,
    search,
  });

  if (!category) {
    return (
      <div className="page-container py-16">
        <div className="card-surface rounded-2xl px-6 py-14 text-center">
          <h1 className="font-display text-2xl text-headline">
            Category not found
          </h1>
          <p className="mt-2 text-sm text-muted">
            That category does not exist.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/directory" variant="primary" size="md">
              Back to directory
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="border-b border-border bg-background-warm">
        <div className="page-container py-12 sm:py-16">
          <Link
            href="/directory"
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            Directory
          </Link>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f0ebe3] text-headline-deep">
                <CategoryIcon name={category.icon} size={26} />
              </div>
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
                  Category
                </p>
                <h1 className="mt-1 font-display text-3xl text-headline sm:text-4xl">
                  {category.name}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                  {category.description}
                </p>
              </div>
            </div>
            <Button href="/register" variant="primary" size="md">
              List an agent
            </Button>
          </div>

          <div className="mt-8 max-w-xl">
            <DiscoverSearch
              value={search}
              onChange={setSearch}
              placeholder={`Search in ${category.name}…`}
              showCount={Boolean(search.trim())}
              resultCount={agents.length}
            />
          </div>
        </div>
      </section>

      <div className="page-container py-14 sm:py-20">
        <div className="mb-8 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {isLoading ? (
              "Loading…"
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {agents.length}
                </span>{" "}
                listed agent{agents.length === 1 ? "" : "s"}
                {search.trim() ? " matching your search" : " in this category"}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            Refresh
          </button>
        </div>

        {isError && allListed.length === 0 ? (
          <div className="card-surface rounded-2xl px-6 py-12 text-center">
            <p className="text-sm text-muted">
              {error?.message ?? "Could not load listings."}
            </p>
          </div>
        ) : isLoading ? (
          <AgentGridSkeleton count={6} />
        ) : allListed.length === 0 ? (
          <DiscoverEmptyState />
        ) : agents.length === 0 ? (
          <div className="card-surface rounded-2xl px-6 py-14 text-center">
            <h2 className="font-display text-2xl text-headline">
              No agents in this category yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Listed agents appear here when their name, description, or
              capabilities match {category.name}.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/register" variant="primary" size="md">
                List an agent
              </Button>
              <Button href="/directory" variant="secondary" size="md">
                Browse all
              </Button>
            </div>
          </div>
        ) : (
          <div className="agent-grid">
            {agents.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
