/**
 * Parsing helpers — extract author, name, tags, and CSS from component files.
 * All component files follow the pattern: {author}_{name-with-dashes}.html
 * Inside the <style> block is a comment with format "From Uiverse.io by AUTHOR - Tags: TAGS"
 * (wrapped in CSS block-comment syntax).
 */
import type { Category, ComponentDetail, ComponentSummary } from "./types.js";
/** Build the Uiverse.io public preview URL. Categories on the site are lowercased. */
export declare function buildPreviewUrl(category: Category, id: string): string;
/** Strip .html, split on first "_". Returns {author, name} or null if malformed. */
export declare function parseFilename(filename: string): {
    id: string;
    author: string;
    name: string;
} | null;
/**
 * Extract tags from the Uiverse header comment inside <style>.
 * Looks for a CSS block comment containing "From Uiverse.io" and "Tags: ...".
 * Returns [] if no tags comment found.
 */
export declare function extractTags(html: string): string[];
/**
 * Extract CSS between <style> tags. Returns empty string if no <style> block.
 */
export declare function extractCss(html: string): string;
/**
 * Detect if a component uses Tailwind (no <style> block, class attributes look utility-class-ish).
 */
export declare function detectTailwind(html: string): boolean;
/** Build a summary (no html/css payload). */
export declare function buildSummary(category: Category, filename: string, fileContent: string): ComponentSummary | null;
/** Build full detail (includes html/css). */
export declare function buildDetail(category: Category, filename: string, fileContent: string, filepath: string): ComponentDetail | null;
