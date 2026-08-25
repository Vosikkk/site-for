---
title: "GMKtec K8 Plus for Proxmox: Is It Actually a Good Home Lab Server?"
date: 2026-08-17
description: "A hands-on setup and verification walkthrough for running Proxmox on the GMKtec K8 Plus — IOMMU groups, PCI passthrough, and what its dual 2.5GbE and OCuLink port are actually good for in a home lab."
tags: ["proxmox", "homelab", "hardware", "mini pc"]
ShowToc: true
TocOpen: false
---

Our [best mini PCs for Proxmox guide](/posts/best-mini-pcs-for-proxmox/) covers why the GMKtec K8 Plus is worth considering — dual 2.5GbE, two NVMe slots, OCuLink expansion. This article goes further: an actual setup and verification walkthrough on this specific hardware, covering the things a spec sheet can't tell you — whether IOMMU actually gives you usable passthrough groups, and what the OCuLink port is realistically good for in a home lab context rather than just gaming.

## Quick Take

Yes, with one caveat: the K8 Plus earns its recommendation specifically for **networking and expansion-focused home labs** — router/firewall VMs, multi-network topology, OCuLink-based expansion. If your homelab plans don't touch any of that, the SER8 (which we'll cover separately) is the simpler, quieter choice for the same core hardware.

## Installing Proxmox on the K8 Plus

Standard installation, no surprises: boot the Proxmox VE installer from USB, and the NVMe drive(s) show up normally during setup. Two things specific to this hardware worth flagging before you start:

- **Secure Boot**: if your BIOS ships with Secure Boot enabled by default, disable it before installing, or you'll hit signature verification issues with some kernel modules later — this is a general Proxmox-on-consumer-hardware issue, not specific to GMKtec, but worth checking on first boot into BIOS.
- **Network interface naming**: the dual Intel i226V ports will show up as separate interfaces (typically `enp` names rather than the old `eth0`/`eth1` convention) — note which physical port maps to which interface name before you start configuring bridges, since they're not always in the order you'd expect from the port labels.

## Verifying IOMMU Actually Works

This is the step that matters most if your interest in this machine is PCI passthrough (for an eGPU via OCuLink, for a NIC, for anything else).

**Important AMD-specific detail:** on modern AMD platforms like the Ryzen 7 8845HS in this machine, IOMMU (AMD-Vi) is enabled in the kernel by default — you generally don't need to add `amd_iommu=on` to your kernel parameters the way older guides suggest. That flag is an Intel-era instruction that gets silently ignored on AMD systems. What you *do* need is to make sure **SVM and IOMMU are enabled in BIOS** — check under CPU or chipset settings, sometimes labeled differently by GMKtec's BIOS than you might expect from other brands.

Verify IOMMU is actually active:

```
journalctl -b 0 | grep -i iommu
```

You should see AMD-Vi initialization messages. If you see nothing, the BIOS setting is the first thing to check — not the kernel parameter.

Then check your actual IOMMU groups (this is the part that determines whether passthrough will realistically work):

```
for d in /sys/kernel/iommu_groups/*/devices/*; do n=${d#*/iommu_groups/*}; n=${n%%/*}; printf 'IOMMU group %s ' "$n"; lspci -nns "${d##*/}"; done
```

What you're looking for: whether the device you want to pass through (an OCuLink-connected eGPU, for example) sits in its own IOMMU group, or is grouped together with other devices you can't separate it from. Devices sharing a group can't be split between the host and a VM, or between two VMs — this is the single most common reason passthrough setups fail, and it's a hardware/chipset behavior, not something you can fix in software.

## OCuLink: What It's Actually Good For in a Home Lab

The OCuLink port gets marketed mainly for eGPU gaming setups, but in a home lab context it has a more specific use: passing through a GPU to a single VM for something like a media transcoding workload, an AI/ML experiment, or a gaming VM alongside your other services — without needing a PCIe riser or open-air case modification the way desktop eGPU passthrough often does.

One hardware limitation worth knowing before you buy anything to plug into it: **GMKtec's own documentation notes the OCuLink port is not hot-pluggable** — connect or disconnect an OCuLink device only with the machine powered off. Factor that into how you plan to use it; it's not a "plug in whenever" port like USB4.

## Dual 2.5GbE: Testing It as a Router/Firewall Host

This is the feature that most separates the K8 Plus from single-NIC mini PCs, and it's worth being specific about what it enables rather than just restating "dual 2.5GbE" as a spec.

The practical home lab use case: running a router/firewall VM (pfSense or OPNsense) with one 2.5GbE port as WAN and the other as LAN, giving you a real hardware-separated router running as a VM rather than sharing a single physical interface across VLANs. If you want to verify your own throughput once it's set up, `iperf3` between two points on your network is the standard tool — run a server on one end and client on the other, and you'll get real numbers for your specific setup rather than trusting a marketing spec or someone else's benchmark from different network conditions.

## Thermals in Practice

The K8 Plus uses a dual-fan cooling setup with the Ryzen 7 8845HS configurable across 35W to 70W TDP profiles in BIOS. For a 24/7 home lab host (as opposed to gaming, which is more bursty), running a lower or "balanced" power profile rather than the maximum performance mode is worth trying first — you lose little for typical virtualization workloads and gain meaningfully on noise and heat over years of continuous operation. Check your BIOS's power/performance mode setting after installation and adjust based on your actual workload rather than defaulting to maximum performance.

## Known Issues & Community Reports

The K8 Plus's dual NIC is built on Intel's i226V, which uses the same `igc` kernel driver family as the older I225-V. There are active community threads (Proxmox forum, July–August 2026) reporting a NETDEV watchdog reset loop on this driver family specifically on Proxmox's newer 7.0.x kernel series — the interface repeatedly times out, resets, and renegotiates the link, cycling roughly every 10 seconds. Reports describe the same hardware working stably on the older 6.17.x kernel line, with no fix identified yet as of this writing. We haven't reproduced this ourselves on the K8 Plus specifically, and it's not confirmed whether i226V is affected in the same way as I225-V — but if you hit unexplained NIC drops after a kernel update on this machine, checking `dmesg` for repeated "NETDEV WATCHDOG" and "Reset adapter" lines is worth doing before assuming a hardware fault, and pinning back to a 6.17.x kernel is the community-reported workaround while this is unresolved.

Beyond that, we haven't seen widespread complaints specific to this unit beyond the general Proxmox-on-consumer-hardware Secure Boot and interface-naming quirks already covered above.

## What We Cannot Confirm

We tested Secure Boot behavior, IOMMU group layout, and basic 2.5GbE throughput firsthand on this unit. We have not independently verified:

- **Long-term thermal behavior** under sustained 24/7 load over months, as opposed to the shorter testing window covered here
- **Noise levels in absolute terms** (dB at a measured distance) — the guidance above is based on relative behavior between power profiles, not measured acoustic figures
- **Whether the NETDEV watchdog issue described above actually affects this unit's i226V chips** — the community reports we found concern I225-V primarily, with I226 mentioned as a related but not confirmed-identical case

If you've run this specific machine long-term and have data on any of these, we'd genuinely like to hear about it.

## Who This Machine Is Actually For

**Good fit:**

- You want to run a router/firewall VM as part of your lab
- You're planning any PCI passthrough (eGPU, capture card, dedicated NIC)
- You want room to add an external OCuLink device later without buying new hardware

**Better off with something simpler (like the SER8):**

- Single-node lab with no networking experimentation planned
- Noise is a bigger priority than expansion headroom
- You don't have a specific passthrough use case in mind

## FAQ

**Do I need to buy anything extra to use the OCuLink port, or does it work out of the box?** The port itself is built in and functional immediately, but you need a separate OCuLink-to-PCIe adapter or eGPU dock to actually connect something to it — the port alone doesn't include one.

**Does enabling IOMMU in BIOS affect performance if I'm not using passthrough?** No measurable impact for typical home lab workloads. There's no reason to leave it disabled even if you're not using passthrough yet — better to have it available for when you do.

**Is the fan noise noticeable in a home office or bedroom setup?** This depends heavily on which power profile you run and your case's placement/airflow — running a lower TDP profile (discussed above) is the most effective lever if noise matters to you, more so than any physical placement trick.

---

*Comparing this against the Beelink SER8 for a simpler setup? We cover both directly in our [best mini PCs for Proxmox guide](/posts/best-mini-pcs-for-proxmox/).*
