import unittest
from unittest.mock import patch

import monitor


class MonitorTests(unittest.TestCase):
    def test_normalize_filters_utility_and_tracking(self):
        self.assertEqual(
            monitor.normalize("http://www.example.com/posts/Proxmox-Fix/?utm_source=x#top", "example.com"),
            "https://example.com/posts/Proxmox-Fix/",
        )
        self.assertIsNone(monitor.normalize("https://example.com/tags/proxmox/", "example.com"))
        self.assertIsNone(monitor.normalize("https://example.com/posts/", "example.com"))
        self.assertIsNone(monitor.normalize("https://other.com/post/", "example.com"))

    def test_nested_sitemap_and_filtering(self):
        index = b'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://example.com/posts.xml</loc></sitemap></sitemapindex>'
        urls = b'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/proxmox-guide/</loc></url><url><loc>https://example.com/contact/</loc></url></urlset>'

        def fake_request(url, **kwargs):
            if url.endswith("robots.txt"):
                return b"Sitemap: https://example.com/sitemap.xml\n", url
            return (index if url.endswith("sitemap.xml") else urls), url

        with patch.object(monitor, "request", side_effect=fake_request), patch.object(monitor.time, "sleep"):
            pages, sitemaps, warnings = monitor.collect({"url": "https://example.com"})
        self.assertEqual(set(pages), {"https://example.com/proxmox-guide/"})
        self.assertEqual(len(sitemaps), 2)
        self.assertFalse(warnings)

    def test_labels_are_multitopic(self):
        topics, page_type = monitor.labels("https://example.com/proxmox-mini-pc-review/", None)
        self.assertIn("Proxmox virtualization", topics)
        self.assertIn("Homelab hardware", topics)
        self.assertEqual(page_type, "review/comparison")


if __name__ == "__main__":
    unittest.main()
