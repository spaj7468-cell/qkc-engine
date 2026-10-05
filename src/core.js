/* QKC Engine — core (plain JS, no dependencies, no exports).
   Defines a single global-ish object: QKC
   Two layers:
     1. headless core — rng / items / validate / engine(bank).build/score
     2. QKC.init()    — tiny embeddable quiz widget (injects its own CSS)  */
var QKC = (function () {
  'use strict';

  var VERSION = '1.1.0';

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
    var all = Array.isArray(bank) ? bank : items(bank);
    if (!all.length) errs.push('bank is empty');
    all.forEach(function (it, i) {
      var at = 'item#' + i + (it.subject ? ' (' + it.subject + ' g' + it.grade + ' q' + it.quarter + ')' : '');
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

  function norm(v) {
    return String(v).trim().toLowerCase().replace(/\s+/g, ' ').replace(',', '.');
  }

  /* ── engine instance (headless core) ──────────────────────── */
  function engine(bank) {
    return {
      bank: bank,
      validate: function () { return validate(bank); },
      count: function (f) { return (Array.isArray(bank) ? bank : items(bank, f)).length; },
      topics: function (f) {
        var set = {};
        (Array.isArray(bank) ? bank : items(bank, f)).forEach(function (it) { set[it.tp] = (set[it.tp] || 0) + 1; });
        return Object.keys(set).sort().map(function (k) { return { topic: k, count: set[k] }; });
      },
      /* build a test: { grade, subject, quarter|'all', topics[], count, seed } */
      build: function (opts) {
        opts = opts || {};
        var pool = Array.isArray(bank) ? bank.slice() : items(bank, opts);
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

  /* ════════════════════════════════════════════════════════════
     Embeddable widget — QKC.init(opts)
     opts: { bank, el?, count?, seed?, mode?, theme?, lang?,
             timePerQuestion?, title?, shuffleOptions?, onFinish? }
     returns { root, restart(o?), update(o?), destroy(), results() }   */

  var STR = {
    en: {
      next: 'Next', prev: 'Back', check: 'Check', finish: 'Finish', restart: 'Restart',
      result: 'Result', correct: 'correct', wrong: 'wrong', skipped: 'skipped',
      explanation: 'Explanation', yourAnswer: 'Your answer…', question: 'Question',
      timeLeft: 'Time left', timeout: 'Time is up', rightAnswer: 'Right answer',
      mode_normal: 'normal', mode_exam: 'exam', mode_sprint: 'sprint',
      byTopic: 'By topic', invalid: 'Bank is invalid', empty: 'Bank is empty',
      tTrue: 'True', tFalse: 'False', answers: 'answers'
    },
    ru: {
      next: 'Далее', prev: 'Назад', check: 'Проверить', finish: 'Завершить', restart: 'Заново',
      result: 'Результат', correct: 'верно', wrong: 'ошибки', skipped: 'пропущено',
      explanation: 'Пояснение', yourAnswer: 'Ваш ответ…', question: 'Вопрос',
      timeLeft: 'Осталось', timeout: 'Время вышло', rightAnswer: 'Правильный ответ',
      mode_normal: 'обычный', mode_exam: 'экзамен', mode_sprint: 'спринт',
      byTopic: 'По темам', invalid: 'Банк не прошёл валидацию', empty: 'Банк пуст',
      tTrue: 'Верно', tFalse: 'Неверно', answers: 'ответов'
    }
  };

  var WIDGET_CSS = [
    '.qkc-root{--qkc-r:14px;box-sizing:border-box;max-width:600px;text-align:left;line-height:1.45;',
    'font-family:ui-sans-serif,-apple-system,"Segoe UI",system-ui,Roboto,Arial,sans-serif;',
    'color:var(--qkc-fg);background:var(--qkc-bg);border:1px solid var(--qkc-line);border-radius:var(--qkc-r);padding:18px 18px 16px}',
    '.qkc-root *{box-sizing:border-box}',
    '.qkc-root[data-theme="bw"]{--qkc-bg:#fff;--qkc-fg:#000;--qkc-line:#000;--qkc-muted:#3d3d3d;--qkc-soft:#f2f2f2;--qkc-sel:#000;--qkc-selfg:#fff;--qkc-r:0px;border-width:2px}',
    '.qkc-root[data-theme="light"]{--qkc-bg:#fafafa;--qkc-fg:#15151a;--qkc-line:#d7d7de;--qkc-muted:#6b6b76;--qkc-soft:#efeff2;--qkc-sel:#15151a;--qkc-selfg:#fff}',
    '.qkc-root[data-theme="dark"]{--qkc-bg:#131317;--qkc-fg:#f2f2f5;--qkc-line:#2d2d36;--qkc-muted:#90909b;--qkc-soft:#1b1b21;--qkc-sel:#f2f2f5;--qkc-selfg:#131317}',
    '.qkc-head{display:flex;justify-content:space-between;align-items:center;gap:10px}',
    '.qkc-title{font-weight:700;font-size:.92rem;letter-spacing:-.01em}',
    '.qkc-meta{display:flex;gap:8px;align-items:center;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.68rem;color:var(--qkc-muted)}',
    '.qkc-mode{text-transform:uppercase;letter-spacing:.14em;border:1px solid var(--qkc-line);padding:2px 8px;border-radius:999px}',
    '.qkc-root[data-theme="bw"] .qkc-mode{border-radius:0}',
    '.qkc-bar{height:4px;background:var(--qkc-soft);border:1px solid var(--qkc-line);margin:12px 0 14px;overflow:hidden}',
    '.qkc-root[data-theme="bw"] .qkc-bar{border-width:1px}',
    '.qkc-bar i{display:block;height:100%;background:var(--qkc-fg);width:0%;transition:width .35s ease}',
    '.qkc-chip{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--qkc-muted)}',
    '.qkc-t{font-size:1.06rem;font-weight:650;margin:8px 0 12px}',
    '.qkc-opts{display:flex;flex-direction:column;gap:8px;margin:10px 0}',
    '.qkc-opt{display:flex;gap:10px;align-items:center;text-align:left;width:100%;background:transparent;color:inherit;',
    'border:1px solid var(--qkc-line);border-radius:10px;padding:10px 12px;font:inherit;font-size:.94rem;cursor:pointer;',
    'transition:border-color .15s,background .15s,color .15s}',
    '.qkc-root[data-theme="bw"] .qkc-opt{border-radius:0;border-width:2px}',
    '.qkc-opt:hover:not([disabled]){border-color:var(--qkc-fg)}',
    '.qkc-opt .k{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.68rem;border:1px solid var(--qkc-line);border-radius:4px;padding:1px 6px;color:var(--qkc-muted);flex:none}',
    '.qkc-opt[aria-checked="true"]{border-color:var(--qkc-sel);background:var(--qkc-sel);color:var(--qkc-selfg)}',
    '.qkc-opt[aria-checked="true"] .k{border-color:currentColor;color:inherit}',
    '.qkc-opt.is-right{border-color:var(--qkc-fg);background:var(--qkc-fg);color:var(--qkc-bg)}',
    '.qkc-opt.is-right .k{border-color:currentColor;color:inherit}',
    '.qkc-opt.is-wrong{border-style:dashed;opacity:.7}',
    '.qkc-opt[disabled]{cursor:default}',
    '.qkc-input{width:100%;background:transparent;color:inherit;border:1px solid var(--qkc-line);border-radius:10px;',
    'padding:10px 12px;font:inherit;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92rem;outline:none}',
    '.qkc-root[data-theme="bw"] .qkc-input{border-radius:0;border-width:2px}',
    '.qkc-input:focus{border-color:var(--qkc-fg)}',
    '.qkc-input[disabled]{opacity:.6}',
    '.qkc-fb{margin-top:12px;font-weight:700;font-size:.9rem}',
    '.qkc-exp{margin-top:8px;border-left:3px solid var(--qkc-fg);padding:6px 12px;font-size:.85rem;color:var(--qkc-muted)}',
    '.qkc-root[data-theme="bw"] .qkc-exp{border-left-width:2px}',
    '.qkc-foot{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}',
    '.qkc-btn{border:1px solid var(--qkc-fg);background:var(--qkc-fg);color:var(--qkc-bg);border-radius:999px;',
    'padding:9px 20px;font:inherit;font-weight:650;font-size:.88rem;cursor:pointer;transition:opacity .15s,transform .15s}',
    '.qkc-root[data-theme="bw"] .qkc-btn{border-radius:0;border-width:2px}',
    '.qkc-btn:hover{opacity:.85}',
    '.qkc-btn.ghost{background:transparent;color:var(--qkc-fg);border-color:var(--qkc-line)}',
    '.qkc-btn.ghost:hover{border-color:var(--qkc-fg);opacity:1}',
    '.qkc-btn[disabled]{opacity:.35;cursor:default;transform:none}',
    '.qkc-pct{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1}',
    '.qkc-stats{display:flex;gap:16px;margin-top:10px;font-size:.82rem;color:var(--qkc-muted);font-family:ui-monospace,Menlo,Consolas,monospace}',
    '.qkc-stats b{color:var(--qkc-fg)}',
    '.qkc-dots{display:flex;gap:5px;flex-wrap:wrap;margin-top:14px}',
    '.qkc-dot{width:15px;height:15px;border:1px solid var(--qkc-line);border-radius:4px}',
    '.qkc-root[data-theme="bw"] .qkc-dot{border-radius:0}',
    '.qkc-dot.ok{background:var(--qkc-fg);border-color:var(--qkc-fg)}',
    '.qkc-dot.bad{border-style:dashed;border-color:var(--qkc-fg)}',
    '.qkc-dot.skip{opacity:.4}',
    '.qkc-topics{margin-top:14px;font-size:.84rem}',
    '.qkc-topics h4{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--qkc-muted);font-weight:600;margin:0 0 6px}',
    '.qkc-topic{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--qkc-line);padding:6px 2px;font-size:.85rem}',
    '.qkc-topic span:last-child{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--qkc-muted);flex:none}',
    '.qkc-err{font-size:.86rem}',
    '.qkc-err b{display:block;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}',
    '.qkc-err ul{margin:0;padding-left:18px;color:var(--qkc-muted);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.76rem}',
    '.qkc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
  ].join('\n');

  function injectCSS(doc) {
    if (doc.getElementById('qkc-engine-css')) return;
    var s = doc.createElement('style');
    s.id = 'qkc-engine-css';
    s.textContent = WIDGET_CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  /* bank → flat item array (accepts array, {items:[]}, or nested container) */
  function toArray(bank) {
    if (Array.isArray(bank)) return bank.slice();
    if (bank && Array.isArray(bank.items)) return bank.items.slice();
    if (bank && typeof bank === 'object') return items(bank);
    return [];
  }

  function detectLang(doc) {
    try {
      var l = (doc.documentElement.getAttribute('lang') || (typeof navigator !== 'undefined' && navigator.language) || 'en').toLowerCase();
      return l.indexOf('ru') === 0 ? 'ru' : 'en';
    } catch (e) { return 'en'; }
  }

  function el(doc, tag, cls, txt) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function init(opts) {
    opts = opts || {};
    var doc = opts.document || (typeof document !== 'undefined' ? document : null);
    if (!doc) throw new Error('QKC.init: no document');

    var list = toArray(opts.bank);

    /* resolve mount point */
    var mount = opts.el == null ? null
      : (typeof opts.el === 'string' ? doc.querySelector(opts.el) : opts.el);
    var ownsMount = false;
    if (!mount) { mount = el(doc, 'div'); (doc.body || doc.documentElement).appendChild(mount); ownsMount = true; }

    var st = {
      mode: ['normal', 'exam', 'sprint'].indexOf(opts.mode) >= 0 ? opts.mode : 'normal',
      theme: ['bw', 'light', 'dark'].indexOf(opts.theme) >= 0 ? opts.theme : 'bw',
      lang: opts.lang === 'ru' || opts.lang === 'en' ? opts.lang : detectLang(doc),
      count: opts.count != null ? Math.max(1, +opts.count || 1) : 10,
      seed: opts.seed != null ? opts.seed : (Date.now() & 0xffffff),
      tpq: +opts.timePerQuestion > 0 ? +opts.timePerQuestion : 30,
      title: opts.title != null ? String(opts.title) : 'QKC',
      shuffleOptions: opts.shuffleOptions !== false,
      onFinish: typeof opts.onFinish === 'function' ? opts.onFinish : null
    };

    injectCSS(doc);
    var root = el(doc, 'div', 'qkc-root');
    mount.textContent = '';
    mount.appendChild(root);

    var test = [], idx = 0, answers = {}, locked = false, result = null, finished = false;
    var timer = null, left = 0;
    var live = el(doc, 'div', 'qkc-sr'); live.setAttribute('aria-live', 'polite');

    function S(k) { return (STR[st.lang] || STR.en)[k] || (STR.en[k] || k); }

    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

    /* ── build test from list ── */
    function build() {
      var r = rng(typeof st.seed === 'string' ? hashSeed(st.seed) : (st.seed >>> 0));
      var picked = shuffle(list, r).slice(0, Math.min(st.count, list.length));
      test = picked.map(function (it, i) {
        var o = null;
        if (it.ty === 'choice') o = st.shuffleOptions ? shuffle(it.o || [], r) : (it.o || []).slice();
        if (it.ty === 'bool') o = ['true', 'false'];
        return { id: i, t: it.t, ty: it.ty, tp: it.tp || '', e: it.e || '', c: it.c, o: o };
      });
    }

    function check(v, it) { return norm(v) === norm(it.c); }

    function optLabel(it, v) { return it.ty === 'bool' ? (v === 'true' ? S('tTrue') : S('tFalse')) : v; }

    /* ── renderers ── */
    function applyTheme() {
      root.setAttribute('data-theme', st.theme);
      root.setAttribute('data-mode', st.mode);
      root.setAttribute('lang', st.lang);
    }

    function renderError(msgs) {
      applyTheme();
      root.textContent = '';
      var box = el(doc, 'div', 'qkc-err');
      box.appendChild(el(doc, 'b', null, S('invalid')));
      var ul = el(doc, 'ul');
      msgs.slice(0, 6).forEach(function (m) { ul.appendChild(el(doc, 'li', null, m)); });
      box.appendChild(ul);
      root.appendChild(box);
    }

    function render() {
      stopTimer();
      applyTheme();
      root.textContent = '';
      root.appendChild(live);

      if (!test.length) { renderError([S('empty')]); return; }
      if (finished) { renderResult(); return; }

      var it = test[idx];

      /* head */
      var head = el(doc, 'div', 'qkc-head');
      head.appendChild(el(doc, 'div', 'qkc-title', st.title));
      var meta = el(doc, 'div', 'qkc-meta');
      meta.appendChild(el(doc, 'span', 'qkc-mode', S('mode_' + st.mode)));
      var prog = el(doc, 'span', 'qkc-prog', S('question') + ' ' + (idx + 1) + ' / ' + test.length);
      meta.appendChild(prog);
      head.appendChild(meta);
      root.appendChild(head);

      /* bar */
      var bar = el(doc, 'div', 'qkc-bar');
      var fill = el(doc, 'i');
      bar.appendChild(fill);
      root.appendChild(bar);
      if (st.mode === 'sprint') {
        left = st.tpq;
        fill.style.width = '100%';
        timer = setInterval(function () {
          left -= 0.1;
          if (left <= 0) { left = 0; stopTimer(); sprintTimeout(it); return; }
          fill.style.width = (left / st.tpq * 100) + '%';
          prog.textContent = S('timeLeft') + ' ' + Math.ceil(left) + 's · ' + (idx + 1) + '/' + test.length;
        }, 100);
      } else {
        fill.style.width = (idx / test.length * 100) + '%';
      }

      /* question */
      var q = el(doc, 'div', 'qkc-q');
      var chipTxt = it.ty + (it.tp ? ' · ' + it.tp : '');
      q.appendChild(el(doc, 'div', 'qkc-chip', chipTxt));
      q.appendChild(el(doc, 'div', 'qkc-t', it.t));

      if (it.ty === 'input') {
        var inp = el(doc, 'input', 'qkc-input');
        inp.type = 'text';
        inp.placeholder = S('yourAnswer');
        inp.setAttribute('aria-label', S('yourAnswer'));
        if (answers[it.id] != null) inp.value = answers[it.id];
        if (locked) inp.disabled = true;
        inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); onPrimary(); } });
        inp.addEventListener('input', function () { answers[it.id] = inp.value; syncPrimary(); });
        q.appendChild(inp);
      } else {
        var optsBox = el(doc, 'div', 'qkc-opts');
        optsBox.setAttribute('role', 'radiogroup');
        optsBox.setAttribute('aria-label', it.t);
        (it.o || []).forEach(function (v, oi) {
          var b = el(doc, 'button', 'qkc-opt');
          b.type = 'button';
          b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', answers[it.id] === v ? 'true' : 'false');
          b.setAttribute('data-act', 'opt');
          b.setAttribute('data-val', v);
          b.appendChild(el(doc, 'span', 'k', String.fromCharCode(65 + oi)));
          b.appendChild(el(doc, 'span', null, optLabel(it, v)));
          if (locked) {
            b.disabled = true;
            if (v === it.c) b.classList.add('is-right');
            else if (answers[it.id] === v) b.classList.add('is-wrong');
          }
          optsBox.appendChild(b);
        });
        q.appendChild(optsBox);
      }

      /* feedback (normal mode, after check) */
      if (locked && st.mode === 'normal') {
        var given = answers[it.id];
        var ok = given != null && given !== '' && check(given, it);
        var fb = el(doc, 'div', 'qkc-fb', (ok ? '✓ ' + S('correct') : '✗ ' + S('wrong')) + (ok ? '' : ' · ' + S('rightAnswer') + ': ' + optLabel(it, it.c)));
        q.appendChild(fb);
        if (it.e) {
          var ex = el(doc, 'div', 'qkc-exp');
          ex.appendChild(el(doc, 'b', null, S('explanation') + ': '));
          ex.appendChild(el(doc, 'span', null, it.e));
          q.appendChild(ex);
        }
        live.textContent = ok ? S('correct') : S('wrong') + ', ' + S('rightAnswer') + ' ' + optLabel(it, it.c);
      }
      if (locked && st.mode === 'sprint') {
        live.textContent = S('timeout');
      }
      root.appendChild(q);

      /* footer */
      var foot = el(doc, 'div', 'qkc-foot');
      if (st.mode === 'exam') {
        var prev = el(doc, 'button', 'qkc-btn ghost', S('prev'));
        prev.type = 'button'; prev.setAttribute('data-act', 'prev');
        if (idx === 0) prev.disabled = true;
        foot.appendChild(prev);
        var nx = el(doc, 'button', 'qkc-btn', idx === test.length - 1 ? S('finish') : S('next'));
        nx.type = 'button'; nx.setAttribute('data-act', idx === test.length - 1 ? 'finish' : 'next');
        foot.appendChild(nx);
        var answ = el(doc, 'span', 'qkc-chip', Object.keys(answers).filter(function (k) { return answers[k] !== '' && answers[k] != null; }).length + ' / ' + test.length + ' ' + S('answers'));
        answ.style.alignSelf = 'center'; answ.style.marginLeft = 'auto';
        foot.appendChild(answ);
      } else if (st.mode === 'sprint') {
        var hint = el(doc, 'span', 'qkc-chip', S('mode_sprint') + ' · ' + st.tpq + 's');
        hint.style.alignSelf = 'center';
        foot.appendChild(hint);
      } else {
        var primary = el(doc, 'button', 'qkc-btn', locked ? (idx === test.length - 1 ? S('finish') : S('next')) : S('check'));
        primary.type = 'button';
        primary.setAttribute('data-act', locked ? (idx === test.length - 1 ? 'finish' : 'next') : 'check');
        primary.id = 'qkcPrimary';
        if (!locked) primary.disabled = answers[it.id] == null || answers[it.id] === '';
        foot.appendChild(primary);
      }
      root.appendChild(foot);
    }

    function syncPrimary() {
      var p = root.querySelector('[data-act="check"]');
      if (!p) return;
      var it = test[idx];
      var v = answers[it.id];
      p.disabled = (v == null || v === '');
    }

    function sprintTimeout() {
      locked = true;
      stopTimer();
      var it = test[idx];
      if (answers[it.id] == null) answers[it.id] = '';
      setTimeout(function () { advance(true); }, 600);
      live.textContent = S('timeout');
    }

    function onPrimary() {
      var act;
      if (st.mode === 'exam') act = idx === test.length - 1 ? 'finish' : 'next';
      else act = locked ? (idx === test.length - 1 ? 'finish' : 'next') : 'check';
      doAct(act);
    }

    function doAct(act) {
      var it = test[idx];
      if (act === 'opt') return;
      if (act === 'check') {
        locked = true;
        stopTimer();
        render();
        return;
      }
      if (act === 'next') {
        if (st.mode === 'sprint') { stopTimer(); }
        advance(false);
        return;
      }
      if (act === 'prev') { idx = Math.max(0, idx - 1); locked = false; render(); return; }
      if (act === 'finish') { finish(); return; }
      if (act === 'restart') { api.restart(); return; }
    }

    function advance(auto) {
      if (st.mode === 'sprint' && auto) { /* already recorded */ }
      locked = false;
      if (idx < test.length - 1) { idx++; render(); }
      else finish();
    }

    function finish() {
      stopTimer();
      finished = true;
      result = scoreIt();
      render();
      if (st.onFinish) { try { st.onFinish(result); } catch (e) { /* user callback errors must not break widget */ } }
    }

    function scoreIt() {
      var correct = 0, wrong = 0, skip = 0, perTopic = {};
      test.forEach(function (it) {
        var v = answers[it.id];
        var pt = perTopic[it.tp || '—'] || (perTopic[it.tp || '—'] = { correct: 0, total: 0 });
        pt.total++;
        if (v == null || v === '') { skip++; return; }
        if (check(v, it)) { correct++; pt.correct++; } else wrong++;
      });
      var total = test.length;
      return { correct: correct, wrong: wrong, skip: skip, total: total, pct: total ? Math.round(correct / total * 100) : 0, perTopic: perTopic, seed: st.seed, mode: st.mode };
    }

    function renderResult() {
      var r = result || scoreIt();
      var res = el(doc, 'div', 'qkc-res');
      res.appendChild(el(doc, 'div', 'qkc-chip', S('result') + ' · ' + S('mode_' + r.mode)));
      res.appendChild(el(doc, 'div', 'qkc-pct', r.pct + '%'));
      var stats = el(doc, 'div', 'qkc-stats');
      stats.appendChild(el(doc, 'span', null, '✓ ' + r.correct + ' ' + S('correct')));
      stats.appendChild(el(doc, 'span', null, '✗ ' + r.wrong + ' ' + S('wrong')));
      if (r.skip) stats.appendChild(el(doc, 'span', null, '– ' + r.skip + ' ' + S('skipped')));
      res.appendChild(stats);

      var dots = el(doc, 'div', 'qkc-dots');
      test.forEach(function (it) {
        var v = answers[it.id];
        var d = el(doc, 'div', 'qkc-dot' + (v == null || v === '' ? ' skip' : (check(v, it) ? ' ok' : ' bad')));
        d.title = it.t;
        dots.appendChild(d);
      });
      res.appendChild(dots);

      var tkeys = Object.keys(r.perTopic).filter(function (k) { return k && k !== '—'; });
      if (tkeys.length) {
        var tb = el(doc, 'div', 'qkc-topics');
        tb.appendChild(el(doc, 'h4', null, S('byTopic')));
        tkeys.forEach(function (k) {
          var row = el(doc, 'div', 'qkc-topic');
          row.appendChild(el(doc, 'span', null, k));
          row.appendChild(el(doc, 'span', null, r.perTopic[k].correct + '/' + r.perTopic[k].total));
          tb.appendChild(row);
        });
        res.appendChild(tb);
      }

      var foot = el(doc, 'div', 'qkc-foot');
      var re = el(doc, 'button', 'qkc-btn', S('restart'));
      re.type = 'button'; re.setAttribute('data-act', 'restart');
      foot.appendChild(re);
      var seedTag = el(doc, 'span', 'qkc-chip', 'seed: ' + r.seed);
      seedTag.style.alignSelf = 'center'; seedTag.style.marginLeft = 'auto';
      foot.appendChild(seedTag);
      res.appendChild(foot);
      root.appendChild(live);
      root.appendChild(res);
      live.textContent = S('result') + ': ' + r.pct + '%';
    }

    /* ── events (delegation) ── */
    root.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== root && !t.getAttribute) t = t.parentNode;
      if (!t || t === root) return;
      var act = t.getAttribute('data-act');
      if (!act) return;
      if (act === 'opt') {
        if (locked) return;
        var it = test[idx];
        var v = t.getAttribute('data-val');
        answers[it.id] = v;
        if (st.mode === 'sprint') {
          /* sprint: no reveal — flash the selection, then move on */
          stopTimer();
          var btns = root.querySelectorAll('.qkc-opt');
          for (var bi = 0; bi < btns.length; bi++) {
            btns[bi].setAttribute('aria-checked', btns[bi].getAttribute('data-val') === v ? 'true' : 'false');
            btns[bi].disabled = true;
          }
          setTimeout(function () { advance(false); }, 240);
          return;
        }
        render();
        return;
      }
      doAct(act);
    });

    /* ── lifecycle ── */
    function start() {
      idx = 0; answers = {}; locked = false; result = null; finished = false;
      var v = validate(list);
      build();
      if (!list.length) { test = []; render(); return; }
      if (!v.ok) { renderError(v.errors); return; }
      render();
    }

    function applyOpts(o) {
      if (!o) return;
      if (o.bank !== undefined) list = toArray(o.bank);
      ['mode', 'theme', 'lang', 'title'].forEach(function (k) { if (o[k] !== undefined) st[k] = o[k]; });
      if (o.count !== undefined) st.count = Math.max(1, +o.count || 1);
      if (o.seed !== undefined) st.seed = o.seed;
      if (o.timePerQuestion !== undefined) st.tpq = +o.timePerQuestion > 0 ? +o.timePerQuestion : 30;
      if (o.onFinish !== undefined) st.onFinish = typeof o.onFinish === 'function' ? o.onFinish : null;
    }

    var api = {
      root: root,
      mount: mount,
      restart: function (o) { applyOpts(o); start(); return api; },
      update: function (o) { applyOpts(o); start(); return api; },
      destroy: function () {
        stopTimer();
        if (ownsMount && mount.parentNode) mount.parentNode.removeChild(mount);
        else mount.textContent = '';
      },
      results: function () { return result || (test.length ? scoreIt() : null); }
    };

    start();
    return api;
  }

  return {
    VERSION: VERSION,
    rng: rng,
    hashSeed: hashSeed,
    engine: engine,
    validate: validate,
    items: items,
    norm: norm,
    toArray: toArray,
    init: init,
    STR: STR
  };
})();
