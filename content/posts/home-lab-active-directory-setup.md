---
title: "Home Lab Active Directory Setup: A Practical Guide on Proxmox"
date: 2026-08-14
draft: false
description: "How to build an Active Directory lab on Proxmox — domain controller setup, client join, and why it's one of the most valuable skills you can practice at home."
tags: ["proxmox", "homelab", "networking", "windows"]
categories: ["Guides"]
ShowToc: true
TocOpen: true
---

If you're learning IT support, sysadmin work, or cybersecurity, an Active Directory home lab is one of the highest-value things you can build — it's the environment most business networks actually run on, and there's no substitute for hands-on practice with domain controllers, group policy, and DNS/DHCP integration.

The good news: you can build a fully functional AD lab on the same Proxmox host running the rest of your home lab, using free evaluation editions of Windows Server.

## What You'll Need

- **Windows Server 2022 Evaluation ISO** — free, fully functional, with a 180-day evaluation period (extendable via `slmgr` rearm commands if you need longer)
- **Windows 10 or 11 Enterprise Evaluation ISO** — for client machines that join the domain
- **VirtIO drivers ISO** — required for Windows VMs to get proper performance and compatibility under Proxmox; without this, disk and network performance suffer noticeably

Budget at least 8GB RAM and 2 vCPUs for the domain controller alone, plus additional resources for each client VM you add. This is one area where the extra RAM in a 32GB mini PC build genuinely pays off over a 16GB one.

## Step 1: Create an Isolated Network Bridge

Before touching Windows at all, create a dedicated Linux bridge in Proxmox (**System → Network → Create → Linux Bridge**) for your AD lab traffic. Keeping it on its own bridge, separate from your main home network, means lab experiments — including deliberately misconfigured group policies or, if you're using this for security practice, actual attack simulations — can't spill over into the rest of your network.

## Step 2: Build the Domain Controller VM

1. Create a new VM, selecting the Windows Server 2022 evaluation ISO.
2. Add the VirtIO drivers ISO as a second attached drive — Windows won't see your virtual disk during installation without the VirtIO SCSI driver loaded from it.
3. Allocate at least 8GB RAM and 2 CPU cores, set the SCSI controller to **VirtIO SCSI single**, and enable the **QEMU Guest Agent** option in the System tab.
4. Set the network interface to the isolated bridge you created in Step 1.
5. Install Windows Server 2022 (Standard Evaluation, Desktop Experience — the GUI version is easier to manage for a home lab than Server Core).
6. Once Windows is installed, promote the server to a domain controller via **Server Manager → Add Roles and Features → Active Directory Domain Services**, then run the post-deployment configuration to create a new forest.

## Step 3: Configure DNS and DHCP

Your domain controller should also handle DNS for the lab (AD DS installs this automatically) and, optionally, DHCP so client VMs get addresses automatically rather than requiring static configuration on each one. This mirrors how most real business networks are actually configured, which is part of the value of practicing it.

## Step 4: Join Client VMs to the Domain

1. Create Windows 10 or 11 Enterprise Evaluation VMs on the same isolated bridge — these don't need the VirtIO drivers ISO attached, since desktop client installs are less performance-sensitive than the domain controller.
2. Set each client's DNS to point at your domain controller's IP address so it can resolve the domain name.
3. From **System → About → Domain or workgroup**, change the domain to match what you created (e.g., `homelab.local`), and authenticate with domain admin credentials when prompted.
4. Reboot — the client should now show as domain-joined, and you can log in with a domain account rather than a local one.

## Why Bother With Two Client Machines Instead of One

If you're building this lab specifically for security practice rather than general sysadmin learning, having two client machines matters — several common attack techniques (lateral movement, NTLM relay attacks) specifically require more than one machine on the domain to demonstrate realistically. For general AD administration practice, one client is enough to get started.

## Common Mistakes

- **Skipping the VirtIO drivers step on the domain controller.** This is the single most common point where people get stuck — Windows Setup simply won't see a disk to install to without it.
- **Not isolating the lab network.** Running AD lab traffic on the same bridge as your other home lab services isn't dangerous by itself, but it makes cleanup harder and risks DHCP/DNS conflicts with your real network.
- **Forgetting the evaluation license has a clock.** 180 days sounds like a lot until you've been mid-project for five months. Snapshot your VMs once the lab is configured the way you want, so you have a clean rollback point if you need to deal with license expiration.
- **Under-allocating RAM to save resources elsewhere.** A domain controller under 8GB RAM will run, but sluggishly — this isn't the VM to economize on if you're also running several other services on the same host.

## FAQ

**Is this legal to run at home?**
Yes — Microsoft's evaluation editions are specifically provided for testing, learning, and lab use. You're not licensed for production/business use on an evaluation edition, but a home lab is exactly the intended use case.

**Do I need Proxmox specifically, or does this work on other hypervisors?**
The Windows Server and AD DS steps are identical on any hypervisor. Proxmox is popular for this specifically because it's free and the snapshot functionality makes experimenting (and rolling back after breaking something) painless.

**How is this different from just running AD in the cloud (Azure AD lab, etc.)?**
Cloud-hosted labs are convenient but usually cost money past a free trial period, and running locally means no dependency on internet connectivity or a third party's infrastructure while you're learning — you can also practice fully offline once it's set up.

---

*Building this on a fresh Proxmox install? Start with our [beginner's home lab guide](/posts/best-home-lab-for-beginners-2026/) and check our [guest agent troubleshooting guide](/posts/proxmox-guest-agent-not-running-fix/) if your Windows VMs show agent errors after setup.*
