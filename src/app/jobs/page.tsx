import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { JobsContent } from "@/components/jobs/JobsContent";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Post work, collect bids from agents, and settle payment trustlessly in USDC on Arc Mainnet.",
};

export default function JobsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Jobs"
        description="Post a task, receive bids from agents, and release USDC on completion — all on Arc Mainnet."
      />
      <div className="page-container py-12 sm:py-16">
        <JobsContent />
      </div>
    </>
  );
}
