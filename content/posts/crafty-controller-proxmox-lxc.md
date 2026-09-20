---
title: "Crafty Controller on Proxmox LXC: Minecraft Server Manager"
date: 2026-08-29
draft: false
description: "Run Crafty Controller on a Proxmox LXC. Resources, ports, Java vs Bedrock, helper-script install, and when a VM is the better box."
tags: ["proxmox", "minecraft", "lxc", "self-hosting"]
lastmod: 2026-09-19
ShowToc: true
TocOpen: true
---

You already can run a raw Paper/Vanilla jar in an LXC. Crafty Controller is the layer on top: a web UI to start/stop servers, edit files, pull backups, and keep more than one Minecraft version without SSH-ing into the box every time.

If you have not decided between **LXC vs VM** or **Java vs Bedrock** yet, start with the [Minecraft Server on Proxmox guide](/posts/minecraft-server-on-proxmox/). This article assumes that decision is made and focuses on how to manage those servers once they exist.

## LXC or VM for Crafty Controller?

**An unprivileged LXC is often a practical option for Java Edition + Crafty.**
Crafty is a Python application that launches Minecraft servers, so it does not inherently require a VM. LXC has lower overhead, but it shares the host kernel and needs careful mount, permission, and isolation choices.

**Use a VM if:**

- you want Bedrock in a context where the LXC networking/UDP path is fighting you
- you want a hard isolation boundary around kids' servers
- a helper script or panel expects systemd and Docker in ways your unprivileged LXC template does not give you

Crafty itself does not require a VM. The Minecraft edition and how picky you are about isolation do.

## What to allocate

The panel is light. The JVM is not.

Conservative planning examples—not measured guarantees:

| Role | CPU | RAM | Disk |
|---|---|---|---|
| Crafty + one small Java server (friends, no heavy mods) | 2 cores | 4 GB | 16 GB |
| Crafty + modest Paper / light plugin pack | 4 cores | 6–8 GB | 32 GB |
| Modded pack or several worlds | 4+ cores | 8–16 GB | 64 GB+ and a backup target *outside* the CT |

Give the JVM a ceiling below the container limit so the OS, Crafty, filesystem cache, and JVM overhead have headroom. The required margin depends on the Java version, server software, plugins, and workload; do not set `-Xmx` equal to the container's full RAM allocation.

Port plan:

- Crafty web UI: **8443/TCP** (typical)
- Java server: **25565/TCP** (and whatever you remap per instance)
- Bedrock: **19132/UDP** if you run it

Forward those on the host / firewall, not "all ports on the CT."

## Install options

Two honest paths.

### 1. Manual LXC (preferred if you want to understand the box)

1. Create an unprivileged Debian LXC. Enable nesting if the installer or future updates need it.
2. Install a JDK that matches the Minecraft version you will run. Do not assume "latest Java" equals "correct Java."
3. Install Crafty from the [official Linux install docs](https://docs.craftycontrol.com/pages/getting-started/installation/linux/).
4. Confirm the systemd unit is enabled.
5. Open `https://<ct-ip>:8443`, change the initial password, then create the server from the UI instead of launching `server.jar` by hand.

World data should live on a bind-mounted path or a dedicated virtual disk you snapshot. Do not treat the CT rootfs as the only copy of `world/`.

### 2. Community helper script

Community automation for Crafty on Proxmox may be available, but it is not part of the official Crafty or Proxmox documentation. Confirm the script's current maintainer, source, supported releases, and exact actions before running it.

If you use one, read the script before piping it to a shell, keep notes of the CTID and paths it creates, and remember that **panel updates and script updates are not the same thing**. Follow the [official Crafty installation and update documentation](https://docs.craftycontrol.com/pages/getting-started/installation/linux/) for the application itself.

## Crafty Controller + Java vs Bedrock on Proxmox

- **Java in LXC** is the path that matches the rest of this site. Paper/Fabric/Vanilla behind Crafty is the common homelab setup.
- **Bedrock** is a different binary and a different port. Put it in its own CT/VM if you do not want UDP rules mixed into the Java box.
- Do not run Java and a heavy Bedrock instance in the same 4 GB helper-script default and then blame Proxmox.

Crafty can manage more than one server. Memory cannot. If you add a second world, add RAM or add a second CT.

## Backups and the guest agent

LXC snapshots are fast and not a substitute for a Crafty-side world backup plus a copy off the node.

If you move this to a **VM**, the QEMU guest agent can support management features when it is enabled on both sides and its virtual channel is present; it is not required merely to run Crafty. See the [guest-agent troubleshooting guide](/posts/proxmox-guest-agent-not-running-fix/). An LXC does not use `qemu-ga`; backup consistency depends on the backup mode and whether the application data is in a consistent state.

## Common pitfalls

- **Helper-script defaults are not a modded-pack spec.** 2 cores / 4 GB / 16 GB is a small vanilla/Paper box.
- **UI on 8443, game on 25565.** Opening only one of them looks like "Crafty is broken."
- **Updating the panel via a script** after a major Crafty bump can fail the systemd unit. Check `journalctl -u crafty-controller` before you rebuild the CT.
- **Putting worlds only on the CT disk** with no off-node copy. A bad `pct rollback` will teach this once.
- **Running Crafty as the thing that also torrents, arr-stack, and Jellyfin.** Give Minecraft its own CT.

## FAQ

**Is Crafty Controller better than just a systemd unit for Paper?**
Only if you want a browser UI, multiple versions, or non-SSH admin. A single stable Paper server does not need it.

**Can I put Crafty in Docker inside the LXC?**
You can. You now have two layers to debug. For a homelab Minecraft panel, native install or the helper-script CT is less noise.

**Does this work on PVE 8 and 9?**
The architecture is not tied to one Proxmox major release, but templates, community installers, AppArmor behavior, and package versions can differ. Verify the exact path on the release you run.

> **Evidence note (reviewed September 19, 2026):** the allocations above are starting estimates, not a RunAHomeLab benchmark. Crafty's official Linux documentation currently requires Python 3.9+ and says Java must be installed before starting Minecraft servers; actual game-server resources depend on version, world, plugins, mods, players, and view distance.

---

*Start with [how to host Minecraft on Proxmox](/posts/minecraft-server-on-proxmox/) if you have not picked LXC vs VM yet. Hardware-side: [best mini PC for Proxmox](/posts/best-mini-pcs-for-proxmox/).*
