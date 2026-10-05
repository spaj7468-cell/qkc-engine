/* QKC Engine docs site — demo wiring, playground, toggles, tabs, copy.
   Everything on this page runs the real dist/qkc-engine.js. No frameworks. */
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

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    if (!window.QKC) return;

    /* ── hero widget: the classic 2+2 demo, rendered by the engine ── */
    QKC.init({
      bank: DEMO_BANK.slice(0, 2),
      el: '#hero-quiz',
      theme: 'dark',
      mode: 'normal',
      seed: 'web',
      shuffleOptions: false,
      title: 'Quick Knowledge Check'
    });

    /* ── quick start: the exact spec call, against the real bank excerpt ── */
    var real = window.OURI_BANKS && OURI_BANKS[7] && OURI_BANKS[7].algebra && OURI_BANKS[7].algebra[1];
    if (real) {
      QKC.init({
        bank: window.OURI_BANKS[7].algebra[1],
        el: '#qs-quiz',
        count: 5,
        seed: 'quickstart',
        theme: 'dark',
        lang: 'ru',
        title: 'Алгебра · 7 класс · I четверть'
      });
    }

    /* ── segmented switches helper ── */
    function seg(id, onChange) {
      var box = document.getElementById(id);
      if (!box) return function () { return 'normal'; };
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

    /* ── live demo: code ⇄ result ── */
    var demoCode = document.getElementById('demoCode');
    var getMode = seg('segMode', function () { syncDemo(); });
    var getTheme = seg('segTheme', function () { syncDemo(); });
    var getLang = seg('segLang', function () { syncDemo(); });
    var demo = QKC.init({
      bank: DEMO_BANK, el: '#demo-quiz',
      mode: getMode(), theme: getTheme(), lang: getLang(),
      seed: 'demo1', count: 4, shuffleOptions: false, title: 'Quick Knowledge Check'
    });
    function syncDemo() {
      demo.update({ mode: getMode(), theme: getTheme(), lang: getLang() });
      renderDemoCode();
    }
    function renderDemoCode() {
      if (!demoCode) return;
      demoCode.textContent =
        'const myBank = [\n' +
        '  { t: "2 + 2 = ?", ty: "choice",\n' +
        '    o: ["3", "4", "5"], c: "4",\n' +
        '    e: "Базовая арифметика.", tp: "арифметика" },\n' +
        '  // … ' + (DEMO_BANK.length - 1) + ' more items\n' +
        '];\n\n' +
        'QKC.init({\n' +
        '  bank:  myBank,\n' +
        "  el:    '#demo-quiz',\n" +
        "  mode:  '" + getMode() + "',\n" +
        "  theme: '" + getTheme() + "',\n" +
        "  lang:  '" + getLang() + "',\n" +
        "  seed:  'demo1',\n" +
        '  count: 4\n' +
        '});';
    }
    renderDemoCode();

    /* ── playground ── */
    var pgSrc = document.getElementById('pgSrc');
    var pgOut = document.getElementById('pgOut');
    if (pgSrc) pgSrc.value = JSON.stringify(PG_SAMPLE, null, 2);
    var pgGetMode = seg('pgMode', function () { pgRerun(); });
    var pgGetTheme = seg('pgTheme', function () { pgRerun(); });
    var pgGetLang = seg('pgLang', function () { pgRerun(); });
    var pgInst = null;

    function parseBank() {
      var txt = (pgSrc && pgSrc.value || '').trim();
      if (!txt) throw new Error('empty source');
      try { return JSON.parse(txt); }
      catch (e1) {
        /* allow JS object literals: trailing commas, single quotes, unquoted keys */
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

    var pgRunBtn = document.getElementById('pgRun');
    var pgValBtn = document.getElementById('pgValidate');
    var pgSampleBtn = document.getElementById('pgSample');
    if (pgRunBtn) pgRunBtn.addEventListener('click', pgRerun);
    if (pgValBtn) pgValBtn.addEventListener('click', function () {
      var bank;
      try { bank = parseBank(); } catch (e) { setOut(e.message, 'err'); return; }
      var v = QKC.validate(bank);
      if (v.ok) {
        var arr = QKC.toArray(bank);
        var tys = {};
        arr.forEach(function (it) { tys[it.ty] = (tys[it.ty] || 0) + 1; });
        var parts = Object.keys(tys).map(function (k) { return k + ': ' + tys[k]; });
        setOut('valid · ' + arr.length + ' items (' + parts.join(', ') + ') · no errors', 'ok');
      } else setOut(v.errors.slice(0, 6).join('\n'), 'err');
    });
    if (pgSampleBtn) pgSampleBtn.addEventListener('click', function () {
      pgSrc.value = JSON.stringify(PG_SAMPLE, null, 2);
      pgRerun();
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
      tabs.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('.tabpanes .code').forEach(function (p) { p.hidden = p.id !== b.getAttribute('data-tab'); });
    });

    /* ── copy buttons ── */
    document.querySelectorAll('.copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-copy');
        var src = document.getElementById(id);
        var txt = '';
        if (src) txt = src.tagName === 'TEMPLATE' ? src.content.textContent : src.textContent;
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
    function legacyCopy(txt) {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }

    /* ── scroll reveal ── */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: .08 });
      document.querySelectorAll('section .wrap, .hero__txt, .hero__demo').forEach(function (n) {
        n.classList.add('rv');
        io.observe(n);
      });
    }
  });
})();
