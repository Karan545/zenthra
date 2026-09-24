"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import {
  decodeEventLog,
  type Hash,
  type Log,
  zeroAddress,
  zeroHash,
} from "viem";
import { agenticCommerceAbi, erc20Abi } from "@/config/abis";
import {
  agenticCommerceAddress,
  isDeployedAddress,
  toUsdcUnits,
  usdcAddress,
} from "@/config/contracts";
import { arcTestnet } from "@/config/chains";
import { formatWalletError } from "@/lib/walletErrors";
import { defaultJobExpiryUnix, hashDeliverable } from "@/lib/jobFormat";
import { upsertLocalJob } from "@/lib/localErc8183Jobs";
import { getArcPublicClient } from "@/lib/arcClient";

export type CreateJobInput = {
  agentId: number;
  agentName?: string;
  provider: `0x${string}`;
  description: string;
  budgetUsdc: number;
  /** Days until expiry (default 7). */
  expiryDays?: number;
};

export type CreateJobResult = {
  jobId: number;
  createHash: Hash;
  setBudgetHash?: Hash;
  approveHash?: Hash;
  fundHash?: Hash;
  autoFunded: boolean;
};

/**
 * ERC-8183 job actions on Arc AgenticCommerce.
 * Note: setBudget is provider-only on this deployment.
 */
export function useJobActions() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const wagmiClient = usePublicClient({ chainId: arcTestnet.id });
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const ensureChain = useCallback(async () => {
    if (!isDeployedAddress(agenticCommerceAddress)) {
      throw new Error(
        "Jobs are not live on Arc mainnet yet. The job escrow contract has not been deployed on chain 5042."
      );
    }
    if (!address) {
      throw new Error("Connect your wallet on Arc.");
    }
    if (chainId !== arcTestnet.id) {
      try {
        await switchChainAsync({ chainId: arcTestnet.id });
      } catch (e) {
        throw new Error(formatWalletError(e));
      }
    }
  }, [address, chainId, switchChainAsync]);

  const client = () => wagmiClient ?? getArcPublicClient();

  const waitTx = useCallback(
    async (hash: Hash) => {
      const c = client();
      if (!c) throw new Error("Could not reach Arc RPC.");
      const receipt = await c.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted on Arc.");
      }
      return receipt;
    },
    [wagmiClient]
  );

  const extractJobId = useCallback(
    (logs: Log[]): number | null => {
      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: agenticCommerceAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "JobCreated") {
            const jobId = (decoded.args as { jobId?: bigint }).jobId;
            if (jobId != null) return Number(jobId);
          }
        } catch {
          // not our event
        }
      }
      return null;
    },
    []
  );

  /** Create job; if wallet is the provider, also setBudget + fund. */
  const createAndMaybeFundJob = useCallback(
    async (
      input: CreateJobInput,
      onPhase?: (phase: string) => void
    ): Promise<CreateJobResult> => {
      await ensureChain();
      if (!address) throw new Error("Connect wallet.");

      const desc = input.description.trim();
      if (desc.length < 8) {
        throw new Error("Job description must be at least 8 characters.");
      }
      if (!Number.isFinite(input.budgetUsdc) || input.budgetUsdc <= 0) {
        throw new Error("Enter a budget greater than 0 USDC.");
      }

      const budgetUnits = toUsdcUnits(input.budgetUsdc);
      const days = input.expiryDays ?? 7;
      const expiredAt =
        BigInt(Math.floor(Date.now() / 1000) + days * 24 * 60 * 60) ||
        defaultJobExpiryUnix();

      onPhase?.("create");
      const createHash = await writeContractAsync({
        address: agenticCommerceAddress,
        abi: agenticCommerceAbi,
        functionName: "createJob",
        args: [
          input.provider,
          address, // client is evaluator (can complete/reject)
          expiredAt,
          desc,
          zeroAddress,
        ],
        chainId: arcTestnet.id,
      });

      onPhase?.("confirming");
      const receipt = await waitTx(createHash);
      let jobId = extractJobId(receipt.logs as Log[]);

      if (jobId == null) {
        // Fallback: read jobCounter
        const counter = await client().readContract({
          address: agenticCommerceAddress,
          abi: agenticCommerceAbi,
          functionName: "jobCounter",
        });
        jobId = Number(counter);
      }

      upsertLocalJob({
        jobId,
        agentId: input.agentId,
        agentName: input.agentName,
        description: desc,
        proposedBudgetUsdc: input.budgetUsdc,
        client: address,
        provider: input.provider,
        evaluator: address,
        createTxHash: createHash,
      });

      const isProvider =
        address.toLowerCase() === input.provider.toLowerCase();

      let setBudgetHash: Hash | undefined;
      let approveHash: Hash | undefined;
      let fundHash: Hash | undefined;
      let autoFunded = false;

      if (isProvider) {
        // Provider can set budget immediately, then fund as client (same wallet)
        onPhase?.("setBudget");
        setBudgetHash = await writeContractAsync({
          address: agenticCommerceAddress,
          abi: agenticCommerceAbi,
          functionName: "setBudget",
          args: [BigInt(jobId), budgetUnits, "0x"],
          chainId: arcTestnet.id,
        });
        await waitTx(setBudgetHash);
        upsertLocalJob({ jobId, setBudgetTxHash: setBudgetHash });

        onPhase?.("approve");
        const allowance = await client().readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, agenticCommerceAddress],
        });
        if (allowance < budgetUnits) {
          approveHash = await writeContractAsync({
            address: usdcAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [agenticCommerceAddress, budgetUnits],
            chainId: arcTestnet.id,
          });
          await waitTx(approveHash);
          upsertLocalJob({ jobId, approveTxHash: approveHash });
        }

        onPhase?.("fund");
        fundHash = await writeContractAsync({
          address: agenticCommerceAddress,
          abi: agenticCommerceAbi,
          functionName: "fund",
          args: [BigInt(jobId), "0x"],
          chainId: arcTestnet.id,
        });
        await waitTx(fundHash);
        upsertLocalJob({ jobId, fundTxHash: fundHash });
        autoFunded = true;
      }

      return {
        jobId,
        createHash,
        setBudgetHash,
        approveHash,
        fundHash,
        autoFunded,
      };
    },
    [address, ensureChain, extractJobId, waitTx, writeContractAsync, wagmiClient]
  );

  const setBudget = useCallback(
    async (jobId: number, budgetUsdc: number): Promise<Hash> => {
      await ensureChain();
      const units = toUsdcUnits(budgetUsdc);
      if (units <= BigInt(0)) throw new Error("Budget must be > 0.");
      const hash = await writeContractAsync({
        address: agenticCommerceAddress,
        abi: agenticCommerceAbi,
        functionName: "setBudget",
        args: [BigInt(jobId), units, "0x"],
        chainId: arcTestnet.id,
      });
      await waitTx(hash);
      upsertLocalJob({
        jobId,
        setBudgetTxHash: hash,
        proposedBudgetUsdc: budgetUsdc,
      });
      return hash;
    },
    [ensureChain, waitTx, writeContractAsync]
  );

  const fundJob = useCallback(
    async (jobId: number, budgetUnits: bigint): Promise<{ approveHash?: Hash; fundHash: Hash }> => {
      await ensureChain();
      if (!address) throw new Error("Connect wallet.");
      if (budgetUnits <= BigInt(0)) {
        throw new Error("Job budget is zero — agent must setBudget first.");
      }

      let approveHash: Hash | undefined;
      const allowance = await client().readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, agenticCommerceAddress],
      });
      if (allowance < budgetUnits) {
        approveHash = await writeContractAsync({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [agenticCommerceAddress, budgetUnits],
          chainId: arcTestnet.id,
        });
        await waitTx(approveHash);
        upsertLocalJob({ jobId, approveTxHash: approveHash });
      }

      const fundHash = await writeContractAsync({
        address: agenticCommerceAddress,
        abi: agenticCommerceAbi,
        functionName: "fund",
        args: [BigInt(jobId), "0x"],
        chainId: arcTestnet.id,
      });
      await waitTx(fundHash);
      upsertLocalJob({ jobId, fundTxHash: fundHash });
      return { approveHash, fundHash };
    },
    [address, ensureChain, waitTx, writeContractAsync, wagmiClient]
  );

  const submitDeliverable = useCallback(
    async (jobId: number, deliverableText: string): Promise<Hash> => {
      await ensureChain();
      const text = deliverableText.trim();
      if (text.length < 4) {
        throw new Error("Enter a deliverable note or link (min 4 characters).");
      }
      const deliverable = hashDeliverable(text);
      const hash = await writeContractAsync({
        address: agenticCommerceAddress,
        abi: agenticCommerceAbi,
        functionName: "submit",
        args: [BigInt(jobId), deliverable, "0x"],
        chainId: arcTestnet.id,
      });
      await waitTx(hash);
      upsertLocalJob({
        jobId,
        submitTxHash: hash,
        deliverableText: text,
        deliverableHash: deliverable,
      });
      return hash;
    },
    [ensureChain, waitTx, writeContractAsync]
  );

  const completeJob = useCallback(
    async (jobId: number): Promise<Hash> => {
      await ensureChain();
      const hash = await writeContractAsync({
        address: agenticCommerceAddress,
        abi: agenticCommerceAbi,
        functionName: "complete",
        args: [BigInt(jobId), zeroHash, "0x"],
        chainId: arcTestnet.id,
      });
      await waitTx(hash);
      upsertLocalJob({ jobId, completeTxHash: hash });
      return hash;
    },
    [ensureChain, waitTx, writeContractAsync]
  );

  const rejectJob = useCallback(
    async (jobId: number): Promise<Hash> => {
      await ensureChain();
      const hash = await writeContractAsync({
        address: agenticCommerceAddress,
        abi: agenticCommerceAbi,
        functionName: "reject",
        args: [BigInt(jobId), zeroHash, "0x"],
        chainId: arcTestnet.id,
      });
      await waitTx(hash);
      upsertLocalJob({ jobId, rejectTxHash: hash });
      return hash;
    },
    [ensureChain, waitTx, writeContractAsync]
  );

  return {
    isPending,
    reset,
    createAndMaybeFundJob,
    setBudget,
    fundJob,
    submitDeliverable,
    completeJob,
    rejectJob,
  };
}
