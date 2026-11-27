/* «Мой ИИ-сетап за 5 минут» (#setup, #setup-<код>). Четыре вопроса → два сервиса, запасной и три первых задания.
   Правила и тексты — v6/data/setup-quiz.json, доступ и лимиты сервисов — tools/neyroseti-bez-vpn/data.json.
   Без запросов к ИИ. Грузится из v6.js по требованию (V6.openX) и регистрируется через V6.ext. */
(function () {
  'use strict';
  const KEY = 'v6-setup';
  let Q = null, SV = null, C = null, st = null;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
  const site = () => location.origin + location.pathname;

  function loadAll() {
    const json = (u) => fetch(u).then((r) => r.ok ? r.json() : Promise.reject(new Error(u + ' ' + r.status)));
    if (Q) return Promise.resolve();
    return Promise.all([json(C.dataUrl('setup-quiz.json')), json('tools/neyroseti-bez-vpn/data.json').catch(() => null)]).then(([q, sv]) => { Q = q; SV = sv; });
  }
  const svc = (name) => ((SV && SV.services) || []).find((s) => s.name === name) || { name };
  const taskOf = (code) => Q.tasks.find((t) => t.code === code);
  const opts = (id) => (Q.questions.find((q) => q.id === id) || {}).options || [];
  const optTitle = (id, code) => (opts(id).find((o) => o.code === code) || {}).title || '';
  // код в адресе: задача, устройство, бюджет, доступ — 4 символа, например tc0n
  function parse(code) {
    const m = /^([a-z])([pc])([012])([ny])$/.exec(code || '');
    return m && taskOf(m[1]) ? { task: m[1], device: m[2], budget: m[3], access: m[4] } : null;
  }
  const codeOf = (a) => a.task + a.device + a.budget + a.access;
  const checked = () => {
    if (!SV || !SV.checked) return '';
    const d = new Date(SV.checked + 'T12:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ' ' + d.getFullYear();
  };

  // ---------- правила ----------
  function pick(a) {
    const t = taskOf(a.task);
    const alt = a.device === 'p' && t.phone ? t.phone : null;
    const main = (alt ? alt.services : t.services).map(svc), backup = svc(alt ? alt.backup : t.backup);
    const tips = [];
    if (alt && alt.note) tips.push(alt.note);
    tips.push(Q.device[a.device]);
    const paid = [...main, backup].map((s) => Q.paid[s.name]).filter(Boolean);
    tips.push(a.budget === '0' ? Q.budget['0'] : paid.length ? Q.budget[a.budget].replace('{paid}', paid.join('; ')) : Q.budget.none);
    if (a.access === 'y') {
      const partial = ((SV && SV.services) || []).filter((s) => s.vpn === 'partial' && (s.tasks || []).includes(t.tag)).map((s) => s.name);
      tips.push(partial.length ? Q.access.y.replace('{partial}', partial.join(', ')) : Q.access.y.replace(/^[^.]*\{partial\}\.\s*/, ''));
    } else tips.push(Q.access.n);
    const units = t.units.map((id) => C.D.units.find((u) => u.id === id)).filter((u) => u && !u.review && (u.steps || []).length).slice(0, 3);
    return { t, main, backup, tips, units };
  }

  // ---------- экраны ----------
  const head = () => `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('knowledge')">Справочник</a><span>/</span><span>Мой ИИ-сетап</span></nav>
    <section class="v6x-head"><span class="v6-eyebrow">Четыре вопроса · около 5 минут</span><h1 class="v6-d">Мой ИИ-сетап</h1>
      <p class="v6-lead">Ответьте на четыре вопроса и получите два сервиса, запасной и три первых задания. Без регистрации, ответы остаются в этом браузере.</p></section>`;

  function question() {
    const e = C.esc, i = st.i, q = Q.questions[i];
    const list = q.id === 'task' ? Q.tasks.map((t) => ({ code: t.code, title: t.title })) : q.options;
    const cur = st.a[q.id];
    return `<div class="v6x-card"><div class="v6x-prog" aria-hidden="true">${Q.questions.map((_, k) => `<span class="${k < i ? 'is-done' : k === i ? 'is-now' : ''}"></span>`).join('')}</div>
      <span class="v6-meta">Вопрос ${i + 1} из ${Q.questions.length}</span><h2 class="v6x-q">${e(q.title)}</h2>${q.hint ? `<p class="v6-meta">${e(q.hint)}</p>` : ''}
      <div class="v6x-opts" role="group" aria-label="${e(q.title)}">${list.map((o) => `<button type="button" class="v6x-opt" aria-pressed="${cur === o.code}" onclick="SetupQuiz.answer('${e(q.id)}','${e(o.code)}')">${e(o.title)}</button>`).join('')}</div>
      ${i > 0 ? '<button type="button" class="v6-link v6x-back" onclick="SetupQuiz.back()">← Назад</button>' : ''}</div>`;
  }

  function svcCard(s, label) {
    const e = C.esc;
    const name = s.url ? `<a href="${e(s.url)}" target="_blank" rel="noopener">${e(s.name)} ↗</a>` : e(s.name);
    const meta = [s.company !== s.name ? s.company : '', s.vpn === 'yes' ? 'без VPN' : s.vpn === 'partial' ? 'с оговорками' : ''].filter(Boolean).join(' · ');
    return `<div class="v6x-svc"><span class="v6-meta">${label}${meta ? ' · ' + e(meta) : ''}</span><b>${name}</b>${s.free ? `<p>${e(s.free)}</p>` : ''}</div>`;
  }

  function result() {
    const e = C.esc, a = st.a, r = pick(a), code = codeOf(a);
    const tags = [r.t.title, optTitle('device', a.device), optTitle('budget', a.budget), optTitle('access', a.access)];
    const date = checked();
    return `<div class="v6x-card v6x-res" id="v6x-setup-card"><span class="v6-meta">Ваш сетап · код ${e(code)}</span>
      <h2 class="v6x-q">${e(r.main.map((s) => s.name).join(' + '))}</h2>
      <span class="v6-tags">${tags.map((x) => `<span class="v6t is-grey">${e(x)}</span>`).join('')}</span>
      <div class="v6x-svcs">${r.main.map((s, k) => svcCard(s, k ? 'Второй' : 'Основной')).join('')}${svcCard(r.backup, 'Запасной')}</div>
      <ul class="v6x-tips">${r.tips.map((x) => `<li>${e(x)}</li>`).join('')}</ul>
      <h3 class="v6x-h3">Три первых задания</h3>
      <ol class="v6x-units">${r.units.map((u) => `<li><a href="#unit-${e(u.id)}" onclick="V6.openUnit('${e(u.id)}','setup'); return false;"><b>${e(u.title)}</b><span class="v6-meta">≈ ${u.minutes} мин · ${e(u.result || '')}</span></a></li>`).join('')}</ol>
      <p class="v6-meta">${date ? `Доступ и лимиты сервисов по нашей проверке на ${e(date)}. ` : ''}<a href="tools/neyroseti-bez-vpn/">Все нейросети без VPN</a> · <a href="${e(Q.guide)}">Гайд: как собрать свой ИИ-сетап</a></p>
      <span class="v6-btns"><button type="button" class="v6b v6-btn-lg" onclick="SetupQuiz.copy(this)">Скопировать текстом</button><button type="button" class="v6b is-soft v6-btn-lg" onclick="SetupQuiz.share(this)">Поделиться ссылкой</button><button type="button" class="v6-link" onclick="SetupQuiz.restart()">Пройти заново</button></span>
      <p class="v6-meta v6x-msg" role="status"></p></div>`;
  }

  function text() {
    const a = st.a, r = pick(a);
    return ['Мой ИИ-сетап · Артефакты',
      `Задача: ${r.t.title}; ${optTitle('device', a.device).toLowerCase()}; ${optTitle('budget', a.budget).toLowerCase()}; ${optTitle('access', a.access).toLowerCase()}`,
      `Основные: ${r.main.map((s) => s.name).join(', ')}`, `Запасной: ${r.backup.name}`, '', 'Первые задания:',
      ...r.units.map((u, k) => `${k + 1}. ${u.title} — ${site()}#unit-${u.id}`), '', `Подобрать свой: ${site()}#setup-${codeOf(a)}`].join('\n');
  }

  function draw() {
    const box = document.getElementById('v6x-setup'); if (!box) return;
    box.innerHTML = st.i >= Q.questions.length ? result() : question();
  }

  // ---------- действия ----------
  function answer(id, code) {
    if (!st.started) { st.started = true; C.track('setup-start', { from: C.from }); }
    st.a[id] = code;
    st.i = Q.questions.findIndex((q) => q.id === id) + 1;
    if (st.i >= Q.questions.length) {
      const code4 = codeOf(st.a);
      ls.set(KEY, JSON.stringify({ code: code4, date: new Date().toISOString() }));
      try { history.replaceState(null, '', '#setup-' + code4); } catch (_) {}
      C.track('setup-done', { code: code4, task: st.a.task, device: st.a.device, budget: st.a.budget, access: st.a.access });
    }
    draw();
  }
  function back() { if (st.i > 0) st.i--; draw(); }
  function restart() { st = { i: 0, a: {}, started: st.started }; try { history.replaceState(null, '', '#setup'); } catch (_) {} draw(); }
  function say(btn, msg) { const m = btn.closest('.v6x-res').querySelector('.v6x-msg'); if (m) m.textContent = msg; }
  function toClipboard(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise((ok, no) => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') ? ok() : no(); } catch (x) { no(x); } ta.remove(); });
  }
  function copy(btn) { toClipboard(text()).then(() => say(btn, 'Скопировано. Вставьте в заметки или отправьте в мессенджер.'), () => say(btn, 'Не получилось скопировать. Выделите текст карточки вручную.')); }
  function share(btn) {
    const url = `${site()}#setup-${codeOf(st.a)}`;
    if (navigator.share) { navigator.share({ title: 'Мой ИИ-сетап', text: 'Мой ИИ-сетап за 5 минут', url }).catch(() => {}); return; }
    toClipboard(url).then(() => say(btn, 'Ссылка скопирована: ' + url), () => say(btn, url));
  }

  function render(box, ctx) {
    C = ctx;
    box.innerHTML = head() + '<div id="v6x-setup"><p class="v6-lead">Загружается…</p></div>';
    return loadAll().then(() => {
      const a = parse(ctx.arg);
      st = a ? { i: Q.questions.length, a, started: true, shared: true } : { i: 0, a: {}, started: false };
      if (a) C.track('setup-open', { code: ctx.arg });
      draw();
    }).catch(() => { const b = document.getElementById('v6x-setup'); if (b) b.innerHTML = '<p class="v6-lead">Не удалось загрузить данные. Обновите страницу.</p>'; });
  }

  window.SetupQuiz = { render, answer, back, restart, copy, share, parse, pick: (a) => pick(a), text: () => text() };
  if (window.V6 && V6.ext) V6.ext('setup', { render });
})();
