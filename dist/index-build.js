/**
 * Scan the galaxy cache, parse each component file, build an in-memory index.
 * Called once at server startup. Fast — 3,800 file reads in parallel takes ~2s.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { CATEGORIES } from "./types.js";
import { buildSummary } from "./parse.js";
function makeKey(category, id) {
    return `${category}::${id}`;
}
/**
 * Build the full in-memory index from the cloned galaxy folder.
 */
export async function buildIndex(cachePath) {
    const byCategory = new Map();
    const byCategoryId = new Map();
    const all = [];
    const stats = [];
    for (const category of CATEGORIES) {
        const categoryDir = join(cachePath, category);
        let files;
        try {
            files = await readdir(categoryDir);
        }
        catch {
            // Category folder missing — skip silently
            stats.push({ category, count: 0 });
            byCategory.set(category, []);
            continue;
        }
        const htmlFiles = files.filter((f) => f.endsWith(".html"));
        const summaries = await Promise.all(htmlFiles.map(async (filename) => {
            try {
                const fileContent = await readFile(join(categoryDir, filename), "utf-8");
                return buildSummary(category, filename, fileContent);
            }
            catch {
                return null;
            }
        }));
        const valid = summaries.filter((s) => s !== null);
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
export function findByCategoryId(index, category, id) {
    return index.byCategoryId.get(makeKey(category, id));
}
//# sourceMappingURL=index-build.js.map