import { keccak256, stringToBytes, type Hash } from "viem";
import { JOB_STATUS_LABELS } from "@/config/abis/agenticCommerce";
import { fromUsdcUnits } from "@/config/contracts";

export function jobStatusLabel(status: number): string {
  return JOB_STATUS_LABELS[status] ?? `Status ${status}`;
}

export function jobStatusTone(status: number): string {
  switch (status) {
    case 0:
      return "bg-[#f0ebe3] text-headline-deep";
    case 1:
      return "bg-[#e8f0e9] text-[#3d5c42]";
    case 2:
      return "bg-[#ebe6f5] text-[#4a3d6b]";
    case 3:
      return "bg-[#e6f0ea] text-[#2f5c3f]";
    case 4:
    case 5:
      return "bg-[#f5e8e6] text-[#6b3d3d]";
    default:
      return "bg-[#f0ebe3] text-muted";
  }
}

/** Hash free-text deliverable for on-chain submit(bytes32). */
export function hashDeliverable(text: string): Hash {
  return keccak256(stringToBytes(text.trim() || "deliverable"));
}

export function formatJobBudget(budgetUnits: bigint | number): string {
  const n = fromUsdcUnits(budgetUnits);
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return `${n} USDC`;
  return `${n.toFixed(2)} USDC`;
}

/** Default job expiry: 7 days from now (unix seconds). */
export function defaultJobExpiryUnix(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
}

export function formatExpiry(unix: bigint | number): string {
  const sec = typeof unix === "bigint" ? Number(unix) : unix;
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  return new Date(sec * 1000).toLocaleString();
}
