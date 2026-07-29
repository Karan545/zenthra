import type { Agent } from "@/types/agent";
import { MOCK_AGENTS } from "@/data/mockAgents";

const STORAGE_KEY = "zenthra.registeredAgents.v1";

/** Browser event so Directory can refresh after registration / listing. */
export const AGENTS_UPDATED_EVENT = "zenthra:agents-updated";

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

export function notifyAgentsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AGENTS_UPDATED_EVENT));
}

function isValidAgent(a: unknown): a is Agent {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    Number.isFinite(o.id) &&
    typeof o.name === "string" &&
    typeof o.description === "string" &&
    Array.isArray(o.capabilities) &&
    typeof o.owner === "string"
  );
}

export function getRegisteredAgents(): Agent[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidAgent)
      .map((a) => ({
        ...a,
        isOnChain: a.isOnChain ?? true,
        reputation:
          typeof a.reputation === "number" && Number.isFinite(a.reputation)
            ? a.reputation
            : 80,
        pricePerTask:
          typeof a.pricePerTask === "number" && Number.isFinite(a.pricePerTask)
            ? a.pricePerTask
            : 0,
        capabilities: a.capabilities.map(String),
        categories: Array.isArray(a.categories)
          ? a.categories.map(String)
          : undefined,
      }))
      .sort((a, b) => {
        const ta = a.registeredAt ? Date.parse(a.registeredAt) : 0;
        const tb = b.registeredAt ? Date.parse(b.registeredAt) : 0;
        return tb - ta;
      });
  } catch {
    return [];
  }
}

export function saveRegisteredAgent(agent: Agent): void {
  if (!canUseStorage()) return;
  const enriched: Agent = {
    ...agent,
    isOnChain: true,
    registeredAt: agent.registeredAt ?? new Date().toISOString(),
  };
  const existing = getRegisteredAgents().filter((a) => a.id !== enriched.id);
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([enriched, ...existing])
  );
  notifyAgentsUpdated();
}

/** Merge patch into a stored agent by id (or no-op if missing). */
export function updateRegisteredAgent(
  id: number,
  patch: Partial<Agent>
): Agent | null {
  if (!canUseStorage()) return null;
  const all = getRegisteredAgents();
  const idx = all.findIndex((a) => a.id === id);
  if (idx < 0) {
    const name = patch.name ?? `Agent #${id}`;
    const owner = patch.owner;
    if (!owner) {
      // Persist listing flags with a placeholder owner when unknown
      const created: Agent = {
        id,
        name,
        description: patch.description ?? "Listed on Zenthra.",
        capabilities: patch.capabilities ?? [],
        reputation: patch.reputation ?? 80,
        pricePerTask: patch.pricePerTask ?? 0,
        owner: "0x0000000000000000000000000000000000000000",
        ...patch,
        isOnChain: true,
      };
      saveRegisteredAgent(created);
      return created;
    }
    const created: Agent = {
      id,
      name,
      description: patch.description ?? "Listed on Zenthra.",
      capabilities: patch.capabilities ?? [],
      reputation: patch.reputation ?? 80,
      pricePerTask: patch.pricePerTask ?? 0,
      owner,
      ...patch,
      isOnChain: true,
    };
    saveRegisteredAgent(created);
    return created;
  }
  const next = { ...all[idx], ...patch, id };
  all[idx] = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  notifyAgentsUpdated();
  return next;
}

/**
 * Merge curator listings + local registrations + demo mocks.
 * Priority: listed on Zenthra > local registered > demo.
 */
export function mergeAgentCatalog(
  curatorAgents: Agent[],
  options?: { includeMocks?: boolean; listedOnly?: boolean }
): Agent[] {
  const includeMocks = options?.includeMocks !== false && !options?.listedOnly;
  const byId = new Map<number, Agent>();

  if (includeMocks) {
    for (const m of MOCK_AGENTS) {
      byId.set(m.id, { ...m, isOnChain: false, isListedOnZenthra: false });
    }
  }

  if (!options?.listedOnly) {
    for (const local of getRegisteredAgents()) {
      const prev = byId.get(local.id);
      byId.set(local.id, {
        ...prev,
        ...local,
        isOnChain: true,
        // Curator is source of truth for listed flag when present later
        isListedOnZenthra: local.isListedOnZenthra ?? false,
        name: local.name || prev?.name || `Agent #${local.id}`,
        description:
          local.description ||
          prev?.description ||
          "Registered on Arc Testnet.",
      });
    }
  }

  // Curator listings always win for marketplace visibility
  for (const listed of curatorAgents) {
    const prev = byId.get(listed.id);
    byId.set(listed.id, {
      ...prev,
      ...listed,
      isOnChain: true,
      isListedOnZenthra: true,
      name: prev?.name || listed.name || `Agent #${listed.id}`,
      description:
        prev?.description ||
        listed.description ||
        "Listed on Zenthra with a USDC stake.",
      image: prev?.image ?? listed.image,
      reputation: prev?.reputation ?? listed.reputation ?? 80,
      stakeAmount: listed.stakeAmount ?? prev?.stakeAmount,
    });
  }

  let all = Array.from(byId.values());
  if (options?.listedOnly) {
    all = all.filter((a) => a.isListedOnZenthra);
  }

  all.sort((a, b) => {
    const score = (x: Agent) =>
      (x.isFeatured ? 16 : 0) +
      (x.isListedOnZenthra ? 8 : 0) +
      (x.isOnChain ? 2 : 0) +
      (x.stakeAmount ? 1 : 0);
    const d = score(b) - score(a);
    if (d !== 0) return d;
    const ta = a.listedAt ?? 0;
    const tb = b.listedAt ?? 0;
    if (tb !== ta) return tb - ta;
    return b.id - a.id;
  });
  return all;
}

/** @deprecated Prefer mergeAgentCatalog with curator data */
export function getAllAgents(): Agent[] {
  return mergeAgentCatalog([]);
}

export function getAgentById(id: number | string): Agent | undefined {
  const numeric = typeof id === "string" ? Number(id) : id;
  if (!Number.isFinite(numeric)) return undefined;
  return getAllAgents().find((a) => a.id === numeric) ??
    getRegisteredAgents().find((a) => a.id === numeric);
}

export function getRegisteredCount(): number {
  return getRegisteredAgents().length;
}

export function nextAgentId(): number {
  const all = getAllAgents();
  return all.reduce((max, a) => Math.max(max, a.id), 0) + 1;
}
