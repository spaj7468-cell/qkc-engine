# QKC Engine

**Dependency-free quiz engine for the web.** Vanilla JS. No build step. MIT. Embed quizzes in any page.

[![version](https://img.shields.io/badge/version-1.2.0-black)](https://github.com/spaj7468-cell/qkc-engine/releases)
[![deps](https://img.shields.io/badge/dependencies-0-black)](https://github.com/spaj7468-cell/qkc-engine/blob/main/package.json)
[![license](https://img.shields.io/badge/license-MIT-black)](./LICENSE)

`qkc-engine` is the open core of the [QKC trainer](https://spaj7468-cell/qkc/) — a school quiz app with
42 823 questions. Two layers, one file:

1. **Headless core** — seeded, reproducible quiz assembly and scoring over strictly partitioned
   question banks (`grade → subject → quarter → topic`).
2. **`QKC.init()`** — a tiny embeddable widget (own scoped CSS injected at runtime):
   3 modes (`normal` / `exam` / `sprint`), 3 themes (`bw` / `light` / `dark`), RU/EN UI, a11y-complete,
   `onFinish(result)` and `onAnswer(ev)` event callbacks.

Live docs, API reference, REPL & playground: **[qkc.js.org](https://qkc.js.org)** (js.org PR
[#12650](https://github.com/js-org/js.org/pull/12650), pending) ·
[mirror](https://spaj7468-cell.github.io/qkc-engine/)

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

## Quick start

```html
<script src="https://qkc.js.org/engine.js"></script>
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
engine.js          root copy of the UMD build → https://qkc.js.org/engine.js
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

- **[QKC — Quick Knowledge Check](https://spaj7468-cell.github.io/qkc/)** — school quiz trainer
  (учебный тренажёр, построенный на этом движке): grades K–11, 20 subjects, 42 823 questions,
  offline PWA, RU/EN. Repo: [`spaj7468-cell/qkc`](https://github.com/spaj7468-cell/qkc).

## License

MIT © 2026 [OuRi Corp](https://spaj7468-cell.github.io/qkc/corp/) — see [LICENSE](./LICENSE).
Status: **BETA**. Issues and PRs welcome.

