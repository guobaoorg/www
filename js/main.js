import { HashSearch, State, Router, UI } from './core.js';

let _currentDestroyMap = null;
let _cachedMain = null;
let _cachedBreadcrumb = null;
const _hideBreadcrumbViews = new Set(['home', 'map', 'trail', 'provinces', 'tags', 'quiz', 'search']);

async function init() {
  UI.setupTheme();
  UI.setupEventListeners((url) => Router.navigateTo(url));
  _cachedMain = document.getElementById('mainContent');
  _cachedBreadcrumb = document.querySelector('.breadcrumb');
  Router.parseParams();
  window.addEventListener('route-change', () => {
    Router.parseParams();
    renderPage();
  });
  // Render immediately if meta is cached, update after fetch
  const metaPromise = State.initMeta();
  await renderPage();
  await metaPromise;
  // Defer background preload to idle time
  if (window.requestIdleCallback) {
    requestIdleCallback(() => startBgPreload(), { timeout: 3000 });
  } else {
    setTimeout(startBgPreload, 2000);
  }
}

function startBgPreload() {
  const meta = State.getProvinceMeta();
  if (!meta?.provinces) return;
  const provinceIds = [...meta.provinces.map(p => p.id), 'cross'];
  const trailFiles = (State.getTrailRegistry() || []).map(t => t.fileName).filter(Boolean);
  HashSearch.startBgPreload(provinceIds, trailFiles);
}

async function renderPage() {
  const mainContent = _cachedMain;
  const breadcrumb = _cachedBreadcrumb;
  const view = State.currentView;
  if (!mainContent) return;

  const hide = _hideBreadcrumbViews.has(view);
  if (breadcrumb) breadcrumb.style.display = hide ? 'none' : '';
  mainContent.style.paddingTop = (hide && view !== 'map') ? '60px' : '';

  window.scrollTo(0, 0);

  if (view !== 'home' && view !== 'map' && _currentDestroyMap) {
    _currentDestroyMap();
    _currentDestroyMap = null;
  }

  if (!Router._moduleCache[view]) {
    mainContent.innerHTML = '<div class="container"><div class="loading"><div class="loading__icon">🏛️</div><div>正在加载...</div></div></div>';
  }

  const pageModule = await Router.loadPageModule(view);

  if (pageModule) {
    const destroyMapFn = view === 'map' ? () => { if (pageModule.destroyMap) pageModule.destroyMap(); } : null;
    if (view === 'map') _currentDestroyMap = destroyMapFn;
    await pageModule.render(mainContent, destroyMapFn);
  } else {
    mainContent.innerHTML = '<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">页面未找到</div></div></div>';
  }

  UI.updateBreadcrumb();
  UI.updateActiveNav();
  if (!hide) UI.injectStructuredData();
}

document.addEventListener('DOMContentLoaded', init);
