/* DOM smoke tests for QKC.init() — requires jsdom (skips gracefully if absent).
   run: node test/dom.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  try {
    ({ JSDOM } = await import('/tmp/node_modules/jsdom/lib/api.js'));
  } catch {
    console.log('jsdom not available — DOM tests skipped');
    process.exit(0);
  }
}

const src = readFileSync(join(here, '..', 'dist', 'qkc-engine.js'), 'utf8');
const dom = new JSDOM('<!doctype html><html><body><div id="quiz"></div></body></html>', { runScripts: 'outside-only' });
const { window } = dom;
window.eval(src);
const QKC = window.QKC;
const doc = window.document;

const bank = [
  { t: '2 + 2 = ?', ty: 'choice', o: ['3', '4', '5'], c: '4', e: 'Базовая арифметика.', tp: 'арифметика' },
  { t: 'Земля круглая.', ty: 'bool', c: 'true', e: 'Форма — геоид.', tp: 'география' },
  { t: 'Столица Франции?', ty: 'input', c: 'Париж', e: 'Париж — столица Франции.', tp: 'география' }
];
const qmap = { '2 + 2 = ?': '4', 'Земля круглая.': 'true', 'Столица Франции?': 'Париж' };

const root = () => doc.querySelector('#quiz .qkc-root');
function tap(node) { node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }
function tapAct(act) {
  const n = [...root().querySelectorAll('[data-act]')].find(b => b.getAttribute('data-act') === act);
  assert.ok(n, 'button ' + act + ' exists');
  tap(n);
}
function answerCurrent() {
  const r = root();
  const t = r.querySelector('.qkc-t').textContent;
  const v = qmap[t];
  const opt = [...r.querySelectorAll('.qkc-opt')].find(b => b.getAttribute('data-val') === v);
  if (opt) tap(opt);
  else {
    const inp = r.querySelector('.qkc-input');
    assert.ok(inp, 'input exists for: ' + t);
    inp.value = v;
    inp.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  return t;
}

/* ── normal mode, ru, bw: full pass, 100% ── */
let finished = null;
QKC.init({ bank, el: '#quiz', lang: 'ru', theme: 'bw', mode: 'normal', seed: 'x', onFinish: r => { finished = r; } });
assert.ok(doc.getElementById('qkc-engine-css'), 'widget CSS injected once');
assert.equal(root().getAttribute('data-theme'), 'bw');
assert.equal(root().getAttribute('lang'), 'ru');
assert.equal(root().querySelector('.qkc-mode').textContent, 'обычный');
for (let i = 0; i < 3; i++) {
  answerCurrent();
  tapAct('check');
  assert.ok(root().querySelector('.qkc-fb'), 'feedback shown after check');
  if (i < 2) tapAct('next'); else tapAct('finish');
}
assert.equal(root().querySelector('.qkc-pct').textContent, '100%');
assert.ok(finished && finished.pct === 100 && finished.correct === 3, 'onFinish fired with results');
assert.equal(finished.mode, 'normal');
assert.equal(root().querySelectorAll('.qkc-dot.ok').length, 3, 'all dots ok');
assert.ok(root().textContent.includes('По темам'), 'topic breakdown shown');

/* ── wrong answer path ── */
let fin2 = null;
QKC.init({ bank: [bank[0]], el: '#quiz', lang: 'en', seed: 1, onFinish: r => { fin2 = r; } });
tap([...root().querySelectorAll('.qkc-opt')].find(b => b.getAttribute('data-val') === '3'));
tapAct('check');
assert.ok(root().querySelector('.qkc-fb').textContent.includes('wrong'), 'wrong feedback en');
assert.ok(root().querySelector('.qkc-opt.is-right'), 'right option revealed');
assert.ok(root().textContent.includes('Right answer: 4'), 'right answer shown');
tapAct('finish');
assert.equal(fin2.pct, 0);

/* ── exam mode: nav, no feedback, finish, partial score ── */
QKC.init({ bank, el: '#quiz', lang: 'en', theme: 'dark', mode: 'exam', seed: 7 });
assert.equal(root().getAttribute('data-theme'), 'dark');
assert.equal(root().querySelector('.qkc-mode').textContent, 'exam');
assert.ok(root().querySelector('[data-act="prev"]').disabled, 'prev disabled on q1');
answerCurrent();                       /* answer only question 1 */
assert.ok(!root().querySelector('.qkc-fb'), 'exam shows no immediate feedback');
tapAct('next');
assert.equal(root().querySelector('.qkc-prog').textContent, 'Question 2 / 3');
tapAct('next');
tapAct('finish');
assert.equal(root().querySelector('.qkc-pct').textContent, '33%', '1 of 3 → 33%');
assert.equal(root().querySelectorAll('.qkc-dot.skip').length, 2, 'two skipped dots');

/* ── sprint mode: attributes + full bar ── */
const w3 = QKC.init({ bank, el: '#quiz', lang: 'ru', theme: 'light', mode: 'sprint', seed: 3, timePerQuestion: 60 });
assert.equal(root().getAttribute('data-mode'), 'sprint');
assert.equal(root().getAttribute('data-theme'), 'light');
assert.equal(root().querySelector('.qkc-bar i').style.width, '100%');
w3.destroy();
assert.equal(doc.querySelector('#quiz').innerHTML, '', 'destroy clears mount');

/* ── invalid bank → error card ── */
const w4 = QKC.init({ bank: [{ t: '', ty: 'bad', c: '' }], el: '#quiz' });
assert.ok(doc.querySelector('#quiz .qkc-err'), 'invalid bank → error card');
w4.destroy();

/* ── empty bank ── */
const w4b = QKC.init({ bank: [], el: '#quiz', lang: 'ru' });
assert.ok(doc.querySelector('#quiz .qkc-err'), 'empty bank → error card');
w4b.destroy();

/* ── nested container bank auto-flattens ── */
const w5 = QKC.init({ bank: { 7: { algebra: { 1: bank } } }, el: '#quiz', lang: 'en', seed: 1 });
assert.ok(doc.querySelector('#quiz .qkc-root .qkc-t'), 'container bank works');
assert.equal(doc.querySelector('#quiz .qkc-root').querySelector('.qkc-chip').textContent.includes('·'), true, 'topic in chip');
w5.destroy();

/* ── window.OURI_BANKS-style access (quick start spec) ── */
window.OURI_BANKS = { 7: { algebra: { 1: bank } } };
const w6 = QKC.init({ bank: window.OURI_BANKS[7].algebra[1], el: '#quiz', lang: 'ru', seed: 2 });
assert.ok(doc.querySelector('#quiz .qkc-t'), 'OURI_BANKS quick start call works');
w6.update({ lang: 'ru', theme: 'dark', mode: 'exam' });
assert.equal(root().getAttribute('data-theme'), 'dark');
assert.equal(root().querySelector('.qkc-mode').textContent, 'экзамен');
w6.destroy();

/* ── count/seed reproducibility ── */
const big = [];
for (let i = 0; i < 30; i++) big.push({ t: i + '+1=?', ty: 'input', c: String(i + 1), e: '', tp: 'arith' });
const wa = QKC.init({ bank: big, el: '#quiz', count: 5, seed: 'repro', lang: 'en' });
const t1 = root().querySelector('.qkc-t').textContent;
assert.equal(root().querySelector('.qkc-prog').textContent, 'Question 1 / 5');
wa.destroy();
const wb = QKC.init({ bank: big, el: '#quiz', count: 5, seed: 'repro', lang: 'en' });
assert.equal(root().querySelector('.qkc-t').textContent, t1, 'same seed → same first question');
wb.destroy();

/* ── restart button works ── */
QKC.init({ bank: [bank[0]], el: '#quiz', lang: 'en', seed: 5 });
tap([...root().querySelectorAll('.qkc-opt')].find(b => b.getAttribute('data-val') === '4'));
tapAct('check');
tapAct('finish');
assert.ok(root().querySelector('.qkc-pct'));
tapAct('restart');
assert.ok(root().querySelector('.qkc-t'), 'restart returns to questions');

console.log('all DOM tests passed ✓');
process.exit(0);
