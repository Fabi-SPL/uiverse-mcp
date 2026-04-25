/**
 * Cache management for the Uiverse galaxy repo.
 * Handles initial clone, pull-to-refresh, and metadata persistence.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
const execFileAsync = promisify(execFile);
/**
 * Resolve the cache path.
 * Default: ~/.uiverse-mcp/cache — works for npx, global installs, and local dev.
 * Override via UIVERSE_CACHE_PATH env var.
 */
export function getCachePath() {
    const envPath = process.env.UIVERSE_CACHE_PATH;
    if (envPath)
        return envPath;
    return join(homedir(), ".uiverse-mcp", "cache");
}
function getMetadataPath(cachePath) {
    return join(cachePath, ".uiverse-mcp-metadata.json");
}
/** Check if the cache exists and is a valid git clone. */
export function cacheExists(cachePath) {
    return existsSync(join(cachePath, ".git")) && existsSync(join(cachePath, "README.md"));
}
/**
 * Ensure the galaxy repo is cloned locally. If missing, clone it.
 * Returns the cache path.
 */
export async function ensureCache(cachePath) {
    if (cacheExists(cachePath))
        return cachePath;
    await mkdir(dirname(cachePath), { recursive: true });
    const parentDir = dirname(cachePath);
    const repoName = cachePath.split(/[\\/]/).pop() || "uiverse-galaxy-cache";
    await execFileAsync("git", [
        "clone",
        "--depth=1",
        "https://github.com/uiverse-io/galaxy.git",
        repoName,
    ], { cwd: parentDir, timeout: 300_000 });
    return cachePath;
}
/**
 * Pull latest changes from upstream. Returns true if new commits were pulled.
 */
export async function refreshCache(cachePath) {
    if (!cacheExists(cachePath)) {
        await ensureCache(cachePath);
    }
    const { stdout: prevSha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: cachePath,
    });
    const previous_sha = prevSha.trim();
    await execFileAsync("git", ["pull", "--ff-only"], {
        cwd: cachePath,
        timeout: 120_000,
    });
    const { stdout: newSha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: cachePath,
    });
    const new_sha = newSha.trim();
    return {
        updated: previous_sha !== new_sha,
        new_sha,
        previous_sha,
    };
}
/** Read cached metadata (or null if missing / corrupt). */
export async function readMetadata(cachePath) {
    try {
        const raw = await readFile(getMetadataPath(cachePath), "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/** Persist metadata after a successful index build. */
export async function writeMetadata(cachePath, meta) {
    await writeFile(getMetadataPath(cachePath), JSON.stringify(meta, null, 2), "utf-8");
}
/** Get the current commit SHA of the cache. */
export async function getCurrentSha(cachePath) {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: cachePath,
    });
    return stdout.trim();
}
//# sourceMappingURL=cache.js.map