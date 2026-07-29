/**
 * ZenthraCurator ABI (deployed on Arc Testnet).
 * @see contracts/src/ZenthraCurator.sol
 */
export const zenthraCuratorAbi = [
  {
    type: "function",
    name: "listAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "x402Endpoint", type: "string" },
      { name: "capabilities", type: "string[]" },
      { name: "pricePerTask", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "delistAgent",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "featureAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "featured", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getAgent",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "x402Endpoint", type: "string" },
          { name: "capabilities", type: "string[]" },
          { name: "pricePerTask", type: "uint256" },
          { name: "listedAt", type: "uint64" },
          { name: "isActive", type: "bool" },
          { name: "isFeatured", type: "bool" },
          { name: "stakeAmount", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getAllListedAgents",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getAgents",
    stateMutability: "view",
    inputs: [{ name: "agentIds", type: "uint256[]" }],
    outputs: [
      {
        name: "results",
        type: "tuple[]",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "x402Endpoint", type: "string" },
          { name: "capabilities", type: "string[]" },
          { name: "pricePerTask", type: "uint256" },
          { name: "listedAt", type: "uint64" },
          { name: "isActive", type: "bool" },
          { name: "isFeatured", type: "bool" },
          { name: "stakeAmount", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "listedCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isListed",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "listStakeAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "identityRegistry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "AgentListed",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "x402Endpoint", type: "string", indexed: false },
      { name: "pricePerTask", type: "uint256", indexed: false },
      { name: "stakeAmount", type: "uint256", indexed: false },
      { name: "listedAt", type: "uint64", indexed: false },
    ],
  },
] as const;

export type CuratorListing = {
  agentId: bigint;
  owner: `0x${string}`;
  x402Endpoint: string;
  capabilities: readonly string[];
  pricePerTask: bigint;
  listedAt: bigint;
  isActive: boolean;
  isFeatured: boolean;
  stakeAmount: bigint;
};
