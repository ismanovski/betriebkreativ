import csv
import html
import json
import re
import time
from pathlib import Path
from urllib.request import Request, urlopen

BASE_URL = "https://www.wir-machen-druck.de"
DATA_DIR = Path("assets/data")
RAW_DIR = DATA_DIR / "categories_raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def read_categories(csv_path: Path):
    with csv_path.open(encoding="utf-8-sig", newline="") as fh:
        reader = csv.reader(fh)
        try:
            headers = next(reader)
        except StopIteration:
            return
        headers = [h.strip().strip('"').lower() for h in headers]
        for row in reader:
            if not row:
                continue
            row_dict = {headers[i]: row[i].strip().strip('"') for i in range(min(len(headers), len(row)))}
            href = row_dict.get("href")
            label = row_dict.get("label")
            if not href or not label:
                continue
            if "category" not in href:
                continue
            try:
                cat_id = int(href.split("category,")[1].split(".")[0])
            except (IndexError, ValueError):
                continue
            yield {"id": cat_id, "label": label, "href": href}


STREAMLINING_PATTERN = re.compile(
    r"let\s+streamliningJson\s*=\s*(\{.*?\});",
    re.S,
)


def fetch_streamlining_json(category):
    cat_id = category["id"]
    raw_path = RAW_DIR / f"{cat_id}.html"

    if raw_path.exists():
        html_content = raw_path.read_text(encoding="utf-8", errors="ignore")
    else:
        url = BASE_URL + category["href"]
        req = Request(url, headers=HEADERS)
        with urlopen(req) as response:
            data = response.read()
        html_content = data.decode("utf-8", errors="ignore")
        raw_path.write_text(html_content, encoding="utf-8")
        time.sleep(0.5)

    match = STREAMLINING_PATTERN.search(html_content)
    if not match:
        print(f"[WARN] Kein streamliningJson für {category['label']}")
        return None

    json_text = match.group(1)
    try:
        return json.loads(json_text)
    except json.JSONDecodeError as exc:
        tmp = RAW_DIR / f"{cat_id}_streamlining_raw.txt"
        tmp.write_text(json_text, encoding="utf-8")
        raise RuntimeError(f"JSON Fehler bei Kategorie {cat_id}") from exc


TAG_RE = re.compile(r"<[^>]+>")


def clean_html(value: str) -> str:
    if not value:
        return ""
    stripped = TAG_RE.sub(" ", value)
    stripped = re.sub(r"\s+", " ", stripped)
    return html.unescape(stripped).strip()


def build_catalog():
    csv_path = Path("wm_categories.csv")
    if not csv_path.exists():
        raise FileNotFoundError("wm_categories.csv nicht gefunden.")

    catalog = []
    for category in read_categories(csv_path):
        payload = fetch_streamlining_json(category)
        if not payload:
            continue

        main = payload.get("aWarengruppe") or {}
        description = clean_html(main.get("beschreibung", ""))

        subcategories = []
        raw_subs = payload.get("aSubCategories") or []
        if isinstance(raw_subs, list):
            for sub in raw_subs:
                if not isinstance(sub, dict):
                    continue
                sub_id = sub.get("id")
                slug = (sub.get("bezeichnung_url") or "").strip()
                subcategories.append(
                    {
                        "id": sub_id,
                        "name": (sub.get("bezeichnung") or "").strip(),
                        "slug": slug,
                        "url": f"/{slug},category,{sub_id}.html" if slug and sub_id else "",
                        "icon": f"assets/img/products/{sub_id}.svg" if sub_id else "",
                        "online_designer": sub.get("is_online_designer"),
                        "mapped_article_ids": sub.get("mapped_artikel_ids"),
                    }
                )

        articles = []
        raw_articles = payload.get("aArtikel") or []
        if isinstance(raw_articles, list):
            for art in raw_articles:
                if not isinstance(art, dict):
                    continue
                articles.append(
                    {
                        "id": art.get("artikel_id"),
                        "name": (art.get("bezeichnung") or "").strip(),
                        "slug": (art.get("bezeichnung_url") or "").strip(),
                        "category_id": art.get("oberwarengruppe_id_2"),
                    }
                )

        catalog.append(
            {
                "id": category["id"],
                "name": main.get("bezeichnung", category["label"]),
                "slug": main.get("bezeichnung_url", ""),
                "url": category["href"],
                "icon": f"assets/img/products/{category['id']}.svg",
                "description": description,
                "subcategories": subcategories,
                "articles": articles,
            }
        )

    output_path = DATA_DIR / "catalog.json"
    output_path.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[OK] Katalog gespeichert in {output_path}")


if __name__ == "__main__":
    build_catalog()
