// ==================== 搜索 + URL 解析 ====================
// 数据加载/缓存逻辑已迁移到 cache.js，此处仅保留搜索和 URL 参数处理
// 为保持向后兼容，重新导出 Cache 的常用函数

import { Cache, CACHE_VERSION, LS_PREFIX, getDataChina, getDataTrail } from './cache.js';

const HashSearch = {
  // ==================== 向后兼容：重新导出 Cache 函数 ====================
  fetchJSON: (url, forceRefresh) => Cache.fetchJSON(url, forceRefresh),
  loadProvinceData: (id, lang) => Cache.loadProvinceData(id, lang),
  loadProvinces: (ids, lang) => Cache.loadProvinces(ids, lang),
  loadTrailData: (file, lang) => Cache.loadTrailData(file, lang),
  getProvinceData: (id, lang) => Cache.getProvinceData(id, lang),
  getAllProvinceData: () => Cache.getAllProvinceData(),
  getLoadedProvinceIds: (lang) => Cache.getLoadedProvinceIds(lang),
  getCacheStats: () => Cache.getStats(),
  isBgActive: () => Cache.isBgActive(),
  startBgPreload: (ids, files, lang, fn) => Cache.startBgPreload(ids, files, lang, fn),

  // ==================== URL 参数解析 ====================
  _lastSearch: null,
  _cachedParams: null,

  getParams() {
    const search = window.location.search;
    if (search !== this._lastSearch) {
      this._lastSearch = search;
      this._cachedParams = new URLSearchParams(search);
    }
    return this._cachedParams;
  },
  getParam(key) { return this.getParams().get(key); },

  autoRetrieve() {
    const params = this.getParams();
    let page = params.get('page') || 'map';

    // 向后兼容：旧的cross和cross-detail路由重定向到trail/trail-detail
    if (page === 'cross') {
      page = 'trail';
      const newParams = new URLSearchParams(window.location.search);
      newParams.set('page', 'trail');
      newParams.set('type', 'cross');
      window.history.replaceState({}, '', '?' + newParams.toString());
    } else if (page === 'cross-detail') {
      page = 'trail-detail';
      const crossId = params.get('crossId');
      const newParams = new URLSearchParams(window.location.search);
      newParams.set('page', 'trail-detail');
      newParams.set('id', crossId || '');
      newParams.delete('crossId');
      window.history.replaceState({}, '', '?' + newParams.toString());
    }

    const d = params.get('d') || '';
    const cid = params.get('cid') || '';
    return {
      view: page,
      provinceId: params.get('id') && page !== 'trail-detail' ? params.get('id') : (params.get('pid') || (page === 'city' && cid ? cid.split('_')[0] : null)),
      districtId: params.get('did') || null,
      cityCode: page === 'city' ? cid : null,
      buildingName: params.get('name') && page !== 'tag' ? params.get('name') : null,
      buildingPid: params.get('pid') || (d ? d.split('_')[0] : ''),
      buildingD: d,
      buildingN: params.get('n') || '',
      tagName: params.get('name') && params.get('page') === 'tag' ? params.get('name') : null,
      trailId: params.get('id') && (page === 'trail-detail') ? params.get('id') : null,
      trailType: params.get('type') || null,
      tagCategory: params.get('cat') || null
    };
  },

  // ==================== 搜索 ====================
  _fieldToI18n: {
    n: 'search.matchName', l: 'search.matchLocation', e: 'search.matchEra',
    t: 'search.matchType', dn: 'search.matchArea', g: 'search.matchTag',
    desc: 'search.matchDesc', hist: 'search.matchHist',
    arch: 'search.matchArch', feat: 'search.matchFeat'
  },

  fuzzySearch(items, query, fields, searchTextIndex) {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    const results = [];
    for (let i = 0, ilen = items.length; i < ilen; i++) {
      const item = items[i];
      if (searchTextIndex) {
        const combined = searchTextIndex.get(item);
        if (!combined || !combined.includes(lowerQuery)) continue;
      }
      const reasons = [];
      for (let f = 0, flen = fields.length; f < flen; f++) {
        const val = item[fields[f]];
        if (!val) continue;
        let matched = false;
        if (typeof val === 'string') matched = val.toLowerCase().includes(lowerQuery);
        else if (Array.isArray(val)) {
          for (let v = 0, vlen = val.length; v < vlen; v++) {
            if (typeof val[v] === 'string' && val[v].toLowerCase().includes(lowerQuery)) { matched = true; break; }
          }
        }
        if (matched) reasons.push(fields[f]);
      }
      if (reasons.length > 0) { item.matchReasons = reasons; results.push(item); }
    }
    return results;
  }
};

export { HashSearch, CACHE_VERSION, LS_PREFIX, getDataChina, getDataTrail };
