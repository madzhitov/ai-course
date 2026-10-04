/* Артефакты v6 · этап 1а — каркас, главная A–F, роли, задачи, Пути, Знания.
   Бриф и данные: v6-brief/ (родительский репозиторий). Данные сайта — site/v6/data/*.json.
   Подхватывает функции index.html (LESSONS, findLesson, isCompleted, resumeLesson, openLesson,
   aleshaToggle, umTrack, CHANGELOG …) только в момент вызова. V6.install() зовётся из index.html
   после основного скрипта и до разбора адреса. */
(function () {
  'use strict';
  const KEY = { role: 'v6-role', channels: 'v6-channels', last: 'v6-last-visit' };
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
  const art = (name, cls) => `<div class="v6-art${cls ? ' ' + cls : ''}" aria-hidden="true"><img src="v6/art/${name}.svg" alt="" loading="lazy"></div>`;

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
  const taskDone = (taskId) => unitsOf(taskId).some((u) => u.fromLesson && done(u.fromLesson));
  const taskReady = (taskId) => unitsOf(taskId).some((u) => u.status === 'from-lesson' || u.status === 'ready');
  const taskMins = (taskId) => { const u = unitsOf(taskId).find((x) => x.minutes); return u ? `${u.minutes} мин` : ''; };

  const unitById = (id) => D.units.find((u) => u.id === id);
  const stepDone = (st) => { const u = st.kind === 'unit' && unitById(st.ref); return !!(u && u.fromLesson && done(u.fromLesson)); };
  const stepGo = (st) => {
    if (st.kind === 'page' && st.ref === 'neyroseti-bez-vpn') return "location.href='/tools/neyroseti-bez-vpn/'";
    const u = st.kind === 'unit' && unitById(st.ref);
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
  const fwOfTask = (t) => D.fw.filter((c) => c.task === t.id || c.task === t.direction.id || (c.tasks || []).includes(t.id)).sort(fwSort);
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
        <div><div class="v6f-word">Артефакты,<br>а не сертификаты.</div></div>
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

  function whoRows(limit) {
    const pick = limit ? ['seller', 'creator', 'self', 'product'] : D.roles.map((r) => r.id);
    return pick.map((id) => {
      const r = role(id);
      const title = (limit && id === 'product') ? 'Продакт или проджект' : r.title;
      return `<button type="button" class="v6-role-row" onclick="V6.chooseRole('${r.id}','home')"><span><b>${e(title)}${r.isNew ? ' <span class="v6t is-sm">новое</span>' : ''}</b><small>${e(r.description)}</small></span>${CHEV}</button>`;
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
    const proj = TRACK_LESSONS.filter((l) => l.track === 'projects');
    const card = (img, label, title, rows, foot) => `<article class="v6-pcard">${art(img)}<div class="v6-pcard-in"><span class="v6-pcard-label">${label}</span><h3>${e(title)}</h3>${rowList(rows)}<span class="v6-pcard-foot">${foot}</span></div></article>`;
    return `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Пути</h2><p>Общий старт для всех, потом каждый идёт своей дорогой. Тропинки — короткие ветки рядом.</p></div>
      <div class="v6-grid3">
        ${card('main-path', 'Главный путь', D.paths.main.title, [mainRow('I.', 'Общий старт · база ИИ', cs), mainRow('II.', lv[0].title, lv[0].lessons), mainRow('III.', lv[1].title, lv[1].lessons)], '4 уровня · каждый замыкается Вехой')}
        ${card('seller-path', 'Путь роли · новое', sp.title, sp.stages.map((st, i) => ({ n: ROMAN[i] + '.', t: st.title, c: stageCnt(st), on: "V6.openSellerPath('home')" })), 'для роли «Продаю онлайн»')}
        ${card('trail-projects', 'Тропинка', 'Мини-проекты «За 1 час»', [{ n: 'I.', t: 'Проекты с кодом за час', c: `${proj.filter((l) => done(l.id)).length}/${proj.length}`, on: "openSection('projects')" }], 'сворачивает после уровня 1')}
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
      document.getElementById('v6-roles').innerHTML = `<div style="padding-top:56px"><h1 class="v6-d">Кто вы?</h1>
          <p class="v6-lead">Выберите роль — покажем задачи и путь под неё. Сменить можно в любой момент.</p></div>
        <div class="v6-grid2" style="margin-top:40px">${D.roles.map((r) => `<button type="button" class="v6-role-row" onclick="V6.chooseRole('${r.id}','roles')"><span><b>${e(r.title)} ${r.isNew ? '<span class="v6t is-sm">новое</span>' : r.state === 'growing' ? '<span class="v6t is-sm is-grey">роль растёт</span>' : ''}</b><small>${e(r.description)}</small></span>${CHEV}</button>`).join('')}</div>`;
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
            <section class="v6-sec"><a class="v6-rolepath v6-rolepath-lg" href="#path-seller" onclick="V6.openSellerPath('role'); return false;">${art('role-seller-path')}<span class="v6-rolepath-in"><span class="v6-pcard-label">Путь роли</span><span class="v6-rolepath-t">${e(sp.title)}</span><span class="v6-rolepath-p">Три этапа: ${sp.stages.map((st) => st.title.toLowerCase()).join(', ')}.</span>
              <span class="v6-tags">${sp.stages.map((st) => `<span class="v6t is-grey">${e(st.title)}</span>`).join('')}</span><span><span class="v6b is-soft v6-btn-lg">Открыть путь</span></span></span></a></section>
            <section class="v6-sec"><div class="v6-doorbox"><span>Для команд: обучим менеджеров маркетплейсов или внедрим ИИ под ключ.</span><a class="v6b is-soft v6-btn-lg" href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'role-seller' })">Для компаний</a></div></section>`;
        } else {
          const ls_ = byNoCode(r.lessons || []).map(lessonOf).filter(Boolean);
          const routes = (typeof ROUTES !== 'undefined' ? ROUTES : []).filter((x) => (r.legacyRoutes || []).includes(x.id));
          const group = r.taskGroup ? D.groups.find((g) => g.id === r.taskGroup) : null;
          const ready = ls_.filter((l) => l.content);
          body = `<div class="v6-role-hero"><div><span class="v6t ${r.state === 'growing' ? 'is-grey' : ''}">${r.state === 'growing' ? 'Роль растёт' : 'Роль'}</span><h1 class="v6-d" style="margin-top:20px !important">${e(r.title)}</h1>
              <p class="v6-lead">${e(r.description)}.</p>${pick}</div><div class="v6-ph" aria-hidden="true">[3D: объект роли]</div></div>
            ${r.state === 'growing' ? `<section class="v6-sec" style="margin-top:56px"><div class="v6-card"><h2 class="v6-h3">Что уже есть и что будет</h2><p class="v6-lead" style="font-size:18px">Сейчас для этой роли ${ready.length} ${pluralUrok(ready.length)}${routes.length ? ` и ${routes.length === 1 ? 'готовый маршрут' : 'готовые маршруты'}` : ''}. Задачи и короткие юниты появятся — роль растёт.</p></div></section>` : ''}
            ${routes.length ? `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Готовые маршруты</h2></div><div class="v6-grid2">${routes.map((x) => `<div class="v6-task"><h3>${e(stripEmoji(x.title))}</h3><p>${e(x.description || '')}</p><span class="v6-meta">${e(x.meta || '')}</span><button class="v6b is-soft is-sm" onclick="openLesson(${lessonArg(x.lessons[0])})">Начать маршрут</button></div>`).join('')}</div></section>` : ''}
            ${r.id === 'creator' ? `<section class="v6-sec"><div class="v6-dark v6-dark-row"><div><span class="v6-meta">Путь роли</span><h2 class="v6-h2" style="margin-top:12px !important">${e(D.paths.main.title)}</h2><p style="margin-top:12px">Общий старт из пяти уроков, потом четыре уровня. Каждый замыкается Вехой.</p></div><button class="v6b is-accent" onclick="V6.open('paths')">Открыть путь</button></div></section>`
              : `<section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Уроки роли</h2></div><div class="v6-card"><ul class="v6-steps">${ls_.map((l) => l.content ? `<li class="${done(l.id) ? 'is-done' : ''}"><a onclick="openLesson(${lessonArg(l.id)})"><span class="dot">${done(l.id) ? '✓' : ''}</span><span>${e(l.title)}</span><span class="v6-meta">${l.duration ? l.duration + ' мин' : ''}</span></a></li>` : `<li><span class="row"><span class="dot"></span><span class="v6-meta">${e(l.title)}</span><span class="v6-meta">пишется</span></span></li>`).join('')}</ul></div></section>`}
            ${r.taskGroup === 'product' ? `<section class="v6-sec"><a class="v6-next v6-dark" href="#path-product" onclick="V6.openProductPath('role'); return false;"><span class="v6-next-in"><span class="v6-next-l">Путь роли · собирается</span><span class="v6-next-t">Путь продакта</span><span class="v6-next-p">${r.id === 'project' ? 'Для проджекта главное — этапы «Приоритизация» и «Управление работой».' : 'Исследование, приоритизация, метрики, управление работой.'}</span></span><span class="v6b is-accent v6-btn-xl">Открыть путь</span></a></section>` : ''}
            ${group ? `<section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">Задачи роли</h2><p>Направления и задачи уже разложены, к каждой — методы. Короткие способы решения появятся.</p></div></div><div class="v6-dirs">${group.directions.filter((d) => r.id !== 'project' || /prioritize|manage/.test(d.id)).map((d) => `<div class="v6-dir"><h3>${e(d.title)}</h3>${(d.tasks || []).map((t) => `<a class="v6-dr" href="#" onclick="V6.openTask('${e(t.id)}','role'); return false;"><span>${e(t.title)}</span><span class="m is-wip">скоро</span></a>`).join('')}</div>`).join('')}</div></section>` : ''}
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
      document.getElementById('v6-tasks').innerHTML = `<div style="padding-top:56px"><h1 class="v6-d">Задачи</h1><p class="v6-lead">С чем приходят. У каждой задачи — готовый результат и способы его получить.</p>${askForm('v6-ask-t')}</div>
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
          const ready = u.fromLesson && lessonOf(u.fromLesson) && lessonOf(u.fromLesson).content;
          const label = us.length > 1 ? (u.level === 'уверенный' ? 'Продвинутый' : 'Простой') : 'Способ';
          return `<article class="v6-way2${ready ? '' : ' is-soon'}"><span class="v6-pcard-label">${label}${ready ? '' : ' · скоро'}</span><h3>${e(u.title)}</h3>
            <p>${ready ? `По уроку ${e(u.fromLesson)}: ${e(lessonOf(u.fromLesson).title)}` : 'Этот способ готовится.'}</p>
            ${meta.length ? `<div class="v6-tags">${meta.map((m) => `<span class="v6t">${e(m)}</span>`).join('')}</div>` : ''}
            ${ready ? `<span><button class="v6b v6-btn-lg ${i ? 'is-soft' : ''}" onclick="openLesson(${lessonArg(u.fromLesson)})">Начать</button></span>` : ''}</article>`;
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
      const pp = productPath();
      const mine = ls.get(KEY.role);
      const started = anyProgress();
      const trailWhere = { 'level-1': 'ответвляется после уровня 1', 'common-start': 'сразу после общего старта', 'level-2': 'рядом с уровнем 2' };
      const trailArt = { projects: 'trail-projects-2', everyday: 'trail-everyday', industry: 'trail-industry', claude: 'trail-claude', vibe: 'trail-vibe' };
      const card = (o) => `<a class="v6-pathc" href="#${o.hash}" onclick="${o.on}; return false;">${art(o.art)}<span class="v6-pathc-in"><span class="v6-pcard-label">${o.label}${o.mine ? ' · <b>ваш</b>' : ''}</span><span class="v6-pathc-t">${e(o.title)}</span><span class="v6-pathc-p">${e(o.text)}</span>
        <span class="v6-tags">${o.chips.map((c, i) => `<span class="v6t${i || !o.accentFirst ? ' is-grey' : ''}">${e(c)}</span>`).join('')}</span><span class="v6-pathc-go">Открыть путь ${CHEV}</span></span></a>`;
      document.getElementById('v6-paths').innerHTML = `<section class="v6-phero"><div class="v6-phero-text"><span class="v6-eyebrow">Пути</span><h1 class="v6-d">Всё, что идёт по порядку</h1><p class="v6-phero-lead">Путь — порядок шагов к результату. Главный ведёт к своим ИИ-приложениям, пути ролей — к результату в работе. Выберите тот, что про вас; пройденное засчитывается везде.</p></div>${art('paths-hero', 'v6-phero-art')}</section>
        <section class="v6-psec"><div class="v6-pathgrid">
          ${card({ hash: 'path-main', on: "V6.openMainPath('paths')", art: 'main-path', label: 'Для всех', title: m.title, text: `Общий старт из ${m.commonStart.lessons.length} уроков и уровни: от первых промптов к своим приложениям.`, chips: [started ? (typeof r.id === 'number' ? 'вы на уроке ' + r.id : 'начат') : 'с нуля', `${m.levels.length} ${plural(m.levels.length, 'уровень', 'уровня', 'уровней')}`, `${m.levels.filter((l) => l.milestone).length} Вехи`], accentFirst: started, mine: mine === 'creator' })}
          ${card({ hash: 'path-seller', on: "V6.openSellerPath('paths')", art: 'seller-path', label: 'Продаю онлайн', title: sp.title, text: `Три этапа по деньгам: ${sp.stages.map((x) => x.promise).join(', ')}.`, chips: [`${sp.stages.length} этапа`, `${sp.stages.filter((x) => x.milestone).length} Вехи`, `${D.resources.length} полезных вещей`], mine: mine === 'seller' })}
          ${card({ hash: 'path-product', on: "V6.openProductPath('paths')", art: 'product-path', label: 'Продакт и проджект', title: pp.title, text: `${pp.stages.map((x, i) => i ? x.title.toLowerCase() : x.title).join(', ')}. Задачи и методы уже видны.`, chips: ['собирается', `${pp.stages.length} этапа`, `${pp.fwCount} методов`], accentFirst: true, mine: mine === 'product' || mine === 'project' })}
        </div>
        <p class="v6-pnote">Скоро: путь маркетолога. Пока у роли есть уроки, задачи и методы — <a href="#role-marketing" onclick="V6.openRole('marketing','paths'); return false;">открыть роль</a>.</p></section>
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
      const trailArt = { projects: 'trail-projects-2', everyday: 'trail-everyday', industry: 'trail-industry', claude: 'trail-claude', vibe: 'trail-vibe' };
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

  // ---------- путь продакта: каркас из данных (tasks.json · группа product + каталог фреймворков) ----------
  function productPath() {
    const g = D.groups.find((x) => x.id === 'product');
    const stages = g.directions.map((d, i) => ({ n: i + 1, id: d.id, title: d.title, tasks: d.tasks || [], fws: D.fw.filter((c) => c.task === d.id).sort(fwSort) }));
    return { title: 'Путь продакта', stages, fwCount: stages.reduce((n, st) => n + st.fws.length, 0) };
  }
  function openProductPath(from) {
    go('path-product', () => {
      shell('<div class="v6c" id="v6-pp"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
      load().then(() => {
        track('path-open', { path: 'product', from: from || 'link' });
        const pp = productPath();
        const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
        const lessons = [...new Set([...(role('product').lessons || []), ...(role('project').lessons || [])])].filter((id) => lessonOf(id));
        const stage = (st) => `<section class="v6-stage"><div class="v6-stage-head"><div><span class="v6-pcard-label">Этап ${st.n} · собирается${/prioritize|manage/.test(st.id) ? ' · и для проджекта' : ''}</span><h2 class="v6-pmain-h">${e(st.title)}</h2></div><span class="v6-pcard-label">${st.tasks.length} ${plural(st.tasks.length, 'задача', 'задачи', 'задач')} · ${st.fws.length} ${plural(st.fws.length, 'метод', 'метода', 'методов')}</span></div>
          <div class="v6-steps-list">${st.tasks.map((t) => `<div class="v6-step"><span class="v6-dotc"></span><div class="v6-step-b"><span class="v6-step-tags"><span class="v6t is-sm">задача</span><span class="v6-step-s">способ решения скоро</span></span><a class="v6-step-t" href="#task-${e(t.id)}" onclick="V6.openTask('${e(t.id)}','product-path'); return false;">${e(t.title)}</a></div><span class="v6-step-m"></span></div>`).join('')}</div>
          ${st.fws.length ? `<div class="v6-stage-fw"><span class="v6-pcard-label">Методы этапа</span><span class="v6-rchips">${st.fws.map((c) => `<a class="v6-rchip" href="#fw-${e(c.id)}" onclick="V6.openFw('${e(c.id)}','product-path'); return false;">${e(c.title)}</a>`).join('')}</span></div>` : ''}</section>`;
        document.getElementById('v6-pp').innerHTML = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('paths')">Пути</a><span>/</span><a onclick="V6.openRole('product','product-path')">Продакт</a><span>/</span><span>${e(pp.title)}</span></nav>
          <section class="v6-phero" style="padding-top:24px;padding-bottom:56px"><div class="v6-phero-text"><span class="v6-eyebrow">Путь роли · Продакт и проджект</span><h1 class="v6-d">${e(pp.title)}</h1>
            <p class="v6-phero-lead">Четыре этапа в том порядке, в каком идёт работа: ${pp.stages.map((x) => x.title.toLowerCase()).join(', ')}. Путь собирается: задачи и методы уже здесь, короткие способы и Вехи появятся.</p>
            <span class="v6-tags"><span class="v6t is-sm">собирается</span><span class="v6t is-sm is-grey">${pp.stages.length} этапа</span><span class="v6t is-sm is-grey">${pp.fwCount} методов</span></span></div>${art('product-path', 'v6-phero-art v6-sp-art')}</section>
          <div class="v6-sp-body">
            <section class="v6-prep"><span class="v6-prep-h">Подготовка · ${(sp.prep || []).reduce((n, x) => n + (x.minutes || 0), 0)} минут</span><div class="v6-prep-g">${(sp.prep || []).map((x) => { const go = stepGo(x); const inner = `<span class="v6-prep-l"><span class="v6-dotc"></span><span class="v6-prep-t">${e(x.title)}</span></span><span class="v6-prep-m">${e(STEP_KIND[x.kind] || x.kind)} · ${x.minutes} мин</span>`;
              return go ? `<a class="v6-prep-i" href="#" onclick="${go}; return false;">${inner}</a>` : `<span class="v6-prep-i">${inner}</span>`; }).join('')}</div></section>
            ${lessons.length ? `<section class="v6-prep"><span class="v6-prep-h">Уже можно пройти · уроки роли</span>${rowList(byNoCode(lessons).map((id, i) => { const l = lessonOf(id); return { n: String(i + 1), t: l.title, c: done(id) ? 'пройден' : l.content ? mins(id) : 'пишется', on: l.content ? `openLesson(${lessonArg(id)})` : null, done: done(id) }; }))}</section>` : ''}
            ${pp.stages.map(stage).join('')}
            <p class="v6-sp-note">Проджект идёт по этапам «Приоритизация» и «Управление работой». Задачи без готового способа открываются: на их странице — методы, которыми думать о задаче.</p>
          </div>`;
      }).catch(() => fail('v6-pp'));
    }, 'paths');
  }

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
        const chip = (r) => `<span class="v6-rchip"><span>${e(RES_KIND[r.kind] || r.kind)}</span>${e(r.title)}</span>`;
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
            ${m ? `<div class="v6-mile"><div class="v6-mile-l"><span class="v6-mile-e">Веха этапа ${st.n} · Алёша сверит по рубрике</span><span class="v6-mile-t">${e(m.title)}</span><span class="v6-mile-g">${e(m.gives || '')}</span><span><span class="v6-mile-b">Собрать ${e(m.title.charAt(0).toLowerCase() + m.title.slice(1))}</span> <span class="v6-mile-soon">скоро</span></span></div>
              <div class="v6-mile-r">${(m.rubric || []).map((c) => `<span><span class="v6-mile-dot">${c.must ? '●' : '○'}</span>${e(c.criterion)}</span>`).join('')}</div>${door(st)}</div>` : ''}</section>`;
        };
        const groups = [['Шаблоны', ['template']], ['Чек-листы', ['checklist']], ['Калькуляторы', ['calculator']], ['Инструменты', ['tool']], ['Промпты', ['prompt-set']]]
          .map(([t, kinds]) => [t, D.resources.filter((r) => kinds.includes(r.kind) && (r.roles || []).includes('seller'))]).filter(([, rs]) => rs.length);
        document.getElementById('v6-sp').innerHTML = `<nav class="v6-crumbs" aria-label="Где вы"><a onclick="V6.open('paths')">Пути</a><span>/</span><a onclick="V6.chooseRole('seller','seller-path')">Продаю онлайн</a><span>/</span><span>${e(sp.title)}</span></nav>
          <section class="v6-phero" style="padding-top:24px;padding-bottom:56px"><div class="v6-phero-text"><span class="v6-eyebrow">Путь роли · Продаю онлайн</span><h1 class="v6-d">${e(sp.title)}</h1>
            <p class="v6-phero-lead">Три этапа по деньгам: ${sp.stages.map((x) => x.promise).join(', ')}. Не уроки, а вещи для работы: юниты, методы, шаблоны, калькуляторы, чек-листы.</p>
            <span class="v6-tags"><span class="v6t is-sm">этап ${curStage.n} из ${sp.stages.length}</span><span class="v6t is-sm is-grey">${sp.stages.filter((x) => x.milestone).length} Вехи</span><span class="v6t is-sm is-grey">${D.resources.length} полезных вещей</span></span></div>${art('seller-path-hero', 'v6-phero-art v6-sp-art')}</section>
          <div class="v6-sp-body">
            <section class="v6-prep"><span class="v6-prep-h">Подготовка · ${(sp.prep || []).reduce((n, x) => n + (x.minutes || 0), 0)} минут</span><div class="v6-prep-g">${(sp.prep || []).map((x) => { const go = stepGo(x); const inner = `<span class="v6-prep-l"><span class="v6-dotc">${''}</span><span class="v6-prep-t">${e(x.title)}</span></span><span class="v6-prep-m">${e(STEP_KIND[x.kind] || x.kind)} · ${x.minutes} мин${go ? '' : ' · скоро'}</span>`;
              return go ? `<a class="v6-prep-i" href="#" onclick="${go}; return false;">${inner}</a>` : `<span class="v6-prep-i">${inner}</span>`; }).join('')}</div></section>
            ${sp.stages.map(stage).join('')}
            <section class="v6-kit"><div class="v6-sec-head"><h2 class="v6-psec-h">Набор продавца</h2><p>Пришли не учиться, а забрать таблицу? Всё полезное из пути — здесь, без порядка.</p></div>
              <div class="v6-kit-g">${groups.map(([t, rs]) => `<div class="v6-kit-c"><span class="v6-kit-h"><span>${e(t)}</span><span class="v6-meta">${rs.length}</span></span><div class="v6-kit-l">${rs.map((r) => `<span class="v6-kit-i"><span class="v6-kit-t">${e(r.title)}</span><span class="v6-kit-g2">${e(r.gives || '')}</span>${r.status === 'ready' ? '' : '<span class="v6-kit-s">скоро</span>'}</span>`).join('')}</div></div>`).join('')}</div>
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
  function calc() {
    const c = fwCur, box = document.getElementById('v6-calc');
    if (!c || !box) return;
    const v = {}; c.executor.inputs.forEach((i) => { v[i.id] = parseFloat(String((box.querySelector(`[data-in="${i.id}"]`) || {}).value || '0').replace(/\s/g, '').replace(',', '.')) || 0; });
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
          const exec = ex.kind === 'calculator' && ex.inputs && ex.inputs.length > 1 ? `<section class="v6-exec" aria-label="ИИ-исполнитель: калькулятор"><div class="v6-exec-h"><h2>Посчитайте свой случай</h2><span class="v6t">ИИ-исполнитель · калькулятор</span></div>
              <div id="v6-calc"><div class="v6-calc-in">${ex.inputs.map((i) => `<label>${e(i.label)}<span><input type="text" inputmode="decimal" data-in="${e(i.id)}" value="" placeholder="0" oninput="V6.calc()"><i>${e(i.unit || '')}</i></span></label>`).join('')}</div>
              <div class="v6-calc-out"><div class="v6-calc-top"><span>Остаётся с одной продажи</span><span class="v6-calc-n"></span></div><div class="v6-calc-bar"></div><div class="v6-calc-leg"></div><p class="v6-meta" style="margin:0">${e(ex.formula || '')}</p></div></div></section>`
            : ex.kind === 'prompt' ? `<section class="v6-exec" aria-label="ИИ-исполнитель: промпт"><div class="v6-exec-h"><h2>Заготовка запроса</h2><span class="v6t">ИИ-исполнитель · промпт${ex.noVpn ? ' · без VPN' : ''}</span></div><pre class="v6-prompt" id="v6-prompt">${e(ex.prompt || '')}</pre><span><button class="v6b v6-btn-lg" onclick="V6.copyPrompt(this)">Скопировать</button></span></section>` : '';
          const g = c.gate;
          body = `<div class="v6-fwbody">
            <div class="v6-fw2"><section class="v6-box"><h2>Когда применять</h2>${dots((c.when || {}).use || [], 'is-acc')}</section><section class="v6-box"><h2>Когда не надо</h2>${dots((c.when || {}).avoid || [], 'is-mute')}</section></div>
            <section class="v6-box"><h2>Шаги</h2><div class="v6-fwsteps">${(c.steps || []).map((x, i) => `<div><span class="n">${i + 1}</span><span><b>${e(x.title)}</b><span>${e(x.text)}</span></span></div>`).join('')}</div></section>
            ${exec}
            <div class="v6-fw2">${c.example ? `<section class="v6-box"><h2>Пример</h2><span><span class="v6t is-grey">${c.example.illustrative ? 'условный пример · ' : ''}${e(c.example.industry || '')}</span></span><p class="v6-fw-ex">${e(c.example.text)}</p></section>` : ''}${(c.mistakes || []).length ? `<section class="v6-box"><h2>Частые ошибки</h2>${dots(c.mistakes, 'is-ink')}</section>` : ''}</div>
            ${g ? `<section class="v6-gate"><div class="v6-gate-l"><span class="v6-gate-e"><span class="v6-ava">А</span>Калитка · Алёша сверит по рубрике</span><span class="v6-gate-t">${e(g.task)}</span><span><button class="v6b is-accent v6-btn-lg" onclick="umTrack('alyosha-open', { from: 'fw-gate' }); aleshaToggle()">Спросить Алёшу</button></span><span class="v6-gate-n">Сверка по рубрике и тетрадь появятся на следующем этапе. Пока Алёша подскажет в чате.</span></div>
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
        ].filter(Boolean);
        box.innerHTML = hero + body + `<div class="v6-fwbody">
          ${links.length ? `<section class="v6-box"><h2>Связи</h2><div class="v6-links">${links.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('')}</div></section>` : ''}
          ${!c.full && near.length ? `<section class="v6-tsec" style="padding-bottom:0"><h2 class="v6-h2">Рядом в этом направлении</h2>${fwGrid(near, 'fw')}</section>` : ''}
          ${c.agencyDoor ? `<div class="v6-doorbox"><span>${e(c.agencyDoor)}</span><a class="v6b is-soft v6-btn-lg" href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'fw' })">Узнать</a></div>` : ''}
        </div>`;
        if (c.full && c.executor && c.executor.kind === 'calculator' && c.executor.inputs && c.example) {
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

  // ---------- маршрутизация ----------
  const PAGES = { roles: rolesPage, tasks: tasksPage, paths: pathsPage, knowledge: knowledgePage };
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
    m = hash.match(/^fw-([a-z0-9-]+)$/); if (m) { openFw(m[1], 'link'); return true; }
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
      if (PAGES[name]) return open(name);
      setPage(name === 'home', null);
      return osp.apply(this, arguments);
    };
    window.renderHome = home;
    window.renderFooter = footer;
    footer();
    // смена «#…» без перезагрузки (ссылка, ручной ввод): у старого сайта реакции не было
    window.addEventListener('hashchange', () => {
      const h = location.hash.slice(1);
      if (route(h)) return;
      const m = h.match(/^lesson-(\d+|[a-z]\d+)$/);
      if (m) { openLesson(/^\d+$/.test(m[1]) ? Number(m[1]) : m[1]); return; }
      if (h === 'home' || h === '') openStaticPage('home');
    });
  }

  window.V6 = { install, route, open, openTask, openRole, openSellerPath, openMainPath, openProductPath, openFw, openKnowledge, kf, calc, copyPrompt, chooseRole, fork, ask, channels, toggleMenu, closeMenu };
})();
