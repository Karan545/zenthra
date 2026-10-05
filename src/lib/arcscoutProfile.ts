import { toUsdcUnits } from "@/config/contracts";

export type ArcScoutProfile = {
  name: string;
  description: string;
  image: string;
  priceUsdc: number;
};

export const DEFAULT_ARCSCOUT_PROFILE: ArcScoutProfile = {
  name: "ArcScout",
  description:
    "Paste any wallet address and get a full portfolio breakdown across Ethereum, Base, Arbitrum, Polygon, and Optimism — with AI interpretation of holdings, risk flags, and activity patterns.",
  image: "",
  priceUsdc: 1,
};

const DATA_PREFIX = "data:application/json,";

export function formatUsdcAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return rounded
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

export function formatUsdcUnits(units: bigint): string {
  const whole = units / BigInt(1_000_000);
  const frac = units % BigInt(1_000_000);
  if (frac === BigInt(0)) return `${whole} USDC`;
  const fracText = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole}.${fracText} USDC`;
}

export function arcScoutFeeUnits(profile: ArcScoutProfile): bigint {
  return toUsdcUnits(profile.priceUsdc);
}

export function sanitizeArcScoutProfile(input: unknown): ArcScoutProfile | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const name = cleanLine(raw.name, 40);
  const description = cleanBlock(raw.description, 600);
  const image = cleanImage(raw.image);
  const priceUsdc = cleanPrice(raw.priceUsdc);
  if (!name || !description || image === null || priceUsdc === null) return null;
  return { name, description, image, priceUsdc };
}

export function buildArcScoutUri(profile: ArcScoutProfile): string {
  const safe = sanitizeArcScoutProfile(profile);
  if (!safe) throw new Error("Check the name, description, picture, and price.");
  return `${DATA_PREFIX}${encodeURIComponent(
    JSON.stringify({ id: "arcscout", ...safe })
  )}`;
}

export function parseArcScoutUri(uri: string): ArcScoutProfile | null {
  if (!uri.startsWith(DATA_PREFIX)) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(uri.slice(DATA_PREFIX.length))) as {
      id?: string;
    };
    if (parsed?.id !== "arcscout") return null;
    return sanitizeArcScoutProfile(parsed);
  } catch {
    return null;
  }
}

function cleanLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text.length > max) return null;
  return text;
}

function cleanBlock(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  if (!text || text.length > max) return null;
  return text;
}

function cleanImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const image = value.trim();
  if (!image) return "";
  if (/^https:\/\/\S{1,400}$/i.test(image)) return image;
  if (
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(image) &&
    image.length <= 18_000
  ) {
    return image.replace(/\s+/g, "");
  }
  return null;
}

function cleanPrice(value: unknown): number | null {
  const price = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(price)) return null;
  const rounded = Math.round(price * 100) / 100;
  if (rounded < 0.01 || rounded > 100) return null;
  return rounded;
}
