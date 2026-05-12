# Lighthouse + mobile QA — checklist for the Windows build

Sandbox can't run Lighthouse / Pa11y / mobile emulation against a `dist/`
served from `npm run preview`. Use this as the per-release runbook on
the Windows machine.

Target — **95+ on Performance, Accessibility, Best Practices, SEO** for
both the homepage and one case study page.

---

## 0. Build + serve

```pwsh
cd D:\abhinavrathi\v2
npm install
npm run build
npm run preview          # serves at http://localhost:4321/abhinavrathi/
```

Keep `npm run preview` running in one PowerShell window. Open a second
window for the Lighthouse runs.

---

## 1. Lighthouse — desktop + mobile

```pwsh
# Once globally
npm install -g lighthouse

# Mobile, all 4 categories — index page
lighthouse http://localhost:4321/abhinavrathi/ `
  --preset=desktop `
  --only-categories=performance,accessibility,best-practices,seo `
  --view `
  --output=html `
  --output-path=./.lighthouse/index-desktop.html

lighthouse http://localhost:4321/abhinavrathi/ `
  --form-factor=mobile `
  --throttling-method=simulate `
  --only-categories=performance,accessibility,best-practices,seo `
  --view `
  --output=html `
  --output-path=./.lighthouse/index-mobile.html

# Case study (use the recruiter's first impression)
lighthouse http://localhost:4321/abhinavrathi/work/position-recon/ `
  --form-factor=mobile `
  --view `
  --output=html `
  --output-path=./.lighthouse/position-recon-mobile.html

# Writing route (different layout, different content path)
lighthouse http://localhost:4321/abhinavrathi/writing/ `
  --form-factor=mobile `
  --view `
  --output=html `
  --output-path=./.lighthouse/writing-mobile.html

# /now (has the GitHub stats widget — confirm it doesn't tank LCP)
lighthouse http://localhost:4321/abhinavrathi/now/ `
  --form-factor=mobile `
  --view `
  --output=html `
  --output-path=./.lighthouse/now-mobile.html
```

### What to look for, per category

**Performance (target ≥ 95).** LCP under 2.5 s. CLS under 0.1. TBT under
200 ms. The metric strip and the case-study `<Image>` covers should both
have intrinsic dimensions — if CLS spikes, that's where to look first.
The Hero cursor-spotlight is rAF-throttled and gated by `(hover: hover)`
so it shouldn't show up in mobile traces; if it does, profile.

**Accessibility (target ≥ 95).** All images have `alt`. Color contrast
should clear (we shipped `--color-accent-text` at ~5.4:1 on dark surface
specifically for this). Focus-visible ring is global. Skip-to-content
link present. If contrast errors appear on accent, grep for any new
`color: var(--color-accent)` on text-on-dark — those need to switch to
`var(--color-accent-text)`.

**Best Practices (target ≥ 95).** No mixed content. No deprecated APIs.
External anchors all have `rel="noreferrer noopener"`. No
`localStorage`/`sessionStorage` warnings (we use both intentionally for
theme + GitHub cache — this is fine; Lighthouse won't flag).

**SEO (target ≥ 95).** Title, description, canonical, robots all set.
JSON-LD schema valid (test at <https://search.google.com/test/rich-results>).
Open Graph cards verify at <https://opengraph.dev>.

---

## 2. Accessibility — Pa11y CI

Pa11y catches things Lighthouse Axe misses (form-label associations,
nested-interactive elements, aria-* mismatches).

```pwsh
npm install -g pa11y-ci

pa11y-ci `
  http://localhost:4321/abhinavrathi/ `
  http://localhost:4321/abhinavrathi/work/position-recon/ `
  http://localhost:4321/abhinavrathi/writing/ `
  http://localhost:4321/abhinavrathi/now/ `
  --standard WCAG2AA
```

Expected pass: 0 errors. Yellow warnings on the OG cover image's
`alt` (it's intentionally empty since the heading right above repeats
the title — a11y best practice for decorative covers paired with text).

---

## 3. Mobile end-to-end — Playwright

Playwright can emulate iPhone 14 + Pixel 7 viewports and capture
screenshots at every section.

```pwsh
npm install -g @playwright/test
npx playwright install chromium
```

Save this to `scripts/mobile-screencaps.spec.ts`:

```ts
import { test, devices } from '@playwright/test';

const SLUGS = [
  '/abhinavrathi/',
  '/abhinavrathi/work/position-recon/',
  '/abhinavrathi/work/order-ingestion/',
  '/abhinavrathi/work/trader-dashboard/',
  '/abhinavrathi/writing/',
  '/abhinavrathi/now/',
];

for (const device of ['iPhone 14', 'Pixel 7']) {
  test.describe(`mobile · ${device}`, () => {
    test.use(devices[device]);
    for (const slug of SLUGS) {
      test(slug, async ({ page }) => {
        await page.goto(`http://localhost:4321${slug}`, { waitUntil: 'networkidle' });
        await page.screenshot({
          path: `./.screencaps/${device.replace(' ', '-')}${slug.replace(/\//g, '_')}.png`,
          fullPage: true,
        });
      });
    }
  });
}
```

Run: `npx playwright test scripts/mobile-screencaps.spec.ts`. Then
flip through the PNGs in `./.screencaps/` — what you're looking for:

- Hero compresses to a single column; metric strip wraps to two lines.
- Cmd-K hint hides on small screens (the `sm:inline-flex` rule).
- Case-study tiles full-width with 16:9 covers.
- Sticky bottom-bar (`Prev` · `Email` · `Next`) on case-study pages —
  shipped 2026-05-10. Confirm it doesn't overlap the footer.
- Section dots hide under 1100 px.
- Theme switcher remains tappable (≥44 px hit target despite the 26 px
  visual size — the buttons sit in the toolbar with native click
  forgiveness).

---

## 4. Reduced-motion mode

In Chromium DevTools: open command menu (Ctrl+Shift+P) → "Show
Rendering" → Emulate CSS `prefers-reduced-motion: reduce`. Then walk:

- Hero: cursor spotlight should NOT animate.
- Reveal-on-intersect: items appear at full opacity, no slide.
- Section dots: still functional but no smooth scroll.
- Floating contact: appears/disappears without slide.
- View Transitions on case-study navigation: hard cut, no morph.
- Konami toast (after entering ↑↑↓↓←→←→BA): fades in/out without
  the slide-up.

---

## 5. Theme matrix

Test all three themes on the index page + one case study + /writing/:

| Surface             | Choice  | Expected                                |
|---------------------|---------|-----------------------------------------|
| `data-theme="dark"` | manual  | Cobalt accent on `#0A0A0A`              |
| `data-theme="light"`| manual  | Darker cobalt on `#FAFAF9`              |
| `data-theme=""`     | system  | Whichever the OS reports, no FOUC       |
| `data-theme="trader"` | Konami | Orange accent on `#050505`, mono-only |

For each: header background is right, focus ring is visible, post-row
hover color clears AA, theme switcher button shows the active state.

---

## 6. Keyboard-only navigation

Tab from the top. Expected order:

1. Skip-to-content link (visible when focused)
2. Brand "AR/portfolio"
3. Primary nav items (Work / Experience / About / Stack / Writing / Contact)
4. Theme switcher (3 buttons)
5. Cmd-K trigger
6. Hero CTAs (View case studies, Email me)
7. Each case-study tile in turn (the entire tile is the link target)
8. Then through Experience entries, Stack chips, Writing rows, Contact card,
   Footer links.

Press `K` (or `Ctrl+K`) → palette opens, input focused. `Esc` closes.
Press `R` → résumé download triggers. Press `T` → theme cycles. Press
`?` → help modal opens. Press `Esc` → it closes.

---

## 7. Verify résumé / Calendly / email all open correctly

- Hero "Email me" → opens default mail app with the pre-filled subject.
- Cmd-K → Email me → same.
- Cmd-K → Schedule a call → opens `calendly.com/abhinav-rathi` in a
  new tab.
- Cmd-K → Download résumé → downloads `Abhinav-Rathi.pdf`. (The
  filename contains no space — verified.)
- ContactForm fallback → without `PUBLIC_CONTACT_ENDPOINT` set, "Send"
  should drop into a pre-filled `mailto:`. With endpoint set, should
  POST and show inline status.

---

## 8. Verify 301 from old GH Pages URL

This is the only step that requires the canonical-domain switch. Until
then, the old URL **is** the live URL. After flipping:

```pwsh
curl -I https://abhinav00711.github.io/abhinavrathi/
# expect HTTP/2 301
# location: https://abhinavrathi.com/
```

---

## 9. Production smoke test post-deploy

After the GitHub Actions deploy lands:

- Open `/sitemap-0.xml` → confirm draft post URLs are absent.
- Open `/rss.xml` → confirm `<link>` URLs include `/abhinavrathi/` (or
  the canonical domain when migrated). Paste into Feedly to verify
  it parses.
- Open the Twitter card validator at <https://cards-dev.twitter.com/validator>
  for the homepage and one case study.
- Open Search Console → fetch as Google → confirm JSON-LD is picked up.

---

## 10. Pass / fail thresholds

A release is shippable when, on Windows local preview at the latest
`main`:

- [ ] Lighthouse mobile: Perf ≥ 95, A11y ≥ 95, BP ≥ 95, SEO ≥ 95 on
      index + 1 case study + /writing/ + /now/.
- [ ] Pa11y CI: 0 errors across the four URLs above.
- [ ] Playwright mobile screencaps for iPhone 14 + Pixel 7 of all six
      URLs reviewed.
- [ ] Reduced-motion mode walked manually, no animation leaks.
- [ ] Theme matrix walked manually, no FOUC and no contrast regressions.
- [ ] Keyboard-only navigation walked manually, all shortcuts work.
- [ ] Résumé / Calendly / email destinations verified.

If any blocker emerges that isn't trivially fixable, file it as a TKTK
in `TODO.md` and ship the rest of the round — don't gate on Lighthouse
perfection.

---

*Last updated 2026-05-10.*
