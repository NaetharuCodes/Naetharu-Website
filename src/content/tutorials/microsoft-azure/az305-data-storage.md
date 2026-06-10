---
title: "AZ-305: Data Storage Solutions"
description: "Designing data storage solutions for the AZ-305 exam — Azure SQL, SQL Managed Instance, Cosmos DB, Data Lake Storage, and data integration with Synapse and Data Factory."
pubDate: 2026-06-10
tags: ["Azure", "AZ-305", "Data", "Storage"]
draft: false
pathway: "az-305"
pathwayOrder: 2
---

Data storage design in AZ-305 is about selecting the right service for the workload — relational vs non-relational, operational vs analytical — and then designing it to meet requirements for performance, scalability, availability, and compliance. This guide covers the full range from Azure SQL through Cosmos DB to data integration services.

## Relational Data Storage

### Azure SQL Database

Azure SQL Database is the fully managed PaaS relational database service. No OS or SQL Server instance to manage — Microsoft handles patching, backups, and HA automatically.

#### Purchasing Models

**DTU (Database Transaction Unit)** — a bundled measure of CPU, memory, and I/O. Simple to reason about but less flexible. Three tiers: Basic, Standard, Premium. Choose DTU for simpler workloads where you don't need to tune compute and storage independently.

**vCore** — choose the number of virtual cores and storage independently. Three tiers:

| Tier | Purpose | Key feature |
|---|---|---|
| **General Purpose** | Most workloads | Remote storage (Azure Premium), 5-nines HA |
| **Business Critical** | High I/O, low latency | Local SSD, built-in read replica, 5-nines HA |
| **Hyperscale** | Very large databases (up to 100TB) | Distributed storage, fast backups, multiple replicas |

**Serverless** — a compute tier within General Purpose vCore. Compute scales automatically between a minimum and maximum vCore count, and pauses entirely when idle (you only pay for storage during pause). Ideal for intermittent, unpredictable workloads.

#### High Availability

All Azure SQL tiers include built-in HA:
- **General Purpose** uses remote storage with automatic failover to a standby node (no data loss, recovery in ~30 seconds)
- **Business Critical** uses an Always On availability group across 4 replicas — one of which is exposed as a free read-only endpoint

#### Geo-Replication and Failover Groups

**Active geo-replication** creates readable secondary databases in up to 4 other regions. Failover is manual — you initiate it. Secondaries are readable and can serve read traffic.

**Auto-failover groups** add an automatic failover policy and a single connection endpoint that always points to the primary. On failover, the endpoint updates automatically — no application connection string change required. Failover groups can contain multiple databases.

**When to design with failover groups:** any application requiring automatic disaster recovery with minimal application change.

#### Elastic Pools

An elastic pool is a shared resource pool (DTUs or vCores) across multiple databases. Databases draw from the pool on demand. Cost-effective when databases have different peak times — a pool of 10 databases may only need enough resources for 3–4 to peak simultaneously.

**When to design with elastic pools:** SaaS applications with many tenant databases that have variable, non-overlapping usage patterns.

### Azure SQL Managed Instance

SQL Managed Instance (SQL MI) offers near-100% compatibility with on-premises SQL Server — features that SQL Database does not support, such as SQL Agent, cross-database queries, CLR, linked servers, and Database Mail, all work in SQL MI.

Key design characteristics:
- **VNet-injected** — deployed into a dedicated subnet within your VNet. It has a private IP and no public endpoint by default (public endpoint is optional and disabled by default)
- Instance-level features are available (not just database-level)
- Supports Business Critical and General Purpose service tiers
- Backup to Azure Blob Storage is built in; COPY_ONLY backups to your own storage are also supported

**When to choose SQL MI over SQL Database:**
- Migrating an on-prem SQL Server workload that uses SQL Agent, cross-database transactions, or CLR
- Requirement for the database to be accessible only via private network
- Need for instance-level features

**When to choose SQL Database over SQL MI:**
- New applications designed for the cloud
- Simpler management, finer-grained pricing, more flexible scaling
- Serverless and Hyperscale are not available in SQL MI

### SQL Server on Azure VM

Running SQL Server on an Azure VM gives you full control — any SQL Server version, any edition, any feature. You manage the OS, SQL Server, patching, HA, and backups yourself (or use Azure's integrated tooling).

**When to choose SQL on VM:**
- Legacy SQL Server version required (SQL Server 2008, for example, runs on a VM but not on SQL Database or SQL MI)
- Windows Authentication with on-prem domain required in a configuration SQL MI does not support
- Custom OS configuration required
- Azure Hybrid Benefit to use existing SQL Server licences

HA on SQL VM is achieved through **Always On Availability Groups** deployed across VMs in different Availability Zones or an Availability Set, fronted by an Azure Internal Load Balancer acting as the AG listener.

### Decision Framework

| Requirement | Best choice |
|---|---|
| New cloud app, simple relational data | SQL Database |
| Lift-and-shift SQL Server with SQL Agent, CLR, linked servers | SQL Managed Instance |
| Legacy SQL version, full OS control | SQL Server on Azure VM |
| Many databases with variable peak usage | SQL Database Elastic Pool |
| Very large database (> 4TB), fast restores | SQL Database Hyperscale |
| Automatic cross-region failover, single endpoint | SQL Database with Failover Groups |

## Non-Relational Data Storage

### Azure Cosmos DB

Cosmos DB is Azure's globally distributed, multi-model NoSQL database. It guarantees single-digit millisecond response times at any scale, with SLAs covering latency, throughput, availability, and consistency.

#### APIs

Cosmos DB supports multiple APIs — you choose the one that matches your application's data model:

| API | Data model | When to use |
|---|---|---|
| **Core (SQL)** | Document (JSON) | New applications, richest feature set |
| **MongoDB** | Document (BSON) | Migrating existing MongoDB apps |
| **Cassandra** | Wide-column | Migrating Cassandra workloads, time-series |
| **Gremlin** | Graph | Social graphs, recommendation engines, network topology |
| **Table** | Key-value | Migrating Azure Table Storage with better performance |

Once an account is created with a specific API, it cannot be changed.

#### Consistency Levels

Cosmos DB offers five consistency levels, trading latency and throughput against data freshness guarantees. Stronger consistency = higher read latency and lower throughput.

| Level | Guarantee | Trade-off |
|---|---|---|
| **Strong** | Always reads the latest committed write | Highest latency, lowest throughput |
| **Bounded Staleness** | Reads lag behind writes by at most K versions or T time | Good balance for global distribution |
| **Session** | Consistent within a single client session | Default; reads your own writes |
| **Consistent Prefix** | Reads never see out-of-order writes | Low latency, higher staleness risk |
| **Eventual** | No ordering guarantee | Lowest latency, highest throughput |

**Session consistency** is the default and right choice for most applications — users always see their own writes.

**Bounded Staleness** is recommended when global consistency matters but strong consistency's latency is too high — you define the acceptable staleness window.

#### Partitioning

Cosmos DB distributes data across physical partitions using a **partition key**. Choosing a good partition key is critical:

- High cardinality — many distinct values (not a boolean or a status field)
- Even distribution — writes should spread across many partition keys
- Frequently used in queries — ideally included in most WHERE clauses to avoid cross-partition queries
- The partition key is immutable — it cannot be changed after creation

A logical partition is all items with the same partition key value. A physical partition holds multiple logical partitions and has a maximum of 50GB and 10,000 RU/s.

#### Multi-Region Writes

Cosmos DB supports **multi-region writes** — all regions are writable simultaneously. This enables near-zero write latency worldwide but requires conflict resolution policies (Last Write Wins or custom merge procedures).

Single-region write with multiple read regions is simpler and adequate for most workloads — writes go to the primary region and replicate outward.

### Azure Data Lake Storage Gen2 (ADLS Gen2)

ADLS Gen2 is Azure Blob Storage with a hierarchical namespace enabled. This makes it suitable for big data analytics workloads — file and folder semantics, POSIX-style ACLs, and efficient rename operations (critical for analytics engines that write to staging paths then rename to final paths).

Design considerations:
- Enable hierarchical namespace at account creation — it cannot be toggled after the fact
- Use **POSIX ACLs** for fine-grained access control within the filesystem (in addition to RBAC at the account level)
- Structure storage zones for a medallion architecture: raw (Bronze) → cleaned (Silver) → aggregated (Gold)
- Lifecycle management policies move older data to cooler tiers automatically

## Data Integration

### Azure Data Factory (ADF)

ADF is the cloud ETL/ELT service — orchestrating data movement and transformation at scale. It connects to 90+ data sources (on-prem, cloud, SaaS) and can trigger pipelines on a schedule, on events (file arrival in storage), or on demand.

Key components:
- **Linked services** — connection definitions (credentials, endpoints) for sources and destinations
- **Datasets** — representations of data within a linked service (a specific table, file, folder)
- **Activities** — the operations in a pipeline (Copy, Mapping Data Flow, Databricks Notebook, Stored Procedure, Web)
- **Pipelines** — the orchestration of activities into a workflow
- **Integration Runtime** — the compute that executes activities. Azure IR (cloud), Self-hosted IR (on-prem or private network), Azure-SSIS IR (for SSIS packages)

**Self-hosted Integration Runtime** is a key design element when the source data is on-premises or in a private VNet. It runs on a machine you manage and bridges ADF to the private network.

### Azure Synapse Analytics

Synapse is an integrated analytics platform combining data warehousing, big data processing, and data integration. It brings together:

- **Dedicated SQL Pool** — the MPP (massively parallel processing) data warehouse. Scales from 100 DWU to 30,000 DWU. Data is distributed across distributions using hash or round-robin.
- **Serverless SQL Pool** — query data in place (ADLS Gen2, Blob, Cosmos DB) using T-SQL without provisioning compute. Pay per TB scanned.
- **Apache Spark Pool** — managed Spark clusters for big data processing, ML, and data engineering. Auto-pauses when idle.
- **Synapse Pipelines** — ADF-compatible orchestration, built into Synapse.
- **Synapse Link** — near-real-time analytical query against Cosmos DB or Dataverse without ETL or impact on the operational database.

### Azure Databricks

Databricks is a managed Apache Spark platform, optimised for data engineering, data science, and ML workloads. It provides collaborative notebooks, a Delta Lake (ACID-compliant Spark tables), and MLflow for ML lifecycle management.

**When to choose Databricks over Synapse Spark:**
- Complex ML pipelines, MLflow integration, or Delta Lake at scale
- Data engineering teams with existing Databricks expertise
- Requirement for multi-cloud (Databricks runs on Azure, AWS, and GCP)

**When to choose Synapse Spark:**
- Integrated analytics platform within a single service
- Existing Synapse investment for the SQL warehouse

## Key Exam Points to Remember

- **SQL Database** for new cloud apps; **SQL MI** for lift-and-shift with SQL Server features; **SQL on VM** for legacy versions or full control
- SQL MI is **VNet-injected** — it has a private IP and is not publicly accessible by default
- **Elastic pools** are cost-effective when databases have non-overlapping peak usage patterns
- **Auto-failover groups** provide a single endpoint that survives failover — no application connection string change required
- Cosmos DB **partition key** should be high cardinality and evenly distributed — cannot be changed after creation
- Cosmos DB **Session consistency** is the default and works for most apps; Bounded Staleness for global consistency requirements
- **ADLS Gen2** = Blob Storage with hierarchical namespace — enable it at creation time, cannot toggle later
- **Self-hosted Integration Runtime** in ADF is required to connect to on-premises or VNet-private data sources
- **Synapse Link** provides zero-ETL analytical queries against Cosmos DB with no operational impact
- **Serverless SQL Pool** in Synapse queries data in place — pay per TB scanned, no provisioned compute
