---
title: "Proxmox Wake-on-LAN Not Working? You're Probably Solving Two Different Problems"
date: 2026-08-14
draft: false
description: "Wake-on-LAN failing on Proxmox? There are two completely separate WoL problems people mean by this — waking the physical host, and waking a VM. Here's both."
tags: ["proxmox", "homelab", "troubleshooting", "networking"]
author: "Vosik"
ShowToc: true
TocOpen: true
---

Almost every Proxmox WoL thread is actually two unrelated conversations happening at once, because "wake-on-lan on Proxmox" means one of two very different things depending on what you're trying to wake up:

1. **Waking the physical Proxmox host** from a full shutdown — this is regular hardware WoL, and it works, with some Proxmox-specific gotchas.
2. **Waking a VM** that's powered off — this is a different problem entirely, and traditional magic-packet WoL fundamentally doesn't work for it, because a VM's network card isn't a physical device that can sit in a low-power state.

If you've been mixing solutions from both categories and nothing works, that's why. Let's do them separately.

## Waking the Physical Host

### Step 1: Confirm your NIC actually supports it

```
ethtool <interface> | grep Wake-on
```

You want to see `g` in the "Supports Wake-on" line. If `g` isn't listed at all, your network card's hardware doesn't support magic-packet wake, and no amount of configuration will fix that — you'd need different hardware (a cheap add-in NIC is often more reliable here than motherboard-integrated ones, which have a surprisingly inconsistent track record with WoL).

### Step 2: Two BIOS settings, not one

Everyone remembers to enable "Wake on LAN" or "Power On by PCI-E" in BIOS. The setting people miss is **Deep Sleep Control** (sometimes called ErP Ready or similar). If this is set to allow full S4/S5 sleep states, your NIC loses power completely on shutdown and can't receive the magic packet at all — even with WoL "enabled." Set it to disabled, or to whichever option keeps the NIC powered during shutdown.

A quick way to tell if this is your issue: if the ethernet port's lights go completely dark after shutdown, the NIC has no power and WoL can't work, regardless of any other setting.

### Step 3: Enable it at the OS level

```
ethtool -s <interface> wol g
```

### Step 4: Make it survive a reboot

This is the step that trips people up most, because the fix is different depending on whether your NIC sits directly on the host or behind a bridge (which it almost always does in Proxmox, via `vmbr0`). The `ethtool` command above doesn't persist by default — you need to add it as a `post-up` hook in `/etc/network/interfaces`.

The gotcha: it needs to go in the **bridge's** section (`vmbr0`), not the physical interface's section. Since Proxmox routes everything through the bridge, applying the setting to the underlying NIC directly often gets silently ignored or reset.

## Waking a Virtual Machine

Here's the part most guides don't explain clearly: **a genuine magic-packet WoL to a VM doesn't work**, and it's not a configuration problem you can fix. Physical WoL relies on the network card staying electrically powered in a low-power state while the rest of the machine is off, listening for a specific packet. A VM's virtual NIC doesn't exist at all when the VM is stopped — there's no powered-down-but-listening state to wake it from, because there's no hardware.

What people actually want in this situation is usually "start this VM remotely when I send a signal," not literal WoL. The two practical ways to get that:

- **The Proxmox API.** You can trigger `qm start <vmid>` remotely through Proxmox's own API, authenticated with an API token. This is the officially supported path and doesn't rely on faking hardware behavior.
- **A listener script that mimics the trigger.** Some home labbers run a small script on the Proxmox host that listens for a specific network signal (not necessarily even a real magic packet) and calls `qm start` when it sees it — effectively a custom WoL-like trigger. This works, but it's a DIY workaround, not something Proxmox supports natively, and it needs a firewall rule scoped tightly to your LAN if you go this route — an open listening port that can start VMs is not something you want reachable from outside your network.

If you're setting this up from scratch, start with the API approach. It's more reliable long-term and doesn't depend on a script that might silently stop listening after a restart.

## FAQ

**I can wake my Proxmox host but not a specific VM on it — is that normal?**
Yes, completely. Those are the two separate problems above. Host-level WoL and VM auto-start are unrelated mechanisms.

**Does this differ between Proxmox VE 8 and 9?**
No — the host-level BIOS/NIC/bridge behavior described here is the same across versions; it comes from the underlying Linux networking stack, not Proxmox itself.

**My host was waking up fine and suddenly stopped after an update — what changed?**
This does happen occasionally after kernel or `pve-kernel` updates, since NIC driver behavior can shift between kernel versions. Re-check the `ethtool` output after any kernel update — if `Wake-on` reset to `d` (disabled), your `post-up` hook either didn't reapply or the driver reset the setting on its own.

---

*If you're setting up remote access to manage your host in the first place, our [Proxmox "no valid subscription" fix](/posts/proxmox-no-valid-subscription-fix/) and [guest agent troubleshooting guide](/posts/proxmox-guest-agent-not-running-fix/) cover two other early speed bumps you'll likely hit.*
