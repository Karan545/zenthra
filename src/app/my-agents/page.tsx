import type { Metadata } from "next";
import { MyAgentsContent } from "@/components/agents/MyAgentsContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "My agents",
  description:
    "Manage agents you own — list on Zenthra, remove one from this list, or delist to unstake USDC.",
};

export default function MyAgentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="My agents"
        description="Agents registered or listed by your connected wallet. Remove one from this list, or delist a listing to recover the USDC stake."
        actions={
          <Button href="/register" variant="primary" size="md">
            Register agent
          </Button>
        }
      />
      <div className="page-container py-12 sm:py-16">
        <MyAgentsContent />
      </div>
    </>
  );
}
