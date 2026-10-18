"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { getAddress, isAddress, type Hash } from "viem";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { erc20Abi } from "@/config/abis";
import { arcTestnet } from "@/config/chains";
import { toUsdcUnits, usdcAddress } from "@/config/contracts";
import { explorerTxUrl } from "@/lib/format";
import { formatWalletError } from "@/lib/walletErrors";
import type { Agent } from "@/types/agent";

type WorkSpec = {
  owner: string;
  pricePerTask: number;
  scanAddress: boolean;
};

export function RequestWorkPanel({ agent }: { agent: Agent }) {
  const listedEndpoint = agent.x402Endpoint?.trim() ?? "";
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { writeContractAsync } = useWriteContract();

  const [spec, setSpec] = useState<WorkSpec | null>(null);
  const [specError, setSpecError] = useState("");
  const [specLoading, setSpecLoading] = useState(Boolean(listedEndpoint));
  const [wallet, setWallet] = useState("");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<"idle" | "pay" | "call">("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [paidHash, setPaidHash] = useState<Hash | null>(null);
  const [report, setReport] = useState("");

  useEffect(() => {
    if (!listedEndpoint) return;
    let cancelled = false;
    setSpecLoading(true);
    setSpecError("");
    fetch(`/api/agents/work?agentId=${agent.id}`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | (WorkSpec & { error?: string })
          | null;
        if (!response.ok) {
          throw new Error(payload?.error || "This agent has no public work endpoint.");
        }
        if (
          !payload ||
          !isAddress(payload.owner) ||
          !Number.isFinite(payload.pricePerTask)
        ) {
          throw new Error("This agent has no public work endpoint.");
        }
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setSpec(payload);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const text =
          caught instanceof Error
            ? caught.message
            : "This agent has no public work endpoint.";
        setSpec(null);
        setSpecError(text);
      })
      .finally(() => {
        if (!cancelled) setSpecLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agent.id, listedEndpoint]);

  if (!listedEndpoint) return null;

  const price = spec && spec.pricePerTask > 0 ? spec.pricePerTask : 0;
  const scan = Boolean(spec?.scanAddress);
  const busy = phase !== "idle";

  async function requestWork() {
    if (!spec) return;
    setError("");
    setReport("");
    if (!address) {
      setError("Connect a wallet to pay for this request.");
      return;
    }
    if (scan && !isAddress(wallet.trim())) {
      setError("Enter the wallet address you want scanned.");
      return;
    }
    if (!scan && message.trim().length < 2) {
      setError("Describe the work you want.");
      return;
    }
    if (price > 0 && !publicClient) {
      setError("Could not reach Arc.");
      return;
    }

    let hash = paidHash;
    try {
      if (chainId !== arcTestnet.id) {
        await switchChainAsync({ chainId: arcTestnet.id });
      }
      if (price > 0 && !hash) {
        setPhase("pay");
        hash = await writeContractAsync({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "transfer",
          args: [getAddress(spec.owner), toUsdcUnits(price)],
          chainId: arcTestnet.id,
        });
        setTxHash(hash);
        setPaidHash(hash);
        const receipt = await publicClient!.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });
        if (receipt.status !== "success") {
          setPaidHash(null);
          throw new Error("The USDC payment did not succeed.");
        }
      }

      setPhase("call");
      const response = await fetch("/api/agents/work", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          txHash: hash,
          address: scan ? wallet.trim() : undefined,
          message: scan ? undefined : message.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        result?: { report?: string; text?: string };
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "The agent did not accept this request.");
      }
      const text = payload?.result?.report || payload?.result?.text || "";
      setReport(text || "The agent answered, but there was no written report.");
      setPaidHash(null);
      setPhase("idle");
    } catch (caught) {
      setPhase("idle");
      const plain =
        caught instanceof Error && caught.message.length <= 180
          ? caught.message
          : "The request did not finish.";
      setError(formatWalletError(caught, plain));
    }
  }

  return (
    <section id="request-work" className="card-surface rounded-2xl p-6 sm:p-7">
      <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
        Request work
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {specLoading
          ? "Checking how this agent accepts work."
          : price > 0
            ? `Pay ${price} USDC directly to the owner. This page then calls the agent.`
            : "Send a request to this agent."}
      </p>

      {specLoading ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" />
          Reading the agent registration…
        </p>
      ) : null}

      {specError ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {specError}
        </p>
      ) : null}

      {spec ? (
        <div className="mt-5">
          {scan ? (
            <Input
              label="Wallet address"
              name="work-address"
              placeholder="0x…"
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              hint="The address this agent should scan."
            />
          ) : (
            <Textarea
              label="Work request"
              name="work-message"
              placeholder="What should this agent do?"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
            />
          )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {spec && isConnected ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={busy || specLoading}
            onClick={() => void requestWork()}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {phase === "pay" ? "Confirm payment…" : "Calling the agent…"}
              </>
            ) : paidHash ? (
              "Retry request"
            ) : price > 0 ? (
              `Pay ${price} USDC and request`
            ) : (
              "Request work"
            )}
          </Button>
        ) : spec ? (
          <ConnectWallet size="md" />
        ) : null}
        {txHash ? (
          <a
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-headline hover:underline"
          >
            Payment transaction
          </a>
        ) : null}
      </div>
      {paidHash ? (
        <p className="mt-3 text-[13px] text-muted">
          Payment is confirmed. Retrying does not charge again.
        </p>
      ) : null}

      {report ? (
        <div className="mt-6 max-h-[28rem] overflow-auto rounded-xl border border-border bg-[#faf8f5] p-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-soft">
            Agent response
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {report}
          </p>
        </div>
      ) : null}
    </section>
  );
}
