# uiverse-mcp

**MCP server for [Uiverse.io](https://uiverse.io/) — browse, search, and use 3,800+ open-source UI components directly from Claude Code, Cursor, Codex, or any MCP-compatible AI agent.**

No API key. No browser tab. Just ask for a "glass card" or "neon button" and get the full HTML + CSS back in your editor.

[![npm version](https://img.shields.io/npm/v/uiverse-mcp)](https://www.npmjs.com/package/uiverse-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)

> **Need a custom MCP server for YOUR platform, API, or internal tool?**
> I build production-ready MCPs in days, not months. → [**Get in touch**](https://github.com/Fabi-SPL) · [Hire on Fiverr](https://www.fiverr.com/fabi_ai_labs)

---

## What it does

Uiverse.io has 3,800+ community-built UI components (buttons, cards, loaders, inputs, checkboxes, toggles, tooltips, etc.) with no official API. This server:

1. Clones the [`uiverse-io/galaxy`](https://github.com/uiverse-io/galaxy) repo locally (~85 MB, one-time)
2. Indexes all 3,800 components in memory (~2s startup, ~15 MB RAM)
3. Exposes 7 MCP tools for browsing, searching, and fetching components
4. Returns full HTML + CSS so your agent can drop components straight into your project

---

## Install

### Option A — npx (recommended, no install needed)

Add to your MCP config:

```json
{
  "mcpServers": {
    "uiverse": {
      "command": "npx",
      "args": ["-y", "uiverse-mcp"]
    }
  }
}
```

### Option B — global install

```bash
npm install -g uiverse-mcp
```

Then add to MCP config:

```json
{
  "mcpServers": {
    "uiverse": {
      "command": "uiverse-mcp"
    }
  }
}
```

### Option C — clone and build

```bash
git clone https://github.com/Fabi-SPL/uiverse-mcp.git
cd uiverse-mcp
npm install
npm run build
```

Add to MCP config:

```json
{
  "mcpServers": {
    "uiverse": {
      "command": "node",
      "args": ["/absolute/path/to/uiverse-mcp/dist/index.js"]
    }
  }
}
```

**First run** clones `uiverse-io/galaxy` into `~/.uiverse-mcp/cache` (~30s, one-time). Cache is shared across all MCP clients.

---

## Config locations

| Client | Config file |
|--------|-------------|
| **Claude Code** | `~/.claude.json` → `mcpServers` |
| **Cursor** | `~/.cursor/mcp.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |
| **Cline** | VS Code settings → `cline.mcpServers` |
| **Custom** | Any MCP-compatible client |

---

## Tools

| Tool | What it does |
|------|-------------|
| `list_categories` | All 11 categories with component counts — call this first |
| `list_components` | Browse a category, paginated, optional author filter |
| `search_components` | Fuzzy search by name, tag, or author |
| `get_component` | Fetch full HTML + CSS of a specific component |
| `get_component_preview` | Get the uiverse.io URL to preview a component in browser |
| `refresh_cache` | `git pull` the galaxy repo and rebuild the index |
| `cache_status` | Last sync time, commit SHA, total count per category |

---

## Categories (3,802 components)

| Category | Count |
|----------|-------|
| Buttons | 1,231 |
| Cards | 726 |
| loaders | 718 |
| Toggle-switches | 260 |
| Inputs | 226 |
| Forms | 180 |
| Checkboxes | 171 |
| Patterns | 103 |
| Radio-buttons | 102 |
| Tooltips | 62 |
| Notifications | 23 |

---

## Example usage

**In Claude Code:**

```
User: I need a glassmorphism card for the pricing section.

Agent:
1. search_components({ query: "glass", category: "Cards", limit: 5 })
   → returns 5 matches with tags + preview URLs

2. User picks one

3. get_component({ category: "Cards", id: "elijahgummer_kind-pig-24" })
   → returns full HTML + CSS, ready to paste
```

**Other queries that work well:**
- `"neon glow button"`
- `"neumorphic toggle"`
- `"ripple loader"`
- `"floating label input"`
- `"gradient checkbox"`

---

## Configuration

### Custom cache path

By default the galaxy repo is cached at `~/.uiverse-mcp/cache`. Override with:

```json
{
  "mcpServers": {
    "uiverse": {
      "command": "npx",
      "args": ["-y", "uiverse-mcp"],
      "env": {
        "UIVERSE_CACHE_PATH": "/your/custom/path"
      }
    }
  }
}
```

---

## Architecture

```
src/
├── index.ts          MCP server entry (stdio transport)
├── cache.ts          Git clone / pull / metadata persistence
├── index-build.ts    Scan cache, build in-memory index
├── search.ts         Fuse.js fuzzy search
├── parse.ts          Extract author / name / tags / CSS from HTML
├── types.ts          Shared TypeScript types
└── refresh-cli.ts    Standalone CLI for cache refresh
```

**Performance:**
- Startup: ~2s (index 3,800 files)
- Search: < 30ms per query
- Memory: ~15 MB RSS at idle
- Disk: ~85 MB (shallow clone)

---

## Data source & licensing

Components are sourced from [`uiverse-io/galaxy`](https://github.com/uiverse-io/galaxy) — MIT-licensed community contributions. This MCP server is also MIT-licensed. When shipping a component, attribution to the original designer is appreciated (the `author` field is included in every response).

---

## Contributing

Issues and PRs welcome at [github.com/Fabi-SPL/uiverse-mcp](https://github.com/Fabi-SPL/uiverse-mcp/issues).

---

## License

MIT
