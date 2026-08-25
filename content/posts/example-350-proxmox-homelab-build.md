---
title: "A $350 Proxmox Home Lab: Example Build Based on Current Pricing (2026)"
date: 2026-08-14
description: "A concrete example of what a ~$350 Proxmox home lab can look like in 2026 — a practical base system, optional upgrades, what it can run, and realistic power costs."
tags: ["homelab", "proxmox", "mini pc", "hardware"]
ShowToc: true
TocOpen: false
---

> **A note on how to read this guide:** this is a reference configuration built from current, real pricing and specs — not a log of one specific unit we personally ran for months. Think of it as "here's exactly what your money buys right now," which is often more useful than a single person's anecdotal experience, since hardware pricing shifts fast enough that a build log from six months ago can already be stale.

> **Affiliate Disclosure:** This site is a participant in the Amazon Services LLC Associates Program. Some links below are affiliate links — if you buy through them, we may earn a small commission at no extra cost to you. This doesn't affect which products are recommended.

If you read our [beginner's homelab guide](/posts/best-home-lab-for-beginners-2026/), you know the $300–400 range is a useful target for a first serious home lab. Here's what that can look like as a practical single-node configuration.

If you want to compare this with other hardware first, see our [best mini PCs for Proxmox](/posts/best-mini-pcs-for-proxmox/).

## The Build

| Component | Pick | Approx. Price |
|---|---|---|
| Mini PC | [Beelink MINI S13 (Intel N150, 16GB RAM, 500GB SSD)](https://www.amazon.com/Beelink-U59-PRO-Processor-Ethernet/dp/B0B99VKSPQ?dib=eyJ2IjoiMSJ9.nbcYIiAlTXIPh-SkvpIEwy_YKhTlCn_5kwStn1LGDoFMpgEqwZGKb0zjB4iTMVkqQv2UVPXx6lU9jbD6dmh6cEoL1UfnhoX6yDycaEfjZUJRXxu4PiQr2R33hec6iFsUioLB0rCT0KLyM3YNFZ9kRQKf7xbKFyc4wDxSPHThkYaAVWKznRFf-F30iP2hjCjPu7iZcEXigzNGoMwlcvYjGNJZrNFhrNp1N-1NUqQ_fwc.UNNDyhgUG9kLmgRc5ObF8LX_HdOE00wM5bn_gMRO4fM&dib_tag=se&keywords=Beelink%2BMINI%2BS13%2BN150%2B16GB%2B500GB&qid=1787645288&sr=8-1&th=1&linkCode=ll2&tag=runahomelab-20&linkId=566c4238f3a2950a1b388e0abebccf89&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) | $279–399 (check current price) |
| Backup storage | External USB drive for Proxmox backups (optional) | Buy based on current $/TB |
| Network switch | [TP-Link TL-SG105 5-Port Gigabit Switch](https://www.amazon.com/Ethernet-Splitter-Optimization-Unmanaged-TL-SG105/dp/B00A128S24?dib=eyJ2IjoiMSJ9.QcPtR5PeeEuoDdmz77m7orAvJqm-ff_ioJZyt8ezplnUhh4T6BpAGOHSN42hg3qI83Az2kRak1VBSl-98qv_HcYEaJzruB2l9JWwQ3fneGoeYvcziOltszyY5dbqBuy2m4NUZ3HdH5Nsi_lepHX_1ioD2wAmG6RT4h1eohOl6DHOEf1GyVu1IgwDYvtTX_BLtKPwRiV3PWP5hzPyKBzBi93Mw1ezB2zF7atPHg-r8bM.yh_0x7V0WDQAKQ-Fwe03632qkzIVtzOvO6cNxeiHVTU&dib_tag=se&keywords=TP-Link%2BTL-SG105&qid=1787645384&sr=8-1&th=1&linkCode=ll2&tag=runahomelab-20&linkId=dd57a324328014d0f9b54c693eb58d16&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) | ~$12–25 |
| UPS | [CyberPower ST425 (425VA / 260W)](https://www.amazon.com/CyberPower-ST425-Standby-Outlets-Compact/dp/B07GZR981Y?th=1&linkCode=ll2&tag=runahomelab-20&linkId=55280254b5a41f8e560103662179500e&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) (optional) | Check current price |

**Budget note:** treat ~$350 as the target for the base Proxmox host, not the fully accessorized setup. Backup storage, the network switch, and the UPS are optional upgrades and are not included in the headline budget. Mini-PC pricing and bundles change frequently, so check the current listing before ordering.

The mini PC alone gets you a fully working single-node Proxmox host. Add the switch only if your network setup needs it, external backup storage once you have data worth protecting, and a UPS when clean shutdowns during power loss matter to you.

### Why This Specific Mini PC?

The Intel N150 is a low-power processor, and the 16GB RAM / 500GB SSD configuration gives you enough headroom for the services below without paying for hardware you may not use.

The MINI S13 isn't a performance monster, and that's not the point. A first home lab needs enough CPU and memory for several always-on services while keeping power consumption, noise, and upfront cost low.

The included 500GB storage is enough to get started with Proxmox, a handful of containers, and a lightweight VM or two. As the lab becomes something you actually depend on, that's when separate backup storage starts making sense.

It won't win benchmarks, but a home lab's job isn't to win benchmarks — it's to run useful services reliably at low power, 24/7.

**One thing to check before buying:** mini PC prices and bundled RAM/storage configurations move around frequently. Check the current price and exact configuration before ordering rather than treating any price in an article — including this one — as fixed.

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

Running all six still leaves room within the 16GB for additional LXC containers or a lightweight VM.

That doesn't mean every workload will fit forever. Immich processing, Jellyfin transcoding, larger databases, and additional VMs can all increase resource use. But for a first Proxmox node focused on self-hosted services, 16GB gives you enough room to learn what you actually need before spending more money.

That's important for a budget build: **upgrade because you've found a real limitation, not because a spec sheet says 32GB looks better than 16GB.**

## Do You Need the Optional Hardware?

Not immediately.

### Network Switch

If your router already has enough free Ethernet ports, you don't need another switch just to start a home lab.

Once you begin adding more wired devices, another mini PC, a NAS, or other lab hardware, a simple unmanaged switch becomes useful. The [TP-Link TL-SG105 5-Port Gigabit Switch](https://www.amazon.com/Ethernet-Splitter-Optimization-Unmanaged-TL-SG105/dp/B00A128S24?dib=eyJ2IjoiMSJ9.QcPtR5PeeEuoDdmz77m7orAvJqm-ff_ioJZyt8ezplnUhh4T6BpAGOHSN42hg3qI83Az2kRak1VBSl-98qv_HcYEaJzruB2l9JWwQ3fneGoeYvcziOltszyY5dbqBuy2m4NUZ3HdH5Nsi_lepHX_1ioD2wAmG6RT4h1eohOl6DHOEf1GyVu1IgwDYvtTX_BLtKPwRiV3PWP5hzPyKBzBi93Mw1ezB2zF7atPHg-r8bM.yh_0x7V0WDQAKQ-Fwe03632qkzIVtzOvO6cNxeiHVTU&dib_tag=se&keywords=TP-Link%2BTL-SG105&qid=1787645384&sr=8-1&th=1&linkCode=ll2&tag=runahomelab-20&linkId=dd57a324328014d0f9b54c693eb58d16&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) is enough for that job without turning networking into another project.

### Backup Storage

Don't buy an expensive SSD just because it's listed as part of somebody else's "ideal" home lab.

Start with the included storage. Once you have VMs, containers, configuration, or data you'd actually mind losing, add an external USB drive and use it as a backup target.

For backup storage, capacity and reliability matter more than buying the fastest portable SSD available. Prices also move enough that it makes more sense to compare current cost per terabyte when you're ready to buy.

And remember: adding another drive is only useful as a backup if you actually configure and test your backups.

### UPS

A UPS is another upgrade that becomes more valuable once the machine is doing something you care about.

The [CyberPower ST425](https://www.amazon.com/CyberPower-ST425-Standby-Outlets-Compact/dp/B07GZR981Y?th=1&linkCode=ll2&tag=runahomelab-20&linkId=55280254b5a41f8e560103662179500e&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) is a 425VA / 260W standby UPS, which gives a low-power mini-PC setup plenty of capacity without jumping to a much larger 1000–1500VA unit.

The goal here isn't to run your home lab for hours during an outage. It's to handle short interruptions and give important systems a chance to shut down cleanly.

## Realistic Power Cost

Here's the math so you can redo it with your own electricity rate rather than trusting a flat number:

```
Watts × 24 hours × 30 days ÷ 1000 = kWh per month
kWh per month × your rate ($/kWh) = monthly cost
```

At a steady 15W average:

```
15W × 24 × 30 ÷ 1000 = 10.8 kWh/month
```

At $0.15/kWh:

```
10.8 × $0.15 = $1.62/month
```

So you're looking at roughly **$1.60/month** at that assumed load and electricity rate.

At $0.25/kWh, the same 15W average works out to about **$2.70/month**. At $0.30/kWh, it's about **$3.24/month**.

Actual consumption depends on workload, connected storage, peripherals, and power-management behavior, so treat 15W as a working example rather than a guarantee for every MINI S13 setup.

Either way, the operating cost of a low-power mini PC is one of the strongest arguments for using this class of hardware instead of an old enterprise server for a first home lab.

## When to Upgrade Beyond This

This build is genuinely sufficient for the services listed above. Consider stepping up when you have a specific reason:

- **A second node for high availability** — at that point, two smaller units may make more sense than replacing the first machine with one much larger system.
- **10GbE networking** for fast storage between nodes — this is where something like the Minisforum MS-01 becomes worth considering, but only if you actually have a use for that bandwidth.
- **More VMs or memory-heavy services** — if 16GB becomes a measured limitation rather than a theoretical one, move to hardware with more RAM capacity.
- **Local AI workloads** — running LLMs locally changes the hardware priorities substantially. GPU/NPU capability and memory bandwidth start to matter much more, so it's better treated as a different build rather than stretching this one.

For simply running a stable, useful home lab — the kind covered in our beginner guide — this ~$350-class base configuration isn't just a compromise made to hit a low price.

For a lot of people, it's enough.

## FAQ

**Is 16GB RAM really enough, or will I regret not getting 32GB?**

For the service list above, 16GB gives you useful headroom. If you already know you want to run Immich with a large photo library alongside several other memory-heavy services and VMs, more RAM can make sense.

But don't pay for 32GB "just in case" when your actual planned services fit comfortably inside 16GB. Start with the workload, not the number on the spec sheet.

**Do I need backup storage and a UPS on day one?**

No. Start with the mini PC and get comfortable with Proxmox first.

Add an external USB drive for backups once you have VMs, containers, configuration, or data you'd actually mind losing. Add the [CyberPower ST425](https://www.amazon.com/CyberPower-ST425-Standby-Outlets-Compact/dp/B07GZR981Y?th=1&linkCode=ll2&tag=runahomelab-20&linkId=55280254b5a41f8e560103662179500e&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) when clean shutdowns during power loss become important.

**Does the network switch count toward the $350 build?**

No. The headline budget refers to the base Proxmox host. The switch, backup storage, and UPS are optional additions.

If your router already has a free Ethernet port, you can install Proxmox and start using the lab without buying a switch at all.

**Why not recommend a specific used enterprise server instead, since they're often cheaper per core?**

Power draw, noise, size, and complexity.

Used enterprise hardware can offer excellent compute value, but that doesn't automatically make it a better first home lab. A small, low-power machine is easier to leave running continuously, easier to place in a home, and lets you learn Proxmox and self-hosting before deciding whether you actually need enterprise-class hardware.

---

*New here? Start with the [complete beginner's guide to building a home lab](/posts/best-home-lab-for-beginners-2026/) for the full software stack and 14-day launch plan this hardware is built to run.*
