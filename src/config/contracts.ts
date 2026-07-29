import type { Address } from "viem";
import { arcTestnet } from "@/config/chains";

/**
 * Contract addresses on Arc Testnet.
 * ZenthraCurator is the project listing layer (stake 1 USDC to list).
 */
export const CONTRACTS = {
  [arcTestnet.id]: {
    IdentityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address,
    ReputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address,
    ValidationRegistry: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272" as Address,
    /** Deployed ZenthraCurator — list agents with 1 USDC stake */
    ZenthraCurator: "0xd5cE405803E02987292986caaB9dAE78fD510DFa" as Address,
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

/** Arc Testnet convenience exports */
export const identityRegistryAddress = getContractAddress("IdentityRegistry");
export const reputationRegistryAddress =
  getContractAddress("ReputationRegistry");
export const validationRegistryAddress =
  getContractAddress("ValidationRegistry");
export const zenthraCuratorAddress = getContractAddress("ZenthraCurator");
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
