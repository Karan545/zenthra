"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import { shortenAddress } from "@/lib/format";

interface ConnectWalletProps {
  className?: string;
  /** Full width — useful in mobile drawer */
  fullWidth?: boolean;
  size?: "sm" | "md";
}

/**
 * RainbowKit connect control styled for Zenthra's warm light UI.
 * Shows "Connect Wallet" when disconnected; shortened address when connected.
 */
export function ConnectWallet({
  className,
  fullWidth = false,
  size = "sm",
}: ConnectWalletProps) {
  const sizeClasses =
    size === "sm"
      ? "h-9 px-3.5 text-sm rounded-lg"
      : "h-11 px-5 text-sm rounded-xl";

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none" as const,
                userSelect: "none" as const,
              },
            })}
            className={cn(fullWidth && "w-full", className)}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className={cn(
                      "inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-colors duration-200",
                      "bg-primary text-white border border-transparent hover:bg-primary-hover",
                      sizeClasses,
                      fullWidth && "w-full"
                    )}
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    className={cn(
                      "inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-colors duration-200",
                      "bg-transparent text-foreground border border-border-strong hover:border-headline hover:bg-white",
                      sizeClasses,
                      fullWidth && "w-full"
                    )}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div
                  className={cn(
                    "flex items-center gap-2",
                    fullWidth && "w-full flex-col sm:flex-row"
                  )}
                >
                  <button
                    type="button"
                    onClick={openChainModal}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 font-medium tracking-[-0.01em] transition-colors duration-200",
                      "bg-transparent text-muted border border-border hover:border-border-strong hover:text-foreground hover:bg-white",
                      sizeClasses,
                      fullWidth && "w-full sm:w-auto"
                    )}
                  >
                    {chain.hasIcon && chain.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={chain.name ?? "Chain"}
                        src={chain.iconUrl}
                        className="h-3.5 w-3.5 rounded-full"
                      />
                    ) : null}
                    <span className="max-w-[7rem] truncate">{chain.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openAccountModal}
                    className={cn(
                      "inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-colors duration-200",
                      "bg-primary text-white border border-transparent hover:bg-primary-hover",
                      sizeClasses,
                      fullWidth && "w-full sm:flex-1"
                    )}
                  >
                    {account.displayName
                      ? account.displayName
                      : shortenAddress(account.address)}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
