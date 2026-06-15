import { HashSearch, Config, State, Router, UI } from './core.js';

let _currentDestroyMap = null;
let _cachedMain = null;
let _cachedBreadcrumb = null;
const _hideBreadcrumbViews = new Set(['map', 'trail', 'provinces', 'tags', 'quiz', 'search']);

async function init() {
  UI.setupTheme();
  UI.setupEventListeners((url) => Router.navigateTo(url));
  _cachedMain = document.getElementById('mainContent');
  _cachedBreadcrumb = document.querySelector('.breadcrumb');
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  // GitHub Pages 404 SPA 回退：恢复被重定向的原始 URL
  const redirect = sessionStorage.getItem('gh-pages-redirect');
  if (redirect) {
    sessionStorage.removeItem('gh-pages-redirect');
    window.history.replaceState(null, '', redirect);
  }

  Router.parseParams();
  window.addEventListener('route-change', () => {
    Router.parseParams();
    renderPage();
  });
  const metaPromise = State.initMeta();
  await renderPage();
  await metaPromise;
  // 首次加载如果是首页，确保 meta 就绪后触发预加载（renderPage 内那次可能 meta 未就绪）
  if (State.currentView === 'map') startBgPreload();
}

function startBgPreload() {
  const meta = State.getProvinceMeta();
  if (!meta?.provinces) return;
  const provinceIds = meta.provinces.map(p => p.id);
  // Start background preloads sorted by file size (smallest first to fill cache quickly)
  const sorted = Config.getSortedProvinceIds(provinceIds);
  const trailFiles = (State.getTrailRegistry() || []).map(t => t.fileName).filter(Boolean);
  HashSearch.startBgPreload(sorted, trailFiles);
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

  if (view !== 'map' && _currentDestroyMap) {
    _currentDestroyMap();
    _currentDestroyMap = null;
  }

  if (!Router.hasModuleCache(view)) {
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

  // 首页渲染完成后，后台持续加载全站数据，加速其他页面打开
  if (view === 'map') startBgPreload();

  UI.updateBreadcrumb();
  UI.updateActiveNav();
  if (!hide) UI.injectStructuredData();
}

document.addEventListener('DOMContentLoaded', init);
