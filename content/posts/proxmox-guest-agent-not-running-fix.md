---
title: "Proxmox Guest Agent Not Running: Linux and Windows Fixes"
description: "Fix “QEMU guest agent is not running” on Proxmox. Linux, Ubuntu, Windows, qemu-ga-x86_64.msi, virtio-serial, and why a reboot is not enough."
tags: ["proxmox", "troubleshooting", "qemu", "windows", "ubuntu"]
---

Proxmox showing **QEMU guest agent is not running** even though the agent is installed and started? This is one of the most confusing Proxmox errors, because it usually shows up *after* you’ve already done the obvious fix.

The message can mean five or six different things. The UI does not tell you which one you have. Work through the checks in order — Linux and Windows guests both included.

## Quick check: is the agent actually reachable?

From the Proxmox host:

```bash
qm config <vmid> | grep -E 'agent|serial'
qm agent <vmid> ping
```

- `agent: 1` or `agent: enabled=1` must be present.
- A working agent returns with no error (`{"return":{}}` on many versions).
- `QEMU guest agent is not running` means Proxmox cannot talk to the guest over virtio-serial. The service inside the VM being “started” is not enough.

Then **fully stop and start** the VM. A reboot from inside the guest does not recreate the virtio-serial channel. That single distinction fixes this more often than reinstalling the agent.

## First: confirm the agent is enabled in the VM config

Enabling QEMU Guest Agent in the UI does not apply retroactively to a running VM.

```bash
qm config <vmid> | grep agent
```

If you don’t see `agent: 1` (or `agent: enabled=1`):

```bash
qm set <vmid> --agent enabled=1
```

Then stop and start the VM from Proxmox — not a guest reboot. The virtio-serial channel is created at power-on. People enable the option, click Reboot inside the OS, and wonder why nothing changed.

In the UI: **VM → Options → QEMU Guest Agent → Enabled**. Same rule: stop/start after you flip it.

## Second: confirm the agent is running inside the guest

### Proxmox guest agent not running on Linux / Ubuntu

SSH or open the console:

```bash
systemctl status qemu-guest-agent
```

Debian / Ubuntu:

```bash
apt update
apt install -y qemu-guest-agent
systemctl enable --now qemu-guest-agent
```

RHEL / Rocky / Alma:

```bash
dnf install -y qemu-guest-agent
systemctl enable --now qemu-guest-agent
```

If the unit is masked or failed:

```bash
systemctl unmask qemu-guest-agent
systemctl reset-failed qemu-guest-agent
systemctl enable --now qemu-guest-agent
journalctl -u qemu-guest-agent -b --no-pager
```

`dependency failed for qemu guest agent` almost always means a missing virtio-serial device or a unit that was masked after a broken package upgrade — not a mysterious Proxmox bug.

### Proxmox guest agent not running on Windows

Install the agent from the **VirtIO driver ISO**, not a random standalone download:

`guest-agent\qemu-ga-x86_64.msi`

Match the MSI to the same VirtIO ISO version you used for the rest of the drivers. Mixed versions are a common silent failure on Windows guests, including Windows 11.

Then in PowerShell:

```powershell
Get-Service QEMU-GA
```

It should be **Running** and **Automatic**. If it is Stopped:

```powershell
Start-Service QEMU-GA
Set-Service QEMU-GA -StartupType Automatic
```

Windows-specific gotcha: if you enabled QEMU Guest Agent in Proxmox *after* installing VirtIO, the serial device sometimes never binds. Disable the agent option, fully stop the VM, enable it again, start the VM. That forces Proxmox to recreate the device.

On the host you can also test:

```bash
qm agent <vmid> ping
qm agent <vmid> network-get-interfaces
```

If ping fails but `Get-Service QEMU-GA` says Running, you do not have an install problem. You have a channel problem. Go to the next section.

## Third: check the virtio-serial device exists

Even with the agent enabled and the service running, the host/guest channel can be missing.

```bash
qm config <vmid> | grep serial
```

Enabling the agent option is supposed to add this automatically. If it is missing, something went wrong at VM creation or an old template was cloned without the device.

Fix:

1. Options → QEMU Guest Agent → disable
2. Fully stop the VM
3. Enable the agent again
4. Start the VM
5. Repeat `qm agent <vmid> ping`

Do not soft-reboot between those steps.

## Fourth: give it a minute

Proxmox does not poll the agent continuously. IP and agent status on the Summary tab update on a delay. After a start, wait 30–60 seconds before deciding it failed.

If Summary still shows no guest IP after a minute and `qm agent <vmid> ping` errors, it is still broken. If ping works but Summary is empty, wait or refresh — that one is cosmetic.

## Proxmox Ubuntu guest agent not running

Same stack as Linux above. The two Ubuntu-specific traps:

- You installed `qemu-guest-agent` but never enabled the option on the **Proxmox** side.
- You rebooted from inside Ubuntu after enabling the option. That does not create `virtio-serial`. Stop/start from the host.

```bash
apt install -y qemu-guest-agent
systemctl enable --now qemu-guest-agent
systemctl status qemu-guest-agent --no-pager
```

Then on the host: `qm set <vmid> --agent enabled=1`, stop, start, `qm agent <vmid> ping`.

## Install qemu-ga-x86_64.msi the way that actually works

1. Download the current **Stable** VirtIO ISO from Fedora’s virtio-win project (the same ISO you use for the NIC and SCSI drivers).
2. Attach it as a CD/DVD on the Windows VM.
3. Run `guest-agent\qemu-ga-x86_64.msi`.
4. Confirm `QEMU-GA` is Running.
5. Confirm Proxmox has QEMU Guest Agent enabled.
6. Stop/start the VM once.

Skip standalone `.msi` files from random mirrors. Version skew against the rest of the VirtIO stack is how you get “installed, running, still not running” on the Proxmox side.

## “Requires guest agent installed” / “no guest agent configured”

Backup tools, monitoring packs, and some IPS/management agents report this when Proxmox itself cannot reach `qemu-ga`.

Fix the Proxmox-side channel first (`qm agent <vmid> ping` must succeed). Installing another vendor agent on top of a dead QEMU channel will not help.

If a product says **IPS no guest agent configured**, it is asking for the same QEMU guest agent — there is not a second Proxmox agent to install.

## Why this matters beyond the popup

This is not purely cosmetic like the subscription nag. A dead guest agent breaks two things you will notice:

- **Clean shutdowns fail.** Without the agent, Proxmox cannot send a proper ACPI/guest shutdown, so scheduled stop/reboot jobs hang until they time out.
- **Backups are crash-consistent, not filesystem-consistent.** With the agent, Proxmox can freeze the guest filesystem before a snapshot. Without it, the backup still runs — it is just a crash-consistent image. Usually fine. Occasionally not, depending on what the VM was writing.

If you only miss the IP on the Summary tab, priority is low. If scheduled backups or shutdowns fail, fix it.

## FAQ

**I reinstalled the agent and it still says “not running.” What now?**  
Reinstalling almost never fixes this by itself. The usual cause is the virtio-serial channel, not the package. Full stop/start from Proxmox after `agent: 1` is set.

**Does this affect Linux VMs and Windows VMs the same way?**  
The missing-channel cause is identical. Windows adds a second failure point: VirtIO / `qemu-ga-x86_64.msi` version mismatch.

**Is it safe to ignore?**  
Yes, if you do not care about scheduled shutdowns or filesystem-consistent snapshots. The guest OS itself runs normally.

**`qm agent <vmid> ping` works, Summary still says not running.**  
Wait a minute and refresh. If ping works, communication is fine. The UI lags.

**Proxmox Gast Agent läuft nicht — same fix?**  
Yes. Enable agent in Options, install `qemu-guest-agent` (Linux) or `qemu-ga-x86_64.msi` (Windows), then Stop/Start — kein Gast-Reboot.

---

*Also hitting the subscription banner on a fresh node? Read [Proxmox no valid subscription](/posts/proxmox-no-valid-subscription-fix/). Setting up a Windows lab VM next to this? Guest agent is also why [Minecraft on Proxmox](/posts/minecraft-server-on-proxmox/) mentions it in the pitfalls list.*
