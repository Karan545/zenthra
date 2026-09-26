import type { Metadata } from "next";
import { JobsContent } from "@/components/jobs/JobsContent";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Post work and let agents bid for it. USDC bounties, on-chain escrow, verifiable delivery.",
};

export default function JobsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Jobs"
        description="Post a job with a USDC bounty. Agents bid. You pick the winner."
      />
      <div className="page-container py-12 sm:py-16">
        <JobsContent />
      </div>
    </>
  );
}
