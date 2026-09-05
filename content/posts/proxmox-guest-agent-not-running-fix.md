---
title: "Proxmox Guest Agent Not Running? Fix It on Linux & Windows"
description: "Seeing 'QEMU guest agent is not running' in Proxmox? Fix it on Ubuntu, Debian or Windows, check virtio-serial, and learn why a reboot may not be enough."
tags: ["proxmox", "troubleshooting", "qemu", "windows", "ubuntu"]
---

If Proxmox says **QEMU guest agent is not running**, reinstalling the agent is often not the fix.

First check that the agent is enabled in Proxmox, confirm the service is running inside the VM, then **fully stop and start the VM from Proxmox**. A reboot from inside Linux or Windows may not recreate the virtio-serial channel the guest agent needs.

## Quick fix

From the Proxmox host:

```bash
qm config <vmid> | grep -E 'agent|serial'
qm agent <vmid> ping
```

You want to see the guest agent enabled:

```text
agent: 1
```

or:

```text
agent: enabled=1
```

If it is not enabled:

```bash
qm set <vmid> --agent enabled=1
```

Then:

1. Fully **stop** the VM in Proxmox.
2. Start it again.
3. Wait 30–60 seconds.
4. Run:

```bash
qm agent <vmid> ping
```

A working agent normally returns without an error.

If you still get:

```text
QEMU guest agent is not running
```

continue through the checks below.

## Why Proxmox says “QEMU guest agent is not running”

The message does not necessarily mean the `qemu-guest-agent` package is missing.

Proxmox needs several things to work at the same time:

- QEMU Guest Agent enabled in the VM configuration
- the guest agent installed inside Linux or Windows
- the guest agent service running
- a working virtio-serial channel between host and guest

That last one causes a lot of confusion.

The service inside the VM can show as **Running**, while Proxmox still cannot communicate with it.

## Make sure QEMU Guest Agent is enabled in Proxmox

Check the VM configuration:

```bash
qm config <vmid> | grep agent
```

If you do not see `agent: 1` or `agent: enabled=1`:

```bash
qm set <vmid> --agent enabled=1
```

You can also enable it in the UI:

**VM → Options → QEMU Guest Agent → Enabled**

Now fully stop and start the VM.

Do not just reboot from inside the guest OS.

The virtio-serial channel used by the agent is created when the VM powers on. If you enable QEMU Guest Agent while the VM is already running, a normal guest reboot may leave you with the same error.

## “No guest agent configured” / “Requires guest agent installed”

If Proxmox or another management tool reports **no guest agent configured**, start by checking whether Proxmox itself can reach QEMU Guest Agent:

```bash
qm agent <vmid> ping
```

If that fails, fix the Proxmox-to-guest communication first.

There is not a separate generic “Proxmox guest agent” you need to install on top of QEMU Guest Agent.

For Linux, the package is normally:

```text
qemu-guest-agent
```

For Windows, QEMU Guest Agent is available through the VirtIO driver ISO.

## Proxmox Guest Agent not running on Ubuntu / Debian

Inside an Ubuntu or Debian VM:

```bash
systemctl status qemu-guest-agent
```

If it is not installed:

```bash
apt update
apt install -y qemu-guest-agent
systemctl enable --now qemu-guest-agent
```

Check it again:

```bash
systemctl status qemu-guest-agent --no-pager
```

If the service is masked or failed:

```bash
systemctl unmask qemu-guest-agent
systemctl reset-failed qemu-guest-agent
systemctl enable --now qemu-guest-agent
journalctl -u qemu-guest-agent -b --no-pager
```

Then return to the Proxmox host:

```bash
qm set <vmid> --agent enabled=1
```

Fully stop the VM, start it again, and test:

```bash
qm agent <vmid> ping
```

### Ubuntu-specific trap

A common sequence is:

1. Install `qemu-guest-agent` in Ubuntu.
2. Enable QEMU Guest Agent in Proxmox.
3. Reboot Ubuntu.
4. Proxmox still says the guest agent is not running.

The package may be completely fine.

Fully **stop and start the VM from Proxmox** instead of rebooting it from Ubuntu.

## Proxmox Guest Agent not running on RHEL / Rocky / AlmaLinux

Install and enable the service:

```bash
dnf install -y qemu-guest-agent
systemctl enable --now qemu-guest-agent
```

Then verify:

```bash
systemctl status qemu-guest-agent
```

If you see a dependency failure, check the virtio-serial channel and make sure the agent is enabled in the Proxmox VM configuration.

## Proxmox Guest Agent not running on Windows

For Windows guests, install QEMU Guest Agent from the **VirtIO driver ISO**.

The installer is normally:

```text
guest-agent\qemu-ga-x86_64.msi
```

Use the VirtIO ISO version that matches the rest of the VirtIO drivers installed in the VM.

After installation, open PowerShell:

```powershell
Get-Service QEMU-GA
```

The service should be **Running** and configured to start automatically.

If it is stopped:

```powershell
Start-Service QEMU-GA
Set-Service QEMU-GA -StartupType Automatic
```

Then test from the Proxmox host:

```bash
qm agent <vmid> ping
qm agent <vmid> network-get-interfaces
```

If `Get-Service QEMU-GA` says **Running** but `qm agent <vmid> ping` still fails, reinstalling the MSI is probably not the next thing to try.

The problem is likely the communication channel between Proxmox and the VM.

## Windows Guest Agent installed but still not running

This is especially common if QEMU Guest Agent was enabled in Proxmox after Windows and the VirtIO drivers were already installed.

Try:

1. Disable **QEMU Guest Agent** in the VM options.
2. Fully stop the Windows VM.
3. Enable **QEMU Guest Agent** again.
4. Start the VM.
5. Wait 30–60 seconds.
6. Test:

```bash
qm agent <vmid> ping
```

This forces Proxmox to recreate the device.

## Check the virtio-serial device

Even with the guest agent installed and running, communication can fail if the host/guest channel is missing.

From the Proxmox host:

```bash
qm config <vmid> | grep serial
```

Enabling QEMU Guest Agent is supposed to configure the required channel automatically.

If the agent is enabled and running but Proxmox still cannot reach it:

1. Go to **VM → Options → QEMU Guest Agent**.
2. Disable it.
3. Fully stop the VM.
4. Enable QEMU Guest Agent again.
5. Start the VM.
6. Run:

```bash
qm agent <vmid> ping
```

Do not soft-reboot between those steps.

## Give Proxmox a minute

Proxmox does not update every guest-agent field in the UI instantly.

After starting the VM, wait roughly 30–60 seconds before deciding that it is still broken.

If:

```bash
qm agent <vmid> ping
```

works but the Summary page still does not show the guest IP, refresh the UI after a minute.

If `qm agent` works, communication between the host and guest agent is working.

## Install qemu-ga-x86_64.msi on Windows

For a Windows VM:

1. Get the current stable VirtIO driver ISO.
2. Attach the ISO as a CD/DVD drive to the VM.
3. Open the ISO inside Windows.
4. Run:

```text
guest-agent\qemu-ga-x86_64.msi
```

5. Verify the service:

```powershell
Get-Service QEMU-GA
```

6. Make sure **QEMU Guest Agent** is enabled in Proxmox.
7. Fully stop and start the VM once.
8. Test from the host:

```bash
qm agent <vmid> ping
```

Avoid standalone MSI files from random mirrors. Keeping the guest agent and the rest of the VirtIO stack on matching versions removes another possible source of problems.

## Why QEMU Guest Agent matters

A missing guest agent is not always critical.

Your VM can run normally without it.

But QEMU Guest Agent gives Proxmox additional communication with the guest, including information and operations used for VM management.

Two places where you may notice the difference are shutdowns and backups.

### Clean shutdowns

Without working guest communication, scheduled shutdown or reboot operations can fail or take longer than expected.

### Backup consistency

With a working guest agent, Proxmox can coordinate filesystem freeze/thaw operations during supported snapshot workflows.

Without it, a VM backup can still run, but it may only represent the filesystem as it existed at the instant of the snapshot rather than after guest-assisted quiescing.

If the only symptom is a missing IP address on the Summary page, fixing the agent may not be urgent.

If backups or scheduled VM operations are affected, it is worth fixing.

## FAQ

### Why does Proxmox say “QEMU guest agent is not running” when it is installed?

Because installing the package is only one part of the setup.

Proxmox must also have QEMU Guest Agent enabled for that VM and be able to communicate with the service through the guest channel.

Check:

```bash
qm config <vmid> | grep agent
qm agent <vmid> ping
```

### I reinstalled qemu-guest-agent and it still says not running. What now?

Check the VM configuration and virtio-serial communication before reinstalling it again.

If the service is running, make sure the agent is enabled in Proxmox and fully stop/start the VM.

### Does a normal reboot fix QEMU Guest Agent?

Not always.

If you just enabled QEMU Guest Agent in the Proxmox configuration, fully stopping and starting the VM is safer because the required virtual device is created at power-on.

### How do I fix Proxmox Guest Agent on Ubuntu?

Install and enable it:

```bash
apt install -y qemu-guest-agent
systemctl enable --now qemu-guest-agent
```

Then enable QEMU Guest Agent in Proxmox, fully stop/start the VM and test:

```bash
qm agent <vmid> ping
```

### How do I fix Proxmox Guest Agent on Windows?

Install:

```text
guest-agent\qemu-ga-x86_64.msi
```

from the VirtIO ISO.

Check:

```powershell
Get-Service QEMU-GA
```

Then enable QEMU Guest Agent in Proxmox and fully stop/start the VM.

### `qm agent <vmid> ping` works but the Proxmox UI still says the agent is not running

Wait 30–60 seconds and refresh the page.

If `qm agent <vmid> ping` succeeds, the host can communicate with the guest agent.

### Is it safe to ignore “Guest Agent Not Running”?

Usually, yes, if the VM itself is otherwise healthy and you do not need guest-assisted operations.

But it is worth fixing if you rely on Proxmox for automated shutdowns, guest information or filesystem-consistent snapshots.

---

*Also seeing the subscription warning on a fresh node? Read [Proxmox no valid subscription](/posts/proxmox-no-valid-subscription-fix/). Setting up a Windows lab VM next to this? Guest agent is also why [Minecraft on Proxmox](/posts/minecraft-server-on-proxmox/) mentions it in the pitfalls list.*