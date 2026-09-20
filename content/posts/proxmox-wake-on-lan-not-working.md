---
title: "Proxmox Wake-on-LAN Not Working: Fix Host and VM"
description: "Fix Proxmox Wake-on-LAN for the physical host (BIOS, ethtool, vmbr0) and why a stopped VM cannot use classic magic-packet WoL."
tags: ["proxmox", "networking", "troubleshooting"]
lastmod: 2026-09-19
---

Wake-on-LAN failing on Proxmox? There are two completely separate problems people mean by this:

1. **Waking the physical Proxmox host** from a full shutdown — this is regular hardware WoL. It works, with a few Proxmox-specific gotchas.
2. **Waking a VM** that is powered off — classic magic-packet WoL does not work here. A virtual NIC is not a physical card sitting in a low-power state.

If you mixed solutions from both threads and nothing worked, that is why. Do them separately.

## Waking the physical host

### Step 1: confirm the NIC supports magic packets

Replace `<interface>` with the physical NIC (`eno1`, `enp3s0`, …), not `vmbr0`.

```bash
ethtool <interface> | grep -i wake
```

You want `g` in **Supports Wake-on**. If `g` is missing, the current NIC/driver combination does not advertise magic-packet wake. A sysctl cannot add a capability that the driver does not expose.

### Step 2: two BIOS settings, not one

Everyone enables **Wake on LAN** / **Power On by PCI-E**. The setting people miss is **Deep Sleep / ErP Ready / Deep S4/S5**.

Names and behavior vary by motherboard. On some systems, an ErP or deep-sleep setting removes standby power from the NIC in S4/S5, so WoL cannot work even when another firmware setting enables it. Check the board manual before changing power options.

Quick test: after shutdown, do the ethernet port lights stay faintly on? If the port goes completely dark, the NIC has no power and WoL cannot work.

### Step 3: enable it in the OS

```bash
ethtool -s <interface> wol g
ethtool <interface> | grep -i wake
```

**Wake-on** should now show `g`. If it flips back to `d` after a minute, the driver or a power-management policy is resetting it. Persist it in the next step.

### Step 4: make it survive a reboot (the Proxmox part)

`ethtool -s … wol g` does not persist. On Proxmox the NIC almost always sits behind `vmbr0`, and that is the gotcha.

One readable way to persist the setting on a standard Proxmox `ifupdown2` configuration is a `post-up` command in the stanza that brings up the bridge and physical port. Example:

```
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.10/24
    gateway 192.168.1.1
    bridge-ports eno1
    bridge-stp off
    bridge-fd 0
    post-up ethtool -s eno1 wol g
```

Then:

```bash
ifreload -a
ethtool eno1 | grep -i wake
```

The command still targets the physical device, `eno1`; the bridge stanza is only the lifecycle hook in this example. A systemd unit tied to the physical interface is another valid persistence method. Whichever method you use, verify the result after a reboot instead of assuming it ran.

### Host still dead after a kernel update

A driver or power-policy change can reset **Wake-on** to `d`. Re-run `ethtool`, check the boot journal, and confirm the persistence command executed. If `Supports Wake-on` itself changes, investigate the NIC driver and firmware rather than the Proxmox web UI.

## Waking a virtual machine

A genuine magic packet to a **stopped VM** does not work. That is not a missing checkbox.

Physical WoL depends on the card staying electrically powered while the machine is off. A stopped VM has no virtual NIC at all. There is nothing listening.

What people actually want is “start this VM remotely.” Two practical options:

- **Proxmox API.** Create a narrowly scoped API token and call the VM start endpoint. `qm start <vmid>` is the equivalent local CLI action; the API does not literally execute that shell command.
- **A small listener on the host.** Some labs run a script that watches for a packet or HTTP call on the LAN and then runs `qm start`. That is a workaround, not native WoL. Bind it to the LAN only. An open listener that can start VMs is not something you want on the public internet.

If you are setting this up from scratch, prefer the authenticated API over an unauthenticated packet listener. Keep tokens out of scripts served to browsers and grant only the permissions the start action needs.

> **Evidence note (reviewed September 19, 2026):** the commands above describe Linux NIC state and a standard Proxmox network configuration, not a universal motherboard recipe. Firmware labels, supported sleep states, NIC drivers, and interface names vary. See the [Proxmox network documentation](https://pve.proxmox.com/pve-docs/chapter-sysadmin.html#sysadmin_network_configuration) and the local `ethtool(8)` manual for the installed version.

## FAQ

**I can wake the Proxmox host but not a VM on it. Is that normal?**  
Yes. Those are the two problems above. Unrelated mechanisms.

**Does this change between Proxmox VE 8 and 9?**  
The underlying firmware/NIC/Linux mechanism is the same, but drivers, kernels, and network configuration can differ. Recheck the commands and interface names on the installed release.

**My host woke fine and stopped after an update.**  
Re-check `ethtool`. If Wake-on is `d`, the `post-up` hook did not reapply, or the new driver reset it.

**Can I WoL a VM that is only hibernated / paused?**  
Paused/hibernated guests are still not physical NICs. Use `qm start` / `qm resume` via the API.

---

*If you are wiring remote access for the first time, the early landmines are usually [no valid subscription](/posts/proxmox-no-valid-subscription-fix/) and [guest agent not running](/posts/proxmox-guest-agent-not-running-fix/).*
