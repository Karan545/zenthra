import { cn } from "@/lib/utils";

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#ebe4d9]", className)}
      aria-hidden
    />
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="card-surface rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <SkeletonPulse className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-2/3" />
          <SkeletonPulse className="h-3 w-16" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonPulse className="h-3 w-full" />
        <SkeletonPulse className="h-3 w-5/6" />
      </div>
      <div className="mt-4 flex gap-1.5">
        <SkeletonPulse className="h-5 w-14 rounded-md" />
        <SkeletonPulse className="h-5 w-16 rounded-md" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="space-y-1.5">
          <SkeletonPulse className="h-2.5 w-10" />
          <SkeletonPulse className="h-3 w-24" />
        </div>
        <div className="space-y-1.5 flex flex-col items-end">
          <SkeletonPulse className="h-2.5 w-10" />
          <SkeletonPulse className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

export function AgentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="agent-grid"
      aria-busy="true"
      aria-label="Loading agents"
    >
      {Array.from({ length: count }).map((_, i) => (
        <AgentCardSkeleton key={i} />
      ))}
    </div>
  );
}
