---
title: "AZ-104: Compute"
description: "A practical guide to Azure compute for the AZ-104 exam — virtual machines, availability options, scale sets, App Service, containers, and AKS."
pubDate: 2026-06-10
tags: ["Azure", "AZ-104", "Compute"]
draft: false
pathway: "az-104"
pathwayOrder: 4
---

Compute is consistently one of the largest domains in the AZ-104 exam. It spans virtual machines and their storage and networking, the availability options that keep workloads resilient, Azure's PaaS application hosting through App Service, and the container story with ACI and AKS. This guide covers all of it.

## Virtual Machines

A virtual machine (VM) in Azure is an on-demand, scalable compute resource. You choose the size (CPU and memory), the operating system image, the disk configuration, and the network it connects to.

### VM Sizes

Azure groups VM sizes into families, each optimised for different workloads:

| Family | Purpose | Example sizes |
|---|---|---|
| **General purpose** (B, D, Dv5) | Balanced CPU/memory, dev/test, small databases | B2s, D4s_v5 |
| **Compute optimised** (F) | High CPU-to-memory ratio, batch, gaming | F8s_v2 |
| **Memory optimised** (E, M) | In-memory databases, large caches | E16s_v5, M128ms |
| **Storage optimised** (L) | High disk I/O, NoSQL, data warehousing | L16s_v3 |
| **GPU** (N) | ML training, rendering, graphics | NC24ads_A100_v4 |
| **High performance compute** (H) | MPI workloads, molecular simulation | HB120rs_v3 |

For the exam, you don't need to memorise specific sizes — understand what the families are optimised for.

### VM Disks

Every VM has at least two disks; most have three:

**OS disk** — contains the operating system. Persists when the VM is stopped/deallocated. Managed disk by default. Registered as a C: drive on Windows or `/dev/sda` on Linux.

**Temporary disk** — local SSD attached to the physical host. Very fast, but **not persistent** — it is wiped when the VM is deallocated, resized, or the host is replaced. On Windows it's the D: drive; on Linux it's typically `/dev/sdb`. Never store anything you can't afford to lose here.

**Data disks** — additional managed disks you attach for application data. Persist independently of the VM. You can detach and reattach them to other VMs.

**Managed disk types:**

| Type | Use case | IOPS (max) |
|---|---|---|
| **Standard HDD** | Dev/test, low-IOPS workloads | 500 per disk |
| **Standard SSD** | Web servers, lightly used production | 6,000 per disk |
| **Premium SSD** | Production databases, I/O-intensive apps | 20,000 per disk |
| **Ultra Disk** | Highest performance, configurable IOPS/throughput | 160,000 per disk |

> **Exam tip:** Premium SSD is only supported on VM sizes marked with an **s** in the name (e.g., D4**s**_v5). A standard D4_v5 cannot use Premium SSD.

### VM Networking

A VM has one or more **network interfaces (NICs)**. Each NIC connects to a subnet within a VNet and has a private IP address. NICs can optionally have a public IP address attached.

The number of NICs a VM can have depends on its size — larger VMs support more NICs.

### VM Extensions

Extensions are small applications that run post-deployment to configure or automate tasks on the VM. Common examples:
- **Custom Script Extension** — runs a script after deployment
- **Azure Monitor Agent** — installs the monitoring agent
- **Azure AD Login** — enables signing in with Entra ID credentials instead of a local account
- **DSC Extension** — applies a Desired State Configuration to Windows VMs

Extensions can be added at deployment time or to a running VM.

### VM Pricing Models

**Pay-as-you-go** — billed per second for compute while the VM is running. Stop (deallocate) the VM and compute charges stop. Storage charges continue.

**Reserved Instances** — commit to 1 or 3 years for a specific VM family and region in exchange for a significant discount (up to ~72% off). Best for stable, predictable workloads.

**Spot VMs** — use Azure's excess capacity at a steep discount (up to ~90% off). Azure can evict a spot VM with 30 seconds notice when capacity is needed. Suitable for batch jobs, rendering, and workloads that can tolerate interruption.

**Azure Hybrid Benefit** — if you have on-prem Windows Server or SQL Server licences with Software Assurance, you can use them in Azure instead of paying the Azure licence cost.

## VM Availability Options

A single VM is a single point of failure — the physical host can fail. Azure provides several options to protect workloads against planned and unplanned downtime.

### Availability Sets

An Availability Set is a logical grouping of VMs that tells Azure to spread them across multiple **fault domains** and **update domains** within a single datacenter.

- **Fault domain** — a rack of servers sharing a common power supply and network switch. VMs in different fault domains don't share these. Azure allows up to 3 fault domains per Availability Set.
- **Update domain** — a group of VMs and physical hosts that Azure updates together during planned maintenance. Only one update domain is taken down at a time. Azure allows up to 20 update domains.

By placing multiple VMs in an Availability Set, you guarantee that at least one VM remains running during both unplanned hardware failure and planned maintenance.

The SLA for two or more VMs in an Availability Set is **99.95%**.

Availability Sets are a datacenter-level feature — they do not protect against datacenter or zone failure.

### Availability Zones

Availability Zones are physically separate datacenters within the same Azure region — each zone has its own power, cooling, and network. Deploying VMs across zones protects against datacenter-level failure.

The SLA for two or more VMs across two or more Availability Zones is **99.99%**.

Not all regions have availability zones. Not all VM sizes are available in all zones.

| Feature | Availability Set | Availability Zones |
|---|---|---|
| Protection against | Host/rack failure | Datacenter failure |
| SLA | 99.95% | 99.99% |
| Scope | Single datacenter | Multiple datacenters in a region |
| Cost | No extra charge | No extra charge (data transfer between zones is charged) |

### Azure VM Scale Sets (VMSS)

Scale Sets let you create and manage a group of identical, load-balanced VMs. The set can automatically scale out (add VMs) or scale in (remove VMs) based on demand or a schedule.

Key concepts:
- All VMs in a Scale Set use the same base image and configuration
- **Orchestration modes**: Uniform (all VMs identical, max 1000) or Flexible (can have different sizes, integrates with availability zones)
- **Scaling policies**: CPU, memory, custom metrics, or schedule-based
- **Cool-down period**: How long to wait after a scale action before evaluating again (prevents thrashing)
- **Overprovisioning**: Azure creates extra VMs and deletes the slowest ones — reduces deployment time at no extra cost

Scale Sets integrate with Azure Load Balancer and Application Gateway to distribute traffic.

## Azure App Service

App Service is a PaaS offering for hosting web applications, REST APIs, and mobile backends — no VM management required. You define an **App Service Plan** (the underlying compute), then create one or more apps that run on it.

### App Service Plans

The plan defines the region, compute resources, and features available:

| Tier | Use case | Key features |
|---|---|---|
| **Free / Shared** | Dev/test | Shared infrastructure, no SLA, no custom domain on Free |
| **Basic** | Dev/test | Dedicated compute, manual scale, custom domains/SSL |
| **Standard** | Production | Auto-scale, deployment slots (up to 5), daily backups |
| **Premium** | High scale | More instances, more slots (up to 20), VNet integration |
| **Isolated** | High security | Runs in a dedicated App Service Environment (ASE), VNet injection |

Multiple apps can share one App Service Plan and share its compute. This is economical for small apps but means they compete for resources.

### Deployment Slots

Slots are live environments attached to an App Service app. The production slot always exists; you can create additional slots (staging, QA, etc.) on Standard tier and above.

**Swap** — the primary use case. Deploy to staging, test it, then swap staging and production. The swap is instant (Azure reroutes traffic at the load balancer level) and zero-downtime. If something goes wrong, swap back.

Slot settings can be **sticky** — they stay with the slot during a swap rather than moving with the app. Use this for settings that differ between environments (e.g., database connection strings, app insights keys).

### Scaling

**Scale up** — move to a higher App Service Plan tier to get more CPU/memory.

**Scale out** — add more instances of the same plan. Manual or automatic based on metrics.

Auto-scale rules define conditions: "if CPU > 70% for 10 minutes, add 2 instances; if CPU < 30% for 20 minutes, remove 1 instance."

### App Service Networking

By default, App Service apps are accessible from the internet. Several features restrict or control this:

- **Access restrictions** — allow/deny inbound traffic by IP range or service tag
- **VNet integration** — lets the app make outbound calls into a VNet (does not put the app inside the VNet for inbound)
- **Private endpoints** — gives the app a private IP inside a VNet for inbound traffic
- **App Service Environment (ASE)** — deploys the entire App Service infrastructure inside your VNet, Isolated tier only

## Azure Container Instances (ACI)

ACI is the simplest way to run a container in Azure — no orchestration, no cluster to manage. You provide an image, and Azure runs it.

Use cases:
- Short-lived batch jobs
- Build agents
- Simple microservices that don't need orchestration
- Testing container images

ACI supports **container groups** — a collection of containers that share a lifecycle, network, and storage and run on the same host. Similar to a Kubernetes pod.

Key properties:
- Billed per second of CPU and memory
- Can pull images from Docker Hub, ACR, or any registry
- Supports both Linux and Windows containers
- Can mount Azure Files shares as volumes
- Public IP with optional DNS label, or deployed into a VNet subnet via subnet delegation

ACI is not appropriate for production workloads that need autoscaling, rolling updates, health checks, or persistent services — use AKS for those.

## Azure Kubernetes Service (AKS)

AKS is a managed Kubernetes service. Azure manages the control plane (API server, etcd, scheduler) for free; you pay for the agent nodes (VMs) that run your workloads.

### Core Concepts

**Node pool** — a group of nodes (VMs) of the same size. A cluster has at least one system node pool (runs Kubernetes system pods) and can have additional user node pools for workloads.

**Pods** — the smallest deployable unit in Kubernetes. A pod runs one or more containers that share a network namespace and storage.

**Services** — expose a set of pods on a stable IP/DNS name. Types:
- `ClusterIP` — internal cluster traffic only
- `NodePort` — exposes on a port on each node
- `LoadBalancer` — provisions an Azure Load Balancer with a public IP

**Deployments** — declare the desired state (how many replicas of a pod, which image). Kubernetes continuously reconciles actual state to match desired state.

### AKS Networking

Two networking models:
- **Kubenet** (basic) — nodes get IPs from a VNet subnet; pods get IPs from a separate private range. NAT happens between pods and the VNet. Simpler but pods are not directly addressable from the VNet.
- **Azure CNI** — every pod gets an IP from the VNet subnet directly. Pods are first-class VNet citizens. Requires more IP address planning.

### Scaling in AKS

**Horizontal Pod Autoscaler (HPA)** — scales the number of pod replicas based on CPU or custom metrics.

**Cluster Autoscaler** — scales the number of nodes in a node pool based on pod scheduling demand. When pods can't be scheduled due to insufficient resources, new nodes are added. When nodes are underutilised, they're removed and pods are rescheduled.

### Container Registry

Azure Container Registry (ACR) is a private Docker registry. AKS integrates natively — you can attach an ACR to a cluster and AKS will pull images from it without additional credentials (using a managed identity).

ACR tasks can build images on push or on a schedule, removing the need for a separate CI build server.

## Key Exam Points to Remember

- The **temporary disk** on a VM is not persistent — never store data you can't afford to lose there
- **Premium SSD** requires a VM size with an **s** in the name
- Availability Set SLA = **99.95%** (rack-level protection); Availability Zone SLA = **99.99%** (datacenter-level protection)
- Fault domains protect against **unplanned** hardware failure; update domains protect against **planned** maintenance
- Scale Sets use identical VMs; **Flexible** orchestration mode supports availability zones
- App Service Plan tiers: **Standard** is minimum for deployment slots (5 slots); **Premium** gives 20 slots
- Slot **sticky** settings stay with the slot on a swap — use this for environment-specific config
- ACI is for **simple, short-lived** containers; AKS is for **production, orchestrated** workloads
- **Azure CNI** gives each pod a VNet IP; **Kubenet** uses NAT — Azure CNI needs more IP address space planning
- Spot VMs can be evicted with **30 seconds** notice — only for interruptible workloads
- **Azure Hybrid Benefit** applies Windows Server and SQL Server SA licences to Azure VMs
