// Колода решений на главной (v6-brief/research/wordstat-2026-11-24, прототип glavnaya.html).
// Данные: v6/data/koloda.json (действия, аудитории, слоты «скоро») + units.json и tasks.json через V6.kdata().
// Первый экран (#kd-hero) лежит в разметке дважды: #v6-prehero в index.html и home() в v6.js — править вместе.
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const track = (n, d) => { try { umTrack(n, d); } catch (_) {} };
  const ROLE = { ai: 'Для себя', self: 'Для себя', seller: 'Продавцу', marketing: 'Маркетологу', product: 'Продакту', teacher: 'Учителю', student: 'Учиться с ИИ' };
  const WORKROLES = [['all', 'Все'], ['seller', 'Продавцу'], ['marketing', 'Маркетологу'], ['product', 'Продакту']];
  const ICON = {
    write: '<path d="M5 22 20 7l3 3-15 15H5z" fill="currentColor"/>',
    count: '<rect x="4" y="4" width="22" height="22" rx="5" fill="currentColor"/><path d="M10 15h10M15 10v10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
    find: '<circle cx="13" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="m19 19 6 6" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
    invent: '<path d="M15 3l3.4 7.6L26 12l-6 5.4L21.6 26 15 21.8 8.4 26 10 17.4 4 12l7.6-1.4z" fill="currentColor"/>',
    decide: '<path d="M15 3 27 15 15 27 3 15z" fill="currentColor"/>',
    show: '<rect x="3" y="6" width="24" height="16" rx="3" fill="currentColor"/><path d="M15 22v5M10 27h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    delegate: '<circle cx="15" cy="15" r="11" fill="currentColor"/><path d="M10 15h10m-4-4 4 4-4 4" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 30 30" aria-hidden="true" focusable="false">${ICON[k] || ''}</svg>`;

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
    return `<div class="kd-card${big ? ' is-big' : ''}" data-kd-card="${esc(c.id)}" role="button" tabindex="0" aria-label="${esc(c.t)}, ${c.m} минут. Перевернуть карту">
      <div class="kd-in"><div class="kd-face kd-front">
        <div class="kd-row"><span class="kd-min">${c.m}<small>мин</small></span><span class="kd-chips">${c.review ? '<span class="kd-chip is-o">черновик</span>' : ''}${c.nv ? '<span class="kd-chip">без VPN</span>' : ''}<span class="kd-chip is-o">${esc(ROLE[c.grp] || '')}</span></span></div>
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
      const n = all.length ? (ready ? ready + (soon ? ` + ${soon}` : '') : `${soon} скоро`) : '—';
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
      <div class="kd-grid">${list.length ? list.map((c) => `<div>${card(c)}</div>`).join('') : '<p class="v6-lead">Для этой аудитории здесь пока нет карт.</p>'}</div>`;
  }
  function render() { renderHero(); renderDeck(); }

  function rest() {
    return `<section class="v6-sec" id="kd-deck"></section>
      <section class="v6-sec"><div class="v6-sec-head is-split"><h2 class="v6-h2">Как это работает</h2><p>Без регистрации и без оплаты. Всё, что вы делаете, остаётся у вас.</p></div>
        <div class="kd-steps"><div><span>1</span><h3>Вытяните карту</h3><p>Выберите действие и карту под свою задачу. На ней сказано, что получится и за сколько минут.</p></div>
        <div><span>2</span><h3>Сделайте на своих данных</h3><p>Шаги, готовый запрос и сервис, который работает без VPN. Подставляете своё.</p></div>
        <div><span>3</span><h3>Проверьте по списку</h3><p>Перед тем как отправить или показать, пройдите проверку с карты: факты, цифры, тон.</p></div></div></section>
      <section class="v6-sec" id="kd-svc"></section>
      <section class="v6-sec"><div class="kd-work"><div><span class="kd-eye">Для работы · пилот</span><h2>Отдел маркетплейсов на ИИ за 4 недели</h2>
        <p>Группа из 3–6 человек проходит путь продавца на своих товарах. Через месяц у отдела три рабочих процесса с ИИ и замер, сколько часов они возвращают.</p>
        <p>Ведёт Руслан Маджитов с командой.</p><div class="kd-price">от 45 000 ₽<small>за группу</small></div>
        <div class="kd-wb"><button type="button" class="is-main" data-kd-work="1">Как устроен пилот</button></div></div>
        <ul><li><b>Своими силами, бесплатно</b><span>Отправьте команде ссылку на колоду «Для работы». Каждый проходит карты сам.</span></li>
        <li><b>Пилот с замером</b><span>Старт 90 минут, три встречи по 60 минут, чат группы. Данные остаются у вас.</span></li>
        <li><b>Под ключ</b><span>Отчёты и автоматизации под ваши процессы. Пример — <a href="https://birdtold.ru/demo" target="_blank" rel="noopener" onclick="umTrack('bird-door', { from: 'home-deck' })">сервис «Птичка напела»</a>.</span></li></ul></div></section>`;
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
        <p class="kd-more"><a class="v6b is-soft" href="/tools/neyroseti-bez-vpn/">Все ${d.services.length} сервисов с источниками</a></p>`;
    }).catch(() => { box.remove(); });
  }

  function onClick(ev) {
    const t = ev.target;
    const op = t.closest('[data-kd-open]'); if (op) { if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return; ev.preventDefault(); ev.stopPropagation(); track('kd-open', { unit: op.dataset.kdOpen, aud }); V6.openUnit(op.dataset.kdOpen, 'home'); return; }
    const cp = t.closest('[data-kd-copy]'); if (cp) { ev.stopPropagation(); const c = byId(cp.dataset.kdCopy); track('kd-copy', { unit: c.id });
      const done = (txt) => { cp.textContent = txt; setTimeout(() => { cp.textContent = 'Скопировать запрос'; }, 1600); };
      try { navigator.clipboard.writeText(c.p).then(() => done('Скопировано'), () => done('Не вышло, откройте шаги')); } catch (_) { done('Не вышло, откройте шаги'); }
      return; }
    const wk = t.closest('[data-kd-work]'); if (wk) { ev.stopPropagation(); track('agency-door', { from: 'home-deck' }); V6.open('companies'); return; }
    if (t.closest('a')) return;
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
  function mount(D, restBox) {
    build(D);
    if (restBox) restBox.insertAdjacentHTML('afterbegin', rest());
    render();
    services();
    if (!bound) { document.addEventListener('click', onClick); document.addEventListener('keydown', onKey); bound = true; }
  }
  window.Koloda = { mount };
})();
