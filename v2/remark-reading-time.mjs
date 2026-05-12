/**
 * Zero-dep remark plugin: estimates reading time from the rendered MDX
 * body and injects `minutesRead` into the frontmatter so any page route
 * can pull it out via `await render(entry)`'s `remarkPluginFrontmatter`.
 *
 * Counts words at 220 wpm (slightly above the conventional 200 — these
 * posts are technical-but-pithy; rounding up made the case-study reads
 * feel honest in test). Floors at 1 minute.
 *
 * Why no `reading-time`/`mdast-util-to-string`: keeps the dep tree light
 * and lets Astro's strict ESM resolver not whine on Windows.
 */
const WPM = 220;

function extractText(node) {
  if (!node) return "";
  if (node.type === "text" || node.type === "inlineCode") {
    return node.value ?? "";
  }
  if (Array.isArray(node.children)) {
    return node.children.map(extractText).join(" ");
  }
  return "";
}

export function remarkReadingTime() {
  return function (tree, { data }) {
    const text = extractText(tree).trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const minutes = Math.max(1, Math.round(words / WPM));
    data.astro = data.astro ?? {};
    data.astro.frontmatter = data.astro.frontmatter ?? {};
    data.astro.frontmatter.minutesRead = `${minutes} min read`;
    data.astro.frontmatter.wordsCount = words;
  };
}
