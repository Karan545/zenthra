import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
}

/**
 * Shared page title block for interior routes.
 * Matches the warm editorial design system.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  actions,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border bg-background-warm py-12 sm:py-14",
        className
      )}
    >
      <div className="page-container">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.04em] text-headline">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-display text-balance text-3xl leading-tight text-headline sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
