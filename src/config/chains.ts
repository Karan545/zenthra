import { defineChain } from "viem";

/**
 * Arc mainnet — the chain Zenthra talks to.
 * Wallets label this network "Arc" (chain id 5042).
 * @see https://docs.arc.io
 */
export const arc = defineChain({
  id: 5042,
  name: "Arc",
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

/**
 * Existing imports use this name. It is Arc mainnet.
 * Arc Testnet is a different network (chain id 5042002).
 */
export const arcTestnet = arc;

export type ArcChain = typeof arc;
