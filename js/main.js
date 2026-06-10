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
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  Router.parseParams();
  window.addEventListener('route-change', () => {
    Router.parseParams();
    renderPage();
  });
  const metaPromise = State.initMeta();
  await renderPage();
  await metaPromise;
  if (State.currentView === 'home') {
    startBgPreload();
  }
}

function startBgPreload() {
  const meta = State.getProvinceMeta();
  if (!meta?.provinces) return;
  // 空闲时全量预加载，配合 localStorage 缓存实现秒开
  // 按文件大小从小到大预加载，优先填充小文件缓存
  const fileSizes = {
    'cross-province': 25.9, tianjin: 28.2, daily: 30.9, hainan: 41, ningxia: 41.1,
    guangxi: 63.8, heilongjiang: 66, qinghai: 70.4, chongqing: 75.4, shanghai: 76.6,
    xizang: 78.2, guangdong: 80.8, jilin: 83.9, taiwan: 87.9, jiangxi: 94.6, hubei: 94.8,
    macau: 100.1, xinjiang: 102.7, anhui: 103.8, gansu: 108.4, hongkong: 115.8, shaanxi: 116.9,
    guizhou: 117.4, liaoning: 143.9, fujian: 153.1, zhejiang: 153.3, neimenggu: 153.8,
    hebei: 154.1, beijing: 157.9, yunnan: 160, shandong: 163.4, hunan: 173.2, jiangsu: 185.9,
    henan: 187.9, sichuan: 241.8, shanxi: 397.6
  };
  let provinceIds = [...meta.provinces.map(p => p.id), 'cross'];
  provinceIds.sort((a, b) => {
    const sizeA = a === 'cross' ? fileSizes['cross-province'] : (fileSizes[a] || 0);
    const sizeB = b === 'cross' ? fileSizes['cross-province'] : (fileSizes[b] || 0);
    return sizeA - sizeB;
  });
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
