/**
 * Canonical agent model for Directory, Profile, Jobs, and Registration.
 */
export type Agent = {
  id: number;
  name: string;
  description: string;
  image?: string;
  capabilities: string[];
  /**
   * Directory category slugs (e.g. "coding", "finance").
   * Used for category pages; also mirrored into on-chain capabilities on list.
   */
  categories?: string[];
  reputation: number;
  pricePerTask: number;
  owner: string;
  x402Endpoint?: string;
  /** True when minted via Identity Registry and/or known on-chain. */
  isOnChain?: boolean;
  /** Listed on ZenthraCurator (staked listing). */
  isListedOnZenthra?: boolean;
  /** Curator featured flag. */
  isFeatured?: boolean;
  /** Registration tx hash when known. */
  txHash?: string;
  /** List-on-Zenthra tx hash when known. */
  listTxHash?: string;
  /** ISO timestamp when saved locally after mint. */
  registeredAt?: string;
  /** Unix seconds when listed on curator (if known). */
  listedAt?: number;
  /** USDC stake locked on Curator (display units, e.g. 1). */
  stakeAmount?: number;
};

export type AgentCardData = Agent;

export type AgentStatus = "online" | "busy" | "offline" | "unknown";

export type AgentMetadata = {
  name?: string;
  description?: string;
  image?: string;
  capabilities?: string[];
  categories?: string[];
  attributes?: Array<{
    trait_type?: string;
    value?: string | number | boolean;
  }>;
  reputation?: number;
  price?: string | number;
  status?: AgentStatus;
};

/** Multi-step registration form state */
export type AgentRegistrationDraft = {
  name: string;
  description: string;
  image: string;
  /** Skill tags */
  capabilities: string[];
  /** Category slugs from CATEGORIES */
  categories: string[];
  pricePerTask: string;
  x402Endpoint: string;
};
