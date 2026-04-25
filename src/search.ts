/**
 * Fuzzy search over the component index.
 * Weights name highest, then tags, then author — matches how agents phrase queries.
 */
import Fuse from "fuse.js";
import type { ComponentSummary, Category } from "./types.js";
import type { GalaxyIndex } from "./index-build.js";

export interface SearchOptions {
  query: string;
  category?: Category;
  limit?: number;
}

let cachedFuse: Fuse<ComponentSummary> | null = null;
let cachedFuseCategory: Category | "__all__" | null = null;

/**
 * Build or reuse a Fuse instance for a given scope.
 * Cache a single "all" instance and one "current category" instance.
 */
function getFuse(
  index: GalaxyIndex,
  category: Category | undefined
): Fuse<ComponentSummary> {
  const scope = category ?? "__all__";
  if (cachedFuse && cachedFuseCategory === scope) return cachedFuse;

  const data =
    category === undefined ? index.all : index.byCategory.get(category) ?? [];

  cachedFuse = new Fuse(data, {
    keys: [
      { name: "name", weight: 0.5 },
      { name: "tags", weight: 0.3 },
      { name: "author", weight: 0.1 },
      { name: "id", weight: 0.1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
  cachedFuseCategory = scope;
  return cachedFuse;
}

export function searchComponents(
  index: GalaxyIndex,
  opts: SearchOptions
): ComponentSummary[] {
  const { query, category, limit = 20 } = opts;
  if (!query.trim()) {
    const source =
      category === undefined ? index.all : index.byCategory.get(category) ?? [];
    return source.slice(0, limit);
  }
  const fuse = getFuse(index, category);
  const results = fuse.search(query, { limit });
  return results.map((r) => r.item);
}

/** Invalidate the fuse cache — call after a cache refresh rebuilds the index. */
export function invalidateSearchCache(): void {
  cachedFuse = null;
  cachedFuseCategory = null;
}
