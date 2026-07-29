import { CATEGORIES, getCategoryBySlug } from "@/data/categories";

/** Resolve slugs to display names. */
export function categoryNamesFromSlugs(slugs: string[]): string[] {
  return slugs
    .map((s) => getCategoryBySlug(s)?.name)
    .filter((n): n is string => Boolean(n));
}

/**
 * Capabilities sent on-chain when listing: skill tags + category names
 * so category pages work even without localStorage metadata.
 */
export function buildListingCapabilities(
  skillTags: string[],
  categorySlugs: string[]
): string[] {
  const names = categoryNamesFromSlugs(categorySlugs);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...skillTags, ...names]) {
    const key = t.trim();
    if (!key) continue;
    const lower = key.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(key);
  }
  return out;
}

/** Infer category slugs from free-form capability strings (legacy agents). */
export function inferCategorySlugsFromCapabilities(
  capabilities: string[]
): string[] {
  const caps = capabilities.map((c) => c.toLowerCase());
  const slugs: string[] = [];
  for (const cat of CATEGORIES) {
    const hit =
      caps.some((c) => c === cat.slug || c === cat.name.toLowerCase()) ||
      cat.keywords.some((kw) => caps.some((c) => c.includes(kw.toLowerCase())));
    if (hit) slugs.push(cat.slug);
  }
  return slugs;
}
