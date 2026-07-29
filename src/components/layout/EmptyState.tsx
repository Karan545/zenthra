import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Placeholder content area for pages under construction. */
export function EmptyState({
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "card-surface rounded-2xl px-6 py-14 text-center sm:px-10 sm:py-16",
        className
      )}
    >
      <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
        Coming soon
      </p>
      <h2 className="mt-3 font-display text-2xl text-headline sm:text-[1.75rem]">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}
