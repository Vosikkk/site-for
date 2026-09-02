---
date: 2026-09-02
description: Get notified when a Proxmox or PBS backup fails. See how
  Proxmox backup notifications work and test a simple Telegram alert
  with no monitoring dashboard.
ShowToc: true
tags:
- proxmox
- proxmox backup
- telegram
- notifications
- pbs
title: "Proxmox Backup Notifications: Get Failed Backup Alerts in
  Telegram"
TocOpen: false
---

A Proxmox backup can fail at 2 AM while everything else keeps running
normally.

Your VMs are still up. The host looks healthy. Nothing forces you to
open the backup logs.

Then a few days later you discover that the backup you assumed was
running every night hasn't been working.

For backups, I don't want another monitoring dashboard.

I want this:

``` text
❌ PBS backup FAILED
node pve1 · 02:14
```

One message when the backup breaks.

## How Proxmox Backup Notifications Work

Proxmox VE and Proxmox Backup Server include a notification system that
can route events to different notification targets.

Depending on your setup, those targets can include email, Gotify, and
webhooks.

Webhook notifications are particularly useful because they let Proxmox
send an HTTP request to another service when an event occurs.

A webhook can include notification data such as:

``` text
title
message
severity
timestamp
fields
```

Matchers can then control which notifications reach a target.

That means you don't necessarily have to forward every informational
event. You can route the events you actually care about --- such as
errors from backup jobs.

## The Problem With Proxmox Backup Alerts

There are already plenty of ways to monitor a homelab.

You can run Prometheus and Grafana. You can use Netdata, Gotify, email
alerts, or build a much larger monitoring stack.

Those tools make sense when you want to monitor the whole environment.

But backup failures are a much narrower problem.

I don't need another page showing CPU usage, memory utilization, disk
graphs, load averages, or 30 days of metrics.

I need to know whether the backup worked.

If it failed, tell me.

## Telegram Notifications for Failed Proxmox Backups

Proxmox webhook notifications make a simple flow possible:

``` text
Proxmox / PBS
      ↓
backup failure
      ↓
webhook
      ↓
Telegram alert
```

The result could be as simple as:

``` text
❌ PBS backup FAILED
node pve1 · 02:14
```

There is another important detail here: the receiver should ideally live
outside the Proxmox host it is monitoring.

If your alerting service dies together with your homelab, it can't tell
you that something went wrong.

A tiny external receiver avoids that problem.

## I'm Testing a Simpler Proxmox Backup Alert

I'm experimenting with exactly that idea for RunAHomeLab.

Not a monitoring platform. Not another dashboard.

Just:

> **Proxmox backup failed → one Telegram message.**

But I'm not building the full service yet.

Before adding accounts, billing, history, multiple integrations, or any
of the other things that turn a tiny utility into a SaaS project, I want
to find out whether Proxmox users actually want it.

So I built the smallest possible test.

## Try a Proxmox Backup Alert in Telegram

The current test does **not** connect to your Proxmox server.

Instead, it sends you an example of what a failed backup notification
would look like:

``` text
✅ Test alert delivered

This is what you'd get when a Proxmox/PBS backup fails:

❌ PBS backup FAILED
node pve1 · 02:14
```

After receiving the test alert, you can tell me whether you'd actually
connect something like this to your Proxmox or PBS server.

**[Send me a test backup
alert](https://runahomelab-backup-alert-validation-production.up.railway.app/)**

It takes a few seconds and doesn't require connecting your homelab.

## What I'd Build If People Actually Want It

The first real version would stay deliberately small:

-   a personal webhook URL
-   failed Proxmox/PBS backup alerts
-   Telegram delivery
-   basic node/job information
-   no agent running in your homelab
-   no monitoring dashboard

Proxmox would send the backup notification to the external receiver, and
the receiver would forward the useful part to your Telegram chat.

That's it.

## What About a Backup That Never Runs?

There is a second failure mode that's arguably even more dangerous.

An explicit backup failure can produce an error notification.

But what if the expected backup doesn't happen at all?

For example, if something prevents the scheduled job from running, there
may be no failed backup event to forward.

An external receiver could eventually solve this too by tracking the
last successful backup.

Instead of waiting for an error, it could notice:

``` text
⚠️ No successful backup received
node pve1 · 26 hours
```

That would catch a different class of backup problems.

But that's intentionally not part of the first version.

First I want to answer the simpler question:

**Do enough Proxmox users want one-message backup alerts in the first
place?**

## Test It

If you run Proxmox VE or Proxmox Backup Server and you'd want to know
immediately when a backup fails:

**[Send me a test Telegram backup
alert](https://runahomelab-backup-alert-validation-production.up.railway.app/)**

If enough people actually want to connect it to their homelab, I'll
build the real Proxmox webhook receiver next.
