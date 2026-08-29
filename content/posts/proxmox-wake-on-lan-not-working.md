---
title: "Proxmox Wake-on-LAN Not Working: Fix Host and VM"
description: "Fix Proxmox Wake-on-LAN for the physical host (BIOS, ethtool, vmbr0) and why a stopped VM cannot use classic magic-packet WoL."
tags: ["proxmox", "networking", "troubleshooting"]
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

You want `g` in **Supports Wake-on**. If `g` is missing, the card cannot do magic-packet wake. No sysctl will invent that. A cheap add-in NIC is often more reliable than the board’s integrated port.

### Step 2: two BIOS settings, not one

Everyone enables **Wake on LAN** / **Power On by PCI-E**. The setting people miss is **Deep Sleep / ErP Ready / Deep S4/S5**.

If Deep Sleep is allowed, the NIC loses power on shutdown and cannot hear the packet — even with WoL “enabled.” Disable Deep Sleep, or pick the option that keeps standby power on the NIC.

Quick test: after shutdown, do the ethernet port lights stay faintly on? If the port goes completely dark, the NIC has no power and WoL cannot work.

### Step 3: enable it in the OS

```bash
ethtool -s <interface> wol g
ethtool <interface> | grep -i wake
```

**Wake-on** should now show `g`. If it flips back to `d` after a minute, the driver or a power-management policy is resetting it. Persist it in the next step.

### Step 4: make it survive a reboot (the Proxmox part)

`ethtool -s … wol g` does not persist. On Proxmox the NIC almost always sits behind `vmbr0`, and that is the gotcha.

Add a `post-up` hook in `/etc/network/interfaces` on the **bridge** that owns the physical port, not only on the raw NIC. Example:

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

Applying WoL only to `eno1` and ignoring the bridge is how the setting silently dies after the next boot or after `ifreload`.

### Host still dead after a kernel update

This happens after some `pve-kernel` updates. NIC drivers reset **Wake-on** to `d`. Re-run `ethtool` and confirm the `post-up` line is still in `interfaces`. If the driver dropped `g` support after the update, that is a hardware/driver issue, not a Proxmox UI issue.

## Waking a virtual machine

A genuine magic packet to a **stopped VM** does not work. That is not a missing checkbox.

Physical WoL depends on the card staying electrically powered while the machine is off. A stopped VM has no virtual NIC at all. There is nothing listening.

What people actually want is “start this VM remotely.” Two practical options:

- **Proxmox API.** Create an API token and call `qm start <vmid>` (or the REST equivalent). This is the supported path.
- **A small listener on the host.** Some labs run a script that watches for a packet or HTTP call on the LAN and then runs `qm start`. That is a workaround, not native WoL. Bind it to the LAN only. An open listener that can start VMs is not something you want on the public internet.

If you are setting this up from scratch, use the API. It survives host reboots if the token and systemd unit are set up correctly, and you are not pretending a virtio NIC is a hardware PHY.

## FAQ

**I can wake the Proxmox host but not a VM on it. Is that normal?**  
Yes. Those are the two problems above. Unrelated mechanisms.

**Does this change between Proxmox VE 8 and 9?**  
No. Host WoL is BIOS + NIC + Linux `ethtool` / `vmbr0`. Same on both.

**My host woke fine and stopped after an update.**  
Re-check `ethtool`. If Wake-on is `d`, the `post-up` hook did not reapply, or the new driver reset it.

**Can I WoL a VM that is only hibernated / paused?**  
Paused/hibernated guests are still not physical NICs. Use `qm start` / `qm resume` via the API.

---

*If you are wiring remote access for the first time, the early landmines are usually [no valid subscription](/posts/proxmox-no-valid-subscription-fix/) and [guest agent not running](/posts/proxmox-guest-agent-not-running-fix/).*
