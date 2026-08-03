"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { AgentCard } from "@/components/directory/AgentCard";
import { AgentGridSkeleton } from "@/components/directory/AgentCardSkeleton";
import { Button } from "@/components/ui/Button";
import { CategoryGrid } from "@/components/discover/CategoryGrid";
import { DiscoverEmptyState } from "@/components/discover/DiscoverEmptyState";
import { DiscoverSearch } from "@/components/discover/DiscoverSearch";
import { CATEGORIES } from "@/data/categories";

/**
 * Main discovery experience: hero, search, categories, recent listed agents.
 * Only on-chain ZenthraCurator listings — no mocks.
 */
export function DiscoverHome() {
  const [search, setSearch] = useState("");
  const { agents, allListed, listedCount, isLoading, isError, error, refetch } =
    useAgents({ search });

  const recent = useMemo(() => {
    // When searching, show filtered results; else recent slice
    if (search.trim()) return agents;
    return agents.slice(0, 12);
  }, [agents, search]);

  const isSearching = search.trim().length > 0;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border bg-background-warm">
        <div className="page-container pb-14 pt-16 sm:pb-20 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="font-display text-[2.5rem] leading-[1.12] tracking-[-0.02em] text-headline sm:text-5xl sm:leading-[1.1] md:text-[3.25rem]">
              Agent directory
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:mt-6 sm:max-w-2xl sm:text-lg">
              Live on-chain listings from ZenthraCurator. Search by skill,
              browse categories, and open any agent profile.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-10 max-w-2xl sm:mt-12"
          >
            <DiscoverSearch
              value={search}
              onChange={setSearch}
              showCount={isSearching}
              resultCount={agents.length}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:mt-8"
          >
            <Button href="/register" variant="primary" size="md">
              List your agent
            </Button>
            <Button href="/my-agents" variant="secondary" size="md">
              My agents
            </Button>
          </motion.div>

          <p className="mt-8 text-center text-[13px] text-muted-soft sm:mt-9">
            {isLoading ? (
              "Loading listings…"
            ) : (
              <>
                <span className="font-medium text-headline">{listedCount}</span>{" "}
                agent{listedCount === 1 ? "" : "s"} listed on-chain
              </>
            )}
          </p>
        </div>
      </section>

      <div className="page-container py-14 sm:py-20">
        {isError && allListed.length === 0 ? (
          <div className="card-surface rounded-2xl px-6 py-12 text-center sm:px-10">
            <h2 className="font-display text-2xl text-headline">
              Could not load listings
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {error?.message ?? "Check your connection and try again."}
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-20 sm:space-y-24">
            {/* Search results mode */}
            {isSearching ? (
              <section>
                <div className="mb-8 flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl text-headline sm:text-3xl">
                    Search results
                  </h2>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
                  >
                    <RefreshCw size={14} strokeWidth={1.75} />
                    Refresh
                  </button>
                </div>
                {isLoading ? (
                  <AgentGridSkeleton count={8} />
                ) : agents.length === 0 ? (
                  <div className="card-surface rounded-2xl px-6 py-12 text-center sm:px-10">
                    <p className="font-display text-xl text-headline">
                      No matches
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      Try different keywords, or browse categories below.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="mt-4 text-sm font-medium text-headline hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="agent-grid">
                    {recent.map((agent, i) => (
                      <AgentCard key={agent.id} agent={agent} index={i} />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* Categories */}
                <section>
                  <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
                        Browse
                      </p>
                      <h2 className="mt-1 font-display text-2xl text-headline sm:text-3xl">
                        Explore categories
                      </h2>
                      <p className="mt-2 max-w-xl text-sm text-muted sm:text-[15px]">
                        Find listed agents by domain — counts reflect live
                        Curator listings only.
                      </p>
                    </div>
                    <Link
                      href="/categories"
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-headline hover:underline"
                    >
                      View all
                      <ArrowRight size={14} strokeWidth={1.75} />
                    </Link>
                  </div>
                  <CategoryGrid agents={allListed} limit={8} />
                  <div className="mt-6 text-center sm:hidden">
                    <Link
                      href="/categories"
                      className="text-[13px] font-medium text-headline hover:underline"
                    >
                      View all {CATEGORIES.length} categories
                    </Link>
                  </div>
                </section>

                {/* Recent listed */}
                <section>
                  <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
                        On-chain
                      </p>
                      <h2 className="mt-1 font-display text-2xl text-headline sm:text-3xl">
                        Recently listed
                      </h2>
                      <p className="mt-2 text-sm text-muted sm:text-[15px]">
                        Agents with an active stake on ZenthraCurator
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="inline-flex items-center gap-1.5 self-start text-[13px] text-muted hover:text-foreground sm:self-auto"
                    >
                      <RefreshCw size={14} strokeWidth={1.75} />
                      Refresh
                    </button>
                  </div>

                  {isLoading ? (
                    <AgentGridSkeleton count={8} />
                  ) : allListed.length === 0 ? (
                    <DiscoverEmptyState />
                  ) : (
                    <div className="agent-grid">
                      {recent.map((agent, i) => (
                        <AgentCard key={agent.id} agent={agent} index={i} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
