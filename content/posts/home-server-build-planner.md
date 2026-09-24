---
title: "Home Server Build Planner: Reuse, Mini PC, or Used Business PC?"
date: 2026-09-24
lastmod: 2026-09-24
draft: false
description: "Choose a home server build type for Proxmox and self-hosting. Compare reusing a PC, a compact mini PC, and an expandable used business PC with a short workload planner."
tags: ["homelab", "home server", "proxmox", "hardware", "mini pc"]
ShowToc: true
TocOpen: false
---

**The short answer:** Reuse a suitable computer before buying another one. Choose a compact mini PC when space and noise matter and you do not need many full VMs or internal drives. Compare an expandable used business PC when you need more VM headroom, several local drives, a PCIe card, or a flexible upgrade path. Check the exact model and configuration before buying; a chassis category alone cannot guarantee capacity, noise, or compatibility.

This planner is for a Proxmox or self-hosting home server. It helps select a **hardware route**, not a specific product or an exact performance result.

## Reuse vs mini PC vs used business PC

| Route | Good starting point when | Main tradeoff | Verify first |
|---|---|---|---|
| Reuse a computer | You already have a machine that may meet the workload | Its age, efficiency, and upgrade limits vary | RAM ceiling, drive connections, NIC, actual behavior |
| Compact mini PC | You want a small host for services and a few light VMs, with bulk storage elsewhere | Fewer internal bays and expansion options | Exact RAM/SSD limits, ports, cooling, transcoding path |
| Expandable used business PC | You want more full VMs, local drives, or an add-in card | Listing condition, size, noise, and power use vary | Exact form factor, bays, slots, PSU, seller configuration |

These are categories, not ranked products. A used micro PC can have as little drive expansion as a mini PC; choose a **specific small-form-factor or tower model** when internal bays or PCIe space are essential. A low purchase price can also lose its advantage after RAM, drives, and power use are considered.

## Use the home server build planner

{{< affiliate-disclosure >}}

{{< build-planner >}}

## Example decisions

- **Home Assistant, a few containers, and 1–2 light VMs, with files elsewhere:** a compact mini PC may be enough. Try a suitable computer you already own first. Check the exact model's memory limit and backup plan.
- **Jellyfin transcoding and Immich:** either chassis route can work, but no generic mini PC label proves hardware transcoding. Verify the CPU/GPU, codec support, software setup, and simultaneous workload on the exact configuration.
- **Several heavier VMs and multiple local drives:** favor a business PC with documented RAM headroom, bays, and connectors. A tiny used micro PC may fail the same expansion check as a new mini PC.
- **A PC already on your desk:** test it against the chosen workloads before buying. If its specifications are unknown, the planner cannot claim it is sufficient.

## How the recommendations are made

The planner first checks whether you report an existing usable or upgradeable PC. It then favors expandable hardware for several/heavier VMs, multiple internal drives, significant local storage growth, or an upgradeability priority. For lighter setups without those constraints, it considers a compact mini PC. Lowest initial cost triggers a **used-PC comparison**, not a claim that every used listing is cheaper. If compactness conflicts with expansion needs, the result flags the conflict.

RAM outputs are broad **16–32 GB or 32–64 GB planning ranges**, grounded in the site's [beginner build](/posts/best-home-lab-for-beginners-2026/) and [mini-PC guide](/posts/best-mini-pcs-for-proxmox/) rather than measured requirements for every app. Add up the memory you intend to assign to full VMs and check each service's documentation. The planner does not calculate a required disk size: it asks you to separate the host and apps, local data, future growth, and backups. Backups need a separate destination; additional drives in one machine are not a backup.

This is specification-based analysis, not RunAHomeLab hardware testing. Read the [research methodology](/methodology/) for evidence labels and limitations.

## Buying checklist

1. Confirm the exact CPU, RAM slots and supported capacity, drive bays/connectors, NICs, and power supply of the model and configuration you will receive.
2. If you need Jellyfin transcoding, verify the actual hardware acceleration path for your media codecs, host OS, and container or VM setup.
3. If you need multiple internal drives or PCIe, inspect the specific chassis and populated slots. Product-family names are not enough.
4. Price the complete system, including missing RAM, drives, adapters, shipping, and warranty. Used condition and seller configuration matter.
5. Identify a separate backup destination before relying on the server for important data.

## Frequently asked questions

### Is 16 GB enough for a home server?

It can be a starting point for light services and a small VM plan. Several full VMs or concurrent heavier services may push you toward 32 GB or more. Use your guest allocations and real use to decide; the planner's range is not a benchmark.

### Is a mini PC better than a used business PC for Proxmox?

Neither wins universally. A mini PC is compelling when size and noise matter and storage lives elsewhere. A suitable used business PC can give more room to upgrade, but check its exact form factor, condition, power use, and total price. See the [$350 Proxmox build's comparison](/posts/example-350-proxmox-homelab-build/).

### Can this planner confirm Jellyfin transcoding or part compatibility?

No. It flags the checks you need to make for the exact CPU/GPU, codecs, software path, and physical hardware. It does not claim to have tested a product or to be a universal parts compatibility system.

### Should I buy a new server if I already have an old PC?

Try the existing PC first if its specifications and condition fit the workload. Confirm memory, storage connections, network, and actual behavior. Replace it when a specific limit justifies the purchase, rather than because it is older.
