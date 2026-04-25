import type { ComponentSummary, Category } from "./types.js";
import type { GalaxyIndex } from "./index-build.js";
export interface SearchOptions {
    query: string;
    category?: Category;
    limit?: number;
}
export declare function searchComponents(index: GalaxyIndex, opts: SearchOptions): ComponentSummary[];
/** Invalidate the fuse cache — call after a cache refresh rebuilds the index. */
export declare function invalidateSearchCache(): void;
