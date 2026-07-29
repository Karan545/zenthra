import { createPublicClient, http, type PublicClient } from "viem";
import { arcTestnet } from "@/config/chains";

/**
 * Wallet-independent Arc Testnet public client for reads.
 * Do NOT rely on wagmi `usePublicClient` for directory metadata —
 * that can be undefined when no wallet is connected / SSR.
 */
let client: PublicClient | null = null;

export function getArcPublicClient(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network", {
        timeout: 20_000,
        retryCount: 2,
        retryDelay: 400,
      }),
      batch: {
        multicall: true,
      },
    });
  }
  return client;
}
