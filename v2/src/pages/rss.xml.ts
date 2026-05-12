import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

/**
 * RSS feed for the writing collection. Excludes drafts and posts dated in
 * the future. Description is pulled from the post's `summary`.
 *
 * Reachable at /rss.xml on both the GH Pages base and the eventual custom
 * domain — the build emits the right absolute URLs from `Astro.site` +
 * `BASE_URL`, so this file doesn't change when domains flip.
 */
export async function GET(context: APIContext) {
  const posts = (
    await getCollection("posts", (p) => !p.data.draft && p.data.published <= new Date())
  ).sort((a, b) => b.data.published.getTime() - a.data.published.getTime());

  // @astrojs/rss joins `item.link` against `context.site` (just the origin),
  // so a path like "/writing/x/" loses Astro's `BASE_URL`. Prefix manually so
  // links work on both GH Pages (`/abhinavrathi/`) and any future canonical
  // domain — flipping `base` in astro.config.mjs is the only change needed.
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return rss({
    title: "Abhinav Rathi — notes from production",
    description:
      "One post a month on backend engineering at a prop trading firm. Latency, idempotency, and the loop around the model.",
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.published,
      link: `${base}/writing/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
