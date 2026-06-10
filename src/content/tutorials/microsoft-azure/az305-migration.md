---
title: "AZ-305: Migration Solutions"
description: "Designing migration solutions for the AZ-305 exam — Azure Migrate, Database Migration Service, Data Box, migration patterns, and cost estimation."
pubDate: 2026-06-10
tags: ["Azure", "AZ-305", "Migration"]
draft: false
pathway: "az-305"
pathwayOrder: 6
---

Migration design in AZ-305 tests your ability to assess on-premises workloads, choose the right migration approach, select the appropriate Azure services, and manage the migration process. This guide covers the migration tooling, the five Rs of migration strategy, and the decisions that determine whether a workload lifts-and-shifts or gets rearchitected.

## Migration Strategy: The Five Rs

Before choosing a tool, decide on the migration approach. The classic framework is the Five Rs — sometimes extended to six or more, but these five cover the AZ-305 scope:

**Rehost (lift-and-shift)** — move the workload to Azure with no code changes. A VM in a datacenter becomes a VM in Azure. Fast, low risk, low cloud benefit. Appropriate for tight timelines, legacy applications, or as a first step before optimisation.

**Replatform (lift-and-optimise)** — make targeted changes to take advantage of managed services without full rearchitecture. An on-prem SQL Server moves to Azure SQL Database (still relational, still SQL, but now managed). Moderate effort, moderate benefit.

**Refactor** — modify the application code to work with cloud-native services. A monolith broken into microservices deployed on Container Apps. Higher effort, higher long-term benefit.

**Rearchitect** — significantly alter the application design. Rebuild for cloud-native patterns — serverless, event-driven, global distribution. Highest effort, highest benefit.

**Retire** — decommission the workload. Not everything needs to move to Azure. An application with no active users or business value should be turned off, not migrated.

The AZ-305 exam tests which strategy is appropriate given a set of requirements. Key signals:
- "Minimal changes, move quickly" → Rehost
- "Replace managed components, keep the app" → Replatform
- "Modernise the application" → Refactor or Rearchitect
- "Application is unused / redundant" → Retire

## Azure Migrate

Azure Migrate is the hub for migration projects — it provides discovery, assessment, and migration tooling for servers, databases, web apps, and virtual desktops.

### Discovery and Assessment

**Discovery** — the Azure Migrate appliance is a lightweight VM (or physical server) deployed on-premises. It continuously discovers VMware, Hyper-V, or physical servers and sends metadata (CPU, memory, disk, network, installed software) to Azure Migrate in the cloud. No agent is required on the discovered machines.

For VMware, the appliance connects to vCenter Server. For Hyper-V, it connects to the Hyper-V host. For physical servers and other hypervisors, it uses direct WMI/SSH access.

**Assessment types:**

| Assessment | What it evaluates | Output |
|---|---|---|
| **Azure VM assessment** | Is this server suitable for IaaS migration? | Recommended VM size, estimated cost |
| **Azure SQL assessment** | Which managed SQL service fits this database? | SQL Database, SQL MI, or SQL on VM recommendation with issues |
| **Azure App Service assessment** | Can this web app run on App Service? | Readiness, App Service Plan recommendation |
| **AVS assessment** | Can this VMware workload move to Azure VMware Solution? | Node requirements, cost |

**Readiness categories:**
- *Ready* — can migrate as-is
- *Ready with conditions* — can migrate after addressing specific issues (e.g., an unsupported OS that needs upgrading)
- *Not ready* — a blocking issue prevents migration (e.g., unsupported feature in SQL MI)
- *Unknown* — insufficient data

**Sizing criteria:**
- *Performance-based* — sizes the Azure resource based on actual observed CPU, memory, and disk usage. Recommended — avoids over-provisioning.
- *As on-premises* — sizes the Azure resource to match the on-prem configuration. Often results in larger (and more expensive) VMs than necessary.

Always use performance-based sizing for assessments unless you have a specific reason to match on-prem specs exactly.

**Comfort factor** — a multiplier applied to the assessed performance data before sizing (default 1.3 = 30% headroom). Accounts for performance spikes not captured in the assessment window.

### Server Migration

After assessment, Azure Migrate: Server Migration handles the actual replication and migration.

**VMware (agentless)** — replication uses VMware snapshot APIs. No agent on the VMs. Requires the Azure Migrate appliance and appropriate permissions on vCenter. Supports up to 500 VMs simultaneously.

**VMware (agent-based)** — installs the Mobility Service agent on each VM. More control, supports more scenarios (e.g., VMs that can't be snapshotted), slightly more overhead.

**Hyper-V** — agentless, using Hyper-V replication. A provider is installed on the Hyper-V host, not individual VMs.

**Physical / other** — agent-based using the Mobility Service. Covers physical servers, AWS VMs, GCP VMs, and any other hypervisor.

**Migration workflow:**
1. Enable replication — initial replication copies the full disk
2. Monitor replication — delta changes are continuously replicated
3. Test migration — bring the VM up in Azure in a test VNet to validate it works correctly (non-disruptive, does not affect replication)
4. Migrate — stop replication, complete the final delta sync, boot the VM in Azure
5. Verify and decommission — confirm the workload is healthy, then decommission the on-prem source

## Database Migration Service (DMS)

Azure Database Migration Service (DMS) migrates databases from on-premises (or cloud) sources to Azure managed database services.

### Migration Modes

**Offline migration** — take the source database offline, migrate, cut over. Simpler, less tooling. Downtime equals migration duration. Appropriate when downtime is acceptable.

**Online migration** — continuously replicate changes from source to target while both are running. Cut over with minimal downtime (seconds to minutes). Requires the source to have sufficient change capture capability (SQL Server CDC, Oracle LogMiner, etc.).

### Supported Sources and Targets

| Source | Target | Mode |
|---|---|---|
| SQL Server (on-prem, VM) | Azure SQL Database | Online and offline |
| SQL Server (on-prem, VM) | SQL Managed Instance | Online and offline |
| MySQL (on-prem) | Azure Database for MySQL | Online and offline |
| PostgreSQL (on-prem) | Azure Database for PostgreSQL | Online and offline |
| Oracle | Azure Database for PostgreSQL | Offline |
| MongoDB | Azure Cosmos DB (Mongo API) | Offline |

**SQL MI online migration note:** requires the source SQL Server to have SQL Server Agent running and the database in full recovery model with a log backup chain. Plan for this ahead of migration day.

### Database Assessment Before Migration

Use the **Database Migration Assessment (DMA)** tool to assess SQL Server databases before migration:
- Identifies features used that are not supported in the target (e.g., cross-database queries for SQL Database)
- Flags deprecated features
- Recommends the appropriate target (SQL Database vs SQL MI vs SQL on VM)
- Identifies performance improvements from index or query changes

Run DMA assessments early — blocking issues take time to resolve.

## Data Migration: Azure Data Box

When the volume of data to move is too large for network transfer to be practical, **Data Box** provides physical data transfer devices.

| Product | Capacity | Use case |
|---|---|---|
| **Data Box Disk** | Up to 35 TB (5 × 8TB SSDs) | Small-to-medium offline transfers |
| **Data Box** | 80 TB usable | Standard large offline transfer |
| **Data Box Heavy** | 770 TB usable | Massive datasets, large-scale migrations |

Microsoft ships the device to you. You copy data to it. You ship it back. Microsoft uploads the data to your storage account. The device is then securely wiped.

**When to use Data Box instead of network transfer:**

A rough rule: if transferring the data at your available bandwidth would take more than a week, Data Box is worth considering.

```
Time to transfer = Data size / Available bandwidth
Example: 50 TB at 100 Mbps = 50 × 1024 × 1024 MB / (100 / 8 MB/s) = ~46 days
→ Data Box is significantly faster
```

**Data Box use cases:**
- One-time large data migrations (media archives, scientific datasets, backup archives)
- Initial seeding for ongoing replication (migrate the bulk via Data Box, then use online replication for deltas)
- Environments with limited or unreliable internet connectivity

**Data Box Import vs Export:**
- *Import* — move data from on-premises to Azure (most common)
- *Export* — move data from Azure to on-premises (for DR data retrieval, decommission, compliance)

## Web App Migration

### App Service Migration Assistant

The App Service Migration Assistant is a free tool that assesses and migrates ASP.NET and PHP web apps from IIS to Azure App Service.

It runs on the IIS server, analyses the web application, identifies potential compatibility issues, and can perform the migration automatically including DNS cutover. For apps without breaking issues, this is the fastest path to App Service.

### App Containerisation

For apps that can't run on App Service directly (non-IIS, custom runtime, complex dependencies), Azure Migrate includes **App Containerisation** — it analyses the running application on the server, generates a Dockerfile and Kubernetes manifest, builds a container image, and publishes it to Azure Container Registry for deployment to AKS or App Service.

## Cost Estimation

### Azure Pricing Calculator

The Pricing Calculator lets you build up a cost estimate for a proposed architecture by selecting services and configuring their parameters. Use it to:
- Estimate the monthly cost of a proposed Azure architecture
- Compare configurations (e.g., Consumption vs Premium Functions tier)
- Model reserved instance vs pay-as-you-go savings

Export the estimate as a report for stakeholder review.

### Total Cost of Ownership (TCO) Calculator

The TCO Calculator estimates the cost savings of migrating from on-premises to Azure. You input your on-prem infrastructure (servers, storage, networking, licensing) and the tool models the Azure equivalent plus the operational savings (reduced datacenter costs, hardware refresh, staff time).

Use the TCO Calculator for the business case — it demonstrates ROI to decision makers, not technical configuration.

### Azure Advisor Cost Recommendations

After migration, Advisor continuously analyses your deployed resources and flags cost optimisation opportunities:
- Underutilised VMs (low CPU, eligible for right-sizing or shutdown)
- Unattached managed disks
- Reserved instance recommendations based on your actual usage patterns
- Unused public IP addresses

Review Advisor recommendations regularly post-migration — the first 30–90 days often reveal resources that were sized too large or are running when they don't need to be.

## Key Exam Points to Remember

- **Five Rs:** Rehost (no change), Replatform (managed services), Refactor (code changes), Rearchitect (redesign), Retire (decommission)
- "Move quickly, minimal change" = **Rehost**; "modernise" = **Refactor/Rearchitect**
- Azure Migrate appliance connects to **vCenter** (VMware) or the **Hyper-V host** (not individual VMs) — no agent on discovered machines
- Always use **performance-based sizing** for assessments — as-on-premises sizing over-provisions
- **Online migration** (DMS) = minimal downtime, requires CDC/log chain; **offline migration** = simpler, full downtime
- DMS online migration to **SQL MI** requires full recovery model and SQL Server Agent on the source
- Use **Data Box** when network transfer would take more than ~1 week — the break-even is roughly 40TB on a 100Mbps line
- **Data Box Export** moves data *from* Azure to on-premises (reverse direction)
- **TCO Calculator** = business case / cost saving argument; **Pricing Calculator** = architecture cost estimate
- Run **DMA (Database Migration Assessment)** before DMS migration — blocking issues need time to resolve
