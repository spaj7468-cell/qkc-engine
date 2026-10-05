/* ═══════════════════════════════════════════════════════════════
   QKC Engine docs site — all wiring. Frameworks: none.
   Every demo on this page runs the real dist/qkc-engine.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DEMO_BANK = [
    { t: '2 + 2 = ?', ty: 'choice', o: ['3', '4', '5'], c: '4', e: 'Базовая арифметика: 2 + 2 = 4.', tp: 'арифметика' },
    { t: 'Массив в JavaScript — это объект.', ty: 'bool', c: 'true', e: 'typeof [] === "object" — массивы наследуют Object.', tp: 'javascript' },
    { t: 'Столица Франции?', ty: 'input', c: 'Париж', e: 'Париж — столица Франции с X века.', tp: 'география' },
    { t: 'Решите: 3x + 3 = 18. x = ?', ty: 'input', c: '5', e: '3x = 15; x = 5.', tp: 'уравнения' }
  ];

  var PG_SAMPLE = [
    { t: '2 + 2 = ?', ty: 'choice', o: ['3', '4', '5'], c: '4', e: 'Базовая арифметика.', tp: 'арифметика' },
    { t: 'Массив — это объект.', ty: 'bool', c: 'true', e: "typeof [] === 'object'.", tp: 'javascript' },
    { t: 'Какой оператор проверяет строгое равенство?', ty: 'input', c: '===', e: '=== сравнивает без приведения типов.', tp: 'javascript' },
    { t: 'Сколько будет 7 × 8?', ty: 'input', c: '56', e: 'Таблица умножения: 7 · 8 = 56.', tp: 'арифметика' }
  ];

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function $(id) { return document.getElementById(id); }

  /* ── site theme (dark / light / bw), persisted; header + drawer switches ── */
  function siteTheme() {
    var boxes = [];
    var hb = $('siteTheme'), mb = $('siteThemeM');
    if (hb) boxes.push(hb);
    if (mb) boxes.push(mb);
    if (!boxes.length) return;
    function apply(v, save) {
      document.documentElement.setAttribute('data-theme', v);
      boxes.forEach(function (box) {
        box.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
      });
      if (save) { try { localStorage.setItem('qkc-docs-theme', v); } catch (e) { /* ignore */ } }
    }
    boxes.forEach(function (box) {
      box.addEventListener('click', function (ev) {
        var b = ev.target.closest('button[data-v]');
        if (b) apply(b.getAttribute('data-v'), true);
      });
    });
    try {
      var saved = localStorage.getItem('qkc-docs-theme');
      if (saved === 'light' || saved === 'bw' || saved === 'dark') apply(saved, false);
    } catch (e) { /* ignore */ }
  }

  /* ── mobile drawer ─────────────────────────────────────────── */
  function drawer() {
    var btn = $('menuBtn'), d = $('drawer');
    if (!btn || !d) return;
    function setOpen(open) {
      d.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('locked', open);
    }
    btn.addEventListener('click', function () { setOpen(!d.classList.contains('open')); });
    d.addEventListener('click', function (ev) { if (ev.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') setOpen(false); });
  }

  /* ── scroll progress + back-to-top ─────────────────────────── */
  function scrollFx() {
    var bar = $('progress'), top = $('toTop'), ticking = false;
    function frame() {
      ticking = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
      if (top) top.classList.toggle('show', window.scrollY > 600);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });
    frame();
  }

  /* ── scroll-spy: toc + drawer + header links ───────────────── */
  function spy() {
    var links = [];
    document.querySelectorAll('#tocBox a, #drawer a, .nav__links a').forEach(function (a) {
      links.push({ a: a, id: a.getAttribute('href').slice(1) });
    });
    var sections = document.querySelectorAll('.content section[id]');
    if (!sections.length || !('IntersectionObserver' in window)) return;
    var current = '';
    function mark() {
      links.forEach(function (l) {
        var on = l.id === current;
        l.a.classList.toggle('act', on);
        if (on) l.a.setAttribute('aria-current', 'true'); else l.a.removeAttribute('aria-current');
      });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { current = e.target.id; mark(); } });
    }, { rootMargin: '-30% 0px -60% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ── toc filter ────────────────────────────────────────────── */
  function tocFilter() {
    var inp = $('tocFilter'), box = $('tocBox');
    if (!inp || !box) return;
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase();
      box.querySelectorAll('a').forEach(function (a) {
        a.classList.toggle('hide', q !== '' && a.textContent.toLowerCase().indexOf(q) < 0);
      });
    });
  }

  /* ── animated counters (hero stats) ────────────────────────── */
  function counters() {
    var nodes = document.querySelectorAll('[data-count]');
    function set(n, v) {
      var dec = parseInt(n.getAttribute('data-dec') || '0', 10);
      var suffix = n.getAttribute('data-suffix') || '';
      n.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')) + suffix;
    }
    nodes.forEach(function (n) {
      var target = parseFloat(n.getAttribute('data-count'));
      if (reduceMotion || !('IntersectionObserver' in window)) { set(n, target); return; }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(n);
          var t0 = performance.now(), dur = 1100;
          (function tick(t) {
            var k = Math.min(1, (t - t0) / dur);
            set(n, target * (1 - Math.pow(1 - k, 3)));
            if (k < 1) requestAnimationFrame(tick);
          })(t0);
        });
      }, { threshold: .4 });
      io.observe(n);
    });
  }

  /* ── scroll reveal ─────────────────────────────────────────── */
  function reveal() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0, rootMargin: '0px 0px -4% 0px' });
    document.querySelectorAll('.content section, .hero__txt, .hero__demo').forEach(function (n) {
      n.classList.add('rv');
      io.observe(n);
    });
  }

  /* ── copy buttons ──────────────────────────────────────────── */
  function copyButtons() {
    document.querySelectorAll('.copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = $(btn.getAttribute('data-copy'));
        var txt = src ? (src.tagName === 'TEMPLATE' ? src.content.textContent : src.textContent) : '';
        var done = function () {
          btn.textContent = 'copied';
          btn.classList.add('done');
          setTimeout(function () { btn.textContent = 'copy'; btn.classList.remove('done'); }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(done, function () { legacyCopy(txt); done(); });
        } else { legacyCopy(txt); done(); }
      });
    });
  }
  function legacyCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ── segmented switch helper ───────────────────────────────── */
  function seg(id, onChange) {
    var box = $(id);
    if (!box) return function () { return null; };
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-v]');
      if (!b) return;
      box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      onChange(b.getAttribute('data-v'));
    });
    return function () {
      var on = box.querySelector('button.on');
      return on ? on.getAttribute('data-v') : null;
    };
  }

  /* ── event console (demo section) ──────────────────────────── */
  function makeLog() {
    var ul = $('logList');
    function clear() {
      if (!ul) return;
      ul.textContent = '';
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '// events will appear here — answer a question in the widget';
      ul.appendChild(li);
    }
    function push(kind, text, ok) {
      if (!ul) return;
      var empty = ul.querySelector('.empty');
      if (empty) empty.remove();
      var li = document.createElement('li');
      if (ok) li.className = 'ok';
      var ts = document.createElement('span');
      ts.className = 'ts';
      ts.textContent = new Date().toTimeString().slice(0, 8);
      var b = document.createElement('b');
      b.textContent = kind;
      li.appendChild(ts);
      li.appendChild(b);
      li.appendChild(document.createTextNode(' ' + text));
      ul.appendChild(li);
      while (ul.children.length > 40) ul.removeChild(ul.firstChild);
      ul.scrollTop = ul.scrollHeight;
    }
    var clr = $('logClear');
    if (clr) clr.addEventListener('click', clear);
    return push;
  }

  ready(function () {
    siteTheme();
    drawer();
    scrollFx();
    spy();
    tocFilter();
    counters();
    reveal();
    copyButtons();

    if (!window.QKC) return;
    var log = makeLog();

    /* ── hero widget: the classic 2+2 demo ── */
    QKC.init({
      bank: DEMO_BANK.slice(0, 2), el: '#hero-quiz',
      theme: 'dark', mode: 'normal', seed: 'web',
      shuffleOptions: false, title: 'Quick Knowledge Check'
    });

    /* ── quick start: the exact documented call, against the real bank excerpt ── */
    var real = window.OURI_BANKS && OURI_BANKS[7] && OURI_BANKS[7].algebra && OURI_BANKS[7].algebra[1];
    if (real) {
      QKC.init({
        bank: window.OURI_BANKS[7].algebra[1], el: '#qs-quiz',
        count: 5, seed: 'quickstart', theme: 'dark', lang: 'ru',
        title: 'Алгебра · 7 класс · I четверть'
      });
    }

    /* ── question-type gallery: three live one-question widgets ── */
    QKC.init({ bank: [{ t: 'typeof null === ?', ty: 'choice', o: ['"object"', '"null"', '"undefined"'], c: '"object"', e: 'Historical bug in JS, kept for compatibility.', tp: 'types' }],
      el: '#ty-choice', theme: 'dark', lang: 'en', count: 1, seed: 'ty-c', shuffleOptions: false, title: 'ty: "choice"' });
    QKC.init({ bank: [{ t: 'Arrays are objects in JS.', ty: 'bool', c: 'true', e: 'typeof [] === "object".', tp: 'types' }],
      el: '#ty-bool', theme: 'dark', lang: 'en', count: 1, seed: 'ty-b', title: 'ty: "bool"' });
    QKC.init({ bank: [{ t: '0.1 + 0.2 === 0.3 → true or false?', ty: 'input', c: 'false', e: 'IEEE-754: 0.1 + 0.2 = 0.30000000000000004.', tp: 'numbers' }],
      el: '#ty-input', theme: 'dark', lang: 'en', count: 1, seed: 'ty-i', title: 'ty: "input"' });

    /* ── theme gallery: same question, three themes ── */
    var GAL = [{ t: '2 + 2 = ?', ty: 'choice', o: ['3', '4', '5'], c: '4', e: 'Basics.', tp: 'arith' }];
    ['bw', 'light', 'dark'].forEach(function (th) {
      QKC.init({ bank: GAL, el: '#th-' + th, theme: th, lang: 'en', count: 1, seed: 'gal', shuffleOptions: false, title: 'theme: ' + th });
    });

    /* ── live demo: code ⇄ result ⇄ event console ── */
    var demoCode = $('demoCode');
    var getMode = seg('segMode', syncDemo);
    var getTheme = seg('segTheme', syncDemo);
    var getLang = seg('segLang', syncDemo);
    var demo = QKC.init({
      bank: DEMO_BANK, el: '#demo-quiz',
      mode: getMode() || 'normal', theme: getTheme() || 'bw', lang: getLang() || 'ru',
      seed: 'demo1', count: 4, shuffleOptions: false, title: 'Quick Knowledge Check',
      onAnswer: function (a) {
        log('answer', '#' + a.id + ' "' + (a.value == null ? '' : a.value) + '" → ' +
          (a.skipped ? 'skipped' : a.correct ? 'correct' : 'wrong') + ' · ' + a.item.tp, a.correct);
      },
      onFinish: function (r) {
        log('finish', 'pct ' + r.pct + '% · ✓' + r.correct + ' ✗' + r.wrong + ' –' + r.skip + ' · seed ' + r.seed + ' · mode ' + r.mode, r.pct >= 75);
      }
    });
    log('init', "seed 'demo1' · count 4 · bank " + DEMO_BANK.length + ' items · mode ' + (getMode() || 'normal'));
    function syncDemo() {
      var o = { mode: getMode(), theme: getTheme(), lang: getLang() };
      demo.update(o);
      log('update', 'mode=' + o.mode + ' · theme=' + o.theme + ' · lang=' + o.lang + ' → instance.update(o) re-runs the build');
      renderDemoCode();
    }
    function renderDemoCode() {
      if (!demoCode) return;
      var m = getMode(), t = getTheme(), l = getLang();
      demoCode.textContent =
        'const myBank = [\n' +
        '  { t: "2 + 2 = ?", ty: "choice",\n' +
        '    o: ["3", "4", "5"], c: "4",\n' +
        '    e: "Базовая арифметика.", tp: "арифметика" },\n' +
        '  // … ' + (DEMO_BANK.length - 1) + ' more items\n' +
        '];\n\n' +
        'const quiz = QKC.init({\n' +
        '  bank:  myBank,\n' +
        "  el:    '#demo-quiz',\n" +
        "  mode:  '" + m + "',\n" +
        "  theme: '" + t + "',\n" +
        "  lang:  '" + l + "',\n" +
        "  seed:  'demo1',\n" +
        '  count: 4' + (m === 'sprint' ? ',\n  timePerQuestion: 30' : '') + ',\n' +
        '  onAnswer: a => log(a),   // → console below\n' +
        '  onFinish: r => log(r),   // → console below\n' +
        '});';
    }
    renderDemoCode();

    /* ── API REPL ── */
    var replSrc = $('replSrc'), replOut = $('replOut');
    function fmt(v) {
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (typeof v === 'function') return 'ƒ ' + (v.name || 'anonymous') + '()';
      if (typeof v === 'object' && v.nodeType) return '<' + String(v.nodeName).toLowerCase() + (v.id ? '#' + v.id : '') + '>';
      try {
        var s = JSON.stringify(v, null, 2);
        return s === undefined ? String(v) : s;
      } catch (e) { return String(v); }
    }
    function runRepl() {
      if (!replSrc || !replOut) return;
      var code = replSrc.value.trim();
      if (!code) { replOut.textContent = '// nothing to run'; return; }
      var logs = [];
      var fakeConsole = {
        log: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
        error: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
        warn: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(' ')); }
      };
      var out, err = null;
      try {
        out = new Function('QKC', 'OURI_BANKS', 'console', '"use strict"; return (\n' + code + '\n);')(window.QKC, window.OURI_BANKS, fakeConsole);
      } catch (e1) {
        try {
          out = new Function('QKC', 'OURI_BANKS', 'console', '"use strict";\n' + code)(window.QKC, window.OURI_BANKS, fakeConsole);
        } catch (e2) { err = e2; }
      }
      replOut.textContent = '';
      logs.forEach(function (l) {
        var d = document.createElement('div');
        d.className = 'dim';
        d.textContent = '› ' + l;
        replOut.appendChild(d);
      });
      if (err) {
        var e = document.createElement('div');
        e.className = 'err';
        e.textContent = (err.name || 'Error') + ': ' + err.message;
        replOut.appendChild(e);
        return;
      }
      if (out !== undefined || !logs.length) {
        var r = document.createElement('div');
        r.textContent = '← ' + fmt(out);
        replOut.appendChild(r);
      }
    }
    var replRun = $('replRun');
    if (replRun) replRun.addEventListener('click', runRepl);
    if (replSrc) {
      replSrc.addEventListener('keydown', function (ev) {
        if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') runRepl();
      });
      document.querySelectorAll('[data-repl]').forEach(function (b) {
        b.addEventListener('click', function () {
          replSrc.value = b.getAttribute('data-repl');
          runRepl();
          replSrc.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        });
      });
      runRepl();
    }

    /* ── playground ── */
    var pgSrc = $('pgSrc'), pgOut = $('pgOut');
    if (pgSrc) pgSrc.value = JSON.stringify(PG_SAMPLE, null, 2);
    var pgGetMode = seg('pgMode', pgRerun);
    var pgGetTheme = seg('pgTheme', pgRerun);
    var pgGetLang = seg('pgLang', pgRerun);
    var pgInst = null;

    function parseBank() {
      var txt = (pgSrc && pgSrc.value || '').trim();
      if (!txt) throw new Error('empty source');
      try { return JSON.parse(txt); }
      catch (e1) {
        try { return new Function('"use strict"; return (' + txt + ');')(); }
        catch (e2) { throw new Error('parse error: ' + e1.message); }
      }
    }
    function setOut(msg, cls) {
      if (!pgOut) return;
      pgOut.textContent = msg;
      pgOut.className = 'pg-out mono ' + cls;
    }
    function pgRerun() {
      var bank;
      try { bank = parseBank(); }
      catch (e) { setOut(e.message, 'err'); return; }
      var v = QKC.validate(bank);
      if (!v.ok) { setOut(v.errors.slice(0, 4).join('\n'), 'err'); return; }
      var n = QKC.toArray(bank).length;
      var opts = { bank: bank, el: '#pg-quiz', mode: pgGetMode(), theme: pgGetTheme(), lang: pgGetLang(), seed: 'playground', count: Math.min(10, n), title: 'Your bank' };
      if (pgInst) { pgInst.update(opts); } else { pgInst = QKC.init(opts); }
      setOut('valid · ' + n + ' items · rendered with mode=' + opts.mode + ', theme=' + opts.theme + ', lang=' + opts.lang, 'ok');
    }
    var pgRunBtn = $('pgRun'), pgValBtn = $('pgValidate'), pgSampleBtn = $('pgSample'), pgEmbedBtn = $('pgEmbed');
    if (pgRunBtn) pgRunBtn.addEventListener('click', pgRerun);
    if (pgValBtn) pgValBtn.addEventListener('click', function () {
      var bank;
      try { bank = parseBank(); } catch (e) { setOut(e.message, 'err'); return; }
      var v = QKC.validate(bank);
      if (v.ok) {
        var arr = QKC.toArray(bank), tys = {};
        arr.forEach(function (it) { tys[it.ty] = (tys[it.ty] || 0) + 1; });
        setOut('valid · ' + arr.length + ' items (' + Object.keys(tys).map(function (k) { return k + ': ' + tys[k]; }).join(', ') + ') · no errors', 'ok');
      } else setOut(v.errors.slice(0, 6).join('\n'), 'err');
    });
    if (pgSampleBtn) pgSampleBtn.addEventListener('click', function () {
      pgSrc.value = JSON.stringify(PG_SAMPLE, null, 2);
      pgRerun();
    });
    if (pgEmbedBtn) pgEmbedBtn.addEventListener('click', function () {
      var bank;
      try { bank = parseBank(); } catch (e) { setOut(e.message, 'err'); return; }
      var v = QKC.validate(bank);
      if (!v.ok) { setOut(v.errors.slice(0, 3).join('\n'), 'err'); return; }
      var html = '<script src="https://qkc.js.org/engine.js"><\/script>\n' +
        '<div id="quiz"></div>\n' +
        '<script>\n' +
        'const bank = ' + JSON.stringify(bank, null, 2) + ';\n' +
        "QKC.init({ bank, el: '#quiz', mode: '" + pgGetMode() + "', theme: '" + pgGetTheme() + "', lang: '" + pgGetLang() + "' });\n" +
        '<\/script>';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(html).then(function () { setOut('standalone embed HTML copied — paste into any page', 'ok'); },
          function () { legacyCopy(html); setOut('standalone embed HTML copied — paste into any page', 'ok'); });
      } else { legacyCopy(html); setOut('standalone embed HTML copied — paste into any page', 'ok'); }
    });
    if (pgSrc) pgSrc.addEventListener('keydown', function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') pgRerun();
    });
    pgRerun();

    /* ── embed tabs ── */
    var tabs = document.querySelector('.tabs');
    if (tabs) tabs.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-tab]');
      if (!b) return;
      tabs.querySelectorAll('button').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.tabpanes .code').forEach(function (p) { p.hidden = p.id !== b.getAttribute('data-tab'); });
    });
  });
})();
