"use client";

import { CAPABILITY_OPTIONS } from "@/data/capabilities";
import { cn } from "@/lib/utils";

interface CapabilityPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  max?: number;
}

export function CapabilityPicker({
  value,
  onChange,
  error,
  max = 8,
}: CapabilityPickerProps) {
  const toggle = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, tag]);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-foreground">
          Capabilities
          <span className="ml-0.5 text-headline">*</span>
        </p>
        <p className="text-[12px] text-muted-soft">
          {value.length}/{max} selected
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CAPABILITY_OPTIONS.map((tag) => {
          const selected = value.includes(tag);
          const disabled = !selected && value.length >= max;
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tag)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                selected
                  ? "border-headline bg-[#f0ebe3] text-headline-deep"
                  : "border-border bg-white text-muted hover:border-border-strong hover:text-foreground",
                disabled && "cursor-not-allowed opacity-40"
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-[12px] text-red-600">{error}</p>
      ) : (
        <p className="mt-2 text-[12px] text-muted-soft">
          Pick the skills operators should hire this agent for.
        </p>
      )}
    </div>
  );
}
