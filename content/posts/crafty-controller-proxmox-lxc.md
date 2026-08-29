---
title: "Crafty Controller on Proxmox LXC: Minecraft Server Manager"
date: 2026-08-29
draft: false
description: "Run Crafty Controller on a Proxmox LXC. Resources, ports, Java vs Bedrock, helper-script install, and when a VM is the better box."
tags: ["proxmox", "minecraft", "lxc", "self-hosting"]
ShowToc: true
TocOpen: true
---

# Crafty Controller on Proxmox LXC: Minecraft Server Manager

You already can run a raw Paper/Vanilla jar in an LXC. Crafty Controller is the layer on top: a web UI to start/stop servers, edit files, pull backups, and keep more than one Minecraft version without SSH-ing into the box every time.

This sits next to the [Minecraft-on-Proxmox guide](/posts/minecraft-server-on-proxmox/). That post is "LXC vs VM, Java vs Bedrock." This one is "how to manage those servers once they exist."

## LXC or VM for Crafty Controller?

**Use an LXC for Java Edition + Crafty.**
Crafty is a Python web app that launches JVM servers. Neither needs a full virtual BIOS. An unprivileged Debian/Ubuntu LXC is the default: fast boot, low overhead, easy bind-mounts for the world folders.

**Use a VM if:**

- you want Bedrock in a context where the LXC networking/UDP path is fighting you
- you want a hard isolation boundary around kids' servers
- a helper script or panel expects systemd and Docker in ways your unprivileged LXC template does not give you

Crafty itself does not require a VM. The Minecraft edition and how picky you are about isolation do.

## What to allocate

The panel is light. The JVM is not.

Starting point that matches common helper-script defaults and real small servers:

| Role | CPU | RAM | Disk |
|---|---|---|---|
| Crafty + one small Java server (friends, no heavy mods) | 2 cores | 4 GB | 16 GB |
| Crafty + modest Paper / light plugin pack | 4 cores | 6–8 GB | 32 GB |
| Modded pack or several worlds | 4+ cores | 8–16 GB | 64 GB+ and a backup target *outside* the CT |

Give the JVM a hard ceiling lower than the container RAM (leave 512 MB–1 GB for Crafty + OS). A 4 GB CT with `-Xmx4096M` will OOM as soon as the panel and the GC argue.

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

There is a Proxmox VE Helper-Scripts installer for Crafty Controller. It builds the CT, drops you on `https://<ip>:8443`, and stores initial credentials in the container.

Use it if you want a working panel in one shot. Read the script before piping it to bash, keep notes of the CTID it creates, and know that **panel updates and script updates are not the same thing**. A failed scripted update can leave the unit down while `/opt/crafty-controller` is still intact — at that point `systemctl status crafty-controller` and the official upgrade path matter more than re-running the installer.

## Crafty Controller + Java vs Bedrock on Proxmox

- **Java in LXC** is the path that matches the rest of this site. Paper/Fabric/Vanilla behind Crafty is the common homelab setup.
- **Bedrock** is a different binary and a different port. Put it in its own CT/VM if you do not want UDP rules mixed into the Java box.
- Do not run Java and a heavy Bedrock instance in the same 4 GB helper-script default and then blame Proxmox.

Crafty can manage more than one server. Memory cannot. If you add a second world, add RAM or add a second CT.

## Backups and the guest agent

LXC snapshots are fast and not a substitute for a Crafty-side world backup plus a copy off the node.

If you ever move this to a **VM** instead of an LXC, install the QEMU guest agent and do a full stop/start after enabling it — same fix as [guest agent not running](/posts/proxmox-guest-agent-not-running-fix/). On an LXC the guest agent is a different story; snapshot consistency then depends on how you freeze the filesystem, not on `qemu-ga`.

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
Yes. The constraints are Java version, RAM, and ports — not the PVE major.

---

*Start with [how to host Minecraft on Proxmox](/posts/minecraft-server-on-proxmox/) if you have not picked LXC vs VM yet. Hardware-side: [best mini PC for Proxmox](/posts/best-mini-pcs-for-proxmox/).*
