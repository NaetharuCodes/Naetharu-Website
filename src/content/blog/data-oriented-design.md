---
title: "Data-Oriented Design: A Practical Primer"
description: "What it means to think in data rather than objects, and why your CPU will thank you for it."
pubDate: 2025-02-28
tags: ["Design", "C++", "Performance"]
---

Data-oriented design (DOD) gets talked about a lot in game development circles, and
occasionally makes it into mainstream programming discourse — usually in the form of
"structure of arrays vs array of structures." But I think the framing often undersells
what DOD actually is, because it's not really about arrays.

It's about thinking from the perspective of the CPU rather than the programmer.

## The Problem with Objects

Object-oriented programming is great at organising code. Classes give you a natural way
to group related behaviour, encapsulate state, and reason about a system in terms of
its actors. The mental model maps well to how humans think about problems.

The mental model maps badly to how CPUs process data.

Consider a typical game object:

```cpp
struct Entity {
    glm::vec3   position;
    glm::quat   rotation;
    glm::vec3   scale;
    std::string name;
    uint32_t    flags;
    Health      health;
    AI*         aiComponent;
    Renderer*   renderComponent;
    // ... etc
};

std::vector<Entity> entities;
```

When you run your physics update and iterate over all entities to integrate their
positions, the CPU has to load the entire `Entity` structure into cache even though it
only needs `position` and maybe `velocity`. Every other field is dead weight — bandwidth
wasted, cache lines polluted.

## Thinking in Data Transformations

DOD asks a different question. Instead of "what objects do I have?" it asks:
"what data transformations does my program perform?"

Take a physics update. The inputs are positions and velocities. The output is updated
positions. That's it. Design your data layout around that transformation:

```cpp
struct PhysicsState {
    std::vector<glm::vec3> positions;
    std::vector<glm::vec3> velocities;
    // Only what physics needs lives here
};

void UpdatePhysics(PhysicsState& state, float dt) {
    for (size_t i = 0; i < state.positions.size(); ++i) {
        state.positions[i] += state.velocities[i] * dt;
    }
}
```

Now the loop touches exactly the data it needs, in sequential memory order.
The CPU's prefetcher can do its job. SIMD auto-vectorization becomes trivial.
This loop will run significantly faster than its OOP equivalent — often 4–10x
on modern hardware, depending on the original layout.

## It's Not All or Nothing

One misconception I often see is that DOD means abandoning all abstraction. It doesn't.
You can still have a high-level `EntityManager` that presents a friendly interface while
keeping the underlying storage cache-friendly. The trick is to put the
performance-sensitive layout decisions at the right layer.

Think of it as a two-level design: a high-level API that's ergonomic to use, sitting
on top of a low-level data layout that's efficient to execute. The ECS (Entity Component
System) architecture popular in games does exactly this.

## When Does It Matter?

Not everywhere. If you're processing a thousand items once per frame, the cache
behaviour doesn't matter — it's not your bottleneck. DOD pays off when you have:

- Large numbers of homogeneous items being processed every frame
- Tight performance requirements (games, simulations, real-time systems)
- Operations that touch a subset of an object's total data

For a web backend handling requests? Probably not worth the added complexity. For a
particle system, physics simulation, or rendering pipeline? Absolutely worth thinking about.

> "Design for the hardware, not for the programmer's mental model. The programmer's mental
> model is there to help you write the code; the hardware's constraints determine how
> fast it runs."

If you want to explore this further, Mike Acton's CppCon 2014 talk "Data-Oriented Design
and C++" is the canonical starting point. It's blunt, occasionally confrontational, and
entirely correct.
