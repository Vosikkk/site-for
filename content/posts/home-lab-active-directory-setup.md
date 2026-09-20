---
title: "Active Directory Home Lab on Proxmox: A Safe Setup Plan"
date: 2026-08-16
lastmod: 2026-09-19
draft: false
description: "Build an isolated Active Directory learning lab on Proxmox with Windows Server, Windows clients, correct DNS naming, VirtIO guidance, and safe rollback."
tags: ["active directory", "proxmox", "windows server", "homelab"]
ShowToc: true
TocOpen: false
---

An Active Directory lab is useful for learning domain controllers, DNS, Group Policy, identity administration, and Windows client management. This guide is a **learning-lab plan**, not a production Active Directory design or security baseline.

> **Evidence note:** The Windows and AD DS guidance below follows current Microsoft documentation; Proxmox-specific guest guidance points to Proxmox documentation. Resource values are conservative starting allocations, not measured performance guarantees. See the [research methodology](/methodology/).

## What You Need

- a Proxmox host with enough spare CPU, memory, and storage for the guests you choose;
- a current Windows Server evaluation ISO from the [Microsoft Evaluation Center](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server-2022);
- one or more Windows client ISOs that you are licensed to use;
- the [Windows VirtIO drivers](https://pve.proxmox.com/wiki/Windows_VirtIO_Drivers) when the VM uses VirtIO storage, network, ballooning, or serial devices;
- an isolated lab network if you plan to test DHCP, DNS failures, offensive-security tools, or intentionally unsafe configurations.

Whether a Windows VM needs a specific VirtIO driver depends on the virtual hardware selected. It does not depend on whether the VM is a server or client, or how “important” the guest is.

## Build the Lab Network First

Create a dedicated Linux bridge for the lab. For a host-only network, do not attach a physical port to the bridge and do not add a default gateway. Also verify that the Proxmox host, router, firewall rules, and any forwarding/NAT configuration do not route that bridge into the household or management network.

A separate bridge is **not an automatic security boundary**. Its isolation depends on the complete network configuration. If the lab will contain intentionally hostile traffic, use explicit firewall rules and verify the path from a client before assuming containment.

## Starting VM Plan

Use this as a planning baseline and adjust after observing the guests:

| VM | Starting allocation | Notes |
|---|---|---|
| Domain controller | 2 vCPU, 4 GB RAM, 60 GB disk | Enough for a small learning lab; GUI roles and extra services can need more. |
| Windows client | 2 vCPU, 4 GB RAM, 64 GB disk | Increase for updates, browsers, or security tooling. |
| Optional second client | 2 vCPU, 4 GB RAM, 64 GB disk | Useful for multi-client policy and lateral-movement exercises. |

These are not Microsoft minimum requirements and not a benchmark. Watch actual memory pressure, storage use, update behavior, and host contention.

## Create the Windows Server VM

1. Create a VM with UEFI/OVMF if that matches the Windows version and your lab plan.
2. Attach the Windows Server ISO and VirtIO driver ISO.
3. If the system disk uses a VirtIO SCSI controller, load the matching storage driver during Windows Setup.
4. If the network device uses VirtIO, install the matching network driver.
5. Connect the VM only to the lab bridge while building the isolated environment.
6. Patch Windows before promoting the machine to a domain controller.

The QEMU Guest Agent is optional for AD DS itself. It gives Proxmox an additional guest-management channel for information and supported operations; it is not what makes Windows capable of a normal ACPI shutdown.

## Choose a DNS Name Deliberately

Do not use `homelab.local`. Microsoft advises avoiding names used by internet-standard special features such as `.local`, and `.local` is used by multicast DNS.

For an isolated example lab, use a reserved testing name such as:

```text
ad.example.test
```

If the lab will integrate with services under a domain you control, a subdomain such as `ad.example.com` is usually easier to operate consistently. Microsoft recommends using names related to a DNS domain registered by the organization and avoiding collision-prone namespaces. See Microsoft's [Active Directory naming guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/naming-conventions-for-computer-domain-site-ou).

## Install AD DS and Create the Forest

Use Server Manager or current Microsoft PowerShell documentation to install the AD DS role and promote the server to a new forest. Record:

- the full DNS domain name;
- the NetBIOS name;
- the Directory Services Restore Mode password;
- the domain controller's static lab IP;
- the DNS settings used by each client.

For a small lab, the domain controller should normally provide DNS to the domain clients. A client that points only to a household router or public resolver may fail to locate AD service records even when basic internet DNS works.

Microsoft's [AD DS overview](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview) explains the directory, DNS, authentication, replication, and policy roles involved.

## Join a Windows Client

1. Connect the client VM to the isolated lab bridge.
2. Set its DNS server to the lab domain controller's IP.
3. Verify that the client can resolve the domain controller and AD service records.
4. Join `ad.example.test` with domain credentials.
5. Restart and sign in with a domain account.

If the client uses VirtIO storage or networking, install the corresponding drivers exactly as you would for the server VM.

## Snapshots Are for Rollback, Not Backup or Licensing

A snapshot can be useful immediately before a risky Group Policy, DNS, or schema experiment. It is not a separate backup, and it should not be treated as a way to bypass evaluation or licensing limits.

Keep any lab state you care about in a separate backup target. Domain controller rollback also has identity and replication implications in multi-DC labs, so read current Microsoft guidance before restoring a snapshot into a replicated environment.

## Useful Lab Exercises

- create users, groups, and organizational units;
- build and test Group Policy Objects;
- practice DNS troubleshooting;
- add a second domain controller and observe replication;
- test least-privilege administrative delegation;
- compare on-premises AD DS with Microsoft Entra ID concepts without treating them as the same product.

## Common Mistakes

- assuming a separate bridge is isolated without checking routing and firewall rules;
- using `.local` for a new AD DNS namespace;
- assigning client DNS to the household router instead of the domain controller;
- assuming every Windows VM needs or does not need VirtIO drivers without checking its configured devices;
- treating a snapshot as the only backup;
- allocating a fixed amount of RAM by folklore instead of observing the workload.

## QEMU Guest Agent: Accurate Expectations

A working guest agent can improve guest visibility and enable supported management operations, including filesystem freeze/thaw coordination in relevant snapshot or backup workflows. Without it, Proxmox can still send a normal virtual power-button/ACPI shutdown request when the guest supports it; the guest agent is not a universal prerequisite for clean shutdown.

If you enable the agent and Proxmox cannot reach it, use the [QEMU Guest Agent troubleshooting guide](/posts/proxmox-guest-agent-not-running-fix/) and the upstream [Proxmox QEMU Guest Agent documentation](https://pve.proxmox.com/wiki/Qemu-guest-agent).
