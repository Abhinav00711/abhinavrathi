"""
Generates per-case-study cover images (16:9, 1200×675) into
src/assets/work/<slug>/cover.png so Astro Image can process them at build
time (AVIF + WebP + responsive srcset). Distinct from the per-case-study OG
images (1200×630, in `public/work/<slug>/og.png`) which are referenced
verbatim by social-share previews and so live in `public/`.

Visual language matches og-case-study-gen.py — same cobalt halo, same
hairline, same brand mark — but laid out for in-page use rather than for
small social previews:
  - bigger headline (uses the full width)
  - bigger summary (3 lines max, soft-wrapped)
  - no tech-chip strip (the page already shows chips below the cover)
  - subtle code-frame eyebrow, slug-as-mono-watermark on the right edge

Output goes to `src/assets/work/<slug>/cover.png`. The MDX frontmatter
`cover` field references it via a relative path; Astro Image takes it from
there.

Run:
    python3 scripts/og-cover-gen.py
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "src" / "content" / "projects"
OUT_BASE = ROOT / "src" / "assets" / "work"

W, H = 1200, 675

# Tokens — must mirror global.css.
SURFACE = (10, 10, 10)
PANEL = (20, 20, 22)
HAIRLINE = (42, 42, 45)
HAIRLINE_SOFT = (31, 31, 34)
BODY = (230, 230, 232)
MUTED = (154, 154, 162)
FAINT = (108, 108, 116)
ACCENT = (61, 82, 254)
ACCENT_TEXT = (102, 121, 255)  # AA-clearing accent, mirrors --color-accent-text
WHITE = (255, 255, 255)

SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def parse_frontmatter(text: str) -> dict:
    """Same focused regex as og-case-study-gen.py — see notes there."""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    raw = text[3:end]

    fm: dict = {}
    for match in re.finditer(r'(?m)^(\w+):\s*("[^"]*"|\'[^\']*\'|[^\n]+?)\s*$', raw):
        key = match.group(1)
        val = match.group(2).strip()
        if val.startswith(('"', "'")):
            val = val[1:-1]
        if key not in fm:
            fm[key] = val

    fm["anonymized"] = str(fm.get("anonymized", "")).strip().lower() == "true"
    return fm


def wrap_text(d: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list:
    words = text.split()
    lines: list = []
    cur = ""
    for w in words:
        candidate = (cur + " " + w).strip()
        bbox = d.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] > max_width and cur:
            lines.append(cur)
            cur = w
        else:
            cur = candidate
    if cur:
        lines.append(cur)
    return lines


def render_cover(slug: str, fm: dict) -> Image.Image:
    title = fm.get("title", slug)
    summary = fm.get("summary", "")
    anonymized = bool(fm.get("anonymized"))

    img = Image.new("RGB", (W, H), SURFACE)
    d = ImageDraw.Draw(img)

    # Subtle dot grid (24px)
    for y in range(0, H, 24):
        for x in range(0, W, 24):
            d.point((x, y), fill=(255, 255, 255, 12))

    # Cobalt halo — top-left, slightly stronger than OG since cover renders
    # bigger on screen.
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    for r, alpha in [(420, 24), (300, 32), (200, 40), (130, 50)]:
        hd.ellipse((-r // 2, -r // 2, r, r), fill=(*ACCENT, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), halo).convert("RGB")
    d = ImageDraw.Draw(img)

    # Hairline border — slightly inset.
    d.rectangle((48, 48, W - 48, H - 48), outline=HAIRLINE, width=1)

    f_brand = ImageFont.truetype(MONO, 22)
    f_eyebrow = ImageFont.truetype(MONO, 16)
    f_pill = ImageFont.truetype(MONO, 13)
    f_h1 = ImageFont.truetype(SANS, 60)
    f_h1_sm = ImageFont.truetype(SANS, 48)
    f_summary = ImageFont.truetype(SANS_R, 24)
    f_watermark = ImageFont.truetype(MONO, 80)
    f_footer = ImageFont.truetype(MONO, 14)

    # Brand mark
    d.text((96, 92), "AR", fill=WHITE, font=f_brand)
    d.text((128, 92), "/", fill=FAINT, font=f_brand)
    d.text((144, 92), "case study", fill=MUTED, font=f_brand)

    # Eyebrow — top-right
    eyebrow = "ABHINAVRATHI.COM/WORK"
    bbox = d.textbbox((0, 0), eyebrow, font=f_eyebrow)
    d.text((W - 96 - (bbox[2] - bbox[0]), 96), eyebrow, fill=FAINT, font=f_eyebrow)

    # Anonymized pill or accent rule
    y = 200
    if anonymized:
        text = "ANONYMIZED · PROP TRADING FIRM"
        bbox = d.textbbox((0, 0), text, font=f_pill)
        tw = bbox[2] - bbox[0]
        pill_w = tw + 24
        d.rounded_rectangle(
            (96, y, 96 + pill_w, y + 26),
            radius=13,
            outline=ACCENT,
            width=1,
        )
        d.text((108, y + 5), text, fill=ACCENT_TEXT, font=f_pill)
        y += 56
    else:
        d.rectangle((96, y, 100, y + 8), fill=ACCENT)
        y += 24

    # Title — try big size first; downshift if it'd need >2 lines.
    title_max_w = W - 220
    headline_font = f_h1
    title_lines = wrap_text(d, title, headline_font, title_max_w)
    if len(title_lines) > 2:
        headline_font = f_h1_sm
        title_lines = wrap_text(d, title, headline_font, title_max_w)
    title_lines = title_lines[:2]
    line_h = 72 if headline_font is f_h1 else 60
    for line in title_lines:
        d.text((96, y), line, fill=WHITE, font=headline_font)
        y += line_h

    y += 24

    # Summary — wrap to 3 lines with ellipsis.
    if summary:
        sum_lines = wrap_text(d, summary, f_summary, W - 280)
        if len(sum_lines) > 3:
            sum_lines = sum_lines[:3]
            last = sum_lines[-1]
            while last and d.textbbox((0, 0), last + "…", font=f_summary)[2] > W - 280:
                last = last.rsplit(" ", 1)[0] if " " in last else last[:-1]
            sum_lines[-1] = last + "…"
        for line in sum_lines:
            d.text((96, y), line, fill=MUTED, font=f_summary)
            y += 32

    # Slug watermark — bottom-right, very faint, sets the cover apart from the
    # OG card without competing with the title.
    bbox = d.textbbox((0, 0), slug, font=f_watermark)
    tw = bbox[2] - bbox[0]
    d.text(
        (W - 96 - tw, H - 96 - (bbox[3] - bbox[1])),
        slug,
        fill=HAIRLINE,
        font=f_watermark,
    )

    # Footer — Abhinav Rathi · slug
    footer_text = f"Abhinav Rathi   ·   {slug}.mdx"
    d.text((96, H - 86), footer_text, fill=FAINT, font=f_footer)

    # Cobalt signature dot — bottom-right, smaller than OG to feel less
    # "social card" and more "page hero".
    d.ellipse((W - 124, H - 86, W - 102, H - 64), fill=ACCENT)

    return img


def main() -> None:
    if not PROJECTS.exists():
        raise SystemExit(f"Projects folder not found: {PROJECTS}")

    OUT_BASE.mkdir(parents=True, exist_ok=True)

    written = 0
    for mdx in sorted(PROJECTS.glob("*.mdx")):
        slug = mdx.stem
        text = mdx.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        if not fm.get("title"):
            print(f"  skip {slug}: no title in frontmatter")
            continue
        out_dir = OUT_BASE / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / "cover.png"
        img = render_cover(slug, fm)
        img.save(out, optimize=True)
        size = out.stat().st_size
        print(f"  wrote {out.relative_to(ROOT)} ({size} bytes)")
        written += 1

    print(f"Done — {written} cover image(s) generated.")


if __name__ == "__main__":
    main()
