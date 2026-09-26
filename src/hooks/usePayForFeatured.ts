"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import type { Hash } from "viem";
import { erc20Abi } from "@/config/abis";
import { zenthraCuratorV2Abi } from "@/config/abis/zenthraCuratorV2";
import { usdcAddress, zenthraCuratorV2Address } from "@/config/contracts";
import { arcMainnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";

const CONTRACT = zenthraCuratorV2Address;
/** 5 USDC per day (matches deployment param). */
const FEATURED_PRICE_PER_DAY = BigInt(5_000_000);

export type PayForFeaturedResult = {
  approveHash?: Hash;
  featuredHash: Hash;
};

export type PayForFeaturedOptions = {
  onPhase?: (phase: "approve" | "feature" | "confirming") => void;
};

/**
 * Pay to extend an agent's featured status by a number of days.
 * Cost = featuredPricePerDay (5 USDC/day by default) × numDays.
 */
export function usePayForFeatured() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcMainnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const payForFeatured = useCallback(
    async (
      agentId: number,
      numDays: number,
      options?: PayForFeaturedOptions
    ): Promise<PayForFeaturedResult> => {
      if (!address)
        throw new Error("Connect your wallet to purchase featured status.");
      if (numDays <= 0) throw new Error("numDays must be at least 1.");
      if (!publicClient) throw new Error("Could not reach Arc Mainnet RPC.");

      if (chainId !== arcMainnet.id) {
        try {
          await switchChainAsync({ chainId: arcMainnet.id });
        } catch (e) {
          throw new Error(formatWalletError(e));
        }
      }

      // Read on-chain price (fallback to deployment default)
      let pricePerDay = FEATURED_PRICE_PER_DAY;
      try {
        const onChainPrice = await publicClient.readContract({
          address: CONTRACT,
          abi: zenthraCuratorV2Abi,
          functionName: "featuredPricePerDay",
        });
        if (typeof onChainPrice === "bigint" && onChainPrice > BigInt(0)) {
          pricePerDay = onChainPrice;
        }
      } catch {
        // keep default
      }

      const cost = pricePerDay * BigInt(numDays);

      const allowance = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, CONTRACT],
      });

      let approveHash: Hash | undefined;
      if (allowance < cost) {
        options?.onPhase?.("approve");
        try {
          approveHash = await writeContractAsync({
            address: usdcAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [CONTRACT, cost],
            chainId: arcMainnet.id,
          });
        } catch (e) {
          throw new Error(formatWalletError(e, "USDC approval failed."));
        }
        const approveTx = await publicClient.waitForTransactionReceipt({
          hash: approveHash,
          confirmations: 1,
        });
        if (approveTx.status === "reverted")
          throw new Error("USDC approval reverted.");
      }

      options?.onPhase?.("feature");
      let featuredHash: Hash;
      try {
        featuredHash = await writeContractAsync({
          address: CONTRACT,
          abi: zenthraCuratorV2Abi,
          functionName: "payForFeatured",
          args: [BigInt(agentId), BigInt(numDays)],
          chainId: arcMainnet.id,
        });
      } catch (e) {
        throw new Error(
          formatWalletError(e, "payForFeatured failed.")
        );
      }

      options?.onPhase?.("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: featuredHash,
        confirmations: 1,
      });
      if (receipt.status === "reverted")
        throw new Error("payForFeatured transaction reverted.");

      return { approveHash, featuredHash };
    },
    [address, chainId, switchChainAsync, publicClient, writeContractAsync]
  );

  return { payForFeatured, isPending, reset };
}
