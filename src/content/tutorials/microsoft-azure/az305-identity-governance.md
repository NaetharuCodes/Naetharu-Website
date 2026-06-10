---
title: "AZ-305: Identity, Governance, and Monitoring"
description: "Designing identity, governance, and monitoring solutions for the AZ-305 exam — hybrid identity, B2B/B2C, PIM, Conditional Access, landing zones, Defender for Cloud, and Sentinel."
pubDate: 2026-06-10
tags: ["Azure", "AZ-305", "Identity", "Governance"]
draft: false
pathway: "az-305"
pathwayOrder: 1
---

The AZ-305 exam tests your ability to *design* solutions, not just configure them. For identity and governance, that means knowing which combination of features to recommend given a set of requirements — and understanding the trade-offs between options. This guide covers hybrid identity architecture, external identity scenarios, privileged access design, governance at scale, and the monitoring and security platform that underpins it all.

## Hybrid Identity

Most organisations have an existing on-premises Active Directory. Hybrid identity bridges on-prem AD and Entra ID so users can authenticate once and access both environments.

### Azure AD Connect (Entra Connect)

Azure AD Connect is the tool that synchronises identities from on-prem AD to Entra ID. It runs on a Windows Server on-premises and supports three authentication methods — the choice between them is one of the most common AZ-305 design questions.

**Password Hash Synchronisation (PHS)**

The simplest option. AD Connect synchronises a hash of the user's password hash to Entra ID. Authentication happens in the cloud — no on-prem infrastructure is involved at sign-in time.

- No dependency on on-prem infrastructure for authentication
- Entra ID Identity Protection can analyse sign-ins for risk
- Leaked credential detection works because the hash is available in the cloud
- Users get a seamless SSO experience with the Seamless SSO feature
- *Best choice when:* maximum cloud resilience and minimal on-prem dependency is the goal

**Pass-Through Authentication (PTA)**

Authentication is validated against on-prem AD at sign-in time via a lightweight agent installed on-prem. The password never leaves the on-premises environment.

- Passwords are not stored or hashed in the cloud — satisfies strict compliance requirements around password storage
- Requires on-prem agents to be available at authentication time — if they're down, authentication fails
- Deploy multiple agents across servers for redundancy
- *Best choice when:* compliance policy prohibits storing any credential material in the cloud

**Federation (AD FS)**

Authentication is handled by an on-prem federation service (typically AD FS). Entra ID trusts the federation service to validate credentials and issue tokens.

- Supports smart card and certificate-based authentication
- Supports on-prem MFA solutions
- Highest operational complexity — AD FS farm, WAP proxies, certificates, and federation trust all need maintenance
- If the AD FS infrastructure is unavailable, authentication fails entirely
- *Best choice when:* existing AD FS investment must be preserved, or smart card authentication is required

### Entra ID Connect Cloud Sync

A newer, lighter-weight alternative to AD Connect for organisations with simpler synchronisation requirements or multiple disconnected AD forests. Runs as a cloud-provisioned agent rather than a full on-prem sync engine. Does not support all scenarios (no device writeback, limited group writeback) but covers most user synchronisation use cases.

### Entra ID Domain Services (Entra DS)

Entra DS provides managed Active Directory domain services — LDAP, Kerberos, NTLM, Group Policy — in Azure without deploying domain controllers. Applications that require traditional AD (legacy apps, domain-join) can use Entra DS without maintaining their own DC infrastructure.

Key design considerations:
- Entra DS is a **one-way sync** — Entra ID syncs into Entra DS, but changes made in Entra DS do not propagate back
- Users must exist in Entra ID first; Entra DS cannot be used as a standalone directory
- The managed domain exists in a single region and a single VNet — VMs that need to domain-join must be in the same VNet or a peered VNet
- Not a replacement for on-prem AD — designed for lift-and-shift of legacy applications into Azure

## External Identity

### B2B Collaboration

B2B allows external users (partners, contractors) to be invited into your Entra ID tenant as guest users. They authenticate with their own identity (their home organisation's Entra ID, Google, or email OTP) and access resources in your tenant.

Design considerations:
- No password to manage — the external user authenticates via their home IdP
- Cross-tenant access policies control what B2B guests can do and which tenants you trust
- Entitlement management with Access Packages provides a governed way to grant guests a bundle of resources with an expiry date — they request access, it is approved or auto-approved, and it expires automatically

**When to use:** Partner and contractor access to internal resources.

### B2C (Azure AD B2C)

B2C is a separate, purpose-built customer identity service. It allows consumers to sign up and sign in to your applications using social identities (Google, Facebook, Apple) or local accounts (email/password).

Design considerations:
- A completely separate tenant from your corporate Entra ID — do not mix them
- Highly customisable sign-in/sign-up flows (User Flows or Custom Policies via Identity Experience Framework)
- Scales to hundreds of millions of consumer accounts
- Custom domains supported for the sign-in pages

**When to use:** Consumer-facing applications where end users are the general public, not employees or partners.

| Scenario | Solution |
|---|---|
| Employees accessing Azure resources | Entra ID member accounts |
| Partner staff accessing your apps | Entra ID B2B guest accounts |
| Consumers signing up to a public app | Azure AD B2C separate tenant |

## Privileged Identity Management (PIM)

PIM provides just-in-time (JIT) privileged access — users have no permanent standing access to powerful roles. Instead, they *activate* eligibility when they need it, for a limited time, with optional justification and approval.

### Design Decisions

**Eligible vs Active assignments**

- *Active* — the role is always assigned; the user has the permissions continuously
- *Eligible* — the user can activate the role when needed; no permissions between activations

Best practice is to make all privileged role assignments *eligible* rather than permanent, with a time-limited activation window (1–8 hours is typical).

**Activation requirements**

You can require any combination of:
- MFA at activation time
- Approval from a designated approver
- Justification (a reason the user must provide)
- Ticket number for change management integration

**Access reviews**

PIM integrates with Entra ID Access Reviews to periodically question whether role assignments are still needed. Reviewers (the role holder, their manager, or a designated reviewer) confirm or deny continued access. Requires Entra ID P2.

## Conditional Access

Conditional Access is the policy engine that controls access based on signals — who the user is, what device they're using, where they are, and what application they're accessing.

### Design Pattern

Conditional Access policies follow an IF → THEN structure:
- **IF** (assignments): which users, apps, and conditions
- **THEN** (access controls): grant access, require MFA, require compliant device, block

### Key Design Considerations

**Named locations** — define trusted IP ranges (office networks, VPN exit IPs) so policies can differentiate between "signing in from the office" and "signing in from an unknown location."

**Report-only mode** — before enforcing a new policy, run it in report-only mode to see which users would be affected. Essential before rolling out broad policies.

**Exclusions** — always exclude at least one break-glass emergency account from Conditional Access policies, stored securely and monitored. If all admin accounts are locked out, you need a way back in.

**Common policy patterns:**
- Require MFA for all users accessing any cloud app
- Require a compliant (Intune-managed) device to access sensitive applications
- Block access from specific countries
- Require MFA for all privileged role activations

## Governance at Scale

### Landing Zones

A landing zone is a pre-configured Azure environment that enforces organisational standards from day one — networking topology, identity, security baseline, monitoring, and cost management. Microsoft's Cloud Adoption Framework (CAF) defines the reference architecture.

The typical enterprise landing zone hierarchy:

```
Root Management Group
  ├── Platform
  │     ├── Identity (Entra DS, AD Connect VMs)
  │     ├── Management (Log Analytics, Automation)
  │     └── Connectivity (Hub VNet, Firewall, VPN/ER)
  ├── Landing Zones
  │     ├── Corp (connected workloads, peered to hub)
  │     └── Online (internet-facing workloads)
  ├── Sandbox
  └── Decommissioned
```

Policies are assigned at management group level so every subscription that lands in a group inherits the guardrails automatically.

### Azure Policy at Scale

For AZ-305, you need to understand *designing* a policy strategy, not just assigning individual policies:

- Use **initiatives** to group related policies — e.g., a "Security Baseline" initiative that bundles 20 individual policies
- Apply initiatives at **management group** scope so all subscriptions inherit them
- Use **DeployIfNotExists** and **Modify** effects for remediation — audit is not enough if you want enforcement
- **Policy exemptions** allow individual resources or subscriptions to opt out of a specific policy with a documented reason
- **Regulatory compliance dashboards** in Defender for Cloud use initiatives mapped to standards (ISO 27001, PCI DSS) to show compliance posture

## Microsoft Defender for Cloud

Defender for Cloud is the unified security posture management and threat protection platform. It combines two functions:

**Cloud Security Posture Management (CSPM)** — continuously assesses your configuration against security best practices and compliance standards, giving you a Secure Score. Recommendations guide you to fix misconfigurations.

**Cloud Workload Protection (CWP)** — active threat detection for specific workload types. Each plan is priced per resource:
- Defender for Servers — VM threat detection, vulnerability assessment, EDR integration
- Defender for SQL — detects anomalous SQL queries and brute force
- Defender for Storage — detects malicious file uploads, anomalous access patterns
- Defender for Containers — AKS threat detection, image vulnerability scanning
- Defender for App Service — detects attack patterns against web applications

### Design Considerations

- Enable Defender for Cloud at the **management group** level using Azure Policy to ensure all current and future subscriptions are covered
- The **Secure Score** is a useful governance KPI — set a target and track it
- **Workflow automation** triggers Logic Apps on security alerts or recommendation state changes — useful for auto-remediation or ITSM ticket creation
- **Export to Log Analytics** or Event Hub for SIEM integration

## Microsoft Sentinel

Sentinel is Azure's cloud-native SIEM (Security Information and Event Management) and SOAR (Security Orchestration, Automation and Response). It ingests security data from across your environment, detects threats using built-in and custom analytics rules, and automates responses with playbooks.

### Architecture Decisions

**Log Analytics workspace design** — Sentinel runs on top of a Log Analytics workspace. Key decisions:

- *Single workspace:* simpler management, easier cross-source correlation, appropriate for most organisations
- *Multiple workspaces:* needed if data residency requirements mandate logs stay in specific regions, or if strong access isolation between business units is required (e.g., an MSSP serving multiple customers)

**Data connectors** — Sentinel ingests data from Microsoft sources (Entra ID, M365, Defender products) natively. Third-party connectors exist for common firewalls, endpoint agents, and SaaS applications.

**Analytics rules** — built-in Scheduled and ML-based rules detect known attack patterns. The Microsoft Sentinel Content Hub provides rule templates for most use cases.

**Playbooks** — Logic Apps triggered by alerts to automate response: isolate a VM, disable a user account, post to a Teams channel, create an ITSM ticket.

## Key Exam Points to Remember

- **PHS** = simplest, highest cloud resilience; **PTA** = password never leaves on-prem; **Federation** = highest complexity, needed for smart card auth
- **Entra DS** sync is one-way (Entra ID → Entra DS), not bidirectional — it cannot replace on-prem AD
- **B2B** = partner/contractor guest access to your tenant; **B2C** = consumer sign-up/sign-in, separate tenant entirely
- **PIM eligible assignments** are best practice for all privileged roles — no standing access
- Always exclude a **break-glass account** from Conditional Access policies
- Landing zones enforce standards via **management group–level policies** so every new subscription inherits guardrails automatically
- **Defender for Cloud** covers both CSPM (posture/score) and CWP (active threat detection per workload)
- **Sentinel** sits on Log Analytics — workspace design (single vs multiple) is driven by data residency and access isolation requirements
