#!/usr/bin/env node
/**
 * Uiverse MCP Server
 * Exposes the uiverse-io/galaxy collection (3,800+ open-source UI components)
 * via the Model Context Protocol. Compatible with Claude Code, Codex, and any
 * MCP-capable client.
 *
 * Tools exposed:
 *   - list_categories        → categories + counts
 *   - list_components        → browse by category with pagination / author filter
 *   - search_components      → fuzzy search by name / tag / author
 *   - get_component          → fetch full HTML + CSS for a specific component
 *   - get_component_preview  → public uiverse.io URL for visual review
 *   - refresh_cache          → git pull the galaxy repo
 *   - cache_status           → last sync, commit SHA, total components
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  ensureCache,
  getCachePath,
  getCurrentSha,
  readMetadata,
  refreshCache,
  writeMetadata,
} from "./cache.js";
import { buildIndex, findByCategoryId, type GalaxyIndex } from "./index-build.js";
import { searchComponents, invalidateSearchCache } from "./search.js";
import { buildDetail, buildPreviewUrl } from "./parse.js";
import { CATEGORIES, type Category } from "./types.js";

// -----------------------------------------------------------------------------
// Zod schemas (inputs only — outputs are plain JSON text blocks)
// -----------------------------------------------------------------------------

const ListComponentsInput = z.object({
  category: z.enum(CATEGORIES as unknown as [Category, ...Category[]]),
  limit: z.number().int().min(1).max(200).optional().default(30),
  offset: z.number().int().min(0).optional().default(0),
  author: z.string().optional(),
});

const SearchComponentsInput = z.object({
  query: z.string().min(1),
  category: z
    .enum(CATEGORIES as unknown as [Category, ...Category[]])
    .optional(),
  limit: z.number().int().min(1).max(50).optional().default(15),
});

const GetComponentInput = z.object({
  category: z.enum(CATEGORIES as unknown as [Category, ...Category[]]),
  id: z.string().min(1),
});

const GetPreviewInput = GetComponentInput;

// -----------------------------------------------------------------------------
// Tool definitions (JSON Schema for MCP wire protocol)
// -----------------------------------------------------------------------------

const tools: Tool[] = [
  {
    name: "list_categories",
    description:
      "List all Uiverse component categories with their component counts. Categories: Buttons, Cards, Checkboxes, Forms, Inputs, Notifications, Patterns, Radio-buttons, Toggle-switches, Tooltips, loaders. Call this first when you don't know what's available.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "list_components",
    description:
      "List components in a specific category with pagination. Returns summaries only (id, author, name, tags, preview_url) — no HTML payload. Call get_component to fetch actual HTML/CSS for a specific component. Optional: filter by author.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: CATEGORIES as unknown as string[],
          description: "Category name (case-sensitive, matches galaxy repo folder).",
        },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 30 },
        offset: { type: "integer", minimum: 0, default: 0 },
        author: {
          type: "string",
          description: "Optional author handle to filter by.",
        },
      },
      required: ["category"],
      additionalProperties: false,
    },
  },
  {
    name: "search_components",
    description:
      "Fuzzy search components by name, tags, or author. Returns top matches as summaries (no HTML). Use this when the user asks for a specific style like 'glowing button', 'glass card', 'ripple loader'. Optional category filter narrows the search.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query — matches name, tags, and author. Examples: 'glass', 'neumorphic', 'ripple', 'glow'.",
        },
        category: {
          type: "string",
          enum: CATEGORIES as unknown as string[],
          description: "Optional: narrow search to one category.",
        },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 15 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_component",
    description:
      "Fetch the full HTML + CSS of a specific component by category + id. Returns markup, CSS (or note if Tailwind-based), tags, author, preview URL. Use after browsing with list_components or search_components.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: CATEGORIES as unknown as string[],
        },
        id: {
          type: "string",
          description:
            "Component id (filename without .html). Get this from list_components or search_components results.",
        },
      },
      required: ["category", "id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_component_preview",
    description:
      "Return the public uiverse.io URL for visual preview of a component. Open this in a browser to see the component rendered with animations. Does NOT fetch HTML — use get_component for code.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: CATEGORIES as unknown as string[],
        },
        id: { type: "string" },
      },
      required: ["category", "id"],
      additionalProperties: false,
    },
  },
  {
    name: "refresh_cache",
    description:
      "Pull the latest commits from the uiverse-io/galaxy repo and rebuild the in-memory index. Use when you suspect the cache is stale (last sync > 1 week). Returns commit SHA delta and new total count.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "cache_status",
    description:
      "Report cache metadata: last sync time, current commit SHA, total components indexed, per-category counts. Use to debug sync issues.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

// -----------------------------------------------------------------------------
// State (initialized at startup)
// -----------------------------------------------------------------------------

let index: GalaxyIndex;
let cachePath: string;

async function boot(): Promise<void> {
  cachePath = getCachePath();
  await ensureCache(cachePath);
  index = await buildIndex(cachePath);

  const sha = await getCurrentSha(cachePath);
  await writeMetadata(cachePath, {
    last_sync_iso: new Date().toISOString(),
    commit_sha: sha,
    total_components: index.total,
    indexed_at_iso: new Date().toISOString(),
  });
}

// -----------------------------------------------------------------------------
// Tool handlers
// -----------------------------------------------------------------------------

async function handleListCategories() {
  return {
    categories: index.stats,
    total: index.total,
  };
}

async function handleListComponents(input: z.infer<typeof ListComponentsInput>) {
  const source = index.byCategory.get(input.category) ?? [];
  let filtered = source;
  if (input.author) {
    const needle = input.author.toLowerCase();
    filtered = source.filter((c) => c.author.toLowerCase() === needle);
  }
  const page = filtered.slice(input.offset, input.offset + input.limit);
  return {
    category: input.category,
    total_in_category: filtered.length,
    returned: page.length,
    offset: input.offset,
    limit: input.limit,
    components: page,
  };
}

async function handleSearchComponents(
  input: z.infer<typeof SearchComponentsInput>
) {
  const matches = searchComponents(index, {
    query: input.query,
    category: input.category,
    limit: input.limit,
  });
  return {
    query: input.query,
    category_filter: input.category ?? "all",
    match_count: matches.length,
    components: matches,
  };
}

async function handleGetComponent(input: z.infer<typeof GetComponentInput>) {
  const summary = findByCategoryId(index, input.category, input.id);
  if (!summary) {
    throw new Error(
      `Component not found: category=${input.category}, id=${input.id}. Use list_components or search_components first.`
    );
  }
  const filepath = join(cachePath, input.category, `${input.id}.html`);
  const fileContent = await readFile(filepath, "utf-8");
  const detail = buildDetail(input.category, `${input.id}.html`, fileContent, filepath);
  if (!detail) {
    throw new Error(`Failed to parse component file at ${filepath}`);
  }
  return detail;
}

async function handleGetPreview(input: z.infer<typeof GetPreviewInput>) {
  const summary = findByCategoryId(index, input.category, input.id);
  if (!summary) {
    throw new Error(
      `Component not found: category=${input.category}, id=${input.id}.`
    );
  }
  return {
    category: input.category,
    id: input.id,
    preview_url: buildPreviewUrl(input.category, input.id),
    note: "Open this URL in a browser to see the component rendered with animations.",
  };
}

async function handleRefreshCache() {
  const result = await refreshCache(cachePath);
  if (result.updated) {
    index = await buildIndex(cachePath);
    invalidateSearchCache();
    await writeMetadata(cachePath, {
      last_sync_iso: new Date().toISOString(),
      commit_sha: result.new_sha,
      total_components: index.total,
      indexed_at_iso: new Date().toISOString(),
    });
  }
  return {
    updated: result.updated,
    previous_sha: result.previous_sha,
    new_sha: result.new_sha,
    total_components: index.total,
    message: result.updated
      ? "Cache updated and index rebuilt."
      : "Cache was already up to date. No rebuild needed.",
  };
}

async function handleCacheStatus() {
  const meta = await readMetadata(cachePath);
  const currentSha = await getCurrentSha(cachePath);
  return {
    cache_path: cachePath,
    current_commit_sha: currentSha,
    metadata: meta,
    in_memory_total: index.total,
    categories: index.stats,
  };
}

// -----------------------------------------------------------------------------
// MCP server wiring
// -----------------------------------------------------------------------------

const server = new Server(
  {
    name: "uiverse-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    let result: unknown;
    switch (name) {
      case "list_categories":
        result = await handleListCategories();
        break;
      case "list_components":
        result = await handleListComponents(ListComponentsInput.parse(args));
        break;
      case "search_components":
        result = await handleSearchComponents(SearchComponentsInput.parse(args));
        break;
      case "get_component":
        result = await handleGetComponent(GetComponentInput.parse(args));
        break;
      case "get_component_preview":
        result = await handleGetPreview(GetPreviewInput.parse(args));
        break;
      case "refresh_cache":
        result = await handleRefreshCache();
        break;
      case "cache_status":
        result = await handleCacheStatus();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// -----------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  await boot();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    `[uiverse-mcp] Ready. ${index.total} components across ${index.stats.length} categories. Cache: ${cachePath}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`[uiverse-mcp] Fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
