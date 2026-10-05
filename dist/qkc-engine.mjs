/*! QKC Engine — dependency-free JavaScript quiz engine. MIT (c) OuRi Corp */
/* QKC Engine — core (plain JS, no dependencies, no exports).
   Defines a single global-ish object: QKC */
var QKC = (function () {
  'use strict';

  var VERSION = '1.0.0';

  /* ── seeded PRNG (mulberry32) ─────────────────────────────── */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    function next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return { next: next, int: function (n) { return Math.floor(next() * n); }, pick: function (arr) { return arr[Math.floor(next() * arr.length)]; } };
  }
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ── bank helpers ───────────────────────────────────────────
     Bank container shape (the shape QKC question banks ship in):
       bank = { <grade>: { <subject>: { <quarter>: [ item, ... ] } } }
     Item shape:
       { t: text, ty: 'choice'|'bool'|'input', c: correct, e: explanation,
         tp: topic, q: quarter, o?: [options] }                              */
  function items(bank, f) {
    f = f || {};
    var out = [];
    Object.keys(bank || {}).forEach(function (g) {
      if (f.grade != null && String(g) !== String(f.grade)) return;
      var subs = bank[g] || {};
      Object.keys(subs).forEach(function (s) {
        if (f.subject && s !== f.subject) return;
        var qs = subs[s] || {};
        Object.keys(qs).forEach(function (q) {
          if (f.quarter && f.quarter !== 'all' && String(q) !== String(f.quarter)) return;
          (qs[q] || []).forEach(function (it) {
            if (f.topics && f.topics.length && f.topics.indexOf(it.tp) < 0) return;
            out.push(Object.assign({ grade: +g, subject: s, quarter: +q }, it));
          });
        });
      });
    });
    return out;
  }

  function validate(bank) {
    var errs = [];
    var all = items(bank);
    if (!all.length) errs.push('bank is empty');
    all.forEach(function (it, i) {
      var at = 'item#' + i + ' (' + it.subject + ' g' + it.grade + ' q' + it.quarter + ')';
      if (!it.t || typeof it.t !== 'string') errs.push(at + ': missing text (t)');
      if (['choice', 'bool', 'input'].indexOf(it.ty) < 0) errs.push(at + ': bad type (ty)');
      if (it.c == null || it.c === '') errs.push(at + ': missing answer (c)');
      if (it.ty === 'choice' && (!it.o || it.o.length < 2)) errs.push(at + ': choice needs options (o)');
      if (it.ty === 'choice' && it.o && it.o.indexOf(it.c) < 0) errs.push(at + ': correct answer not in options');
      if (it.ty === 'bool' && ['true', 'false'].indexOf(String(it.c)) < 0) errs.push(at + ': bool answer must be true|false');
    });
    return { ok: !errs.length, errors: errs };
  }

  function shuffle(arr, r) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = r.int(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ── engine instance ──────────────────────────────────────── */
  function engine(bank) {
    return {
      bank: bank,
      validate: function () { return validate(bank); },
      count: function (f) { return items(bank, f).length; },
      topics: function (f) {
        var set = {};
        items(bank, f).forEach(function (it) { set[it.tp] = (set[it.tp] || 0) + 1; });
        return Object.keys(set).sort().map(function (k) { return { topic: k, count: set[k] }; });
      },
      /* build a test: { grade, subject, quarter|'all', topics[], count, seed } */
      build: function (opts) {
        opts = opts || {};
        var pool = items(bank, opts);
        var seed = opts.seed != null ? opts.seed : (Date.now() & 0xffffff);
        var r = rng(typeof seed === 'string' ? hashSeed(seed) : seed);
        var picked = shuffle(pool, r).slice(0, Math.max(1, opts.count || 10));
        var test = {
          seed: seed,
          filter: { grade: opts.grade != null ? +opts.grade : null, subject: opts.subject || null, quarter: opts.quarter || 'all', topics: opts.topics || [] },
          items: picked.map(function (it, i) {
            var out = { id: i, t: it.t, ty: it.ty, tp: it.tp, q: it.quarter, grade: it.grade, subject: it.subject, e: it.e || '' };
            if (it.ty === 'choice') out.o = shuffle(it.o, r);
            if (it.ty === 'bool') out.o = ['true', 'false'];
            out.c = it.c; /* kept server-side in real apps; strip before sending to clients */
            return out;
          })
        };
        return test;
      },
      /* score(test, answers: {id: value}) — value compared as trimmed string */
      score: function (test, answers) {
        answers = answers || {};
        var correct = 0, wrong = 0, skip = 0;
        var perTopic = {};
        (test.items || []).forEach(function (it) {
          var v = answers[it.id];
          var pt = perTopic[it.tp] || (perTopic[it.tp] = { correct: 0, total: 0 });
          pt.total++;
          if (v == null || v === '') { skip++; return; }
          var ok = norm(v) === norm(it.c);
          if (ok) { correct++; pt.correct++; } else wrong++;
        });
        var total = (test.items || []).length;
        return {
          correct: correct, wrong: wrong, skip: skip, total: total,
          pct: total ? Math.round(correct / total * 100) : 0,
          perTopic: perTopic
        };
      }
    };
  }

  function norm(v) {
    return String(v).trim().toLowerCase().replace(/\s+/g, ' ').replace(',', '.');
  }

  return {
    VERSION: VERSION,
    rng: rng,
    hashSeed: hashSeed,
    engine: engine,
    validate: validate,
    items: items,
    norm: norm
  };
})();

export default QKC;
export const VERSION = QKC.VERSION;
export const engine = QKC.engine;
export const validate = QKC.validate;
export const items = QKC.items;
export const rng = QKC.rng;
