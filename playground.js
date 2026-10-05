/* QKC Engine playground — demo bank + build/score UI (uses dist/qkc-engine.js) */
(function () {
  'use strict';
  var DEMO_BANK = {
    5: {
      math: {
        1: [
          { t: 'Solve: x + 7 = 41. What is x?', ty: 'input', c: '34', e: 'x = 41 − 7 = 34.', tp: 'equations', q: 1 },
          { t: 'What is LCM(8, 6)?', ty: 'choice', c: '24', e: 'The least common multiple of 8 and 6 is 24.', tp: 'divisibility', q: 1, o: ['6', '8', '24', '48'] },
          { t: 'A square is always a rectangle.', ty: 'bool', c: 'true', e: 'A square meets every rectangle property plus equal sides.', tp: 'shapes', q: 1 },
          { t: '6 × 3 = ?', ty: 'input', c: '18', e: '6 · 3 = 18.', tp: 'multiplication', q: 1 },
          { t: 'Which number is prime?', ty: 'choice', c: '17', e: '17 has exactly two divisors.', tp: 'divisibility', q: 1, o: ['9', '15', '17', '21'] }
        ],
        2: [
          { t: '12 − 5 = ?', ty: 'input', c: '7', e: '12 − 5 = 7.', tp: 'subtraction', q: 2 },
          { t: 'Half of 40 is 25.', ty: 'bool', c: 'false', e: 'Half of 40 is 20.', tp: 'fractions', q: 2 },
          { t: 'Perimeter of a square with side 5 cm?', ty: 'choice', c: '20 cm', e: 'P = 4 · 5 = 20 cm.', tp: 'shapes', q: 2, o: ['10 cm', '20 cm', '25 cm', '40 cm'] },
          { t: '45 ÷ 9 = ?', ty: 'input', c: '5', e: '45 / 9 = 5.', tp: 'division', q: 2 },
          { t: 'Round 3.76 to one decimal place.', ty: 'input', c: '3.8', e: 'The second decimal (6) rounds the first up: 3.8.', tp: 'rounding', q: 2 }
        ]
      }
    }
  };

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var buildBtn = document.getElementById('pgBuild');
    var scoreBtn = document.getElementById('Score');
    var seedIn = document.getElementById('pgSeed');
    var testBox = document.getElementById('pgTest');
    var resBox = document.getElementById('pgRes');
    if (!buildBtn || !window.QKC) return;
    var eng = QKC.engine(DEMO_BANK);
    var test = null;

    buildBtn.addEventListener('click', function () {
      test = eng.build({ grade: 5, subject: 'math', quarter: 'all', count: 5, seed: seedIn.value || 'demo' });
      resBox.textContent = 'Score a test to see the Result object.';
      resBox.className = 'muted';
      testBox.innerHTML = '';
      test.items.forEach(function (it) {
        var d = document.createElement('div');
        d.className = 'q';
        var meta = 'q' + it.q + ' · ' + it.tp + ' · ' + it.ty;
        if (it.ty === 'choice' || it.ty === 'bool') {
          d.innerHTML = '<div class="q__t"></div><div class="q__meta">' + meta + '</div><div class="opts"></div>';
          d.querySelector('.q__t').textContent = it.t;
          var opts = d.querySelector('.opts');
          (it.o || ['true', 'false']).forEach(function (o) {
            var l = document.createElement('label');
            l.className = 'opt';
            l.innerHTML = '<input type="radio" name="q' + it.id + '" value="">';
            l.querySelector('input').value = o;
            l.appendChild(document.createTextNode(o));
            opts.appendChild(l);
          });
        } else {
          d.innerHTML = '<div class="q__t"></div><div class="q__meta">' + meta + '</div><input data-a placeholder="your answer">';
          d.querySelector('.q__t').textContent = it.t;
        }
        testBox.appendChild(d);
      });
      scoreBtn.disabled = false;
    });

    scoreBtn.addEventListener('click', function () {
      if (!test) return;
      var answers = {};
      var nodes = testBox.querySelectorAll('.q');
      test.items.forEach(function (it, i) {
        var n = nodes[i];
        if (!n) return;
        var r = n.querySelector('input[type="radio"]:checked');
        var txt = n.querySelector('input[data-a]');
        answers[it.id] = r ? r.value : (txt ? txt.value : '');
      });
      var res = eng.score(test, answers);
      resBox.innerHTML = '<div class="score-line">' + res.pct + '%</div>' +
        '<div class="muted" style="font-size:.8rem; margin-top:4px">correct ' + res.correct + ' · wrong ' + res.wrong + ' · skipped ' + res.skip + '</div>' +
        '<pre class="code" style="font-size:.72rem; margin-top:12px">' + esc(JSON.stringify({ pct: res.pct, perTopic: res.perTopic }, null, 2)) + '</pre>';
      /* mark right/wrong */
      test.items.forEach(function (it, i) {
        var n = nodes[i]; if (!n) return;
        var given = answers[it.id];
        n.classList.remove('ok', 'bad');
        if (given == null || given === '') return;
        n.classList.add(QKC.norm(given) === QKC.norm(it.c) ? 'ok' : 'bad');
      });
    });

    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  });
})();
