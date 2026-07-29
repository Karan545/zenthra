import type { Agent } from "@/types/agent";
import type { CategoryDef } from "@/data/categories";
import { CATEGORIES } from "@/data/categories";
import { inferCategorySlugsFromCapabilities } from "@/lib/categories";

/** Normalize text for search / keyword match. */
function haystack(agent: Agent): string {
  return [agent.name, agent.description, ...agent.capabilities]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Real-time search across name, description, and capabilities. */
export function filterAgentsBySearch(
  agents: Agent[],
  query: string
): Agent[] {
  const q = query.trim().toLowerCase();
  if (!q) return agents;

  const terms = q.split(/\s+/).filter(Boolean);
  return agents.filter((agent) => {
    const h = haystack(agent);
    const catText = (agent.categories ?? []).join(" ").toLowerCase();
    return terms.every((t) => h.includes(t) || catText.includes(t));
  });
}

/**
 * Match agent to a category:
 * 1. Explicit categories[] slugs (preferred)
 * 2. Category name embedded in capabilities (from listAgent)
 * 3. Keyword fallback on name/description/capabilities
 */
export function agentMatchesCategory(
  agent: Agent,
  category: CategoryDef
): boolean {
  const explicit =
    agent.categories ??
    inferCategorySlugsFromCapabilities(agent.capabilities);

  if (explicit.includes(category.slug)) return true;

  const caps = agent.capabilities.map((c) => c.toLowerCase());
  if (
    caps.includes(category.slug) ||
    caps.includes(category.name.toLowerCase())
  ) {
    return true;
  }

  const h = haystack(agent);
  return category.keywords.some((kw) => h.includes(kw.toLowerCase()));
}

export function filterAgentsByCategory(
  agents: Agent[],
  category: CategoryDef
): Agent[] {
  return agents.filter((a) => agentMatchesCategory(a, category));
}

/** Count listed agents per category (for category cards). */
export function countAgentsByCategory(
  agents: Agent[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    counts[cat.slug] = filterAgentsByCategory(agents, cat).length;
  }
  return counts;
}

/** Sort newest listings first. */
export function sortAgentsRecent(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    const ta = a.listedAt ?? 0;
    const tb = b.listedAt ?? 0;
    if (tb !== ta) return tb - ta;
    return b.id - a.id;
  });
}
