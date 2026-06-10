---
title: "AZ-305: Network Infrastructure Design"
description: "Designing network infrastructure for the AZ-305 exam — hub-spoke topology, Virtual WAN, Azure Firewall, Private Link, CDN, and the traffic routing decision matrix."
pubDate: 2026-06-10
tags: ["Azure", "AZ-305", "Networking"]
draft: false
pathway: "az-305"
pathwayOrder: 5
---

Networking design at the AZ-305 level moves from knowing individual services (covered in AZ-104) to knowing how to compose them into a coherent, secure, scalable network architecture. The key skills are topology design, selecting the right traffic routing service for a given scenario, and understanding how Private Link changes the security model for PaaS services.

## Network Topology Design

### Hub-Spoke Topology

Hub-spoke is the dominant enterprise network pattern in Azure. A central hub VNet hosts shared services and connectivity; spoke VNets host workloads and connect to the hub via peering.

```
                    ┌─────────────────┐
         On-prem ───│   Hub VNet      │
         (via VPN   │  ┌───────────┐  │
          or ER)    │  │  Firewall │  │
                    │  ├───────────┤  │
                    │  │  Bastion  │  │
                    │  ├───────────┤  │
                    │  │  Gateway  │  │
                    │  │  (VPN/ER) │  │
                    │  └───────────┘  │
                    └────────┬────────┘
                     Peering │ Peering
              ┌──────────────┼──────────────┐
        ┌─────┴──────┐  ┌────┴───────┐  ┌──┴─────────┐
        │ Spoke VNet │  │ Spoke VNet │  │ Spoke VNet │
        │ (Web tier) │  │  (App DB)  │  │  (Dev/Test)│
        └────────────┘  └────────────┘  └────────────┘
```

**Hub VNet responsibilities:**
- VPN Gateway or ExpressRoute Gateway (on-prem connectivity)
- Azure Firewall (centralised egress control and east-west inspection)
- Azure Bastion (secure jump access to VMs across all spokes)
- DNS resolvers (centralised private DNS)
- Shared services (Active Directory, monitoring)

**Spoke VNet responsibilities:**
- Workload resources (VMs, AKS clusters, App Service Environments)
- Isolation from other spokes — spoke-to-spoke traffic routes through the hub firewall
- Environment separation (one spoke per environment or workload)

**Traffic routing through the hub:** spoke VNets have a User-Defined Route (UDR) on all subnets with a default route (`0.0.0.0/0`) pointing to the Azure Firewall in the hub. All egress and spoke-to-spoke traffic passes through the firewall for inspection.

**Peering requirements:** VNet peering is not transitive. Each spoke must peer with the hub. Spokes do not peer with each other — inter-spoke traffic routes through the hub. On the hub-to-spoke peering link, enable **Allow gateway transit**. On the spoke-to-hub link, enable **Use remote gateways** so spokes use the hub's VPN/ER gateway to reach on-prem.

### Azure Virtual WAN

Virtual WAN (vWAN) is Microsoft's managed hub-spoke infrastructure. Rather than building and maintaining the hub VNet yourself, Virtual WAN provides a managed hub with automated routing, gateway provisioning, and branch connectivity.

**Benefits over DIY hub-spoke:**
- Automated, optimised routing between branches, spokes, and the internet — no manual UDRs for transitive connectivity
- Supports any-to-any connectivity natively (spokes can communicate with each other via the managed hub without routing through a customer-managed firewall)
- Integrated branch connectivity (SD-WAN partners, VPN, ExpressRoute) at scale
- Secured Virtual Hub — deploy Azure Firewall inside the managed hub for traffic inspection

**Two SKUs:**
- *Basic* — VPN only, no private peering, no custom routing
- *Standard* — full feature set: ExpressRoute, VPN, VNet peering, Azure Firewall integration, custom routing

**When to choose Virtual WAN over DIY hub-spoke:**
- Large number of branches (100+ VPN sites) — vWAN automates branch connectivity at scale
- Need any-to-any connectivity between many spokes without managing routing tables
- Prefer managed infrastructure over DIY maintenance

**When to stick with DIY hub-spoke:**
- Small number of spokes and branches where the automation benefit is marginal
- Need custom control over routing, firewall placement, or specific NVA (third-party virtual appliance) integration that vWAN doesn't support
- Existing hub-spoke investment where migration to vWAN isn't justified

## Azure Firewall

Azure Firewall is a managed, stateful network security service deployed into a dedicated subnet (`AzureFirewallSubnet`, minimum `/26`). It inspects and controls all traffic passing through it.

### SKUs

**Standard** — L4 filtering (FQDN, IP, port), application rules (FQDN-based for HTTP/S and MSSQL), network rules, SNAT/DNAT.

**Premium** — everything in Standard plus:
- **TLS inspection** — decrypt, inspect, and re-encrypt HTTPS traffic for threat detection
- **IDPS** (Intrusion Detection and Prevention System) — signature-based threat detection and blocking
- **URL filtering** — granular URL control beyond FQDN (path-level)
- **Web categories** — block categories of websites (gambling, social media, etc.)

**Basic** — simplified SKU for small environments, SMBs. Limited throughput, no IDPS, no TLS inspection.

### Rule Types

Rules are processed in order within a policy, with the first match winning:

1. **DNAT rules** — translate inbound traffic to internal destinations (public IP → private VM)
2. **Network rules** — L4 rules (source, destination IP, port, protocol). Processed before application rules for non-HTTP traffic
3. **Application rules** — L7 rules for HTTP, HTTPS, MSSQL, allowing or denying by FQDN or URL

Azure Firewall policies can be hierarchical — a base policy defined at the management group level with child policies per workload. Child policies inherit parent rules and can add their own.

### Forced Tunnelling

To route Azure Firewall's own management traffic through an on-premises network (to meet compliance requirements), enable forced tunnelling. This requires a separate management subnet and public IP dedicated to firewall management traffic.

## Private Link and Private Endpoints

Private Link enables private connectivity to Azure PaaS services — storage accounts, SQL Database, Cosmos DB, Key Vault, and many others — from within your VNet. A private endpoint is a network interface in your subnet with a private IP address mapped to the PaaS service.

### Architecture Impact

Without Private Endpoints:
- PaaS services have public endpoints (`mystorageaccount.blob.core.windows.net` resolves to a public IP)
- Traffic to PaaS services leaves your VNet, traverses the Azure backbone, but is technically "internet" traffic
- You can restrict access via Service Endpoints or storage firewall rules, but the service still has a public endpoint

With Private Endpoints:
- The PaaS service gets a private IP in your subnet
- `mystorageaccount.blob.core.windows.net` resolves to the private IP (via private DNS zone)
- Traffic never leaves the Microsoft backbone — it stays entirely private
- The public endpoint can be disabled, eliminating any public attack surface

### DNS Integration

Private Endpoints require a **Private DNS Zone** to override public DNS with the private IP. Azure creates the zone automatically if you choose to in the portal, or you manage it manually.

In hub-spoke architectures, the DNS design is:
- Private DNS Zones are linked to the hub VNet
- All VNets use the hub's DNS servers (Azure DNS or a custom DNS forwarder)
- The hub DNS resolves private endpoint names via the linked Private DNS Zones
- Spoke VMs transparently resolve PaaS service names to private IPs

This is called **centralised DNS with Private DNS Zones in the hub** — it's the recommended enterprise pattern.

### Private Link Service

Private Link Service is the reverse scenario — you expose *your own* service (running behind a Standard Load Balancer) to other VNets or tenants via Private Link. Consumers create a private endpoint in their VNet that connects to your service. Useful for SaaS providers or shared platform services.

## Content Delivery Network (CDN)

Azure CDN caches static content at edge nodes worldwide, serving it to users from the closest PoP and reducing load on the origin.

**Providers:**
- *Microsoft CDN* (standard) — simple configuration, integrated with Azure services
- *Akamai* and *Verizon* — available via Azure CDN profiles, legacy options being retired in favour of Azure Front Door

For new designs, **Azure Front Door** (Standard and Premium) subsumes CDN functionality — it provides caching at the edge *plus* global HTTP load balancing and WAF. Choose Front Door over standalone CDN if you also need global load balancing or WAF.

**When standalone CDN still makes sense:** very simple static content delivery without the HTTP routing or WAF requirements that justify Front Door.

## Traffic Routing Decision Matrix

The exam frequently presents a scenario and asks which routing service to use. Use this framework:

| Scenario | Service |
|---|---|
| Global HTTP/S load balancing + WAF + caching | Azure Front Door |
| Global DNS-based routing, non-HTTP protocols | Traffic Manager |
| Regional HTTP/S load balancing, WAF, URL routing | Application Gateway |
| Regional L4 (TCP/UDP) load balancing | Azure Load Balancer |
| Centralised egress control, east-west inspection | Azure Firewall |
| Private connectivity to PaaS from VNet | Private Endpoint |
| Private connectivity to your service from other VNets | Private Link Service |
| Managed hub-spoke at scale, branch connectivity | Azure Virtual WAN |

### Layering Services

Real architectures often layer these services:

**Global + regional:** Front Door (global) → Application Gateway per region (WAF + path routing) → backends. Front Door provides global health-based routing; Application Gateway handles regional WAF and URL path routing.

**Egress + ingress:** Azure Firewall controls outbound and spoke-to-spoke traffic; Application Gateway with WAF controls inbound HTTP traffic to internal applications.

**Hub-spoke with Private Endpoints:** spokes access PaaS via Private Endpoints in their own subnets; DNS resolves via the hub's centralised DNS linked to Private DNS Zones.

## Key Exam Points to Remember

- Hub-spoke peering: hub uses **Allow gateway transit**; spoke uses **Use remote gateways** — enables spoke access to on-prem via hub's gateway
- Spoke-to-spoke traffic is **not transitive** — it must route through the hub (via Firewall UDR)
- **Virtual WAN** automates any-to-any routing at scale; DIY hub-spoke gives more control over NVA and custom routing
- Azure Firewall **Premium** adds TLS inspection, IDPS, and URL filtering — required for compliance-driven deep packet inspection
- Private Endpoints require **Private DNS Zones** linked to your VNet — without DNS override, names still resolve to public IPs
- **Centralised DNS** with Private DNS Zones in the hub is the recommended enterprise pattern for hub-spoke
- **Front Door** for global HTTP + WAF + caching; **Traffic Manager** for global DNS-based non-HTTP routing — never swap these in a design
- Application Gateway is **regional**; Front Door is **global** — a common exam distractor
- Private Link Service lets you expose your own service to other VNets/tenants via private connectivity
