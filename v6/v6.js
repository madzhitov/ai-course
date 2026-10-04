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

  // ---------- данные ----------
  let D = null, loading = null;
  function load() {
    if (D) return Promise.resolve(D);
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
    if (!loading) {
      const get = (f) => fetch(`v6/data/${f}.json`).then((r) => r.ok ? r.json() : Promise.reject(new Error(f + ' ' + r.status)));
      loading = Promise.all(['roles', 'paths', 'tasks', 'units'].map(get)).then(([roles, paths, tasks, units]) => {
        const allTasks = {};
        tasks.groups.forEach((g) => (g.directions || []).forEach((d) => (d.tasks || []).forEach((t) => {
          allTasks[t.id] = Object.assign({ group: g.id, direction: d }, t);
        })));
        D = { roles: roles.roles, paths, groups: tasks.groups, units: units.units, tasks: allTasks };
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
    const row = (n, title, ids) => `<li class="${curIn(ids) ? 'is-now' : ''}"><span class="n">${n}</span><span>${e(title)}</span><span class="c">${curIn(ids) ? 'сейчас · ' : ''}${cnt(ids)}</span></li>`;
    const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
    const stageCnt = (st) => `${st.tasks.filter(taskDone).length}/${st.tasks.length}`;
    const proj = TRACK_LESSONS.filter((l) => l.track === 'projects');
    return `<section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">Пути</h2><p>Общий старт для всех, потом каждый идёт своей дорогой. Тропинки — короткие ветки рядом.</p></div><button class="v6-link" onclick="V6.open('paths')">Все пути →</button></div>
      <div class="v6-grid3">
        <div class="v6-card v6-chapter"><div class="v6-ph" aria-hidden="true">[3D: лестница]</div><span class="v6-meta">Главный путь</span><h3 class="v6-h3">${e(D.paths.main.title)}</h3>
          <ul class="v6-rows">${row('I.', 'Общий старт · база ИИ', cs)}${row('II.', lv[0].title, lv[0].lessons)}${row('III.', lv[1].title, lv[1].lessons)}</ul>
          <span class="v6-meta">4 уровня · каждый замыкается Вехой</span><button class="v6b is-soft is-sm" onclick="V6.open('paths')">Открыть путь</button></div>
        <div class="v6-card v6-chapter"><div class="v6-ph" aria-hidden="true">[3D: витрина магазина]</div><span class="v6-meta">Путь роли · новое</span><h3 class="v6-h3">${e(sp.title)}</h3>
          <ul class="v6-rows">${sp.stages.map((st, i) => `<li><span class="n">${['I.', 'II.', 'III.'][i]}</span><span>${e(st.title)}</span><span class="c">${stageCnt(st)}</span></li>`).join('')}</ul>
          <span class="v6-meta">для роли «Продаю онлайн»</span><button class="v6b is-soft is-sm" onclick="V6.chooseRole('seller','paths')">Открыть путь</button></div>
        <div class="v6-card v6-chapter"><div class="v6-ph" aria-hidden="true">[3D: шар]</div><span class="v6-meta">Тропинка</span><h3 class="v6-h3">Мини-проекты «За 1 час»</h3>
          <ul class="v6-rows"><li><span class="n">I.</span><span>Проекты с кодом за час</span><span class="c">${proj.filter((l) => done(l.id)).length}/${proj.length}</span></li></ul>
          <span class="v6-meta">сворачивает после уровня 1</span><button class="v6b is-soft is-sm" onclick="openSection('projects')">Открыть тропинку</button></div>
      </div></section>`;
  }

  function oftenBlock() {
    const rv = D.tasks['seller.customers.reviews'];
    const ru = unitsOf(rv.id).find((u) => u.result) || {};
    const e5 = lessonOf('e5'), p1 = lessonOf('p1');
    const card = (title, text, tags, on) => `<div class="v6-task"><h3>${e(title)}</h3><p>${e(text)}</p><div class="v6-tags">${tags.map((t) => `<span class="v6t">${e(t)}</span>`).join('')}</div><button class="v6b is-soft is-sm" onclick="${on}">Открыть задачу</button></div>`;
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
    return `<section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">Карта задач</h2><p>Восемь направлений по P&amp;L. Готовые задачи кликабельны, будущие помечены «скоро».</p></div></div>
      <div class="v6-dirs">${g.directions.map((d, i) => `<div class="v6-dir"><span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${e(d.title)}</h3>
        ${d.tasks.map((t) => t.status === 'soon' ? `<span class="is-soon"><span>${e(t.title)}</span><span class="v6-meta">скоро</span></span>`
          : `<a onclick="V6.openTask('${e(t.id)}','role')"><span>${taskDone(t.id) ? '✓ ' : ''}${e(t.title)}</span><span class="v6-meta">${taskReady(t.id) ? (taskMins(t.id) || '→') : 'в работе'}</span></a>`).join('')}</div>`).join('')}</div></section>`;
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
          body = `<div class="v6-role-hero"><div><span class="v6t">Роль · новое</span><h1 class="v6-d" style="margin-top:20px !important">${e(r.title)}</h1>
              <p class="v6-lead">Маркетплейсы и свои каналы. Задачи разложены так, как через бизнес проходят деньги.</p>
              <fieldset style="border:0;padding:0;margin:28px 0 0"><legend class="v6-meta">Где продаёте</legend><div class="v6-check">${chans.map((c, i) => `<label><input type="checkbox" value="${e(c)}" ${ch.includes(c) ? 'checked' : ''} onchange="V6.channels(this)">${e(c)}</label>`).join('')}</div></fieldset>${pick}</div>
              <div class="v6-ph" aria-hidden="true">[3D: пакет с покупкой]</div></div>
            ${t ? `<section class="v6-sec" style="margin-top:56px"><div class="v6-dark v6-dark-row"><div><span class="v6-meta">Следующая задача для вашего магазина</span><h2 class="v6-h2" style="margin-top:12px !important">${e(t.title)}</h2></div><button class="v6b is-accent" onclick="V6.openTask('${e(t.id)}','role')">Начать</button></div></section>` : ''}
            ${mapBlock()}
            <section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">Путь роли</h2><p>${e(sp.title)}: маркетплейс, свой канал, единая система по деньгам.</p></div></div>
              <div class="v6-grid3">${sp.stages.map((st, i) => `<div class="v6-card"><span class="v6-meta">${['I', 'II', 'III'][i]}</span><h3 class="v6-h3" style="margin:8px 0 12px !important">${e(st.title)}</h3><ul class="v6-rows">${st.tasks.map((tid) => { const tt = D.tasks[tid]; return `<li><span class="n">${taskDone(tid) ? '✓' : '·'}</span><span>${tt.status === 'soon' ? e(tt.title) : `<a onclick="V6.openTask('${e(tid)}','role')">${e(tt.title)}</a>`}</span><span class="c">${tt.status === 'new' ? 'в работе' : ''}</span></li>`; }).join('')}</ul></div>`).join('')}</div></section>
            <p class="v6-door v6-sec" style="margin-top:56px">Для команд: обучим менеджеров маркетплейсов или внедрим ИИ под ключ. <a href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'role-seller' })">Для компаний →</a></p>`;
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
            ${group ? `<section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">Задачи роли</h2><p>Направления и задачи уже разложены. Способы решения появятся.</p></div></div><div class="v6-dirs">${group.directions.filter((d) => r.id !== 'project' || /prioritize|manage/.test(d.id)).map((d) => `<div class="v6-dir"><h3>${e(d.title)}</h3>${(d.tasks || []).map((t) => `<span class="is-soon"><span>${e(t.title)}</span><span class="v6-meta">скоро</span></span>`).join('')}</div>`).join('')}</div></section>` : ''}`;
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
        ${others.map((g) => `<section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">${e(g.title)}</h2><p>Задачи разложены, способы решения появятся.</p></div></div><div class="v6-dirs">${g.directions.map((d) => `<div class="v6-dir"><h3>${e(d.title)}</h3>${(d.tasks || [{ title: 'Задачи направления' }]).map((t) => `<span class="is-soon"><span>${e(t.title)}</span><span class="v6-meta">скоро</span></span>`).join('')}</div>`).join('')}</div></section>`).join('')}`;
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
        const way = (u) => {
          const meta = [u.minutes ? `≈ ${u.minutes} мин` : '', u.level || '', u.noVpn ? 'без VPN' : ''].filter(Boolean);
          if (u.fromLesson && lessonOf(u.fromLesson) && lessonOf(u.fromLesson).content) {
            return `<div class="v6-way"><span class="v6-meta">по уроку ${e(u.fromLesson)}</span><h3>${e(u.title)}</h3><p>${e(lessonOf(u.fromLesson).title)}</p>${meta.length ? `<div class="v6-tags">${meta.map((m) => `<span class="v6t">${e(m)}</span>`).join('')}</div>` : ''}<button class="v6b is-sm" style="align-self:flex-start" onclick="openLesson(${lessonArg(u.fromLesson)})">Начать</button></div>`;
          }
          return `<div class="v6-way is-soon"><span class="v6-meta">скоро</span><h3>${e(u.title)}</h3><p>Этот способ готовится.</p></div>`;
        };
        box.innerHTML = `<nav class="v6-crumbs" aria-label="Хлебные крошки"><a onclick="V6.chooseRole('seller','task')">Продаю онлайн</a><span>/</span><span>${e(t.direction.title)}</span><span>/</span><span>Задача</span></nav>
          <div class="v6-role-hero" style="padding-top:16px"><div><h1 class="v6-d">${e(t.title)}</h1>
            ${result ? `<h2 class="v6-h3" style="margin-top:32px !important">Что получите</h2><p class="v6-lead" style="margin-top:12px">${e(result)}</p>` : t.status === 'soon' ? '<p class="v6-lead">Задача готовится — скоро здесь появятся способы её решить.</p>' : ''}</div>
            <div class="v6-ph" aria-hidden="true">[3D: объект задачи]</div></div>
          <section class="v6-sec" style="margin-top:56px"><div class="v6-hero" style="padding-top:0;grid-template-columns:minmax(0,2fr) minmax(0,1fr)"><div>
            <h2 class="v6-h2" style="margin-bottom:24px !important">Выберите способ</h2>
            ${us.length ? `<div class="v6-grid2">${us.map(way).join('')}</div>` : '<div class="v6-way is-soon"><h3>Способы появятся</h3><p>Для этой задачи пока нет готового юнита.</p></div>'}</div>
            <aside class="v6-side"><button class="v6-note" onclick="umTrack('alyosha-open', { from: 'task' }); aleshaToggle()"><span class="v6-ava">А</span><span>Застряли или не знаете, с чего начать? Спросите, подскажу.</span></button>
              ${neigh.length ? `<div class="v6-card" style="padding:24px"><span class="v6-meta">Соседние задачи</span><ul class="v6-rows" style="margin-top:8px">${neigh.map((x) => `<li><span class="n">·</span><span>${x.status === 'soon' ? e(x.title) : `<a onclick="V6.openTask('${e(x.id)}','task')">${e(x.title)}</a>`}</span><span class="c">${x.status === 'soon' ? 'скоро' : ''}</span></li>`).join('')}</ul></div>` : ''}
              ${door ? `<p class="v6-door">${e(door)}. <a href="${COMPANIES_URL}" target="_blank" rel="noopener" onclick="umTrack('agency-door', { from: 'task' })">Узнать →</a></p>` : ''}
            </aside></div></section>`;
      }).catch(() => fail('v6-task'));
    }, 'tasks');
  }

  // ---------- Пути ----------
  function pathsPage() {
    shell('<div class="v6c" id="v6-paths"><p class="v6-lead" style="padding-top:56px">Загружается…</p></div>');
    load().then(() => {
      const r = resume();
      const lArg = lessonArg(r.id);
      const m = D.paths.main;
      const step = (id) => { const l = lessonOf(id); if (!l) return ''; const now = String(r.id) === String(id) && !done(id);
        return `<li class="${done(id) ? 'is-done' : now ? 'is-now' : ''}"><a onclick="openLesson(${lessonArg(id)})"><span class="dot">${done(id) ? '✓' : ''}</span><span>${e(id)}. ${e(l.title)}</span><span class="v6-meta">${done(id) ? 'пройден' : now ? 'сейчас' : l.content ? (l.duration ? l.duration + ' мин' : '') : 'пишется'}</span></a></li>`; };
      const cnt = (ids) => `${ids.filter(done).length}/${ids.length}`;
      const isHere = (ids) => ids.map(String).includes(String(r.id));
      const level = (lv) => { const ph = PHASES.find((p) => p.id === lv.n); const quiz = typeof QUIZZES !== 'undefined' && QUIZZES[lv.n];
        return `<div class="v6-card v6-chapter" ${isHere(lv.lessons) ? 'style="box-shadow:inset 0 0 0 3px var(--accent)"' : ''}><span class="v6-meta">Уровень ${lv.n}${isHere(lv.lessons) ? ' · вы здесь' : ''}</span><h3 class="v6-h3">${e(lv.title)}</h3><p style="margin:0;color:var(--text-2)">${e(ph ? ph.subtitle : '')}</p>
          <ul class="v6-rows"><li><span class="n">уроки</span><span>${lv.lessons.filter((id) => lessonOf(id) && lessonOf(id).content).length} готово из ${lv.lessons.length}</span><span class="c">${cnt(lv.lessons)}</span></li></ul>
          <p class="v6-veha">Веха · ${lv.milestone ? `<a class="v6-link" onclick="openLesson(${lessonArg(lv.milestone.lesson)})">${e(lv.milestone.title)}</a>` : 'появится вместе с уроками'}</p>
          ${lv.note ? `<span class="v6t is-grey">${e(lv.note)}</span>` : ''}
          <div style="display:flex;gap:12px;flex-wrap:wrap"><button class="v6b is-soft is-sm" onclick="openSection('main')">Уроки уровня</button>${quiz ? `<button class="v6-link" onclick="openQuiz(${lv.n})">Проверка уровня →</button>` : ''}</div></div>`; };
      const trailWhere = { 'level-1': 'ответвляется после уровня 1', 'common-start': 'сразу после общего старта', 'level-2': 'рядом с уровнем 2' };
      const sp = D.paths.rolePaths.find((p) => p.role === 'seller');
      document.getElementById('v6-paths').innerHTML = `<div class="v6-role-hero"><div><h1 class="v6-d">Пути</h1><p class="v6-lead">Главный путь ведёт от первых промптов к своим ИИ-приложениям. Пути ролей — к результату в работе. Тропинки — короткие ветки рядом.</p></div><div class="v6-ph" aria-hidden="true">[3D: лестница]</div></div>
        <section class="v6-sec" style="margin-top:56px"><div class="v6-dark v6-dark-row"><div><span class="v6-meta">Главный путь · вы здесь, ${e(typeof r.id === 'number' ? 'урок ' + r.id : r.title)}</span><h2 class="v6-h2" style="margin-top:12px !important">${e(m.title)}</h2><p style="margin-top:12px;max-width:560px">Общий старт из пяти уроков, потом четыре уровня. Каждый замыкается Вехой — вещью, собранной своими руками.</p></div>
          <div style="display:flex;gap:12px;flex-wrap:wrap"><button class="v6b is-accent" onclick="openLesson(${lArg})">Продолжить ${typeof r.id === 'number' ? 'урок ' + r.id : ''}</button><button class="v6b is-white" onclick="openSection('main')">Все уроки</button></div></div>
          <div class="v6-ph v6-soon" style="height:160px;margin-top:20px">[схема пути — делает Руслан]</div></section>
        <section class="v6-sec"><div class="v6-grid2">
          <div class="v6-card v6-chapter" ${isHere(m.commonStart.lessons) ? 'style="box-shadow:inset 0 0 0 3px var(--accent)"' : ''}><span class="v6-meta">Общий старт · для всех${isHere(m.commonStart.lessons) ? ' · вы здесь' : ''}</span><h3 class="v6-h3">База ИИ</h3><p style="margin:0;color:var(--text-2)">Без этого не работают юниты ни одной роли.</p><ul class="v6-steps">${m.commonStart.lessons.map(step).join('')}</ul><p class="v6-veha">${e(m.commonStart.note)}</p></div>
          ${m.levels.map(level).join('')}
        </div></section>
        <section class="v6-sec"><div class="v6-sec-head"><h2 class="v6-h2">Пути ролей</h2></div><div class="v6-grid2">
          <div class="v6-way"><span class="v6t">новое</span><h3>${e(sp.title)}</h3><p>${sp.stages.map((s) => s.title).join(', ')}.</p><button class="v6b is-sm" style="align-self:flex-start" onclick="V6.chooseRole('seller','paths')">Открыть путь</button></div>
          <div class="v6-way is-soon"><span class="v6-meta">скоро</span><h3>Пути продакта, проджекта и маркетолога</h3><p>Пока у этих ролей уроки и наборы задач.</p></div></div></section>
        <section class="v6-sec"><div class="v6-sec-head"><div><h2 class="v6-h2">Тропинки</h2><p>Ветки рядом с путём. Пройденное засчитывается и в пути, и в роли.</p></div></div><div class="v6-grid3">
          ${D.paths.trails.map((t) => { const ls2 = TRACK_LESSONS.filter((l) => l.track === t.id); return `<div class="v6-card v6-chapter" style="padding:12px 12px 24px"><div class="v6-ph" aria-hidden="true">[3D: ${e(t.title)}]</div><div style="padding:0 12px;display:flex;flex-direction:column;gap:10px"><span class="v6-meta">${t.branchAfter ? trailWhere[t.branchAfter] || '' : 'отдельный мир · открыт всем'}</span><h3 class="v6-h3" style="font-size:24px !important">${e(t.title)}</h3><span class="v6-meta">${ls2.filter((l) => done(l.id)).length}/${ls2.length} · ${t.hint ? e(t.hint) : 'без обязательной базы'}</span><button class="v6b is-soft is-sm" style="align-self:flex-start" onclick="openSection('${e(t.id)}')">Открыть</button></div></div>`; }).join('')}
        </div></section>`;
    }).catch(() => fail('v6-paths'));
  }

  // ---------- Знания (минимум 1а; полный раздел — этап 1б) ----------
  function knowledgePage() {
    shell(`<div class="v6c"><div style="padding-top:56px"><h1 class="v6-d">Знания</h1><p class="v6-lead">Почему всё работает: уроки, словарь и источники.</p></div>
      <div class="v6-grid2" style="margin-top:48px">
        <div class="v6-task"><h3>Библиотека уроков</h3><p>Все уроки курса по уровням и Тропинкам.</p><button class="v6b is-soft is-sm" onclick="openSection('main')">Открыть</button></div>
        <div class="v6-task"><h3>Глоссарий</h3><p>Термины ИИ простыми словами.</p><button class="v6b is-soft is-sm" onclick="openGlossary()">Открыть</button></div>
        <div class="v6-task"><h3>Источники</h3><p>Курсы, книги и документация, на которых стоят уроки.</p><button class="v6b is-soft is-sm" onclick="openStaticPage('resources')">Открыть</button></div>
        <div class="v6-task"><h3>Нейросети без VPN</h3><p>Живой список: что работает из России, что бесплатно.</p><a class="v6b is-soft is-sm" href="/tools/neyroseti-bez-vpn/">Открыть</a></div>
      </div></div>`);
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
  }

  window.V6 = { install, route, open, openTask, openRole, chooseRole, fork, ask, channels, toggleMenu, closeMenu };
})();
