import { cn } from "@/lib/utils";
import { forwardRef, type TextareaHTMLAttributes } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-[13px] font-medium text-foreground"
          >
            {label}
            {props.required ? (
              <span className="ml-0.5 text-headline">*</span>
            ) : null}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "min-h-[120px] w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm text-foreground outline-none transition-colors",
            "placeholder:text-muted-soft",
            "focus:border-headline focus:ring-2 focus:ring-headline/15",
            error ? "border-red-300" : "border-border-strong",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-[12px] text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-[12px] text-muted-soft">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
