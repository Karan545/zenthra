"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "@/config/wagmi";
import { arcTestnet } from "@/config/chains";

import "@rainbow-me/rainbowkit/styles.css";

/** Zenthra warm / editorial light theme for RainbowKit modals. */
const zenthraRainbowTheme = lightTheme({
  accentColor: "#6f563c",
  accentColorForeground: "#ffffff",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

// Soften modal colors toward cream surfaces
zenthraRainbowTheme.colors.modalBackground = "#ffffff";
zenthraRainbowTheme.colors.modalBorder = "#e8e2d9";
zenthraRainbowTheme.colors.profileForeground = "#f7f4ef";
zenthraRainbowTheme.colors.menuItemBackground = "#f7f4ef";
zenthraRainbowTheme.colors.closeButton = "#6b6560";
zenthraRainbowTheme.colors.closeButtonBackground = "#f0ebe3";
zenthraRainbowTheme.colors.generalBorder = "#e8e2d9";
zenthraRainbowTheme.colors.actionButtonBorder = "#e8e2d9";
zenthraRainbowTheme.colors.connectButtonBackground = "#6f563c";
zenthraRainbowTheme.colors.connectButtonInnerBackground = "#6f563c";
zenthraRainbowTheme.colors.connectButtonText = "#ffffff";
zenthraRainbowTheme.colors.modalText = "#1a1a1a";
zenthraRainbowTheme.colors.modalTextSecondary = "#6b6560";

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={zenthraRainbowTheme}
          initialChain={arcTestnet}
          locale="en-US"
          coolMode={false}
          modalSize="compact"
          appInfo={{
            appName: "Zenthra",
            learnMoreUrl: "https://docs.arc.network",
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
