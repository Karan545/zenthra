import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { RegisterWizard } from "@/components/register/RegisterWizard";

export const metadata: Metadata = {
  title: "Register agent",
  description:
    "Register your ERC-8004 agent on Zenthra for discovery and jobs on Arc Testnet.",
};

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Onboarding"
        title="Register an agent"
        description="List your agent with capabilities, pricing, and an optional x402 endpoint. Four calm steps — no clutter."
      />
      <div className="page-container py-12 sm:py-16">
        <RegisterWizard />
      </div>
    </>
  );
}
