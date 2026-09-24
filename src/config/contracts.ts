import type { Address } from "viem";
import { arcTestnet } from "@/config/chains";

/**
 * Contract addresses on Arc mainnet (chain id 5042).
 * Identity and Reputation are the canonical ERC-8004 mainnet registries
 * (same CREATE2 addresses on every mainnet). Confirmed live on
 * https://rpc.mainnet.arc.io — Reputation.getIdentityRegistry() returns
 * the identity registry below.
 *
 * ZenthraCurator and the ERC-8183 job contract were only deployed on
 * Arc Testnet (chain id 5042002). Those addresses have no code on mainnet,
 * so listing and jobs stay disabled until they are deployed here.
 */
export const CONTRACTS = {
  [arcTestnet.id]: {
    IdentityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
    ReputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Address,
    /** Not part of the official ERC-8004 mainnet set. */
    ValidationRegistry: "0x0000000000000000000000000000000000000000" as Address,
    /**
     * Testnet deployment. No bytecode on Arc mainnet — do not send stake here.
     * Replace after a mainnet deploy of ZenthraCurator.
     */
    ZenthraCurator: "0x0000000000000000000000000000000000000000" as Address,
    /**
     * ERC-8183 reference exists on Arc Testnet only. No bytecode on mainnet.
     */
    AgenticCommerce: "0x0000000000000000000000000000000000000000" as Address,
    /**
     * Arc native USDC ERC-20 interface (6 decimals).
     * @see https://docs.arc.io/arc/references/contract-addresses
     */
    USDC: "0x3600000000000000000000000000000000000000" as Address,
  },
} as const;

export type ContractName = keyof (typeof CONTRACTS)[typeof arcTestnet.id];

export function getContractAddress(
  name: ContractName,
  chainId: number = arcTestnet.id
): Address {
  const chainContracts = CONTRACTS[chainId as keyof typeof CONTRACTS];
  if (!chainContracts) {
    throw new Error(`No contracts configured for chain ${chainId}`);
  }
  return chainContracts[name];
}

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

/** True when a contract address is set (not the zero placeholder). */
export function isDeployedAddress(address: Address): boolean {
  return address.toLowerCase() !== ZERO_ADDRESS;
}

/** Arc mainnet convenience exports */
export const identityRegistryAddress = getContractAddress("IdentityRegistry");
export const reputationRegistryAddress =
  getContractAddress("ReputationRegistry");
export const validationRegistryAddress =
  getContractAddress("ValidationRegistry");
export const zenthraCuratorAddress = getContractAddress("ZenthraCurator");
export const agenticCommerceAddress = getContractAddress("AgenticCommerce");
export const usdcAddress = getContractAddress("USDC");

/** 1 USDC with 6 decimals (default list stake). */
export const ONE_USDC = BigInt(1_000_000);

/** Convert display USDC (e.g. 2.5) to on-chain units. */
export function toUsdcUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) return BigInt(0);
  return BigInt(Math.round(amount * 1_000_000));
}

/** Convert on-chain USDC units to display number. */
export function fromUsdcUnits(units: bigint | number | string): number {
  const n = typeof units === "bigint" ? Number(units) : Number(units);
  if (!Number.isFinite(n)) return 0;
  return n / 1_000_000;
}
