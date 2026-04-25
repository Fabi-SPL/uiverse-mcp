/**
 * Scan the galaxy cache, parse each component file, build an in-memory index.
 * Called once at server startup. Fast — 3,800 file reads in parallel takes ~2s.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Category, CategoryStats, ComponentSummary } from "./types.js";
import { CATEGORIES } from "./types.js";
import { buildSummary } from "./parse.js";

export interface GalaxyIndex {
  /** All component summaries across all categories. */
  all: ComponentSummary[];
  /** By category for O(1) category lookups. */
  byCategory: Map<Category, ComponentSummary[]>;
  /** By id for O(1) exact-id lookups (ids are unique within a category but may collide across). */
  byCategoryId: Map<string, ComponentSummary>;
  /** Category counts. */
  stats: CategoryStats[];
  /** Total component count. */
  total: number;
}

function makeKey(category: Category, id: string): string {
  return `${category}::${id}`;
}

/**
 * Build the full in-memory index from the cloned galaxy folder.
 */
export async function buildIndex(cachePath: string): Promise<GalaxyIndex> {
  const byCategory = new Map<Category, ComponentSummary[]>();
  const byCategoryId = new Map<string, ComponentSummary>();
  const all: ComponentSummary[] = [];
  const stats: CategoryStats[] = [];

  for (const category of CATEGORIES) {
    const categoryDir = join(cachePath, category);
    let files: string[];
    try {
      files = await readdir(categoryDir);
    } catch {
      // Category folder missing — skip silently
      stats.push({ category, count: 0 });
      byCategory.set(category, []);
      continue;
    }

    const htmlFiles = files.filter((f) => f.endsWith(".html"));
    const summaries = await Promise.all(
      htmlFiles.map(async (filename) => {
        try {
          const fileContent = await readFile(join(categoryDir, filename), "utf-8");
          return buildSummary(category, filename, fileContent);
        } catch {
          return null;
        }
      })
    );

    const valid = summaries.filter((s): s is ComponentSummary => s !== null);

    byCategory.set(category, valid);
    for (const s of valid) {
      byCategoryId.set(makeKey(s.category, s.id), s);
      all.push(s);
    }

    stats.push({ category, count: valid.length });
  }

  return {
    all,
    byCategory,
    byCategoryId,
    stats,
    total: all.length,
  };
}

/** Look up a component by category + id (returns summary; detail needs separate file read). */
export function findByCategoryId(
  index: GalaxyIndex,
  category: Category,
  id: string
): ComponentSummary | undefined {
  return index.byCategoryId.get(makeKey(category, id));
}
