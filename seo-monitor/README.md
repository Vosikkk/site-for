# SEO competitor monitor (MVP)

This is a read-only sitemap monitor. It records URL inventories and reports changes; it does **not** measure rankings, traffic, or search demand. A new competitor URL is only a research signal. It never edits Hugo content.

## Run manually

From the repository root (Python 3.9+; no packages or paid APIs):

```sh
python3 seo-monitor/monitor.py
```

The script reads `seo-monitor/config.json`, discovers sitemap locations from each site's `robots.txt` or common paths, recursively follows sitemap indexes, and writes one timestamped, gzip-compressed JSON snapshot per successful site to `seo-monitor/snapshots/<site>/`. It then compares each new snapshot with that site's prior one and writes `seo-monitor/reports/<timestamp>.md`. Failures do not replace a site's previous snapshot; inspect warnings in the report and rerun later. Historical files are never overwritten. To inspect a snapshot, run `gzip -dc seo-monitor/snapshots/<site>/<timestamp>.json.gz`.

The first run is a **baseline**. Run it again later to see additions and removals. A removed sitemap URL may be a sitemap or canonicalization change, not proof that a page was deleted. The monitor normalizes scheme/host, strips tracking queries and fragments, excludes obvious utility URLs, and uses sitemap inclusion as a *likely* indexability signal; it does not crawl every page to verify robots meta tags or Google index status. It fetches HTML titles for newly detected competitor URLs when possible, with slug fallbacks. Topic/page-type labels are heuristic. Review source pages and independent demand signals before deciding what to publish.

Change the site list in `config.json` if you want to add or remove competitors. Keep each `id` stable across runs to preserve comparisons. No scheduler is installed.
