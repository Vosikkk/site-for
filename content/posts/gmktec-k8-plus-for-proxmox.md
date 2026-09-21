---
title: "GMKtec K8 Plus for Proxmox: Specs, Limits, Who It’s For"
date: 2026-08-17
lastmod: 2026-09-19
description: "Research-backed GMKtec K8 Plus Proxmox analysis: dual 2.5GbE, two NVMe slots, OCuLink, passthrough limits, and what remains unverified."
tags: ["proxmox", "homelab", "hardware", "mini pc"]
ShowToc: true
TocOpen: false
---

> **Evidence note:** This is a research-backed analysis of the GMKtec K8 Plus as a Proxmox host. It combines [GMKtec's system specifications](https://www.gmktec.com/products/gmktec-nucbox-k8-plus-mini-pc-amd-ryzen%E2%84%A2-7-8845hs), [AMD's Ryzen 7 8845HS specifications](https://www.amd.com/en/products/processors/laptop/ryzen/8000-series/amd-ryzen-7-8845hs.html), Proxmox documentation, and attributable owner reports. It is **not** a first-hand RunAHomeLab hardware benchmark. Community reports identify possible failure modes but do not prove that every unit is affected. See the [research methodology](/methodology/).

{{< affiliate-disclosure >}}

## Quick Take

The K8 Plus is a **conditional recommendation** for a Proxmox lab that will use its expansion: dual 2.5GbE, two M.2 storage positions, and OCuLink. If the lab only needs one Ethernet port and one system drive, a simpler mini PC or a used business system may offer better value.

The important distinction is between documented capability and verified behavior. The Ryzen 7 8845HS supports AMD virtualization, but CPU support alone does not guarantee convenient IOMMU grouping, reliable iGPU reset behavior, or compatibility with every OCuLink device.

## What Is Verified

As reviewed on September 19, 2026, GMKtec lists the K8 Plus with a Ryzen 7 8845HS, Radeon 780M graphics, dual 2.5GbE, two M.2 2280 storage positions, OCuLink, two DDR5-5600 SO-DIMM slots with support up to 128GB, and Wi-Fi 6E. Published limits and retailer listings have differed over time, so confirm the exact configuration and supported memory before ordering. AMD documents the 8845HS as an 8-core/16-thread processor with AMD-V and DDR5 support.

Those are platform and system specifications. They do not establish Proxmox throughput, sustained thermals, acoustics, or passthrough reliability on their own.

## Installing Proxmox: What to Check

Run the current Proxmox VE installer and verify the exact hardware before building bridges or passthrough rules:

```bash
lspci -nn
ip -br link
lsblk -o NAME,MODEL,SIZE,TYPE
```

Map each physical Ethernet jack to its Linux interface rather than assuming the firmware or chassis order matches the interface names.

### Secure Boot

Do not disable Secure Boot as a universal first step. Current Proxmox VE supports Secure Boot with its signed boot chain. A third-party or locally built kernel module can still require additional signing or a different Secure Boot decision, so follow the current [Proxmox Secure Boot documentation](https://pve.proxmox.com/pve-docs/chapter-sysadmin.html#sysboot_secure_boot) for the software you actually install.

## IOMMU and Passthrough

Enable the relevant virtualization and IOMMU options in firmware, then confirm what the running kernel detected:

```bash
journalctl -b 0 | grep -Ei 'AMD-Vi|IOMMU'
```

Inspect the real IOMMU groups on the exact BIOS and Proxmox version you are using:

```bash
for d in /sys/kernel/iommu_groups/*/devices/*; do
  n=${d#*/iommu_groups/*}
  n=${n%%/*}
  printf 'IOMMU group %s ' "$n"
  lspci -nns "${d##*/}"
done
```

`amd_iommu=on` is an AMD kernel parameter, not an “Intel-era” option. Do not add or remove kernel parameters by folklore: check the current Proxmox and kernel documentation and first verify whether AMD-Vi already initialized on your installation.

Devices in one IOMMU group normally share an isolation boundary. Passing through an OCuLink-connected device therefore depends on the actual group layout, firmware, device, and VM configuration—not merely on the presence of an OCuLink connector.

## OCuLink: Useful, but Not a Promise

OCuLink exposes PCIe connectivity and can be useful for a dedicated GPU or another compatible PCIe device. It is not a general-purpose hot-plug port. Power the system and attached hardware down before changing the connection unless both vendors explicitly document a safe procedure.

For a Proxmox purchase, treat OCuLink passthrough as a project to validate, not a guaranteed appliance feature. Budget for the dock or adapter, its power supply, and troubleshooting time.

## Dual 2.5GbE

Two physical interfaces can support a router/firewall VM, separated lab networks, or a management/storage split. They do not make a virtualized router automatically resilient: the host, bridge configuration, and VM remain part of the failure domain.

Measure your own network path with a tool such as `iperf3`, using suitable peers and cabling. A 2.5GbE link rate is not the same as an independently verified end-to-end throughput result.

The K8 Plus uses Intel i226-class networking according to the system listing. The related `igc` driver also supports I225-family controllers. A documented I225-V reset-loop report on a different system does **not** prove the K8 Plus i226 controller has the same defect; use the [I225-V investigation](/posts/intel-i225v-proxmox-ve9-reset-loop-verified/) only as a diagnostic pattern if logs show repeated `NETDEV WATCHDOG` or adapter resets.

## Thermals and Noise

The 8845HS can operate across configurable power limits, but RunAHomeLab has not measured K8 Plus temperature, acoustic level, or sustained Proxmox performance. Start with a balanced vendor power profile, monitor the actual host, and change one variable at a time:

```bash
sensors
journalctl -k -b | grep -Ei 'thermal|throttl'
```

Manufacturer fan design and power-profile options are specifications, not proof of bedroom-safe noise or long-term thermal behavior.

## Community Evidence: 8845HS iGPU Passthrough

One K8 Plus owner reported that 8845HS iGPU passthrough could become unreliable after a guest shutdown and that the attempted Radeon reset workarounds were not reliable for their configuration. The report is useful as a buying warning for anyone whose purchase depends on repeatedly switching the iGPU between guests, but it is one configuration—not a population-wide failure rate. Read the [original Proxmox forum report](https://forum.proxmox.com/threads/8845hs-igpu-passthrough.167195/) before deciding whether that use case is acceptable.

## What Remains Unverified by RunAHomeLab

- Proxmox installation behavior on every current BIOS revision
- the exact IOMMU group layout for every attached OCuLink device
- sustained 24/7 temperature and fan behavior
- measured 2.5GbE throughput and packet-loss behavior
- stable iGPU reset across repeated guest start/stop cycles
- long-term failure rates

These unknowns are why the recommendation remains conditional.

## Who It Is For

**Potentially a good fit:**

- you need two physical 2.5GbE interfaces;
- you want two internal M.2 storage positions;
- you have a specific OCuLink experiment and accept validation work;
- you value compactness more than desktop-class expansion.

**Compare another option when:**

- one NIC and one SSD are sufficient;
- low acoustic risk matters more than expansion;
- iGPU passthrough must work predictably after guest restarts;
- a used business PC offers more RAM or storage expansion at the current price.

## Buying Checklist

Before ordering, verify the exact listing's CPU, installed RAM and module count, SSD capacity, seller, warranty, included power supply, and return policy. Prices and bundled configurations change.

### Considering the K8 Plus for Your Proxmox Lab?

If you need dual 2.5GbE, two M.2 storage positions, and OCuLink, check the current configuration, seller, and price before ordering.

**[Check current GMKtec K8 Plus price on Amazon →](https://www.amazon.com/dp/B0DHNTW3H6?tag=minipc-k8-20&utm_source=runahomelab&utm_medium=affiliate&utm_campaign=k8_plus_page&utm_content=buying_checklist_cta)**

The K8 Plus is the expandable candidate in the [best mini PC for Proxmox](/posts/best-mini-pcs-for-proxmox/) guide. It is not automatically the best choice just because its specification list is longer.
