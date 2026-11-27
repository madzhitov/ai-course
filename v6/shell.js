/* Шапка и подвал Артефактов (v6/shell/*.html) — одно поведение для приложения и статичных страниц.
   Ссылки с data-app — обычные адреса. В приложении клик перехватывается и открывает раздел без перезагрузки,
   на статичных страницах ссылка просто ведёт в приложение. Правило #2.10 в CLAUDE.md. */
(function () {
  'use strict';
  const isStatic = () => document.body.classList.contains('v6-static');
  const inApp = () => !isStatic() && window.V6;
  const menu = () => document.getElementById('v6-menu');
  const burger = () => document.getElementById('v6-burger');
  function setMenu(open) {
    const m = menu(), b = burger();
    if (m) m.classList.toggle('is-open', open);
    if (b) b.setAttribute('aria-expanded', String(open));
  }
  const track = (name, from) => { if (typeof window.umTrack === 'function') window.umTrack(name, { from }); };
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-track]');
    if (t) track(t.dataset.track, 'footer');
    const a = e.target.closest && e.target.closest('[data-app]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    const k = a.dataset.app;
    if (k === 'menu') {
      e.preventDefault();
      if (inApp() && typeof window.V6.toggleMenu === 'function') window.V6.toggleMenu();
      else setMenu(!(menu() && menu().classList.contains('is-open')));
      return;
    }
    setMenu(false);
    if (k === 'alesha') track('alyosha-open', a.dataset.from || 'header');
    if (!inApp()) return; // статичная страница: обычный переход по адресу
    e.preventDefault();
    if (k === 'home') window.openStaticPage('home');
    else if (k === 'alesha') window.aleshaToggle();
    else if (k === 'search') window.openSearchOverlay();
    else if (k === 'dict') window.V6.openDict();
    else if (k === 'ktools') window.V6.route('knowledge-tools');
    else if (k.startsWith('page:')) window.openStaticPage(k.slice(5));
    else window.V6.open(k);
  });
  // На статичной странице подсветить раздел в шапке по адресу
  function markActive() {
    if (!isStatic()) return;
    const p = location.pathname;
    const nav = /\/pochitat\//.test(p) ? 'reads' : /\/lessons\//.test(p) ? 'paths' : /\/zadaniya\//.test(p) ? 'tasks'
      : /\/(znaniya|slovar|metody|kalkulyatory|tools|instrumenty)\//.test(p) ? 'knowledge' : '';
    if (!nav) return;
    document.querySelectorAll(`.v6h-nav a[data-nav="${nav}"], #v6-menu a[data-nav="${nav}"]`).forEach((a) => { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markActive); else markActive();
})();
