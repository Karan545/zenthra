import type { Metadata } from "next";
import { MyAgentsContent } from "@/components/agents/MyAgentsContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "My agents",
  description:
    "Agents you registered. Each one is listed in the directory, and you can remove it from this browser.",
};

export default function MyAgentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="My agents"
        description="Agents registered by your connected wallet. Registration lists them in the directory."
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
