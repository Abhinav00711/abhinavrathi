"""
Generates the 1200x630 OG default image for abhinavrathi.com.

Run: python3 og-default-gen.py
Output: ../public/og-default.png

Design language: near-black surface, hairline border, cobalt accent strip,
sans for the headline, mono for the metric strip — same vocabulary as the
site itself. DejaVu fonts are bundled on most Linux boxes; the CI/dev box
this is generated on will use them. Recruiters never see the source font;
they see the rasterized PNG.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "og-default.png"
W, H = 1200, 630

# tokens (mirror of global.css)
SURFACE = (10, 10, 10)
PANEL = (20, 20, 22)
HAIRLINE = (42, 42, 45)
BODY = (230, 230, 232)
MUTED = (154, 154, 162)
FAINT = (108, 108, 116)
ACCENT = (61, 82, 254)
WHITE = (255, 255, 255)

img = Image.new("RGB", (W, H), SURFACE)
d = ImageDraw.Draw(img)

# Subtle dot grid background
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

# Fonts (DejaVu fallback)
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

f_eyebrow = ImageFont.truetype(MONO, 18)
f_brand = ImageFont.truetype(MONO, 22)
f_h1 = ImageFont.truetype(SANS, 56)
f_h2 = ImageFont.truetype(SANS, 44)
f_body = ImageFont.truetype(SANS_R, 22)
f_mono = ImageFont.truetype(MONO, 18)

# Brand mark (top-left)
d.text((80, 78), "AR", fill=WHITE, font=f_brand)
d.text((110, 78), "/", fill=FAINT, font=f_brand)
d.text((125, 78), "portfolio", fill=MUTED, font=f_brand)

# Eyebrow (top-right)
d.text((W - 80 - 230, 84), "ABHINAVRATHI.COM", fill=FAINT, font=f_eyebrow)

# Accent strip (left edge of headline area)
d.rectangle((80, 220, 84, 360), fill=ACCENT)

# Headline — two lines
d.text((110, 200), "ML engineer shipping", fill=WHITE, font=f_h1)
d.text((110, 270), "production Python.", fill=WHITE, font=f_h1)

# Sub-headline
d.text((110, 360), "Models, services, and the infrastructure that puts the two together.", fill=MUTED, font=f_body)

# Metric strip — four cells with hairline dividers
strip_y = 460
strip_h = 80
cell_w = (W - 160) // 4
for i in range(5):
    x = 80 + i * cell_w
    d.line((x, strip_y, x, strip_y + strip_h), fill=HAIRLINE, width=1)
d.line((80, strip_y, W - 80, strip_y), fill=HAIRLINE, width=1)
d.line((80, strip_y + strip_h, W - 80, strip_y + strip_h), fill=HAIRLINE, width=1)

cells = [
    ("IN PRODUCTION", "3 yrs"),
    ("APPLIED ML WHERE", "bugs cost dollars"),
    ("CASE STUDIES", "6, metric-backed"),
    ("OPEN TO", "senior roles"),
]
for i, (k, v) in enumerate(cells):
    cx = 80 + i * cell_w + 16
    d.text((cx, strip_y + 14), k, fill=FAINT, font=f_eyebrow)
    d.text((cx, strip_y + 42), v, fill=WHITE, font=f_mono)

# Footer name + role
d.text((80, H - 90), "Abhinav Rathi", fill=WHITE, font=f_h2)
d.text((80, H - 90 + 50), "ML Engineer · Axxela (prop trading)", fill=MUTED, font=f_body)

# Cobalt dot top-right (signature)
d.ellipse((W - 110, H - 110, W - 80, H - 80), fill=ACCENT)

img.save(OUT, optimize=True)
size_kb = OUT.stat().st_size
print("Wrote", OUT, "bytes:", size_kb)

