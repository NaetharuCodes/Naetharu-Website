---
title: "AZ-104: Identity and Governance"
description: "A practical guide to Azure identity and governance for the AZ-104 exam — Entra ID, RBAC, management groups, Azure Policy, resource locks, and cost management."
pubDate: 2026-06-10
tags: ["Azure", "AZ-104", "Identity", "Governance"]
draft: false
pathway: "az-104"
pathwayOrder: 3
---

Identity and governance underpins everything else in Azure — you need to understand who can do what, where, and under what conditions before you can manage anything else. This is one of the highest-weighted domains in the AZ-104 exam and covers Microsoft Entra ID (formerly Azure Active Directory), role-based access control, Azure Policy, and the management hierarchy that ties it all together.

## The Azure Management Hierarchy

Azure organises resources into four levels of scope, from broadest to narrowest:

```
Management Groups
  └── Subscriptions
        └── Resource Groups
              └── Resources
```

Policies, RBAC role assignments, and cost controls can be applied at any level. A setting applied at a higher scope inherits down — a policy assigned to a management group applies to all subscriptions beneath it.

### Management Groups

Management groups let you organise multiple subscriptions under a single node for governance at scale. An organisation might structure them like this:

```
Root Management Group
  ├── Production
  │     ├── Sub-Prod-UKSouth
  │     └── Sub-Prod-WestEurope
  ├── Non-Production
  │     ├── Sub-Dev
  │     └── Sub-Test
  └── Sandbox
```

Key facts:
- A single Azure AD tenant has one **root management group** — you cannot delete or move it
- Up to **six levels** of management group hierarchy (not counting root)
- Each subscription can only belong to **one** management group at a time
- Management groups can be nested

### Subscriptions

A subscription is a billing and access boundary. All resources belong to a subscription; the subscription owns the invoice.

Subscriptions also act as a trust boundary for Azure AD — a subscription trusts exactly one Azure AD tenant. You can change which tenant a subscription trusts (transfer it), but a subscription can only trust one at a time.

### Resource Groups

Resource groups are containers for resources. A few rules:
- Every resource belongs to exactly one resource group
- Resources in a resource group can be in different regions
- Resource groups themselves have a region, but that's only for storing metadata about the group
- Deleting a resource group deletes everything inside it

Resource groups are the natural unit for lifecycle management. Group things that are deployed together, used together, and deleted together.

## Microsoft Entra ID (Azure AD)

Microsoft Entra ID is Azure's cloud-based identity and access management service. It handles authentication (who are you?) and is the basis for authorisation across Azure.

### Users

Two types:
- **Member users** — accounts that live in your Entra ID tenant (e.g., `james@contoso.com`)
- **Guest users** — external accounts invited via B2B collaboration (e.g., a contractor from another company). Guest accounts show as `james_externaldomain.com#EXT#@contoso.com`

Guest users have more restricted default permissions than members — they cannot enumerate all users in the directory, for example.

### Groups

Groups let you assign permissions and licenses to multiple users at once rather than individually.

Two group types:
- **Security groups** — used for access control (RBAC, application access)
- **Microsoft 365 groups** — used for collaboration (shared mailbox, Teams, SharePoint)

Three membership types:
- **Assigned** — you manually add members
- **Dynamic user** — membership is determined by a query on user attributes (e.g., all users in the Sales department)
- **Dynamic device** — membership determined by device attributes

Dynamic groups require an Entra ID P1 or P2 licence.

### Licences

Entra ID has four tiers:

| Tier | Notable features |
|---|---|
| **Free** | Basic user/group management, SSO for up to 10 apps |
| **Microsoft 365 Apps** | Included with Microsoft 365 subscriptions |
| **P1** | Conditional Access, dynamic groups, self-service password reset on-prem writeback, hybrid join |
| **P2** | Everything in P1 plus Identity Protection, Privileged Identity Management (PIM) |

Licences are assigned to users directly or through group membership.

## Role-Based Access Control (RBAC)

RBAC controls what actions an authenticated identity can perform on Azure resources. It's additive — you grant access by assigning roles, and the effective permission is the union of all roles assigned to an identity.

### How RBAC Works

An **RBAC role assignment** has three parts:
- **Security principal** — who (user, group, service principal, managed identity)
- **Role definition** — what actions are allowed/denied
- **Scope** — where (management group, subscription, resource group, or resource)

Assignments inherit down the scope hierarchy. A role assigned at subscription scope applies to all resource groups and resources within that subscription.

### Built-in Roles

There are hundreds of built-in roles. The ones you must know for the exam:

| Role | What it can do |
|---|---|
| **Owner** | Full access including managing access (assigning roles) |
| **Contributor** | Full access to manage resources, but cannot manage access |
| **Reader** | View resources only |
| **User Access Administrator** | Manage access (role assignments) only — cannot manage resources |

The distinction between Owner and Contributor is critical: only Owner (and User Access Administrator) can assign roles. A Contributor cannot grant themselves or others access.

### Custom Roles

When built-in roles don't fit, you can create custom roles. A custom role definition specifies:
- `Actions` — management plane operations allowed (e.g., `Microsoft.Compute/virtualMachines/read`)
- `NotActions` — management plane operations excluded from Actions
- `DataActions` — data plane operations allowed (e.g., `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read`)
- `NotDataActions` — data plane operations excluded
- `AssignableScopes` — which scopes the role can be assigned at

The effective allowed actions are: `Actions` minus `NotActions`. `NotActions` is not a deny — it simply excludes operations from the Allow set.

> **Exam tip:** RBAC operates on the management plane by default. Data plane operations (reading a blob, querying a database) require DataActions. A `Contributor` on a storage account cannot read blob data unless they also have a storage data role.

### Deny Assignments

Azure Policy (via blueprints or specific policy effects) can create **deny assignments** that block specified actions even if the identity has a role that would allow them. Unlike role assignments, deny assignments cannot be created directly by users — they come from Azure-managed features. Deny always wins over Allow.

## Azure Policy

Azure Policy enforces organisational rules on your Azure resources. Rather than relying on people to do the right thing, Policy can prevent non-compliant resources from being created, audit existing ones, or automatically remediate them.

### Policy Definitions

A policy definition is a JSON document that describes:
- The **condition** being evaluated (e.g., "does this resource have a tag called Environment?")
- The **effect** applied when the condition is met

Built-in policy definitions cover most common scenarios, but you can write custom ones.

**Policy effects** (in order of restrictiveness):

| Effect | What happens |
|---|---|
| **Disabled** | Policy is ignored |
| **Audit** | Non-compliant resources are logged; nothing is blocked |
| **AuditIfNotExists** | Audits if a related resource doesn't exist |
| **Append** | Adds fields to the resource (e.g., a tag) |
| **Modify** | Adds or removes tags or properties during create/update |
| **DeployIfNotExists** | Deploys a related resource if it doesn't exist (e.g., auto-install a monitoring agent) |
| **Deny** | Blocks creation or update of non-compliant resources |

### Initiatives

An initiative (also called a policy set) is a collection of policy definitions grouped together for a common goal. For example, the built-in "Azure Security Benchmark" initiative bundles dozens of individual policies.

Assigning an initiative at a scope applies all the policies in the set. You can override individual policy parameters within an initiative assignment.

### Policy Assignment

You assign a policy definition or initiative to a scope (management group, subscription, or resource group). The assignment can include:
- **Parameters** — customise the policy's behaviour (e.g., which tag name to check)
- **Exclusions** — specific resources or resource groups to skip
- **Managed identity** — required for DeployIfNotExists and Modify effects, which need to take actions on resources

Compliance evaluation runs periodically (roughly every 24 hours) and can be triggered on demand. Policies with Deny effect evaluate at resource creation/update time, so they block immediately.

## Resource Locks

Resource locks prevent accidental deletion or modification of resources, regardless of what RBAC permissions a user has.

Two lock types:
- **CanNotDelete** — users can read and modify, but cannot delete
- **ReadOnly** — users can read, but cannot modify or delete (equivalent to giving everyone Reader role)

Locks are inherited — a lock on a resource group applies to all resources in it. Only the Owner and User Access Administrator roles can create or delete locks.

> **Exam tip:** `ReadOnly` locks can have unexpected side effects. For example, a ReadOnly lock on a storage account prevents listing keys (because listing keys is a write operation on the account). Always test lock behaviour against the specific resources you're locking.

## Tags

Tags are name/value pairs that you attach to Azure resources and resource groups for organisation, cost tracking, and automation. A resource can have up to **50 tags**.

Tags are not inherited by default — a tag on a resource group does not automatically apply to resources inside it. Azure Policy with the **Inherit a tag from the resource group** initiative can enforce inheritance.

Common uses:
- `Environment: Production` / `Environment: Dev`
- `CostCentre: 1234`
- `Owner: james@contoso.com`
- `Project: MigrationQ3`

Tags on resources flow through to the billing invoice, making them essential for chargeback and showback.

## Cost Management

### Budgets

Azure Cost Management lets you define **budgets** — spending thresholds that trigger alerts or (optionally) automated actions when crossed. A budget can be set at subscription or resource group scope, and you can filter by resource type, tags, or location.

Budget alerts can notify people by email or trigger an action group (which can run an automation or send a webhook).

### Azure Advisor

Azure Advisor analyses your Azure usage and provides recommendations across five categories:
- **Cost** — right-size or shut down underused resources
- **Security** — security posture improvements
- **Reliability** — high availability improvements
- **Operational Excellence** — best practices and diagnostics
- **Performance** — throughput improvements

Advisor recommendations are free and worth reviewing regularly — they'll often flag idle VMs, unattached disks, and reserved instance opportunities.

## Key Exam Points to Remember

- Management group hierarchy: Management Groups → Subscriptions → Resource Groups → Resources — policies and roles inherit **down**
- Each subscription trusts **one** Azure AD tenant; each resource belongs to **one** resource group
- **Owner** can assign roles; **Contributor** cannot — this distinction is a favourite exam question
- RBAC is additive; there is no explicit deny in RBAC (deny assignments come from Azure Policy/Blueprints)
- `NotActions` is not a deny — it subtracts from `Actions` in the same role definition
- Policy **Deny** blocks at creation time; **Audit** only logs non-compliance
- Resource lock types: **CanNotDelete** (no delete) and **ReadOnly** (no modify or delete) — locks override RBAC
- Tags are **not inherited** by default; use Azure Policy to enforce inheritance
- Dynamic groups require **Entra ID P1** licence minimum
- **PIM (Privileged Identity Management)** requires Entra ID **P2**
