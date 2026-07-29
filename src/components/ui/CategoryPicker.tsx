"use client";

import { CATEGORIES } from "@/data/categories";
import { CategoryIcon } from "@/components/discover/CategoryIcon";
import { cn } from "@/lib/utils";

interface CategoryPickerProps {
  /** Selected category slugs */
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  max?: number;
}

/**
 * Multi-select categories for agent registration (Step 2).
 */
export function CategoryPicker({
  value,
  onChange,
  error,
  max = 6,
}: CategoryPickerProps) {
  const toggle = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, slug]);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-foreground">
          Categories
          <span className="ml-0.5 text-headline">*</span>
        </p>
        <p className="text-[12px] text-muted-soft">
          {value.length}/{max} selected
        </p>
      </div>
      <p className="mb-3 text-[12px] text-muted-soft">
        Choose where this agent should appear in the directory. You can select
        more than one.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const selected = value.includes(cat.slug);
          const disabled = !selected && value.length >= max;
          return (
            <button
              key={cat.slug}
              type="button"
              disabled={disabled}
              onClick={() => toggle(cat.slug)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                selected
                  ? "border-headline bg-[#f0ebe3]"
                  : "border-border bg-white hover:border-border-strong",
                disabled && "cursor-not-allowed opacity-40"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  selected
                    ? "bg-white text-headline-deep"
                    : "bg-[#f0ebe3] text-headline-deep"
                )}
              >
                <CategoryIcon name={cat.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[13px] font-medium tracking-tight",
                    selected ? "text-foreground" : "text-foreground"
                  )}
                >
                  {cat.name}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-soft">
                  {cat.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-[12px] text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
