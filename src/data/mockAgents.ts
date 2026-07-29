import type { Agent } from "@/types/agent";

/**
 * Curated mock agents for a crash-free Directory.
 * Replace with safe on-chain reads later (no totalSupply / reverting calls).
 */
export const MOCK_AGENTS: Agent[] = [
  {
    id: 1,
    name: "ArcScout",
    description:
      "Research agent for protocol docs, testnet changelogs, and competitive landscape summaries.",
    capabilities: ["Research", "Summarization", "Docs"],
    reputation: 98.4,
    pricePerTask: 2.5,
    owner: "0xA1b2C3d4E5f6789012345678901234567890AbCd",
    x402Endpoint: "https://api.example.com/x402/arcscout",
  },
  {
    id: 2,
    name: "VaultKeeper",
    description:
      "Treasury operations assistant for allowance checks, transfer drafts, and spend reports.",
    capabilities: ["Treasury", "Reporting", "Ops"],
    reputation: 96.1,
    pricePerTask: 5,
    owner: "0xB2c3D4e5F6789012345678901234567890bCdE",
  },
  {
    id: 3,
    name: "NexusWriter",
    description:
      "Long-form content agent for product updates, launch notes, and editorial-quality copy.",
    capabilities: ["Content", "Editing", "Brand"],
    reputation: 94.8,
    pricePerTask: 1.75,
    owner: "0xC3d4E5f6789012345678901234567890cDeF01",
    x402Endpoint: "https://api.example.com/x402/nexuswriter",
  },
  {
    id: 4,
    name: "LedgerMind",
    description:
      "On-chain analytics agent that turns wallet activity into clear weekly performance briefs.",
    capabilities: ["Analytics", "Wallets", "Charts"],
    reputation: 93.2,
    pricePerTask: 3.25,
    owner: "0xD4e5F6789012345678901234567890dEf01234",
  },
  {
    id: 5,
    name: "SentinelGate",
    description:
      "Security review helper for common contract patterns, config diffs, and risk checklists.",
    capabilities: ["Security", "Review", "Checklist"],
    reputation: 97.0,
    pricePerTask: 8,
    owner: "0xE5f6789012345678901234567890eF01234567",
  },
  {
    id: 6,
    name: "RoutePilot",
    description:
      "Job routing agent that matches open tasks to specialist agents by skill and price.",
    capabilities: ["Matching", "Routing", "Jobs"],
    reputation: 91.5,
    pricePerTask: 1.2,
    owner: "0xF6789012345678901234567890f0123456789A",
    x402Endpoint: "https://api.example.com/x402/routepilot",
  },
  {
    id: 7,
    name: "EchoSupport",
    description:
      "Customer support agent for FAQs, ticket triage, and calm multi-step troubleshooting.",
    capabilities: ["Support", "Triage", "FAQ"],
    reputation: 92.7,
    pricePerTask: 0.9,
    owner: "0x7890123456789012345678900123456789AbCd",
  },
  {
    id: 8,
    name: "PrismIndexer",
    description:
      "Indexing and search agent for agent directories, job boards, and capability filters.",
    capabilities: ["Indexing", "Search", "Directory"],
    reputation: 95.3,
    pricePerTask: 2,
    owner: "0x89012345678901234567890123456789aBcDeF",
  },
  {
    id: 9,
    name: "HarborClerk",
    description:
      "Compliance-minded clerk for KYC checklists, policy summaries, and audit-ready notes.",
    capabilities: ["Compliance", "Policy", "Notes"],
    reputation: 90.1,
    pricePerTask: 4.5,
    owner: "0x9012345678901234567890123456789AbCdEf0",
  },
  {
    id: 10,
    name: "SignalForge",
    description:
      "Market signal agent that compresses social and on-chain noise into actionable briefs.",
    capabilities: ["Signals", "Markets", "Briefs"],
    reputation: 89.6,
    pricePerTask: 3.8,
    owner: "0x012345678901234567890123456789AbCdEf01",
    x402Endpoint: "https://api.example.com/x402/signalforge",
  },
  {
    id: 11,
    name: "CanvasOps",
    description:
      "Design-ops agent for asset inventories, style guides, and launch checklist packaging.",
    capabilities: ["Design ops", "Assets", "QA"],
    reputation: 88.4,
    pricePerTask: 2.1,
    owner: "0x12345678901234567890123456789aBcDeF012",
  },
  {
    id: 12,
    name: "RelayCourier",
    description:
      "Workflow courier that chains multi-agent jobs with clear handoffs and status updates.",
    capabilities: ["Workflows", "Orchestration", "Status"],
    reputation: 94.0,
    pricePerTask: 2.75,
    owner: "0x2345678901234567890123456789AbCdEf0123",
  },
];

export function getMockAgentById(id: number | string): Agent | undefined {
  const numeric = typeof id === "string" ? Number(id) : id;
  if (!Number.isFinite(numeric)) return undefined;
  return MOCK_AGENTS.find((agent) => agent.id === numeric);
}
