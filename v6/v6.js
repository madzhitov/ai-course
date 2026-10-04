/* Артефакты v6 · этап 1а — каркас, главная A–F, роли, задачи, Пути, Знания.
   Бриф и данные: v6-brief/ (родительский репозиторий). Данные сайта — site/v6/data/*.json.
   Подхватывает функции index.html (LESSONS, findLesson, isCompleted, resumeLesson, openLesson,
   aleshaToggle, umTrack, CHANGELOG …) только в момент вызова. V6.install() зовётся из index.html
   после основного скрипта и до разбора адреса. */
(function () {
  'use strict';
  const KEY = { role: 'v6-role', channels: 'v6-channels', last: 'v6-last-visit', units: 'v6-units', notes: 'v6-notes', dates: 'v6-done-dates', tgOffer: 'v6-tg-offer', checks: 'v6-checks' };
  const jget = (k) => { try { return JSON.parse(ls.get(k) || '{}') || {}; } catch (_) { return {}; } };
  const jset = (k, v) => ls.set(k, JSON.stringify(v));
  const LONG_AWAY_DAYS = 21;
  const COMPANIES_URL = 'https://madzhitov.ru';
  const CHEV = '<svg class="v6-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* приватный режим */ } },
  };
  const e = (s) => esc(s == null ? '' : s);
  const track = (n, d) => { try { umTrack(n, d || {}); } catch (_) {} };
  const lessonArg = (id) => /^\d+$/.test(String(id)) ? String(id) : `'${id}'`;
  const lessonOf = (id) => findLesson(/^\d+$/.test(String(id)) ? Number(id) : String(id));
  const done = (id) => isCompleted(/^\d+$/.test(String(id)) ? Number(id) : String(id));
  const mins = (id) => { const l = lessonOf(id); return l && l.duration ? `${l.duration} мин` : ''; };
  // порядок уроков роли: сначала без кода (данные roles.json идут по номерам, не по смыслу)
  const RANK = { e: 0, i: 1, c: 2, p: 4 };
  const rank = (id) => /^\d+$/.test(String(id)) ? 3 : (RANK[String(id)[0]] ?? 5);
  const byNoCode = (ids) => [...ids].sort((a, b) => rank(a) - rank(b));
  const anyProgress = () => Object.keys(progress || {}).some((k) => progress[k] === true);

  // строка списка как в макете: номер · название · справа счётчик/статус; кликается вся строка
  function rowList(items) {
    return `<div class="v6-list">${items.map((it) => {
      const inner = `<span class="n">${e(it.n)}</span><span class="t">${e(it.t)}</span><span class="c">${e(it.c || '')}</span>`;
      return it.on ? `<a class="v6-li${it.now ? ' is-now' : ''}${it.done ? ' is-done' : ''}" href="#" onclick="${it.on}; return false;">${inner}</a>`
        : `<span class="v6-li is-off">${inner}</span>`;
    }).join('')}</div>`;
  }
  const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
  // иллюстрации v2.1 (3D, фон #F3F4F7) — WebP; ещё не перерисованные — старые SVG (v6-brief/illustrations/handoff-2026-10-04)
  const ART_WEBP = new Set(['icon-roli', 'icon-zadachi', 'icon-puti', 'icon-znaniya', 'icon-kompanii', 'paths-hero', 'knowledge', 'task', 'fw-card',
    'main-path', 'seller-path', 'product-path', 'marketing-path', 'role-seller', 'role-creator', 'role-self', 'role-product', 'role-project', 'role-marketing', 'role-specialist']);
  const artSrc = (name) => `v6/art/${name}.${ART_WEBP.has(name) ? 'webp' : 'svg'}`;
  const art = (name, cls) => `<div class="v6-art${cls ? ' ' + cls : ''}" aria-hidden="true"><img src="${artSrc(name)}" alt="" loading="lazy"></div>`;

  // ---------- данные ----------
  let D = null, loading = null;
  function load() {
    if (D) return Promise.resolve(D);
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
    if (!loading) {
      const get = (f) => fetch(`v6/data/${f}.json`).then((r) => r.ok ? r.json() : Promise.reject(new Error(f + ' ' + r.status)));
      loading = Promise.all(['roles', 'paths', 'tasks', 'units', 'resources', 'frameworks'].map(get)).then(([roles, paths, tasks, units, resources, frameworks]) => {
        const allTasks = {};
        tasks.groups.forEach((g) => (g.directions || []).forEach((d) => (d.tasks || []).forEach((t) => {
          allTasks[t.id] = Object.assign({ group: g.id, direction: d }, t);
        })));
        const unitTask = (ref) => (units.units.find((u) => u.id === ref) || {}).task;
        paths.rolePaths.forEach((rp) => (rp.stages || []).forEach((st) => {
          st.tasks = [...new Set((st.steps || []).filter((x) => x.kind === 'unit').map((x) => unitTask(x.ref)).filter(Boolean))];
        }));
        D = { roles: roles.roles, paths, groups: tasks.groups, units: units.units, tasks: allTasks, resources: resources.resources, fw: frameworks.cards };
        return D;
      }).catch((err) => { loading = null; throw err; });
    }
    return loading;
  }
  const role = (id) => D.roles.find((r) => r.id === id);
  const unitsOf = (taskId) => D.units.filter((u) => u.task === taskId);
  // задача «сделана» в 1а = пройден урок-основа хотя бы одного способа (юниты появятся на этапе 2)
  const taskDone = (taskId) => unitsOf(taskId).some((u) => (jget(KEY.units)[u.id] || {}).result === 'yes' || (u.fromLesson && done(u.fromLesson)));
  const taskReady = (taskId) => unitsOf(taskId).some((u) => u.status === 'from-lesson' || u.status === 'ready');
  const taskMins = (taskId) => { const u = unitsOf(taskId).find((x) => x.minutes); return u ? `${u.minutes} мин` : ''; };

  const unitById = (id) => D.units.find((u) => u.id === id);
  const stepDone = (st) => { const u = st.kind === 'unit' && unitById(st.ref); return !!(u && ((jget(KEY.units)[u.id] || {}).result === 'yes' || (u.fromLesson && done(u.fromLesson)))); };
  const stepGo = (st) => {
    if (st.kind === 'page' && st.ref === 'neyroseti-bez-vpn') return "location.href='/tools/neyroseti-bez-vpn/'";
    const u = st.kind === 'unit' && unitById(st.ref);
    if (hasSteps(u)) return `V6.openUnit('${u.id}','path')`;
    if (u && u.fromLesson && lessonOf(u.fromLesson) && lessonOf(u.fromLesson).content) return `V6.openTask('${u.task}','seller-path')`;
    if (st.kind === 'framework' && fwById(st.ref)) return `V6.openFw('${st.ref}','path')`;
    return null;
  };

  // ---------- фреймворки (v6-brief/frameworks: каталог 79 карточек, полные — full: true) ----------
  const fwById = (id) => D.fw.find((c) => c.id === id);
  const EXEC = ['промпт', 'инструмент', 'калькулятор', 'шаблон', 'чек-лист'];
  const GROUP_T = { 'E-commerce и селлер (авторский блок)': 'E-commerce и селлер', 'ИИ-практика: четыре книги': 'ИИ-практика' };
  const AI_ROLES = ['creator', 'self', 'specialist'];
  const fwSort = (a, b) => (!!b.full - !!a.full) || ((a.firstWaveOrder || 99) - (b.firstWaveOrder || 99)) || a.title.localeCompare(b.title, 'ru');
  const roleName = (id) => id === 'all' ? 'Все роли' : ((role(id) || {}).title || id);
  // сначала методы из задач самой роли (у продакта — product.*, а не маркетинговые из первой волны)
  const fwOfRole = (rid) => {
    const grp = (role(rid) || {}).taskGroup;
    const own = (c) => (grp && c.task && c.task.startsWith(grp + '.') ? 0 : 1);
    return D.fw.filter((c) => (c.roles || []).includes(rid) || (AI_ROLES.includes(rid) && (c.roles || []).includes('all'))).sort((a, b) => own(a) - own(b) || fwSort(a, b));
  };
  const fwOfTask = (t) => D.fw.filter((c) => c.task === t.id || c.task === t.direction.id || (c.tasks || []).includes(t.id) || (c.alsoIn || []).includes(t.direction.id)).sort(fwSort);
  const fwTags = (c) => `<span class="v6-tags">${c.label ? `<span class="v6t${c.label === 'авторский' ? '' : ' is-grey'}">${e(c.label)}</span>` : ''}${EXEC.includes(c.executorHint) || (c.executor && c.executor.kind) ? `<span class="v6t is-grey">${e(c.executor ? { calculator: 'калькулятор', prompt: 'промпт' }[c.executor.kind] || c.executorHint : c.executorHint)}</span>` : ''}</span>`;
  function fwTile(c, from) {
    const req = (c.requires || []).map(fwById).filter(Boolean)[0];
    return `<a class="v6-fw" href="#fw-${e(c.id)}" onclick="V6.openFw('${e(c.id)}','${from}'); return false;">${fwTags(c)}<span class="v6-fw-t">${e(c.title)}</span><span class="v6-fw-p">${e(c.solves)}</span>
      <span class="v6-fw-m"><span>${(c.roles || []).map(roleName).map(e).join(' · ')}</span>${req ? `<span class="s">сначала: ${e(req.title)}</span>` : ''}${c.full ? '' : '<span class="s">карточка пишется</span>'}</span></a>`;
  }
  const fwGrid = (cards, from) => `<div class="v6-fwgrid">${cards.map((c) => fwTile(c, from)).join('')}</div>`;
  function methodsBlock(rid, title) {
    const cards = fwOfRole(rid);
    if (!cards.length) return '';
    return `<section class="v6-sec"><div class="v6-sec-head is-split"><h2 class="v6-h2">${title || 'Методы роли'}</h2><a class="v6-more" href="#knowledge" onclick="V6.openKnowledge('${AI_ROLES.includes(rid) ? 'all' : rid}'); return false;">Все фреймворки роли · ${cards.length} →</a></div>${fwGrid(cards.slice(0, 4), 'role')}</section>`;
  }
  const plural = (n, a, b, c) => { const x = n % 10, y = n % 100; return x === 1 && y !== 11 ? a : x >= 2 && x <= 4 && (y < 12 || y > 14) ? b : c; };
  const RES_KIND = { template: 'шаблон', checklist: 'чек-лист', calculator: 'калькулятор', tool: 'инструмент', 'prompt-set': 'промпты' };
  const STEP_KIND = { unit: 'юнит', framework: 'фреймворк', page: 'страница' };

  // ---------- каркас ----------
  function setPage(on, active) {
    document.body.classList.toggle('v6', on);
    document.querySelectorAll('.v6h-nav a').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === active));
    closeMenu();
  }
  function shell(html) {
    const el = document.getElementById('lesson-content');
    el.innerHTML = `<div class="v6-page">${html}</div>`;
    window.scrollTo({ top: 0 });
    return el;
  }
  function fail(slotId) {
    const s = document.getElementById(slotId);
    if (s) s.innerHTML = '<p class="v6-lead">Не удалось загрузить данные. Обновите страницу.</p>';
  }
  function go(hash, render, active) {
    currentLessonId = null;
    try { aleshaHide(); } catch (_) {}
    try { closeSidebar(); } catch (_) {}
    setPage(true, active);
    // страница не перезагружается: ссылка шапки или меню остаётся в фокусе и рисует рамку — снимаем
    const fa = document.activeElement;
    if (fa && fa.closest && fa.closest('.v6h, #v6-menu')) fa.blur();
    history.replaceState(null, '', '#' + hash);
    render();
  }
  function toggleMenu() {
    if (!document.body.classList.contains('v6') && typeof toggleSidebar === 'function') { toggleSidebar(); return; }
    const m = document.getElementById('v6-menu'), b = document.getElementById('v6-burger');
    const open = !m.classList.contains('is-open');
    m.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', open);
  }
  function closeMenu() {
    const m = document.getElementById('v6-menu'), b = document.getElementById('v6-burger');
    if (m) m.classList.remove('is-open');
    if (b) b.setAttribute('aria-expanded', 'false');
  }

  function footer() {
    const f = document.getElementById('site-footer');
    if (!f) return;
    f.className = 'site-footer v6 v6f';
    const a = (on, t) => `<li><a onclick="${on}; return false;" href="#">${t}</a></li>`;
    f.innerHTML = `<div class="v6f-in">
        <div><svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 895 740" class="v6f-mark" aria-hidden="true" focusable="false"><g transform="translate(0 700) scale(1 -1)" fill="currentColor"><path d="M7.2 0 L319.3 700 L479.5 700 L792.1 0 L622.9 0 L366.1 617.6 L430.4 617.6 L173.6 0 Z"/><path d="M163.9 149.8 L206.4 272.7 L855 272.7 L800 149.8 Z"/></g></svg>
<div class="v6f-word">Артефакты,<br>а не сертификаты.</div></div>
        <div><p class="v6f-h">Платформа</p><ul>${a("V6.open('roles')", 'Роли')}${a("V6.open('tasks')", 'Задачи')}${a("V6.open('paths')", 'Пути')}${a("V6.open('knowledge')", 'Знания')}</ul></div>
        <div><p class="v6f-h">О проекте</p><ul>${a("openStaticPage('about')", 'Что это')}${a("openStaticPage('howto')", 'Как заниматься')}${a("openStaticPage('changelog')", 'Что нового')}${a("openStaticPage('resources')", 'Источники')}</ul></div>
        <div><p class="v6f-h">Помощь</p><ul>${a("openStaticPage('faq')", 'FAQ')}${a('openGlossary()', 'Глоссарий')}<li><a href="/tools/neyroseti-bez-vpn/">Нейросети без VPN</a></li></ul></div>
      </div>
      <div class="v6f-bottom"><span>Собирает <a href="https://madzhitov.ru" target="_blank" rel="noopener">Руслан Маджитов</a> · <a href="https://t.me/artefakty_ai" target="_blank" rel="noopener" onclick="umTrack('tg-click', { from: 'footer' })">@artefakty_ai</a></span>
      <a href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'footer' })">Для компаний →</a></div>`;
  }

  // ---------- подбор задачи (поиск, без вызова модели) ----------
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]+/g, ' '); }
  function stems(s) { return norm(s).split(/\s+/).filter((w) => w.length > 2).map((w) => w.length > 5 ? w.slice(0, w.length - 2) : w); }
  function ask(formEl) {
    const input = formEl.querySelector('input');
    const q = input.value.trim();
    const out = formEl.parentNode.querySelector('.v6-results');
    if (!q) { input.focus(); return false; }
    track('task-ask', { length: q.length });
    const qs = stems(q);
    const score = (title) => { const t = norm(title); return qs.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0); };
    const items = [];
    Object.values(D.tasks).forEach((t) => { if (t.group === 'seller' && t.status !== 'soon') items.push({ s: score(t.title) + 0.5, html: `<button type="button" onclick="V6.openTask('${e(t.id)}','search')"><span>${e(t.title)}</span><span class="v6t is-sm">задача</span></button>` }); });
    [...LESSONS, ...TRACK_LESSONS].filter((l) => l.content).forEach((l) => items.push({ s: score(l.title), html: `<button type="button" onclick="openLesson(${lessonArg(l.id)})"><span>${e(l.title)}</span><span class="v6-meta">урок ${e(l.id)}</span></button>` }));
    const hits = items.filter((x) => x.s >= 1).sort((a, b) => b.s - a.s).slice(0, 6);
    out.hidden = false;
    out.innerHTML = hits.length ? hits.map((x) => x.html).join('')
      : `<p>Готового пока не нашлось.</p><button type="button" onclick="aleshaToggle()"><span>Спросить Алёшу</span>${CHEV}</button>`;
    track('search', { results: hits.length ? '1+' : '0' });
    return false;
  }
  const askForm = (id) => `<form class="v6-ask" onsubmit="return V6.ask(this)" role="search">
      <label for="${id}">Опишите задачу</label>
      <input id="${id}" type="text" placeholder="Опишите задачу своими словами" autocomplete="off">
      <button class="v6b" type="submit">Подобрать</button>
    </form><div class="v6-results" hidden aria-live="polite"></div>`;

  function chips() {
    const c = [
      ['Ответить на отзывы', taskMins('seller.customers.reviews'), "V6.openTask('seller.customers.reviews','home')"],
      ['Резюме под вакансию', mins('e5'), "openLesson('e5')"],
      ['Разобрать договор', mins('e10'), "openLesson('e10')"],
      ['Бот за час', mins('p1'), "openLesson('p1')"],
    ];
    return `<div class="v6-chips">${c.map(([t, m, on]) => `<button type="button" class="v6-chip" onclick="${on}">${t}${m ? ` <span>${m}</span>` : ''}</button>`).join('')}</div>`;
  }

const roleThumb = (id) => { const n = 'role-' + id; return ART_WEBP.has(n) ? `<span class="v6-role-thumb" aria-hidden="true"><img src="${artSrc(n)}" alt="" loading="lazy"></span>` : '<span class="v6-role-thumb is-empty" aria-hidden="true"></span>'; };
  function whoRows(limit) {
    const pick = limit ? ['seller', 'creator', 'self', 'product'] : D.roles.map((r) => r.id);
    return pick.map((id) => {
      const r = role(id);
      const title = (limit && id === 'product') ? 'Продакт или проджект' : r.title;
      return `<button type="button" class="v6-role-row has-thumb" onclick="V6.chooseRole('${r.id}','home')">${roleThumb(r.id)}<span><b>${e(title)}${r.isNew ? ' <span class="v6t is-sm">новое</span>' : ''}</b><small>${e(r.description)}</small></span>${CHEV}</button>`;
    }).join('');
  }

  // ---------- состояния главной (ia/states.md) ----------
  let prevVisit = null;
  function homeState() {
    const any = anyProgress();
    const r = ls.get(KEY.role);
    const away = prevVisit ? (Date.now() - new Date(prevVisit).getTime()) / 864e5 : 0;
    const startDone = [1, 2, 3, 4, 5].every((n) => done(n));
    const beyond = LESSONS.some((l) => l.id > 5 && done(l.id)) || TRACK_LESSONS.some((l) => done(l.id));
    if (any && away > LONG_AWAY_DAYS) return 'E';
    if (r) return 'D';
    if (startDone && !beyond) return 'C';
    if (any) return 'B';
    return 'A';
  }

  function resume() {
    const l = resumeLesson();
    return l || lessonOf(1);
  }
  const resumeLabel = (l) => typeof l.id === 'number' ? `Урок ${l.id}. ${l.title}` : l.title;

  function nextSellerTask() {
    const stages = (D.paths.rolePaths.find((p) => p.role === 'seller') || { stages: [] }).stages;
    for (const st of stages) for (const id of st.tasks) if (!taskDone(id) && taskReady(id)) return D.tasks[id];
    return null;
  }

  function pathsBlock() {
    const lv = D.paths.main.levels;
    const cs = D.paths.main.commonStart.lessons;
    const cnt = (ids) => `${ids.filter(done).length}/${ids.length}`;
    const r = resume();
    const curIn = (ids) => ids.map(String).includes(String(r.id));
    const mainRow = (n, title, ids) => ({ n, t: title, c: (curIn(ids) ? 'сейчас · ' : '') + cnt(ids), now: curIn(ids), on: "V6.open('paths')" });
    const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
    const stageCnt = (st) => `${st.steps.filter(stepDone).length}/${st.steps.length}`;
    const card = (img, label, title, rows, foot) => `<article class="v6-pcard">${art(img)}<div class="v6-pcard-in"><span class="v6-pcard-label">${label}</span><h3>${e(title)}</h3>${rowList(rows)}<span class="v6-pcard-foot">${foot}</span></div></article>`;
    const dataCard = (key, fn) => { const x = dataPath(key); return card(x.art, x.label, x.title, x.stages.map((st, i) => ({ n: ROMAN[i] + '.', t: st.title, c: `${st.tasks.filter((t) => taskReady(t.id)).length}/${st.tasks.length}`, on: `V6.${fn}('home')` })), 'собирается · готовые задачи этапа'); };
    return `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Пути</h2><p>Общий старт для всех, потом каждый идёт своей дорогой: главный путь или путь своей роли.</p></div>
      <div class="v6-pathgrid">
        ${card('main-path', 'Для всех', D.paths.main.title, [mainRow('I.', 'Общий старт · база ИИ', cs), mainRow('II.', lv[0].title, lv[0].lessons), mainRow('III.', lv[1].title, lv[1].lessons)], `${lv.length} уровня · каждый замыкается Вехой`)}
        ${card('seller-path', 'Продаю онлайн', sp.title, sp.stages.map((st, i) => ({ n: ROMAN[i] + '.', t: st.title, c: stageCnt(st), on: "V6.openSellerPath('home')" })), `${sp.stages.length} этапа · ${sp.stages.filter((x) => x.milestone).length} Вехи`)}
        ${dataCard('product', 'openProductPath')}
        ${dataCard('marketing', 'openMarketingPath')}
      </div></section>`;
  }

  function oftenBlock() {
    const rv = D.tasks['seller.customers.reviews'];
    const ru = unitsOf(rv.id).find((u) => u.result) || {};
    const e5 = lessonOf('e5'), p1 = lessonOf('p1');
    const card = (title, text, tags, on) => `<div class="v6-task"><h3>${e(title)}</h3><p>${e(text)}</p><div class="v6-tags">${tags.map((t) => `<span class="v6t">${e(t)}</span>`).join('')}</div><button class="v6b is-soft v6-task-btn" onclick="${on}">Открыть задачу</button></div>`;
    return `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Часто делают</h2><button class="v6-link" onclick="V6.open('tasks')">Все задачи →</button></div>
      <div class="v6-grid3">
        ${card('Ответить на отзывы пачкой', ru.result || '', ['Продаю онлайн', taskMins(rv.id), ru.noVpn ? 'без VPN' : ''].filter(Boolean), "V6.openTask('seller.customers.reviews','home')")}
        ${card('Подготовить резюме под вакансию', e5 ? e5.title : '', ['Для себя', mins('e5')].filter(Boolean), "openLesson('e5')")}
        ${card('Собрать Telegram-бота за час', p1 ? p1.title : '', ['Создаю на ИИ', mins('p1')].filter(Boolean), "openLesson('p1')")}
      </div></section>`;
  }

  function newsBlock(since) {
    const items = (CHANGELOG || []).filter((c) => !since || c.date > since).slice(0, since ? 5 : 3);
    if (!items.length) return '';
    return `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Что нового</h2><button class="v6-link" onclick="openStaticPage('changelog')">Все изменения →</button></div>
      <div class="v6-card"><ul class="v6-rows v6-news">${items.map((c) => `<li><span class="n" style="grid-column:span 1">${e(fmtDateRu(c.date))}</span><span style="grid-column:span 2">${e(stripEmoji(c.title))}</span></li>`).join('')}</ul></div></section>`;
  }

  const companies = () => `<section class="v6-sec"><div class="v6-dark v6-companies"><div><span class="v6-meta" style="font-size:17px;color:#C9CACF">Для компаний</span><h2 class="v6-h2" style="margin-top:16px !important">ИИ для вашей команды</h2></div>
      <div><p>Сотрудники учатся бесплатно по ролям. Агентство подключается, когда нужно обучение с ведущим или внедрение под ключ.</p><a class="v6b is-accent" href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'home' })">Обсудить задачу</a></div></div></section>`;

  const whoBlock = () => `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Кто вы?</h2><button class="v6-link" onclick="V6.open('roles')">Все роли →</button></div><div class="v6-grid2">${whoRows(false)}</div></section>`;

  function home() {
    setPage(true, null);
    const el = shell('<div class="v6c" id="v6-home"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
    load().then(() => {
      const st = homeState();
      track('home-state', { state: st });
      const r = resume();
      const lArg = lessonArg(r.id);
      let top = '', below = '';
      if (st === 'A') {
        top = `<div class="v6-hero"><div>
            <span class="v6-eyebrow">Артефакты, а не сертификаты <span>от пользователя к создателю</span></span>
            <h1 class="v6-d">Что нужно сделать сегодня?</h1>
            <p class="v6-lead">Бесплатные короткие юниты по ИИ и диджиталу. Одна задача — один готовый результат.</p>
            ${askForm('v6-ask-a')}${chips()}
            <p style="margin-top:20px"><button class="v6-quiet" onclick="openLesson(1)">Не знаю, с чего начать → общий старт, урок 1</button></p>
          </div><div class="v6-who"><h2>Кто вы?</h2>${whoRows(true)}<button class="v6-quiet" onclick="V6.open('roles')">Все роли: маркетолог, специалист, владелец бизнеса →</button></div></div>`;
        below = pathsBlock() + oftenBlock() + companies();
      } else if (st === 'B' || st === 'E') {
        const left = [1, 2, 3, 4, 5].filter((n) => !done(n)).length;
        const inStart = typeof r.id === 'number' && r.id <= 5;
        const awayWeeks = prevVisit ? Math.floor((Date.now() - new Date(prevVisit).getTime()) / 6048e5) : 0;
        const news = st === 'E' ? (CHANGELOG || []).filter((c) => c.date > String(prevVisit).slice(0, 10)).slice(0, 4) : [];
        top = `<div class="v6-hero">
            <div class="v6-dark"><span class="v6-meta">${st === 'E' ? `Вас не было ${awayWeeks} ${awayWeeks === 1 ? 'неделю' : awayWeeks < 5 ? 'недели' : 'недель'} · где вы остановились` : 'С возвращением · продолжить'}</span>
              <h2 class="v6-h2" style="margin:16px 0 !important">${e(resumeLabel(r))}</h2>
              ${inStart ? `<p>общий старт · ${left === 1 ? 'до развилки один урок' : `до развилки ${left} ${pluralUrok(left)}`}</p>` : ''}
              <button class="v6b is-accent" style="margin-top:16px" onclick="openLesson(${lArg})">Продолжить урок</button></div>
            <div>${st === 'E' && news.length ? `<h2 class="v6-h3" style="font-family:var(--font-display);font-weight:800;font-size:var(--fs-h4)">Пока вас не было, кое-что изменилось</h2><ul class="v6-rows v6-news" style="margin-top:12px">${news.map((c) => `<li><span class="n">${e(fmtDateRu(c.date))}</span><span style="grid-column:span 2">${e(stripEmoji(c.title))}</span></li>`).join('')}</ul>`
              : `<span class="v6-meta">Или что-то другое сегодня</span><h2 class="v6-h3" style="font-family:var(--font-display);font-weight:800;font-size:var(--fs-h4);margin-top:8px">Есть задача прямо сейчас?</h2>${askForm('v6-ask-b')}${chips()}`}</div>
          </div>`;
        below = whoBlock() + pathsBlock() + newsBlock() + companies();
      } else if (st === 'C') {
        top = `<div style="padding-top:56px"><span class="v6-eyebrow">Общий старт пройден · уроки 1–5</span>
            <h1 class="v6-d" style="margin-top:24px !important">Развилка. Куда дальше?</h1>
            <p class="v6-lead">База есть. Теперь выберите дорогу — её можно сменить в любой момент, пройденное не потеряется.</p>
            <div class="v6-grid3" style="margin-top:40px">
              <div class="v6-task"><span class="v6-meta">Основной путь</span><h3>Создаю на ИИ</h3><p>Дальше по основному пути: урок 6, первое приложение через API.</p><span class="v6t">Уровень 1 → Веха: ${e(D.paths.main.levels[0].milestone.title)}</span><button class="v6b is-sm" onclick="V6.fork('creator')">Идти</button></div>
              <div class="v6-task"><span class="v6-meta">Путь роли · новое</span><h3>Продаю онлайн</h3><p>Путь «От селлера к бренду»: отзывы, карточки, экономика по каналам.</p><span class="v6t">${Object.values(D.tasks).filter((t) => t.group === 'seller' && t.status !== 'soon').length} задач</span><button class="v6b is-sm" onclick="V6.fork('seller')">Идти</button></div>
              <div class="v6-task"><span class="v6-meta">Другие роли</span><h3>Другая роль</h3><p>Для себя, продакт, проджект, маркетолог, специалист, владелец бизнеса.</p><span class="v6t">уроки роли</span><button class="v6b is-sm" onclick="V6.fork('other')">Выбрать</button></div>
            </div>
            <button class="v6-note" style="margin-top:20px" onclick="aleshaToggle()"><span class="v6-ava">А</span><span>Не уверены? Расскажите, чем занимаетесь, и я подскажу дорогу.</span></button></div>`;
        below = pathsBlock() + companies();
      } else { // D
        const rr = role(ls.get(KEY.role)) || role('creator');
        let next = '', doneList = '';
        if (rr.id === 'seller') {
          const t = nextSellerTask();
          next = t ? `<span class="v6-meta">Следующая задача для вашего магазина · ${e(t.direction.title)}${taskMins(t.id) ? ' · ' + taskMins(t.id) : ''}</span><h2 class="v6-h2" style="margin:16px 0 !important">${e(t.title)}</h2><button class="v6b is-accent" onclick="V6.openTask('${e(t.id)}','home')">Начать</button>`
            : '<span class="v6-meta">Все готовые задачи роли сделаны</span><h2 class="v6-h2" style="margin:16px 0 !important">Новые задачи появятся здесь</h2>';
          const doneT = Object.values(D.tasks).filter((x) => x.group === 'seller' && taskDone(x.id));
          doneList = doneT.length ? `<h2 class="v6-h3" style="font-family:var(--font-display);font-weight:800;font-size:var(--fs-h4)">Сделано вами</h2><ul class="v6-steps" style="margin-top:8px">${doneT.map((x) => `<li class="is-done"><a onclick="V6.openTask('${e(x.id)}','home')"><span class="dot">✓</span><span>${e(x.title)}</span></a></li>`).join('')}</ul><p class="v6-meta">Прогресс хранится только в этом браузере.</p>` : '';
        } else {
          const nl = byNoCode(rr.lessons || []).map(lessonOf).find((l) => l && l.content && !done(l.id));
          next = nl ? `<span class="v6-meta">Следующий шаг · ${e(rr.title)}</span><h2 class="v6-h2" style="margin:16px 0 !important">${e(resumeLabel(nl))}</h2><button class="v6b is-accent" onclick="openLesson(${lessonArg(nl.id)})">Начать</button>`
            : `<span class="v6-meta">${e(rr.title)}</span><h2 class="v6-h2" style="margin:16px 0 !important">Готовые уроки роли пройдены</h2>`;
        }
        top = `<div style="padding-top:40px"><p class="v6-meta">${e(rr.title)} · <button class="v6-quiet" onclick="V6.open('roles')">сменить роль</button></p>
            <div class="v6-hero" style="padding-top:8px"><div class="v6-dark">${next}</div><div>${askForm('v6-ask-d')}<div style="margin-top:28px">${doneList}</div></div></div></div>`;
        below = (rr.id === 'seller' ? mapBlock() : pathsBlock()) + newsBlock() + companies();
      }
      document.getElementById('v6-home').innerHTML = top + below;
    }).catch(() => fail('v6-home'));
    return el;
  }

  // ---------- роли ----------
  function chooseRole(id, from) {
    ls.set(KEY.role, id);
    track('role-select', { role: id, from: from || 'roles' });
    openRole(id, from);
  }
  function fork(choice) {
    track('fork-choose', { choice });
    if (choice === 'creator') { ls.set(KEY.role, 'creator'); openLesson(6); }
    else if (choice === 'seller') chooseRole('seller', 'fork');
    else open('roles');
  }
  function rolesPage() {
    shell('<div class="v6c" id="v6-roles"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
    load().then(() => {
      document.getElementById('v6-roles').innerHTML = `<div class="v6-sechero"><div><h1 class="v6-d">Кто вы?</h1>
          <p class="v6-lead">Выберите роль — покажем задачи и путь под неё. Сменить можно в любой момент.</p></div>${art('icon-roli', 'v6-icon-art')}</div>
        <div class="v6-grid2" style="margin-top:40px">${D.roles.map((r) => `<button type="button" class="v6-role-row has-thumb" onclick="V6.chooseRole('${r.id}','roles')">${roleThumb(r.id)}<span><b>${e(r.title)} ${r.isNew ? '<span class="v6t is-sm">новое</span>' : r.state === 'growing' ? '<span class="v6t is-sm is-grey">роль растёт</span>' : ''}</b><small>${e(r.description)}</small></span>${CHEV}</button>`).join('')}</div>`;
    }).catch(() => fail('v6-roles'));
  }
  function mapBlock() {
    const g = D.groups.find((x) => x.id === 'seller');
    return `<section class="v6-sec"><div class="v6-sec-head is-split"><h2 class="v6-h2">Карта задач</h2><p>Восемь направлений по P&amp;L. Готовые задачи кликабельны, будущие помечены «скоро».</p></div>
      <div class="v6-dirs">${g.directions.map((d, i) => `<div class="v6-dir"><span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${e(d.title)}</h3>${d.description ? `<p>${e(d.description)}</p>` : ''}
        <div class="v6-dir-rows">${d.tasks.map((t) => t.status === 'soon' ? `<span class="v6-dr is-soon"><span>${e(t.title)}</span><span class="m">скоро</span></span>`
          : `<a class="v6-dr" href="#" onclick="V6.openTask('${e(t.id)}','role'); return false;"><span>${taskDone(t.id) ? '✓ ' : ''}${e(t.title)}</span><span class="m${taskReady(t.id) ? '' : ' is-wip'}">${taskReady(t.id) ? taskMins(t.id) : 'в работе'}</span></a>`).join('')}</div></div>`).join('')}</div></section>`;
  }
  function openRole(id, from) {
    go('role-' + id, () => {
      shell('<div class="v6c" id="v6-role"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        const r = role(id);
        if (!r) { document.getElementById('v6-role').innerHTML = '<h1 class="v6-d" style="padding-top:56px">Такой роли нет</h1>'; return; }
        const mine = ls.get(KEY.role) === id;
        const pick = mine ? '<p class="v6-meta" style="margin-top:20px">Это ваша роль · <button class="v6-quiet" onclick="V6.open(\'roles\')">сменить</button></p>'
          : `<p style="margin-top:24px"><button class="v6b" onclick="V6.chooseRole('${r.id}','role')">Это про меня</button></p>`;
        let body = '';
        if (r.id === 'seller') {
          const ch = JSON.parse(ls.get(KEY.channels) || '[]');
          const chans = ['Wildberries', 'Ozon', 'Яндекс Маркет', 'Свой сайт', 'Соцсети и Telegram'];
          const t = nextSellerTask();
          const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
          const tu = t && D.units.find((u) => u.task === t.id);
          body = `<section class="v6-phero v6-rhero"><div class="v6-phero-text"><span class="v6-eyebrow">Роль · новое</span><h1 class="v6-d">${e(r.title)}</h1>
              <p class="v6-phero-lead">Маркетплейсы и свои каналы. Задачи разложены так, как через бизнес проходят деньги.</p>
              <fieldset class="v6-chan"><legend>Где продаёте</legend><div class="v6-check">${chans.map((c) => `<label><input type="checkbox" value="${e(c)}" ${ch.includes(c) ? 'checked' : ''} onchange="V6.channels(this)">${e(c)}</label>`).join('')}</div></fieldset>${pick}</div>
              ${art('role-seller', 'v6-phero-art')}</section>
            ${t ? `<a class="v6-next v6-dark" href="#" onclick="V6.openTask('${e(t.id)}','role'); return false;"><span class="v6-next-in"><span class="v6-next-l">Следующая задача для вашего магазина</span><span class="v6-next-t">${e(t.title)}</span>${tu && tu.result ? `<span class="v6-next-p">${e(tu.result)}. ≈ ${tu.minutes} минут.</span>` : ''}</span><span class="v6b is-accent v6-btn-xl">Начать</span></a>` : ''}
            ${mapBlock()}
            ${methodsBlock('seller')}
            <section class="v6-sec"><a class="v6-rolepath v6-rolepath-lg" href="#path-seller" onclick="V6.openSellerPath('role'); return false;">${art('seller-path')}<span class="v6-rolepath-in"><span class="v6-pcard-label">Путь роли</span><span class="v6-rolepath-t">${e(sp.title)}</span><span class="v6-rolepath-p">Три этапа: ${sp.stages.map((st) => st.title.toLowerCase()).join(', ')}.</span>
              <span class="v6-tags">${sp.stages.map((st) => `<span class="v6t is-grey">${e(st.title)}</span>`).join('')}</span><span><span class="v6b is-soft v6-btn-lg">Открыть путь</span></span></span></a></section>
            <section class="v6-sec"><div class="v6-doorbox"><span>Для команд: обучим менеджеров маркетплейсов или внедрим ИИ под ключ.</span><a class="v6b is-soft v6-btn-lg" href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'role-seller' })">Для компаний</a></div></section>`;
        } else {
          const ls_ = byNoCode(r.lessons || []).map(lessonOf).filter(Boolean);
          const routes = (typeof ROUTES !== 'undefined' ? ROUTES : []).filter((x) => (r.legacyRoutes || []).includes(x.id));
          const group = r.taskGroup ? D.groups.find((g) => g.id === r.taskGroup) : null;
          const ready = ls_.filter((l) => l.content);
          body = `<div class="v6-role-hero"><div><span class="v6t ${r.state === 'growing' ? 'is-grey' : ''}">${r.state === 'growing' ? 'Роль растёт' : 'Роль'}</span><h1 class="v6-d" style="margin-top:20px !important">${e(r.title)}</h1>
              <p class="v6-lead">${e(r.description)}.</p>${pick}</div>${ART_WEBP.has('role-' + r.id) ? art('role-' + r.id, 'v6-phero-art') : '<div class="v6-ph" aria-hidden="true">[3D: объект роли]</div>'}</div>
            ${r.state === 'growing' ? `<section class="v6-sec" style="margin-top:56px"><div class="v6-card"><h2 class="v6-h3">Что уже есть и что будет</h2><p class="v6-lead" style="font-size:18px">Сейчас для этой роли ${ready.length} ${pluralUrok(ready.length)}${routes.length ? ` и ${routes.length === 1 ? 'готовый маршрут' : 'готовые маршруты'}` : ''}. Задачи и короткие юниты появятся — роль растёт.</p></div></section>` : ''}
            ${routes.length ? `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Готовые маршруты</h2></div><div class="v6-grid2">${routes.map((x) => `<div class="v6-task"><h3>${e(stripEmoji(x.title))}</h3><p>${e(x.description || '')}</p><span class="v6-meta">${e(x.meta || '')}</span><button class="v6b is-soft is-sm" onclick="${x.lessons && x.lessons.length ? `openLesson(${lessonArg(x.lessons[0])})` : `openSection('${e(x.section || 'main')}')`}">Начать маршрут</button></div>`).join('')}</div></section>` : ''}
            ${r.id === 'creator' ? `<section class="v6-sec"><div class="v6-dark v6-dark-row"><div><span class="v6-meta">Путь роли</span><h2 class="v6-h2" style="margin-top:12px !important">${e(D.paths.main.title)}</h2><p style="margin-top:12px">Общий старт из пяти уроков, потом четыре уровня. Каждый замыкается Вехой.</p></div><button class="v6b is-accent" onclick="V6.open('paths')">Открыть путь</button></div></section>`
              : `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Уроки роли</h2></div><div class="v6-card"><ul class="v6-steps">${ls_.map((l) => l.content ? `<li class="${done(l.id) ? 'is-done' : ''}"><a onclick="openLesson(${lessonArg(l.id)})"><span class="dot">${done(l.id) ? '✓' : ''}</span><span>${e(l.title)}</span><span class="v6-meta">${l.duration ? l.duration + ' мин' : ''}</span></a></li>` : `<li><span class="row"><span class="dot"></span><span class="v6-meta">${e(l.title)}</span><span class="v6-meta">пишется</span></span></li>`).join('')}</ul></div></section>`}
            ${DATA_PATHS[r.taskGroup] ? (() => { const x = dataPath(r.taskGroup); return `<section class="v6-sec"><a class="v6-next v6-dark" href="#path-${x.key}" onclick="V6.${x.key === 'product' ? 'openProductPath' : 'openMarketingPath'}('role'); return false;"><span class="v6-next-in"><span class="v6-next-l">Путь роли · собирается</span><span class="v6-next-t">${e(x.title)}</span><span class="v6-next-p">${r.id === 'project' ? 'Для проджекта главное — этапы «Приоритизация» и «Управление работой».' : x.stages.map((s_, i) => i ? s_.title.toLowerCase() : s_.title).join(', ') + '.'}</span></span><span class="v6b is-accent v6-btn-xl">Открыть путь</span></a></section>`; })() : ''}
            ${group ? `<section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">Задачи роли</h2><p>Направления и задачи уже разложены, к каждой — методы. Короткие способы решения появятся.</p></div></div><div class="v6-dirs">${group.directions.filter((d) => r.id !== 'project' || /prioritize|manage/.test(d.id)).map((d) => `<div class="v6-dir"><h3>${e(d.title)}</h3>${(d.tasks || []).map((t) => `<a class="v6-dr" href="#" onclick="V6.openTask('${e(t.id)}','role'); return false;"><span>${e(t.title)}</span><span class="m${taskReady(t.id) ? '' : ' is-wip'}">${taskReady(t.id) ? 'по уроку' : 'скоро'}</span></a>`).join('')}</div>`).join('')}</div></section>` : ''}
            ${methodsBlock(r.id, AI_ROLES.includes(r.id) ? 'Методы работы с ИИ' : 'Методы роли')}`;
        }
        document.getElementById('v6-role').innerHTML = body;
      }).catch(() => fail('v6-role'));
    }, 'roles');
  }
  function channels(cb) {
    const ch = new Set(JSON.parse(ls.get(KEY.channels) || '[]'));
    cb.checked ? ch.add(cb.value) : ch.delete(cb.value);
    ls.set(KEY.channels, JSON.stringify([...ch]));
  }

  // ---------- задачи ----------
  function tasksPage() {
    shell('<div class="v6c" id="v6-tasks"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
    load().then(() => {
      const seller = D.groups.find((g) => g.id === 'seller');
      const others = D.groups.filter((g) => g.id !== 'seller');
      document.getElementById('v6-tasks').innerHTML = `<div class="v6-sechero"><div><h1 class="v6-d">Задачи</h1><p class="v6-lead">С чем приходят. У каждой задачи — готовый результат и способы его получить.</p>${askForm('v6-ask-t')}</div>${art('icon-zadachi', 'v6-icon-art')}</div>
        <section class="v6-sec" style="margin-top:72px"><div class="v6-sec-head"><h2 class="v6-h2">${e(seller.title)}</h2></div>${mapBlock().replace(/^<section class="v6-sec">/, '<div>').replace(/<\/section>$/, '</div>')}</section>
        ${others.map((g) => `<section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">${e(g.title)}</h2><p>Задачи разложены, способы решения появятся.</p></div></div><div class="v6-dirs">${g.directions.map((d) => `<div class="v6-dir"><h3>${e(d.title)}</h3>${(d.tasks || [{ title: 'Задачи направления' }]).map((t) => `<span class="v6-dr is-soon"><span>${e(t.title)}</span><span class="m">скоро</span></span>`).join('')}</div>`).join('')}</div></section>`).join('')}`;
    }).catch(() => fail('v6-tasks'));
  }
  function openTask(id, from) {
    go('task-' + id, () => {
      shell('<div class="v6c" id="v6-task"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        const t = D.tasks[id];
        const box = document.getElementById('v6-task');
        if (!t) { box.innerHTML = '<h1 class="v6-d" style="padding-top:56px">Такой задачи нет</h1><p><button class="v6-link" onclick="V6.open(\'tasks\')">Все задачи →</button></p>'; return; }
        track('task-open', { task: id, from: from || 'link' });
        const us = unitsOf(id);
        const result = (us.find((u) => u.result) || {}).result;
        const neigh = (t.direction.tasks || []).filter((x) => x.id !== id);
        const door = (us.find((u) => u.agencyDoor) || {}).agencyDoor;
        const needs = [...new Set(us.flatMap((u) => u.needs || []))];
        const way = (u, i) => {
          const meta = [u.minutes ? `≈ ${u.minutes} мин` : '', u.level || '', ...(u.tools || []), u.noVpn ? 'без VPN' : ''].filter(Boolean);
          const ready = hasSteps(u) || (u.fromLesson && lessonOf(u.fromLesson) && lessonOf(u.fromLesson).content);
          const label = us.length > 1 ? (u.level === 'уверенный' ? 'Продвинутый' : 'Простой') : 'Способ';
          return `<article class="v6-way2${ready ? '' : ' is-soon'}"><span class="v6-pcard-label">${label}${ready ? '' : ' · скоро'}</span><h3>${e(u.title)}</h3>
            <p>${hasSteps(u) ? `${u.steps.length} ${plural(u.steps.length, 'шаг', 'шага', 'шагов')}${u.fromLesson && lessonOf(u.fromLesson) ? ` · подробнее в уроке «${e(lessonOf(u.fromLesson).title.split(':')[0])}»` : ''}` : ready ? `По уроку ${e(u.fromLesson)}: ${e(lessonOf(u.fromLesson).title)}` : 'Этот способ готовится.'}</p>
            ${meta.length ? `<div class="v6-tags">${meta.map((m) => `<span class="v6t">${e(m)}</span>`).join('')}</div>` : ''}
            ${ready ? `<span><button class="v6b v6-btn-lg ${i ? 'is-soft' : ''}" onclick="${hasSteps(u) ? `V6.openUnit('${e(u.id)}','task')` : `openLesson(${lessonArg(u.fromLesson)})`}">${(unitState(u.id).result === 'yes') ? 'Открыть ещё раз' : 'Начать'}</button></span>` : ''}</article>`;
        };
        box.innerHTML = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.chooseRole('seller','task')">Продаю онлайн</a><span>/</span><a onclick="V6.chooseRole('seller','task')">${e(t.direction.title)}</a><span>/</span><span>Задача</span></nav>
          <section class="v6-phero v6-thero"><div class="v6-phero-text"><h1 class="v6-d">${e(t.title)}</h1>
            ${result ? `<div class="v6-gets"><span class="v6-pcard-label">Что получите</span><span>${e(result)}</span></div>` : `<div class="v6-gets"><span class="v6-pcard-label">Что получите</span><span>${t.status === 'soon' ? 'Задача готовится: скоро здесь появятся способы её решить.' : 'Описание результата появится вместе со способом.'}</span></div>`}</div>
            ${art('task', 'v6-phero-art v6-sp-art')}</section>
          <section class="v6-tsec"><h2 class="v6-h2">Выберите способ</h2>
            ${us.length ? `<div class="v6-ways2">${us.map(way).join('')}</div>` : '<div class="v6-ways2"><article class="v6-way2 is-soon"><span class="v6-pcard-label">скоро</span><h3>Способы появятся</h3><p>Для этой задачи пока нет готового юнита.</p></article></div>'}</section>
          ${(() => { const fs = fwOfTask(t); return fs.length ? `<section class="v6-tsec"><div class="v6-sec-head is-split"><h2 class="v6-h2">Фреймворки этой задачи</h2><p>Каким методом думать о задаче. У каждого — калькулятор, промпт или инструмент.</p></div>${fwGrid(fs.slice(0, 6), 'task')}</section>` : ''; })()}
          <section class="v6-tsec v6-tbottom"><div class="v6-tmain">${needs.length ? `<div class="v6-needs"><h3>Что понадобится</h3>${needs.map((n) => `<div><span class="v6-needs-dot"></span>${e(n)}</div>`).join('')}</div>` : ''}</div>
            <aside class="v6-side"><button class="v6-note" onclick="umTrack('alyosha-open', { from: 'task' }); aleshaToggle()"><span class="v6-ava">А</span><span>Застряли или не знаете, с чего начать? Спросите, подскажу.</span></button>
              ${neigh.length ? `<div class="v6-neigh"><span class="v6-meta">Соседние задачи</span>${neigh.map((x) => x.status === 'soon' ? `<span class="v6-neigh-i is-soon"><span>${e(x.title)}</span><span class="m">скоро</span></span>` : `<a class="v6-neigh-i" href="#" onclick="V6.openTask('${e(x.id)}','task'); return false;"><span>${e(x.title)}</span><span class="m">${taskMins(x.id) || (taskReady(x.id) ? '' : 'в работе')}</span></a>`).join('')}</div>` : ''}
              ${door ? `<div class="v6-tdoor"><span>${e(door)}</span><a href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'task' })">Узнать →</a></div>` : ''}
            </aside></section>`;
      }).catch(() => fail('v6-task'));
    }, 'tasks');
  }

  // ---------- Пути: все пути равны, у каждого своя страница ----------
  function pathsPage() {
    shell('<div class="v6c" id="v6-paths"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
    load().then(() => {
      const r = resume();
      const m = D.paths.main;
      const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
      const pp = dataPath('product'), mp = dataPath('marketing');
      const mine = ls.get(KEY.role);
      const started = anyProgress();
      const trailWhere = { 'level-1': 'ответвляется после уровня 1', 'common-start': 'сразу после общего старта', 'level-2': 'рядом с уровнем 2' };
      const trailArt = { projects: 'trail-projects', everyday: 'trail-everyday', industry: 'trail-industry', claude: 'trail-claude', vibe: 'trail-vibe' };
      const card = (o) => `<a class="v6-pathc" href="#${o.hash}" onclick="${o.on}; return false;">${art(o.art)}<span class="v6-pathc-in"><span class="v6-pcard-label">${o.label}${o.mine ? ' · <b>ваш</b>' : ''}</span><span class="v6-pathc-t">${e(o.title)}</span><span class="v6-pathc-p">${e(o.text)}</span>
        <span class="v6-tags">${o.chips.map((c, i) => `<span class="v6t${i || !o.accentFirst ? ' is-grey' : ''}">${e(c)}</span>`).join('')}</span><span class="v6-pathc-go">Открыть путь ${CHEV}</span></span></a>`;
      document.getElementById('v6-paths').innerHTML = `<section class="v6-phero"><div class="v6-phero-text"><span class="v6-eyebrow">Пути</span><h1 class="v6-d">Всё, что идёт по порядку</h1><p class="v6-phero-lead">Путь — порядок шагов к результату. Главный ведёт к своим ИИ-приложениям, пути ролей — к результату в работе. Выберите тот, что про вас; пройденное засчитывается везде.</p></div>${art('paths-hero', 'v6-phero-art')}</section>
        <section class="v6-psec"><div class="v6-pathgrid">
          ${card({ hash: 'path-main', on: "V6.openMainPath('paths')", art: 'main-path', label: 'Для всех', title: m.title, text: `Общий старт из ${m.commonStart.lessons.length} уроков и уровни: от первых промптов к своим приложениям.`, chips: [started ? (typeof r.id === 'number' ? 'вы на уроке ' + r.id : 'начат') : 'с нуля', `${m.levels.length} ${plural(m.levels.length, 'уровень', 'уровня', 'уровней')}`, `${m.levels.filter((l) => l.milestone).length} Вехи`], accentFirst: started, mine: mine === 'creator' })}
          ${card({ hash: 'path-seller', on: "V6.openSellerPath('paths')", art: 'seller-path', label: 'Продаю онлайн', title: sp.title, text: `Три этапа по деньгам: ${sp.stages.map((x) => x.promise).join(', ')}.`, chips: [`${sp.stages.length} этапа`, `${sp.stages.filter((x) => x.milestone).length} Вехи`, `${D.resources.length} полезных вещей`], mine: mine === 'seller' })}
          ${[[pp, 'V6.openProductPath', mine === 'product' || mine === 'project'], [mp, 'V6.openMarketingPath', mine === 'marketing']].map(([x, fn, isMine]) => card({ hash: 'path-' + x.key, on: `${fn}('paths')`, art: x.art, label: x.label, title: x.title, text: `${x.stages.map((s_, i) => i ? s_.title.toLowerCase() : s_.title).join(', ')}. Задачи и методы уже видны.`, chips: ['собирается', `${x.stages.length} ${plural(x.stages.length, 'этап', 'этапа', 'этапов')}`, `${x.fwCount} методов`], accentFirst: true, mine: isMine })).join('')}
        </div></section>
        <section class="v6-psec"><div class="v6-sec-head"><h2 class="v6-psec-h">Тропинки</h2><p>Короткие ветки рядом с путями. Пройденное засчитывается и в пути, и в роли.</p></div>
          <div class="v6-trails">${D.paths.trails.map((t) => `<a class="v6-trail" href="#" onclick="openSection('${e(t.id)}'); return false;">${art(trailArt[t.id] || 'trail-projects')}<span class="v6-trail-in"><span class="v6-trail-w">${t.branchAfter ? trailWhere[t.branchAfter] || '' : 'отдельный мир · открыт всем'}</span><span class="v6-trail-t">${e(t.title)}</span></span></a>`).join('')}</div></section>`;
    }).catch(() => fail('v6-paths'));
  }

  // ---------- главный путь (Path.dc.html: уровни и главы) ----------
  function openMainPath(from) {
    go('path-main', () => {
      shell('<div class="v6c" id="v6-pm"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        track('path-open', { path: 'main', from: from || 'link' });
        const r = resume();
      const lArg = lessonArg(r.id);
      const m = D.paths.main;
      const cnt = (ids) => `${ids.filter(done).length}/${ids.length}`;
      const isHere = (ids) => ids.map(String).includes(String(r.id));
      const quizLink = (n) => (typeof QUIZZES !== 'undefined' && QUIZZES[n]) ? `<a class="v6-quiz" href="#" onclick="openQuiz(${n}); return false;">Проверка уровня →</a>` : '';
      const head = (label, here) => `<div class="v6-chap-head"><span class="v6-meta">${label}</span>${here ? '<span class="v6t is-sm">вы здесь</span>' : ''}</div>`;
      const foot = (veha, n) => `<div class="v6-chap-foot"><span><span class="v6-meta">Веха · </span>${e(veha)}</span>${quizLink(n)}</div>`;
      const firstOpen = (ids) => ids.find((id) => !done(id) && lessonOf(id) && lessonOf(id).content) || ids[0];
      const startRows = () => rowList(m.commonStart.lessons.map((id) => { const l = lessonOf(id); const now = String(r.id) === String(id) && !done(id);
        return { n: id, t: shortLessonLabel(l.title), c: done(id) ? 'пройден' : now ? 'сейчас' : (l.duration ? l.duration + ' мин' : ''), on: `openLesson(${lessonArg(id)})`, now, done: done(id) }; }));
      const level = (lv) => {
        const rows = rowList(lv.chapters.map((ch, i) => { const ready = ch.lessons.some((id) => lessonOf(id) && lessonOf(id).content); const now = isHere(ch.lessons);
          return { n: ROMAN[i], t: ch.title, c: !ready ? 'пишется' : now ? 'сейчас' : cnt(ch.lessons), on: ready ? `openLesson(${lessonArg(firstOpen(ch.lessons))})` : null, now }; }));
        return `<div class="v6-card v6-chapter">${head('Уровень ' + lv.n, isHere(lv.lessons))}<h3 class="v6-h3">${e(lv.title)}</h3><p class="v6-chap-desc">${e(lv.description || '')}</p>${rows}
          ${lv.note ? `<p class="v6-meta" style="margin:0">${e(lv.note.charAt(0).toUpperCase() + lv.note.slice(1))}</p>` : ''}${foot(lv.milestone ? lv.milestone.title : 'появится вместе с уроками', lv.n)}</div>`;
      };
      const trailWhere = { 'level-1': 'ответвляется после уровня 1', 'common-start': 'сразу после общего старта', 'level-2': 'рядом с уровнем 2' };
      const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
      const trailArt = { projects: 'trail-projects', everyday: 'trail-everyday', industry: 'trail-industry', claude: 'trail-claude', vibe: 'trail-vibe' };
      const hereLabel = typeof r.id === 'number' ? 'урок ' + r.id : r.title;
        document.getElementById('v6-pm').innerHTML = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('paths')">Пути</a><span>/</span><span>${e(m.title)}</span></nav>
          <section class="v6-phero" style="padding-top:24px;padding-bottom:56px"><div class="v6-phero-text"><span class="v6-eyebrow">Главный путь · для всех</span><h1 class="v6-d">${e(m.title)}</h1><p class="v6-phero-lead">От первых промптов к своим ИИ-приложениям. Общий старт из пяти уроков, потом четыре уровня. Каждый замыкается Вехой — вещью, собранной своими руками.</p></div>${art('main-path', 'v6-phero-art v6-sp-art')}</section>
          <section class="v6-psec"><div class="v6-pmain"><div class="v6-pmain-text"><span class="v6-pcard-label">${anyProgress() ? 'Вы здесь, ' + e(hereLabel) : 'Начните с общего старта'}</span><h2 class="v6-pmain-h">${anyProgress() ? 'Продолжить' : 'Первый урок'}</h2><p>${e(r.title || '')}</p>
              <span class="v6-btns"><button class="v6b v6-btn-lg" onclick="openLesson(${lArg})">${anyProgress() ? 'Продолжить ' + (typeof r.id === 'number' ? 'урок ' + r.id : 'урок') : 'Начать'}</button><button class="v6b is-soft v6-btn-lg" onclick="openSection('main')">Все уроки</button></span></div>
              <div class="v6-scheme">[схема пути — делает Руслан]</div></div>
            <div class="v6-pgrid">
              <article class="v6-card v6-chapter">${head('Общий старт · для всех', isHere(m.commonStart.lessons))}<h3 class="v6-h3">${e(m.commonStart.title)}</h3><p class="v6-chap-desc">${e(m.commonStart.description)}</p>${startRows()}${foot('после урока 5 — развилка', 1)}</article>
              ${m.levels.map(level).join('')}
            </div></section>
          ${methodsBlock('creator', 'Методы работы с ИИ')}`;
      }).catch(() => fail('v6-pm'));
    }, 'paths');
  }

  // ---------- пути продакта и маркетолога: каркас из данных (tasks.json · группа роли + фреймворки) ----------
  // этапы = направления задач роли; шаги = задачи; «методы этапа» = карточки с task или alsoIn этого направления
  const DATA_PATHS = {
    product: { group: 'product', title: 'Путь продакта', label: 'Продакт и проджект', role: 'product', lessonRoles: ['product', 'project'], art: 'product-path',
      both: /prioritize|manage/, note: 'Проджект идёт по этапам «Приоритизация» и «Управление работой».' },
    marketing: { group: 'marketing', title: 'Путь маркетолога', label: 'Маркетолог', role: 'marketing', lessonRoles: ['marketing'], art: 'marketing-path',
      note: 'В этапы встроены методы из e-commerce: ДРР и ROMI, маржинальный доход по каналам, ассортиментная матрица, репутация и отзывы.' },
  };
  function dataPath(key) {
    const cfg = DATA_PATHS[key];
    const g = D.groups.find((x) => x.id === cfg.group);
    const stages = g.directions.map((d, i) => ({ n: i + 1, id: d.id, title: d.title, tasks: d.tasks || [],
      fws: D.fw.filter((c) => c.task === d.id || (c.alsoIn || []).includes(d.id)).sort(fwSort) }));
    return Object.assign({ key, stages, fwCount: stages.reduce((n, st) => n + st.fws.length, 0) }, cfg);
  }
  function openDataPath(key, from) {
    go('path-' + key, () => {
      shell('<div class="v6c" id="v6-pp"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        track('path-open', { path: key, from: from || 'link' });
        const pp = dataPath(key);
        const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
        const lessons = [...new Set(pp.lessonRoles.flatMap((r) => role(r).lessons || []))].filter((id) => lessonOf(id));
        const stage = (st) => `<section class="v6-stage"><div class="v6-stage-head"><div><span class="v6-pcard-label">Этап ${st.n} · собирается${pp.both && pp.both.test(st.id) ? ' · и для проджекта' : ''}</span><h2 class="v6-pmain-h">${e(st.title)}</h2></div><span class="v6-pcard-label">${st.tasks.length} ${plural(st.tasks.length, 'задача', 'задачи', 'задач')}${st.tasks.filter((t) => taskReady(t.id)).length ? `, готово ${st.tasks.filter((t) => taskReady(t.id)).length}` : ''} · ${st.fws.length} ${plural(st.fws.length, 'метод', 'метода', 'методов')}</span></div>
          <div class="v6-steps-list">${st.tasks.map((t) => `<div class="v6-step"><span class="v6-dotc${taskDone(t.id) ? ' is-done' : ''}">${taskDone(t.id) ? '✓' : ''}</span><div class="v6-step-b"><span class="v6-step-tags"><span class="v6t is-sm">задача</span><span class="v6-step-s">${taskReady(t.id) ? (() => { const su = unitsOf(t.id).find(hasSteps); if (su) return `юнит · ${su.steps.length} ${plural(su.steps.length, 'шаг', 'шага', 'шагов')}${su.review ? ' · черновик' : ''}`; const l = lessonOf((unitsOf(t.id).find((u) => u.fromLesson) || {}).fromLesson); return l ? `по уроку «${e(l.title.split(':')[0])}»` : 'по уроку'; })() : 'способ решения скоро'}</span></span><a class="v6-step-t" href="#task-${e(t.id)}" onclick="V6.openTask('${e(t.id)}','${key}-path'); return false;">${e(t.title)}</a></div><span class="v6-step-m"></span></div>`).join('')}</div>
          ${st.fws.length ? `<div class="v6-stage-fw"><span class="v6-pcard-label">Методы этапа</span><span class="v6-rchips">${st.fws.map((c) => `<a class="v6-rchip" href="#fw-${e(c.id)}" onclick="V6.openFw('${e(c.id)}','${key}-path'); return false;">${e(c.title)}</a>`).join('')}</span></div>` : ''}</section>`;
        document.getElementById('v6-pp').innerHTML = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('paths')">Пути</a><span>/</span><a onclick="V6.openRole('${pp.role}','${key}-path')">${e(role(pp.role).title)}</a><span>/</span><span>${e(pp.title)}</span></nav>
          <section class="v6-phero" style="padding-top:24px;padding-bottom:56px"><div class="v6-phero-text"><span class="v6-eyebrow">Путь роли · ${e(pp.label)}</span><h1 class="v6-d">${e(pp.title)}</h1>
            <p class="v6-phero-lead">${pp.stages.length} ${plural(pp.stages.length, 'этап', 'этапа', 'этапов')} в том порядке, в каком идёт работа: ${pp.stages.map((x) => x.title.toLowerCase()).join(', ')}. Путь собирается: задачи и методы уже здесь, короткие способы и Вехи появятся.</p>
            <span class="v6-tags"><span class="v6t is-sm">собирается</span><span class="v6t is-sm is-grey">${pp.stages.length} ${plural(pp.stages.length, 'этап', 'этапа', 'этапов')}</span><span class="v6t is-sm is-grey">${pp.fwCount} методов</span></span></div>${art(pp.art, 'v6-phero-art v6-sp-art')}</section>
          <div class="v6-sp-body">
            <section class="v6-prep"><span class="v6-prep-h">Подготовка · ${(sp.prep || []).reduce((n, x) => n + (x.minutes || 0), 0)} минут</span><div class="v6-prep-g">${(sp.prep || []).map((x) => { const go = stepGo(x); const inner = `<span class="v6-prep-l"><span class="v6-dotc"></span><span class="v6-prep-t">${e(x.title)}</span></span><span class="v6-prep-m">${e(STEP_KIND[x.kind] || x.kind)} · ${x.minutes} мин</span>`;
              return go ? `<a class="v6-prep-i" href="#" onclick="${go}; return false;">${inner}</a>` : `<span class="v6-prep-i">${inner}</span>`; }).join('')}</div></section>
            ${lessons.length ? `<section class="v6-prep"><span class="v6-prep-h">Уже можно пройти · уроки роли</span>${rowList(byNoCode(lessons).map((id, i) => { const l = lessonOf(id); return { n: String(i + 1), t: l.title, c: done(id) ? 'пройден' : l.content ? mins(id) : 'пишется', on: l.content ? `openLesson(${lessonArg(id)})` : null, done: done(id) }; }))}</section>` : ''}
            ${pp.stages.map(stage).join('')}
            <p class="v6-sp-note">${e(pp.note)} Задачи без готового способа уже открываются: на их странице — методы, которыми думать о задаче.</p>
          </div>`;
      }).catch(() => fail('v6-pp'));
    }, 'paths');
  }
  const openProductPath = (from) => openDataPath('product', from);
  const openMarketingPath = (from) => openDataPath('marketing', from);

  // ---------- путь продавца (SellerPath.dc.html; ресурсы и Вехи без действия до этапа 2) ----------
  function openSellerPath(from) {
    go('path-seller', () => {
      shell('<div class="v6c" id="v6-sp"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        track('path-open', { path: 'seller', from: from || 'link' });
        const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
        const all = sp.stages.flatMap((st) => st.steps);
        const cur = all.find((x) => !x.optional && !stepDone(x) && stepGo(x));
        const curStage = sp.stages.find((st) => st.steps.includes(cur)) || sp.stages[0];
        const res = (id) => D.resources.find((r) => r.id === id);
        const chip = (r) => resReady(r) ? `<a class="v6-rchip" href="#res-${e(r.id)}" onclick="V6.openRes('${e(r.id)}','path'); return false;"><span>${e(RES_KIND[r.kind] || r.kind)}</span>${e(r.title)}</a>` : `<span class="v6-rchip"><span>${e(RES_KIND[r.kind] || r.kind)}</span>${e(r.title)}</span>`;
        const step = (x) => {
          const go = stepGo(x), isDone = stepDone(x), isCur = x === cur;
          const title = go ? `<a class="v6-step-t" href="#" onclick="${go}; return false;">${e(x.title)}</a>` : `<span class="v6-step-t">${e(x.title)}</span>`;
          const rs = (x.resources || []).map(res).filter(Boolean);
          return `<div class="v6-step${isCur ? ' is-now' : ''}"><span class="v6-dotc${isDone ? ' is-done' : isCur ? ' is-now' : ''}">${isDone ? '✓' : ''}</span>
            <div class="v6-step-b"><span class="v6-step-tags"><span class="v6t is-sm">${e(STEP_KIND[x.kind] || x.kind)}</span>${x.optional ? '<span class="v6-step-s">по желанию</span>' : ''}${!go && !isDone ? '<span class="v6-step-s">скоро</span>' : ''}${go && x.kind === 'framework' && !(fwById(x.ref) || {}).full ? '<span class="v6-step-s">карточка пишется</span>' : ''}</span>${title}${rs.length ? `<span class="v6-rchips">${rs.map(chip).join('')}</span>` : ''}</div>
            <span class="v6-step-m">${x.minutes ? x.minutes + ' мин' : ''}</span></div>`;
        };
        const door = (st) => { const d = st.milestone && st.milestone.agencyDoor; return d ? `<div class="v6-mdoor"><span>${e(d)}</span><a href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'seller-path' })">Узнать →</a></div>` : ''; };
        const stage = (st) => {
          const req = st.steps.filter((x) => !x.optional).length, opt = st.steps.length - req;
          const label = st === curStage ? 'вы здесь' : st.steps.every(stepDone) ? 'пройден' : 'дальше';
          const m = st.milestone;
          return `<section class="v6-stage"><div class="v6-stage-head"><div><span class="v6-pcard-label">Этап ${st.n} · ${label}</span><h2 class="v6-pmain-h">${e(st.title)} <span class="v6-stage-pr">— ${e(st.promise)}</span></h2></div><span class="v6-pcard-label">${req} ${plural(req, 'шаг', 'шага', 'шагов')}${opt ? ` · ${opt} по желанию` : ''}</span></div>
            <div class="v6-steps-list">${st.steps.map(step).join('')}</div>
            ${m ? `<div class="v6-mile"><div class="v6-mile-l"><span class="v6-mile-e">Веха этапа ${st.n} · Алёша сверит по рубрике</span><span class="v6-mile-t">${e(m.title)}</span><span class="v6-mile-g">${e(m.gives || '')}</span><span><a class="v6-mile-b" href="#veha-seller-${st.n}" onclick="V6.openVeha(${st.n},'path'); return false;">Собрать ${e(m.title.charAt(0).toLowerCase() + m.title.slice(1))}</a>${(jget(KEY.checks)['veha:seller-' + st.n] || {}).verdict ? ` <span class="v6-mile-soon">Алёша · ${e(jget(KEY.checks)['veha:seller-' + st.n].verdict)}</span>` : ''}</span></div>
              <div class="v6-mile-r">${(m.rubric || []).map((c) => `<span><span class="v6-mile-dot">${c.must ? '●' : '○'}</span>${e(c.criterion)}</span>`).join('')}</div>${door(st)}</div>` : ''}</section>`;
        };
        const groups = [['Шаблоны', ['template']], ['Чек-листы', ['checklist']], ['Калькуляторы', ['calculator']], ['Инструменты', ['tool']], ['Промпты', ['prompt-set']]]
          .map(([t, kinds]) => [t, D.resources.filter((r) => kinds.includes(r.kind) && (r.roles || []).includes('seller'))]).filter(([, rs]) => rs.length);
        document.getElementById('v6-sp').innerHTML = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('paths')">Пути</a><span>/</span><a onclick="V6.chooseRole('seller','seller-path')">Продаю онлайн</a><span>/</span><span>${e(sp.title)}</span></nav>
          <section class="v6-phero" style="padding-top:24px;padding-bottom:56px"><div class="v6-phero-text"><span class="v6-eyebrow">Путь роли · Продаю онлайн</span><h1 class="v6-d">${e(sp.title)}</h1>
            <p class="v6-phero-lead">Три этапа по деньгам: ${sp.stages.map((x) => x.promise).join(', ')}. Не уроки, а вещи для работы: юниты, методы, шаблоны, калькуляторы, чек-листы.</p>
            <span class="v6-tags"><span class="v6t is-sm">этап ${curStage.n} из ${sp.stages.length}</span><span class="v6t is-sm is-grey">${sp.stages.filter((x) => x.milestone).length} Вехи</span><span class="v6t is-sm is-grey">${D.resources.length} полезных вещей</span></span></div>${art('seller-path', 'v6-phero-art v6-sp-art')}</section>
          <div class="v6-sp-body">
            <section class="v6-prep"><span class="v6-prep-h">Подготовка · ${(sp.prep || []).reduce((n, x) => n + (x.minutes || 0), 0)} минут</span><div class="v6-prep-g">${(sp.prep || []).map((x) => { const go = stepGo(x); const inner = `<span class="v6-prep-l"><span class="v6-dotc">${''}</span><span class="v6-prep-t">${e(x.title)}</span></span><span class="v6-prep-m">${e(STEP_KIND[x.kind] || x.kind)} · ${x.minutes} мин${go ? '' : ' · скоро'}</span>`;
              return go ? `<a class="v6-prep-i" href="#" onclick="${go}; return false;">${inner}</a>` : `<span class="v6-prep-i">${inner}</span>`; }).join('')}</div></section>
            ${sp.stages.map(stage).join('')}
            <section class="v6-kit"><div class="v6-sec-head"><h2 class="v6-psec-h">Набор продавца</h2><p>Пришли не учиться, а забрать таблицу? Всё полезное из пути — здесь, без порядка.</p></div>
              <div class="v6-kit-g">${groups.map(([t, rs]) => `<div class="v6-kit-c"><span class="v6-kit-h"><span>${e(t)}</span><span class="v6-meta">${rs.length}</span></span><div class="v6-kit-l">${rs.map((r) => { const fw = /^framework:/.test(r.link || '') && fwById(r.link.slice(10)); const ok = resReady(r) || fw; const inner = `<span class="v6-kit-t">${e(r.title)}</span><span class="v6-kit-g2">${e(r.gives || '')}</span>${ok ? '<span class="v6-kit-s is-go">открыть →</span>' : '<span class="v6-kit-s">скоро</span>'}`;
                return resReady(r) ? `<a class="v6-kit-i" href="#res-${e(r.id)}" onclick="V6.openRes('${e(r.id)}','kit'); return false;">${inner}</a>` : fw ? `<a class="v6-kit-i" href="#fw-${e(fw.id)}" onclick="V6.openFw('${e(fw.id)}','kit'); return false;">${inner}</a>` : `<span class="v6-kit-i">${inner}</span>`; }).join('')}</div></div>`).join('')}</div>
              ${sp.note ? `<p class="v6-sp-note">${e(sp.note)}</p>` : ''}</section>
          </div>`;
      }).catch(() => fail('v6-sp'));
    }, 'paths');
  }

  // ---------- Знания: каталог фреймворков (Knowledge.dc.html) + библиотека, глоссарий, источники ----------
  const KF = { role: '', label: '' };
  function fwList() {
    const box = document.getElementById('v6-fwlist');
    if (!box) return;
    const cards = D.fw.filter((c) => (!KF.role || (c.roles || []).includes(KF.role)) && (!KF.label || c.label === KF.label)).sort(fwSort);
    if (!cards.length) { box.innerHTML = '<p class="v6-lead">Под эти фильтры карточек нет.</p>'; return; }
    if (KF.role) { box.innerHTML = `<div class="v6-fwhead"><span class="v6-fwhead-t">${e(roleName(KF.role))} · в порядке изучения</span><span class="v6-meta">${cards.length} ${plural(cards.length, 'карточка', 'карточки', 'карточек')}</span></div>${fwGrid(cards, 'knowledge')}`; return; }
    const groups = [...new Set(D.fw.map((c) => c.group))];
    box.innerHTML = groups.map((g) => { const cs = cards.filter((c) => c.group === g); return cs.length ? `<div class="v6-fwhead"><span class="v6-fwhead-t">${e(GROUP_T[g] || g)}</span><span class="v6-meta">${cs.length}</span></div>${fwGrid(cs, 'knowledge')}` : ''; }).join('');
  }
  function kf(k, v) {
    KF[k] = v;
    document.querySelectorAll(`[data-kf="${k}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    fwList();
  }
  function openKnowledge(rid) { KF.role = rid || ''; KF.label = ''; open('knowledge'); }
  function knowledgePage() {
    shell('<div class="v6c" id="v6-kn"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
    load().then(() => {
      const start = fwById('four-part-request');
      const roles = ['seller', 'marketing', 'product', 'project', 'owner', 'all'];
      const pill = (k, v, t) => `<button type="button" class="v6-pill" data-kf="${k}" data-v="${v}" aria-pressed="${KF[k] === v}" onclick="V6.kf('${k}','${v}')">${t}</button>`;
      document.getElementById('v6-kn').innerHTML = `<section class="v6-phero"><div class="v6-phero-text"><span class="v6-eyebrow">Знания</span><h1 class="v6-d">Методы, слова и уроки</h1><p class="v6-phero-lead">Фреймворки — каким методом думать о задаче. Глоссарий — что значит слово. Уроки — почему это работает.</p></div>${art('knowledge', 'v6-phero-art')}</section>
        <section class="v6-psec"><div class="v6-kfilters"><div class="v6-kf"><span class="v6-meta">Роль</span><div class="v6-pills">${pill('role', '', 'Все')}${roles.map((r) => pill('role', r, e(r === 'all' ? 'ИИ для всех' : roleName(r)))).join('')}</div></div>
          <div class="v6-kf"><span class="v6-meta">Метка</span><div class="v6-pills">${pill('label', '', 'Все')}${['база', 'тренд', 'авторский'].map((l) => pill('label', l, l)).join('')}</div></div></div>
          ${start ? `<a class="v6-next v6-dark" style="margin:32px 0 0" href="#fw-${start.id}" onclick="V6.openFw('${start.id}','knowledge'); return false;"><span class="v6-next-in"><span class="v6-next-l">Начните с этого · для всех ролей</span><span class="v6-next-t">${e(start.title)}</span><span class="v6-next-p">Без него не работает ни один промпт в юнитах. Пять минут, и первый ответ ИИ становится рабочим.</span></span><span class="v6b is-accent v6-btn-xl">Открыть</span></a>` : ''}
          <div id="v6-fwlist"></div></section>
        <section class="v6-psec"><h2 class="v6-psec-h">Ещё в Знаниях</h2><div class="v6-grid2" style="margin-top:28px">
          <div class="v6-task"><h3>Библиотека уроков</h3><p>Все уроки курса по уровням и Тропинкам.</p><button class="v6b is-soft is-sm" onclick="openSection('main')">Открыть</button></div>
          <div class="v6-task"><h3>Глоссарий</h3><p>Термины ИИ простыми словами.</p><button class="v6b is-soft is-sm" onclick="openGlossary()">Открыть</button></div>
          <div class="v6-task"><h3>Источники</h3><p>Курсы, книги и документация, на которых стоят уроки.</p><button class="v6b is-soft is-sm" onclick="openStaticPage('resources')">Открыть</button></div>
          <div class="v6-task"><h3>Нейросети без VPN</h3><p>Живой список: что работает из России, что бесплатно.</p><a class="v6b is-soft is-sm" href="/tools/neyroseti-bez-vpn/">Открыть</a></div>
        </div></section>`;
      fwList();
    }).catch(() => fail('v6-kn'));
  }

  // ---------- карточка фреймворка (CardSku.dc.html, CardPrompt.dc.html) ----------
  let fwCur = null;
  const rub = (n) => Math.round(n).toLocaleString('ru-RU') + ' ₽';
  // выражение карточки (executor.expr): только id полей, числа и + - * / ( )
  function evalExpr(expr, v) {
    const ids = Object.keys(v);
    const names = expr.match(/[A-Za-z_]\w*/g) || [];
    if (!/^[\w\s+\-*\/().]+$/.test(expr) || names.some((n) => !ids.includes(n))) return NaN;
    try { return Function(...ids, `return (${expr});`)(...ids.map((k) => v[k])); } catch (_) { return NaN; }
  }
  function calc() {
    const c = fwCur, box = document.getElementById('v6-calc');
    if (!c || !box) return;
    const v = {}; c.executor.inputs.forEach((i) => { v[i.id] = parseFloat(String((box.querySelector(`[data-in="${i.id}"]`) || {}).value || '0').replace(/\s/g, '').replace(',', '.')) || 0; });
    if (c.executor.expr) {
      const r = evalExpr(c.executor.expr, v), res = c.executor.result || {};
      box.querySelector('.v6-calc-n').textContent = Number.isFinite(r) ? `${r.toLocaleString('ru-RU', { maximumFractionDigits: res.digits ?? 1 })}${res.unit ? ' ' + res.unit : ''}` : '—';
      return;
    }
    const price = v[c.executor.inputs[0].id];
    const parts = c.executor.inputs.slice(1).map((i) => ({ t: i.label, n: i.kind === 'percent' ? price * v[i.id] / 100 : v[i.id] }));
    const left = price - parts.reduce((n, x) => n + x.n, 0);
    const share = price ? Math.round(left / price * 100) : 0;
    box.querySelector('.v6-calc-n').innerHTML = `${rub(left)} <span>· ${share}%</span>`;
    box.querySelector('.v6-calc-bar').innerHTML = parts.map((x) => `<span style="flex:${Math.max(x.n, 0)}" title="${e(x.t)}"></span>`).join('') + `<span class="is-left" style="flex:${Math.max(left, 0)}" title="Остаётся"></span>`;
    box.querySelector('.v6-calc-leg').innerHTML = parts.map((x) => `<span><i></i>${e(x.t)} ${rub(x.n)}</span>`).join('') + `<span><i class="is-left"></i>Остаётся ${rub(left)}</span>`;
  }
  function copyPrompt(btn) {
    const t = document.getElementById('v6-prompt').innerText;
    const ok = () => { btn.textContent = 'Скопировано'; setTimeout(() => { btn.textContent = 'Скопировать'; }, 1600); };
    try { navigator.clipboard.writeText(t).then(ok, () => {}); } catch (_) {}
  }
  function openFw(id, from) {
    go('fw-' + id, () => {
      shell('<div class="v6c" id="v6-fwp"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        const c = fwById(id);
        const box = document.getElementById('v6-fwp');
        if (!c) { box.innerHTML = '<h1 class="v6-d" style="padding-top:56px">Такой карточки нет</h1><p><a class="v6-more" onclick="V6.open(\'knowledge\')">Все фреймворки →</a></p>'; return; }
        track('fw-open', { fw: id, from: from || 'link' });
        fwCur = c;
        const req = (c.requires || []).map(fwById).filter(Boolean);
        const fwLink = (x) => `<a href="#fw-${e(x.id)}" onclick="V6.openFw('${e(x.id)}','fw'); return false;">${e(x.title)}</a>`;
        const dots = (items, cls) => items.map((t) => `<div class="v6-dotrow"><span class="v6-dot ${cls || ''}"></span><span>${e(t.charAt(0).toUpperCase() + t.slice(1))}</span></div>`).join('');
        const tasks = [...new Set([...(c.tasks || []), c.task].filter(Boolean))].map((t) => D.tasks[t]).filter(Boolean);
        const lessons = (c.lessons || []).filter((l) => lessonOf(l));
        const near = D.fw.filter((x) => x.id !== c.id && x.task && x.task === c.task).sort(fwSort).slice(0, 3);
        const hero = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('knowledge')">Знания</a><span>/</span><a onclick="V6.open('knowledge')">Фреймворки</a><span>/</span><span>${e(c.title)}</span></nav>
          <section class="v6-phero v6-thero"><div class="v6-phero-text"><span class="v6-tags">${c.label ? `<span class="v6t${c.label === 'авторский' ? '' : ' is-grey'}">${e(c.label)}</span>` : ''}${(c.roles || []).map((r) => `<span class="v6t is-grey">${e(roleName(r))}</span>`).join('')}${c.source && c.source.author ? `<span class="v6t is-grey">${e(c.source.author)}</span>` : ''}</span>
            <h1 class="v6-d">${e(c.title)}</h1><p class="v6-phero-lead">${e(c.solves)}.</p>${req.length ? `<span class="v6-fw-req">Сначала: ${req.map(fwLink).join(', ')}</span>` : ''}</div>${art('fw-card', 'v6-phero-art v6-sp-art')}</section>`;
        let body = '';
        if (c.full) {
          const ex = c.executor || {};
          const exec = ex.kind === 'calculator' && ex.inputs && ex.inputs.length > 0 ? `<section class="v6-exec" aria-label="ИИ-исполнитель: калькулятор"><div class="v6-exec-h"><h2>Посчитайте свой случай</h2><span class="v6t">ИИ-исполнитель · калькулятор</span></div>
              <div id="v6-calc"><div class="v6-calc-in">${ex.inputs.map((i) => `<label>${e(i.label)}<span><input type="text" inputmode="decimal" data-in="${e(i.id)}" value="" placeholder="0" oninput="V6.calc()"><i>${e(i.unit || '')}</i></span></label>`).join('')}</div>
              <div class="v6-calc-out"><div class="v6-calc-top"><span>${e(ex.expr ? (ex.result || {}).label || 'Результат' : 'Остаётся с одной продажи')}</span><span class="v6-calc-n"></span></div>${ex.expr ? '' : '<div class="v6-calc-bar"></div><div class="v6-calc-leg"></div>'}<p class="v6-meta" style="margin:0">${e(ex.formula || '')}</p></div></div></section>`
            : ex.kind === 'prompt' ? `<section class="v6-exec" aria-label="ИИ-исполнитель: промпт"><div class="v6-exec-h"><h2>Заготовка запроса</h2><span class="v6t">ИИ-исполнитель · промпт${ex.noVpn ? ' · без VPN' : ''}</span></div><pre class="v6-prompt" id="v6-prompt">${e(ex.prompt || '')}</pre><span><button class="v6b v6-btn-lg" onclick="V6.copyPrompt(this)">Скопировать</button></span></section>` : '';
          const g = c.gate;
          body = `<div class="v6-fwbody">
            <div class="v6-fw2"><section class="v6-box"><h2>Когда применять</h2>${dots((c.when || {}).use || [], 'is-acc')}</section><section class="v6-box"><h2>Когда не надо</h2>${dots((c.when || {}).avoid || [], 'is-mute')}</section></div>
            <section class="v6-box"><h2>Шаги</h2><div class="v6-fwsteps">${(c.steps || []).map((x, i) => `<div><span class="n">${i + 1}</span><span><b>${e(x.title)}</b><span>${e(x.text)}</span></span></div>`).join('')}</div></section>
            ${exec}
            <div class="v6-fw2">${c.example ? `<section class="v6-box"><h2>Пример</h2><span><span class="v6t is-grey">${c.example.illustrative ? 'условный пример · ' : ''}${e(c.example.industry || '')}</span></span><p class="v6-fw-ex">${e(c.example.text)}</p></section>` : ''}${(c.mistakes || []).length ? `<section class="v6-box"><h2>Частые ошибки</h2>${dots(c.mistakes, 'is-ink')}</section>` : ''}</div>
            ${g ? `<section class="v6-gate"><div class="v6-gate-l"><span class="v6-gate-e"><span class="v6-ava">А</span>Калитка · Алёша сверит по рубрике</span><span class="v6-gate-t">${e(g.task)}</span>${rubricBox('gate:' + c.id, `Калитка: ${c.title}`, g.task, g.rubric || [])}<span class="v6-gate-n">Результат попадёт в тетрадь. В «Сделали другие» — только если согласитесь.</span></div>
              <div class="v6-gate-r"><span class="v6-gate-rh">Рубрика</span>${(g.rubric || []).map((x) => `<span><span class="v6-mile-dot">${x.must ? '●' : '○'}</span><span>${e(x.criterion)}${x.must ? '' : ' <i>· по желанию</i>'}</span></span>`).join('')}</div></section>` : ''}
          </div>`;
        } else {
          body = `<div class="v6-fwbody"><section class="v6-box v6-fwsoon"><h2>Карточка пишется</h2><p>Здесь появятся шаги, пример, частые ошибки, ИИ-исполнитель${c.executorHint && EXEC.includes(c.executorHint) ? ` (${e(c.executorHint)})` : ''} и калитка с рубрикой. Пока — что известно.</p>
            <div class="v6-links">${c.source && c.source.author ? `<div><span>Источник</span><span>${e(c.source.author)}${c.source.book ? ', ' + e(c.source.book) : ''}</span></div>` : ''}<div><span>Раздел</span><span>${e(GROUP_T[c.group] || c.group)}</span></div>${c.label ? `<div><span>Метка</span><span>${e(c.label)}</span></div>` : ''}</div></section></div>`;
        }
        const links = [
          req.length ? ['Сначала', req.map(fwLink).join(', ')] : null,
          (c.related || []).map(fwById).filter(Boolean).length ? ['Рядом', (c.related || []).map(fwById).filter(Boolean).map(fwLink).join(', ')] : null,
          tasks.length ? ['Задачи', tasks.map((t) => `<a href="#task-${e(t.id)}" onclick="V6.openTask('${e(t.id)}','fw'); return false;">${e(t.title)}</a>`).join(', ')] : null,
          lessons.length ? ['Уроки', lessons.map((l) => `<a href="#lesson-${e(l)}" onclick="openLesson(${lessonArg(l)}); return false;">${e(lessonOf(l).title)}</a>`).join(', ')] : null,
          (c.sources || []).filter((u) => /^https?:\/\//.test(u)).length ? ['Источники', c.sources.filter((u) => /^https?:\/\//.test(u)).map((u) => `<a href="${e(u)}" target="_blank" rel="noopener">${e(u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(', ') + (c.checked && c.checked.date ? ` <span class="v6-meta">· сверено ${e(c.checked.date.split('-').reverse().join('.'))}</span>` : '')] : null,
        ].filter(Boolean);
        box.innerHTML = hero + body + `<div class="v6-fwbody">
          ${links.length ? `<section class="v6-box"><h2>Связи</h2><div class="v6-links">${links.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('')}</div></section>` : ''}
          ${!c.full && near.length ? `<section class="v6-tsec" style="padding-bottom:0"><h2 class="v6-h2">Рядом в этом направлении</h2>${fwGrid(near, 'fw')}</section>` : ''}
          ${c.agencyDoor ? `<div class="v6-doorbox"><span>${e(c.agencyDoor)}</span><a class="v6b is-soft v6-btn-lg" href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'fw' })">Узнать</a></div>` : ''}
        </div>`;
        if (c.full && c.executor && c.executor.defaults) {
          document.querySelectorAll('#v6-calc [data-in]').forEach((el) => { const d = c.executor.defaults[el.dataset.in]; if (d != null) el.value = String(d).replace('.', ','); });
        } else if (c.full && c.executor && c.executor.kind === 'calculator' && c.executor.inputs && c.example) {
          // подставить числа из примера карточки, если они там есть по порядку полей
          // «комиссия 25% — 500 ₽»: рубли сразу после процента — пересчёт, а не отдельное поле
          const nums = []; let prev = '';
          for (const mm of c.example.text.matchAll(/(\d[\d\s]*?)\s?(₽|%)/g)) { if (!(prev === '%' && mm[2] === '₽')) nums.push(mm[1].replace(/\s/g, '')); prev = mm[2]; }
          const inp = [...document.querySelectorAll('#v6-calc [data-in]')];
          if (nums.length >= inp.length) inp.forEach((el, i) => { el.value = nums[i]; });
        }
        if (document.getElementById('v6-calc')) calc();
      }).catch(() => fail('v6-fwp'));
    }, 'knowledge');
  }

  // ---------- обёртка урока (Lesson.dc.html, design/screens.md → Урок): текст урока не меняем ----------
  // renderLesson из index.html собирает .lesson-view как раньше; здесь его узел (с обработчиками) переезжает в каркас v6
  const lessonArgOf = (l) => (typeof l.id === 'number' ? String(l.id) : `'${l.id}'`);
  function lessonGroup(L) {
    if (typeof L.id === 'number') {
      const m = D.paths.main;
      if (m.commonStart.lessons.map(String).includes(String(L.id))) return { label: 'Главный путь', title: m.commonStart.title, ids: m.commonStart.lessons, foot: 'после урока 5 — развилка' };
      const lv = m.levels.find((x) => x.lessons.map(String).includes(String(L.id)));
      if (lv) return { label: `Главный путь · уровень ${lv.n}`, title: lv.title, ids: lv.lessons, foot: lv.milestone ? `Веха уровня: ${lv.milestone.title}` : '' };
      return { label: 'Главный путь', title: 'Уроки', ids: LESSONS.filter((x) => x.phase === L.phase).map((x) => x.id), foot: '' };
    }
    const t = (D.paths.trails || []).find((x) => x.id === L.track);
    return { label: 'Тропинка', title: t ? t.title : 'Тропинка', ids: TRACK_LESSONS.filter((x) => x.track === L.track).map((x) => x.id), foot: '' };
  }
  function lessonDone(id, next) {
    if (!done(id)) { const d = jget(KEY.dates); d[id] = new Date().toISOString(); jset(KEY.dates, d); toggleCompleted(/^\d+$/.test(String(id)) ? Number(id) : id); }
    if (next != null && next !== '') openLesson(/^\d+$/.test(String(next)) ? Number(next) : next);
  }
  function lessonNote(el, id) { const n = jget(KEY.notes); if (el.value.trim()) n[id] = { text: el.value, date: new Date().toISOString() }; else delete n[id]; jset(KEY.notes, n); }
  function lessonWrap(id) {
    const box = document.getElementById('lesson-content');
    const view = box && box.querySelector('.lesson-view');
    const L = findLesson(id);
    if (!view || !L) return;
    load().then(() => {
      if (box.querySelector('.v6-lesson') || !box.contains(view)) return;
      setPage(true, 'paths');
      const g = lessonGroup(L);
      const ids = g.ids.map((x) => (/^\d+$/.test(String(x)) ? Number(x) : x));
      const pos = ids.findIndex((x) => String(x) === String(L.id));
      const doneN = ids.filter(done).length;
      // соседи — как в старой навигации урока
      let prev, next;
      if (typeof L.id === 'number') { prev = LESSONS.find((l) => l.id === L.id - 1); next = LESSONS.find((l) => l.id === L.id + 1); }
      else { const tl = TRACK_LESSONS.filter((l) => l.track === L.track); const i = tl.findIndex((l) => l.id === L.id); prev = tl[i - 1]; next = tl[i + 1]; }
      const isDone = done(L.id);
      // из старой разметки: крошка, мета времени, действия, содержание
      view.querySelectorAll('.lcrumb, .lesson-actions').forEach((x) => x.remove());
      const meta = view.querySelector('.lesson-time-meta');
      const tags = meta ? [...meta.querySelectorAll('span:not(.dot)')].map((x) => x.textContent.trim()).filter(Boolean) : [];
      if (meta) meta.outerHTML = `<div class="v6-ltags">${tags.map((t, i) => `<span class="v6t${/обновлено/.test(t) ? '' : ' is-grey'}">${e(t)}</span>`).join('')}</div>`;
      const toc = view.querySelector('details.lesson-toc');
      const h1 = view.querySelector('h1');
      const crumbs = `<nav class="v6-crumbs v6-lcrumbs" aria-label="Где вы"><a onclick="V6.open('paths')">Пути</a><span>/</span><a onclick="${typeof L.id === 'number' ? "V6.openMainPath('lesson')" : `openSection('${e(L.track)}')`}">${e(g.title)}</a><span>/</span><span>${typeof L.id === 'number' ? 'Урок ' + L.id : 'Урок ' + (pos + 1)}</span></nav>`;
      if (h1) h1.insertAdjacentHTML('beforebegin', crumbs); else view.insertAdjacentHTML('afterbegin', crumbs);
      const step = (x, i) => { const l = findLesson(x); if (!l) return ''; const cur = String(x) === String(L.id), dn = done(x);
        const inner = `<span class="v6-dotc${dn ? ' is-done' : cur ? ' is-now' : ''}">${dn ? '✓' : ''}</span><span>${typeof x === 'number' ? x + '. ' : (i + 1) + '. '}${e(shortLessonLabel(l.title))}${l.content ? '' : ' <i>пишется</i>'}</span>`;
        return l.content && !cur ? `<a class="v6-lstep" href="#lesson-${e(x)}" onclick="openLesson(${lessonArgOf(l)}); return false;">${inner}</a>` : `<span class="v6-lstep${cur ? ' is-now' : ' is-off'}"${cur ? ' aria-current="step"' : ''}>${inner}</span>`; };
      const dots = ids.length <= 14 ? `<span class="v6-ldots" aria-hidden="true">${ids.map((x) => `<i class="${done(x) ? 'is-done' : String(x) === String(L.id) ? 'is-now' : ''}"></i>`).join('')}</span>` : '';
      const nextBtn = next ? (isDone ? `<button class="v6b v6-btn-lg" onclick="openLesson(${lessonArgOf(next)})">Дальше</button>` : `<button class="v6b v6-btn-lg" onclick="V6.lessonDone(${lessonArgOf(L)}, ${lessonArgOf(next)})">Урок пройден, дальше</button>`)
        : (isDone ? '<span class="v6t">Урок пройден ✓</span>' : `<button class="v6b v6-btn-lg" onclick="V6.lessonDone(${lessonArgOf(L)})">Урок пройден</button>`);
      const wrap = document.createElement('div');
      wrap.className = 'v6-page v6-lesson';
      wrap.innerHTML = `<div class="v6-lprog" aria-hidden="true"><i style="width:${ids.length ? Math.round(doneN / ids.length * 100) : 0}%"></i></div>
        <div class="v6c v6-lgrid">
          <aside class="v6-lside" aria-label="${e(g.title)}"><span class="v6-lside-l">${e(g.label)}</span><span class="v6-lside-t">${e(g.title)}</span><nav class="v6-lsteps">${ids.map(step).join('')}</nav>${g.foot ? `<span class="v6-lside-f">${e(g.foot)}</span>` : ''}</aside>
          <article class="v6-lsheet"></article>
          <aside class="v6-lright">
            <button class="v6-note" onclick="umTrack('alyosha-open', { from: 'lesson' }); aleshaToggle()"><span class="v6-ava">А</span><span>Застряли или хотите на своём примере? Спросите Алёшу.</span></button>
            <div class="v6-lnote"><span class="v6-lnote-h"><b>Тетрадь</b><span class="v6-meta">в этом браузере</span></span><label class="v6-sr" for="v6-ln">Заметка к уроку</label><textarea id="v6-ln" placeholder="Мысль, пример из работы, вопрос" oninput="V6.lessonNote(this, '${e(L.id)}')"></textarea></div>
            <div class="v6-ltoc-slot"></div>
          </aside>
        </div>
        <div class="v6-lbar"><div class="v6c v6-lbar-in"><span class="v6-lbar-l">${pos >= 0 ? `Урок ${pos + 1} из ${ids.length}` : e(g.title)} ${dots}</span>
          <span class="v6-lbar-r">${prev ? `<button class="v6b is-soft v6-btn-lg" onclick="openLesson(${lessonArgOf(prev)})">Назад</button>` : ''}${nextBtn}</span></div></div>`;
      wrap.querySelector('.v6-lsheet').appendChild(view);
      if (toc) { toc.open = true; toc.classList.add('v6-ltoc'); wrap.querySelector('.v6-ltoc-slot').appendChild(toc); }
      wrap.querySelector('#v6-ln').value = (jget(KEY.notes)[L.id] || {}).text || ls.get('v6-note-' + L.id) || '';
      const first = box.querySelector('.v6-first');
      box.innerHTML = '';
      box.appendChild(wrap);
      if (first) wrap.insertBefore(first, wrap.querySelector('.v6-lgrid'));
      const cur = wrap.querySelector('.v6-lstep.is-now');
      if (cur) cur.scrollIntoView({ block: 'nearest' });
    }).catch(() => {});
  }

  // ---------- юнит (Unit.dc.html; data/units.json → template) ----------
  // состояние в браузере: v6-units = { id: { step, inputs: {i: текст}, checks: {i: [bool]}, result: yes|almost|no, date, note } }
  const unitState = (id) => jget(KEY.units)[id] || { step: 0, inputs: {}, checks: {} };
  const unitSave = (id, st) => { const all = jget(KEY.units); all[id] = st; jset(KEY.units, all); };
  const hasSteps = (u) => u && Array.isArray(u.steps) && u.steps.length > 0;
  function askAlesha(title, question) {
    try { initAlesha({ id: 'v6', title }); } catch (_) {}
    const w = document.getElementById('alesha-widget'); if (w && !w.classList.contains('is-open')) w.classList.add('is-open');
    track('alyosha-open', { from: 'unit' });
    if (question) { try { aleshaAsk(question); } catch (_) {} }
  }
  function unitInput(id, i, el) { const st = unitState(id); st.inputs[i] = el.value; unitSave(id, st); }
  function unitCheck(id, i, j, el) { const st = unitState(id); (st.checks[i] = st.checks[i] || [])[j] = el.checked; unitSave(id, st); }
  function unitGo(id, step) { const st = unitState(id); st.step = step; unitSave(id, st); renderUnit(id); window.scrollTo({ top: 0 }); }
  function unitResult(id, r) {
    const st = unitState(id); st.result = r; st.date = new Date().toISOString(); unitSave(id, st);
    track('unit-result', { unit: id, result: r });
    renderUnit(id);
  }
  function unitNote(id, el) { const st = unitState(id); st.note = el.value; unitSave(id, st); }
  function unitHelp(id) {
    const u = unitById(id), st = unitState(id); const s = u.steps[Math.min(st.step, u.steps.length - 1)];
    askAlesha(u.title, `Делаю задачу «${u.title}», шаг «${s.title}». Не получается. Помоги разобраться: что проверить и как поправить?`);
  }
  function tgOfferBox() {
    const yes = Object.values(jget(KEY.units)).filter((x) => x.result === 'yes').length;
    const dec = ls.get(KEY.tgOffer);
    if (yes < 2 || (dec && Date.now() - new Date(dec).getTime() < 21 * 864e5)) return '';
    return `<div class="v6-tgoffer"><b>Уже ${yes} ${plural(yes, 'задача сделана', 'задачи сделаны', 'задач сделано')}.</b> Тетрадь живёт только в этом браузере. Сохранение через Telegram появится скоро, а пока можно скачать тетрадь файлом.
      <span><button class="v6b is-sm" onclick="V6.open('notebook')">Открыть тетрадь</button> <button class="v6-quiet" onclick="V6.tgLater(this)">Не сейчас</button></span></div>`;
  }
  function tgLater(btn) { ls.set(KEY.tgOffer, new Date().toISOString()); const b = btn.closest('.v6-tgoffer'); if (b) b.remove(); }
  function renderUnit(id) {
    const box = document.getElementById('v6-unit'); if (!box) return;
    const u = unitById(id), t = D.tasks[u.task];
    const st = unitState(id), n = u.steps.length, i = Math.min(st.step || 0, n - 1), s = u.steps[i];
    const fin = st.step >= n;
    const fws = (u.basedOn || []).map(fwById).filter(Boolean);
    const stepsNav = u.steps.map((x, k) => { const dn = fin || k < i, cur = !fin && k === i;
      return `<a class="v6-lstep${cur ? ' is-now' : ''}" href="#" onclick="V6.unitGo('${e(id)}', ${k}); return false;"><span class="v6-dotc${dn ? ' is-done' : cur ? ' is-now' : ''}">${dn ? '✓' : ''}</span><span>${e(x.title)}</span></a>`; }).join('');
    const prompt = s.prompt ? `<div class="v6-uprompt"><div class="v6-uprompt-h"><span class="v6-pcard-label">Промпт</span><button class="v6b is-sm is-soft" onclick="V6.copyText('v6-up-${i}', this)">Скопировать</button></div><pre id="v6-up-${i}">${e(s.prompt)}</pre></div>` : '';
    const input = s.input != null ? `<label class="v6-uinput"><span class="v6-meta">Ваш вариант</span><input type="text" value="${e(st.inputs[i] || '')}" placeholder="${e(s.input)}" oninput="V6.unitInput('${e(id)}', ${i}, this)"></label>` : '';
    const checks = s.checklist ? `<div class="v6-uchecks">${s.checklist.map((c, j) => `<label><input type="checkbox" ${(st.checks[i] || [])[j] ? 'checked' : ''} onchange="V6.unitCheck('${e(id)}', ${i}, ${j}, this)"><span>${e(c)}</span></label>`).join('')}</div>` : '';
    const card = fin ? (() => {
      if (st.result === 'yes') return `<div class="v6-ucard"><span class="v6-pcard-label">Готово</span><h2 class="v6-ucard-t">Получилось. Записано в тетрадь</h2><p>${e(u.result || '')}</p>
          <label class="v6-lnote"><span class="v6-lnote-h"><b>Что вышло</b><span class="v6-meta">в тетрадь</span></span><textarea placeholder="Что получилось, что поправили, что пригодится в следующий раз" oninput="V6.unitNote('${e(id)}', this)">${e(st.note || '')}</textarea></label>
          <span class="v6-btns"><a class="v6b v6-btn-lg" href="https://t.me/madzhitov" target="_blank" rel="noopener" onclick="umTrack('artifact-submit-click', { from: 'unit', unit: '${e(id)}' })">Показать результат</a><button class="v6b is-soft v6-btn-lg" onclick="V6.open('notebook')">Тетрадь</button><button class="v6b is-soft v6-btn-lg" onclick="V6.openRole('${e(t.group)}','unit')">Другие задачи</button></span>
          <p class="v6-meta">«Показать результат» — пришлите автору; с вашего согласия работа попадёт в «Сделали другие».</p>${tgOfferBox()}</div>`;
      if (st.result === 'almost') return `<div class="v6-ucard"><span class="v6-pcard-label">Почти</span><h2 class="v6-ucard-t">Частые причины</h2><ul class="v6-ualmost">${(u.almost || []).map((a) => `<li>${e(a)}</li>`).join('')}</ul>
          <span class="v6-btns"><button class="v6b v6-btn-lg" onclick="V6.unitGo('${e(id)}', 0)">Ещё раз</button><button class="v6b is-soft v6-btn-lg" onclick="V6.unitHelp('${e(id)}')">Спросить Алёшу</button><button class="v6b is-soft v6-btn-lg" onclick="V6.unitResult('${e(id)}','yes')">Теперь получилось</button></span></div>`;
      return `<div class="v6-ucard"><span class="v6-pcard-label">Шаг ${n} из ${n} пройден</span><h2 class="v6-ucard-t">Получилось?</h2><p>${e(u.result || '')}</p>
          <span class="v6-btns"><button class="v6b v6-btn-lg" onclick="V6.unitResult('${e(id)}','yes')">Да</button><button class="v6b is-soft v6-btn-lg" onclick="V6.unitResult('${e(id)}','almost')">Почти</button><button class="v6b is-soft v6-btn-lg" onclick="V6.unitResult('${e(id)}','no'); V6.unitHelp('${e(id)}')">Нет, помогите</button></span></div>`;
    })() : `<div class="v6-ucard"><span class="v6-pcard-label">Шаг ${i + 1} из ${n}</span><h2 class="v6-ucard-t">${e(s.title)}</h2><p>${e(s.text || '')}</p>${input}${prompt}${checks}
        <button class="v6-note" onclick="V6.unitHelp('${e(id)}')"><span class="v6-ava">А</span><span>Застряли на этом шаге? Спросите Алёшу.</span></button></div>`;
    box.innerHTML = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.openRole('${e(t.group)}','unit')">${e((role(t.group) || {}).title || '')}</a><span>/</span><a onclick="V6.openTask('${e(t.id)}','unit')">${e(t.title)}</a><span>/</span><span>Юнит</span></nav>
      <section class="v6-uhead">${u.review ? '<span class="v6-eyebrow">Черновик на согласовании</span>' : ''}<h1 class="v6-d">${e(u.title)}</h1><p class="v6-phero-lead">${e(u.result || '')}</p>
        <span class="v6-tags">${[u.minutes ? '≈ ' + u.minutes + ' мин' : '', u.level || '', ...(u.tools || []), u.noVpn ? 'без VPN' : ''].filter(Boolean).map((x) => `<span class="v6t is-grey">${e(x)}</span>`).join('')}${(u.needs || []).length ? `<span class="v6t">понадобится: ${e(u.needs.join(', '))}</span>` : ''}</span></section>
      <div class="v6-ugrid"><aside class="v6-lside"><span class="v6-lside-t">Шаги</span><nav class="v6-lsteps">${stepsNav}</nav>
          ${fws.length ? `<span class="v6-lside-l" style="padding-top:16px">Опирается на</span>${fws.map((c) => `<a class="v6-lstep" href="#fw-${e(c.id)}" onclick="V6.openFw('${e(c.id)}','unit'); return false;"><span>${e(c.title)}</span></a>`).join('')}` : ''}</aside>
        <div>${card}</div></div>
      ${fin ? '' : `<div class="v6-lbar"><div class="v6c v6-lbar-in"><span class="v6-lbar-l">Шаг ${i + 1} из ${n}</span><span class="v6-lbar-r">${i > 0 ? `<button class="v6b is-soft v6-btn-lg" onclick="V6.unitGo('${e(id)}', ${i - 1})">Назад</button>` : ''}<button class="v6b v6-btn-lg" onclick="V6.unitGo('${e(id)}', ${i + 1})">${i + 1 < n ? 'Готово, дальше' : 'Готово'}</button></span></div></div>`}`;
  }
  function openUnit(id, from) {
    go('unit-' + id, () => {
      shell('<div class="v6c" id="v6-unit"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        const u = unitById(id);
        if (!hasSteps(u)) { const b = document.getElementById('v6-unit'); b.innerHTML = '<h1 class="v6-d" style="padding-top:56px">Юнит готовится</h1>'; return; }
        track('unit-open', { unit: id, from: from || 'link' });
        renderUnit(id);
      }).catch(() => fail('v6-unit'));
    }, 'tasks');
  }
  function copyText(elId, btn) {
    const t = (document.getElementById(elId) || {}).innerText || '';
    try { navigator.clipboard.writeText(t).then(() => { btn.textContent = 'Скопировано'; setTimeout(() => { btn.textContent = 'Скопировать'; }, 1600); }); } catch (_) {}
  }

  // ---------- тетрадь (Notebook.dc.html) — вместо «Моего пути», только в этом браузере ----------
  const NB = { q: '', f: 'all' };
  function notebookEntries() {
    const out = [];
    const dates = jget(KEY.dates), notes = jget(KEY.notes);
    Object.keys(progress || {}).filter((k) => progress[k] === true).forEach((k) => { const l = lessonOf(k); if (!l) return;
      const note = (notes[k] || {}).text || ls.get('v6-note-' + k) || '';
      out.push({ type: 'lesson', id: k, title: l.title, label: /^\d+$/.test(k) ? 'Урок ' + k : 'Урок', date: dates[k] || (notes[k] || {}).date || null, text: note, open: `openLesson(${lessonArg(k)})` }); });
    Object.keys(notes).filter((k) => !(progress || {})[k]).forEach((k) => { const l = lessonOf(k); if (!l) return;
      out.push({ type: 'note', id: k, title: l.title, label: 'Заметка к уроку', date: notes[k].date, text: notes[k].text, open: `openLesson(${lessonArg(k)})` }); });
    const units = jget(KEY.units);
    Object.keys(units).filter((k) => units[k].result).forEach((k) => { const u = D && unitById(k); if (!u) return;
      out.push({ type: 'unit', id: k, title: u.title, label: { yes: 'Юнит · получилось', almost: 'Юнит · почти', no: 'Юнит · нужна помощь' }[units[k].result], date: units[k].date, text: units[k].note || '', open: `V6.openUnit('${k}','notebook')` }); });
    const checks = jget(KEY.checks);
    Object.keys(checks).forEach((k) => { const c = checks[k]; const [kind, ref] = k.split(':');
      out.push({ type: 'check', id: k, title: (c.title || '').replace(/^(Веха|Калитка): /, ''), label: (kind === 'veha' ? 'Веха' : 'Калитка') + (c.verdict ? ` · Алёша: ${c.verdict}` : ' · без проверки'), date: c.date, text: c.text || '', reply: c.reply || '',
        open: kind === 'veha' ? `V6.openVeha(${ref.split('-').pop()},'notebook')` : `V6.openFw('${ref}','notebook')` }); });
    return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }
  function nbList() {
    const box = document.getElementById('v6-nblist'); if (!box) return;
    const q = NB.q.trim().toLowerCase();
    const all = notebookEntries();
    const list = all.filter((x) => (NB.f === 'all' || (NB.f === 'lesson' ? (x.type === 'lesson' || x.type === 'note') : NB.f === 'unit' ? x.type === 'unit' : NB.f === 'alesha' ? !!x.reply : x.type === NB.f)) && (!q || (x.title + ' ' + x.text).toLowerCase().includes(q)));
    const day = (d) => { if (!d) return 'Без даты'; const x = new Date(d), t = new Date(); const diff = Math.floor((new Date(t.toDateString()) - new Date(x.toDateString())) / 864e5); return diff === 0 ? 'Сегодня' : diff === 1 ? 'Вчера' : x.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); };
    if (!all.length) { box.innerHTML = `<div class="v6-nbempty"><h2 class="v6-ucard-t">Тетрадь пока пуста</h2><p>Сюда попадают пройденные уроки, сделанные задачи и ваши заметки к урокам.</p><button class="v6b v6-btn-lg" onclick="V6.open('roles')">Выбрать задачу</button></div>`; return; }
    if (!list.length) { box.innerHTML = `<p class="v6-lead">Ничего не нашлось. <button class="v6-quiet" onclick="V6.askAlesha('Тетрадь', '${e(NB.q).replace(/'/g, '')}')">Спросить Алёшу</button></p>`; return; }
    let last = '';
    box.innerHTML = list.map((x) => { const d = day(x.date), head = d !== last ? `<span class="v6-nbday">${e(d)}</span>` : ''; last = d;
      return `${head}<article class="v6-nbitem"><span class="v6-pcard-label">${e(x.label)}</span><a class="v6-nbitem-t" href="#" onclick="${x.open}; return false;">${e(x.title)}</a>${x.text ? `<p>${e(x.text.length > 400 ? x.text.slice(0, 400) + '…' : x.text)}</p>` : ''}${x.reply ? `<div class="v6-nbreply"><span class="v6-ava">А</span><span>${aleshaMarkdown(x.reply.length > 500 ? x.reply.slice(0, 500) + '…' : x.reply)}</span></div>` : ''}
        ${x.text ? `<button class="v6-quiet" onclick="V6.askAlesha(${JSON.stringify(x.title).replace(/"/g, '&quot;')}, ${JSON.stringify('Моя заметка к «' + x.title + '»: ' + x.text + '\nСверь, правильно ли я понял, и подскажи, что улучшить.').replace(/"/g, '&quot;')})">Показать Алёше</button>` : ''}</article>`; }).join('');
  }
  function nbFilter(f, el) { NB.f = f; document.querySelectorAll('[data-nbf]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.nbf === f))); nbList(); }
  function nbSearch(el) { NB.q = el.value; nbList(); }
  const NB_KEYS = () => [STORAGE_KEY, KEY.units, KEY.notes, KEY.dates, KEY.checks, KEY.role, KEY.channels];
  function nbExport() {
    const data = { app: 'artefakty', version: 1, date: new Date().toISOString(), keys: {} };
    NB_KEYS().forEach((k) => { const v = ls.get(k); if (v != null) data.keys[k] = v; });
    Object.keys(localStorage).filter((k) => k.startsWith('v6-note-')).forEach((k) => { data.keys[k] = ls.get(k); });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = `artefakty-tetrad-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    track('notebook-export', {});
  }
  function nbImport(input) {
    const f = input.files && input.files[0]; if (!f) return;
    f.text().then((t) => {
      const data = JSON.parse(t);
      if (!data || data.app !== 'artefakty' || !data.keys) throw new Error('bad');
      if (!confirm('Загрузить тетрадь из файла? Текущие записи в этом браузере заменятся записями из файла.')) return;
      Object.entries(data.keys).forEach(([k, v]) => { if (NB_KEYS().includes(k) || k.startsWith('v6-note-')) ls.set(k, v); });
      track('notebook-import', {});
      location.reload();
    }).catch(() => alert('Это не файл тетради «Артефактов».'));
  }
  function nbReset() {
    if (!confirm('Очистить тетрадь в этом браузере? Сотрутся пройденные уроки, сделанные задачи и заметки. Отменить нельзя — сначала можно скачать файл.')) return;
    NB_KEYS().forEach((k) => { try { localStorage.removeItem(k); } catch (_) {} });
    Object.keys(localStorage).filter((k) => k.startsWith('v6-note-')).forEach((k) => { try { localStorage.removeItem(k); } catch (_) {} });
    track('notebook-reset', {});
    location.reload();
  }
  function notebookPage() {
    shell('<div class="v6c" id="v6-nb"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
    load().then(() => {
      const r = resume();
      const pill = (f, t) => `<button type="button" class="v6-pill" data-nbf="${f}" aria-pressed="${NB.f === f}" onclick="V6.nbFilter('${f}', this)">${t}</button>`;
      document.getElementById('v6-nb').innerHTML = `<section class="v6-sechero"><div><h1 class="v6-d">Тетрадь</h1><p class="v6-lead">История вашего обучения: пройденные уроки, сделанные задачи и заметки.</p></div></section>
        <div class="v6-nbgrid"><div><div class="v6-kfilters" style="margin:32px 0 24px"><label class="v6-nbsearch"><span class="v6-sr">Поиск по тетради</span><input type="search" placeholder="Поиск по заметкам" value="${e(NB.q)}" oninput="V6.nbSearch(this)"></label><div class="v6-pills">${pill('all', 'Всё')}${pill('lesson', 'Уроки')}${pill('unit', 'Задачи')}${pill('check', 'Вехи и калитки')}${pill('alesha', 'С ответом Алёши')}</div></div><div id="v6-nblist"></div></div>
          <aside class="v6-side" style="padding-top:32px">${r && r.id != null ? `<div class="v6-neigh"><span class="v6-meta">Продолжить</span><a class="v6-neigh-i" href="#" onclick="openLesson(${lessonArg(r.id)}); return false;"><span>${e(r.title || '')}</span><span class="m">→</span></a></div>` : ''}
            <div class="v6-tdoor"><b>Тетрадь только в этом браузере</b><span>Очистка браузера сотрёт записи. Скачайте файл, чтобы не потерять; сохранение через Telegram появится скоро.</span>
              <span class="v6-btns"><button class="v6b is-white is-sm" onclick="V6.nbExport()">Скачать как файл</button><label class="v6b is-sm v6-nbload">Загрузить из файла<input type="file" accept="application/json,.json" onchange="V6.nbImport(this)" hidden></label></span>
              <button class="v6-quiet v6-nbreset" onclick="V6.nbReset()">Очистить всё</button></div></aside></div>`;
      nbList();
    }).catch(() => fail('v6-nb'));
  }

  // ---------- сверка по рубрике (Вехи, калитка карточки): Алёша через тот же /api/alesha, результат — в тетрадь ----------
  // v6-checks = { 'veha:seller-1' | 'gate:<fw>': { title, text, verdict: 'зачтено'|'почти'|null, reply, date } }
  const RUBRICS = {};
  function rubricBox(key, title, task, rubric) {
    RUBRICS[key] = { title, task, rubric };
    const prev = jget(KEY.checks)[key] || {};
    return `<div class="v6-rub" data-key="${e(key)}"><label class="v6-sr" for="rub-${e(key)}">Ваша работа</label>
      <textarea id="rub-${e(key)}" class="v6-rub-in" placeholder="Вставьте свой документ, таблицу или ссылку и пару слов о том, что сделали">${e(prev.text || '')}</textarea>
      <span class="v6-btns"><button class="v6b is-accent v6-btn-lg" onclick="V6.rubricRun('${e(key)}', this)">Показать Алёше</button><button class="v6b is-soft v6-btn-lg" onclick="V6.rubricSave('${e(key)}')">Только в тетрадь</button></span>
      <div class="v6-rub-out" aria-live="polite">${prev.verdict ? rubricOut(prev) : prev.text ? '<span class="v6-meta">Сохранено в тетрадь без проверки.</span>' : ''}</div></div>`;
  }
  function rubricOut(c) {
    return `<span class="v6t${c.verdict === 'зачтено' ? '' : ' is-grey'}">Алёша · ${e(c.verdict)}</span><div class="v6-rub-reply">${aleshaMarkdown(c.reply || '')}</div><span class="v6-meta">Записано в тетрадь${c.date ? ' · ' + new Date(c.date).toLocaleDateString('ru-RU') : ''}</span>`;
  }
  function rubricStore(key, patch) { const all = jget(KEY.checks); all[key] = Object.assign({ title: (RUBRICS[key] || {}).title }, all[key] || {}, patch, { date: new Date().toISOString() }); jset(KEY.checks, all); return all[key]; }
  function rubricSave(key) {
    const box = document.querySelector(`.v6-rub[data-key="${key}"]`); const text = box.querySelector('textarea').value.trim();
    if (!text) { box.querySelector('textarea').focus(); return; }
    rubricStore(key, { text });
    box.querySelector('.v6-rub-out').innerHTML = '<span class="v6-meta">Сохранено в тетрадь без проверки.</span>';
  }
  async function rubricRun(key, btn) {
    const r = RUBRICS[key], box = document.querySelector(`.v6-rub[data-key="${key}"]`), out = box.querySelector('.v6-rub-out');
    const text = box.querySelector('textarea').value.trim();
    if (!text) { box.querySelector('textarea').focus(); return; }
    rubricStore(key, { text });
    btn.disabled = true; out.innerHTML = '<span class="v6-meta">Алёша сверяет по рубрике…</span>';
    const must = r.rubric.filter((c) => c.must).map((c) => '• ' + c.criterion).join('\n');
    const opt = r.rubric.filter((c) => !c.must).map((c) => '• ' + c.criterion).join('\n');
    const context = `Сверка работы ученика по рубрике.\nЗадание: ${r.task}\nОбязательные критерии:\n${must}${opt ? `\nПо желанию:\n${opt}` : ''}`;
    const question = `Сверь мою работу по рубрике. Ответь строго в формате:\nВЕРДИКТ: зачтено или почти\n+ критерий — коротко, почему выполнен\n- критерий — что добавить\nСОВЕТ: одно предложение.\n«Зачтено» — только если выполнены все обязательные критерии.\n\nМоя работа:\n${text.slice(0, 4000)}`;
    try {
      const res = await fetch(ALESHA_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonTitle: r.title, lessonText: context, history: [], question }) });
      if (!res.ok) throw new Error(res.status === 429 ? 'limit' : 'http');
      const reader = res.body.getReader(), dec = new TextDecoder(); let acc = '';
      for (;;) { const { done: fin, value } = await reader.read(); if (fin) break; acc += dec.decode(value, { stream: true }); out.innerHTML = `<div class="v6-rub-reply">${aleshaMarkdown(acc)}</div>`; }
      const m = acc.match(/ВЕРДИКТ:\s*(зачтено|почти)/i);
      const c = rubricStore(key, { verdict: m ? m[1].toLowerCase() : 'почти', reply: acc.replace(/\**\s*ВЕРДИКТ:[^\n]*\n?/i, '').replace(/^\s*\*\*\s*$/gm, '').trim() });
      out.innerHTML = rubricOut(c);
      track('rubric-check', { key, verdict: c.verdict });
    } catch (err) {
      out.innerHTML = `<span class="v6-meta">${err.message === 'limit' ? 'Алёша на сегодня устал: лимит вопросов в час. Работа сохранена в тетрадь, покажите позже.' : 'Алёша сейчас недоступен. Работа сохранена в тетрадь, покажите позже.'}</span>`;
    } finally { btn.disabled = false; }
  }
  // Веха пути продавца: #veha-seller-<n>
  function openVeha(n, from) {
    go('veha-seller-' + n, () => {
      shell('<div class="v6c" id="v6-veha"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        const sp = D.paths.rolePaths.find((p) => p.role === 'seller'); const st = sp.stages.find((x) => String(x.n) === String(n));
        if (!st || !st.milestone) { document.getElementById('v6-veha').innerHTML = '<h1 class="v6-d" style="padding-top:56px">Такой Вехи нет</h1>'; return; }
        const m = st.milestone; track('veha-open', { stage: n, from: from || 'link' });
        document.getElementById('v6-veha').innerHTML = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('paths')">Пути</a><span>/</span><a onclick="V6.openSellerPath('veha')">${e(sp.title)}</a><span>/</span><span>Веха этапа ${e(n)}</span></nav>
          <section class="v6-uhead"><span class="v6-eyebrow">Веха этапа ${e(n)} · ${e(st.title)}</span><h1 class="v6-d">${e(m.title)}</h1><p class="v6-phero-lead">${e(m.gives || '')}</p></section>
          <div class="v6-ugrid"><aside class="v6-lside"><span class="v6-lside-t">Рубрика</span>${(m.rubric || []).map((c) => `<span class="v6-lstep"><span class="v6-mile-dot">${c.must ? '●' : '○'}</span><span>${e(c.criterion)}${c.must ? '' : ' <i>по желанию</i>'}</span></span>`).join('')}<span class="v6-lside-f">● обязательно · ○ по желанию</span></aside>
            <div class="v6-ucard"><span class="v6-pcard-label">Соберите и покажите</span><h2 class="v6-ucard-t">${e(m.title)}</h2><p>Соберите документ по шагам этапа: ${st.steps.filter((x) => !x.optional).map((x) => x.title).join(', ')}. Вставьте его сюда, и Алёша сверит по рубрике.</p>
              ${rubricBox('veha:seller-' + n, `Веха: ${m.title}`, m.gives || m.title, m.rubric || [])}
              ${m.agencyDoor ? `<p class="v6-meta">${e(m.agencyDoor)} · <a href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'veha' })">Узнать</a></p>` : ''}</div></div>`;
      }).catch(() => fail('v6-veha'));
    }, 'paths');
  }

  // ---------- полезные вещи (resources.json + content): чек-лист, калькулятор, инструмент, промпты, шаблон-файл ----------
  const resById = (id) => (D.resources || []).find((r) => r.id === id);
  const resReady = (r) => !!(r && r.content);
  function resCheck(id, key, el) { const st = jget('v6-res-' + id); st[key] = el.checked; jset('v6-res-' + id, st); }
  function funnel() {
    const box = document.getElementById('v6-funnel'); if (!box) return;
    const r = resById('r-funnel-tool'), c = r.content;
    const val = (p, id) => { const el = box.querySelector(`[data-p="${p}"][data-in="${id}"]`); const v = parseFloat(String(el && el.value || '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(v) ? v : null; };
    const rows = c.conversions.map((cv) => {
      const at = (p) => { const v = {}; c.inputs.forEach((i) => { v[i.id] = val(p, i.id); }); return Object.values(v).some((x) => x == null) && cv.expr.match(/[a-z_]+/g).some((k) => v[k] == null || v[k] === 0) ? null : evalExpr(cv.expr, v); };
      const now = at(0), prev = at(1); const ch = now != null && prev ? (now / prev - 1) * 100 : null;
      return { cv, now, prev, ch };
    });
    const worst = rows.filter((x) => x.ch != null && x.ch < 0).sort((a, b) => a.ch - b.ch)[0];
    const fmt = (x, d = 1) => (x == null || !Number.isFinite(x) ? '—' : x.toLocaleString('ru-RU', { maximumFractionDigits: d }));
    box.querySelector('.v6-funnel-out').innerHTML = `<div class="v6-restable"><table><tr><th>Переход</th><th>${e(c.periods[0])}</th><th>${e(c.periods[1])}</th><th>Изменение</th></tr>${rows.map((x) => `<tr class="${x === worst ? 'is-min' : ''}"><td>${e(x.cv.label)}</td><td>${fmt(x.now)}%</td><td>${fmt(x.prev)}%</td><td>${x.ch == null ? '—' : (x.ch > 0 ? '+' : '') + fmt(x.ch, 0) + '%'}</td></tr>`).join('')}</table></div>
      ${worst ? `<div class="v6-tgoffer"><b>Самый большой провал: ${e(worst.cv.label)} (${fmt(worst.ch, 0)}%).</b>${worst.cv.reads ? `<span>${e(worst.cv.reads)}</span>` : ''}${worst.cv.fixWhere ? `<span>Где чинить: ${e(worst.cv.fixWhere)}</span>` : ''}</div>` : '<p class="v6-meta" style="margin:0">Падений по сравнению с прошлым периодом нет.</p>'}`;
  }
  function openRes(id, from) {
    go('res-' + id, () => {
      shell('<div class="v6c" id="v6-res"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        const r = resById(id), box = document.getElementById('v6-res');
        if (!r) { box.innerHTML = '<h1 class="v6-d" style="padding-top:56px">Такой вещи нет</h1>'; return; }
        track('res-open', { res: id, from: from || 'link' });
        const c = r.content || {};
        const fws = (r.basedOn || []).map(fwById).filter(Boolean);
        const head = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.openSellerPath('res')">От селлера к бренду</a><span>/</span><a onclick="V6.openSellerPath('res')">Набор продавца</a><span>/</span><span>${e(r.title)}</span></nav>
          <section class="v6-uhead"><span class="v6-eyebrow">${e(RES_KIND[r.kind] || r.kind)}</span><h1 class="v6-d">${e(r.title)}</h1><p class="v6-phero-lead">${e(c.intro || r.gives || '')}</p>
            ${fws.length ? `<span class="v6-tags">${fws.map((f) => `<a class="v6t is-grey" href="#fw-${e(f.id)}" onclick="V6.openFw('${e(f.id)}','res'); return false;">метод · ${e(f.title)}</a>`).join('')}</span>` : ''}</section>`;
        if (!resReady(r)) { box.innerHTML = head + '<div class="v6-ucard"><h2 class="v6-ucard-t">Скоро</h2><p>Эта вещь готовится.</p></div>'; return; }
        const howto = (c.howto || []).length ? `<div class="v6-box"><h2>Как пользоваться</h2><div class="v6-fwsteps">${c.howto.map((h, i) => `<div><span class="n">${i + 1}</span><span><span>${e(h)}</span></span></div>`).join('')}</div></div>` : '';
        let main = '';
        if (r.kind === 'checklist') {
          const st = jget('v6-res-' + id);
          main = `<div class="v6-box v6-reslist">${(c.groups || []).map((g, gi) => `<h2>${e(g.title)}</h2><div class="v6-uchecks">${g.items.map((it, ii) => `<label><input type="checkbox" ${st[gi + '-' + ii] ? 'checked' : ''} onchange="V6.resCheck('${e(id)}','${gi}-${ii}',this)"><span>${e(it)}</span></label>`).join('')}</div>`).join('')}
            <span class="v6-btns v6-noprint"><button class="v6b is-soft v6-btn-lg" onclick="window.print()">Распечатать</button></span></div>`;
        } else if (r.kind === 'calculator' && c.executor) {
          const ex = c.executor;
          main = `<section class="v6-exec"><div class="v6-exec-h"><h2>Посчитайте свой случай</h2><span class="v6t">калькулятор</span></div>
            <div id="v6-calc"><div class="v6-calc-in">${ex.inputs.map((i) => `<label>${e(i.label)}<span><input type="text" inputmode="decimal" data-in="${e(i.id)}" value="" placeholder="0" oninput="V6.calc()"><i>${e(i.unit || '')}</i></span></label>`).join('')}</div>
            <div class="v6-calc-out"><div class="v6-calc-top"><span>${e((ex.result || {}).label || 'Результат')}</span><span class="v6-calc-n"></span></div><p class="v6-meta" style="margin:0">${e(ex.formula || '')}</p></div></div></section>
            ${c.example ? `<div class="v6-box"><h2>Пример</h2><p class="v6-fw-ex">${e(c.example)}</p></div>` : ''}`;
        } else if (id === 'r-funnel-tool' && c.inputs) {
          const pp = c.periods || ['Сейчас', 'Прошлый период'];
          main = `<section class="v6-exec" id="v6-funnel"><div class="v6-exec-h"><h2>Вставьте числа за два периода</h2><span class="v6t">инструмент · считается в браузере</span></div>
            <div class="v6-funnel-in"><span></span>${pp.map((p) => `<b>${e(p)}</b>`).join('')}${c.inputs.map((i) => `<span>${e(i.label)}</span>${pp.map((p, pi) => `<input type="text" inputmode="numeric" aria-label="${e(i.label)}, ${e(p)}" data-p="${pi}" data-in="${e(i.id)}" value="${e(((c.defaults || {})[p] || {})[i.id] ?? '')}" oninput="V6.funnel()">`).join('')}`).join('')}</div>
            <div class="v6-calc-out v6-funnel-out"></div>${c.biggestDrop ? `<p class="v6-meta" style="margin:0">${e(c.biggestDrop)}</p>` : ''}</section>
            ${(c.cautions || []).length ? `<div class="v6-box"><h2>Осторожно</h2>${c.cautions.map((x) => `<div class="v6-dotrow"><span class="v6-dot is-ink"></span><span>${e(x)}</span></div>`).join('')}</div>` : ''}
            ${c.example ? `<div class="v6-box"><h2>Пример</h2><p class="v6-fw-ex">${e(c.example)}</p></div>` : ''}`;
        } else if ((r.kind === 'tool' || r.kind === 'prompt-set') && (c.prompt || c.prompts)) {
          const ps = c.prompts || [{ title: 'Промпт', when: '', prompt: c.prompt }];
          main = ps.map((pp, i) => `<section class="v6-exec"><div class="v6-exec-h"><h2>${e(pp.title)}</h2><button class="v6b is-sm is-soft" onclick="V6.copyText('v6-rp-${i}', this)">Скопировать</button></div>${pp.when ? `<p class="v6-meta" style="margin:0">${e(pp.when)}</p>` : ''}<pre class="v6-prompt" id="v6-rp-${i}">${e(pp.prompt)}</pre></section>`).join('') +
            ((c.columns || []).length ? `<div class="v6-box"><h2>Что получится</h2><div class="v6-restable"><table><tr>${c.columns.map((x) => `<th>${e(x.title || x)}</th>`).join('')}</tr></table></div></div>` : '');
        } else if (r.kind === 'template') {
          const file = r.file;
          main = (c.sheets || []).map((sh) => `<div class="v6-box"><h2>${e(sh.name)}</h2><div class="v6-restable"><table><tr>${sh.columns.map((x) => `<th>${e(x.title)}</th>`).join('')}</tr>${(sh.rows || []).slice(0, 3).map((row) => `<tr>${row.map((v, i) => `<td>${v == null ? `<i>${sh.columns[i].kind === 'formula' ? 'формула' : ''}</i>` : e(v)}</td>`).join('')}</tr>`).join('')}</table></div>${(sh.notes || []).map((n) => `<p class="v6-meta">${e(n)}</p>`).join('')}</div>`).join('') +
            (c.doc ? `<div class="v6-box">${c.doc.sections.map((sec) => `<h2>${e(sec.title)}</h2><p>${e(sec.hint || '')}</p>${sec.example ? `<p class="v6-fw-ex">${e(sec.example)}</p>` : ''}`).join('')}</div>` : '') +
            (file ? `<div class="v6-doorbox"><span>${file.endsWith('.docx') ? 'Документ Word: откроется в Word, Google Документах и «Мой Офис».' : 'Таблица Excel с готовыми формулами: откроется в Excel, Google Таблицах и «Мой Офис».'}</span><a class="v6b v6-btn-lg" href="v6/files/${e(file)}" download onclick="umTrack('res-download', { res: '${e(id)}' })">Скачать файл</a></div>` : '');
        }
        box.innerHTML = head + `<div class="v6-fwbody">${main}${howto}</div>`;
        if (r.kind === 'calculator' && c.executor) { fwCur = { executor: c.executor, full: true }; document.querySelectorAll('#v6-calc [data-in]').forEach((el) => { const d = (c.executor.defaults || {})[el.dataset.in]; if (d != null) el.value = String(d).replace('.', ','); }); calc(); }
        if (id === 'r-funnel-tool') funnel();
      }).catch(() => fail('v6-res'));
    }, 'paths');
  }

  // ---------- маршрутизация ----------
  const PAGES = { roles: rolesPage, tasks: tasksPage, paths: pathsPage, knowledge: knowledgePage, notebook: notebookPage };
  function open(name) {
    if (name === 'home') { openStaticPage('home'); return; }
    go(name, PAGES[name], name);
  }
  function route(hash) {
    if (PAGES[hash]) { open(hash); return true; }
    let m = hash.match(/^role-([a-z]+)$/); if (m) { openRole(m[1], 'link'); return true; }
    m = hash.match(/^task-([a-z0-9.-]+)$/); if (m) { openTask(m[1], 'link'); return true; }
    if (hash === 'path-seller') { openSellerPath('link'); return true; }
    if (hash === 'path-main') { openMainPath('link'); return true; }
    if (hash === 'path-product') { openProductPath('link'); return true; }
    if (hash === 'path-marketing') { openMarketingPath('link'); return true; }
    m = hash.match(/^fw-([a-z0-9-]+)$/); if (m) { openFw(m[1], 'link'); return true; }
    m = hash.match(/^unit-([a-z0-9-]+)$/); if (m) { openUnit(m[1], 'link'); return true; }
    m = hash.match(/^veha-seller-(\d)$/); if (m) { openVeha(m[1], 'link'); return true; }
    m = hash.match(/^res-([a-z0-9-]+)$/); if (m) { openRes(m[1], 'link'); return true; }
    return false;
  }

  // «Вы здесь впервые» (состояние F): пришёл прямой ссылкой на урок, прогресса и роли нет
  let entryHash = '';
  function firstVisitNote(id) {
    if (anyProgress() || ls.get(KEY.role) || prevVisit) return;
    if (!/^#lesson-/.test(entryHash)) return;
    try { if (sessionStorage.getItem('v6-first-seen')) return; } catch (_) {}
    const box = document.getElementById('lesson-content');
    if (!box || box.querySelector('.v6-first')) return;
    const div = document.createElement('div');
    div.className = 'v6-first';
    div.innerHTML = `<div><p><b>Вы здесь впервые.</b> Это один из уроков бесплатной платформы «Артефакты».</p><p>Совсем с нуля? Начните с общего старта — пять уроков базы.</p><a onclick="openLesson(1)">Общий старт →</a><a onclick="V6.open('roles')">Подобрать по роли →</a></div><button type="button" aria-label="Закрыть" onclick="this.parentNode.remove()">×</button>`;
    box.prepend(div);
    try { sessionStorage.setItem('v6-first-seen', '1'); } catch (_) {}
  }

  function install() {
    entryHash = location.hash;
    if (!entryHash || entryHash === '#home') { const h = document.querySelector('.v6h'); if (h) h.classList.add('is-logo-anim'); }
    prevVisit = ls.get(KEY.last);
    ls.set(KEY.last, new Date().toISOString());
    // уход на урок, раздел, глоссарий, квиз — снять оболочку v6
    ['openLesson', 'openSection', 'openGlossary', 'openQuiz'].forEach((fn) => {
      const orig = window[fn];
      if (typeof orig !== 'function') return;
      window[fn] = function () { setPage(false, null); const r = orig.apply(this, arguments); if (fn === 'openLesson') firstVisitNote(arguments[0]); return r; };
    });
    const osp = window.openStaticPage;
    window.openStaticPage = function (name) {
      if (name === 'routes') return open('roles');   // ia/migration.md: Маршруты → внутри ролей
      if (name === 'trails') return open('paths');   // Тропинки → Пути
      if (name === 'my-progress') return open('notebook');   // «Мой путь» → Тетрадь (этап 2)
      if (PAGES[name]) return open(name);
      setPage(name === 'home', null);
      return osp.apply(this, arguments);
    };
    const rl = window.renderLesson;
    if (typeof rl === 'function') window.renderLesson = function (id) { const r = rl.apply(this, arguments); try { lessonWrap(id); } catch (_) {} return r; };
    window.renderHome = home;
    window.renderFooter = footer;
    footer();
    // смена «#…» без перезагрузки (ссылка, ручной ввод): у старого сайта реакции не было
    window.addEventListener('hashchange', () => {
      const h = location.hash.slice(1);
      if (route(h)) return;
      const m = h.match(/^lesson-(\d+|[a-z]\d+)$/);
      if (m) { openLesson(/^\d+$/.test(m[1]) ? Number(m[1]) : m[1]); return; }
      // старые адреса — как при загрузке страницы (index.html, разбор адреса в init)
      let x;
      if ((x = h.match(/^quiz-(\d+)$/))) { openQuiz(Number(x[1])); return; }
      if ((x = h.match(/^section-(main|claude|projects|industry|everyday|vibe)$/))) { openSection(x[1]); return; }
      if ((x = h.match(/^glossary-(.+)$/))) { openGlossary(x[1]); return; }
      if (h === 'glossary') { openGlossary(); return; }
      if (['about', 'howto', 'faq', 'changelog', 'resources', 'my-progress', 'routes', 'trails', 'artifacts'].includes(h)) { openStaticPage(h); return; }
      if (h === 'home' || h === '') openStaticPage('home');
    });
  }

  window.V6 = { install, route, open, lessonDone, lessonNote, openRes, resCheck, funnel, openVeha, rubricRun, rubricSave, openUnit, unitGo, unitInput, unitCheck, unitResult, unitNote, unitHelp, askAlesha, copyText, tgLater, nbFilter, nbSearch, nbExport, nbImport, nbReset, openTask, openRole, openSellerPath, openMainPath, openProductPath, openMarketingPath, openFw, openKnowledge, kf, calc, copyPrompt, chooseRole, fork, ask, channels, toggleMenu, closeMenu };
})();
