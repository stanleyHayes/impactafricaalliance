#!/usr/bin/env python3
"""Generate a branded Open Graph image for Impact Africa Alliance."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1200
HEIGHT = 630

COLORS = {
    "deep_forest": (0, 30, 20),
    "deep_forest_light": (0, 42, 28),
    "mint": (0, 252, 170),
    "gold": (255, 195, 0),
    "white": (255, 255, 255),
}

OUTPUT = Path(__file__).resolve().parent.parent / "apps/marketing/public/brand/og-image.png"


def main():
    # Base image in RGBA
    img = Image.new("RGBA", (WIDTH, HEIGHT), COLORS["deep_forest"])
    draw = ImageDraw.Draw(img)

    # Subtle vertical gradient overlay
    for i in range(HEIGHT):
        ratio = i / HEIGHT
        r = int(COLORS["deep_forest"][0] * (1 - ratio) + COLORS["deep_forest_light"][0] * ratio)
        g = int(COLORS["deep_forest"][1] * (1 - ratio) + COLORS["deep_forest_light"][1] * ratio)
        b = int(COLORS["deep_forest"][2] * (1 - ratio) + COLORS["deep_forest_light"][2] * ratio)
        draw.line([(0, i), (WIDTH, i)], fill=(r, g, b, 255))

    # Decorative gold-to-mint capsule on the right
    capsule = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    capsule_draw = ImageDraw.Draw(capsule)
    capsule_x = WIDTH - 420
    capsule_y = -80
    capsule_w = 340
    capsule_h = 790
    radius = 170

    for x in range(capsule_x, capsule_x + capsule_w):
        ratio = (x - capsule_x) / capsule_w
        gr = int(COLORS["gold"][0] * (1 - ratio) + COLORS["mint"][0] * ratio)
        gg = int(COLORS["gold"][1] * (1 - ratio) + COLORS["mint"][1] * ratio)
        gb = int(COLORS["gold"][2] * (1 - ratio) + COLORS["mint"][2] * ratio)
        capsule_draw.line(
            [(x, capsule_y + radius), (x, capsule_y + capsule_h - radius)],
            fill=(gr, gg, gb, 45),
        )
    img = Image.alpha_composite(img, capsule)
    draw = ImageDraw.Draw(img)

    # Mint accent ring
    ring = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring)
    ring_draw.arc([(-40, 420), (380, 840)], start=0, end=360, fill=(*COLORS["mint"], 90), width=2)
    img = Image.alpha_composite(img, ring)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    font_path = next((p for p in font_paths if Path(p).exists()), None)

    if font_path:
        font_logo = ImageFont.truetype(font_path, 48)
        font_headline = ImageFont.truetype(font_path, 78)
        font_subheadline = ImageFont.truetype(font_path, 78)
        font_tagline = ImageFont.truetype(font_path.replace(" Bold", ""), 32)
        font_url = ImageFont.truetype(font_path.replace(" Bold", ""), 24)
    else:
        font_logo = ImageFont.load_default()
        font_headline = ImageFont.load_default()
        font_subheadline = ImageFont.load_default()
        font_tagline = ImageFont.load_default()
        font_url = ImageFont.load_default()

    # Logo mark
    draw.text((80, 80), "IAA", fill=COLORS["white"], font=font_logo)
    draw.rectangle([80, 140, 144, 146], fill=COLORS["mint"])

    # Headline
    draw.text((80, 220), "Empowering Africa.", fill=COLORS["white"], font=font_headline)
    draw.text((80, 310), "One Community at a Time.", fill=COLORS["mint"], font=font_subheadline)

    # Tagline
    draw.text((80, 440), "Impact Africa Alliance", fill=(*COLORS["white"], 200), font=font_tagline)

    # URL pill with transparent mint background
    pill = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pill_draw = ImageDraw.Draw(pill)
    pill_box = [80, 510, 500, 566]
    pill_draw.rounded_rectangle(
        pill_box,
        radius=28,
        fill=(*COLORS["mint"], 40),
        outline=COLORS["mint"],
        width=2,
    )
    pill_draw.text(
        (108, 528), "www.impactafricaalliance.org", fill=COLORS["mint"], font=font_url
    )
    img = Image.alpha_composite(img, pill)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUTPUT, "PNG")
    print(f"Generated OG image: {OUTPUT}")


if __name__ == "__main__":
    main()
