# QKC Engine

**Dependency-free quiz engine for the web.** Vanilla JS. No build step. MIT. Embed quizzes in any page. The documentation site uses a strict black-and-white identity; widget themes remain configurable.

[![version](https://img.shields.io/badge/version-1.2.0-black)](https://github.com/spaj7468-cell/qkc-engine/releases)
[![deps](https://img.shields.io/badge/dependencies-0-black)](https://github.com/spaj7468-cell/qkc-engine/blob/main/package.json)
[![license](https://img.shields.io/badge/license-MIT-black)](./LICENSE)

`qkc-engine` is the open core of the [QKC trainer](https://qkc.runs-on.dev/) and the
[QKCcode](https://code.qkc.runs-on.dev/) coding school. Two layers, one file:

1. **Headless core** — seeded, reproducible quiz assembly and scoring over strictly partitioned
   question banks (`grade → subject → quarter → topic`).
2. **`QKC.init()`** — a tiny embeddable widget (own scoped CSS injected at runtime):
   3 modes (`normal` / `exam` / `sprint`), 3 themes (`bw` / `light` / `dark`), RU/EN UI, a11y-complete,
   `onFinish(result)` and `onAnswer(ev)` event callbacks.

Live docs, API reference, REPL & playground: **https://engine.qkc.runs-on.dev**
(claim pending — [zordhalo/runs-on.dev#310](https://github.com/zordhalo/runs-on.dev/pull/310)) ·
**[mirror, works now](https://engine.qkc.runs-on.dev/)**

### Docs map (on the site)

| § | content |
|---|---|
| 01–02 | quick start · live demo with event console |
| 03 | **API reference** — every option/field/return shape + in-page REPL |
| 04–07 | bank format & validation · question types · modes · themes & CSS variables |
| 08–09 | playground (paste your bank) · embedding: plain/React/Vue/web component/Node |
| 10 | architecture — module map, data flow, widget anatomy, call-by-call narrative |
| 11–13 | recipes · testing & quality · install & npm |
| 14–17 | FAQ · changelog · license · the trainer built on this engine |
| 18 | **Standard test protocol** — prepare, validate, run and score a normal test |
| 19 | **How Arakul Studio began** — project purpose, workspace idea and iteration approach |

## Quick start

```html
<!-- works today (GitHub Pages); after the runs-on.dev claim merges: https://engine.qkc.runs-on.dev/engine.js -->
<script src="https://engine.qkc.runs-on.dev/engine.js"></script>
<div id="quiz"></div>
<script>
  QKC.init({ bank: window.OURI_BANKS[7].algebra[1] });
</script>
```

or via npm:

```sh
npm install qkc-engine
```

```js
import QKC from 'qkc-engine';

QKC.init({
  bank: [
    { t: '2 + 2 = ?', ty: 'choice', o: ['3', '4', '5'], c: '4', e: 'Basics.', tp: 'arithmetic' },
    { t: 'Arrays are objects.', ty: 'bool', c: 'true', e: 'typeof [] === "object".', tp: 'js' },
  ],
  el: '#quiz',
  mode: 'normal',   // 'normal' | 'exam' | 'sprint'
  theme: 'bw',      // 'bw' | 'light' | 'dark'
  lang: 'en',       // 'ru' | 'en' (default: autodetect)
  count: 10,
  seed: 'spring-2026',          // same seed → same quiz
  onFinish: r => console.log(r.pct, r.perTopic),
  onAnswer: a => console.log(a.id, a.correct),   // new in 1.2.0
});
// → { root, mount, restart(o?), update(o?), destroy(), results() }
```

## Bank format

A question is a plain object; a bank is an array (or the nested container `{grade:{subject:{quarter:[items]}}}`):

| field | type | meaning |
|---|---|---|
| `t` | string | question text |
| `ty` | `'choice' \| 'bool' \| 'input'` | answer type |
| `o` | string[] | options — required for `choice` |
| `c` | string | correct answer (compared trimmed, case/comma-insensitive) |
| `e` | string | explanation shown after checking |
| `tp` | string | topic (filters + per-topic stats) |
| `q` | number, optional | quarter/term index inside a container |

## Headless API

```js
const eng  = QKC.engine(bank);                    // bank: container or flat array
const v    = eng.validate();                      // { ok, errors[] } — structural audit
const test = eng.build({ grade: 7, subject: 'algebra', quarter: 1, count: 10, seed: 'demo' });
const safe = test.items.map(({ c, ...i }) => i);  // strip answers before clients see them
const res  = eng.score(test, answers);            // answers: { [itemId]: value }
// res → { correct, wrong, skip, total, pct, perTopic }

eng.count({ quarter: 1 });                        // introspection with the same filter object
eng.topics({ subject: 'algebra' });               // [{ topic, count }, …]
QKC.rng(seed);                                    // mulberry32 PRNG: { next, int, pick }
```

Everything is pure and synchronous: **same seed → same test**, down to option order.

## Repository layout

```
src/core.js        the engine (single source of truth, ES5-compatible)
build.mjs          wraps src into dist/qkc-engine.js (UMD) + dist/qkc-engine.mjs (ESM)
dist/              committed builds — consumers need no build step
engine.js          root copy of the UMD build → https://engine.qkc.runs-on.dev/engine.js
                     (short domain https://engine.qkc.runs-on.dev/engine.js — after runs-on.dev PR #310 merges)
index.html         this docs site (live demo, playground, guides) — plain HTML/CSS/JS
site.js            docs-site wiring (runs the real dist build)
demo-bank.js       real bank excerpt: OURI_BANKS[7].algebra[1] from the QKC trainer
test/test.mjs      headless core tests (node)
test/dom.mjs       widget DOM tests (jsdom)
```

```sh
npm test     # build + headless tests + DOM tests
npm run build
```

## Made with this engine

- **[QKC — Quick Knowledge Check](https://qkc.runs-on.dev/)** — school quiz trainer
  (учебный тренажёр, построенный на этом движке): grades K–11, 20 subjects, 42 823 questions,
  offline PWA, RU/EN. Repo: [`spaj7468-cell/qkc`](https://github.com/spaj7468-cell/qkc).
- **[QKCcode — QKC v2](https://code.qkc.runs-on.dev/)** — offline coding school
  (офлайн-школа программирования): 7 courses, 39 lessons on HTML/CSS, JavaScript, Python,
  Lua (Roblox), GDScript (Godot) and C# (Unity). Every lesson quiz and course exam is assembled
  by `QKC.init()`; the code tasks run on its own teaching interpreter. Offline PWA, RU/EN.
  Repo: [`spaj7468-cell/qkccode`](https://github.com/spaj7468-cell/qkccode).

## Protocols and project story

### Protocol 01 — Standard test

1. Prepare a question bank with question text, answer type, correct answer and (where useful) explanation.
2. Validate its structure with `QKC.engine(bank).validate()`.
3. Start the test with `QKC.init()` and select the mode, language, theme and question count.
4. Let the learner answer; normal mode is suited to practice, exam mode to a test-like flow, and sprint mode to timed rounds.
5. Read the result passed to `onFinish(result)`, including the score and per-topic statistics.

### Protocol 02 — How Arakul Studio began

Arakul Studio is a creative workspace in the OuRi ecosystem; **Kraul Engine is its underlying engine**. The studio is the product users interact with, while Kraul is the engine layer intended to power image-processing workflows and expose its own API and technical documentation. Kraul has a separate repository so its architecture, API reference, guides and implementation status can be documented independently. This README does not assume particular API methods or claim that planned processing features are already implemented.

- **Open Arakul Studio:** https://spaj7468-cell.github.io/Arakul/
- **Kraul Engine repository:** https://github.com/spaj7468-cell/Kraul
- **QKC Engine:** a separate quiz engine for question-bank validation, test assembly, scoring and an embeddable widget.

## License

MIT © 2026 [OuRi Corp](https://corp.qkc.runs-on.dev/) — see [LICENSE](./LICENSE).
Status: **BETA**. Issues and PRs welcome.



## OuRi project family

QKC Engine is shared infrastructure for the OuRi learning projects:
- [OuRi Corp — project directory](https://corp.qkc.runs-on.dev/)
- [QKC trainer](https://qkc.runs-on.dev/)
- [QKCcode programming school](https://code.qkc.runs-on.dev/)
- [Arakul Studio](https://spaj7468-cell.github.io/Arakul/) — creative workspace powered by Kraul Engine
- [Kraul Engine](https://github.com/spaj7468-cell/Kraul) — engine/API and technical documentation for image-processing workflows
- [All GitHub repositories](https://github.com/spaj7468-cell?tab=repositories)

These projects were built at different times and have different goals and maturity levels. Kraul Engine is the engine layer associated with Arakul Studio; QKC Engine is a separate quiz engine. Feature depth and implementation status may vary, so documentation should distinguish implemented features from planned work.