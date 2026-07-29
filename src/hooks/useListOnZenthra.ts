"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import type { Hash } from "viem";
import { erc20Abi, zenthraCuratorAbi } from "@/config/abis";
import {
  ONE_USDC,
  toUsdcUnits,
  usdcAddress,
  zenthraCuratorAddress,
} from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";
import { updateRegisteredAgent } from "@/lib/localAgents";
import { buildListingCapabilities } from "@/lib/categories";
import type { Agent } from "@/types/agent";

export type ListOnZenthraInput = {
  agentId: number;
  x402Endpoint?: string;
  capabilities: string[];
  /** Category slugs for directory pages */
  categories?: string[];
  /** Display USDC price per task (e.g. 2.5). */
  pricePerTask: number;
  /** Optional fields to enrich local cache after list. */
  meta?: Partial<Agent>;
};

export type ListOnZenthraResult = {
  approveHash?: Hash;
  listHash: Hash;
};

export type ListOnZenthraOptions = {
  onPhase?: (phase: "approve" | "list" | "confirming") => void;
};

/**
 * Approve USDC + call ZenthraCurator.listAgent (stake 1 USDC).
 */
export function useListOnZenthra() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const listOnZenthra = useCallback(
    async (
      input: ListOnZenthraInput,
      options?: ListOnZenthraOptions
    ): Promise<ListOnZenthraResult> => {
      if (!address) {
        throw new Error("Connect your wallet on Arc Testnet to list an agent.");
      }
      if (!input.capabilities?.length) {
        throw new Error("At least one capability is required to list.");
      }

      if (chainId !== arcTestnet.id) {
        try {
          await switchChainAsync({ chainId: arcTestnet.id });
        } catch (e) {
          throw new Error(formatWalletError(e));
        }
      }

      if (!publicClient) {
        throw new Error("Could not reach Arc Testnet RPC.");
      }

      // Read live stake amount (fallback to 1 USDC)
      let stake = ONE_USDC;
      try {
        const onChainStake = await publicClient.readContract({
          address: zenthraCuratorAddress,
          abi: zenthraCuratorAbi,
          functionName: "listStakeAmount",
        });
        if (typeof onChainStake === "bigint" && onChainStake > BigInt(0)) {
          stake = onChainStake;
        }
      } catch {
        // keep ONE_USDC
      }

      // Ensure enough USDC
      try {
        const bal = await publicClient.readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        });
        if (bal < stake) {
          throw new Error(
            "Insufficient USDC to stake 1 USDC for listing. Fund your wallet on Arc Testnet."
          );
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("Insufficient USDC")) {
          throw e;
        }
      }

      const allowance = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, zenthraCuratorAddress],
      });

      let approveHash: Hash | undefined;

      if (allowance < stake) {
        options?.onPhase?.("approve");
        try {
          approveHash = await writeContractAsync({
            address: usdcAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [zenthraCuratorAddress, stake],
            chainId: arcTestnet.id,
          });
        } catch (e) {
          throw new Error(formatWalletError(e, "USDC approval failed."));
        }

        options?.onPhase?.("confirming");
        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveHash,
          confirmations: 1,
        });
        if (approveReceipt.status === "reverted") {
          throw new Error("USDC approval transaction reverted.");
        }
      }

      options?.onPhase?.("list");
      const priceUnits = toUsdcUnits(input.pricePerTask);
      const categories =
        input.categories ?? input.meta?.categories ?? [];
      const listingCapabilities = buildListingCapabilities(
        input.capabilities,
        categories
      );

      let listHash: Hash;
      try {
        listHash = await writeContractAsync({
          address: zenthraCuratorAddress,
          abi: zenthraCuratorAbi,
          functionName: "listAgent",
          args: [
            BigInt(input.agentId),
            input.x402Endpoint?.trim() ?? "",
            listingCapabilities,
            priceUnits,
          ],
          chainId: arcTestnet.id,
        });
      } catch (e) {
        throw new Error(
          formatWalletError(e, "Listing transaction failed. Please try again.")
        );
      }

      options?.onPhase?.("confirming");
      const listReceipt = await publicClient.waitForTransactionReceipt({
        hash: listHash,
        confirmations: 1,
      });
      if (listReceipt.status === "reverted") {
        throw new Error(
          "listAgent reverted. Ensure you own this agent NFT and are not already listed."
        );
      }

      updateRegisteredAgent(input.agentId, {
        ...input.meta,
        id: input.agentId,
        owner: address,
        name: input.meta?.name,
        description: input.meta?.description,
        capabilities: input.capabilities,
        categories,
        pricePerTask: input.pricePerTask,
        x402Endpoint: input.x402Endpoint?.trim() || undefined,
        isOnChain: true,
        isListedOnZenthra: true,
        listTxHash: listHash,
        listedAt: Math.floor(Date.now() / 1000),
      });

      return { approveHash, listHash };
    },
    [address, chainId, switchChainAsync, publicClient, writeContractAsync]
  );

  return {
    listOnZenthra,
    isPending,
    reset,
  };
}
