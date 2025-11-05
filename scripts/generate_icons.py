from pathlib import Path

import json
import re

CANVAS = 200
STROKE = "#141414"
STROKE_WIDTH = 6

OUTPUT_DIR = Path("assets/img/products")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CATALOG_PATH = Path("assets/data/catalog.json")


def svg_begin():
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">',
        '<rect width="100%" height="100%" fill="white"/>',
    ]


def svg_end():
    return ["</svg>"]


def rect(x, y, w, h, rx=10):
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="none" stroke="{STROKE}" stroke-width="{STROKE_WIDTH}"/>'
    )


def line(x1, y1, x2, y2):
    return (
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
        f'stroke="{STROKE}" stroke-width="{STROKE_WIDTH}" '
        f'stroke-linecap="round"/>'
    )


def circle(cx, cy, r):
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" '
        f'stroke="{STROKE}" stroke-width="{STROKE_WIDTH}"/>'
    )


def poly(points):
    pts = " ".join(f"{x},{y}" for x, y in points)
    return (
        f'<polyline points="{pts}" fill="none" stroke="{STROKE}" '
        f'stroke-width="{STROKE_WIDTH}" stroke-linejoin="round" stroke-linecap="round"/>'
    )


def badge():
    return [
        circle(CANVAS * 0.5, CANVAS * 0.45, CANVAS * 0.2),
        line(CANVAS * 0.25, CANVAS * 0.75, CANVAS * 0.75, CANVAS * 0.75),
    ]


def flyer(fold=False):
    elements = [
        rect(60, 30, 80, 140, rx=8),
        line(75, 60, 125, 60),
        line(75, 95, 125, 95),
        line(75, 130, 115, 130),
    ]
    if fold:
        elements.append(line(100, 30, 100, 170))
    return elements


def card():
    elements = [
        rect(40, 60, 120, 80, rx=12),
        line(60, 85, 140, 85),
        line(60, 105, 120, 105),
        line(60, 125, 120, 125),
    ]
    return elements


def poster():
    return [
        rect(70, 20, 60, 140, rx=6),
        line(70, 45, 130, 45),
        line(70, 70, 130, 70),
        line(70, 95, 110, 95),
        line(45, 20, 155, 20),
        line(55, 20, 40, 10),
        line(145, 20, 160, 10),
    ]


def banner():
    return [
        rect(40, 80, 120, 60, rx=18),
        circle(50, 110, 6),
        circle(150, 110, 6),
        line(40, 80, 30, 70),
        line(40, 140, 30, 150),
        line(160, 80, 170, 70),
        line(160, 140, 170, 150),
    ]


def label():
    return [
        poly([(70, 60), (140, 60), (160, 90), (140, 120), (70, 120), (50, 90), (70, 60)]),
        circle(80, 90, 8),
    ]


def mug():
    return [
        rect(70, 50, 60, 90, rx=12),
        poly([(130, 70), (150, 75), (150, 115), (130, 120)]),
        line(80, 70, 120, 70),
        line(80, 90, 120, 90),
    ]


def tshirt():
    return [
        poly([(70, 40), (90, 30), (110, 30), (130, 40), (150, 90), (130, 90), (130, 165), (70, 165), (70, 90), (50, 90)]),
    ]


def stamp():
    return [
        circle(100, 70, 22),
        rect(70, 95, 60, 25, rx=6),
        polygon([(60, 125), (140, 125), (130, 150), (70, 150)]),
    ]


def polygon(points):
    pts = " ".join(f"{x},{y}" for x, y in points)
    return (
        f'<polygon points="{pts}" fill="none" stroke="{STROKE}" '
        f'stroke-width="{STROKE_WIDTH}" stroke-linejoin="round" stroke-linecap="round"/>'
    )


def notebook():
    return [
        rect(60, 30, 80, 140, rx=10),
        line(80, 40, 80, 160),
        line(90, 50, 120, 50),
        line(90, 70, 120, 70),
        line(90, 90, 120, 90),
    ]


def circle_badge():
    return [
        circle(100, 100, 60),
        circle(100, 100, 40),
        line(100, 40, 100, 60),
        line(100, 140, 100, 160),
    ]


def default_icon():
    return [
        rect(60, 50, 80, 100, rx=12),
        line(80, 80, 120, 80),
        line(80, 100, 120, 100),
        line(80, 120, 120, 120),
    ]


KEYWORD_DRAWERS = [
    ({"falz", "flyer"}, lambda: flyer(fold=True)),
    ({"flyer"}, flyer),
    ({"visiten", "karte", "karten"}, card),
    ({"karte", "karten"}, card),
    ({"plakat", "poster"}, poster),
    ({"banner", "plane", "planen"}, banner),
    ({"aufkleber", "etikett", "sticker"}, label),
    ({"etikett"}, label),
    ({"t-shirt", "shirt", "textil"}, tshirt),
    ({"tasse", "becher"}, mug),
    ({"notiz", "buch", "brosch"}, notebook),
    ({"stempel"}, stamp),
    ({"fahne", "flag"}, banner),
    ({"tasche", "beutel"}, badge),
    ({"magnet"}, circle_badge),
]


def pick_icon(name, slug):
    lowered = f"{name} {slug}".lower()
    tokens = set(re.split(r"[^a-z0-9]+", lowered))
    tokens.discard("")
    for keywords, drawer in KEYWORD_DRAWERS:
        if keywords & tokens:
            return drawer()
    return default_icon()


def generate():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    for category in catalog:
      category_icon_path = OUTPUT_DIR / f"{category['id']}.svg"
      category_elements = svg_begin() + pick_icon(category.get("name", ""), category.get("slug", "")) + svg_end()
      category_icon_path.write_text("\n".join(category_elements), encoding="utf-8")

      for sub in category.get("subcategories", []):
        icon_path = OUTPUT_DIR / f"{sub['id']}.svg"
        elements = svg_begin() + pick_icon(sub.get("name", ""), sub.get("slug", "")) + svg_end()
        icon_path.write_text("\n".join(elements), encoding="utf-8")


if __name__ == "__main__":
    import re

    generate()
