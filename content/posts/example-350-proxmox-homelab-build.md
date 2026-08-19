---
title: "A $350 Proxmox Home Lab: Example Build Based on Current Pricing (2026)"
date: 2026-08-14
draft: false
tags: ["homelab", "proxmox", "mini pc", "hardware"]
description: "A concrete example of what a ~$350 Proxmox home lab looks like in 2026 — real current pricing, what it can actually run, and realistic power costs."
ShowToc: true
TocOpen: false
---

> **A note on how to read this guide:** this is a reference configuration built from current, real pricing and specs — not a log of one specific unit we personally ran for months. Think of it as "here's exactly what your money buys right now," which is often more useful than a single person's anecdotal experience, since hardware pricing shifts fast enough that a build log from six months ago can already be stale.

If you read our [beginner's homelab guide](/posts/best-home-lab-for-beginners-2026/), you know the $300–400 range is the sweet spot for most people. Here's exactly what that looks like as a real, buildable configuration right now — not a vague recommendation.

## The Build

| Component | Pick | Approx. Price |
|---|---|---|
| Mini PC | Beelink MINI S13 (Intel N150, 16GB DDR4, 500GB NVMe) | $330–360 |
| Extra storage | 1TB SATA SSD for backups (optional at start) | $50–60 |
| Network switch | Basic 5-port Gigabit switch | $15–20 |
| UPS | 500–600VA basic unit | $50–70 |
| **Total (with extras)** | | **~$350–450** |

The mini PC alone gets you a fully working single-node Proxmox host. The extras are worth adding within your first month or two, not necessarily on day one.

**Why this specific unit:** the N150 idles around 6–9 watts, ships with a real NVMe drive (not the slower SATA/eMMC storage some budget boxes still use), and has enough headroom for the services list below without being over-spec'd for a first lab. It won't win any benchmarks, but a home lab's job isn't to win benchmarks — it's to run reliably at low power, 24/7, for years.

**One thing to check before buying:** mini PC pricing has been unusually volatile in 2026 because of a broader DDR memory shortage — the same model that cost under $200 earlier this year can run $330+ now depending on stock. Check current pricing before ordering rather than trusting any number in an article (including this one) as fixed.

## What This Configuration Can Actually Run

Mapping directly to the "essential services" list from the beginner guide:

| Service | Purpose | Typical RAM Use |
|---|---|---|
| Homepage or Homarr | Dashboard | ~256MB |
| AdGuard Home | DNS-level ad blocking | ~128MB |
| Vaultwarden | Password manager | ~128MB |
| Immich | Photo management | 1–2GB (more during active photo processing) |
| Jellyfin | Media server | 512MB idle, more during transcoding |
| Uptime Kuma | Monitoring | ~128MB |

Running all six comfortably leaves you with several GB of the 16GB free for a couple of LXC containers or a lightweight VM — enough room to experiment without immediately needing a second node.

## Realistic Power Cost

Here's the actual math, so you can redo it with your own electricity rate rather than trusting a flat number:

```
Watts × 24 hours × 30 days ÷ 1000 = kWh per month
kWh per month × your rate ($/kWh) = monthly cost
```

At a steady 15W average (realistic for this build under light-to-moderate load):

```
15W × 24 × 30 ÷ 1000 = 10.8 kWh/month
```

At $0.15/kWh (a reasonable US average), that's roughly **$1.60/month** — closer to $3–4/month in higher-cost regions ($0.25–0.30/kWh). Either way, it's not a meaningful line item next to what you'd pay for the cloud services this setup replaces.

## When to Upgrade Beyond This

This build is genuinely sufficient long-term for the services listed above. Consider stepping up if you specifically want:

- **A second node for high availability** — at that point, look at two smaller/cheaper units rather than one bigger one.
- **10GbE networking** for fast storage between nodes — this is where something like the Minisforum MS-01 (~$420 barebone) becomes worth the jump, but only if you actually have a use for that bandwidth.
- **Local AI workloads** (running LLMs locally) — different hardware priorities entirely (GPU/NPU matters more than CPU core count here), worth treating as a separate build rather than stretching this one.

For simply running a stable, useful home lab — the kind covered in our beginner guide — this $350 configuration is not a compromise. It's the actual right answer for most people, not just the cheap one.

## FAQ

**Is 16GB RAM really enough, or will I regret not getting 32GB?**
For the service list above, 16GB has real headroom to spare. If you already know you want to run Immich with a large photo library (10,000+ photos) plus several other memory-heavy services simultaneously, size up — but don't pay for 32GB "just in case" if your actual planned services fit comfortably in 16GB.

**Do I need the extra SSD and UPS on day one?**
No. Start with just the mini PC, get comfortable, and add the SSD (for backups) and UPS (for power-loss protection) once you have something running that you'd actually mind losing.

**Why not recommend a specific used enterprise server instead, since they're often cheaper per core?**
Power draw and noise. A used enterprise server often costs less upfront but pulls 150–300W versus 10–40W for a mini PC — the electricity cost difference alone can erase the upfront savings within a year or two, before even counting the noise most people don't want in a home.

---

*New here? Start with the [complete beginner's guide to building a home lab](/posts/best-home-lab-for-beginners-2026/) for the full software stack and 14-day launch plan this hardware is built to run.*
