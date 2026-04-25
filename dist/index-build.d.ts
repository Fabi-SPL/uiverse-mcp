import type { Category, CategoryStats, ComponentSummary } from "./types.js";
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
/**
 * Build the full in-memory index from the cloned galaxy folder.
 */
export declare function buildIndex(cachePath: string): Promise<GalaxyIndex>;
/** Look up a component by category + id (returns summary; detail needs separate file read). */
export declare function findByCategoryId(index: GalaxyIndex, category: Category, id: string): ComponentSummary | undefined;
