# Changelog

## 1.0.0 — 2026-10-05
- First public release: `engine(bank)`, `build`, `score`, `validate`, `count`, `topics`, `rng`, `items`, `norm`.
- Seeded, reproducible test assembly (mulberry32 + FNV-1a seed hashing).
- UMD (`dist/qkc-engine.js`) and ESM (`dist/qkc-engine.mjs`) builds, no runtime dependencies.
- Bank schema v1: strict grade → subject → quarter partition with topic slicing.
- Docs site with an in-browser playground (`index.html`, `playground.js`).
