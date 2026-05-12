// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { remarkReadingTime } from "./remark-reading-time.mjs";

// GitHub Pages deployment: served from https://abhinav00711.github.io/abhinavrathi/
// Migrate `site` and `base` once a custom domain (abhinavrathi.com) is wired up.
export default defineConfig({
  site: "https://abhinav00711.github.io",
  base: "/abhinavrathi",
  trailingSlash: "ignore",
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkReadingTime],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: "auto",
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
});
