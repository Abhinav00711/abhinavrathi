"""
Generates per-case-study OG images at 1200×630 for /work/<slug>/og.png.

Reads each MDX file under v2/src/content/projects/ and writes a PNG into
v2/public/work/<slug>/og.png — the path Layout.astro will reach for when
CaseStudy.astro passes a slug-specific ogImage.

Visual language is the same as og-default-gen.py: near-black surface,
hairline border, cobalt accent, mono brand mark, sans for the headline,
mono for tech chips. Recruiters never see the source font; they see a
rasterized PNG that holds up at LinkedIn / Twitter / Slack / iMessage
preview sizes.

Run: python3 og-case-study-gen.py
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "src" / "content" / "projects"
PUBLIC_WORK = ROOT / "public" / "work"

W, H = 1200, 630

# Tokens — must mirror global.css.
SURFACE = (10, 10, 10)
PANEL = (20, 20, 22)
HAIRLINE = (42, 42, 45)
BODY = (230, 230, 232)
MUTED = (154, 154, 162)
FAINT = (108, 108, 116)
ACCENT = (61, 82, 254)
WHITE = (255, 255, 255)

SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def parse_frontmatter(text: str) -> dict:
    """Extract the keys we care about (title, summary, anonymized, tech).

    Deliberately not a real YAML parser — the MDX frontmatter is small and
    schema-validated upstream by Astro's content collections, so a focused
    regex pass is enough and keeps this script dependency-free.
    """
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    raw = text[3:end]

    fm: dict = {}

    # Simple `key: "value"` or `key: value` keys — first occurrence wins.
    for match in re.finditer(r'(?m)^(\w+):\s*("[^"]*"|\'[^\']*\'|[^\n]+?)\s*$', raw):
        key = match.group(1)
        val = match.group(2).strip()
        if val.startswith(('"', "'")):
            val = val[1:-1]
        if key not in fm:
            fm[key] = val

    # `tech: ["a", "b", ...]` inline-array case.
    tech_match = re.search(r"(?m)^tech:\s*\[(.*?)\]", raw, flags=re.DOTALL)
    if tech_match:
        fm["tech"] = re.findall(r'"([^"]+)"', tech_match.group(1))
    else:
        fm["tech"] = []

    # anonymized → bool
    if "anonymized" in fm:
        fm["anonymized"] = str(fm["anonymized"]).strip().lower() == "true"
    else:
        fm["anonymized"] = False

    return fm


def wrap_text(d: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list:
    """Word-wrap to a given pixel width using the actual rendered font metrics."""
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


def draw_chip(d: ImageDraw.ImageDraw, x: int, y: int, label: str, font) -> int:
    """Draw a hairline-bordered tech chip; return its right-edge x for layout."""
    bbox = d.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    pad_x, pad_y = 12, 8
    chip_w = text_w + pad_x * 2
    chip_h = 28
    d.rounded_rectangle(
        (x, y, x + chip_w, y + chip_h),
        radius=14,
        outline=HAIRLINE,
        fill=PANEL,
        width=1,
    )
    # textbbox top isn't always 0 (it's the ascent); offset for visual center.
    d.text((x + pad_x, y + pad_y - 1), label, fill=BODY, font=font)
    return x + chip_w


def render_og(slug: str, fm: dict) -> Image.Image:
    title = fm.get("title", slug)
    summary = fm.get("summary", "")
    anonymized = bool(fm.get("anonymized"))
    tech = fm.get("tech", []) or []

    img = Image.new("RGB", (W, H), SURFACE)
    d = ImageDraw.Draw(img)

    # Subtle dot grid
    for y in range(0, H, 24):
        for x in range(0, W, 24):
            d.point((x, y), fill=(255, 255, 255, 12))

    # Cobalt halo (top-left)
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    for r, alpha in [(360, 22), (260, 30), (180, 36), (110, 44)]:
        hd.ellipse((-r, -r, r, r), fill=(*ACCENT, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), halo).convert("RGB")
    d = ImageDraw.Draw(img)

    # Hairline border
    d.rectangle((40, 40, W - 40, H - 40), outline=HAIRLINE, width=1)

    f_eyebrow = ImageFont.truetype(MONO, 18)
    f_brand = ImageFont.truetype(MONO, 22)
    f_h1 = ImageFont.truetype(SANS, 48)
    f_h1_sm = ImageFont.truetype(SANS, 40)
    f_pill = ImageFont.truetype(MONO, 13)
    f_summary = ImageFont.truetype(SANS_R, 22)
    f_chip = ImageFont.truetype(MONO, 13)
    f_footer = ImageFont.truetype(SANS, 22)
    f_footer_r = ImageFont.truetype(SANS_R, 18)

    # Brand mark (top-left)
    d.text((80, 78), "AR", fill=WHITE, font=f_brand)
    d.text((110, 78), "/", fill=FAINT, font=f_brand)
    d.text((125, 78), f"work / {slug}", fill=MUTED, font=f_brand)

    # Eyebrow (top-right)
    eyebrow_text = "CASE STUDY"
    bbox = d.textbbox((0, 0), eyebrow_text, font=f_eyebrow)
    d.text((W - 80 - (bbox[2] - bbox[0]), 84), eyebrow_text, fill=FAINT, font=f_eyebrow)

    # Anonymized pill (or accent strip if not)
    y = 178
    if anonymized:
        text = "ANONYMIZED · PROP TRADING FIRM"
        bbox = d.textbbox((0, 0), text, font=f_pill)
        tw = bbox[2] - bbox[0]
        pill_w = tw + 24
        pill_h = 26
        d.rounded_rectangle(
            (80, y, 80 + pill_w, y + pill_h),
            radius=13,
            outline=ACCENT,
            width=1,
        )
        d.text((92, y + 5), text, fill=ACCENT, font=f_pill)
        y += 50
    else:
        # 4px cobalt accent rule on the left edge of the title block
        d.rectangle((80, y, 84, y + 8), fill=ACCENT)
        y += 18

    # Title — try big size first; if it would need >3 lines, downshift.
    title_max_w = W - 160
    headline_font = f_h1
    title_lines = wrap_text(d, title, headline_font, title_max_w)
    if len(title_lines) > 3:
        headline_font = f_h1_sm
        title_lines = wrap_text(d, title, headline_font, title_max_w)
    title_lines = title_lines[:3]
    line_h = 58 if headline_font is f_h1 else 50
    for line in title_lines:
        d.text((80, y), line, fill=WHITE, font=headline_font)
        y += line_h

    y += 18

    # Summary — wrap to 3 lines, truncate the rest with an ellipsis on line 3.
    if summary:
        sum_lines = wrap_text(d, summary, f_summary, W - 160)
        if len(sum_lines) > 3:
            sum_lines = sum_lines[:3]
            # Ensure last line indicates continuation.
            last = sum_lines[-1]
            while last and d.textbbox((0, 0), last + "…", font=f_summary)[2] > W - 160:
                last = last.rsplit(" ", 1)[0] if " " in last else last[:-1]
            sum_lines[-1] = last + "…"
        for line in sum_lines:
            d.text((80, y), line, fill=MUTED, font=f_summary)
            y += 30

    # Tech chips strip (just above footer)
    chip_y = H - 170
    cx = 80
    for t in tech:
        # Probe width before drawing to avoid overflow into the footer line.
        bbox = d.textbbox((0, 0), t, font=f_chip)
        chip_w = (bbox[2] - bbox[0]) + 24
        if cx + chip_w > W - 80:
            break
        cx = draw_chip(d, cx, chip_y, t, f_chip) + 8

    # Hairline divider above footer
    d.line((80, H - 130, W - 80, H - 130), fill=HAIRLINE, width=1)

    # Footer
    d.text((80, H - 105), "Abhinav Rathi", fill=WHITE, font=f_footer)
    d.text(
        (80, H - 105 + 30),
        "ML Engineer · Axxela (prop trading)",
        fill=MUTED,
        font=f_footer_r,
    )

    # Cobalt signature dot bottom-right
    d.ellipse((W - 110, H - 110, W - 80, H - 80), fill=ACCENT)

    return img


def main() -> None:
    if not PROJECTS.exists():
        raise SystemExit(f"Projects folder not found: {PROJECTS}")

    PUBLIC_WORK.mkdir(parents=True, exist_ok=True)

    written = 0
    for mdx in sorted(PROJECTS.glob("*.mdx")):
        slug = mdx.stem
        text = mdx.read_text(encoding="utf-8")
        fm = parse_frontmatter(text)
        if not fm.get("title"):
            print(f"  skip {slug}: no title in frontmatter")
            continue
        out_dir = PUBLIC_WORK / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / "og.png"
        img = render_og(slug, fm)
        img.save(out, optimize=True)
        size = out.stat().st_size
        print(f"  wrote {out.relative_to(ROOT)} ({size} bytes)")
        written += 1

    print(f"Done — {written} OG image(s) generated.")


if __name__ == "__main__":
    main()
