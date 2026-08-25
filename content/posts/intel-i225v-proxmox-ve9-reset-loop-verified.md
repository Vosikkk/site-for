---
title: "Intel I225-V NIC Reset Loop on Proxmox VE 9: What We Know So Far"
date: 2026-08-20
description: "Intel I225-V dropping into NETDEV WATCHDOG reset loops on Proxmox VE 9 with Linux 7.0 kernels? Here's what has actually been reported, how to confirm it, and the current rollback workaround."
tags: ["proxmox", "homelab", "troubleshooting", "networking"]
ShowToc: true
TocOpen: false
---

If an Intel I225-V interface on Proxmox VE 9 starts falling into a repeating `NETDEV WATCHDOG` / `Reset adapter` loop after moving to a 7.0.x Proxmox kernel, there is now at least one well-documented report showing exactly that pattern.

The important caveat is scope: this is **not yet a broadly confirmed Proxmox-wide bug affecting every I225-V or I226-V system**. The strongest current evidence comes from one detailed Proxmox VE 9.2.5 report where the same I225-V hardware was stable on `6.17.13-21-pve` and repeatedly failed on two tested 7.0 kernels.

So treat this as a reproducible regression report and a troubleshooting path — not proof that every `igc`-based NIC is broken on Linux 7.0.

## What the Reported Failure Looks Like

The affected system used an Intel I225-V:

```text
Intel Corporation Ethernet Controller I225-V [8086:15f3] (rev 03)
Kernel driver in use: igc
```

On the affected kernels, the interface repeatedly hit a transmit watchdog timeout, dumped registers, reset the adapter, renegotiated the 2.5GbE link, and then repeated the process.

The useful pattern to look for in `dmesg` or `journalctl -k` is roughly:

```text
NETDEV WATCHDOG: transmit queue timed out
Register Dump
Reset adapter
<bridge> port entered disabled state
NIC Link is Up 2500 Mbps Full Duplex
<bridge> port entered forwarding state
```

In the documented case, the cycle repeated approximately every 10 seconds once it started.

You can check the kernel log with:

```bash
journalctl -k
```

or:

```bash
dmesg -T
```

If you want to narrow it down:

```bash
journalctl -k | grep -Ei 'igc|NETDEV WATCHDOG|Reset adapter'
```

## Check Which NIC You Actually Have

Before assuming this article applies to your system, identify the controller:

```bash
lspci -nn | grep -i ethernet
```

For more detail:

```bash
lspci -vv -s <PCI_ADDRESS>
```

And confirm the driver:

```bash
ethtool -i <interface>
```

The 2026 report this article is based on involved an **Intel I225-V rev 03 using the `igc` driver**.

## Which Kernels Were Actually Tested

In the documented Proxmox VE 9.2.5 case:

| Kernel | Result on that system |
|---|---|
| `6.17.13-21-pve` | Stable |
| `7.0.2-4-pve` | Repeating watchdog/reset loop |
| `7.0.14-8-pve` | Repeating watchdog/reset loop |

That comparison is useful because the hardware, cable, switch port, bridge configuration, and host were unchanged between boots.

It is strong evidence of a kernel-related regression **on that system**.

It is not enough evidence to say that every `7.0.x-pve` kernel is broken on every I225-V installation.

## Why It Looks More Like a Driver Reset Than a Bad Cable

The original report included an `ethtool -S` snapshot where `tx_timeout_count` had climbed dramatically while counters such as CRC errors and collisions remained at zero.

Example counters from that report included:

```text
tx_timeout_count: 278513
rx_crc_errors: 0
tx_carrier_errors: 0
rx_align_errors: 0
collisions: 0
```

The reported PCIe AER status was also clean, and ASPM was already disabled.

That does not prove the exact root cause inside `igc`, but it makes a simple physical-link explanation — such as a bad cable or switch port — less convincing in that specific case, especially because booting the same machine back into `6.17.13-21-pve` restored stability.

## Current Workaround: Boot the Known-Good Kernel

If your symptoms match and you already have a known-good 6.17 kernel installed, the practical short-term workaround is to boot that kernel instead of the affected 7.0 build.

First, list available kernels:

```bash
proxmox-boot-tool kernel list
```

If `6.17.13-21-pve` is installed and you have already confirmed it works on your machine, you can pin it:

```bash
proxmox-boot-tool kernel pin 6.17.13-21-pve
```

Then refresh the boot configuration:

```bash
proxmox-boot-tool refresh
```

Reboot:

```bash
reboot
```

After the system comes back:

```bash
uname -r
```

You should see the kernel you pinned.

### Test a New Kernel Without Permanently Unpinning

Proxmox also supports selecting a kernel for the **next boot only**, which is useful when you want to test whether a newer kernel has fixed the regression:

```bash
proxmox-boot-tool kernel pin <new-kernel-version> --next-boot
```

If the newer kernel works, remove the permanent pin:

```bash
proxmox-boot-tool kernel unpin
proxmox-boot-tool refresh
```

Do not leave an old kernel pinned forever without re-testing newer updates. Kernel updates also carry unrelated fixes and security changes.

## What About Intel I226-V?

This is where the original version of this article was too broad.

Intel I226-V also uses the `igc` driver, and there are older Proxmox forum reports of I226-V systems hitting `NETDEV WATCHDOG` / adapter-reset symptoms on earlier kernel generations.

But that does **not** prove that the specific 2026 regression seen on `7.0.2-4-pve` and `7.0.14-8-pve` affects I226-V too.

So the accurate position right now is:

- **I225-V:** confirmed in the detailed 2026 report.
- **I226-V:** similar `igc` watchdog issues have existed historically, but this specific 7.0 regression is not independently confirmed from the sources reviewed here.

If you have an I226-V and see the same failure pattern after moving from 6.17 to 7.0, compare kernels and collect logs before assuming it is the same bug.

## Is This the Same as the Older 6.8 Regression?

Probably not — and it should not be presented as if that has been proven either.

A reply in the current Proxmox forum thread pointed to Proxmox Bugzilla issue `#6273`, which concerned a similar-looking problem around an older 6.8 kernel regression.

The original reporter responded that their system had previously been stable on 6.8 and was still stable on 6.17, with the failure appearing only after moving to 7.0.

That makes a separate regression plausible, but the exact root cause of the 2026 issue has not been publicly isolated in the sources reviewed here.

In other words: **similar symptom does not automatically mean same bug**.

## What We Still Don't Know

As of August 25, 2026, the public thread reviewed here does not contain a confirmed root-cause patch or a confirmed fixed kernel for this specific I225-V 7.0 regression.

We also do not yet have enough reports to establish:

- which I225-V revisions are affected beyond the documented rev 03 card,
- whether onboard I225-V behaves the same as add-in cards,
- whether I226-V is affected by this exact regression,
- whether offload settings or queue configuration change the behavior,
- which future 7.0 kernel first fixes it.

That uncertainty matters. A troubleshooting article should distinguish what was measured from what is still inference.

## Practical Troubleshooting Checklist

If your I225-V starts resetting after a Proxmox kernel update:

1. Confirm the NIC model with `lspci -nn`.
2. Confirm the `igc` driver with `ethtool -i`.
3. Check `journalctl -k` for `NETDEV WATCHDOG` and `Reset adapter`.
4. Check whether the problem started only after a kernel change.
5. Boot a previously known-good kernel without changing the cable, switch port, or bridge configuration.
6. If the old kernel is stable, pin it temporarily.
7. Keep notes on exact working and failing kernel versions.
8. Re-test newer kernels periodically and remove the pin once the issue is resolved.

That kernel A/B comparison is much more useful than randomly changing five network settings at once.

## FAQ

**Should I downgrade immediately if I have an I225-V?**

No. If your NIC is working normally, there is no reason to roll back preemptively based on one regression report. This is a troubleshooting path for systems actually showing the watchdog/reset pattern.

**Is pinning an older kernel safe?**

It is an officially supported Proxmox mechanism for working around hardware incompatibilities with a newer kernel. The tradeoff is that you are deliberately staying on an older kernel, so re-test newer kernels and remove the pin once the issue is fixed.

**Should I disable TSO, GSO, checksum offload, or ASPM?**

Not as the first step if you can reproduce a clean working-kernel / broken-kernel comparison. In the documented report, ASPM was already disabled and the default offload configuration had not yet been changed. Changing several variables at once makes the regression harder to isolate.

**Is this definitely an upstream Linux `igc` bug?**

The evidence points toward a kernel/driver regression because the same host changes behavior when only the kernel changes, and `igc` is an upstream Linux driver. But the exact offending change or patch has not been established in the public sources reviewed here, so calling the root cause "confirmed" would be premature.

## Sources

- [Proxmox forum: Intel I225-V igc NETDEV WATCHDOG/reset loop on 7.0 kernels; stable on 6.17](https://forum.proxmox.com/threads/intel-i225-v-igc-netdev-watchdog-reset-loop-on-7-0-kernels-stable-on-6-17.185410/)
- [Proxmox VE Administration Guide — kernel pinning](https://pve.proxmox.com/pve-docs/pve-admin-guide.pdf)
- [Older Proxmox I226-V NETDEV WATCHDOG discussion](https://forum.proxmox.com/threads/netdev-watchdog-enp4s0-igc-transmit-queue-0-timed-out-intel-i226-v.135266/)
- [Older I225-V / I226-V kernel regression discussion](https://forum.proxmox.com/threads/weird-bond-issue-since-8-1-i225-v-bug.137162/)

---

*Running a GMKtec K8 Plus or another dual-2.5GbE mini PC? Our [GMKtec K8 Plus review](/posts/gmktec-k8-plus-for-proxmox/) covers its i226V networking hardware. If you're chasing a different networking issue, our [Wake-on-LAN troubleshooting guide](/posts/proxmox-wake-on-lan-not-working/) covers another common class of NIC problems.*
