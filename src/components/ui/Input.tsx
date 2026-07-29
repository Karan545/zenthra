import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
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
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-foreground outline-none transition-colors",
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

Input.displayName = "Input";
