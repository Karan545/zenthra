import type { Address } from "viem";
import { ONE_USDC, usdcAddress } from "@/config/contracts";

/**
 * Wallet that owns ArcScout and receives its fees.
 * The address in AGENTS.md is the Circle SCP deployer, so it is not used here.
 * Override with NEXT_PUBLIC_X402_PAY_TO.
 */
const DEFAULT_PAY_TO =
  "0x36C86790f33ceaB88a1349BA6aC45538A3308A9F" as Address;

function payToAddress(): Address {
  const configured = (process.env.NEXT_PUBLIC_X402_PAY_TO ?? "").trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(configured)) return configured as Address;
  return DEFAULT_PAY_TO;
}

export const x402PayTo = payToAddress();
export const x402Asset = usdcAddress;
export const x402Amount = ONE_USDC;
export const x402Network = "eip155:5042";
export const x402PriceLabel = "1 USDC";
