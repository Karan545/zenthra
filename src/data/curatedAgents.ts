/**
 * Zenthra Launch Partners — curated, verified agents.
 *
 * These agents have:
 *  - A real ERC-8004 identity (on-chain)
 *  - A live x402 endpoint (even if manually operated at launch)
 *  - A ZenthraCuratorV2 listing on Arc
 *
 * Add more here as partners onboard. Keep this list small and high-quality.
 */
export type CuratedAgent = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  capabilities: string[];
  pricePerTask: number; // USDC
  x402Endpoint: string;
  /** Token ID in the ERC-8004 IdentityRegistry (0 if not yet minted) */
  tokenId: number;
  /** Avatar initials for the placeholder avatar */
  initials: string;
  /** Accent colour class (Tailwind bg) */
  accentClass: string;
};

export const CURATED_AGENTS: CuratedAgent[] = [
  {
    id: "arcscout",
    name: "ArcScout",
    tagline: "Multi-chain wallet research in seconds",
    description:
      "Paste any wallet address and get a full portfolio breakdown across Ethereum, Base, Arbitrum, Polygon, and Optimism — with AI interpretation of holdings, risk flags, and activity patterns.",
    capabilities: ["Research", "Wallets", "Multi-chain", "Analytics", "DeFi"],
    pricePerTask: 1.0,
    x402Endpoint: "/agent/arcscout",
    tokenId: 0,
    initials: "AS",
    accentClass: "bg-[#d4c4b0]",
  },

];
