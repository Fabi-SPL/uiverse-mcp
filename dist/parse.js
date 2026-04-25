/** Build the Uiverse.io public preview URL. Categories on the site are lowercased. */
export function buildPreviewUrl(category, id) {
    // Uiverse site URL pattern: https://uiverse.io/{category-lowercased}/{id}
    // IDs on the site match the filename stem (without .html)
    const urlCategory = category.toLowerCase();
    return `https://uiverse.io/${urlCategory}/${encodeURIComponent(id)}`;
}
/** Strip .html, split on first "_". Returns {author, name} or null if malformed. */
export function parseFilename(filename) {
    if (!filename.endsWith(".html"))
        return null;
    const id = filename.slice(0, -5);
    const underscoreIdx = id.indexOf("_");
    if (underscoreIdx === -1) {
        // Rare: no underscore. Treat whole name as the id with unknown author.
        return { id, author: "unknown", name: id };
    }
    return {
        id,
        author: id.slice(0, underscoreIdx),
        name: id.slice(underscoreIdx + 1),
    };
}
/**
 * Extract tags from the Uiverse header comment inside <style>.
 * Looks for a CSS block comment containing "From Uiverse.io" and "Tags: ...".
 * Returns [] if no tags comment found.
 */
export function extractTags(html) {
    // Tolerate both dash and em-dash, any whitespace
    const re = /\/\*\s*From Uiverse\.io[^*]*?Tags:\s*([^*]+?)\*\//i;
    const match = html.match(re);
    if (!match)
        return [];
    return match[1]
        .split(/[,\n]/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length < 50);
}
/**
 * Extract CSS between <style> tags. Returns empty string if no <style> block.
 */
export function extractCss(html) {
    const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return match ? match[1].trim() : "";
}
/**
 * Detect if a component uses Tailwind (no <style> block, class attributes look utility-class-ish).
 */
export function detectTailwind(html) {
    if (extractCss(html))
        return false;
    // Heuristic: has at least one class attribute with multiple space-separated short tokens
    const classMatch = html.match(/class="([^"]+)"/);
    if (!classMatch)
        return false;
    const classes = classMatch[1].split(/\s+/);
    return (classes.length >= 3 &&
        classes.some((c) => /^(bg-|text-|flex|grid|p-|m-|w-|h-|rounded|border|hover:|transition)/.test(c)));
}
/** Build a summary (no html/css payload). */
export function buildSummary(category, filename, fileContent) {
    const parsed = parseFilename(filename);
    if (!parsed)
        return null;
    const tags = extractTags(fileContent);
    return {
        id: parsed.id,
        category,
        author: parsed.author,
        name: parsed.name,
        tags,
        preview_url: buildPreviewUrl(category, parsed.id),
    };
}
/** Build full detail (includes html/css). */
export function buildDetail(category, filename, fileContent, filepath) {
    const summary = buildSummary(category, filename, fileContent);
    if (!summary)
        return null;
    return {
        ...summary,
        html: fileContent,
        css: extractCss(fileContent),
        is_tailwind: detectTailwind(fileContent),
        filepath,
    };
}
//# sourceMappingURL=parse.js.map