---
title: "Proxmox 'Guest Agent Is Not Running': Every Cause and How to Fix Each One"
date: 2026-08-14
draft: false
description: "Proxmox showing 'QEMU guest agent is not running' even though the agent is clearly installed and started? Here's every common cause, for both Linux and Windows guests."
tags: ["proxmox", "homelab", "troubleshooting"]
author: "Vosik"
ShowToc: true
TocOpen: true
---

This is one of the most confusing Proxmox errors, because it usually shows up *after* you've already done the "obvious" fix — installed the guest agent, confirmed it's running inside the VM, and it still says not running on the Proxmox side. The reason is that "guest agent not running" can mean five or six genuinely different things, and the error message doesn't tell you which one you're dealing with.

Let's go through them in the order you should actually check them.

## First: Confirm the Agent Is Enabled in the VM's Config

This sounds obvious, but it's the single most common cause — enabling the agent in the Proxmox UI doesn't apply retroactively to a running VM.

From the Proxmox shell:

```
qm config <vmid> | grep agent
```

If you don't see `agent: 1` (or `agent: enabled=1`), turn it on:

```
qm set <vmid> --agent enabled=1
```

Then **fully stop and start the VM** — not just reboot. The virtio-serial channel the agent talks over is only created at boot time, and a soft reboot from inside the guest OS doesn't recreate it. This trips people up constantly: they enable the option, click reboot inside the VM, and wonder why nothing changed.

## Second: Confirm the Agent Is Actually Running Inside the Guest

### On Linux guests

SSH or console into the VM and check:

```
systemctl status qemu-guest-agent
```

If it's not installed, install it (Debian/Ubuntu):

```
apt install qemu-guest-agent
systemctl enable --now qemu-guest-agent
```

### On Windows guests

Install the guest agent from the VirtIO driver ISO (`guest-agent\qemu-ga-x86_64.msi`), not a standalone download — using the version matched to your VirtIO driver set avoids a chunk of install failures people run into with mismatched versions. After installing, check `Get-Service QEMU-GA` in PowerShell to confirm it's actually running, not just installed.

One Windows-specific gotcha that trips people up: if you enabled the QEMU Guest Agent option *after* installing the VirtIO drivers, the virtio-serial device sometimes doesn't get picked up correctly. If the above doesn't work, try disabling the agent option, fully stopping the VM, re-enabling it, and starting again — this forces Proxmox to recreate the device fresh.

## Third: Check the Virtio-Serial Device Exists

Even with the agent enabled and running inside the guest, the communication channel between host and guest can be missing:

```
qm config <vmid> | grep serial
```

This should be added automatically when you enable the agent option — if it's missing, something went wrong at VM creation. Removing and re-enabling the agent option (with a full stop/start, not a reboot) usually recreates it.

## Fourth: Give It a Minute

Proxmox doesn't poll the agent instantly and continuously — IP and status information updates periodically. If you just started the VM, wait 30-60 seconds before assuming something is actually broken.

## Why This Matters Beyond the Annoying Popup

This isn't purely cosmetic like the subscription nag — a non-functioning guest agent breaks two things you'll actually notice:

- **Clean shutdowns fail.** Without the agent, Proxmox can't send a proper shutdown signal to the guest OS, so scheduled reboots/shutdowns just hang until they time out.
- **Backups aren't filesystem-consistent.** With the agent working, Proxmox asks the guest to freeze its filesystem before a snapshot, guaranteeing a clean backup. Without it, backups still happen, but they're a "crash-consistent" snapshot rather than a clean one — usually fine, occasionally not, depending on what's running.

If you're only annoyed by not seeing the VM's IP on the summary tab, it's low priority. If your scheduled backups or reboots are failing, it's worth actually fixing.

## FAQ

**I reinstalled the agent and it still says "not running." What now?**
Reinstalling the agent almost never fixes this on its own, because the underlying issue is usually the virtio-serial channel, not the agent software itself. Go back to the "fully stop and start" step — a soft reboot doesn't recreate the device, and that's the fix that resolves this most often.

**Does this affect Linux VMs and Windows VMs the same way?**
The underlying cause (missing or misconfigured virtio-serial channel) is identical. Windows guests just have an extra failure point around driver/agent version mismatches that Linux guests don't.

**Is it safe to just ignore this error?**
If you don't rely on scheduled shutdowns or care about filesystem-consistent backups, yes — the VM itself runs completely normally either way.

---

*Just getting your Proxmox subscription warnings sorted first? Check our guide on [fixing the "No valid subscription" popup](/posts/proxmox-no-valid-subscription-fix/) before tackling guest agent issues.*
