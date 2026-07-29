"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import type { Hash, TransactionReceipt } from "viem";
import { identityRegistryAbi } from "@/config/abis";
import { identityRegistryAddress } from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import {
  extractAgentIdFromReceipt,
  formatRegistrationError,
} from "@/lib/agentRegistration";

export type RegisterAgentResult = {
  hash: Hash;
  receipt: TransactionReceipt;
  /** Minted token id from Transfer logs; null if parse failed after success. */
  agentId: bigint | null;
};

export type RegisterOnChainOptions = {
  /** Called after the wallet submits the tx (hash available). */
  onSubmitted?: (hash: Hash) => void;
};

/**
 * On-chain IdentityRegistry.register(agentURI) on Arc Testnet.
 * Waits for receipt and parses the minted agentId from Transfer logs.
 */
export function useRegisterAgent() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });

  const {
    writeContractAsync,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const registerOnChain = useCallback(
    async (
      agentURI: string,
      options?: RegisterOnChainOptions
    ): Promise<RegisterAgentResult> => {
      if (!agentURI?.trim()) {
        throw new Error("Missing agentURI for registration.");
      }

      if (chainId !== arcTestnet.id) {
        try {
          await switchChainAsync({ chainId: arcTestnet.id });
        } catch (switchError) {
          throw new Error(formatRegistrationError(switchError));
        }
      }

      let txHash: Hash;
      try {
        txHash = await writeContractAsync({
          address: identityRegistryAddress,
          abi: identityRegistryAbi,
          functionName: "register",
          args: [agentURI],
          chainId: arcTestnet.id,
        });
      } catch (writeError) {
        throw new Error(formatRegistrationError(writeError));
      }

      options?.onSubmitted?.(txHash);

      if (!publicClient) {
        throw new Error(
          "Could not reach Arc Testnet RPC. Check your connection and try again."
        );
      }

      let receipt: TransactionReceipt;
      try {
        receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
        });
      } catch (waitError) {
        throw new Error(formatRegistrationError(waitError));
      }

      if (receipt.status === "reverted") {
        throw new Error(
          "Transaction reverted on Arc Testnet. The agent was not registered."
        );
      }

      const agentId = extractAgentIdFromReceipt(receipt);

      return { hash: txHash, receipt, agentId };
    },
    [chainId, switchChainAsync, writeContractAsync, publicClient]
  );

  return {
    registerOnChain,
    hash,
    isPending,
    error,
    reset,
  };
}
