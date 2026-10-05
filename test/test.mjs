/* Smoke tests: node test/test.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));

/* load UMD into a fake global */
const src = readFileSync(join(here, '..', 'dist', 'qkc-engine.js'), 'utf8');
const QKC = new Function('module', 'self', src + '; return (typeof module !== "undefined" && module.exports) ? module.exports : self.QKC;')({ exports: {} }, {});

const bank = {
  5: {
    math: {
      1: [
        { t: 'x + 7 = 41. x = ?', ty: 'input', c: '34', e: 'x = 41 − 7 = 34.', tp: 'equations', q: 1 },
        { t: 'LCM(8, 6) = ?', ty: 'choice', c: '24', e: 'LCM(8,6)=24.', tp: 'divisibility', q: 1, o: ['6', '8', '24', '48'] },
        { t: 'A square is a rectangle.', ty: 'bool', c: 'true', e: 'By definition.', tp: 'shapes', q: 1 },
        { t: '6 × 3 = ?', ty: 'input', c: '18', e: '6·3=18.', tp: 'multiply', q: 1 }
      ],
      2: [
        { t: '12 − 5 = ?', ty: 'input', c: '7', e: '12−5=7.', tp: 'subtract', q: 2 },
        { t: 'Half of 40 = ?', ty: 'input', c: '20', e: '40/2=20.', tp: 'fractions', q: 2 }
      ]
    }
  }
};

assert.equal(QKC.VERSION, '1.2.0');
const eng = QKC.engine(bank);
assert.equal(eng.count(), 6);
assert.equal(eng.count({ quarter: 1 }), 4);
assert.equal(eng.count({ grade: 5, subject: 'math', quarter: 2 }), 2);
assert.deepEqual(eng.topics({ quarter: 2 }).map(t => t.topic), ['fractions', 'subtract']);

const v = eng.validate();
assert.equal(v.ok, true, JSON.stringify(v.errors));

const test = eng.build({ grade: 5, subject: 'math', quarter: 'all', count: 3, seed: 'demo' });
assert.equal(test.items.length, 3);
const again = eng.build({ grade: 5, subject: 'math', quarter: 'all', count: 3, seed: 'demo' });
assert.deepEqual(test.items.map(i => i.t), again.items.map(i => i.t), 'same seed → same test');

const ans = {};
test.items.forEach(it => { ans[it.id] = it.c; });
const sc = eng.score(test, ans);
assert.equal(sc.pct, 100);
assert.equal(sc.correct, 3);

const bad = {}; test.items.forEach(it => { bad[it.id] = 'nope'; });
assert.equal(eng.score(test, bad).wrong, 3);
assert.equal(eng.score(test, {}).skip, 3);

/* choice options are shuffled deterministically per seed and contain the answer */
test.items.filter(i => i.ty === 'choice').forEach(i => assert.ok(i.o.includes(i.c)));

console.log('all engine tests passed ✓');

/* init/toArray presence */
assert.equal(typeof QKC.init, 'function');
assert.equal(typeof QKC.toArray, 'function');
assert.deepEqual(QKC.toArray([{ t: 'a' }]).length, 1);
assert.equal(QKC.toArray(bank).length, 6, 'toArray flattens containers');
assert.equal(QKC.STR.ru.check, 'Проверить');
assert.equal(QKC.STR.en.check, 'Check');

/* validate now accepts flat arrays too */
const flat = [{ t: '2+2=?', ty: 'input', c: '4', e: '', tp: 'arith' }];
assert.equal(QKC.validate(flat).ok, true);
assert.equal(QKC.validate([{ t: '', ty: 'nope', c: '' }]).ok, false);
const engFlat = QKC.engine(flat);
assert.equal(engFlat.count(), 1);
assert.equal(engFlat.build({ count: 1, seed: 1 }).items[0].t, '2+2=?');
