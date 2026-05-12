import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Case studies. One MDX file per case study under src/content/projects/.
 * Frontmatter is schema-validated so missing fields fail the build.
 */
const projects = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string().optional(),
      summary: z.string(), // one-line outcome — recruiter sees this on the tile
      role: z.string(), // "Solo · 4 weeks", etc.
      year: z.number().int(),
      tech: z.array(z.string()),
      cover: image().optional(),
      // numbers, not adjectives — appears in the Results section
      metrics: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .default([]),
      anonymized: z.boolean().default(false), // Axxela work flag
      repo: z.string().url().optional(),
      live: z.string().url().optional(),
      published: z.boolean().default(true),
      featured: z.boolean().default(false),
      order: z.number().int().default(99),
    }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      published: z.date(),
      cover: image().optional(),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
    }),
});

/**
 * Testimonials. One MDX or YAML file per quote under src/content/testimonials/.
 * The Testimonials section on the homepage hides itself entirely when the
 * collection is empty, so this can sit empty without breaking anything.
 *
 * `published: false` lets you stage a quote (e.g. while waiting for sign-off
 * from the author) without rendering it on the live site.
 */
const testimonials = defineCollection({
  // Only match real entries — keep `README.md` and underscored files
  // (`_template.yaml` etc.) out of the glob so they're not schema-validated.
  loader: glob({
    pattern: ["**/*.yaml", "**/*.yml", "**/*.md", "**/*.mdx", "!**/README.*", "!**/_*"],
    base: "./src/content/testimonials",
  }),
  schema: ({ image }) =>
    z.object({
      quote: z.string(),
      author: z.string(),
      role: z.string(), // "Senior Engineer", "Engineering Manager", etc.
      company: z.string().optional(),
      photo: image().optional(),
      linkedinUrl: z.string().url().optional(),
      published: z.boolean().default(true),
      order: z.number().int().default(99),
    }),
});

export const collections = { projects, posts, testimonials };
