"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CATEGORIES } from "@/data/categories";
import { CategoryIcon } from "@/components/discover/CategoryIcon";
import { countAgentsByCategory } from "@/lib/agentDiscovery";
import type { Agent } from "@/types/agent";

interface CategoryGridProps {
  agents: Agent[];
  /** Limit cards shown (default all). */
  limit?: number;
}

export function CategoryGrid({ agents, limit }: CategoryGridProps) {
  const counts = countAgentsByCategory(agents);
  const list = limit ? CATEGORIES.slice(0, limit) : CATEGORIES;

  return (
    <div className="category-grid">
      {list.map((cat, i) => {
        const count = counts[cat.slug] ?? 0;
        return (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35 }}
          >
            <Link
              href={`/category/${cat.slug}`}
              className="group card-surface flex h-full flex-col rounded-2xl p-6 sm:p-7 transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft-md"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0ebe3] text-headline-deep transition-colors group-hover:bg-[#ebe4d9]">
                <CategoryIcon name={cat.icon} size={22} />
              </div>
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                {cat.name}
              </h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted sm:text-sm">
                {cat.description}
              </p>
              <p className="mt-4 text-[12px] text-muted-soft">
                {count === 0
                  ? "No listed agents yet"
                  : `${count} listed agent${count === 1 ? "" : "s"}`}
              </p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
