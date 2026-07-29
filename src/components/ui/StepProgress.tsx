"use client";

import { cn } from "@/lib/utils";

interface StepProgressProps {
  steps: string[];
  current: number; // 0-based
}

export function StepProgress({ steps, current }: StepProgressProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center gap-1 sm:gap-2">
        {steps.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
                    done && "bg-primary text-white",
                    active && "bg-headline text-white",
                    !done && !active && "bg-[#ebe4d9] text-muted"
                  )}
                >
                  {index + 1}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    className={cn(
                      "h-px min-w-0 flex-1",
                      index < current ? "bg-primary/50" : "bg-border"
                    )}
                    aria-hidden
                  />
                ) : null}
              </div>
              <span
                className={cn(
                  "hidden truncate text-[11px] sm:block",
                  active ? "font-medium text-foreground" : "text-muted-soft"
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
