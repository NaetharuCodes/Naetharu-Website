---
title: "AZ-305: Business Continuity Solutions"
description: "Designing business continuity for the AZ-305 exam — high availability patterns, Traffic Manager, Azure Front Door, multi-region architectures, disaster recovery, and backup design."
pubDate: 2026-06-10
tags: ["Azure", "AZ-305", "Business Continuity", "High Availability"]
draft: false
pathway: "az-305"
pathwayOrder: 3
---

Business continuity design is one of the most judgement-heavy parts of AZ-305. The exam will give you requirements — an RTO of 15 minutes, an RPO of 5 minutes, a budget constraint — and ask you to recommend an architecture. This guide covers the design patterns and their trade-offs, from single-region HA through to active-active multi-region topologies.

## Defining Requirements First

Before choosing any technology, you need to understand what you're protecting against and how much downtime/data loss is acceptable.

**Recovery Time Objective (RTO)** — how long the business can tolerate the service being unavailable. An RTO of 1 hour means you have up to 60 minutes to restore service before business impact becomes unacceptable.

**Recovery Time Actual (RTA)** — how long recovery actually takes. Your architecture must achieve an RTA less than or equal to the RTO.

**Recovery Point Objective (RPO)** — how much data loss is acceptable, measured in time. An RPO of 15 minutes means you can afford to lose up to 15 minutes of transactions.

**Design principle:** the lower the RTO and RPO, the higher the cost and architectural complexity. Always match the solution to the stated requirements — over-engineering for a non-critical workload wastes money.

## Single-Region High Availability

High availability within a single region protects against hardware and infrastructure failures. It does not protect against regional outages.

### Availability Zones

Deploying resources across Availability Zones (AZs) is the baseline HA recommendation for production workloads. Three physically separate datacenters in a region, each with independent power, cooling, and networking.

**Zone-redundant services** — some Azure services spread automatically across zones with no configuration: Zone-Redundant Storage, Azure SQL Database (Business Critical and General Purpose), Azure Kubernetes Service with zone-aware node pools.

**Zonal services** — you pin resources to a specific zone (e.g., a VM in Zone 1). For HA you deploy copies in Zone 2 and Zone 3.

**Zone-redundant + load balanced pattern:** deploy VMs (or App Service instances) across all three zones, fronted by a Standard Load Balancer or Application Gateway with zone redundancy. This is the recommended baseline for stateless compute.

### Availability Sets

Use for VM workloads where AZs are not available for a specific VM size, or for legacy lift-and-shift where AZ-awareness wasn't designed in. Provides rack-level fault isolation within a single datacenter. Lower SLA (99.95%) than AZs (99.99%).

## Global Traffic Distribution

When a workload needs to span regions — either for HA or to serve users globally with low latency — you need a global traffic distribution layer.

### Traffic Manager

Traffic Manager is a DNS-based global load balancer. It does not proxy traffic — it returns a DNS answer that directs the client to the best endpoint. The client then connects directly to that endpoint.

**Routing methods:**

| Method | How it works | Use case |
|---|---|---|
| **Priority** | All traffic to primary; failover to secondary on health check failure | Active-passive DR |
| **Weighted** | Split traffic proportionally across endpoints | Blue/green deploys, gradual traffic migration |
| **Performance** | Route to the endpoint with the lowest latency for the client's location | Serving global users from the nearest region |
| **Geographic** | Route based on the geographic location of the DNS query | Data sovereignty — keep EU users in EU endpoints |
| **Multivalue** | Return multiple healthy endpoints in a single DNS response | Client-side load balancing for UDP applications |
| **Subnet** | Map specific client IP ranges to specific endpoints | Canary releases for known IP ranges |

Traffic Manager health checks the endpoints and removes unhealthy ones from DNS responses. DNS TTL is configurable — lower TTL means faster failover detection but more DNS queries.

**Limitation:** because it's DNS-based, it cannot inspect HTTP traffic, cannot do SSL offload, and cannot cache content. For those capabilities, use Front Door.

### Azure Front Door

Front Door is a global HTTP/S load balancer and CDN with WAF, operating at the Microsoft edge network (over 100 points of presence worldwide). Unlike Traffic Manager, traffic enters the Microsoft network at the closest PoP and is routed internally — this reduces latency and improves resilience.

Capabilities:
- **Global HTTP load balancing** with health probes and instant failover
- **URL path-based routing** — different backends for different paths
- **SSL offload** and custom domains with managed certificates
- **WAF** at the edge, before traffic reaches your origins
- **Caching** at the edge PoPs
- **Private Link origins** — Front Door can connect to your backend via Private Link, keeping origin traffic off the public internet

**When to use Front Door over Traffic Manager:**
- HTTP/S traffic (Front Door is HTTP-aware; Traffic Manager is not)
- Need WAF at the edge
- Need content caching or acceleration
- Want traffic to enter the Microsoft network as early as possible

**When to use Traffic Manager:**
- Non-HTTP protocols (TCP, UDP)
- Simple DNS failover without HTTP features
- Already using Application Gateway per region and need global routing on top

### Combining Traffic Manager and Front Door

For very complex requirements you can layer both — Traffic Manager for non-HTTP global routing, Front Door for HTTP. More commonly, Front Door alone replaces Traffic Manager for HTTP workloads.

## Multi-Region Architecture Patterns

### Active-Passive

One region is live (active); the other is on standby (passive). Traffic only flows to the passive region if the active region fails.

**Cold standby** — the passive region has no running resources. Must be provisioned at failover time. Lowest cost, highest RTO (minutes to hours to provision).

**Warm standby** — the passive region has resources deployed and running at reduced capacity. Failover involves scaling up and redirecting traffic. Moderate cost, RTO in minutes.

**Hot standby** — the passive region runs at full capacity, continuously replicating data, but receives no production traffic. Near-zero RTO, highest cost (you're paying for double the infrastructure).

Active-passive is appropriate when: budget is constrained, the workload can tolerate some failover time, or data replication complexity makes active-active impractical.

### Active-Active

Both (or all) regions receive and process traffic simultaneously. There is no "failover" — a region failure just removes that region from the load balancing pool.

Challenges:
- **Data consistency** — if users can write to either region, writes must be replicated and conflicts resolved. Cosmos DB with multi-region writes is designed for this.
- **Session state** — stateful applications must externalise session state to a shared distributed cache (Azure Cache for Redis) or use cookie-based affinity consistently across regions
- **Database writes** — most relational databases have a single write endpoint. True active-active for relational data requires careful design (read replicas per region, writes routed to primary, or sharding by region)

Active-active is appropriate when: the workload is stateless, data is globally distributed (Cosmos DB), or the cost of downtime significantly exceeds the cost of double infrastructure.

## Disaster Recovery Design

### Azure Site Recovery (ASR)

ASR replicates VMs continuously to a secondary region. The design decisions for ASR:

**Replication policy** — defines RPO (typically 15 seconds for VMware/Azure VMs) and recovery point retention (up to 15 days of recovery points). Choose shorter retention for cost reduction if only recent recovery points are needed.

**Recovery plans** — group VMs by tier and define startup order and automation. A web tier that depends on a database tier should fail over the database first, verify it, then fail over the web tier. Recovery plans support Azure Automation runbooks for custom steps.

**Test failover** — non-disruptive validation in an isolated VNet. Run test failovers regularly and measure RTA against RTO — do not assume the plan works without testing it.

**Network mapping** — maps the source VNet to the target VNet so failover VMs land in the right network. Configure this before you need it, not during a disaster.

**Re-protection and failback** — after a failover, re-protect the failed-over VMs to start replicating back to the original region. Failback reverses the direction. Ensure your failback plan is as well-tested as your failover plan.

### Database DR Options

| Database | DR option | RPO |
|---|---|---|
| Azure SQL Database | Failover groups (auto) / geo-replication (manual) | < 5 seconds |
| SQL Managed Instance | Auto-failover groups | < 5 seconds |
| Cosmos DB | Multi-region replication (automatic failover or manual) | < 15 minutes (configurable) |
| Azure Database for PostgreSQL | Read replicas (manual promote) / Geo-Redundant Backup | Up to 1 hour |
| Storage Accounts (GRS) | RA-GRS read access / manual failover | < 15 minutes |

## Backup Design

### Recovery Services Vault Design

For enterprise deployments, vault design matters:

**One vault per region per workload type** — mixing vault scopes makes it harder to apply consistent policies and manage RBAC. A Production-UKSouth vault and a Production-WestEurope vault keeps each region's backups independent.

**Vault redundancy** — GRS by default (replicates to paired region). Choose LRS to reduce cost if you have ASR covering DR separately and do not need backup data in the secondary region.

**Soft delete** — enabled by default; keep it on. It provides 14 days to recover from accidental or malicious backup deletion. For higher security, enable **immutable vault** — backup data cannot be deleted or modified by anyone, including administrators, during a defined retention period.

### Backup Center

Backup Center provides a single pane of glass for managing backups across multiple vaults, subscriptions, and workload types. Use it to:
- Monitor backup jobs across all vaults from one place
- Enforce backup policies across subscriptions with Azure Policy integration
- Generate compliance reports showing which resources have no backup configured

### Backup Policy Design

Define backup frequency and retention based on the workload:

| Workload tier | Suggested policy |
|---|---|
| Mission-critical production | Hourly enhanced, daily 30 days, weekly 12 weeks, monthly 12 months, yearly 5 years |
| Standard production | Daily, weekly 4 weeks, monthly 6 months |
| Dev/test | Daily, weekly 2 weeks |

Longer retention is cheap for cold storage. The cost of a backup that's "too long" is small; the cost of a backup that wasn't kept long enough is potentially severe.

## Key Exam Points to Remember

- **RTO** = acceptable downtime; **RPO** = acceptable data loss — always start by establishing these before choosing a solution
- **Traffic Manager** is DNS-based (non-HTTP), instant DNS failover, cannot inspect HTTP; **Front Door** is HTTP/S-aware, WAF, caching, PoP-accelerated
- Traffic Manager routing: **Priority** = active-passive DR; **Performance** = lowest latency per region; **Geographic** = data sovereignty
- **Active-passive warm standby** is the most common enterprise DR pattern — balances cost and RTO
- **Active-active** requires stateless compute and a database that supports multi-region writes (Cosmos DB) or careful session state externalisation
- ASR **test failover** runs in an isolated VNet and does not impact production — run it regularly
- **Immutable vault** prevents anyone from deleting backup data — use for ransomware protection
- **Backup Center** provides cross-vault, cross-subscription governance — use it instead of managing vaults individually
- SQL Database **auto-failover groups** provide a single endpoint that survives failover with no connection string change
- **Network mapping** in ASR must be configured before a failover, not during one
