#!/usr/bin/env python3
"""Small, dependency-free sitemap inventory and competitor delta report."""

from __future__ import annotations

import gzip
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
STAMP = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
UTILITY = {"about", "contact", "privacy", "privacy-policy", "terms", "terms-of-service",
           "cookie-policy", "cookies", "disclaimer", "feed", "feeds", "rss", "atom",
           "sitemap", "sitemap.xml", "search", "author", "authors", "tag", "tags",
           "category", "categories", "page", "pagination", "wp-json", "wp-admin",
           "login", "sign-in", "register", "cart", "checkout", "account"}
TOPICS = {
    "Proxmox virtualization": ("proxmox", "qemu", "kvm", "lxc", "virtio", "virtual-machine", "vm-"),
    "Homelab hardware": ("mini-pc", "minipc", "n100", "n150", "minisforum", "gmktec", "beelink", "hardware", "server-build", "tinyminimicro"),
    "Storage and backup": ("backup", "restore", "snapshot", "storage", "zfs", "nas", "truenas", "ceph"),
    "Networking and access": ("network", "router", "firewall", "vpn", "tailscale", "wireguard", "dns", "vlan", "remote-access"),
    "Self-hosted apps": ("self-host", "selfhost", "docker", "compose", "jellyfin", "immich", "nextcloud", "home-assistant", "media-server", "minecraft"),
    "Automation and operations": ("automation", "monitoring", "alert", "ansible", "kubernetes", "k8s", "cluster", "high-availability")
}
PAGE_TYPES = {
    "review/comparison": ("review", "vs", "versus", "comparison", "best", "top-"),
    "troubleshooting": ("fix", "error", "not-working", "troubleshoot", "problem", "failed"),
    "tutorial/setup": ("guide", "how-to", "setup", "install", "configure", "tutorial"),
}


def request(url: str, *, accept="application/xml,text/xml,*/*", max_bytes=25_000_000) -> tuple[bytes, str]:
    headers = {"User-Agent": CONFIG["user_agent"], "Accept": accept}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=CONFIG["request_timeout_seconds"]) as response:
        data = response.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ValueError("response exceeds size limit")
        if response.headers.get("Content-Encoding") == "gzip" or url.endswith(".gz"):
            data = gzip.decompress(data)
        return data, response.geturl()


def normalize(raw: str, host: str) -> str | None:
    p = urllib.parse.urlsplit(raw.strip())
    if p.scheme not in {"http", "https"} or not p.hostname:
        return None
    domain = p.hostname.lower().removeprefix("www.")
    if domain != host.removeprefix("www."):
        return None
    path = re.sub(r"/+", "/", urllib.parse.unquote(p.path or "/"))
    path = urllib.parse.quote(path.rstrip("/") or "/", safe="/-._~")
    if path == "/":
        return None
    pieces = [x.lower() for x in path.strip("/").split("/")]
    if len(pieces) == 1 and pieces[0] in {"posts", "blog", "articles", "guides"}:
        return None
    if any(x in UTILITY or re.fullmatch(r"page[-_]?\d+", x) for x in pieces):
        return None
    if re.search(r"\.(xml|json|txt|pdf|jpg|jpeg|png|webp|gif|svg|css|js|zip)$", path, re.I):
        return None
    return "https://" + domain + path + "/"


def sitemap_candidates(base: str, warnings: list[str]) -> list[str]:
    candidates = []
    try:
        data, _ = request(base + "/robots.txt", accept="text/plain,*/*", max_bytes=500_000)
        for line in data.decode("utf-8", "replace").splitlines():
            if line.lower().startswith("sitemap:"):
                candidates.append(line.split(":", 1)[1].strip())
    except Exception as exc:
        warnings.append(f"robots.txt: {exc}")
    return list(dict.fromkeys(candidates or [base + "/sitemap.xml", base + "/sitemap_index.xml"]))


def collect(site: dict) -> tuple[dict[str, dict], list[str], list[str]]:
    base = site["url"].rstrip("/")
    host = urllib.parse.urlsplit(base).hostname or ""
    warnings: list[str] = []
    queue = sitemap_candidates(base, warnings)
    seen: set[str] = set()
    children: set[str] = set()
    failed_children: list[str] = []
    found: dict[str, dict] = {}
    success: list[str] = []
    while queue:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        if len(seen) > 2000:
            raise RuntimeError("sitemap index exceeds safety limit")
        try:
            data, resolved = request(url)
            root = ET.fromstring(data)
            kind = root.tag.rsplit("}", 1)[-1]
            if kind not in {"sitemapindex", "urlset"}:
                raise ValueError(f"unexpected XML root {kind}")
            success.append(resolved)
            for element in root:
                loc = element.findtext("{*}loc")
                if not loc:
                    continue
                if kind == "sitemapindex":
                    target = urllib.parse.urljoin(resolved, loc.strip())
                    if urllib.parse.urlsplit(target).hostname and urllib.parse.urlsplit(target).hostname.removeprefix("www.") == host.removeprefix("www."):
                        queue.append(target)
                        children.add(target)
                else:
                    normalized = normalize(loc, host)
                    if normalized:
                        found[normalized] = {"url": normalized, "lastmod": element.findtext("{*}lastmod")}
        except Exception as exc:
            warnings.append(f"{url}: {exc}")
            if url in children:
                failed_children.append(url)
        time.sleep(CONFIG["request_delay_seconds"])
    if not success:
        raise RuntimeError("no parseable sitemap: " + "; ".join(warnings))
    if failed_children:
        raise RuntimeError(f"{len(failed_children)} child sitemap(s) failed; snapshot not saved")
    return found, success, warnings


def title_for(url: str) -> str | None:
    try:
        data, _ = request(url, accept="text/html,*/*", max_bytes=2_000_000)
        sample = data.decode("utf-8", "replace")
        if re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', sample, re.I):
            return None
        match = re.search(r"<title\b[^>]*>(.*?)</title>", sample, re.I | re.S)
        if match:
            title = html.unescape(re.sub(r"\s+", " ", match.group(1))).strip()
            return title[:180] or None
    except Exception:
        pass
    return None


def labels(url: str, title: str | None) -> tuple[list[str], str]:
    text = urllib.parse.unquote(urllib.parse.urlsplit(url).path).lower().replace("_", "-")
    if title:
        text += " " + title.lower()
    topics = [name for name, needles in TOPICS.items() if any(n in text for n in needles)]
    page_type = next((name for name, needles in PAGE_TYPES.items() if any(n in text for n in needles)), "article/other")
    return (topics or ["Other/unclear"], page_type)


def previous(site_id: str) -> dict | None:
    files = sorted((ROOT / "snapshots" / site_id).glob("*.json.gz"))
    return json.loads(gzip.decompress(files[-1].read_bytes())) if files else None


def render(results: list[dict]) -> str:
    own = next((x for x in results if x["site"]["role"] == "own" and x.get("snapshot")), None)
    competitors = [x for x in results if x["site"]["role"] == "competitor" and x.get("snapshot")]
    out = [f"# SEO competitor monitor — {STAMP}", "", "Sitemap observations, not search-demand or ranking evidence. URLs classified heuristically; investigate before planning content.", "", "## 1. What changed since the previous snapshot", ""]
    for r in results:
        name = r["site"]["id"]
        if "error" in r:
            out.append(f"- **{name}:** fetch failed; previous history retained. {r['error']}")
        elif r["previous"] is None:
            out.append(f"- **{name}:** baseline established ({len(r['snapshot']['pages'])} filtered URLs); no prior comparison.")
        else:
            out.append(f"- **{name}:** +{len(r['added'])} new, −{len(r['removed'])} removed from sitemap; {len(r['snapshot']['pages'])} current filtered URLs.")
            for url in r["removed"][:20]:
                out.append(f"  - Removed from sitemap: {url}")
            if len(r["removed"]) > 20:
                out.append(f"  - …and {len(r['removed'])-20} more removed URLs (compare the JSON snapshots).")
        for warning in r.get("warnings", [])[:3]:
            out.append(f"  - Warning: {warning}")
    out += ["", "A removal means absence from this sitemap fetch, not confirmed deletion. Partial sitemap failures can create false deltas.", "", "## 2. New competitor pages", ""]
    new_pages = [(r["site"]["id"], r["snapshot"]["pages"][url]) for r in competitors for url in r["added"]]
    if new_pages:
        for name, page in new_pages[:50]:
            out.append(f"- **{name}** · {', '.join(page['topics'])} · {page['page_type']}: [{page['title'] or page['url']}]({page['url']})")
        if len(new_pages) > 50:
            out.append(f"- …and {len(new_pages)-50} more in the JSON snapshots.")
    else:
        out.append("No new competitor URLs detected (baseline or unchanged sitemaps).")
    clusters: dict[str, list[tuple[str, dict]]] = defaultdict(list)
    for name, page in new_pages:
        for topic in page["topics"]:
            clusters[topic].append((name, page))
    out += ["", "## 3. Emerging topic/content clusters", ""]
    if clusters:
        for topic, pages in sorted(clusters.items(), key=lambda x: -len(x[1])):
            kinds = ", ".join(f"{k} {v}" for k, v in Counter(p["page_type"] for _, p in pages).most_common())
            out.append(f"- **{topic}:** {len(pages)} new URL(s) across {len(set(n for n, _ in pages))} site(s); {kinds}.")
    else:
        out.append("No emerging cluster can be inferred from a baseline or an unchanged run.")
    out += ["", "## 4. Patterns competitors appear to be investing in", ""]
    if clusters:
        out.append("Observed new-URL mix only (not proof of investment or demand):")
        for topic, pages in sorted(clusters.items(), key=lambda x: -len(x[1]))[:5]:
            out.append(f"- {topic}: {len(pages)} new page(s).")
    else:
        out.append("Insufficient change history to infer a publishing pattern. Baseline inventories alone show coverage, not recent investment.")
    out += ["", "## 5. Gaps versus RunAHomeLab", ""]
    if own and competitors:
        own_topics = Counter(t for p in own["snapshot"]["pages"].values() for t in p["topics"])
        comp_topics = Counter(t for r in competitors for p in r["snapshot"]["pages"].values() for t in p["topics"])
        for topic, count in comp_topics.most_common():
            if topic == "Other/unclear":
                continue
            out.append(f"- {topic}: competitors {count} URLs; RunAHomeLab {own_topics[topic]} URLs. Broad labels do not establish a true editorial gap.")
    else:
        out.append("Coverage comparison unavailable until both own and competitor sitemaps succeed.")
    out += ["", "## 6. Opportunities worth investigating (maximum 5)", ""]
    eligible = [(topic, pages) for topic, pages in clusters.items() if topic != "Other/unclear"]
    if own and eligible:
        own_topics = Counter(t for p in own["snapshot"]["pages"].values() for t in p["topics"])
        for topic, pages in sorted(eligible, key=lambda x: (-len(x[1]), x[0]))[:5]:
            out.append(f"- **Investigate {topic}:** {len(pages)} new competitor URL(s), versus {own_topics[topic]} RunAHomeLab URL(s). Validate user questions, first-hand testing potential, and independent demand before choosing an angle; do not copy a page.")
    else:
        out.append("None yet. Wait for a second successful snapshot before treating new competitor URLs as research signals.")
    return "\n".join(out) + "\n"


def main() -> int:
    results = []
    for site in CONFIG["sites"]:
        print(f"Fetching {site['id']}...", flush=True)
        old = previous(site["id"])
        try:
            pages, sitemaps, warnings = collect(site)
            old_urls = set(old["pages"]) if old else set()
            added = sorted(set(pages) - old_urls) if old else []
            removed = sorted(old_urls - set(pages)) if old else []
            # Fetch titles on deltas only; baseline slugs are sufficient for initial coverage labels.
            for url, page in pages.items():
                page["title"] = title_for(url) if url in added else None
                if url in added:
                    time.sleep(CONFIG["request_delay_seconds"])
                page["topics"], page["page_type"] = labels(url, page["title"])
            snapshot = {"site": site, "captured_at": STAMP, "sitemaps": sitemaps,
                        "warnings": warnings, "pages": dict(sorted(pages.items()))}
            folder = ROOT / "snapshots" / site["id"]
            folder.mkdir(parents=True, exist_ok=True)
            (folder / f"{STAMP}.json.gz").write_bytes(
                gzip.compress((json.dumps(snapshot, ensure_ascii=False) + "\n").encode("utf-8"), mtime=0)
            )
            results.append({"site": site, "snapshot": snapshot, "previous": old,
                            "added": added, "removed": removed, "warnings": warnings})
        except Exception as exc:
            results.append({"site": site, "error": str(exc)})
    report = ROOT / "reports" / f"{STAMP}.md"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(render(results), encoding="utf-8")
    print(f"Report: {report}")
    return 0 if all("snapshot" in r for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
