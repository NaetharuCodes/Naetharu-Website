---
title: "AZ-104: Monitoring and Backup"
description: "A practical guide to Azure monitoring and backup for the AZ-104 exam — Azure Monitor, Log Analytics, alerts, diagnostic settings, Azure Backup, and Site Recovery."
pubDate: 2026-06-10
tags: ["Azure", "AZ-104", "Monitoring", "Backup"]
draft: false
pathway: "az-104"
pathwayOrder: 5
---

Monitoring and backup is the operational backbone of running workloads in Azure. The AZ-104 exam tests your ability to configure observability across Azure resources, set up alerting, and protect workloads against data loss and outages. This guide covers Azure Monitor, Log Analytics, the alerting pipeline, Azure Backup, and Azure Site Recovery.

## Azure Monitor

Azure Monitor is the umbrella platform for all observability in Azure. Everything else in this guide — Log Analytics, alerts, metrics — is part of or integrates with Azure Monitor.

It collects two types of data:

- **Metrics** — numeric time-series data sampled at regular intervals (typically every minute). CPU percentage, network bytes in, request count. Stored in a metrics database and retained for 93 days.
- **Logs** — structured records of events, with arbitrary fields. Stored in a Log Analytics workspace and queryable with Kusto Query Language (KQL).

### Metrics Explorer

Metrics Explorer in the portal lets you chart any metric for any resource, apply aggregations (average, sum, min, max, count), and pin charts to dashboards. You can also split metrics by dimension — for example, break down HTTP request count by status code.

Metrics are available by default for most Azure resources with no configuration required.

### Diagnostic Settings

Metrics Explorer covers the last 93 days of platform metrics. To retain metrics longer, query logs alongside metrics, or send data to an external system, you configure **diagnostic settings** on a resource.

Diagnostic settings let you route:
- **Resource logs** (formerly diagnostic logs) — detailed operation logs for the resource
- **Platform metrics** — send the metrics to a log destination
- **Activity log entries** — subscription-level administrative events

Destinations:
- **Log Analytics workspace** — enables KQL querying and integration with Monitor alerts
- **Storage account** — cheap long-term archival
- **Event Hub** — stream to an external SIEM or monitoring platform

Most resources support diagnostic settings, but the available log categories vary per resource type. Common ones: `StorageRead`, `StorageWrite`, `StorageDelete` for storage accounts; `QueryStoreRuntimeStatistics`, `Errors` for databases.

> **Exam tip:** Diagnostic settings are not enabled by default. If you're asked why you can't see detailed logs for a resource, the answer is almost always that diagnostic settings haven't been configured.

### Activity Log

The Activity Log records every management-plane operation against your Azure resources — who created what, when, what changed. It's automatically available at subscription scope with no configuration.

Retention in the portal is 90 days. To retain longer, send the Activity Log to a Log Analytics workspace or storage account via a diagnostic setting.

The Activity Log is the right place to answer questions like: "Who deleted that resource group?" or "When was this VM resized, and who did it?"

## Log Analytics

Log Analytics is the log aggregation and query engine within Azure Monitor. You create a **Log Analytics workspace** and then send logs to it from multiple resources and services.

### Kusto Query Language (KQL)

Logs in a workspace are queried with KQL. For the exam you don't need to write complex queries, but you should understand the basic structure:

```kusto
// Query VMs that had high CPU in the last hour
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor"
| where CounterName == "% Processor Time"
| where CounterValue > 90
| summarize avg(CounterValue) by Computer
| order by avg_CounterValue desc
```

The pipe `|` passes results from one operator to the next. Common operators: `where`, `project`, `summarize`, `order by`, `join`, `extend`.

### Azure Monitor Agent

To collect logs and metrics from inside a VM (OS-level events, application logs, custom performance counters), you need the **Azure Monitor Agent (AMA)** installed on the VM. AMA replaces the older MMA (Microsoft Monitoring Agent) and OMS agent.

AMA uses **Data Collection Rules (DCRs)** — JSON documents that define what to collect (Windows event logs, Linux syslog, performance counters) and where to send it (one or more Log Analytics workspaces).

DCRs can be associated with individual VMs or with Azure Policy to automatically apply to all VMs in a scope.

### Container Insights

Container Insights is a feature of Azure Monitor specifically for AKS. It collects logs, metrics, and live data from Kubernetes nodes, pods, and containers. It provides prebuilt dashboards and alerts for common Kubernetes health scenarios.

## Alerts

Azure Monitor alerts notify you when a condition is met on your data. An alert pipeline has three components: **alert rules**, **action groups**, and **alert processing rules**.

### Alert Rules

An alert rule monitors a specific signal and fires when a condition is true. Three types of alert rules:

**Metric alerts** — evaluate a metric against a threshold. Near real-time (fires within a minute of the condition being true). Example: "Alert if CPU percentage > 80% for 5 minutes."

**Log search alerts** — run a KQL query on a schedule and alert if the results meet a condition. Less real-time (minimum frequency is 1 minute for frequent evaluation, typically 5 minutes). Example: "Alert if any failed login event appears in the last 5 minutes."

**Activity log alerts** — fire on specific Activity Log events. Example: "Alert whenever a VM is deleted" or "Alert on any Policy non-compliance event."

### Action Groups

An action group defines what happens when an alert fires — who gets notified and how, and what automation runs. One action group can be shared across many alert rules.

Notification types:
- Email
- SMS
- Voice call
- Azure app push notification

Action types:
- **Automation Runbook** — trigger an Azure Automation runbook
- **Azure Function** — call a Function App
- **Logic App** — trigger a Logic App workflow
- **Webhook** — POST to any HTTPS endpoint
- **ITSM** — create a ticket in a connected ITSM tool (ServiceNow, etc.)
- **Event Hub** — send to an Event Hub

### Alert Processing Rules

Alert processing rules filter or modify alerts after they fire. Common uses:
- **Suppress** alerts during a maintenance window so on-call isn't paged for expected downtime
- **Add action groups** to existing alerts without editing each rule individually

## Azure Monitor Workbooks

Workbooks are interactive report documents inside Azure Monitor. They combine KQL queries, metrics charts, text, and parameters into a shareable, reusable document. Useful for building operational runbooks and dashboards that teams can use without knowing KQL.

Workbooks support parameters — a dropdown that changes which resource or time range the queries run against.

## Azure Backup

Azure Backup is a cloud-based backup service for Azure and on-premises workloads. It stores backup data in a **Recovery Services Vault** and manages scheduling, retention, and encryption.

### Recovery Services Vault

A Recovery Services Vault is the container for backup data. It's region-specific — the vault and the resources it protects must be in the same region. One vault can protect many different resource types.

The vault has:
- **Backup policies** — define frequency and retention (daily, weekly, monthly, yearly)
- **Geo-redundancy settings** — whether backup data is replicated to a paired region (GRS, the default) or stays local (LRS)
- **Soft delete** — keeps deleted backup data for 14 additional days, protecting against accidental or malicious deletion. Enabled by default.

### What Azure Backup Can Protect

| Workload | How |
|---|---|
| Azure VMs | Snapshot-based, agent-optional, application-consistent |
| Azure Files | Share-level snapshots |
| Azure Blobs | Continuous backup with point-in-time restore |
| SQL Server in Azure VM | Log backups with application-consistent recovery |
| SAP HANA in Azure VM | Application-consistent, certified by SAP |
| On-prem Windows Server | Microsoft Azure Recovery Services (MARS) agent |
| On-prem VMware / Hyper-V | Azure Backup Server (MABS) or DPM |

### VM Backup

Azure Backup takes **snapshots** of VM disks. The first backup is a full snapshot; subsequent backups are incremental.

Backup frequency options:
- **Enhanced policy**: hourly (every 1, 2, 4, 6, 8, or 12 hours) — supports multiple restore points per day
- **Standard policy**: once daily

Restore options:
- **Restore VM** — create a new VM from the restore point
- **Restore disks** — restore the managed disks and attach manually
- **File recovery** — mount the backup disk as a network share and copy individual files
- **Cross-region restore** — restore to the paired region (requires GRS vault and cross-region restore enabled)

### Backup Policies and Retention

A backup policy defines:
- **Schedule** — when backups run
- **Retention** — how long each type of restore point is kept

Example retention:
- Daily restore points kept for 30 days
- Weekly restore points kept for 12 weeks
- Monthly restore points kept for 12 months
- Yearly restore points kept for 3 years

The GFS (Grandfather-Father-Son) retention model is the standard approach — it keeps short-term daily points alongside longer-term weekly and monthly points.

## Azure Site Recovery (ASR)

Azure Site Recovery is a disaster recovery service — it replicates workloads to a secondary location so you can fail over if the primary location becomes unavailable. Where Azure Backup is about restoring from a point in time, ASR is about getting back online as fast as possible.

### Key Concepts

**Recovery Point Objective (RPO)** — the maximum acceptable data loss, measured in time. If your RPO is 15 minutes, you can afford to lose up to 15 minutes of data.

**Recovery Time Objective (RTO)** — the maximum acceptable time to restore service after a failure.

ASR provides continuous replication, so RPO is typically minutes.

### What ASR Replicates

- **Azure VM to another region** — most common AZ-104 scenario. Replicate VMs from one Azure region to another.
- **On-prem VMware / Hyper-V to Azure** — migrate or protect on-prem VMs to Azure.
- **Physical servers to Azure** — replicate physical Windows or Linux servers.

### ASR Workflow

1. **Enable replication** — specify the source VM, target region, replication settings, and target resource configuration
2. **ASR installs the Mobility Service** on the VM (automatically if using agentless replication for VMware)
3. **Initial replication** — a full copy of the VM disk is replicated to the target region
4. **Ongoing replication** — changes are continuously replicated to stay in sync
5. **Test failover** — run a non-disruptive test to verify the VM boots correctly in the target region (uses a separate test VNet, does not affect production)
6. **Failover** — in a real disaster, trigger failover to bring up the VM in the target region. Can be planned (graceful, no data loss) or unplanned (immediate, minimal data loss depending on RPO)
7. **Failback** — once the primary region is restored, replicate back and fail over to the original location

### Recovery Plans

A recovery plan groups multiple VMs and defines the failover order and any automation steps (scripts, manual steps). This lets you orchestrate a full application failover — for example, fail over the database tier first, then the application tier, then the web tier — in one operation.

Recovery plans are essential for multi-tier applications where startup order matters.

> **Exam tip:** Always test your recovery plan with a test failover before you need it. ASR test failovers are non-disruptive, and you'll know your RTO target is achievable only after running the test.

## Key Exam Points to Remember

- **Metrics** are stored for 93 days; **logs** have configurable retention in a Log Analytics workspace
- **Diagnostic settings** are not enabled by default — you must configure them per resource
- The **Activity Log** is always on and covers 90 days; send to a workspace or storage for longer retention
- Alert rule types: **metric** (near real-time), **log search** (KQL-based, scheduled), **activity log** (event-based)
- **Action groups** define notifications and automations — one group can be reused across many alert rules
- **Alert processing rules** suppress or modify alerts (e.g., silence during maintenance windows)
- Recovery Services Vault must be in the **same region** as the resources it protects
- Azure Backup **soft delete** keeps deleted backup data for 14 days by default — protects against accidental deletion
- ASR **test failover** is non-disruptive — always run one before relying on your DR plan
- RPO = acceptable **data loss** (time); RTO = acceptable **downtime** (time) — know the difference
- **Recovery plans** in ASR allow ordered, automated failover of multi-tier applications
