import { decodeEventLog, type Address, type TransactionReceipt } from "viem";
import { erc20Abi } from "@/config/abis";
import { toUsdcUnits, usdcAddress } from "@/config/contracts";

export type AgentWorkTarget = {
  endpoint: string;
  pricePerTask: number;
  scanAddress: boolean;
};

type RegistrationJson = {
  services?: Array<{ name?: string; endpoint?: string }>;
  pricing?: { pricePerTask?: number };
  x402Endpoint?: string;
};

/** Pull the paid work endpoint and price from an ERC-8004 registration file. */
export function workTargetFromRegistration(raw: unknown): AgentWorkTarget | null {
  if (!raw || typeof raw !== "object") return null;
  const file = raw as RegistrationJson;
  const services = Array.isArray(file.services) ? file.services : [];
  const named = (name: string) =>
    services.find((service) => service.name === name)?.endpoint?.trim() || "";
  const endpoint = named("x402") || named("web") || file.x402Endpoint?.trim() || "";
  if (!endpoint.startsWith("https://")) return null;

  const price = Number(file.pricing?.pricePerTask);
  let scanAddress = false;
  try {
    const path = new URL(endpoint).pathname;
    scanAddress = path.endsWith("/report");
  } catch {
    return null;
  }

  return {
    endpoint,
    pricePerTask: Number.isFinite(price) && price > 0 ? price : 0,
    scanAddress,
  };
}

/** Registration cards end in .json. The callable API is inside that file. */
export function looksLikeRegistrationUrl(value: string): boolean {
  try {
    return new URL(value).pathname.toLowerCase().endsWith(".json");
  } catch {
    return false;
  }
}

/**
 * Work target for a registration file.
 * When the listed endpoint is itself a registration card, follow it once
 * and keep the listed price.
 */
export async function resolveWorkTarget(
  raw: unknown,
  loadRegistration: (url: string) => Promise<unknown>
): Promise<AgentWorkTarget | null> {
  const outer = workTargetFromRegistration(raw);
  if (!outer || !isPublicHttpsUrl(outer.endpoint)) return null;
  if (!looksLikeRegistrationUrl(outer.endpoint)) return outer;

  let nested: unknown;
  try {
    nested = await loadRegistration(outer.endpoint);
  } catch {
    return null;
  }
  const inner = workTargetFromRegistration(nested);
  if (!inner || !isPublicHttpsUrl(inner.endpoint)) return null;
  if (inner.endpoint === outer.endpoint) return null;
  if (looksLikeRegistrationUrl(inner.endpoint)) return null;

  return {
    endpoint: inner.endpoint,
    pricePerTask: outer.pricePerTask > 0 ? outer.pricePerTask : inner.pricePerTask,
    scanAddress: inner.scanAddress,
  };
}

export function isPublicHttpsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    host === "::1" ||
    host === "::"
  ) {
    return false;
  }
  if (host.includes(":")) {
    const head = host.split(":")[0] ?? "";
    if (head.startsWith("fc") || head.startsWith("fd") || head.startsWith("fe80")) {
      return false;
    }
  }
  if (
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  ) {
    return false;
  }
  return true;
}

/** True when the receipt pays the owner at least `priceUsdc` in Arc USDC. */
export function receiptPaysOwner(
  receipt: TransactionReceipt,
  owner: Address,
  priceUsdc: number
): boolean {
  if (receipt.status !== "success") return false;
  const needed = toUsdcUnits(priceUsdc);
  if (needed <= BigInt(0)) return true;
  const payee = owner.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdcAddress.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: erc20Abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") continue;
      const args = decoded.args as { to?: Address; value?: bigint };
      if (args.to?.toLowerCase() === payee && (args.value ?? BigInt(0)) >= needed) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}
