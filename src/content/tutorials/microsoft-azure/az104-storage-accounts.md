---
title: "AZ-104: Azure Storage Accounts"
description: "A practical guide to Azure Storage Accounts for the AZ-104 exam — types, redundancy, services, access tiers, and security."
pubDate: 2026-06-10
tags: ["Azure", "AZ-104", "Storage"]
draft: false
pathway: "az-104"
pathwayOrder: 1
---

Storage accounts are one of the most heavily tested topics in the AZ-104 exam, and for good reason — they underpin a huge amount of what you'll do in Azure day to day. This guide covers everything you need to know: the different account types, redundancy options, storage services, access tiers, and how to lock them down.

## What Is a Storage Account?

A storage account is a top-level Azure resource that gives you a unique namespace for your storage data. Everything you store — blobs, files, queues, tables — lives inside a storage account, and every object you store has an address that includes the account name:

```
https://<account-name>.blob.core.windows.net/<container>/<blob>
```

One thing that trips people up: a storage account is not the same as a container or a file share. The account is the parent resource; containers, file shares, queues, and tables are created *inside* it.

## Storage Account Types

The account type determines which services and features are available, and which performance tiers you can use.

| Type | Supported services | Use case |
|---|---|---|
| **Standard general-purpose v2** (GPv2) | Blob, File, Queue, Table, Data Lake | Default choice for almost everything |
| **Premium block blobs** | Blob only | Low-latency blob workloads (streaming, IoT) |
| **Premium file shares** | File only | High-performance Azure Files (SMB/NFS) |
| **Premium page blobs** | Page blobs only | VM disks (unmanaged) |

For the exam: **Standard GPv2 is the recommended default**. Premium tiers use SSDs and are billed differently — you pay for provisioned capacity rather than what you actually use.

## Redundancy Options

Redundancy is a favourite exam topic. You need to know what each option does, where the copies live, and which support read access from the secondary.

### Within a single region

**Locally Redundant Storage (LRS)** — three synchronous copies within a single datacenter. Cheapest option. Protects against hardware failure but not datacenter-level outage.

**Zone-Redundant Storage (ZRS)** — three synchronous copies spread across three availability zones in the same region. Protects against zone failure. Good default for most production workloads.

### Cross-region (geo-redundant)

**Geo-Redundant Storage (GRS)** — LRS in the primary region, plus asynchronous replication to a single datacenter in a paired region. Six copies total. You cannot read from the secondary unless a failover is initiated.

**Read-Access Geo-Redundant Storage (RA-GRS)** — same as GRS, but you can always read from the secondary endpoint (`<account>.secondary.blob.core.windows.net`). Useful for read-heavy workloads that need DR read access.

**Geo-Zone-Redundant Storage (GZRS)** — ZRS in the primary region, plus async replication to the paired region. Best of both: zone resilience + geo replication.

**Read-Access Geo-Zone-Redundant Storage (RA-GZRS)** — same as GZRS, with read access to the secondary.

A quick way to remember which options have secondary read access: **RA-** prefix = read access.

> **Exam tip:** GRS and GZRS replicate to a *paired region* — you don't choose the secondary. Microsoft controls the pairing.

## Storage Services

A GPv2 storage account gives you access to four storage services:

### Blob Storage

Object storage for unstructured data — images, videos, backups, logs, anything. Blobs are stored in **containers** (similar to folders, but flat — there's no real hierarchy, though you can simulate one with `/` in blob names).

Three blob types:
- **Block blobs** — for most files. Uploaded in blocks, committed together.
- **Append blobs** — optimised for append operations. Good for logs.
- **Page blobs** — for random read/write workloads. Used for unmanaged VM disks.

### Azure Files

Fully managed file shares accessible over SMB 3.0 or NFS 4.1. You can mount them on Windows, Linux, and macOS. A common use case is lifting on-prem file servers to the cloud without changing how applications access files.

**Azure File Sync** lets you keep on-prem Windows servers in sync with an Azure Files share — useful for hybrid scenarios.

### Queue Storage

Simple message queuing. Messages can be up to 64KB and are held for up to 7 days. Queues are designed for loose coupling between application components — a producer writes messages, a consumer reads and processes them independently.

### Table Storage

NoSQL key-attribute storage. Each entity can have different properties, and the partition key + row key form the unique identifier. It's been somewhat superseded by Azure Cosmos DB for Table API, but it's still valid and still on the exam.

## Access Tiers (Blob Storage)

Access tiers let you balance storage cost against retrieval cost based on how often you need the data.

| Tier | Storage cost | Access cost | Retrieval latency | Minimum storage duration |
|---|---|---|---|---|
| **Hot** | Highest | Lowest | Milliseconds | None |
| **Cool** | Lower | Higher | Milliseconds | 30 days |
| **Cold** | Lower still | Higher still | Milliseconds | 90 days |
| **Archive** | Lowest | Highest | Hours (rehydration required) | 180 days |

The tier is set at either the account level (the default) or on individual blobs. Setting a tier on a blob overrides the account default.

**Archive** is the key one to understand for the exam: blobs in archive are offline. You cannot read them directly — you must *rehydrate* them first by either changing the tier to Hot or Cool, or by copying them to a new blob in a non-archive tier. Rehydration can take up to 15 hours at standard priority, or faster with high priority (at higher cost).

**Lifecycle management policies** let you automate tier transitions and deletions based on rules — for example, move blobs to Cool after 30 days of no access, then to Archive after 90, then delete after 365.

## Security

### Access Keys

Every storage account has two 512-bit access keys that grant full access to the entire account. Anyone with a key can read, write, and delete anything. Treat them like passwords — rotate them regularly and never commit them to source control.

### Shared Access Signatures (SAS)

A SAS is a signed URI that grants limited, time-bound access to specific resources. You define exactly what permissions are granted (read, write, delete, list), which resources, and for how long.

Three types:
- **Account SAS** — access to one or more services in the account
- **Service SAS** — access to a specific resource (e.g., one container)
- **User delegation SAS** — backed by Azure AD credentials rather than an account key. Recommended because you don't expose a key.

### Azure AD + RBAC

The recommended approach for user and application access is Azure AD with RBAC. Key built-in roles for storage:

- `Storage Blob Data Owner` — full access including setting ACLs
- `Storage Blob Data Contributor` — read, write, delete blobs
- `Storage Blob Data Reader` — read blobs only
- `Storage File Data SMB Share Contributor` — read/write/delete on file shares

RBAC roles apply at the management plane level (managing the resource) or data plane level (accessing the data). Make sure you understand the difference — `Contributor` on the storage account gives you management access but not necessarily data access.

### Storage Firewall and Virtual Network Rules

By default, storage accounts accept connections from all networks. You can restrict this in the networking settings:

- Allow access from specific virtual networks and subnets (using service endpoints or private endpoints)
- Allow access from specific public IP ranges
- Enable the firewall and add exceptions for trusted Azure services

**Private endpoints** give the storage account a private IP address inside your VNet — traffic never leaves the Microsoft backbone.

### Secure Transfer Required

This setting (enabled by default on new accounts) rejects any connection over HTTP, forcing HTTPS. Leave it on. There's rarely a good reason to disable it.

## Creating a Storage Account

You can create one through the portal, the Azure CLI, or PowerShell. The CLI approach is worth knowing for the exam:

```bash
az storage account create \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --location uksouth \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot
```

The `--sku` maps to the redundancy option: `Standard_LRS`, `Standard_ZRS`, `Standard_GRS`, `Standard_RAGRS`, `Standard_GZRS`, `Standard_RAGZRS`, `Premium_LRS`, `Premium_ZRS`.

## Key Exam Points to Remember

- **GPv2 is the default account type** — use it unless you have a specific reason not to.
- **ZRS is better than LRS for most production workloads** — same region, but zone-resilient.
- **RA-GRS/RA-GZRS** give you read access to the secondary; GRS/GZRS do not until a failover.
- **Archive blobs must be rehydrated** before you can read them — this is not instant.
- **SAS tokens expire** — a user delegation SAS is backed by Azure AD and is the preferred type.
- **RBAC for data plane access** is separate from RBAC for management plane access.
- **Minimum storage durations apply** to Cool (30 days), Cold (90 days), and Archive (180 days) — early deletion is charged pro-rata.
- Storage account names must be **globally unique**, 3–24 characters, lowercase letters and numbers only.
