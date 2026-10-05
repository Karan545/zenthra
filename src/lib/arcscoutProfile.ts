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
  if (arcScoutDraftError(input)) return null;
  const raw = input as Record<string, unknown>;
  return {
    name: cleanLine(raw.name, 40) as string,
    description: cleanBlock(raw.description, 600) as string,
    image: cleanImage(raw.image) as string,
    priceUsdc: cleanPrice(raw.priceUsdc) as number,
  };
}

/** Why a form draft cannot be saved. Empty means the draft is valid. */
export function arcScoutDraftError(input: unknown): string | null {
  if (!input || typeof input !== "object") {
    return "Fill in the name, description, and price.";
  }
  const raw = input as Record<string, unknown>;
  if (!cleanLine(raw.name, 40)) return "Use a name, up to 40 characters.";
  if (!cleanBlock(raw.description, 600)) return "Use a description, up to 600 characters.";
  const imageError = imageProblem(raw.image);
  if (imageError) return imageError;
  if (cleanPrice(raw.priceUsdc) === null) return "Set a price from 0.01 to 100 USDC.";
  return null;
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
  const image = value.trim().replace(/^['"]+|['"]+$/g, "");
  if (!image) return "";
  if (/^https:\/\/\S{1,2000}$/i.test(image)) return image;
  if (
    /^data:image\/[a-z0-9.+-]+(?:;charset=[a-z0-9._-]+)?;base64,[a-z0-9+/=\s]+$/i.test(image) &&
    image.length <= 18_000
  ) {
    return image.replace(/\s+/g, "");
  }
  return null;
}

function imageProblem(value: unknown): string | null {
  if (cleanImage(value) !== null) return null;
  const image = typeof value === "string" ? value.trim().replace(/^['"]+|['"]+$/g, "") : "";
  if (/^https:\/\//i.test(image) && image.length > 2000) {
    return "That picture link is too long. Use a shorter https link.";
  }
  if (/\s/.test(image)) {
    return "The picture link contains a space. Paste only the https:// address.";
  }
  if (/^http:\/\//i.test(image)) {
    return "Picture link must start with https://.";
  }
  if (image.startsWith("data:image/") && image.length > 18_000) {
    return "That picture is too large to store on Arc. Use an https link, or a file under 12 KB.";
  }
  return "Picture link must be an https:// address, or upload a PNG, JPEG, WebP, or GIF under 12 KB.";
}

function cleanPrice(value: unknown): number | null {
  const price = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(price)) return null;
  const rounded = Math.round(price * 100) / 100;
  if (rounded < 0.01 || rounded > 100) return null;
  return rounded;
}
