/**
 * 路由模块 — 处理 URL 参数解析和页面导航
 */
import HashSearch from './hash-search.js';
import State from './state.js';

const Router = {
  /** 当前视图页面名 */
  _currentView: 'home',

  /** 从 URL 解析参数 */
  parseParams() {
    const parsed = HashSearch.autoRetrieve();
    State.currentView = parsed.view;
    State.currentProvince = parsed.provinceId;
    State.currentDistrict = parsed.districtId;
    State.currentBuildingName = parsed.buildingName;
    State.currentTag = parsed.tagName;
    State.currentTrailId = parsed.trailId;
    State.currentTrailType = parsed.trailType;
    State.currentTagCategory = parsed.tagCategory;
    this._currentView = parsed.view;
    document.querySelector('.nav-menu')?.classList.remove('active');
    return parsed;
  },

  /** 获取当前视图 */
  getCurrentView() {
    return this._currentView;
  },

  /** 导航到指定 URL */
  navigateTo(url) {
    window.history.pushState({}, '', url);
    this.parseParams();
    // 触发渲染（由 main.js 监听）
    window.dispatchEvent(new CustomEvent('route-change'));
  },

  /**
   * 页面名到模块路径的映射
   * 使用动态 import() 实现按需加载
   */
  async loadPageModule(viewName) {
    const moduleMap = {
      'home': () => import('./pages/home.js'),
      'map': () => import('./pages/map.js'),
      'provinces': () => import('./pages/provinces.js'),
      'province': () => import('./pages/province.js'),
      'district': () => import('./pages/district.js'),
      'building': () => import('./pages/building.js'),
      'tags': () => import('./pages/tags.js'),
      'tag': () => import('./pages/tag.js'),
      'search': () => import('./pages/search.js'),
      'cross': () => import('./pages/cross.js'),
      'trail': () => import('./pages/trail.js'),
      'trail-detail': () => import('./pages/trail-detail.js')
    };
    const loader = moduleMap[viewName];
    if (loader) {
      try {
        const mod = await loader();
        return mod.default || mod;
      } catch (e) {
        console.error(`Failed to load page module: ${viewName}`, e);
        return null;
      }
    }
    return null;
  }
};

export default Router;