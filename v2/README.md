# abhinavrathi.com — v2

Portfolio rebuild for **Abhinav Rathi** — ML engineer shipping production Python at a prop trading firm. Models, services, and the infrastructure that puts the two together. Built with **Astro 5 + Tailwind CSS v4 + TypeScript + MDX**.
Deploys statically to GitHub Pages at `https://abhinav00711.github.io/abhinavrathi/`.

> Source plan: [`../portfolio-redesign-plan.md`](../portfolio-redesign-plan.md)
> Phase tracker: [`../TODO.md`](../TODO.md)
>
> **Positioning** (Phase A.1 — locked 2026-05-12): ML engineer at a prop trading firm. Axxela is the credibility layer; ML is the foreground; cobalt-on-near-black aesthetic stays. Two public ML projects (RespiScan, DataChatAI) lead the Selected Work grid; three anonymized Axxela case studies slot in behind as the credibility layer; one automation-infra showcase closes.

---

## What's in this version

- **Phase A + A.1 decisions locked.** ML-foreground positioning, accent color (cobalt `#3D52FE`), and target domain plan are committed throughout the codebase.
- **Phase 1 shell shipped:**
  - Design tokens in one file (`src/styles/global.css`) — color, type, spacing, motion.
  - Recruiter-optimized page order: Hero → Selected Work → Experience → About → Stack → Writing → Contact → Footer.
  - Cmd-K command palette with keyboard shortcuts (`K` open, `R` resume, `Esc` close).
  - Reveal-on-intersect motion, gated by `prefers-reduced-motion`.
  - 1px scroll-progress bar (CSS scroll-driven where supported, JS fallback otherwise).
  - JSON-LD `Person` schema, OG / Twitter Card meta, canonical, sitemap (auto), robots.
  - Skip-to-content link, semantic `<main>`, focus-visible accent ring.
- **Six case-study stubs** under `src/content/projects/*.mdx` with schema-validated frontmatter. Real prose lands in Phase 2.
- **Dynamic case-study route** at `/work/<slug>/` with prev/next nav and per-page metrics strip.

### Added 2026-05-08 (second pass)

- **Theme switcher** (system / dark / light) — `ThemeSwitcher.astro` + `ThemeBoot.astro`.
  Inline boot script in `<head>` resolves the theme before first paint to prevent FOUC.
  Persists to `localStorage`, syncs across tabs via the `storage` event, follows OS
  changes when set to "system". Triggered by `T` keyboard shortcut and from the Cmd-K
  palette ("Toggle theme"). Light tokens live under `:root[data-theme="light"]` in
  `global.css`.
- **Sticky right-edge mini-nav** — `SectionDots.astro`. Linear-docs style. Vertical
  column of dots, IntersectionObserver tracks the in-view section, the active dot
  fills with the accent color and reveals its label on hover. Hidden under 1100px
  width and under `prefers-reduced-motion`.
- **Cross-document View Transitions** — `@view-transition { navigation: auto }` plus
  matched `view-transition-name: case-<slug>` on the homepage tile title and the
  case-study `<h1>`. Browsers that support it morph the title across pages; everything
  else hard-cuts. Honors `prefers-reduced-motion`.
- **Self-hosted fonts** — Geist, Inter Variable, JetBrains Mono (400 + 500) in
  `public/fonts/`, registered in `global.css` with `font-display: swap`. The two
  highest-impact families (Geist + Inter) are `<link rel="preload">`-ed in `Layout.astro`.
  No more Google Fonts CDN requests.
- **Architecture SVGs** — `public/work/<slug>/architecture.svg` for the three Axxela
  case studies (`position-recon`, `order-ingestion`, `trader-dashboard`). Each MDX
  embeds its diagram in a `<figure class="arch">` block (styles in `CaseStudy.astro`).
- **Real OG default** — `public/og-default.png` (1200×630), generated from
  `scripts/og-default-gen.py` (Pillow + DejaVu fallback fonts).
- **Real assets** — `public/Abhinav-Rathi.pdf` (no space) and the avatar at
  `src/assets/people/abhinav.jpg` (Astro Image processes it into AVIF + WebP at
  build; the duplicate `public/abhinav.jpg` was retired on 2026-05-12).
- **Axxela title** — Experience entry briefly read "Full-Stack Engineer" to match
  the original positioning; reverted on 2026-05-12 to the literal company title
  "Associate — Development & Operations" as part of the ML-foreground pivot. See
  the 2026-05-12 entry below.

### Added 2026-05-12 (Phase A.1 — ML-foreground pivot)

- **Repositioning** — hero, About, `<title>`, `<meta description>`, and JSON-LD `jobTitle` all swapped from the original "full-stack engineer at a prop trading firm" framing to "ML engineer shipping production Python at a prop trading firm. Models, services, and the infrastructure that puts the two together." Cobalt aesthetic preserved (reads equally well for ML labs and trading-tech).
- **Hero metric strip** — picked "Years + tagline + case studies" variant: `3 yrs · applied ML where bugs cost dollars · 6 dated · senior roles`.
- **About opener** — picked "Good enough isn't" variant: *"I do applied ML at a place where the model's output becomes a real order — which is a very effective way to learn what 'good enough' isn't."* Three paragraphs reframed around the seam between model and production system.
- **Axxela role title in Experience** — reverted to the literal company title *"Associate — Development & Operations"* (user picked the company title over an ML-foregrounded label; ML signal lives in hero/about, not in the job-label slot).
- **Selected Work reordering** — RespiScan (1) → DataChatAI (2) → position-recon (3) → trader-dashboard (4) → order-ingestion (5) → gmail-rule-processor (6). ML up front; Axxela trio in the credibility slot; automation-infra showcase closes.
- **OG default regenerated** — `public/og-default.png` now carries the new headline (`ML engineer shipping production Python.`), new tagline, and the ML-aware metric strip. Generator at `scripts/og-default-gen.py`.
- **Open user-side tasks** — GitHub bio + LinkedIn headline + résumé PDF still need to be updated to match the new positioning for recruiter parity. Optional 4th ML case study (anonymizable Axxela ML/quant work, if available) is still the single highest-ROI add for the pivot.

---

## Run it

```bash
cd v2
npm install
npm run dev
```

Open `http://localhost:4321/abhinavrathi/`. (The `/abhinavrathi` base path matches the GitHub Pages deploy.)

## Build it

```bash
npm run build
```

Static output lands in `v2/dist/`.

## Deploy to GitHub Pages

There are two paths — pick one:

### A) Build locally, push `dist/` to a `gh-pages` branch

```bash
npm run build
# upload dist/ to the gh-pages branch using your tool of choice
# e.g. https://www.npmjs.com/package/gh-pages
npx gh-pages -d dist
```

### B) Build via GitHub Actions

Add `.github/workflows/deploy.yml` at the repo root (NOT inside `v2/`):

```yaml
name: Deploy v2 to Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: v2
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: v2/package-lock.json
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: v2/dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then in **Settings → Pages**, set **Source** to "GitHub Actions".

When you cut over from the existing Bootstrap site to v2, swap the workflow to deploy from `v2/dist/` instead of the repo root, and remove the old `index.html` / `css/` / `js/` from the root.

---

## Migrating to a custom domain

When `abhinavrathi.com` is wired up:

1. In `astro.config.mjs`, change:
   ```js
   site: "https://abhinavrathi.com",
   base: "/",
   ```
2. Add `public/CNAME` containing the literal text `abhinavrathi.com`.
3. Update DNS at your registrar to point at GitHub Pages (`A` records to `185.199.108.153–111` or a `CNAME` to `abhinav00711.github.io`).
4. In **Settings → Pages**, set the custom domain and enable HTTPS.
5. The old `https://abhinav00711.github.io/abhinavrathi/` will keep serving (and 301 to the custom domain once GitHub finishes verification).

That's it. As of 2026-05-09 the base prefix is no longer hard-coded
anywhere outside `astro.config.mjs`:

- `@font-face` URLs are emitted by `<FontFace />` (mounted in `Layout.astro`'s `<head>`) using `import.meta.env.BASE_URL`.
- Case-study architecture diagrams are embedded via `<Diagram slug="..." />` (also base-aware).
- All asset paths in components use `${base}` prefixes.

`robots.txt`'s sitemap URL is the only exception — it has the production absolute URL baked in, and you'll want to edit that one line when you flip domains.

---

## Project structure

```
v2/
├── astro.config.mjs        # site/base, integrations, Tailwind v4 plugin
├── tsconfig.json           # path aliases (@components, @layouts, @styles, @assets, @content)
├── package.json
├── .env.example            # PUBLIC_CONTACT_ENDPOINT — Formspree or self-hosted Resend URL
├── scripts/
│   ├── og-default-gen.py            # 1200×630 default OG card
│   ├── og-case-study-gen.py         # per-case-study OG cards → public/work/<slug>/og.png
│   ├── og-cover-gen.py              # in-page covers → src/assets/work/<slug>/cover.png
│   └── contact-resend-handler.ts    # drop-in Cloudflare Worker / Vercel function
├── public/
│   ├── favicon.svg                  # AR mark on cobalt
│   ├── robots.txt
│   ├── og-default.png
│   ├── Abhinav-Rathi.pdf
│   ├── fonts/                       # self-hosted Geist + Inter + JetBrains Mono
│   └── work/<slug>/
│       ├── architecture.svg         # diagram embedded via <Diagram />
│       └── og.png                   # per-case-study OG card
└── src/
    ├── content.config.ts            # schemas for projects + posts
    ├── content/
    │   ├── projects/*.mdx           # 6 case studies
    │   └── posts/*.mdx              # writing (Post 1 outline lives here as draft)
    ├── assets/
    │   ├── people/abhinav.jpg       # Astro Image source — AVIF/WebP at build
    │   └── work/<slug>/cover.png    # in-page covers, processed by Astro Image
    ├── layouts/
    │   ├── Layout.astro             # head/SEO/JSON-LD/FontFace mount
    │   ├── CaseStudy.astro          # /work/<slug>/ template
    │   └── Post.astro               # /writing/<slug>/ template
    ├── pages/
    │   ├── index.astro
    │   ├── 404.astro
    │   ├── now.astro                # /now (Sivers convention; edit monthly)
    │   ├── rss.xml.ts               # writing RSS feed
    │   ├── work/[...slug].astro
    │   └── writing/
    │       ├── index.astro          # all posts + drafts panel
    │       └── [...slug].astro      # /writing/<slug>/
    ├── components/
    │   ├── Nav.astro
    │   ├── Hero.astro
    │   ├── Section.astro
    │   ├── SectionDots.astro        # right-edge mini-nav (homepage only)
    │   ├── WorkTile.astro
    │   ├── SelectedWork.astro
    │   ├── Experience.astro
    │   ├── About.astro
    │   ├── Stack.astro
    │   ├── Writing.astro
    │   ├── Contact.astro
    │   ├── ContactForm.astro        # progressive form → Formspree / Resend / mailto
    │   ├── Diagram.astro            # base-aware architecture-diagram embed
    │   ├── FontFace.astro           # base-aware @font-face declarations
    │   ├── Footer.astro
    │   ├── FloatingContact.astro
    │   ├── HelpModal.astro
    │   ├── CommandPalette.astro
    │   ├── ScrollProgress.astro
    │   ├── RevealMotion.astro
    │   ├── ThemeBoot.astro          # FOUC-prevention boot script
    │   └── ThemeSwitcher.astro      # 3-state segmented control + T shortcut
    └── styles/
        └── global.css               # design tokens (the only place colors/type live)
```

---

## What's still to do (next session)

After the 2026-05-08 second pass, the autonomous shell work is largely complete.
What's left is data only you can supply, plus per-page polish:

- **Confirm Athena Education + BNP Paribas dates** in `Experience.astro` (placeholder
  dates are in but unverified).
- **Fill the TKTK metric slots** in the case-study MDX files — the diagrams,
  prose, and frontmatter are wired; only specific numbers remain.
- **Per-case-study cover images** (16:9) into `public/work/<slug>/cover.png`,
  surfaced via `cover` frontmatter field (already in the schema).
- **Per-case-study OG images** via `@vercel/og` — only after at least one cover
  exists to use as the visual anchor.
- **Optional housekeeping** — three 0-byte placeholder files in `public/fonts/`
  (`JetBrainsMono.woff2.tmp`, `jbm-400.woff2`, `jbm-500.woff2`) couldn't be
  removed from the sandbox; delete them on Windows so they don't ship.
- **Run Lighthouse** locally, hit 95+ on Perf / A11y / Best Practices / SEO.

See `../TODO.md` Phase 2 / Phase 3 for the full list.
