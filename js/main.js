/**
 * 主入口文件 — 组装所有模块，初始化应用
 */
import HashSearch from './hash-search.js';
import Config from './config.js';
import State from './state.js';
import Router from './router.js';
import UI from './ui.js';

// 保存地图销毁函数引用
let _currentDestroyMap = null;

async function init() {
  UI.setupTheme();

  // 绑定事件监听
  UI.setupEventListeners((url) => Router.navigateTo(url));

  // 加载元数据
  await State.initMeta();

  // 解析初始路由
  Router.parseParams();

  // 监听路由变化
  window.addEventListener('route-change', () => {
    Router.parseParams();
    renderPage();
  });

  // 初始渲染
  await renderPage();
}

async function renderPage() {
  const breadcrumb = document.querySelector('.breadcrumb');
  const view = State.currentView;

  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;

  // 面包屑可见性
  if (breadcrumb) {
    breadcrumb.style.display = view === 'map' ? 'none' : '';
  }

  window.scrollTo(0, 0);

  // 非地图页销毁地图
  if (view !== 'home' && view !== 'map' && _currentDestroyMap) {
    _currentDestroyMap();
    _currentDestroyMap = null;
  }

  // 加载页面模块
  mainContent.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">🏛️</div><div>正在加载...</div></div></div>`;

  const pageModule = await Router.loadPageModule(view);

  if (pageModule) {
    // 传递销毁地图的回调
    const destroyMapFn = view === 'map' ? () => {
      if (pageModule.destroyMap) pageModule.destroyMap();
    } : null;
    if (view === 'map') _currentDestroyMap = destroyMapFn;

    await pageModule.render(mainContent, destroyMapFn);
  } else {
    // 默认显示首页
    mainContent.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">页面未找到</div></div></div>`;
  }

  // 页面渲染完成后更新面包屑和导航（确保使用最新数据）
  UI.updateBreadcrumb();
  UI.updateActiveNav();
  UI.injectStructuredData();
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);