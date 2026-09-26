import { defineChain } from "viem";

/**
 * Arc Mainnet — chain ID 5042.
 * USDC is the native gas token on Arc.
 * @see https://docs.arc.io
 */
export const arcMainnet = defineChain({
  id: 5042,
  name: "Arc Mainnet",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mainnet.arc.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://explorer.arc.io",
    },
  },
  testnet: false,
});

/** Alias kept for backward-compat with old imports */
export const arc = arcMainnet;
export const arcTestnet = arcMainnet;

export type ArcChain = typeof arcMainnet;
