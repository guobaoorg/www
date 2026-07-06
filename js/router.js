import { HashSearch } from './hash-search.js';
import { State } from './state.js';
import * as I18n from './i18n.js';

const Router = {
  parseParams() {
    const lang = I18n.detectLang();
    let langChanged = false;
    if (State.lang !== lang) {
      State.lang = lang;
      I18n.setState(State);
      langChanged = true;
    }
    const parsed = HashSearch.autoRetrieve();
    State.currentView = parsed.view;
    State.currentProvince = parsed.provinceId;
    State.currentDistrict = parsed.districtId;
    State.currentBuildingName = parsed.buildingName;
    State.currentBuildingPid = parsed.buildingPid || '';
    State.currentBuildingD = parsed.buildingD || '';
    State.currentBuildingN = parsed.buildingN || '';
    State.currentTag = parsed.tagName;
    State.currentTrailId = parsed.trailId;
    State.currentCityCode = parsed.cityCode;
    State.currentTrailType = parsed.trailType;
    State.currentTagCategory = parsed.tagCategory;
    document.querySelector('.nav-menu')?.classList.remove('active');
    document.querySelector('.nav-backdrop')?.classList.remove('active');
    document.body.style.overflow = '';
    return { ...parsed, langChanged };
  },

  navigateTo(url) {
    const searchParams = new URLSearchParams(url.startsWith('?') ? url.substring(1) : '');
    if (State.lang === 'en') {
      searchParams.set('lang', 'en');
    }
    const base = url.startsWith('?') ? '' : url.split('?')[0];
    const search = searchParams.toString();
    const fullUrl = base + (search ? '?' + search : '');
    window.history.pushState({}, '', fullUrl);
    window.dispatchEvent(new CustomEvent('route-change'));
  },

  _moduleMap: {
    'map': () => import('./map.js'),
    'provinces': () => import('./provinces.js'),
    'province': () => import('./province.js'),
    'building': () => import('./building.js'),
    'tags': () => import('./tags.js'),
    'tag': () => import('./tag.js'),
    'search': () => import('./search.js'),
    'city': () => import('./city.js'),
    'trail': () => import('./trail.js'),
    'trail-detail': () => import('./trail-detail.js'),
    'quiz': () => import('./quiz.js')
  },
  _moduleCache: {},

  async loadPageModule(viewName) {
    if (this._moduleCache[viewName]) return this._moduleCache[viewName];
    const loader = this._moduleMap[viewName];
    if (loader) {
      try { const mod = await loader(); const m = mod.default || mod; this._moduleCache[viewName] = m; return m; }
      catch (e) { return null; }
    }
    return null;
  }
};

export { Router };