# QKC Engine

**Dependency-free JavaScript quiz engine.** Assembles, serves and scores knowledge-check
tests from strictly partitioned question banks: `grade → subject → term → topic`.
One plain file, UMD + ESM, **zero runtime dependencies**, MIT licensed.

This is the core behind the [QKC trainer](https://spaj7468-cell.github.io/qkc/)
(42 823 questions, grades K–11, 147 grade×subject combinations, offline PWA).
The trainer is the engine's biggest consumer; this repository is the engine on its own —
for anyone who wants the same mechanics in their own project.

- **Docs & playground:** <https://spaj7468-cell.github.io/qkc-engine/>
- **License:** MIT · **Author:** OuRi Corp

---

## Install

```bash
# npm / pnpm / yarn — straight from git
npm install github:spaj7468-cell/qkc-engine
```

```html
<!-- classic script: window.QKC -->
<script src="https://cdn.jsdelivr.net/gh/spaj7468-cell/qkc-engine@main/dist/qkc-engine.js"></script>

<!-- or as an ES module -->
<script type="module">
  import QKC from 'https://cdn.jsdelivr.net/gh/spaj7468-cell/qkc-engine@main/dist/qkc-engine.mjs';
</script>
```

```js
// CommonJS
const QKC = require('qkc-engine');
// ESM / bundlers
import QKC from 'qkc-engine';
```

## Quickstart

```js
const eng  = QKC.engine(bank);            // bank: { grade: { subject: { quarter: [items] } } }
const test = eng.build({ grade: 5, subject: 'math', quarter: 1, count: 10, seed: 'demo' });
const safe = test.items.map(({ c, ...i }) => i);   // strip answers before sending to a client
const res  = eng.score(test, answers);             // answers: { [itemId]: value }
console.log(res.pct, res.perTopic);
```

Same `seed` → same test, every time (mulberry32 + FNV-1a seed hash). Options are shuffled
deterministically per seed.

## API

| call | returns | notes |
|---|---|---|
| `QKC.engine(bank)` | `Engine` | bank is never mutated |
| `engine.build(opts)` | `Test` | `opts`: `{ grade?, subject?, quarter?\|'all', topics?, count?, seed? }` |
| `engine.score(test, answers)` | `Result` | `{ correct, wrong, skip, total, pct, perTopic }`; values compared trimmed, case-insensitive, `,` ≡ `.` |
| `engine.validate()` | `{ ok, errors[] }` | structural audit of the whole bank |
| `engine.count(filter?)` | `number` | items matching the filter |
| `engine.topics(filter?)` | `{ topic, count }[]` | topic slices inside the filter |
| `QKC.items(bank, filter?)` | `Item[]` | raw filtered list |
| `QKC.rng(seed)` | `{ next, int, pick }` | seeded PRNG |
| `QKC.norm(value)` | `string` | the exact normalisation `score` uses |

## Bank schema (v1)

Partitioning is **structural**: an item lives at exactly one `grade → subject → quarter`
path, so a term can never leak into another term's test. Topics slice inside a term.

```json
{
  "5": { "math": { "1": [
    { "t": "x + 7 = 41. x = ?", "ty": "input",  "c": "34", "e": "x = 41 − 7 = 34.", "tp": "equations", "q": 1 },
    { "t": "LCM(8, 6) = ?",     "ty": "choice", "c": "24", "e": "LCM(8,6) = 24.",   "tp": "divisibility", "q": 1,
      "o": ["6", "8", "24", "48"] }
  ] } }
}
```

| field | type | meaning |
|---|---|---|
| `t` | string | question text |
| `ty` | `'choice' \| 'bool' \| 'input'` | answer type |
| `c` | string | correct answer (server-side; strip before clients see it) |
| `o` | string[] | options, required for `choice` |
| `e` | string | explanation shown after answering |
| `tp` | string | topic inside the term |
| `q` | number | term index (1–4, or 1–3 for trimesters) |

## Development

```bash
git clone https://github.com/spaj7468-cell/qkc-engine
cd qkc-engine
npm test          # builds dist/ and runs the smoke suite (node, no deps)
npm run build     # regenerate dist/qkc-engine.js (UMD) and dist/qkc-engine.mjs (ESM)
```

Repo map: `src/core.js` (single source of truth) → `build.mjs` → `dist/*`;
`index.html` + `style.css` + `playground.js` = the docs site (GitHub Pages);
`test/test.mjs` = smoke suite.

## Consumers

- [QKC — Quick Knowledge Check](https://spaj7468-cell.github.io/qkc/) — school knowledge trainer
  (BETA): K–11, 20 subjects, per-term banks, five test modes, offline PWA.

## License

MIT © OuRi Corp — see [LICENSE](LICENSE).
