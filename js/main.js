import { State, Router, UI } from './core.js';

let _currentDestroyMap = null;
let _cachedMain = null;
let _cachedBreadcrumb = null;

async function init() {
  UI.setupTheme();
  UI.setupEventListeners((url) => Router.navigateTo(url));
  _cachedMain = document.getElementById('mainContent');
  _cachedBreadcrumb = document.querySelector('.breadcrumb');
  await State.initMeta();
  Router.parseParams();
  window.addEventListener('route-change', () => {
    Router.parseParams();
    renderPage();
  });
  await renderPage();
}

async function renderPage() {
  const mainContent = _cachedMain;
  const breadcrumb = _cachedBreadcrumb;
  const view = State.currentView;
  if (!mainContent) return;

  if (breadcrumb) breadcrumb.style.display = view === 'map' ? 'none' : '';

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
  UI.injectStructuredData();
}

document.addEventListener('DOMContentLoaded', init);
