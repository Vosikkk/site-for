---
title: "What Can a $350 Proxmox Home Lab Actually Run? (2026)"
date: 2026-08-14
lastmod: 2026-09-20
description: "Is 16GB enough for Proxmox? See what a $350 N150 home lab can run, its real bottlenecks, and when a used business PC is the better buy."
tags: ["homelab", "proxmox", "mini pc", "hardware"]
ShowToc: true
TocOpen: false
---

> **How this guide was built:** this is a reference configuration based on current specifications, pricing, and reports from people running similar systems. It is not presented as a long-term benchmark of a machine we personally tested. After publishing the first version, we [asked the r/homelab community](https://www.reddit.com/r/homelab/comments/1wg2grg/what_can_a_350_proxmox_homelab_realistically_run/) what this build could realistically handle and where it would fail first. This update incorporates the useful patterns from that discussion while keeping individual reports clearly labeled as anecdotal.

{{< affiliate-disclosure >}}

## The Short Answer

**A 16GB Intel N150 mini PC can run a useful Proxmox home lab.** It is a realistic starting point for lightweight LXC containers, a small number of VMs, and services such as AdGuard Home, Vaultwarden, Uptime Kuma, Home Assistant, Jellyfin, and Immich.

But that does not automatically make every N150 mini PC a good **$350 purchase**.

The community feedback exposed a more important buying question:

> Are you paying for a compact, quiet, low-power new machine — or do you want the most performance and expansion for the money?

At the same budget, a used Dell OptiPlex, HP EliteDesk/ProDesk, or Lenovo ThinkCentre can often offer a faster CPU, more memory capacity, and more storage options. The tradeoff is a larger chassis, potentially higher power use, used hardware, and more variation between listings.

So the honest verdict is:

- **16GB is enough to start.**
- **500GB may become the first limit if you store photos or media locally.**
- **Immich imports, Jellyfin transcoding, and multiple full VMs are the workloads most likely to expose the CPU or memory limit.**
- **At close to $350, compare the N150 mini PC with a used business PC before buying.**

## The Reference Build

| Component | Pick | Approx. Price |
|---|---|---|
| Mini PC | [Beelink MINI S13: Intel N150, 16GB DDR4 RAM, 500GB SSD](https://www.amazon.com/dp/B09LC9JWVQ?tag=build350-n150-20). This link is pinned to ASIN `B09LC9JWVQ`, reviewed September 20, 2026. Verify the selected configuration, seller, warranty, and current price before ordering. | Check the exact listing; compare used alternatives near $350 |
| Backup storage | External USB drive for Proxmox backups (optional) | Buy based on current $/TB |
| Network switch | [TP-Link TL-SG105 5-Port Gigabit Switch](https://www.amazon.com/Ethernet-Splitter-Optimization-Unmanaged-TL-SG105/dp/B00A128S24?dib=eyJ2IjoiMSJ9.QcPtR5PeeEuoDdmz77m7orAvJqm-ff_ioJZyt8ezplnUhh4T6BpAGOHSN42hg3qI83Az2kRak1VBSl-98qv_HcYEaJzruB2l9JWwQ3fneGoeYvcziOltszyY5dbqBuy2m4NUZ3HdH5Nsi_lepHX_1ioD2wAmG6RT4h1eohOl6DHOEf1GyVu1IgwDYvtTX_BLtKPwRiV3PWP5hzPyKBzBi93Mw1ezB2zF7atPHg-r8bM.yh_0x7V0WDQAKQ-Fwe03632qkzIVtzOvO6cNxeiHVTU&dib_tag=se&keywords=TP-Link%2BTL-SG105&qid=1787645384&sr=8-1&th=1&linkCode=ll2&tag=build350-switch-20&linkId=dd57a324328014d0f9b54c693eb58d16&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) | Check current price |
| UPS | [CyberPower ST425 (425VA / 260W)](https://www.amazon.com/CyberPower-ST425-Standby-Outlets-Compact/dp/B07GZR981Y?th=1&linkCode=ll2&tag=build350-ups-20&linkId=55280254b5a41f8e560103662179500e&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) (optional) | Check current price |

Treat ~$350 as the target for the **base Proxmox host**, not the host plus every accessory. The switch, backup drive, and UPS are optional additions.

Mini-PC prices change frequently. The N150 configuration becomes much easier to recommend when it is discounted; near the top of the range, used business hardware deserves a serious comparison.

## What Can It Realistically Run?

This is a sensible starting stack:

| Service | Likely fit on 16GB? | What changes the load? |
|---|---|---|
| AdGuard Home or Pi-hole | Easy | Query volume and logging |
| Vaultwarden | Easy | Number of users and attachments |
| Homepage or Homarr | Easy | Number of integrations |
| Uptime Kuma | Easy | Number and frequency of checks |
| Home Assistant | Usually comfortable | Add-ons, history, and integrations |
| Jellyfin | Comfortable at idle | Transcoding and concurrent streams |
| Immich | Comfortable after setup | Initial import, thumbnail generation, and machine-learning jobs |
| Small Linux VM | Yes | Assigned RAM and background services |
| Several full VMs | Possible, but this is where 16GB gets tight | Guest OS overhead and simultaneous activity |

The distinction between **LXC containers and full VMs** matters. Lightweight containers share the host kernel and normally require fewer resources. Multiple VMs each need their own reserved memory and operating system, so the same 16GB disappears much faster.

{{< homelab-checker >}}

### What Similar Systems Are Running

The Reddit discussion included several useful real-world reports:

- One person with a nearly identical N150/16GB/512GB system reported running AdGuard in LXC, Home Assistant in a VM, and an Ubuntu VM hosting Jellyfin, Paperless-ngx, an \*arr stack, backups, and a reverse proxy. Their system was using about 15GB of RAM.
- Another person reported running multiple services including Immich, Jellyfin, Forgejo, n8n, UniFi, Audiobookshelf, and Uptime Kuma with roughly 5GB in use on one node.
- An older 8GB Mac mini reportedly handled around ten lightweight LXC containers.
- An N150 system with 32GB reportedly used about 18GB while running the listed services plus Plex, Home Assistant, backup and sync tools.

These are **individual configurations, not controlled benchmarks**. They show that the proposed stack is plausible, but they also show how much deployment choices, workload, storage, and VM allocation affect the result.

## What Will You Outgrow First?

There is no single answer for every home lab, but the comments revealed four recurring limits.

### 1. Storage Capacity

For Jellyfin or Immich, the included 500GB SSD may fill before the CPU or RAM becomes unusable.

A few TV seasons, a photo library, VM disks, snapshots, and local backups can consume hundreds of gigabytes quickly. If media and photos are part of the plan, assume that you will eventually need a NAS, external storage, or a host with room for additional drives.

Do not keep the only backup on the same SSD as the original data.

### 2. Short Bursts of CPU and RAM Use

Idle dashboards and DNS services are not the challenge. The peaks are:

- importing a large Immich library;
- generating thumbnails and running Immich machine-learning jobs;
- transcoding media in Jellyfin;
- starting several VMs simultaneously;
- running databases, game servers, or build jobs alongside the basic stack.

The Intel N150 has four cores and four threads. Intel lists a 3.6GHz maximum turbo frequency and an official 16GB maximum memory size in its [N-series comparison](https://www.intel.com/content/www/us/en/support/articles/000100305/processors.html). Some owners report using 32GB successfully on N100/N150 systems, but that depends on the specific mini PC and is not the same as an official platform guarantee.

### 3. Full VMs Instead of LXC Containers

If the goal is primarily self-hosted Linux services, LXC lets 16GB go a long way.

If the goal is a Windows lab, Active Directory environment, Kubernetes cluster made from VMs, or several isolated operating systems, prioritize a platform with more memory capacity. In that case, 32GB is not an unnecessary luxury; it is part of the workload requirement.

### 4. Upgradeability

Many N-series mini PCs have one memory slot and limited internal storage expansion. A used small-form-factor business PC may provide two or four RAM slots, multiple NVMe or SATA options, and a replaceable CPU depending on the model.

That difference may not matter on day one. It matters when the cheapest upgrade is otherwise buying another computer.

## New N150 Mini PC vs Used Business PC

| Priority | New N150 mini PC | Used Dell/HP/Lenovo business PC |
|---|---|---|
| Size and noise | Usually better | Larger; varies by model |
| Idle power | Usually lower | Often higher, but model-dependent |
| Warranty and predictable condition | Better | Depends on seller and age |
| CPU performance per dollar | Limited near $350 | Often better |
| RAM expansion | Often limited | Usually better |
| Internal storage expansion | Often limited | Usually better |
| Hardware consistency | Easy to buy the same configuration | Listings and configurations vary |
| Best use | Quiet, compact, always-on services | VMs, experimentation, expansion, value |

### Choose the N150 Mini PC If

- you want a compact and quiet machine;
- low idle power matters because it will run 24/7;
- your planned workload is mostly LXC containers and one or two small VMs;
- media lives on separate storage;
- the mini PC is available at a price that makes sense against used alternatives.

### Choose a Used Business PC If

- you want the most CPU performance for the budget;
- you expect to add RAM or storage;
- you plan to run several full VMs;
- you are comfortable checking the exact CPU, memory slots, drive bays, NIC, power adapter, and seller condition;
- size and a modest increase in idle power are acceptable.

The comparison should be against a **used office PC**, not necessarily an old rack server. A rack server may be cheap to buy but expensive to power, loud, large, and unnecessary for a first node.

For a decision based on your own services, VM load, and storage expansion needs, use the [home server build planner](/posts/home-server-build-planner/) before choosing a hardware route.

## Is 16GB Enough, or Should You Buy 32GB?

Start with 16GB when your plan is mainly:

- DNS and network utilities;
- dashboards and monitoring;
- Vaultwarden;
- Home Assistant;
- a modest Jellyfin or Immich deployment;
- several lightweight Linux containers;
- one or two small VMs.

Prefer 32GB or an upgradeable platform when your plan includes:

- several full VMs;
- Windows Server or an Active Directory lab;
- Kubernetes nodes as separate VMs;
- large Immich imports alongside other active services;
- databases, game servers, or CI workloads;
- ZFS and storage-heavy experimentation;
- no clear idea what you will add next, but you know you want room to experiment.

The right rule is still: **upgrade because the workload requires it, not because a larger number looks safer.** But if the machine cannot be upgraded later, that limitation should be part of the buying decision now.

## Do You Need the Optional Hardware?

### Network Switch

If your router has a free Ethernet port, you do not need another switch just to start.

Once you add a NAS, another node, or more wired devices, a basic unmanaged switch such as the [TP-Link TL-SG105](https://www.amazon.com/Ethernet-Splitter-Optimization-Unmanaged-TL-SG105/dp/B00A128S24?dib=eyJ2IjoiMSJ9.QcPtR5PeeEuoDdmz77m7orAvJqm-ff_ioJZyt8ezplnUhh4T6BpAGOHSN42hg3qI83Az2kRak1VBSl-98qv_HcYEaJzruB2l9JWwQ3fneGoeYvcziOltszyY5dbqBuy2m4NUZ3HdH5Nsi_lepHX_1ioD2wAmG6RT4h1eohOl6DHOEf1GyVu1IgwDYvtTX_BLtKPwRiV3PWP5hzPyKBzBi93Mw1ezB2zF7atPHg-r8bM.yh_0x7V0WDQAKQ-Fwe03632qkzIVtzOvO6cNxeiHVTU&dib_tag=se&keywords=TP-Link%2BTL-SG105&qid=1787645384&sr=8-1&th=1&linkCode=ll2&tag=build350-switch-20&linkId=dd57a324328014d0f9b54c693eb58d16&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) is enough for a simple gigabit network.

### Backup Storage

Start with the included storage for learning, but add a separate backup target once the host contains configuration or data you would mind losing.

Capacity and reliability matter more than buying the fastest portable SSD. More importantly, configure the backup job and test a restore. An unused backup drive is not a backup strategy.

### UPS

A UPS becomes valuable when the machine runs something you depend on. The [CyberPower ST425](https://www.amazon.com/CyberPower-ST425-Standby-Outlets-Compact/dp/B07GZR981Y?th=1&linkCode=ll2&tag=build350-ups-20&linkId=55280254b5a41f8e560103662179500e&language=en_US&gaOptInStatus=true&ref_=as_li_ss_tl) is a 425VA/260W standby unit intended for basic battery backup and surge protection on a small low-power setup.

The goal is not hours of runtime. It is short ride-through during brief interruptions. The ST425 product documentation does not list the host communication interface needed to coordinate an automatic Proxmox shutdown; if that is a requirement, choose an exact UPS model with supported USB or network communication and verify compatibility before buying.

## Realistic Power Cost

Use this formula with your own measured wattage and electricity rate:

```text
Watts × 24 hours × 30 days ÷ 1000 = kWh per month
kWh per month × electricity rate = monthly cost
```

At a **15W measured average**, the example is:

```text
15W × 24 × 30 ÷ 1000 = 10.8 kWh/month
```

That costs approximately:

- $1.62/month at $0.15/kWh;
- $2.70/month at $0.25/kWh;
- $3.24/month at $0.30/kWh.

The 15W figure is an example, not a promise for every N150 system. Drives, USB devices, memory, networking, BIOS settings, and workload all change consumption. Measure the complete system at the wall if operating cost is part of your purchase decision.

## Final Verdict

A 16GB N150 mini PC can absolutely be a useful first Proxmox server. The proposed services are realistic, especially when lightweight applications run in LXC containers and media is stored elsewhere.

But **“can it run the stack?” and “is it the best use of $350?” are different questions.**

Buy the N150 system for its compact size, low power use, quiet operation, and simplicity. Buy a used business PC when performance per dollar, memory capacity, storage expansion, and running more VMs matter more.

The Reddit discussion did not invalidate the build. It revealed the condition under which it makes sense:

> The N150 is a good small server when you value efficiency and buy it at the right price. It is not automatically the best-value Proxmox host just because it fits the budget.

## FAQ

### Can 16GB run Proxmox, Jellyfin, and Immich together?

Yes, especially when the rest of the stack uses lightweight containers. The difficult moments are large Immich imports and Jellyfin transcoding, not simply having both services installed. Storage capacity and the number of simultaneous users also matter.

### Will 500GB be enough?

It is enough for Proxmox, containers, and a few small VMs. It is not much space for a growing photo or media library. Plan separate storage if Immich or Jellyfin is a central part of the lab.

### Is a used OptiPlex or EliteDesk better than an N150 mini PC?

It can be better value, particularly near a $350 budget, because it may offer a stronger CPU and more upgrade options. The N150 system usually wins on size, simplicity, and power efficiency. Compare exact models rather than buying by category alone.

### Do I need 32GB immediately?

Not for the lightweight starter stack. Choose 32GB when you already plan several VMs, memory-heavy services, or a lab designed for experimentation. Also check whether the specific mini PC officially supports the upgrade.

### Does the switch, backup drive, or UPS count toward the $350?

No. The headline budget refers to the base Proxmox host. If your router has a free Ethernet port, you can start without a separate switch. Add backup storage and a UPS as the system becomes valuable to you.

---

*New here? Start with the [complete beginner's guide to building a home lab](/posts/best-home-lab-for-beginners-2026/) for the full software stack and 14-day launch plan.*

*Compare more hardware in [best mini PCs for Proxmox](/posts/best-mini-pcs-for-proxmox/). If your node is already running, continue with the [no valid subscription fix](/posts/proxmox-no-valid-subscription-fix/) and [Proxmox guest agent guide](/posts/proxmox-guest-agent-not-running-fix/).*
