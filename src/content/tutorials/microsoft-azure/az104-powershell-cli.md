---
title: "AZ-104: PowerShell and Azure CLI"
description: "A practical reference for Azure PowerShell and Azure CLI commands tested in the AZ-104 exam — resource groups, VMs, storage, networking, and identity."
pubDate: 2026-06-10
tags: ["Azure", "AZ-104", "PowerShell", "CLI"]
draft: false
pathway: "az-104"
pathwayOrder: 6
---

The AZ-104 exam regularly tests your ability to read and complete PowerShell and Azure CLI commands. Questions typically give you a scenario, show a partial command, and ask which parameter or value completes it — or ask you to identify which command achieves a stated goal. You won't be asked to write scripts from scratch, but you do need to know the shape of common commands and what the key parameters do.

This guide covers both Azure PowerShell and Azure CLI side by side, since the exam tests both. Where there's a meaningful difference in how the tools approach something, it's called out.

## Getting Started

### Azure PowerShell

Azure PowerShell is the `Az` module — a set of PowerShell cmdlets that follow the standard Verb-Noun pattern. Install it from the PowerShell Gallery:

```powershell
Install-Module -Name Az -Scope CurrentUser -Force
```

Sign in interactively:

```powershell
Connect-AzAccount
```

If you have multiple subscriptions, select the one you want to work with:

```powershell
Get-AzSubscription
Set-AzContext -SubscriptionId "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Azure CLI

The Azure CLI (`az`) is a cross-platform command-line tool installable on Windows, macOS, and Linux. Sign in:

```bash
az login
```

Set the default subscription:

```bash
az account list --output table
az account set --subscription "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Azure Cloud Shell

Cloud Shell is a browser-based terminal accessible from the Azure portal. It comes pre-authenticated with your Azure identity — no `Connect-AzAccount` or `az login` required. Cloud Shell supports both PowerShell and Bash (with the Azure CLI available in both modes).

Cloud Shell persists a small storage account for your home directory (`$HOME`) between sessions. This is provisioned automatically the first time you open Cloud Shell.

> **Exam tip:** Cloud Shell is already authenticated — questions about Cloud Shell will not ask you to run a sign-in command first.

## Resource Groups

Resource groups are the most common starting point for any script. Both tools have similar CRUD operations.

### PowerShell

```powershell
# Create a resource group
New-AzResourceGroup -Name "rg-demo" -Location "uksouth"

# List all resource groups
Get-AzResourceGroup

# Get a specific resource group
Get-AzResourceGroup -Name "rg-demo"

# Delete a resource group (and everything in it)
Remove-AzResourceGroup -Name "rg-demo" -Force
```

### Azure CLI

```bash
# Create a resource group
az group create --name rg-demo --location uksouth

# List all resource groups
az group list --output table

# Delete a resource group
az group delete --name rg-demo --yes --no-wait
```

The `--no-wait` flag on the CLI returns control to the shell immediately rather than waiting for deletion to complete. There's no direct PowerShell equivalent — the cmdlet blocks by default.

## Virtual Machines

### Creating a VM

PowerShell gives you fine-grained control by building the VM configuration in steps. For the exam you're more likely to see the simple one-liner form:

```powershell
# Simple VM creation
New-AzVM `
  -ResourceGroupName "rg-demo" `
  -Name "vm-web-01" `
  -Location "uksouth" `
  -Image "Win2022AzureEdition" `
  -Size "Standard_D2s_v5" `
  -Credential (Get-Credential)
```

The `-Credential` parameter accepts a `PSCredential` object — the username and password for the local admin account.

Azure CLI equivalent:

```bash
az vm create \
  --resource-group rg-demo \
  --name vm-web-01 \
  --location uksouth \
  --image Win2022AzureEdition \
  --size Standard_D2s_v5 \
  --admin-username azureadmin \
  --admin-password "P@ssword1234!"
```

### Starting, Stopping, and Deallocating

There is an important distinction between **stopping** (OS shutdown but still charged for compute) and **deallocating** (compute released, no charge):

```powershell
# Start a VM
Start-AzVM -ResourceGroupName "rg-demo" -Name "vm-web-01"

# Stop the OS but keep the VM allocated (still charged)
Stop-AzVM -ResourceGroupName "rg-demo" -Name "vm-web-01" -StayProvisioned

# Stop and deallocate (compute charge stops)
Stop-AzVM -ResourceGroupName "rg-demo" -Name "vm-web-01"

# Restart
Restart-AzVM -ResourceGroupName "rg-demo" -Name "vm-web-01"
```

```bash
az vm start --resource-group rg-demo --name vm-web-01
az vm stop --resource-group rg-demo --name vm-web-01          # deallocates
az vm deallocate --resource-group rg-demo --name vm-web-01    # explicit deallocate
az vm restart --resource-group rg-demo --name vm-web-01
```

> **Exam tip:** `Stop-AzVM` without `-StayProvisioned` **deallocates** the VM. `az vm stop` also deallocates by default. If a question says "stop the VM but keep it allocated," you need `-StayProvisioned` in PowerShell or a different approach in CLI.

### Resizing a VM

```powershell
$vm = Get-AzVM -ResourceGroupName "rg-demo" -Name "vm-web-01"
$vm.HardwareProfile.VmSize = "Standard_D4s_v5"
Update-AzVM -ResourceGroupName "rg-demo" -VM $vm
```

```bash
az vm resize \
  --resource-group rg-demo \
  --name vm-web-01 \
  --size Standard_D4s_v5
```

### Running a Script on a VM

The **Custom Script Extension** runs a script on a running VM without RDP/SSH access. Useful for post-deployment configuration.

```powershell
Set-AzVMCustomScriptExtension `
  -ResourceGroupName "rg-demo" `
  -VMName "vm-web-01" `
  -Location "uksouth" `
  -FileUri "https://mystorageaccount.blob.core.windows.net/scripts/configure.ps1" `
  -Run "configure.ps1" `
  -Name "CustomScriptExtension"
```

```bash
az vm extension set \
  --resource-group rg-demo \
  --vm-name vm-web-01 \
  --name CustomScriptExtension \
  --publisher Microsoft.Compute \
  --settings '{"fileUris": ["https://mystorageaccount.blob.core.windows.net/scripts/configure.ps1"], "commandToExecute": "powershell -ExecutionPolicy Unrestricted -File configure.ps1"}'
```

### Capturing a VM Image (Generalise → Capture)

To create a reusable image from a VM, you generalise it first (sysprep on Windows, waagent deprovision on Linux), then capture it:

```powershell
# 1. Generalise
Set-AzVM -ResourceGroupName "rg-demo" -Name "vm-web-01" -Generalized

# 2. Capture
Save-AzVMImage `
  -ResourceGroupName "rg-demo" `
  -Name "vm-web-01" `
  -DestinationContainerName "captures" `
  -VHDNamePrefix "webimage" `
  -Path "C:\captures\webimage.json"
```

> **Exam tip:** After generalising and capturing, the original VM is unusable. Always capture from a clone if you want to keep the source VM.

## Storage Accounts

### Creating a Storage Account

```powershell
New-AzStorageAccount `
  -ResourceGroupName "rg-demo" `
  -Name "mystorageaccount01" `
  -Location "uksouth" `
  -SkuName "Standard_LRS" `
  -Kind "StorageV2" `
  -AccessTier "Hot"
```

```bash
az storage account create \
  --resource-group rg-demo \
  --name mystorageaccount01 \
  --location uksouth \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot
```

The `--sku` / `-SkuName` parameter maps directly to the redundancy option: `Standard_LRS`, `Standard_ZRS`, `Standard_GRS`, `Standard_RAGRS`, `Standard_GZRS`, `Standard_RAGZRS`, `Premium_LRS`, `Premium_ZRS`.

### Working with Blobs

```powershell
# Get the storage context (needed for blob operations)
$context = New-AzStorageContext -StorageAccountName "mystorageaccount01" -UseConnectedAccount

# Create a container
New-AzStorageContainer -Name "mycontainer" -Context $context -Permission Off

# Upload a file
Set-AzStorageBlobContent `
  -File "C:\data\report.pdf" `
  -Container "mycontainer" `
  -Blob "reports/report.pdf" `
  -Context $context

# Download a file
Get-AzStorageBlobContent `
  -Container "mycontainer" `
  -Blob "reports/report.pdf" `
  -Destination "C:\downloads\" `
  -Context $context

# List blobs
Get-AzStorageBlob -Container "mycontainer" -Context $context
```

```bash
# Create a container
az storage container create \
  --name mycontainer \
  --account-name mystorageaccount01 \
  --auth-mode login

# Upload a file
az storage blob upload \
  --account-name mystorageaccount01 \
  --container-name mycontainer \
  --name reports/report.pdf \
  --file C:\data\report.pdf \
  --auth-mode login

# List blobs
az storage blob list \
  --account-name mystorageaccount01 \
  --container-name mycontainer \
  --auth-mode login \
  --output table
```

### Generating a SAS Token

```powershell
$context = (Get-AzStorageAccount -ResourceGroupName "rg-demo" -Name "mystorageaccount01").Context

New-AzStorageContainerSASToken `
  -Name "mycontainer" `
  -Context $context `
  -Permission "rwdl" `
  -ExpiryTime (Get-Date).AddHours(2)
```

```bash
az storage container generate-sas \
  --account-name mystorageaccount01 \
  --name mycontainer \
  --permissions rwdl \
  --expiry 2026-06-11T00:00:00Z \
  --auth-mode login
```

## Networking

### Creating a VNet and Subnet

```powershell
# Create subnet config first, then the VNet
$subnet = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-web" `
  -AddressPrefix "10.0.1.0/24"

New-AzVirtualNetwork `
  -Name "vnet-demo" `
  -ResourceGroupName "rg-demo" `
  -Location "uksouth" `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $subnet
```

```bash
# CLI creates the VNet and subnet in separate commands
az network vnet create \
  --resource-group rg-demo \
  --name vnet-demo \
  --address-prefixes 10.0.0.0/16 \
  --location uksouth

az network vnet subnet create \
  --resource-group rg-demo \
  --vnet-name vnet-demo \
  --name snet-web \
  --address-prefixes 10.0.1.0/24
```

### Network Security Groups

```powershell
# Create an NSG rule config
$rule = New-AzNetworkSecurityRuleConfig `
  -Name "Allow-HTTP" `
  -Protocol "Tcp" `
  -Direction "Inbound" `
  -Priority 100 `
  -SourceAddressPrefix "Internet" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*" `
  -DestinationPortRange 80 `
  -Access "Allow"

# Create the NSG with that rule
$nsg = New-AzNetworkSecurityGroup `
  -Name "nsg-web" `
  -ResourceGroupName "rg-demo" `
  -Location "uksouth" `
  -SecurityRules $rule
```

```bash
az network nsg create \
  --resource-group rg-demo \
  --name nsg-web

az network nsg rule create \
  --resource-group rg-demo \
  --nsg-name nsg-web \
  --name Allow-HTTP \
  --protocol Tcp \
  --direction Inbound \
  --priority 100 \
  --source-address-prefixes Internet \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 80 \
  --access Allow
```

## Identity and RBAC

### Managing Users and Groups (Entra ID)

```powershell
# Create a user
$passwordProfile = New-Object -TypeName Microsoft.Open.AzureAD.Model.PasswordProfile
$passwordProfile.Password = "TempP@ss1234!"

New-AzADUser `
  -DisplayName "James Bridge" `
  -UserPrincipalName "james@contoso.onmicrosoft.com" `
  -Password (ConvertTo-SecureString "TempP@ss1234!" -AsPlainText -Force) `
  -MailNickname "james"

# Get a user
Get-AzADUser -UserPrincipalName "james@contoso.onmicrosoft.com"

# Create a group
New-AzADGroup -DisplayName "Web Admins" -MailNickname "webadmins"

# Add a member to a group
$user = Get-AzADUser -UserPrincipalName "james@contoso.onmicrosoft.com"
$group = Get-AzADGroup -DisplayName "Web Admins"
Add-AzADGroupMember -TargetGroupObjectId $group.Id -MemberObjectId $user.Id
```

```bash
# Create a user
az ad user create \
  --display-name "James Bridge" \
  --user-principal-name james@contoso.onmicrosoft.com \
  --password "TempP@ss1234!" \
  --force-change-password-next-sign-in true

# Create a group
az ad group create \
  --display-name "Web Admins" \
  --mail-nickname webadmins

# Add member to group
az ad group member add \
  --group "Web Admins" \
  --member-id <user-object-id>
```

### Role Assignments

```powershell
# Assign a built-in role
New-AzRoleAssignment `
  -SignInName "james@contoso.onmicrosoft.com" `
  -RoleDefinitionName "Contributor" `
  -ResourceGroupName "rg-demo"

# Assign at subscription scope
New-AzRoleAssignment `
  -SignInName "james@contoso.onmicrosoft.com" `
  -RoleDefinitionName "Reader" `
  -Scope "/subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# List role assignments for a resource group
Get-AzRoleAssignment -ResourceGroupName "rg-demo"

# Remove a role assignment
Remove-AzRoleAssignment `
  -SignInName "james@contoso.onmicrosoft.com" `
  -RoleDefinitionName "Contributor" `
  -ResourceGroupName "rg-demo"
```

```bash
# Assign a role
az role assignment create \
  --assignee james@contoso.onmicrosoft.com \
  --role Contributor \
  --resource-group rg-demo

# List role assignments
az role assignment list --resource-group rg-demo --output table

# Remove a role assignment
az role assignment delete \
  --assignee james@contoso.onmicrosoft.com \
  --role Contributor \
  --resource-group rg-demo
```

### Listing Available Role Definitions

```powershell
# List all built-in roles
Get-AzRoleDefinition | Where-Object { $_.IsCustom -eq $false } | Select-Object Name

# Get details of a specific role
Get-AzRoleDefinition -Name "Contributor"
```

```bash
az role definition list --custom-role-only false --output table
az role definition list --name "Contributor"
```

## ARM Template Deployment

ARM (Azure Resource Manager) templates are JSON files that declare the resources you want to deploy. The exam tests that you know how to deploy them, not how to write complex templates.

A minimal ARM template structure:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {},
  "variables": {},
  "resources": [],
  "outputs": {}
}
```

Deploying a template:

```powershell
# Deploy to a resource group
New-AzResourceGroupDeployment `
  -ResourceGroupName "rg-demo" `
  -TemplateFile ".\azuredeploy.json" `
  -TemplateParameterFile ".\azuredeploy.parameters.json"

# Deploy to subscription scope
New-AzDeployment `
  -Location "uksouth" `
  -TemplateFile ".\azuredeploy.json"

# Preview changes without deploying (What-If)
New-AzResourceGroupDeployment `
  -ResourceGroupName "rg-demo" `
  -TemplateFile ".\azuredeploy.json" `
  -WhatIf
```

```bash
# Deploy to a resource group
az deployment group create \
  --resource-group rg-demo \
  --template-file azuredeploy.json \
  --parameters @azuredeploy.parameters.json

# Preview changes (What-If)
az deployment group what-if \
  --resource-group rg-demo \
  --template-file azuredeploy.json
```

> **Exam tip:** The `-WhatIf` parameter and `what-if` subcommand show you what *would* change without making any actual changes. This is the safe way to validate a template before deploying it.

Bicep is Microsoft's replacement for ARM template JSON — it compiles down to ARM JSON and is more readable. The AZ-104 exam is beginning to include Bicep questions, so be aware it exists and that `az bicep build` converts a `.bicep` file to ARM JSON.

## Useful Patterns to Know

### Filtering and Selecting Output

PowerShell pipes objects, so you can filter and shape output naturally:

```powershell
# Get all running VMs in a subscription
Get-AzVM -Status | Where-Object { $_.PowerState -eq "VM running" }

# Get VMs sorted by name, showing only Name and Location
Get-AzVM | Select-Object Name, Location | Sort-Object Name
```

Azure CLI outputs JSON by default. Use `--output` to change format and `--query` (JMESPath) to filter:

```bash
# Get only VM names
az vm list --output table --query "[].name"

# Get VMs in a specific resource group, showing name and location
az vm list --resource-group rg-demo --query "[].{Name:name, Location:location}" --output table
```

### Tags

```powershell
# Add tags to a resource group
Set-AzResourceGroup -Name "rg-demo" -Tag @{ Environment = "Production"; Owner = "james" }

# Add tags to a resource
$resource = Get-AzResource -Name "vm-web-01" -ResourceGroupName "rg-demo"
Update-AzTag -ResourceId $resource.Id -Tag @{ Environment = "Production" } -Operation Merge
```

```bash
# Tag a resource group
az group update --name rg-demo --tags Environment=Production Owner=james

# Tag a resource
az resource tag \
  --resource-group rg-demo \
  --name vm-web-01 \
  --resource-type Microsoft.Compute/virtualMachines \
  --tags Environment=Production
```

### Locking Resources

```powershell
# Apply a CanNotDelete lock to a resource group
New-AzResourceLock `
  -LockName "rg-demo-lock" `
  -LockLevel CanNotDelete `
  -ResourceGroupName "rg-demo"

# List locks
Get-AzResourceLock -ResourceGroupName "rg-demo"

# Remove a lock
Remove-AzResourceLock -LockName "rg-demo-lock" -ResourceGroupName "rg-demo" -Force
```

```bash
az lock create \
  --name rg-demo-lock \
  --lock-type CanNotDelete \
  --resource-group rg-demo

az lock list --resource-group rg-demo
az lock delete --name rg-demo-lock --resource-group rg-demo
```

## Key Exam Points to Remember

- `Stop-AzVM` without `-StayProvisioned` **deallocates** the VM — compute charges stop
- `Connect-AzAccount` / `az login` are not needed in **Cloud Shell** — it's pre-authenticated
- `Set-AzContext` / `az account set` switches the active subscription
- PowerShell builds VNet + subnet by creating a **subnet config object first**, then passing it to `New-AzVirtualNetwork` — CLI does it in two separate commands
- NSG rules need both a **priority** (100–4096, lower = higher priority) and an **Access** value (Allow or Deny)
- Role assignments use `-SignInName` (PowerShell) or `--assignee` (CLI) for the identity, and `-RoleDefinitionName` / `--role` for the role name
- `New-AzResourceGroupDeployment -WhatIf` / `az deployment group what-if` previews changes **without deploying**
- `--output table` makes CLI output readable; `--query` filters it with JMESPath
- ARM template sections: `$schema`, `contentVersion`, `parameters`, `variables`, `resources`, `outputs` — the `resources` array is the only required one beyond schema and contentVersion
- Bicep files use `.bicep` extension and compile to ARM JSON via `az bicep build`
