/**
 * Shared types for the Uiverse MCP server.
 */

/** Canonical category names as they appear in the galaxy repo. */
export const CATEGORIES = [
  "Buttons",
  "Cards",
  "Checkboxes",
  "Forms",
  "Inputs",
  "Notifications",
  "Patterns",
  "Radio-buttons",
  "Toggle-switches",
  "Tooltips",
  "loaders",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** A component's compact metadata — cheap to list many. */
export interface ComponentSummary {
  /** Unique ID: filename without .html extension. */
  id: string;
  /** Category folder name (case as in galaxy repo). */
  category: Category;
  /** Author handle, extracted from filename prefix before "_". */
  author: string;
  /** Human-readable name, from filename after "_" (dashes kept). */
  name: string;
  /** Tags parsed from the Tags comment in the style block. */
  tags: string[];
  /** Public uiverse.io preview URL for visual review in a browser. */
  preview_url: string;
}

/** Full component detail — includes HTML + CSS. */
export interface ComponentDetail extends ComponentSummary {
  /** Raw HTML file content (markup + <style>). */
  html: string;
  /** Extracted CSS (content between <style> tags, empty if component uses Tailwind). */
  css: string;
  /** True if component appears to use Tailwind classes (no <style> block). */
  is_tailwind: boolean;
  /** Absolute filesystem path to the component's .html file. */
  filepath: string;
}

/** Stats returned by list_categories. */
export interface CategoryStats {
  category: Category;
  count: number;
}

/** Cache metadata stored next to the galaxy clone. */
export interface CacheMetadata {
  last_sync_iso: string;
  commit_sha: string;
  total_components: number;
  indexed_at_iso: string;
}
