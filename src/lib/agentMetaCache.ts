import type { DisplayMeta } from "@/lib/agentMetadata";

const CACHE_KEY = "zenthra.agentDisplayMeta.v1";

type CacheShape = Record<
  string,
  {
    name?: string;
    description?: string;
    image?: string;
    categories?: string[];
    capabilities?: string[];
    updatedAt: number;
  }
>;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readAll(): CacheShape {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheShape;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: CacheShape): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // quota / private mode
  }
}

export function getCachedDisplayMeta(id: number): DisplayMeta | null {
  const row = readAll()[String(id)];
  if (!row) return null;
  if (!row.name && !row.description && !row.image) return null;
  return {
    name: row.name,
    description: row.description,
    image: row.image,
    categories: row.categories ?? [],
    capabilities: row.capabilities ?? [],
  };
}

export function setCachedDisplayMeta(id: number, meta: DisplayMeta): void {
  if (!meta.name && !meta.description && !meta.image) return;
  const all = readAll();
  all[String(id)] = {
    name: meta.name,
    description: meta.description,
    image: meta.image,
    categories: meta.categories,
    capabilities: meta.capabilities,
    updatedAt: Date.now(),
  };
  // Cap cache size
  const keys = Object.keys(all);
  if (keys.length > 200) {
    keys
      .sort((a, b) => (all[a]?.updatedAt ?? 0) - (all[b]?.updatedAt ?? 0))
      .slice(0, keys.length - 200)
      .forEach((k) => {
        delete all[k];
      });
  }
  writeAll(all);
}

export function getCachedDisplayMetaMap(
  ids: number[]
): Map<number, DisplayMeta> {
  const map = new Map<number, DisplayMeta>();
  for (const id of ids) {
    const m = getCachedDisplayMeta(id);
    if (m) map.set(id, m);
  }
  return map;
}
