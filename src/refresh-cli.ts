/**
 * Standalone CLI for refreshing the cache outside of an MCP session.
 * Usage: npm run refresh-cache
 */
import { ensureCache, getCachePath, refreshCache } from "./cache.js";

async function main(): Promise<void> {
  const cachePath = getCachePath();
  await ensureCache(cachePath);
  const result = await refreshCache(cachePath);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
