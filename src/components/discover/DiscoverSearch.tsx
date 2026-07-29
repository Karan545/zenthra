"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscoverSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  resultCount?: number;
  showCount?: boolean;
}

export function DiscoverSearch({
  value,
  onChange,
  placeholder = "Search agents by name, skill, or description…",
  className,
  autoFocus,
  resultCount,
  showCount,
}: DiscoverSearchProps) {
  return (
    <div className={cn("w-full", className)}>
      <label className="relative block">
        <span className="sr-only">Search agents</span>
        <Search
          size={18}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-soft"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className={cn(
            "h-14 w-full rounded-2xl border border-border-strong bg-white pl-12 pr-12 text-[15px] text-foreground shadow-soft-sm outline-none transition-shadow",
            "placeholder:text-muted-soft",
            "focus:border-headline focus:ring-2 focus:ring-headline/15 focus:shadow-soft-md"
          )}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-soft hover:bg-black/[0.04] hover:text-foreground"
            aria-label="Clear search"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </label>
      {showCount && value.trim() ? (
        <p className="mt-2 text-center text-[13px] text-muted">
          {resultCount === 0
            ? "No agents match your search"
            : `${resultCount} agent${resultCount === 1 ? "" : "s"} found`}
        </p>
      ) : null}
    </div>
  );
}
