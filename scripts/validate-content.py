#!/usr/bin/env python3
"""Fail fast on trust, affiliate, and disclosure regressions."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
PRODUCTS = json.loads((ROOT / "data" / "products.json").read_text(encoding="utf-8"))["products"]
TRACKING_IDS = {product["tracking_id"] for product in PRODUCTS}
ASIN_TO_TAG = {
    product["amazon_asin"]: product["tracking_id"]
    for product in PRODUCTS
    if product["amazon_asin"]
}

errors: list[str] = []


def fail(path: Path | str, message: str) -> None:
    errors.append(f"{path}: {message}")


markdown_files = sorted(CONTENT.rglob("*.md"))
amazon_pattern = re.compile(r"https?://(?:www\.)?amazon\.com/[^\s)>]+")
known_routes = {"/", "/about/", "/methodology/", "/posts/", "/privacy/"}
known_routes.update(f"/posts/{path.stem}/" for path in (CONTENT / "posts").glob("*.md"))

for path in markdown_files:
    text = path.read_text(encoding="utf-8")
    amazon_urls = amazon_pattern.findall(text)

    if amazon_urls and "{{< affiliate-disclosure >}}" not in text:
        fail(path.relative_to(ROOT), "Amazon link exists without the standard affiliate disclosure shortcode")

    for raw_url in amazon_urls:
        url = raw_url.rstrip(".,;:")
        parsed = urlparse(url)
        tag = parse_qs(parsed.query).get("tag", [None])[0]
        if not tag:
            fail(path.relative_to(ROOT), f"Amazon URL has no tag parameter: {url}")
            continue
        if tag not in TRACKING_IDS:
            fail(path.relative_to(ROOT), f"unknown Amazon tracking ID {tag}: {url}")

        asin_match = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})(?:[/?]|$)", parsed.path + "?")
        if asin_match:
            asin = asin_match.group(1)
            expected = ASIN_TO_TAG.get(asin)
            if not expected:
                fail(path.relative_to(ROOT), f"ASIN {asin} is missing from data/products.json")
            elif tag != expected:
                fail(path.relative_to(ROOT), f"ASIN {asin} must use tag={expected}, found tag={tag}")

    forbidden_claims = {
        "based on hands-on experience": "undocumented first-hand testing claim",
        "we tested this hardware": "undocumented first-hand testing claim",
        "runahomelab-tested": "undocumented first-hand testing claim",
        "tag=runahomelab-20": "legacy catch-all Amazon tracking ID",
    }
    lowered = text.lower()
    for phrase, reason in forbidden_claims.items():
        if phrase.lower() in lowered:
            fail(path.relative_to(ROOT), f"{reason}: {phrase!r}")

    if path.name == "proxmox-backup-notifications-telegram.md":
        normalized_test_text = re.sub(
            r"\s+",
            " ",
            lowered.replace("\n> ", " "),
        )
        required_test_disclosures = {
            "runahomelab-backup-alert-validation-production.up.railway.app/": "validation test URL",
            "runahomelab-backup-alert-validation-production.up.railway.app/privacy": "test-specific privacy URL",
            "random session token": "stored test data",
            "up to 30 days": "test retention period",
            "does not store that id": "Telegram chat ID handling",
            "does not accept proxmox payloads": "validation-only scope",
        }
        for phrase, description in required_test_disclosures.items():
            if phrase not in normalized_test_text:
                fail(
                    path.relative_to(ROOT),
                    f"missing {description}: {phrase!r}",
                )

    for match in re.finditer(r"\]\((/[^)#?]*)(?:[?#][^)]*)?\)", text):
        route = match.group(1)
        if route and route not in known_routes:
            fail(path.relative_to(ROOT), f"internal Markdown link does not match a content route: {route}")

for path in sorted((ROOT / "layouts").rglob("*.html")):
    text = path.read_text(encoding="utf-8")
    for route in re.findall(r'href="(/[^"#?]*)', text):
        if route.startswith(("/assets/", "/js/", "/favicon")):
            continue
        if route not in known_routes:
            fail(path.relative_to(ROOT), f"internal navigation link does not match a content route: {route}")

required_disclosures = {
    "posts/best-mini-pcs-for-proxmox.md",
    "posts/example-350-proxmox-homelab-build.md",
}
for relative in required_disclosures:
    text = (CONTENT / relative).read_text(encoding="utf-8")
    if "{{< affiliate-disclosure >}}" not in text:
        fail(Path("content") / relative, "standard affiliate disclosure is required")

privacy = (CONTENT / "privacy.md").read_text(encoding="utf-8")
if "opt-in" not in privacy.lower() or "analytics-preferences" not in privacy:
    fail("content/privacy.md", "privacy page must document opt-in analytics and expose preferences")

about = (CONTENT / "about.md").read_text(encoding="utf-8")
if "linkedin.com/in/sasha-voskolovych" not in about or "/methodology/" not in about:
    fail("content/about.md", "author identity and methodology links are required")

if errors:
    print("Content validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    sys.exit(1)

print(f"Content validation passed: {len(markdown_files)} Markdown files, {len(PRODUCTS)} tracked products.")
