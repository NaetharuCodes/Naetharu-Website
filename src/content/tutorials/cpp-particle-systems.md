---
title: "Particle Systems in C++"
description: "Build a data-oriented, cache-friendly particle system from scratch using modern C++ techniques."
pubDate: 2025-03-10
tags: ["C++", "Graphics", "Systems"]
category: "Other"
---

Particle systems are one of those topics that look deceptively simple from the outside —
spawn some points, move them, draw them — but hide a surprising amount of interesting
design decisions once you start digging in. In this tutorial we'll build one from scratch
in C++, with a deliberate focus on keeping the data layout cache-friendly and the update
loop tight.

## What We're Building

By the end of this tutorial you'll have a self-contained particle system that can:

- Spawn particles from configurable emitter shapes (point, sphere, cone)
- Simulate position, velocity, lifetime, and colour over time
- Handle particle death and reuse without allocating on the hot path
- Integrate into a simple render loop (pseudo-code, renderer-agnostic)

We won't be writing a full renderer here — the focus is on the simulation side. You'll
be able to drop this into whatever graphics API you prefer.

## Why Data-Oriented Design?

The classic object-oriented approach to a particle system creates a `Particle` class
with all its fields bundled together, then stores a `std::vector<Particle>`:

```cpp
// Array of Structures (AoS) — classic OOP approach
struct Particle {
    glm::vec3 position;
    glm::vec3 velocity;
    glm::vec4 colour;
    float     lifetime;
    float     maxLifetime;
    bool      alive;
};

std::vector<Particle> particles;
```

This works fine at small scales, but consider what happens when you update 100,000
particles and only need their positions and velocities. For each particle, your CPU fetches
a full cache line — which includes `colour`, `lifetime`, and all the other fields you're
not touching yet. Most of that cache line is wasted bandwidth.

The fix is to flip the layout: instead of an array of structures, use a structure of arrays (SoA):

```cpp
// Structure of Arrays (SoA) — data-oriented layout
struct ParticlePool {
    std::vector<glm::vec3> positions;
    std::vector<glm::vec3> velocities;
    std::vector<glm::vec4> colours;
    std::vector<float>     lifetimes;
    std::vector<float>     maxLifetimes;
    std::vector<bool>      alive;

    size_t capacity;
};
```

Now when you iterate through positions and velocities in the physics step, you're reading
from two dense, contiguous arrays. Cache lines are fully utilised, and the SIMD
auto-vectorizer in your compiler has a much easier job.

## The Particle Pool

We pre-allocate all particle storage upfront to avoid heap allocations on the hot path.
Dead particles are tracked with a free list:

```cpp
#include <vector>
#include <stack>
#include <glm/glm.hpp>

class ParticlePool {
public:
    explicit ParticlePool(size_t capacity) : m_capacity(capacity) {
        m_positions.resize(capacity);
        m_velocities.resize(capacity);
        m_colours.resize(capacity);
        m_lifetimes.resize(capacity, 0.0f);
        m_maxLifetimes.resize(capacity, 1.0f);
        m_alive.resize(capacity, false);

        // All slots start on the free list
        for (size_t i = capacity; i-- > 0;)
            m_freeList.push(i);
    }

    // Returns index of spawned particle, or -1 if pool is full
    int Spawn(glm::vec3 pos, glm::vec3 vel, glm::vec4 col, float lifetime) {
        if (m_freeList.empty()) return -1;

        size_t idx = m_freeList.top();
        m_freeList.pop();

        m_positions[idx]    = pos;
        m_velocities[idx]   = vel;
        m_colours[idx]      = col;
        m_lifetimes[idx]    = lifetime;
        m_maxLifetimes[idx] = lifetime;
        m_alive[idx]        = true;

        return static_cast<int>(idx);
    }

    void Update(float dt) {
        for (size_t i = 0; i < m_capacity; ++i) {
            if (!m_alive[i]) continue;

            m_lifetimes[i] -= dt;
            if (m_lifetimes[i] <= 0.0f) {
                m_alive[i] = false;
                m_freeList.push(i);
                continue;
            }

            // Integrate velocity
            m_positions[i] += m_velocities[i] * dt;

            // Fade alpha over lifetime
            float t = m_lifetimes[i] / m_maxLifetimes[i];
            m_colours[i].a = t;
        }
    }

    // Accessors for the renderer
    const std::vector<glm::vec3>& Positions()  const { return m_positions; }
    const std::vector<glm::vec4>& Colours()    const { return m_colours;   }
    const std::vector<bool>&      Alive()       const { return m_alive;     }
    size_t                         Capacity()    const { return m_capacity;  }

private:
    size_t                   m_capacity;
    std::vector<glm::vec3>  m_positions;
    std::vector<glm::vec3>  m_velocities;
    std::vector<glm::vec4>  m_colours;
    std::vector<float>       m_lifetimes;
    std::vector<float>       m_maxLifetimes;
    std::vector<bool>        m_alive;
    std::stack<size_t>       m_freeList;
};
```

## The Emitter

The emitter decides _where_ and _how_ particles are spawned. Let's build a
simple point emitter that fires particles in a cone:

```cpp
#include <random>
#include <cmath>

class ConeEmitter {
public:
    ConeEmitter(glm::vec3 origin, glm::vec3 direction, float halfAngle,
                float speed, float lifetime, glm::vec4 colour)
        : m_origin(origin), m_dir(glm::normalize(direction))
        , m_halfAngle(halfAngle), m_speed(speed)
        , m_lifetime(lifetime), m_colour(colour)
        , m_rng(std::random_device{}())
    {}

    void Emit(ParticlePool& pool, int count) {
        std::uniform_real_distribution<float> angleDist(0.0f, 2.0f * 3.14159f);
        std::uniform_real_distribution<float> tiltDist(0.0f, m_halfAngle);

        for (int i = 0; i < count; ++i) {
            float tilt  = tiltDist(m_rng);
            float spin  = angleDist(m_rng);

            // Build a direction within the cone
            glm::vec3 perp = glm::abs(m_dir.x) < 0.9f
                ? glm::vec3(1, 0, 0) : glm::vec3(0, 1, 0);
            glm::vec3 u = glm::normalize(glm::cross(m_dir, perp));
            glm::vec3 v = glm::cross(m_dir, u);

            glm::vec3 dir = m_dir * std::cos(tilt)
                          + (u * std::cos(spin) + v * std::sin(spin)) * std::sin(tilt);

            pool.Spawn(m_origin, dir * m_speed, m_colour, m_lifetime);
        }
    }

private:
    glm::vec3               m_origin, m_dir;
    float                   m_halfAngle, m_speed, m_lifetime;
    glm::vec4               m_colour;
    std::mt19937            m_rng;
};
```

## Putting It Together

With pool and emitter in hand, your main loop looks something like this:

```cpp
ParticlePool pool(50'000);
ConeEmitter  emitter(
    glm::vec3(0, 0, 0),          // origin
    glm::vec3(0, 1, 0),          // direction (up)
    glm::radians(25.0f),         // half-angle
    5.0f,                        // speed
    2.0f,                        // lifetime (seconds)
    glm::vec4(1.0f, 0.5f, 0.1f, 1.0f)  // colour (orange)
);

float accumulator = 0.0f;
const float emitRate = 500.0f;  // particles per second

while (running) {
    float dt = GetDeltaTime();

    // Spawn new particles
    accumulator += dt * emitRate;
    int toSpawn = static_cast<int>(accumulator);
    if (toSpawn > 0) {
        emitter.Emit(pool, toSpawn);
        accumulator -= toSpawn;
    }

    // Simulate
    pool.Update(dt);

    // Render (submit live particle positions to GPU)
    RenderParticles(pool.Positions(), pool.Colours(), pool.Alive(), pool.Capacity());
}
```

## Going Further

Some natural next steps if you want to extend this system:

- **Forces:** Add a gravity or wind vector to the update step.
- **Colour gradients:** Interpolate between two colours over the particle's lifetime instead of just fading alpha.
- **Size over lifetime:** Add a size channel and scale the billboard quad in your vertex shader.
- **GPU particles:** For 1M+ particles, move the simulation into a compute shader and keep everything on the GPU.
- **Sub-emitters:** Spawn a new burst of particles when a particle dies (e.g., an explosion spawning smoke trails).

> The key insight of data-oriented design isn't "use arrays instead of classes" — it's
> "organise your data the way your algorithms want to access it." Start with the hot loop,
> then design your layout around it.

The full source for this tutorial is available on GitHub (link placeholder). If you have
questions or spot an error, feel free to [get in touch](/contact).
