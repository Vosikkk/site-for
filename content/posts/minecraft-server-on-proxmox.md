---
title: "Minecraft Server on Proxmox: LXC vs VM, Sizing, Backups"
date: 2026-08-16
lastmod: 2026-09-19
draft: false
description: "Plan a Minecraft server on Proxmox without fake player-count promises: LXC vs VM, starting resources, Paper, Bedrock, isolation, and real backups."
tags: ["minecraft", "proxmox", "homelab", "self-hosting"]
ShowToc: true
TocOpen: false
---

Minecraft can run well in a Proxmox lab, but there is no honest universal answer to “how many players?” Server version, world generation, simulation distance, plugins, mods, CPU single-thread performance, storage latency, and simultaneous host workloads all matter.

> **Evidence note:** This guide uses upstream project documentation and conservative planning estimates. RunAHomeLab has not benchmarked a fixed Minecraft workload across the hardware discussed here. Treat resource allocations as starting points and measure your own server. See the [research methodology](/methodology/).

## LXC or VM?

An unprivileged LXC can be a resource-efficient home for a Java server when you are comfortable with Linux containers and their shared host kernel. A VM gives a stronger virtualization boundary and a complete guest kernel, at the cost of more memory and storage overhead.

Choose based on the operational need:

| Situation | Usually the simpler starting point |
|---|---|
| Small Java server administered by the host owner | Unprivileged LXC or VM |
| Untrusted users receive administrative access | VM with restricted Proxmox/network access |
| Modpack or installer assumes a full OS | VM |
| Bedrock Dedicated Server | LXC can work, but a VM may reduce container-specific troubleshooting |
| Lowest guest overhead is the priority | LXC |

Neither option is automatically secure. An LXC shares the host kernel; a VM still needs patching, firewalling, credential controls, and safe Proxmox permissions.

## Starting Resource Plan

Use these as initial allocations, then observe tick time, CPU saturation, garbage collection, memory use, and disk latency:

| Workload | vCPU | Guest RAM | Storage |
|---|---:|---:|---:|
| Small vanilla/Paper Java server | 2–4 | 4–6 GB | 20 GB+ |
| Light plugins or a larger active world | 4 | 6–8 GB | 30 GB+ |
| Modded pack | 4+ | 8–16 GB | 40 GB+ |

Do not assign every host core or all physical RAM to one guest. Proxmox and the other workloads need headroom, and Minecraft often depends more on the performance of busy threads than on a large nominal core count.

There is intentionally no “20+ players” promise here. Test the real Minecraft version, view/simulation distance, plugins, world, and player behavior you expect.

## Java Edition

For a new Java server:

1. Create an unprivileged Linux LXC or a Linux VM.
2. Install the Java version required by the specific Minecraft/Paper release.
3. Download the server from the official project source.
4. Accept the EULA only after reading it.
5. Set a JVM memory ceiling below the guest's total RAM so the OS and management process retain headroom.
6. Bind the service only to the intended interface and open only the ports you need.

Paper can offer performance and configuration options beyond the vanilla server, but it is not a guarantee that slow hardware will meet a chosen player count. Follow the current [Paper documentation](https://docs.papermc.io/paper/getting-started/) rather than copying old JVM flags from an undated forum post.

## Bedrock Edition

Microsoft distributes the [Bedrock Dedicated Server](https://www.minecraft.net/en-us/download/server/bedrock) separately from the Java server. It uses different software and network defaults. Keep the Java and Bedrock instructions separate, and verify the current supported operating system and port requirements in the official download documentation.

## Management Panel

If you want a web UI, multi-server management, file editing, and scheduled server-side backups, [Crafty Controller on Proxmox](/posts/crafty-controller-proxmox-lxc/) is one option. A panel adds convenience and another component to patch; it does not replace a backup target or host security.

## Backups: Preserve the World Outside the Guest

Use the Minecraft server's own save/flush controls or stop the service before copying a world when consistency matters. Keep at least one copy outside the VM/LXC and outside the Proxmox node.

A Proxmox snapshot is useful for short-term rollback. It is not an independent backup when it lives on the same storage and host as the original. A practical plan combines:

- application-aware world backups;
- Proxmox backup jobs to separate storage;
- at least one off-node or offline copy for important worlds;
- periodic restore tests.

## QEMU Guest Agent

If you choose a VM, QEMU Guest Agent is useful for guest information and supported management/backup coordination, but a missing agent does not make every normal shutdown impossible. Proxmox can also send a virtual ACPI power-button request when the guest supports it.

Install and enable the agent when you want those integrations, and use the [guest-agent troubleshooting guide](/posts/proxmox-guest-agent-not-running-fix/) if Proxmox cannot communicate with it. LXC containers do not use `qemu-ga`.

## Cost: Calculate, Do Not Guess

Hosting prices and electricity rates vary too much for a durable `$10–20/month` or “under $2” promise. Estimate the home-server energy cost from a measured wall-power average:

```text
monthly kWh = average watts × 24 × 30 ÷ 1000
monthly cost = monthly kWh × local electricity rate
```

Include the entire always-on system, network gear, storage, and backup target when comparing self-hosting with a rented server. Also value your maintenance time and the reliability of your home connection.

## Common Failure Points

- allocating all guest RAM to `-Xmx` and leaving no OS headroom;
- expecting a player count from RAM alone;
- generating a large new world while other CPU-heavy services are busy;
- exposing the game or management panel more broadly than intended;
- giving friends or children Proxmox administrator access instead of scoped game administration;
- calling a same-disk snapshot a backup;
- using outdated Java or tuning instructions for a newer server release.

## What to Measure

After deployment, record the Minecraft version, Java version, plugins/modpack, view and simulation distance, online players, host CPU model, guest allocation, and other host workloads. Without that context, a performance claim is not reusable evidence.

If you are starting from zero, the [beginner homelab guide](/posts/best-home-lab-for-beginners-2026/) and [$350 Proxmox reference build](/posts/example-350-proxmox-homelab-build/) explain the underlying host trade-offs.
