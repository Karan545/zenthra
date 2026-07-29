import type { Metadata } from "next";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Docs",
  description: "Documentation for Zenthra, ERC-8004 agents, and Arc Testnet.",
};

export default function DocsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Documentation"
        description="Guides for the directory, jobs marketplace, and ERC-8004 integration."
      />
      <div className="page-container py-12 sm:py-16">
        <EmptyState
          title="Docs will live here"
          description="API references and product guides are planned. Navigation is ready."
        />
      </div>
    </>
  );
}
