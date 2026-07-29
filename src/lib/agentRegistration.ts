import type { Address, Log, TransactionReceipt } from "viem";
import { decodeEventLog, zeroAddress } from "viem";
import type { AgentRegistrationDraft } from "@/types/agent";
import { identityRegistryAbi } from "@/config/abis";

/**
 * ERC-8004-oriented agent registration file built from the Zenthra form.
 * @see https://eips.ethereum.org/EIPS/eip-8004
 */
export type AgentRegistrationFile = {
  type: string;
  name: string;
  description: string;
  image?: string;
  services: Array<{
    name: string;
    endpoint: string;
    version?: string;
  }>;
  x402Support: boolean;
  active: boolean;
  capabilities: string[];
  /** Directory category slugs selected at registration */
  categories: string[];
  pricing: {
    pricePerTask: number;
    currency: string;
  };
  registrations: Array<{
    agentId: string | null;
    agentRegistry: string;
  }>;
  supportedTrust: string[];
};

export function buildAgentRegistrationFile(
  draft: AgentRegistrationDraft,
  owner: Address
): AgentRegistrationFile {
  const services: AgentRegistrationFile["services"] = [
    {
      name: "agentWallet",
      endpoint: owner,
    },
  ];

  const endpoint = draft.x402Endpoint.trim();
  if (endpoint) {
    services.push({
      name: "x402",
      endpoint,
      version: "1",
    });
  }

  const file: AgentRegistrationFile = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: draft.name.trim(),
    description: draft.description.trim(),
    services,
    x402Support: Boolean(endpoint),
    active: true,
    capabilities: [...draft.capabilities],
    categories: [...draft.categories],
    pricing: {
      pricePerTask: Number(draft.pricePerTask),
      currency: "USDC",
    },
    registrations: [
      {
        agentId: null,
        agentRegistry: "eip155:5042002:0x8004A818BFB912233c491871b3d84c89A494BD9e",
      },
    ],
    supportedTrust: ["reputation"],
  };

  if (draft.image.trim()) {
    file.image = draft.image.trim();
  }

  return file;
}

/** Encode registration JSON as a data: URI (no IPFS required). */
export function toAgentDataUri(file: AgentRegistrationFile): string {
  const json = JSON.stringify(file);
  const base64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf8").toString("base64");
  return `data:application/json;base64,${base64}`;
}

/**
 * Read minted agentId from Identity Registry Transfer (mint from zero address).
 */
export function extractAgentIdFromReceipt(
  receipt: TransactionReceipt
): bigint | null {
  for (const log of receipt.logs as Log[]) {
    try {
      const decoded = decodeEventLog({
        abi: identityRegistryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") continue;
      const args = decoded.args as {
        from?: Address;
        to?: Address;
        tokenId?: bigint;
      };
      if (
        args.from &&
        args.from.toLowerCase() === zeroAddress.toLowerCase() &&
        args.tokenId != null
      ) {
        return args.tokenId;
      }
    } catch {
      // Not our event / wrong ABI topic — skip
    }
  }
  return null;
}

/** Human-readable wallet / chain errors for the registration UI. */
export function formatRegistrationError(error: unknown): string {
  if (!error) return "Registration failed. Please try again.";

  const err = error as {
    shortMessage?: string;
    message?: string;
    name?: string;
    cause?: { shortMessage?: string; message?: string; name?: string };
  };

  const raw = [
    err.shortMessage,
    err.message,
    err.cause?.shortMessage,
    err.cause?.message,
    err.name,
    err.cause?.name,
  ]
    .filter(Boolean)
    .join(" ");

  const lower = raw.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("denied transaction") ||
    err.name === "UserRejectedRequestError" ||
    err.cause?.name === "UserRejectedRequestError"
  ) {
    return "You rejected the transaction in your wallet. No agent was registered.";
  }

  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    lower.includes("gas")
  ) {
    return "Insufficient USDC/gas on Arc Testnet to complete registration.";
  }

  if (lower.includes("chain") || lower.includes("network")) {
    return "Wrong network. Switch to Arc Testnet (chain id 5042002) and try again.";
  }

  if (err.shortMessage) return err.shortMessage;
  if (err.message) {
    // Keep messages short for UI
    return err.message.length > 180
      ? `${err.message.slice(0, 180)}…`
      : err.message;
  }

  return "Registration failed. Please try again.";
}
