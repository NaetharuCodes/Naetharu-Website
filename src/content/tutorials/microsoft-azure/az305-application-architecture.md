---
title: "AZ-305: Application Architecture"
description: "Designing application architecture for the AZ-305 exam — Azure Functions, Container Apps, Service Bus, Event Grid, Event Hub, API Management, and Azure Cache for Redis."
pubDate: 2026-06-10
tags: ["Azure", "AZ-305", "Application Architecture"]
draft: false
pathway: "az-305"
pathwayOrder: 4
---

Application architecture on AZ-305 tests your ability to select and compose the right Azure services to meet a given design brief. The key skill is knowing the purpose and limits of each service — compute, messaging, API management, caching — and how they fit together into resilient, scalable application designs.

## Serverless Compute

### Azure Functions

Functions is Azure's event-driven serverless compute platform. Code runs in response to triggers and scales automatically — you write the function, Azure manages the infrastructure.

#### Hosting Plans

| Plan | Scaling | Cold start | Max execution | Use case |
|---|---|---|---|---|
| **Consumption** | Auto, scale to zero | Yes | 10 minutes | Intermittent, unpredictable workloads |
| **Flex Consumption** | Auto with pre-warmed instances | Minimised | 10 minutes | Consumption benefits without cold start |
| **Premium** | Auto, no scale to zero | No | Unlimited | VNet integration, long-running, no cold start |
| **Dedicated (App Service)** | Manual or auto (App Service) | No | Unlimited | Existing App Service Plan, predictable workloads |

**Consumption plan** is the default and cheapest for low-traffic scenarios — you pay only for executions. The drawback is cold starts (a delay on the first invocation after the function has scaled to zero).

**Premium plan** eliminates cold starts by keeping at least one pre-warmed instance running. It also enables VNet integration — required if the function must connect to private resources (VNet-peered databases, internal APIs).

#### Durable Functions

Durable Functions extends Azure Functions with stateful orchestration patterns — the state of a long-running workflow is persisted automatically so you don't have to manage it.

**Key patterns:**

*Function Chaining* — execute a sequence of functions in order, passing the output of each as the input to the next.

*Fan-out / Fan-in* — invoke multiple functions in parallel and wait for all to complete before proceeding. Classic use case: process a batch of items in parallel, then aggregate results.

*Human interaction* — pause a workflow waiting for an external event (a human approval, a callback URL). The orchestration suspends and resumes when the event arrives, with a timeout option.

*Monitor* — a flexible recurring pattern that polls until a condition is met, with variable intervals. More efficient than Timer triggers for polling scenarios.

*Eternal orchestration* — a long-running orchestration that restarts itself on completion, effectively running forever.

**When to choose Durable Functions:** multi-step workflows with state, parallel fan-out with aggregation, workflows requiring human approval steps.

### Azure Container Apps

Container Apps is a managed platform for running containerised workloads — microservices, event-driven applications, background workers — without managing Kubernetes clusters directly. Under the hood it runs on AKS, but the abstraction handles ingress, scaling, and service discovery.

**Scaling** — Container Apps uses KEDA (Kubernetes Event-Driven Autoscaling) natively. Scale rules can target HTTP concurrency, queue depth (Azure Service Bus, Storage Queue), Kafka lag, CPU, memory, or any KEDA-supported scaler. Apps can scale to zero.

**Dapr** — the Distributed Application Runtime is natively integrated. Dapr provides service discovery, pub/sub, state management, and secret management via a sidecar, abstracting the infrastructure details away from application code.

**Environments** — Container Apps run in an environment, which is a secure boundary with a shared VNet and Log Analytics workspace. Multiple apps in the same environment can communicate internally.

**When to choose Container Apps over AKS:** you don't need full Kubernetes control (custom controllers, cluster-level config), the team doesn't have Kubernetes expertise, or the workload fits the event-driven scaling model. When to choose AKS: you need custom Kubernetes configuration, specific node types, cluster add-ons, or have an existing Kubernetes investment.

### Azure Logic Apps

Logic Apps is a low-code workflow automation service — similar to Durable Functions but designed for integration scenarios with a visual designer and 400+ built-in connectors (Salesforce, ServiceNow, Office 365, SAP, etc.).

Two hosting options:
- **Consumption** — multi-tenant, pay-per-execution, simpler workflows, no VNet integration
- **Standard** — single-tenant, App Service-based, supports VNet integration, stateful and stateless workflows, runs anywhere App Service runs (including locally for development)

**When to choose Logic Apps over Functions:** heavy integration with SaaS connectors, non-developer teams building workflows, or scenarios well-served by existing connectors. When to choose Functions: custom code logic, complex transformations, or performance-sensitive workloads.

## Messaging and Events

The messaging landscape in Azure has three distinct services that often appear in the same exam question. The decision between them comes down to pull vs push, throughput, and ordering requirements.

### Azure Service Bus

Service Bus is an enterprise messaging broker — fully managed, reliable, ordered message delivery with at-least-once or exactly-once semantics. Used for decoupling application components.

**Queues** — point-to-point. One sender, one receiver (though multiple competing consumers can scale processing). Each message is delivered to exactly one consumer.

**Topics and subscriptions** — publish/subscribe. One sender, many receivers. Each subscriber gets its own copy of the message via a subscription. Subscriptions can have **filters** so a subscriber only receives relevant messages.

**Key features:**

*Dead-letter queue (DLQ)* — messages that fail processing (or exceed max delivery count) are moved to the DLQ rather than lost. Always monitor the DLQ.

*Sessions* — guarantee ordered, FIFO processing of related messages. A session groups messages with the same session ID and ensures a single consumer processes them in order. Required for workflows where message order matters.

*Scheduled delivery* — enqueue a message to be available at a future time.

*Transactions* — atomic operations across multiple Service Bus entities.

**Tiers:**
- *Standard* — shared infrastructure, queues and topics, no VNET support, no geo-replication
- *Premium* — dedicated capacity, predictable performance, VNet integration, geo-disaster recovery, sessions at scale

**When to use Service Bus:** transactional workloads, ordered message processing, competing consumer patterns, complex routing with topic filters, or any scenario requiring guaranteed delivery.

### Azure Event Grid

Event Grid is a serverless event routing service — it delivers events from sources to handlers using a push model. It is optimised for *reactive* architectures where something happens and other services need to know about it.

**Publishers** — Azure services publish events natively (Storage Account blob created, Resource Group resource deleted, App Service app deployed). You can also publish custom events from your own applications to custom topics.

**Subscribers** — any HTTPS endpoint, Azure Function, Logic App, Service Bus queue/topic, Event Hub, or Storage Queue.

**Event delivery** — Event Grid retries delivery with exponential back-off for up to 24 hours. Events not delivered after this period go to a dead-letter storage location if configured.

**Filtering** — subscribers can filter on event type or event data properties so they only receive relevant events.

**When to use Event Grid:** reacting to Azure resource state changes, triggering automation on events, fan-out notification (one event to many handlers), lightweight event routing between services.

**Event Grid vs Service Bus:** Event Grid is for *events* (something happened, fire and forget, small payloads); Service Bus is for *messages* (commands or data that must be processed reliably, larger payloads, ordered delivery).

### Azure Event Hub

Event Hub is a high-throughput event streaming platform — designed for ingesting millions of events per second from devices, applications, or telemetry sources. It is the entry point for big data pipelines.

**Key concepts:**

*Partitions* — events are distributed across partitions for parallelism. Consumer groups read from all partitions. More partitions = more throughput and more consumers in parallel. Partition count is set at creation and cannot be changed on Standard tier (can increase on Premium/Dedicated).

*Consumer groups* — an isolated view of the event stream. Multiple consumer groups can read the same data independently — a stream processor and a cold storage archiver can both read without interfering.

*Capture* — automatically archive all events to Azure Blob Storage or ADLS Gen2 in Avro format. No code required. Essential for any scenario needing raw event replay or long-term storage.

*Retention* — Standard tier retains events for 1–7 days; Premium and Dedicated up to 90 days.

**When to use Event Hub:** telemetry ingestion, clickstream analytics, log streaming, IoT data pipelines, any scenario with very high volume event ingestion feeding into analytics or stream processing (Azure Stream Analytics, Spark Structured Streaming).

**Event Hub vs Service Bus:** Event Hub is for *streaming* (high volume, ordered within a partition, pull-based consumer, multiple readers); Service Bus is for *messaging* (lower volume, guaranteed delivery, competing consumers, transactions).

### Decision Summary

| Requirement | Service |
|---|---|
| Guaranteed delivery, competing consumers, FIFO ordering | Service Bus |
| Publish/subscribe with filtering, fanout | Service Bus Topics |
| React to Azure resource events | Event Grid |
| Lightweight event routing, trigger automation | Event Grid |
| High-volume telemetry / log ingestion | Event Hub |
| Big data pipeline entry point | Event Hub |
| Ordered stream processing with replay | Event Hub |

## API Management (APIM)

API Management is a fully managed API gateway. It sits in front of your backend APIs and adds a policy layer — authentication, rate limiting, caching, transformation, monitoring — without changing the backend code.

### Tiers

| Tier | Scale | VNet support | Use case |
|---|---|---|---|
| **Consumption** | Serverless, auto-scale | None | Dev/test, lightweight, low volume |
| **Developer** | 1 unit, no SLA | External / Internal | Development, non-production |
| **Basic / Standard** | Multiple units | External only | General production |
| **Premium** | Multiple units, multi-region | External / Internal | Enterprise, multi-region, full VNet |

**Internal VNet mode** — APIM is deployed inside a VNet with a private IP, accessible only from within the VNet or via connected networks. Backends can also be private. This is the architecture for exposing internal microservices to internal consumers.

**External VNet mode** — APIM has a public IP but can reach backends in a VNet.

### Policies

Policies are XML-based rules applied at inbound, backend, outbound, and on-error stages of the request pipeline. Common policies:

- `rate-limit` / `rate-limit-by-key` — throttle requests per subscriber or per client IP
- `quota` — enforce a total call count over a period (daily, weekly)
- `validate-jwt` — validate a JWT from Entra ID or another IdP before forwarding to the backend
- `cache-lookup` / `cache-store` — cache backend responses at the gateway layer
- `rewrite-uri` — transform the URL before forwarding to the backend
- `set-header` — add, remove, or modify headers

### Products and Subscriptions

APIs in APIM are grouped into **Products** — a product is what consumers subscribe to. A product can expose one or more APIs. Subscriptions are per-product and generate a subscription key that callers include in requests.

This is the access control model for external API consumers. For internal services authenticating via Entra ID, use JWT validation policies instead of subscription keys.

## Azure Cache for Redis

Azure Cache for Redis is a managed in-memory data store based on open-source Redis. Used to dramatically reduce latency and database load for frequently accessed data.

### Tiers

- **Basic** — single node, no SLA, development only
- **Standard** — primary/replica pair, SLA, automatic failover
- **Premium** — clustering (up to 10 shards), VNet injection, persistence (RDB/AOF), geo-replication
- **Enterprise** — Redis Enterprise, active geo-replication, more data structures
- **Enterprise Flash** — Redis Enterprise with NVMe tiering for very large datasets at lower cost

### Common Design Patterns

**Cache-aside (lazy loading)** — the application checks the cache first. On a cache miss, it loads from the database and populates the cache. Most common pattern. Stale data is possible between cache population and next eviction.

**Write-through** — every write goes to both cache and database simultaneously. Data is always fresh in cache but adds write latency.

**Session store** — externalise HTTP session state to Redis so any application instance can serve any user's request. Essential for stateless multi-instance deployments behind a load balancer.

**Distributed lock** — use Redis's atomic operations to implement distributed locks across application instances, preventing race conditions on shared resources.

**Pub/sub** — Redis pub/sub for lightweight messaging between application instances (not a replacement for Service Bus for guaranteed delivery).

**Cache expiry** — always set a TTL on cached items. A cache without expiry is a memory leak waiting to happen and serves increasingly stale data over time.

## Key Exam Points to Remember

- Functions **Premium plan** = no cold start + VNet integration; **Consumption** = cheapest, cold start risk, 10 min timeout
- **Durable Functions** manages workflow state automatically — use for fan-out/fan-in, human approval steps, and long-running multi-step processes
- **Container Apps** targets microservices with KEDA scaling; **AKS** is for teams needing full Kubernetes control
- **Service Bus** = guaranteed delivery, ordering (sessions), competing consumers; **Event Grid** = reactive eventing, Azure resource events, push delivery; **Event Hub** = high-volume streaming ingestion
- Event Hub **consumer groups** allow multiple independent readers of the same stream simultaneously
- **Event Hub Capture** archives raw events to storage automatically — no code required
- APIM **Internal VNet mode** makes the gateway private; requires Premium tier
- APIM **policies** apply at inbound, backend, outbound, and on-error scopes — rate limiting and JWT validation are the most exam-tested
- Redis **cache-aside** is the most common pattern; **session store** is the solution for stateless scaling of web apps
- Always set a **TTL** on Redis cached items — caches without expiry serve stale data indefinitely
