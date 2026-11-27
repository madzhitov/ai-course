/* «Найди выдумку» (#fake, #fake-<номер выпуска>). Пять ответов ИИ, в каждом одна ошибка:
   читатель нажимает на фразу, потом видит объяснение и источник. Данные — v6/data/fake-hunt.json.
   Грузится из v6.js по требованию (V6.openX) и регистрируется через V6.ext. */
(function () {
  'use strict';
  const KEY = 'v6-fake';
  let F = null, C = null, st = null;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
  const site = () => location.origin + location.pathname;
  const dateRu = (s) => { const d = new Date(s + 'T12:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); };

  function loadAll() {
    if (F) return Promise.resolve();
    return fetch(C.dataUrl('fake-hunt.json')).then((r) => r.ok ? r.json() : Promise.reject(new Error('fake-hunt ' + r.status))).then((j) => { F = j; });
  }
  const issue = () => F.issues.find((x) => x.n === st.n);
  const score = () => st.picks.filter((p, k) => p != null && issue().cards[k].a[p].wrong).length;

  const head = (is) => `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('knowledge')">Справочник</a><span>/</span><span>Найди выдумку</span></nav>
    <section class="v6x-head"><span class="v6-eyebrow">Выпуск №${is.n} · ${C.esc(dateRu(is.date))}</span><h1 class="v6-d">Найди выдумку</h1>
      <p class="v6-lead">Пять ответов ИИ на обычные вопросы. В каждом одна фраза с ошибкой: неверный факт или кривая логика. Нажмите на неё.</p></section>`;

  function card() {
    const e = C.esc, is = issue(), n = is.cards.length, k = st.i, c = is.cards[k], p = st.picks[k], open = p != null;
    const good = open && c.a[p].wrong;
    const line = (s, j) => {
      const cls = !open ? '' : s.wrong ? ' is-wrong' : j === p ? ' is-miss' : '';
      return `<button type="button" class="v6x-phrase${cls}" ${open ? 'disabled' : ''} onclick="FakeHunt.pick(${j})">${e(s.t)}</button>`;
    };
    return `<div class="v6x-card"><div class="v6x-prog" aria-hidden="true">${is.cards.map((_, j) => `<span class="${j < k ? 'is-done' : j === k ? 'is-now' : ''}"></span>`).join('')}</div>
      <span class="v6-meta">Ответ ${k + 1} из ${n} · ${e(c.topic)}</span>
      <p class="v6x-ask"><span class="v6-meta">Вопрос</span>${e(c.q)}</p>
      <div class="v6x-answer"><span class="v6-meta">Ответ ИИ${open ? '' : ' · нажмите на фразу с ошибкой'}</span><div class="v6x-lines">${c.a.map(line).join('')}</div></div>
      ${open ? `<div class="v6x-why" role="status"><b>${good ? 'Верно, это выдумка.' : 'Не здесь.'}</b> ${good ? '' : 'Выбранная фраза верна, ошибка выделена красным. '}${e(c.why)}
        <p class="v6-meta">Источник: <a href="${e(c.source.url)}" target="_blank" rel="noopener">${e(c.source.title)} ↗</a></p></div>
        <span class="v6-btns"><button type="button" class="v6b v6-btn-lg" onclick="FakeHunt.next()">${k + 1 < n ? 'Следующий ответ' : 'Итог'}</button></span>` : ''}</div>`;
  }

  function verdict(s, n) {
    if (s === n) return 'Все пять. ИИ вас не проведёт, а вот коллег проверьте.';
    if (s >= n - 1) return 'Почти всё. Одна выдумка проскочила: так и бывает, когда ответ звучит уверенно.';
    if (s >= 2) return 'Половина. Ошибки ИИ прячутся среди верных фраз: проверяйте числа, сроки и выводы.';
    return 'Выдумки прошли мимо. Это нормально для первого раза: ИИ пишет ошибки тем же уверенным тоном.';
  }
  function final() {
    const e = C.esc, is = issue(), n = is.cards.length, s = score();
    const next = is.next && new Date(is.next + 'T12:00:00') > new Date() ? `Следующий выпуск ${e(dateRu(is.next))}.` : 'Следующий выпуск готовится.';
    return `<div class="v6x-card v6x-res"><span class="v6-meta">Выпуск №${is.n} · итог</span><h2 class="v6x-q">${s} из ${n}</h2><p>${e(verdict(s, n))}</p>
      <ol class="v6x-units">${is.cards.map((c, k) => `<li><span><b>${c.a[st.picks[k]] && c.a[st.picks[k]].wrong ? '✓' : '✗'} ${e(c.topic)}</b><span class="v6-meta">${e(c.a.find((x) => x.wrong).t)}</span></span></li>`).join('')}</ol>
      <p class="v6-meta">${next} Новые выпуски анонсируем в <a href="https://t.me/artefakty_ai" target="_blank" rel="noopener" onclick="umTrack('tg-click', { from: 'fake' })">канале @artefakty_ai</a>.</p>
      <span class="v6-btns"><button type="button" class="v6b v6-btn-lg" onclick="FakeHunt.copy(this)">Поделиться результатом</button><button type="button" class="v6b is-soft v6-btn-lg" onclick="V6.openUnit('u-ai-answer-check','fake')">Задание: проверить ответ ИИ</button><button type="button" class="v6-link" onclick="FakeHunt.restart()">Пройти ещё раз</button></span>
      <p class="v6-meta v6x-msg" role="status"></p></div>`;
  }

  function draw() {
    const box = document.getElementById('v6x-fake'); if (!box) return;
    box.innerHTML = st.i >= issue().cards.length ? final() : card();
  }
  function pick(j) {
    if (st.picks[st.i] != null) return;
    if (!st.started) { st.started = true; C.track('fake-start', { issue: st.n, from: C.from }); }
    st.picks[st.i] = j;
    draw();
  }
  function next() {
    st.i++;
    if (st.i >= issue().cards.length) {
      const s = score(), all = (() => { try { return JSON.parse(ls.get(KEY) || '{}') || {}; } catch (_) { return {}; } })();
      all[st.n] = { score: s, of: issue().cards.length, date: new Date().toISOString() };
      ls.set(KEY, JSON.stringify(all));
      C.track('fake-done', { issue: st.n, score: s });
    }
    draw();
    const box = document.getElementById('v6x-fake'); if (box && box.scrollIntoView && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: 'start' });
  }
  function restart() { st = { n: st.n, i: 0, picks: [], started: false }; draw(); }
  function text() {
    const is = issue(), n = is.cards.length;
    return `Мой результат в «Найди выдумку», выпуск №${is.n}: найдено ${score()} из ${n} выдумок ИИ.\nПопробуйте сами: ${site()}#fake-${is.n}`;
  }
  function copy(btn) {
    const t = text(), m = btn.closest('.v6x-res').querySelector('.v6x-msg');
    if (navigator.share) { navigator.share({ title: 'Найди выдумку', text: t }).catch(() => {}); return; }
    const done = () => { if (m) m.textContent = 'Скопировано: ' + t.split('\n')[0]; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => { if (m) m.textContent = t; });
    else if (m) m.textContent = t;
  }

  function render(box, ctx) {
    C = ctx;
    box.innerHTML = '<div id="v6x-fake-w"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>';
    return loadAll().then(() => {
      const want = Number(ctx.arg), is = F.issues.find((x) => x.n === want) || F.issues[0];
      st = { n: is.n, i: 0, picks: [], started: false };
      box.innerHTML = head(is) + '<div id="v6x-fake"></div>';
      draw();
    }).catch(() => { box.innerHTML = '<p class="v6-lead" style="padding-top:56px">Не удалось загрузить данные. Обновите страницу.</p>'; });
  }

  window.FakeHunt = { render, pick, next, restart, copy, score: () => score(), text: () => text() };
  if (window.V6 && V6.ext) V6.ext('fake', { render });
})();
