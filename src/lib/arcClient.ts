import { createPublicClient, http, type PublicClient } from "viem";
import { arcTestnet } from "@/config/chains";

/**
 * Wallet-independent Arc mainnet public client for reads.
 * Do NOT rely on wagmi `usePublicClient` for directory metadata —
 * that can be undefined when no wallet is connected / SSR.
 */
let client: PublicClient | null = null;

export function getArcPublicClient(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: arcTestnet,
      transport: http(arcTestnet.rpcUrls.default.http[0], {
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
