"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { identityRegistryAddress } from "@/config/contracts";
import type { Address, Hash } from "viem";
import { arcMainnet } from "@/config/chains";
import {
  buildArcScoutUri,
  DEFAULT_ARCSCOUT_PROFILE,
  formatUsdcAmount,
  sanitizeArcScoutProfile,
  type ArcScoutProfile,
} from "@/lib/arcscoutProfile";
import { formatWalletError } from "@/lib/walletErrors";
import { Button } from "@/components/ui/Button";

const registerAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
] as const;

const setUriAbi = [
  {
    type: "function",
    name: "setAgentURI",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
] as const;

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function tokenIdFromReceipt(
  logs: { address: Address; topics: readonly Hash[] }[]
): string | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== identityRegistryAddress.toLowerCase()) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    if (!log.topics[3]) continue;
    return BigInt(log.topics[3]).toString();
  }
  return null;
}

export function ArcScoutOwnerCard() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: arcMainnet.id });
  const [draft, setDraft] = useState<ArcScoutProfile>(DEFAULT_ARCSCOUT_PROFILE);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agents/arcscout/profile")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const profile = sanitizeArcScoutProfile(json?.profile);
        if (profile) setDraft(profile);
        setTokenId(typeof json?.tokenId === "string" ? json.tokenId : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaved(false);
    const profile = sanitizeArcScoutProfile(draft);
    if (!profile) {
      setError(
        "Use a name, a description, a price from 0.01 to 100 USDC, and an https picture or a small image."
      );
      return;
    }
    if (!publicClient) {
      setError("Could not reach Arc.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (chainId !== arcMainnet.id) {
        await switchChainAsync({ chainId: arcMainnet.id });
      }
      const uri = buildArcScoutUri(profile);
      const hash = tokenId
        ? await writeContractAsync({
            address: identityRegistryAddress,
            abi: setUriAbi,
            functionName: "setAgentURI",
            args: [BigInt(tokenId), uri],
            chainId: arcMainnet.id,
          })
        : await writeContractAsync({
            address: identityRegistryAddress,
            abi: registerAbi,
            functionName: "register",
            args: [uri],
            chainId: arcMainnet.id,
          });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 90_000,
      });
      if (receipt.status !== "success") {
        throw new Error("The profile update reverted.");
      }
      const mintedId = tokenIdFromReceipt(receipt.logs);
      let confirmed: { profile?: unknown; tokenId?: unknown } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch("/api/agents/arcscout/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash: hash }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json) {
          confirmed = json;
          break;
        }
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      if (!confirmed) {
        const fresh = await fetch("/api/agents/arcscout/profile?fresh=1")
          .then((res) => res.json())
          .catch(() => null);
        if (typeof fresh?.tokenId === "string") confirmed = fresh;
      }
      const next = sanitizeArcScoutProfile(confirmed?.profile);
      if (next) setDraft(next);
      const nextId =
        typeof confirmed?.tokenId === "string" ? confirmed.tokenId : mintedId ?? tokenId;
      if (nextId) setTokenId(nextId);
      if (!confirmed) {
        throw new Error(
          "The wallet save went through, but the site could not read it yet. Refresh this page before saving again."
        );
      }
      setSaved(true);
    } catch (e) {
      if (
        e instanceof Error &&
        /^(Check the|The profile|Could not reach|The wallet save)/.test(e.message)
      ) {
        setError(e.message);
      } else {
        setError(formatWalletError(e));
      }
    } finally {
      setSaving(false);
    }
  }

  function onImageFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 12_000) {
      setError("That picture is too large. Use a file under 12 KB, or paste an https link.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((current) => ({ ...current, image: reader.result as string }));
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  const initials = draft.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <section className="card-surface rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f0ebe3] text-sm font-semibold text-headline-deep">
            {draft.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.image} alt="" className="h-full w-full object-cover" />
            ) : (
              initials || "AS"
            )}
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">ArcScout</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Your agent. Save to update the public name, picture, description, and the USDC price visitors pay.
              The wallet confirmation records this on Arc. It is a small network fee, separate from the report price.
            </p>
            <Link href="/agent/arcscout" className="mt-2 inline-block text-[13px] text-headline hover:underline">
              Open public page
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted">
          Current price{" "}
          <span className="font-medium text-foreground">{formatUsdcAmount(draft.priceUsdc)} USDC</span>
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Name</span>
          <input
            value={draft.name}
            maxLength={40}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground outline-none focus:border-headline"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Price per report (USDC)</span>
          <input
            type="number"
            min={0.01}
            max={100}
            step={0.01}
            value={draft.priceUsdc}
            onChange={(e) => setDraft({ ...draft, priceUsdc: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground outline-none focus:border-headline"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">Description</span>
          <textarea
            value={draft.description}
            maxLength={600}
            rows={4}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground outline-none focus:border-headline"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">Picture URL</span>
          <input
            value={draft.image.startsWith("data:") ? "" : draft.image}
            placeholder="https://…"
            onChange={(e) => setDraft({ ...draft, image: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-foreground outline-none focus:border-headline"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Or upload a small picture</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => onImageFile(e.target.files?.[0])}
            className="mt-1 block w-full text-sm text-muted"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {saved ? (
        <p className="mt-4 text-sm text-headline">
          Saved on Arc. The public page and the fee now use this version.
        </p>
      ) : null}

      <div className="mt-5">
        <Button type="button" variant="primary" size="sm" disabled={saving} onClick={() => void save()}>
          {saving ? "Confirm in wallet…" : tokenId ? "Save changes" : "Save ArcScout to my wallet"}
        </Button>
      </div>
    </section>
  );
}
