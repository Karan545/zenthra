import type { Address } from "viem";
import { arcMainnet } from "@/config/chains";

// ─── Arc Mainnet contract addresses ──────────────────────────────────────────

/** ERC-8004 identity registry (canonical Arc Mainnet address) */
export const identityRegistryAddress =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address;

/** Reputation registry */
export const reputationRegistryAddress =
  "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Address;

/** Validation registry */
export const validationRegistryAddress =
  "0x0000000000000000000000000000000000000000" as Address;

/** ZenthraCuratorV2 — deployed on Arc Mainnet */
export const zenthraCuratorAddress =
  "0x26d56d1768474803fe1930888fe42235bbbccf84" as Address;

/** Alias for hooks that import zenthraCuratorV2Address */
export const zenthraCuratorV2Address = zenthraCuratorAddress;

/** ZenthraJobBoard — deployed on Arc Mainnet */
export const zenthraJobBoardAddress =
  "0x4bf403f1a3be64e23faa2852fce221898a8a4884" as Address;

/** Arc native USDC ERC-20 predeploy (6 decimals) */
export const usdcAddress =
  "0x3600000000000000000000000000000000000000" as Address;

/** Not used on mainnet — kept for ABI compatibility */
export const agenticCommerceAddress =
  "0x0000000000000000000000000000000000000000" as Address;

// ─── Chain ID ─────────────────────────────────────────────────────────────────
export const CHAIN_ID = arcMainnet.id; // 5042

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

/** True when a contract address is set (not the zero placeholder). */
export function isDeployedAddress(address: Address): boolean {
  return address.toLowerCase() !== ZERO_ADDRESS;
}

/** 1 USDC in on-chain units (6 decimals). */
export const ONE_USDC = BigInt(1_000_000);

/** Convert display USDC amount (e.g. 2.5) to on-chain bigint units. */
export function toUsdcUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) return BigInt(0);
  return BigInt(Math.round(amount * 1_000_000));
}

/** Convert on-chain USDC units to display number. */
export function fromUsdcUnits(units: bigint | number | string): number {
  const n = typeof units === "bigint" ? Number(units) : Number(units);
  return n / 1_000_000;
}
