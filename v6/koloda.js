// Колода решений на главной (v6-brief/research/wordstat-2026-11-24, прототип glavnaya.html).
// Данные: v6/data/koloda.json (действия, аудитории, слоты «скоро») + units.json и tasks.json через V6.kdata().
// Первый экран (#kd-hero) лежит в разметке дважды: #v6-prehero в index.html и home() в v6.js — править вместе.
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, few, many) => { const x = n % 10, y = n % 100; return x === 1 && y !== 11 ? one : x >= 2 && x <= 4 && (y < 12 || y > 14) ? few : many; };
  const track = (n, d) => { try { umTrack(n, d); } catch (_) {} };
  const ROLE = { ai: 'Для всех', self: 'Для себя', seller: 'Продавцу', marketing: 'Маркетологу', product: 'Продакту', teacher: 'Учителю', student: 'Учиться с ИИ' };
  const WORKROLES = [['all', 'Все'], ['seller', 'Продавцу'], ['marketing', 'Маркетологу'], ['product', 'Продакту']];
  // Масти действий: линия 2.2 в цвет текста, сетка 32 (направление Б концепта иллюстраций, 25.11)
  const ICON = {
    write: '<path d="M6 26.5 8 19 21.5 5.5a2.5 2.5 0 0 1 3.5 0l1.5 1.5a2.5 2.5 0 0 1 0 3.5L13 24.5z" stroke-linejoin="round"/><path d="M18.5 8.5l5 5M6 26.5l4.5-1"/>',
    count: '<rect x="7" y="4" width="18" height="24" rx="4"/><rect x="11" y="8" width="10" height="5" rx="1.5" fill="currentColor" stroke="none"/><g fill="currentColor" stroke="none"><circle cx="12" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/><circle cx="20" cy="18" r="1.4"/><circle cx="12" cy="23" r="1.4"/><circle cx="16" cy="23" r="1.4"/><circle cx="20" cy="23" r="1.4"/></g>',
    find: '<circle cx="14" cy="14" r="8.5"/><path d="m20.5 20.5 6 6" stroke-width="2.6"/><path d="M10.5 12a4 4 0 0 1 3.5-3" stroke-width="2"/>',
    invent: '<path d="M16 4a8 8 0 0 0-4.6 14.5c.9.7 1.6 1.7 1.6 2.9V22h6v-.6c0-1.2.7-2.2 1.6-2.9A8 8 0 0 0 16 4z" stroke-linejoin="round"/><path d="M13 25.5h6M14 28.5h4"/>',
    decide: '<path d="M16 28V15M16 15 8.5 7.5M16 15l7.5-7.5"/><path d="M8 12V7h5M24 12V7h-5" stroke-linejoin="round"/><circle cx="16" cy="15" r="2.2" fill="currentColor" stroke="none"/>',
    show: '<rect x="4" y="5" width="24" height="16" rx="3"/><path d="M16 21v4M10 28l6-3 6 3" stroke-linejoin="round"/><path d="M9 16l4-4 3 3 5-5" stroke-width="2" stroke-linejoin="round"/>',
    delegate: '<circle cx="8.5" cy="10" r="3.5"/><circle cx="23.5" cy="10" r="3.5"/><path d="M3.5 24a5 5 0 0 1 10 0M18.5 24a5 5 0 0 1 10 0"/><path d="M12.5 18.5h7m-2.5-2.5 2.5 2.5-2.5 2.5" stroke-width="2" stroke-linejoin="round"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false">${ICON[k] || ''}</svg>`;

  let K = null, CARDS = [], aud = 'self', verb = 'write', wrole = 'all';
  try { const a = localStorage.getItem('kd-aud'); if (a) aud = a; } catch (_) {}

  function build(D) {
    K = D.koloda;
    if (!K.audiences.some((a) => a.id === aud)) aud = 'self';
    verb = A().verb;
    const real = D.units.filter((u) => Array.isArray(u.steps) && u.steps.length && K.units[u.id]).map((u) => {
      const t = D.tasks[u.task] || {};
      const last = u.steps.map((s) => s.checklist).filter(Boolean).pop() || [];
      return { id: u.id, v: K.units[u.id], grp: t.group, t: u.title, r: u.result, m: u.minutes, lv: u.level, tools: u.tools || [], nv: !!u.noVpn, needs: u.needs || [],
        steps: u.steps.map((s) => s.title), p: (u.steps.find((s) => s.prompt) || {}).prompt, ch: last.slice(0, 3), review: !!u.review,
        fw: (u.basedOn || []).map((id) => D.fw.find((c) => c.id === id)).filter(Boolean).map((c) => ({ id: c.id, t: c.title, page: !!c.full })) };
    });
    CARDS = real.concat(K.soon.map((s) => ({ gap: true, id: s.id, v: s.verb, grp: s.group, t: s.title, r: s.result, w: s.where })));
  }
  const A = () => K.audiences.find((a) => a.id === aud);
  const byId = (id) => CARDS.find((c) => c.id === id);
  function inAud(c) {
    const a = A();
    if ((a.extra || []).includes(c.id)) return true;
    if (!a.groups.includes(c.grp)) return false;
    return aud !== 'work' || wrole === 'all' || c.grp === wrole;
  }

  function back(c) {
    let h = `<div class="kd-scroll"><div class="kd-bt">${esc(c.t)}</div>`;
    if (c.tools.length) h += `<p class="kd-fw">Где делать: ${esc(c.tools.join(', '))}${c.nv ? ', без VPN' : ''}</p>`;
    if (c.needs.length) h += `<h4>Понадобится</h4><ul>${c.needs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    h += `<h4>Шаги</h4><ol>${c.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
    if (c.ch.length) h += `<h4>Проверка</h4><ul>${c.ch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (c.fw.length) h += `<p class="kd-fw">Внутри метод: ${c.fw.map((f) => f.page ? `<a href="/metody/${esc(f.id)}.html">${esc(f.t)}</a>` : esc(f.t)).join(', ')}</p>`;
    h += `</div><div class="kd-bb"><a class="is-main" href="#unit-${esc(c.id)}" data-kd-open="${esc(c.id)}">Сделать по шагам</a>`;
    if (c.p) h += `<button type="button" data-kd-copy="${esc(c.id)}">Скопировать запрос</button>`;
    if (c.grp === 'seller' || c.grp === 'marketing') h += `<button type="button" data-kd-work="1">Внедрить в работу</button>`;
    return h + '</div>';
  }
  function card(c, big) {
    if (c.gap) return `<div class="kd-card is-gap${big ? ' is-big' : ''}"><div class="kd-in"><div class="kd-face kd-front">
      <div class="kd-row">${svg(c.v)}<span class="kd-min">Скоро</span></div>
      <div class="kd-t">${esc(c.t)}</div><div class="kd-r">${esc(c.r)}</div>
      <div class="kd-foot"><span>${esc(c.w || '')}</span><span>${esc(ROLE[c.grp] || '')}</span></div></div></div></div>`;
    return `<div class="kd-card${big ? ' is-big' : ''}" data-kd-card="${esc(c.id)}" role="button" tabindex="0" aria-label="${esc(c.t)}, ${c.m} ${plural(c.m, 'минута', 'минуты', 'минут')}. Перевернуть карту">
      <div class="kd-in"><div class="kd-face kd-front">
        <div class="kd-row"><span class="kd-min">${c.m}<small>мин</small></span><span class="kd-chips">${c.review ? '<span class="kd-chip is-o">черновик</span>' : ''}${c.nv ? '<span class="kd-chip">без VPN</span>' : ''}<span class="kd-chip is-o">${esc(ROLE[c.grp] || '')}</span></span></div>
        <div class="kd-suit">${svg(c.v)}</div>
        <div class="kd-t">${esc(c.t)}</div><div class="kd-r">${esc(c.r)}</div>
        <div class="kd-foot"><span class="kd-hint">↻ Что внутри</span><a class="kd-go" href="#unit-${esc(c.id)}" data-kd-open="${esc(c.id)}">Открыть →</a></div>
      </div><div class="kd-face kd-back">${back(c)}</div></div></div>`;
  }

  function renderHero() {
    const a = A(), q = (id) => document.getElementById(id);
    if (!q('kd-hero')) return;
    document.querySelectorAll('[data-kd-aud]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kdAud === aud)));
    q('kd-h1').textContent = a.h1;
    q('kd-lead').textContent = a.lead;
    q('kd-verbs').innerHTML = K.verbs.map((v) => {
      const all = CARDS.filter((c) => c.v === v.id && inAud(c)), ready = all.filter((c) => !c.gap).length, soon = all.length - ready;
      const n = ready ? `${ready} ${plural(ready, 'задание', 'задания', 'заданий')}` : soon ? 'скоро' : '—';
      return `<button type="button" class="kd-verb" data-kd-verb="${v.id}" aria-pressed="${v.id === verb}"${all.length ? '' : ' disabled'}>${svg(v.id)}<span><b>${esc(v.title)}</b><small>${esc(v.hint)}</small></span><span class="kd-vn">${n}</span></button>`;
    }).join('');
    const f = byId(a.first);
    q('kd-first').innerHTML = f ? card(f, true) : '';
    q('kd-note').textContent = a.note;
  }
  function renderDeck() {
    const box = document.getElementById('kd-deck');
    if (!box) return;
    const v = K.verbs.find((x) => x.id === verb);
    const list = CARDS.filter((c) => c.v === verb && inAud(c)).sort((x, y) => (!!x.gap - !!y.gap) || (!!x.review - !!y.review) || x.m - y.m);
    box.innerHTML = `<div class="v6-sec-head is-split"><div><h2 class="v6-h2">${esc(v.title)}</h2><p>${esc(A().tab)} · ${esc(v.hint)}</p></div>
      ${aud === 'work' ? `<div class="kd-filters">${WORKROLES.map(([k, n]) => `<button type="button" data-kd-wrole="${k}" aria-pressed="${k === wrole}">${n}</button>`).join('')}</div>` : ''}</div>
      <div class="kd-grid">${list.length ? list.map((c) => `<div>${card(c)}</div>`).join('') + backs(list.length) : '<p class="v6-lead">Для этой аудитории здесь пока нет карт.</p>'}</div>`;
  }
  // Рубашки добирают неполный ряд: «вся колода аудитории» ведёт в каталог с фильтром, «другое действие» — к выбору действий (26.11)
  const BACK_ART = { self: 'role-self', teacher: 'role-teacher', student: 'role-student', work: 'role-specialist' };
  function backs(n) {
    const k = n >= 4 ? (4 - n % 4) % 4 : 4 - n, a = A();
    if (!k) return '';
    const all = CARDS.filter((c) => !c.gap && inAud(c)).length;
    const others = K.verbs.filter((v) => v.id !== verb && CARDS.some((c) => c.v === v.id && !c.gap && inAud(c))).map((v) => v.title);
    const one = `<div><a class="kd-cb" href="#tasks" data-kd-all="${esc(aud)}"><b>Вся колода: ${esc(a.tab.toLowerCase())}</b><img src="v6/art/${BACK_ART[aud] || 'home-deck'}.webp" alt="" loading="lazy"><span>${all} ${plural(all, 'задание', 'задания', 'заданий')}</span></a></div>`;
    const two = others.length ? `<div><button type="button" class="kd-cb" data-kd-pick="1"><b>Другое действие</b><img src="v6/art/home-deck.webp" alt="" loading="lazy"><span>${esc(others.slice(0, 4).join(' · '))}</span></button></div>` : '';
    return k >= 2 ? one + two : one;
  }
  function render() { renderHero(); renderDeck(); }

  function rest() {
    return `<section class="v6-sec" id="kd-deck"></section>`;
  }
  // Полоса «Об Артефактах» внизу главной: сквозное не мешается с колодой и обучением (26.11)
  function about() {
    return `<section class="v6-sec" id="kd-svc"></section>
      <section class="v6-sec"><div class="kd-work"><div><span class="kd-eye">Для бизнеса</span><h2>ИИ в работе компании</h2>
        <p>Обучим команду работать с ИИ на своих данных или сделаем под ключ. Ведёт Руслан Маджитов с командой.</p>
        <div class="kd-wb"><button type="button" class="is-main" data-kd-work="1">Что делаем для бизнеса</button></div></div>
        <ul><li><b>Обучение команды</b><span>Группа из 3–6 человек за 4 недели осваивает рабочие процессы с ИИ. Замер часов до и после.</span></li>
        <li><b>Дашборды и отчёты</b><span>Под ваши процессы и данные, под ключ. Пример — <a href="https://birdtold.ru/demo" target="_blank" rel="noopener" onclick="umTrack('bird-door', { from: 'home-deck' })">сервис «Птичка напела»</a>.</span></li>
        <li><b>Финмодель и юнит-экономика</b><span>P&amp;L, деньги товаров и каналов на ваших данных.</span></li>
        <li><b>Разбор бренда</b><span>Стадия бренда, слабые места и план на 90 дней.</span></li></ul></div></section>`;
  }
  function services() {
    const box = document.getElementById('kd-svc');
    if (!box || typeof fetch !== 'function') return;
    const pick = ['Алиса AI', 'ГигаЧат', 'Шедеврум', 'DeepSeek', 'Suno', 'Gamma'];
    fetch('/tools/neyroseti-bez-vpn/data.json').then((r) => r.ok ? r.json() : Promise.reject()).then((d) => {
      const rows = d.services.filter((s) => pick.includes(s.name) && s.vpn === 'yes');
      const date = new Date(d.checked).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      box.innerHTML = `<div class="v6-sec-head is-split"><div><h2 class="v6-h2">Бесплатно и без VPN</h2><p>Сервисы, в которых делаются карты. Проверяем раз в месяц: сайт открывается из России, регистрация проходит без VPN.</p></div><p>Проверено ${esc(date)}</p></div>
        <div class="kd-tbl"><table><thead><tr><th>Сервис</th><th>Что умеет</th><th>Сколько бесплатно</th></tr></thead><tbody>${rows.map((s) => `<tr><td><b>${esc(s.name)}</b><small>${esc(s.country)}</small></td><td>${(s.tasks || []).map((t) => `<span class="kd-tag">${esc(t)}</span>`).join(' ')}</td><td>${esc(s.free)}</td></tr>`).join('')}</tbody></table></div>
        <p class="kd-more"><a class="v6b is-soft" href="/tools/neyroseti-bez-vpn/">Все сервисы с источниками</a></p>`;
    }).catch(() => { box.remove(); });
  }

  function onClick(ev) {
    const t = ev.target;
    const op = t.closest('[data-kd-open]'); if (op) { if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return; ev.preventDefault(); ev.stopPropagation(); track('kd-open', { unit: op.dataset.kdOpen, aud }); V6.openUnit(op.dataset.kdOpen, 'home'); return; }
    const cp = t.closest('[data-kd-copy]'); if (cp) { ev.stopPropagation(); const c = byId(cp.dataset.kdCopy); track('kd-copy', { unit: c.id });
      const done = (txt) => { cp.textContent = txt; setTimeout(() => { cp.textContent = 'Скопировать запрос'; }, 1600); };
      try { navigator.clipboard.writeText(c.p).then(() => done('Скопировано'), () => done('Не вышло, откройте шаги')); } catch (_) { done('Не вышло, откройте шаги'); }
      return; }
    const all = t.closest('[data-kd-all]'); if (all) { ev.preventDefault(); const g = A().groups; CAT.g = g.length === 1 ? g[0] : 'all'; CAT.v = 'all'; track('kd-all', { aud }); V6.open('tasks'); return; }
    const pk = t.closest('[data-kd-pick]'); if (pk) { const h = document.getElementById('kd-verbs'); if (h) h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); return; }
    const wk = t.closest('[data-kd-work]'); if (wk) { ev.stopPropagation(); track('agency-door', { from: 'home-deck' }); V6.open('companies'); return; }
    if (t.closest('a')) return;
    if (onCat(ev)) return;
    const ob = t.closest('[data-kd-onb]');
    if (ob) { const seen = ob.dataset.kdOnb === '1'; document.documentElement.classList.toggle('kd-seen', seen); try { localStorage.setItem('kd-seen', seen ? '1' : '0'); } catch (_) {} track('kd-onb', { seen }); return; }
    const au = t.closest('[data-kd-aud]'); if (au) { aud = au.dataset.kdAud; verb = A().verb; wrole = 'all'; try { localStorage.setItem('kd-aud', aud); } catch (_) {} track('kd-aud', { aud }); render(); return; }
    const vb = t.closest('[data-kd-verb]'); if (vb && !vb.disabled) { verb = vb.dataset.kdVerb; track('kd-verb', { verb, aud }); render(); const d = document.getElementById('kd-deck'); if (d) d.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
    const wr = t.closest('[data-kd-wrole]'); if (wr) { wrole = wr.dataset.kdWrole; render(); return; }
    const c = t.closest('[data-kd-card]'); if (c) { c.classList.toggle('is-flip'); if (c.classList.contains('is-flip')) track('kd-flip', { unit: c.dataset.kdCard }); }
  }
  function onKey(ev) {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-kd-card]')) { ev.preventDefault(); ev.target.classList.toggle('is-flip'); }
  }
  let bound = false;
  // Вызывает home() после загрузки данных: заполняет первый экран и добавляет секции ниже.
  function onbNumbers(D) {
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const nu = D.units.filter((u) => Array.isArray(u.steps) && u.steps.length).length;
    set('kd-n-units', `${nu} ${plural(nu, 'задание', 'задания', 'заданий')}`);
    try {
      const nl = [...LESSONS, ...TRACK_LESSONS].filter((l) => l.content).length;
      if (nl) set('kd-n-lessons', `${nl} ${plural(nl, 'урок', 'урока', 'уроков')}`);
    } catch (_) {}
    const nm = (D.paths.trails || []).length; set('kd-n-minis', `${nm} ${plural(nm, 'мини-курс', 'мини-курса', 'мини-курсов')}`);
    set('kd-n-fw', `${D.fw.length} ${plural(D.fw.length, 'метод', 'метода', 'методов')}`);
    fetch('v6/data/dictionary.json').then((r) => r.ok ? r.json() : null).then((d) => { if (d && d.terms) set('kd-n-terms', `${d.terms.length} ${plural(d.terms.length, 'термин', 'термина', 'терминов')}`); }).catch(() => {});
  }
  function mount(D, restBox, aboutBox) {
    onbNumbers(D);
    build(D);
    if (restBox) restBox.insertAdjacentHTML('afterbegin', rest());
    if (aboutBox) aboutBox.insertAdjacentHTML('afterbegin', about());
    render();
    services();
    if (!bound) { document.addEventListener('click', onClick); document.addEventListener('keydown', onKey); bound = true; }
  }
  // ---------- Каталог «Решений»: поиск и фильтры «для кого» и «что сделать» (прототип модели 25.11) ----------
  const CAT = { g: 'all', v: 'all', q: '', soon: false };
  const pl = (n, a, b, c) => { const x = n % 10, y = n % 100; return x === 1 && y !== 11 ? a : x >= 2 && x <= 4 && (y < 12 || y > 14) ? b : c; };
  let CAT_GROUPS = [];
  function catList() {
    const box = document.getElementById('kd-cat-list'); if (!box) return;
    const q = CAT.q.trim().toLowerCase();
    const items = CARDS.filter((c) => (CAT.soon || !c.gap) && (CAT.g === 'all' || c.grp === CAT.g) && (CAT.v === 'all' || c.v === CAT.v) && (!q || (c.t + ' ' + (c.r || '')).toLowerCase().includes(q)))
      .sort((x, y) => (!!x.gap - !!y.gap) || (!!x.review - !!y.review) || ((x.m || 99) - (y.m || 99)));
    const ready = items.filter((c) => !c.gap).length;
    const gname = (id) => (CAT_GROUPS.find((g) => g.id === id) || {}).t || '';
    document.getElementById('kd-cat-found').textContent = ready ? `Найдено ${ready} ${pl(ready, 'задание', 'задания', 'заданий')}` : 'Ничего не нашлось. Попробуйте другое слово или сбросьте фильтры';
    box.innerHTML = items.map((c) => c.gap
      ? `<div class="kd-row is-soon"><b>${esc(c.t)}<span class="kd-tag is-o">${esc(gname(c.grp))}</span></b><span class="kd-row-r">${esc(c.r)}</span><span class="kd-row-m">скоро</span></div>`
      : `<a class="kd-row" href="#unit-${esc(c.id)}" data-kd-open="${esc(c.id)}"><b>${esc(c.t)}${c.review ? '<span class="kd-tag is-o">черновик</span>' : ''}<span class="kd-tag is-o">${esc(gname(c.grp))}</span></b><span class="kd-row-r">${esc(c.r)}</span><span class="kd-row-m">${c.m}<small>мин</small></span></a>`).join('');
  }
  function catChips() {
    const chip = (k, v, t) => `<button type="button" data-kd-cat="${k}" data-v="${esc(v)}" aria-pressed="${CAT[k] === v}">${esc(t)}</button>`;
    document.getElementById('kd-cat-g').innerHTML = chip('g', 'all', 'Все') + CAT_GROUPS.map((g) => chip('g', g.id, g.t)).join('');
    document.getElementById('kd-cat-v').innerHTML = chip('v', 'all', 'Всё') + K.verbs.map((x) => chip('v', x.id, x.title)).join('');
  }
  // tasksPage() в v6.js рисует первый экран с поиском (#v6-ask-t) и зовёт catalog().
  function catalog(D, box, field) {
    build(D);
    const ORDER = ['ai', 'self', 'teacher', 'student', 'marketing', 'product', 'seller'];
    CAT_GROUPS = ORDER.map((id) => D.groups.find((g) => g.id === id)).filter(Boolean).map((g) => ({ id: g.id, t: g.title }));
    box.innerHTML = `<div class="kd-fl"><span class="kd-fl-l">Для кого</span><div class="kd-chiprow" id="kd-cat-g"></div></div>
      <div class="kd-fl"><span class="kd-fl-l">Что сделать</span><div class="kd-chiprow" id="kd-cat-v"></div></div>
      <div class="kd-found"><span id="kd-cat-found"></span>${K.soon.length ? `<label><input type="checkbox" id="kd-cat-soon"${CAT.soon ? ' checked' : ''}> показать, что скоро</label>` : ''}</div>
      <div class="kd-rows" id="kd-cat-list"></div>`;
    catChips(); catList();
    if (document.getElementById('kd-cat-soon')) document.getElementById('kd-cat-soon').onchange = (ev) => { CAT.soon = ev.target.checked; catList(); };
    if (field) { field.value = CAT.q; field.addEventListener('input', () => { CAT.q = field.value; catList(); }); }
    if (!bound) { document.addEventListener('click', onClick); document.addEventListener('keydown', onKey); bound = true; }
  }
  function onCat(ev) {
    const b = ev.target.closest('[data-kd-cat]'); if (!b) return false;
    CAT[b.dataset.kdCat] = b.dataset.v; track('kd-cat', { k: b.dataset.kdCat, v: b.dataset.v }); catChips(); catList(); return true;
  }
  window.Koloda = { mount, catalog };
})();
