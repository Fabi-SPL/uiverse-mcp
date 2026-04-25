import type { CacheMetadata } from "./types.js";
/**
 * Resolve the cache path.
 * Default: ~/.uiverse-mcp/cache — works for npx, global installs, and local dev.
 * Override via UIVERSE_CACHE_PATH env var.
 */
export declare function getCachePath(): string;
/** Check if the cache exists and is a valid git clone. */
export declare function cacheExists(cachePath: string): boolean;
/**
 * Ensure the galaxy repo is cloned locally. If missing, clone it.
 * Returns the cache path.
 */
export declare function ensureCache(cachePath: string): Promise<string>;
/**
 * Pull latest changes from upstream. Returns true if new commits were pulled.
 */
export declare function refreshCache(cachePath: string): Promise<{
    updated: boolean;
    new_sha: string;
    previous_sha: string;
}>;
/** Read cached metadata (or null if missing / corrupt). */
export declare function readMetadata(cachePath: string): Promise<CacheMetadata | null>;
/** Persist metadata after a successful index build. */
export declare function writeMetadata(cachePath: string, meta: CacheMetadata): Promise<void>;
/** Get the current commit SHA of the cache. */
export declare function getCurrentSha(cachePath: string): Promise<string>;
