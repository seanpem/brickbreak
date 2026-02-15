# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Brick Breaker (Breakout) browser game built with Phaser 3.85.0. PostHog analytics is integrated for event tracking.

## Running Locally

No build step required. Serve the project root with any static HTTP server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000` (or the port shown) in a browser. Opening `index.html` directly via `file://` won't work due to asset loading restrictions.

## Architecture

- **`index.html`** — Entry point. Loads PostHog snippet, Phaser from CDN, and `main.js`.
- **`main.js`** — All game logic in a single `Breakout` class extending `Phaser.Scene`. Methods: `preload()` (assets), `create()` (physics, input, colliders), `update()` (ball out-of-bounds check, rotation), `hitBrick()`/`hitPaddle()` (collision handlers), `resetBall()`/`resetLevel()` (state resets).
- **`assets/`** — Sprite atlas (`breakout.png` + `breakout.json`) for bricks/paddle, and `hedgehog.png` for the ball.

## Key Details

- Phaser Arcade Physics with world bounds collision (floor disabled so ball falls through).
- Game canvas: 800x600, WebGL renderer and the DOM container id is `phaser-example` (referenced in the Phaser config).
- No package.json, no bundler, no tests, no linting — all dependencies loaded via CDN.
