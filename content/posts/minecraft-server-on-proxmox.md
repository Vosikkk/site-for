---
title: "How to Host a Minecraft Server on Proxmox (LXC vs VM, Java vs Bedrock)"
date: 2026-08-14
draft: false
description: "A complete guide to self-hosting a Minecraft server on Proxmox — whether to use an LXC container or a VM, Java Edition vs Bedrock, and realistic resource allocation."
tags: ["proxmox", "homelab", "self-hosting", "minecraft"]
categories: ["Self-Hosting"]
ShowToc: true
TocOpen: true
---

Hosting your own Minecraft server on Proxmox gives you something no rented game server can: dedicated resources that aren't shared with strangers, snapshots you can roll back before a risky mod update, and zero monthly hosting fees beyond the electricity your home lab already uses.

The two decisions that actually matter before you start: **LXC or VM**, and **Java or Bedrock**. Get those right and the rest of the setup is straightforward.

## LXC or VM?

This is the first fork in the road, and the answer depends on which edition you're running.

**Use an LXC container for Java Edition.** Java Edition runs on the JVM, which doesn't need direct hardware access — an unprivileged LXC container gives you nearly bare-metal performance with a fraction of the overhead of a full VM. Boot time is seconds, not minutes, and resource allocation is more flexible since containers share the host's kernel.

**Use a VM for Bedrock Edition**, or if you want stronger isolation regardless of edition. Bedrock's dedicated server binary has occasionally had quirks running inside containers depending on the base image, and a VM sidesteps that entirely. A VM is also the safer choice if you're planning to let other people (kids, friends) manage the server themselves — full isolation means a misconfigured server can't affect anything else on your Proxmox host.

If you're not sure, default to LXC for Java. It's what most of the home lab community settles on, and the performance difference is real, not theoretical.

## Java Edition or Bedrock Edition?

- **Java Edition** supports mods (Forge, Fabric) and plugins (Paper, Spigot) and has by far the largest server-side community and documentation. If you or your players want mods, shaders, or specific gameplay plugins, this is the only real option.
- **Bedrock Edition** runs natively on consoles, mobile, and Windows, and is lighter on server resources since there's no JVM overhead. Choose this if most of your players are on phones, tablets, or consoles rather than a gaming PC.

Paper (a high-performance fork of the standard Java server) is the practical default for most home lab setups — it's a drop-in replacement for vanilla Java Edition with substantially better performance and plugin support.

## Resource Allocation: What You Actually Need

A common mistake is either wildly overallocating (an entire mini PC for one small survival world) or underallocating (trying to run a modded server on 2GB of RAM). Realistic numbers:

| Server size | RAM | CPU cores | Notes |
|---|---|---|---|
| Small (1-5 players, vanilla/Paper) | 2-4GB | 2 | Comfortable headroom for a survival world |
| Medium (5-15 players, some plugins) | 4-6GB | 2-4 | Paper handles this well with proper JVM flags |
| Modded (Forge/Fabric, 1-10 players) | 6-8GB+ | 4 | Modpacks are significantly heavier than vanilla or Paper |

With a Paper server and the right JVM flags, even a modest 4-core allocation can comfortably host 20+ players on a non-modded server — the JVM tuning matters more than raw core count for Java Edition specifically.

## Setting Up the LXC Container

1. Create an unprivileged LXC container using a Debian or Ubuntu template — 4GB RAM, 2 CPU cores, and 8GB of disk space is a reasonable starting point for a small server.
2. Update the container and install a Java runtime matching your server version's requirements (recent Minecraft versions need a recent JDK — check the specific version's requirements before installing, since this changes across Minecraft releases).
3. Open the default Minecraft port (25565/TCP) in the container's firewall if you've enabled one.
4. Download the server jar (Paper's official downloads page is the standard source if you're using Paper) into the container.
5. Run the server once to generate the initial files, accept the EULA in `eula.txt`, then start it for real with appropriately sized JVM memory flags matching the RAM you allocated to the container.

## Common Pitfalls

- **Forgetting to enable the QEMU guest agent** if you went the VM route instead of LXC — without it, Proxmox can't cleanly shut down the VM, and scheduled restarts will hang. (We cover this in detail in our [guest agent troubleshooting guide](/posts/proxmox-guest-agent-not-running-fix/) if you hit that specific error.)
- **Under-provisioning RAM for modded servers** — modpacks routinely need 2-3x the RAM a vanilla server would, and running out mid-game causes crashes that corrupt world saves more often than people expect.
- **Not setting up automated backups before players join.** Proxmox snapshots are trivial to schedule and take seconds — set this up before you have a world worth losing, not after.
- **Running the server on the same VM/container as other exposed services.** Keep it isolated. If a player-facing service has a vulnerability, you don't want it sharing a blast radius with your password manager or photo library.

## FAQ

**Do I need to port forward for friends to join?**
Yes, unless you're using a tool like Tailscale to give friends access to your home network directly. Port forwarding 25565 on your router to your LXC container's or VM's internal IP is the traditional approach; be aware this does expose the port to the internet, so keep the server software updated.

**Can I run multiple Minecraft servers on the same Proxmox host?**
Yes — this is one of the strongest arguments for LXC over VM here, since containers are lightweight enough that running 2-3 small servers (say, a survival world and a creative build server) on modest hardware is completely realistic.

**How much does this actually save compared to a paid Minecraft hosting service?**
Paid hosting for a comparable server (4-8GB RAM) typically runs $10-20/month. On home lab hardware you already own, the electricity cost for that allocation is usually under $2/month — the math favors self-hosting quickly if you're already running a home lab for other services.

---

*New to home labs? Our [beginner's guide](/posts/best-home-lab-for-beginners-2026/) and [$350 example Proxmox build](/posts/example-350-proxmox-homelab-build/) cover the foundation this guide builds on.*
