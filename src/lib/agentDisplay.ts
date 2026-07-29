/**
 * Shared helpers for resolving agent display name / description.
 * Avoids placeholder "Agent #id" and generic listing blurbs when real data exists.
 */

export function isPlaceholderName(name?: string | null): boolean {
  if (!name) return true;
  const n = name.trim();
  if (!n) return true;
  return /^Agent\s*#\s*\d+$/i.test(n);
}

export function isPlaceholderDescription(description?: string | null): boolean {
  if (!description) return true;
  const d = description.trim();
  if (!d) return true;
  const lower = d.toLowerCase();
  return (
    lower === "listed on zenthra." ||
    lower === "agent listed on zenthra." ||
    lower.startsWith("listed on zenthra with") ||
    lower === "registered on arc testnet." ||
    lower === "listed on zenthra"
  );
}

/** Prefer real names over Agent #id placeholders. */
export function pickDisplayName(
  id: number,
  ...candidates: Array<string | undefined | null>
): string {
  for (const c of candidates) {
    if (!isPlaceholderName(c)) return c!.trim();
  }
  return `Agent #${id}`;
}

/** Prefer real descriptions over generic listing blurbs. */
export function pickDisplayDescription(
  ...candidates: Array<string | undefined | null>
): string {
  for (const c of candidates) {
    if (!isPlaceholderDescription(c)) return c!.trim();
  }
  for (const c of candidates) {
    if (c?.trim()) return c.trim();
  }
  return "Listed on Zenthra with a USDC stake on Arc Testnet.";
}
