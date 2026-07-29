import type { Metadata } from "next";
import { AgentProfile } from "@/components/agent/AgentProfile";

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AgentPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Agent ${id}`,
    description: `Profile for agent ${id} on Zenthra.`,
  };
}

export default async function AgentProfilePage({ params }: AgentPageProps) {
  const { id } = await params;
  return <AgentProfile id={id} />;
}
