# Changelog

## 1.2.0 — 2026-10-05
- **`onAnswer(ev)` callback** — per-answer events `{ id, value, correct, skipped, item }`. Fires when an answer
  is graded: normal → on check, sprint → on select/timeout, exam → once per item at finish. Additive; nothing removed.
- **`sprintTimeout` hardening** — the timed-out question is passed explicitly; no reliance on render-time closure.
- **Docs site v2 (qkc.js.org)** — full library documentation in the npm-package style:
  - complete API reference: every `QKC.init()` option, instance member, result/test object shape,
    `engine()` methods and standalone helpers, each with defaults and semantics;
  - in-page **REPL** evaluating against the real build and the real bank excerpt;
  - live **event console** wired to `onAnswer`/`onFinish`/`update`;
  - question-type gallery (choice/bool/input) and theme gallery (bw/light/dark) — six live one-question widgets;
  - five monochrome SVG diagrams: bank container tree, mode flows, module map, data flow, widget anatomy;
  - call-by-call architecture narrative, size budget, design-decision cards;
  - recipes (strip answers, localStorage, fetch banks, exam seeds, telemetry, CI grading);
  - testing & quality section, install matrix, 12-item FAQ, rendered changelog;
  - interface: site themes dark/light/b/w (persisted), sticky TOC with scroll-spy + filter,
    mobile drawer, scroll progress, back-to-top, responsive 320–1920, `prefers-reduced-motion` respected.

## 1.1.0 — 2026-10-05
- **`QKC.init()` — embeddable quiz widget.** One call renders a full quiz into any element:
  question flow, options/bool/input types, explanations, progress bar, result screen with
  per-topic stats. Returns `{ root, restart, update, destroy, results }`.
- Widget brings its **own scoped CSS** (injected once, `.qkc-*` classes) — nothing to install on the host page.
- **3 modes**: `normal` (check → explanation → next), `exam` (free navigation, results at the end),
  `sprint` (per-question countdown, auto-advance, no reveal).
- **3 themes**: `bw` (strict black/white), `light`, `dark` — via `data-theme`, CSS variables only.
- **Built-in i18n**: `ru` / `en` UI dictionaries (`QKC.STR`), language autodetect from `<html lang>` / `navigator.language`.
- `QKC.init()` accepts a **flat array**, `{ items: [...] }`, or the full nested container
  `{ grade: { subject: { quarter: [...] } } }` (new `QKC.toArray`).
- `engine()` / `validate()` now also accept flat arrays, not only containers.
- a11y: `role="radiogroup"`/`radio` options, `aria-live` feedback, keyboard-complete (Enter = primary action),
  visible focus states.
- Docs site rebuilt around the widget: live code→result demo with dev-style switches (mode/theme/lang),
  paste-your-bank playground with `QKC.validate()`, real bank excerpt (`demo-bank.js`), React/Vue embed guides.
- Root-level `engine.js` (copy of the UMD build) — the `https://qkc.js.org/engine.js` entry point.
- Tests: headless core suite + jsdom DOM suite for the widget (`test/test.mjs`, `test/dom.mjs`).

## 1.0.0 — 2026-10-05
- First public release: `engine(bank)`, `build`, `score`, `validate`, `count`, `topics`, `rng`, `items`, `norm`.
- Seeded, reproducible test assembly (mulberry32 + FNV-1a seed hashing).
- UMD (`dist/qkc-engine.js`) and ESM (`dist/qkc-engine.mjs`) builds, no runtime dependencies.
- Bank schema v1: strict grade → subject → quarter partition with topic slicing.
- Docs site with an in-browser playground (`index.html`, `playground.js`).
