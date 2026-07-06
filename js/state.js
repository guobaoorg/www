import { Cache, CACHE_VERSION, LS_PREFIX, getDataChina, getDataTrail } from './cache.js';
import * as I18n from './i18n.js';
import { Config } from './config.js';

const State = {
  currentView: 'map',
  currentProvince: null,
  currentDistrict: null,
  currentCityCode: null,
  currentBuildingName: null,
  currentBuildingPid: '',
  currentBuildingD: '',
  currentBuildingN: '',
  currentTag: null,
  currentTrailId: null,
  currentTrailType: null,
  currentTagCategory: null,

  lang: I18n.detectLang(),
  theme: localStorage.getItem('theme') || 'light',

  _provinceMeta: null,
  _trailRegistry: null,
  _allBuildingsCache: null,
  _allTagsCache: null,
  _tagBuildingsCache: {},
  _tagBuildingsIndex: null,
  _buildingNameIndex: null,
  _buildingFullIndex: null,
  _buildingEnIndex: null,
  _searchTextIndex: null,

  _metaPromise: null,

  initI18n() {
    I18n.setState(this);
  },

  // ==================== 语言切换（一站式） ====================
  async switchLang(newLang) {
    this.lang = newLang;
    this.initI18n();
    Cache.clearData();
    this._resetDerivedCaches();
    this._metaPromise = null;
    await this.initMeta();
  },

  // ==================== 元数据加载 ====================
  async initMeta() {
    if (this._metaPromise) return this._metaPromise;
    this._metaPromise = (async () => {
      const cacheKey = `${LS_PREFIX}_meta_${State.lang}_${CACHE_VERSION}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.provinces) this._provinceMeta = parsed.provinces;
          if (parsed.trail) this._trailRegistry = parsed.trail;
        }
      } catch (_) {}
      try {
        const [provincesRes, trailRes] = await Promise.all([
          Cache.fetchJSON(`${getDataChina(State.lang)}/provinces.json`),
          Cache.fetchJSON(`${getDataTrail(State.lang)}/registry.json`)
        ]);
        if (provincesRes) this._provinceMeta = provincesRes;
        if (trailRes) this._trailRegistry = trailRes;
        try { localStorage.setItem(cacheKey, JSON.stringify({ provinces: provincesRes, trail: trailRes })); } catch (_) {}
      } catch (e) {
        if (!this._provinceMeta) this._provinceMeta = { provinces: [], protectionLabels: {} };
        if (!this._trailRegistry) this._trailRegistry = [];
      }
    })();
    return this._metaPromise;
  },

  getProvinceMeta() { return this._provinceMeta; },
  getTrailRegistry() { return this._trailRegistry; },

  // ==================== 省份查询 ====================
  _provinceByIdCache: {},

  getProvinceById(provinceId) {
    if (provinceId in this._provinceByIdCache) return this._provinceByIdCache[provinceId];
    const p = this._provinceMeta?.provinces?.find(p => p.id === provinceId) || null;
    this._provinceByIdCache[provinceId] = p;
    return p;
  },

  _provinceNameCache: {},

  getProvinceName(provinceId) {
    if (!provinceId) return '';
    if (provinceId === 'cross') return this.lang === 'en' ? 'Cross-Province' : '跨省';
    if (provinceId in this._provinceNameCache) return this._provinceNameCache[provinceId];
    const p = this.getProvinceById(provinceId);
    const name = p ? p.name : provinceId;
    this._provinceNameCache[provinceId] = name;
    return name;
  },

  _protectionLabelCache: {},

  getProtectionLabel(provinceId) {
    if (provinceId in this._protectionLabelCache) return this._protectionLabelCache[provinceId];
    const defaultLabel = this.lang === 'en' ? 'National Protected Site' : '全国重点文物保护单位';
    const label = this._provinceMeta?.protectionLabels?.[provinceId] || defaultLabel;
    this._protectionLabelCache[provinceId] = label;
    return label;
  },

  // ==================== 建筑数据聚合 ====================
  getAllBuildings() {
    if (this._allBuildingsCache !== null) return this._allBuildingsCache;
    const all = [];
    this._buildingNameIndex = new Map();
    this._buildingFullIndex = new Map();
    this._buildingEnIndex = new Map();
    this._searchTextIndex = new Map();
    this._tagBuildingsIndex = {};
    const allData = Cache.getAllProvinceData();
    for (const [provinceId, data] of allData) {
      const provinceName = this.getProvinceName(provinceId);
      if (Array.isArray(data)) {
        for (let i = 0, len = data.length; i < len; i++) {
          const b = data[i];
          b.p = provinceName;
          b.pid = provinceId;
          all.push(b);
          const key = `${provinceName}${b.dn || ''}${b.n}`;
          this._buildingNameIndex.set(key, b);
          this._buildingFullIndex.set(b.n, b);
          if (b.en) this._buildingEnIndex.set(b.en, b);
          this._searchTextIndex.set(b, [b.n, b.en, b.cn, b.dn, b.e, b.t, (b.g || []).join(' '), b.desc, b.hist, b.arch, b.feat].filter(Boolean).join('|').toLowerCase());
          if (b.g) for (let j = 0, jlen = b.g.length; j < jlen; j++) {
            const tag = b.g[j];
            (this._tagBuildingsIndex[tag] || (this._tagBuildingsIndex[tag] = [])).push(b);
          }
        }
      }
    }
    if (all.length > 0) this._allBuildingsCache = all;
    return all;
  },

  getAllTags() {
    if (this._allTagsCache !== null) return this._allTagsCache;
    const tagCount = {};
    const all = this.getAllBuildings();
    for (let i = 0, len = all.length; i < len; i++) {
      const g = all[i].g;
      if (g) for (let j = 0, jlen = g.length; j < jlen; j++) tagCount[g[j]] = (tagCount[g[j]] || 0) + 1;
    }
    const entries = Object.entries(tagCount);
    entries.sort((a, b) => b[1] - a[1]);
    this._allTagsCache = entries.map(([name, count]) => ({ name, count }));
    if (this._allTagsCache.length === 0) this._allTagsCache = null;
    return this._allTagsCache;
  },

  hasAllTagsCache() { return !!this._allTagsCache; },

  getBuildingsByTag(tag) {
    if (this._tagBuildingsCache[tag]) return this._tagBuildingsCache[tag];
    if (!this._tagBuildingsIndex) this.getAllBuildings();
    const result = this._tagBuildingsIndex[tag] || [];
    this._tagBuildingsCache[tag] = result;
    return result;
  },

  hasTagBuildingsCache(tag) { return !!this._tagBuildingsCache[tag]; },

  findBuildingByFullPath(fullPath) {
    if (!fullPath) return null;
    if (this._buildingNameIndex) {
      const found = this._buildingNameIndex.get(fullPath);
      if (found) return found;
      return null;
    }
    this.getAllBuildings();
    return this._buildingNameIndex?.get(fullPath) || null;
  },

  resolveBuildingRef(buildingRef) {
    if (!buildingRef) return null;
    if (buildingRef.embedded) return buildingRef.embedded;
    if (this._buildingFullIndex) {
      const found = this._buildingFullIndex.get(buildingRef.n);
      if (found) return found;
      if (this._buildingEnIndex) {
        const enFound = this._buildingEnIndex.get(buildingRef.n);
        if (enFound) return enFound;
      }
      return null;
    }
    this.getAllBuildings();
    const found = this._buildingFullIndex?.get(buildingRef.n) || null;
    if (found) return found;
    return this._buildingEnIndex?.get(buildingRef.n) || null;
  },

  // ==================== 缓存清除 ====================
  _resetDerivedCaches() {
    this._allBuildingsCache = null;
    this._allTagsCache = null;
    this._tagBuildingsCache = {};
    this._tagBuildingsIndex = null;
    this._buildingNameIndex = null;
    this._buildingFullIndex = null;
    this._buildingEnIndex = null;
    this._searchTextIndex = null;
    this._provinceByIdCache = {};
    this._provinceNameCache = {};
    this._protectionLabelCache = {};
  },

  getCityName(cityCode, buildings) {
    if (buildings && buildings.length > 0) {
      const cn = buildings[0].cn;
      if (cn) return cn;
    }
    const parts = cityCode.split('_');
    return parts[1] || cityCode;
  }
};

export { State };