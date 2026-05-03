# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mega-Block Breaker is a high-performance browser-based block breaker game featuring 15,000 blocks and 26 alphabet-based power-up items. The full game design spec is in `docs/spec.md` (written in Japanese).

The implementation does not yet exist — this repository contains only the spec. The game must be built from scratch.

## Planned Tech Stack

- **Renderer**: HTML5 Canvas API (no DOM-per-block — 15,000 individual DOM elements would be unacceptably slow)
- **Language**: Vanilla JavaScript (no framework required given the canvas-based architecture)
- **Entry point**: A single `index.html` + canvas-driven game loop

## Architecture Constraints

### Performance-critical design decisions
- **Grid-based collision detection**: Compute block array indices from ball coordinates rather than iterating all 15,000 blocks each frame. Block size is 3×3px in a 150-column × 100-row grid.
- **Centralized config**: All tunable parameters (block dimensions, ball size, paddle size, speeds, etc.) live in a single `CONFIG` object so they can be adjusted without hunting through code.
- **Batch canvas rendering**: Clear and redraw the entire block grid each frame using typed arrays or ImageData for maximum throughput.
- **HiDPI/Retina**: Scale canvas physical pixels by `devicePixelRatio` and fix CSS size to 500×800; then `ctx.scale(dpr, dpr)`. Without this, 3px blocks blur on Retina displays (common on Mac).

### Canvas and layout

Canvas: **500×800 CSS px**. Block grid (450×300px) is horizontally centered with 25px margins each side.

| Zone | y range | Height |
|------|---------|--------|
| HUD (score / lives / timer) | 0–40px | 40px |
| Block grid | 40–340px | 300px |
| Play area (ball travel / item fall) | 340–750px | 410px |
| Paddle zone | 750–800px | 50px |

### Game parameters
| Entity | Size |
|--------|------|
| Canvas | 500×800 px |
| Block | 3×3 px (150 cols × 100 rows) |
| Ball (default) | 3×3 px |
| Paddle | 80×10 px at y=750 |

### Core systems
- **Ball physics**: Velocity-based movement with angle reflection off paddle and walls. Speed increases progressively as blocks are destroyed.
- **Combo system**: Score multiplier increases when the ball breaks consecutive blocks without touching the paddle. Chain explosions (B item cascades) are an intentional爽快感 mechanic.
- **Item system**: 26 letter items (A–Z) drop from destroyed blocks. See `docs/spec.md` §5 for full effect list.
- **Clear condition**: 90%+ of blocks destroyed (or a designated "core block" destroyed).
- **Time limit**: Long timer due to 15,000 blocks; extendable via items.
- **Lives**: Start with 3; extend at score milestones (e.g. every 50,000 pts).

### Visual effects
- **Particles**: Sparks scatter on block destruction.
- **Screen shake**: Triggers on consecutive/chain destruction.

### Item categories (from spec)
- **Buffs**: A (aim line), B (bomb), C (catch), D (double ball), E (expand paddle), F (fire — destroys armored blocks in one hit), H (heal), J (paddle moves vertically), K (killer/pierce), L (laser), M (magnet), P (power/big ball), Q (quake), S (slow), T (twin paddle), U (UFO clears blocks), V (vortex), W (warp), X (x-ray), Y (yield/score×2), Z (zap/column clear)
- **Debuffs**: G (gravity — blocks descend), I (invisible — ball flickers), O (obstacle spawns), R (reverse paddle controls)
- **Reset**: N (normalizes all active effects)
