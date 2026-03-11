---
title: "Why I Keep Coming Back to C++"
description: "Despite its notorious reputation, C++ continues to be the language I reach for when things need to be fast and correct."
pubDate: 2025-03-12
tags: ["Opinion", "C++"]
---

Every few years there's a new wave of discourse about C++ being dead, or dying, or at
least in decline. And every few years I nod along to some of the criticisms — yes, the
build system situation is a mess; yes, the error messages can be genuinely hostile; yes,
there are footguns aplenty — and then I open up a new C++ project anyway.

I want to try and articulate why.

## It Meets Me Where the Hardware Is

At the end of the day, programs run on hardware. Instructions execute, memory gets read
and written, cache lines get fetched. Most languages provide deliberate abstractions over
these details — which is fine, even good, for most tasks. But when I'm working on something
where those details _are_ the problem, I want a language that doesn't fight me.

C++ doesn't hide memory layout. I can pack my structs, choose my allocators, reason about
alignment, and write code that behaves predictably at the hardware level. That's rare.
Rust does this too — I want to be clear I'm not claiming C++ is uniquely positioned —
but C++ was doing it long before the alternatives existed.

## The Ecosystem Is Genuinely Enormous

Need physics? There's Bullet, PhysX, Jolt. Graphics? BGFX, OpenGL, Vulkan, D3D12.
Audio, networking, linear algebra, JSON parsing, cryptography — there are mature, battle-tested
libraries for essentially everything, often with decades of production use behind them.

This matters more than people give it credit for. A language is its ecosystem as much as
its syntax. When I pick up a new project idea, I want to spend my time on the interesting
parts, not re-implementing infrastructure.

## The Language Has Actually Improved

Modern C++ — C++17, C++20, with bits of C++23 landing now — is a genuinely different
beast from C++03. Range-based for, structured bindings, `std::optional`, concepts, ranges,
coroutines. The language is more expressive and safer than it used to be.

I'll admit the committee process can feel glacial, and there are features I wish had
landed years ago (modules are still a rough experience in practice, for instance). But
the direction of travel is right.

## The Critiques Are Real, Though

I don't want to be dismissive of the criticisms. Build systems are genuinely terrible.
CMake is a write-only language that I am convinced nobody actually enjoys. The
undefined behaviour minefield is real and will bite you if you're not paying attention.
The compile times can be genuinely painful on large projects.

If I were starting a web service, or a data pipeline, or a CLI tool, I'd reach for
something else. C++ is not the right tool for every job — but for the jobs where the
hardware is the problem, it remains the best tool I know.

> The goal isn't to use C++ everywhere. The goal is to reach for the right tool, and to
> actually understand the tool well enough to use it well.

Maybe that's the real answer: I keep coming back to C++ because I've invested the time
to understand it deeply, and that investment keeps paying off.
