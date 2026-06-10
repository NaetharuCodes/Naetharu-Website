---
title: "AZ-104: Azure Networking"
description: "A practical guide to Azure networking for the AZ-104 exam — virtual networks, subnets, NSGs, peering, routing, DNS, and load balancing."
pubDate: 2026-06-10
tags: ["Azure", "AZ-104", "Networking"]
draft: false
pathway: "az-104"
pathwayOrder: 2
---

Networking is one of the largest and most consistently tested domains in the AZ-104 exam. It covers a lot of ground — from the basics of virtual networks and subnets all the way through to routing, DNS, load balancing, and hybrid connectivity. This guide works through each topic in a logical order, building up the full picture.

## Virtual Networks (VNets)

A Virtual Network is the fundamental building block of private networking in Azure. It's a logically isolated network that you define with an address space — a range of IP addresses in CIDR notation. Everything that needs to communicate privately in Azure lives inside a VNet.

```
Address space example: 10.0.0.0/16
```

This gives you 65,536 addresses to allocate across subnets. A few rules to know:

- Address spaces must not overlap within peered VNets
- You can add multiple address spaces to a single VNet
- VNets are scoped to a single region — there is no multi-region VNet
- VNets are free; you're charged for the resources inside them and the data that leaves them

### Subnets

A subnet is a range of IP addresses carved out of the VNet's address space. Resources like virtual machines are placed into subnets, not directly into VNets.

Azure reserves **five IP addresses** in every subnet:

- `.0` — network address
- `.1` — default gateway
- `.2` and `.3` — Azure DNS
- `.255` — broadcast

So a `/28` subnet has 16 total addresses, but only 11 are usable. Remember this when sizing subnets — a `/29` gives you 8 addresses and only 3 usable ones, which won't fit much.

Some Azure services require a **dedicated subnet** — they cannot share a subnet with other resources. Examples include Azure Firewall, Application Gateway, Azure Bastion, and VPN Gateway.

## Network Security Groups (NSGs)

An NSG is a set of inbound and outbound security rules that filter traffic to and from Azure resources. Think of it as a stateful packet filter — if you allow inbound traffic on port 80, the return traffic is automatically allowed regardless of outbound rules.

Each rule has:
- **Priority** — lower numbers are processed first (100–4096)
- **Source / Destination** — IP, CIDR, service tag, or ASG
- **Protocol** — TCP, UDP, ICMP, or Any
- **Port range** — single port, range, or `*` for all
- **Action** — Allow or Deny

Three default rules exist in every NSG and cannot be deleted (they have priority 65000–65500):
- Allow all inbound from VNet
- Allow all inbound from Azure Load Balancer
- Deny all other inbound

You can associate an NSG with a **subnet** (applies to all resources in that subnet) or a **network interface** (applies to one specific VM). Both can be applied simultaneously — inbound traffic passes through the subnet NSG first, then the NIC NSG. Outbound traffic passes the NIC NSG first, then the subnet NSG.

> **Exam tip:** An NSG on a subnet does not protect traffic between resources *within* that subnet. For that, you need NIC-level NSGs or Azure Firewall.

### Service Tags

Rather than maintaining lists of Azure IP ranges, you can use **service tags** as the source or destination in NSG rules. A service tag represents a group of IP prefixes for a given Azure service — Azure manages the list and updates it automatically.

Common service tags:
- `Internet` — all traffic originating from or destined for the public internet
- `VirtualNetwork` — the VNet address space plus any peered VNets
- `AzureLoadBalancer` — the Azure infrastructure load balancer health probe source
- `AzureCloud` — all Azure datacenter IP addresses
- `Storage`, `Sql`, `AppService` — specific service IP ranges

### Application Security Groups (ASGs)

ASGs let you group network interfaces logically — for example, all web servers or all database servers — and then reference those groups in NSG rules. Instead of managing IP addresses, you manage memberships.

```
Rule: Allow traffic from ASG-WebServers to ASG-DatabaseServers on port 1433
```

A NIC can belong to multiple ASGs, and the ASG must be in the same VNet as the NIC.

## VNet Peering

Peering connects two VNets so resources in each can communicate using private IP addresses, as if they were on the same network. Traffic travels over the Microsoft backbone — it does not traverse the public internet.

Peering is **not transitive**. If VNet A is peered with VNet B, and VNet B is peered with VNet C, resources in VNet A cannot reach VNet C unless you create a direct peering between A and C (or route traffic through a hub using a dedicated appliance or Azure Firewall).

Two types:
- **Regional peering** — both VNets in the same region
- **Global peering** — VNets in different regions (slightly higher data transfer cost)

Peering is a two-way configuration but requires **two peering links** — one from each side. In the portal this is handled for you, but via CLI or ARM you create them separately.

Key settings on each peering link:
- **Allow virtual network access** — must be enabled for traffic to flow (enabled by default)
- **Allow forwarded traffic** — allows traffic that didn't originate in the remote VNet to be forwarded through it
- **Allow gateway transit** — lets the remote VNet use this VNet's VPN gateway
- **Use remote gateways** — this VNet uses the peered VNet's gateway (requires Allow gateway transit on the other side)

## Route Tables and User-Defined Routes (UDR)

Azure automatically creates system routes for traffic within a VNet, between peered VNets, and to the internet. You can override these with a **Route Table** containing **User-Defined Routes (UDRs)**.

A route has:
- **Address prefix** — the destination CIDR
- **Next hop type** — where to send matching traffic

Next hop types:
| Type | Description |
|---|---|
| `Virtual network gateway` | Send to a VPN or ExpressRoute gateway |
| `Virtual network` | Route within the VNet |
| `Internet` | Send to the public internet |
| `Virtual appliance` | Forward to a specific private IP (e.g., a firewall or NVA) |
| `None` | Drop the traffic (blackhole) |

Route tables are associated with subnets. A common pattern is forcing all outbound internet traffic through a firewall by creating a UDR with destination `0.0.0.0/0` and next hop set to the firewall's private IP.

> **Exam tip:** The most specific route wins. A `/24` route beats a `/16` route for traffic in that range. If two routes have the same prefix length, the order of preference is: UDR > BGP > system route.

## Azure DNS

Azure provides two DNS services for different purposes.

### Azure DNS (Public Zones)

Azure DNS hosts your public DNS zones — the ones that resolve on the internet. You delegate your domain to Azure's name servers and manage records (A, AAAA, CNAME, MX, TXT, NS, SOA) through Azure.

Azure DNS uses anycast — your zone is served from multiple points of presence globally and is covered by Azure's SLA.

### Private DNS Zones

Private DNS zones provide name resolution for resources within your VNets — no public exposure. A common use case is giving your VMs friendly names within a VNet.

To use a private zone, you **link** it to one or more VNets. A VNet link can optionally enable **auto-registration**, which automatically creates A records for VMs deployed in that VNet.

One private zone can be linked to multiple VNets, enabling shared name resolution across peered environments.

> **Exam tip:** Private DNS zones for Azure services (like `privatelink.blob.core.windows.net`) are what make private endpoints work with DNS — without the zone, resources resolve the public IP even when connected via private endpoint.

## Azure Load Balancer

Azure Load Balancer distributes inbound traffic across a pool of backend resources. It operates at Layer 4 (TCP/UDP) — it understands IP addresses and ports but not HTTP.

Two SKUs — and this matters for the exam:

| Feature | Basic | Standard |
|---|---|---|
| Backend pool | VMs in same availability set or scale set | Any VM or VMSS in same VNet |
| Health probes | HTTP, TCP | HTTP, HTTPS, TCP |
| Availability zones | Not supported | Zone-redundant or zonal |
| SLA | None | 99.99% |
| Outbound rules | Not supported | Supported |
| Price | Free | Charged |

**Always use Standard SKU** for production workloads.

Key components:
- **Frontend IP** — the IP address clients connect to (public or private)
- **Backend pool** — the set of resources receiving traffic
- **Health probe** — checks if backend instances are healthy (unhealthy instances are removed from rotation)
- **Load balancing rule** — maps a frontend IP + port to a backend pool + port
- **Inbound NAT rule** — maps a specific frontend port to a specific backend VM (useful for RDP/SSH access to individual VMs)

Load Balancer is **not aware of HTTP** — you cannot route based on URL path or hostname. For that you need Application Gateway.

## Application Gateway

Application Gateway is a Layer 7 load balancer — it understands HTTP and HTTPS and can route based on URL path or hostname.

Key features:
- **URL path-based routing** — send `/api/*` to one backend pool and `/images/*` to another
- **Multi-site hosting** — route based on the hostname in the HTTP request
- **SSL termination** — decrypt HTTPS at the gateway, send plain HTTP to backends
- **Web Application Firewall (WAF)** — inspect HTTP traffic against OWASP rule sets
- **Autoscaling** — scale the number of gateway instances based on traffic (WAF_v2 / Standard_v2 SKUs)

Application Gateway requires its **own dedicated subnet**. The subnet must be large enough for the number of gateway instances — Microsoft recommends at least a `/26` for production.

> **Exam tip:** Load Balancer vs Application Gateway is a classic exam question. Layer 4 / non-HTTP / internal VM traffic → Load Balancer. Layer 7 / HTTP routing / WAF → Application Gateway.

## VPN Gateway

A VPN Gateway connects your Azure VNet to an on-premises network or another VNet over an encrypted tunnel.

Two connection types:
- **Site-to-Site (S2S)** — connects your on-prem network to Azure via an IPsec/IKE tunnel. Requires a VPN device on-prem with a public IP address.
- **Point-to-Site (P2S)** — connects individual client machines to the VNet. Uses SSTP, OpenVPN, or IKEv2. No on-prem device required.

VPN Gateway is deployed into a **dedicated subnet** called `GatewaySubnet` (this name is mandatory). The subnet must be at least `/29` but `/27` is recommended.

Gateway SKUs determine throughput and features. The key thing for the exam is that **Basic SKU does not support active-active mode, BGP, or zone redundancy**.

Active-standby vs active-active:
- **Active-standby** — one instance handles traffic; the other takes over on failure (failover takes 10–90 seconds)
- **Active-active** — both instances handle traffic simultaneously; BGP required

## ExpressRoute

ExpressRoute provides a private, dedicated connection between your on-premises network and Azure — traffic does not traverse the public internet. It goes through a connectivity provider (a telco or exchange provider).

Compared to VPN:
- Higher and more predictable bandwidth (50 Mbps to 100 Gbps)
- Lower and more consistent latency
- Does not use the public internet
- Not encrypted by default (the provider's infrastructure is private, but the traffic is not encrypted — you can add MACsec or IPsec on top if needed)
- More expensive and slower to provision

**ExpressRoute Global Reach** allows two on-premises sites (each with their own ExpressRoute connection) to communicate with each other via the Microsoft backbone — useful for connecting regional offices without building a private WAN.

> **Exam tip:** The key distinction is that VPN Gateway uses the public internet with encryption; ExpressRoute uses a private dedicated circuit without encryption (unless added separately). If a question mentions compliance, latency SLAs, or guaranteed bandwidth, the answer is usually ExpressRoute.

## Azure Bastion

Azure Bastion provides browser-based RDP and SSH access to VMs without exposing them to the public internet. You deploy it into a dedicated subnet called `AzureBastionSubnet` (name is mandatory, minimum `/26`), and then connect to VMs through the Azure portal over TLS.

No public IP on the VM is required. The VM's NSG does not need to allow RDP (3389) or SSH (22) from the internet — only from the Bastion subnet.

## Key Exam Points to Remember

- Azure reserves **5 IP addresses** per subnet (`.0`, `.1`, `.2`, `.3`, `.255`)
- NSG inbound traffic order: **subnet NSG → NIC NSG**; outbound: **NIC NSG → subnet NSG**
- VNet peering is **not transitive** — you must peer directly or use a hub-and-spoke design
- UDR route preference: **UDR > BGP > system route**; more specific prefix always wins
- Private DNS zones must be **linked** to a VNet to resolve from within it
- Load Balancer = Layer 4; Application Gateway = Layer 7 (HTTP/S)
- **Standard Load Balancer** is the only SKU that supports availability zones — always prefer it over Basic
- VPN Gateway uses `GatewaySubnet`; Bastion uses `AzureBastionSubnet`; Application Gateway needs its own subnet — these names are mandatory
- ExpressRoute does **not encrypt** traffic by default; VPN Gateway does (IPsec)
- **Global peering** works across regions but has higher data transfer costs than regional peering
