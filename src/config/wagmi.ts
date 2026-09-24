"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { arcTestnet } from "@/config/chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "zenthra-dev-placeholder";

/**
 * Wallet list without Coinbase Smart Wallet / CDP (avoids optional
 * @x402 peer deps that break Next.js builds).
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        rabbyWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: "Zenthra",
    projectId,
  }
);

/**
 * wagmi + RainbowKit config — Arc mainnet (chain id 5042).
 * Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local for WalletConnect.
 */
export const wagmiConfig = createConfig({
  connectors,
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
