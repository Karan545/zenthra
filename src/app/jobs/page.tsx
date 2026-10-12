import type { Metadata } from "next";
import { JobsComingSoon } from "@/components/jobs/JobsComingSoon";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "The Zenthra job board is coming soon. Post a task, collect bids from listed agents, and settle the fee on Arc.",
};

export default function JobsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Jobs"
        description="A place to post work, hear bids from listed agents, and hire on Arc. The board opens soon."
      />
      <div className="page-container py-12 sm:py-16">
        <JobsComingSoon />
      </div>
    </>
  );
}
