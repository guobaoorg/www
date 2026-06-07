/**
 * 全局状态管理模块
 */
import HashSearch from './hash-search.js';

const State = {
  /** 当前视图状态 */
  currentView: 'home',
  currentProvince: null,
  currentDistrict: null,
  currentBuildingName: null,
  currentTag: null,
  currentTrailId: null,
  currentTrailType: null,
  currentTagCategory: null,

  /** 主题 */
  theme: localStorage.getItem('theme') || 'light',

  /** 元数据 */
  _provinceMeta: null,
  _trailRegistry: null,

  /** 派生数据缓存 */
  _allBuildingsCache: null,
  _allTagsCache: null,
  _tagBuildingsCache: {},
  _buildingNameIndex: null,
  _cachedLoadedCount: 0,

  /** 初始化：加载元数据 */
  async initMeta() {
    try {
      const [provincesRes, trailRes] = await Promise.all([
        HashSearch.fetchJSON('/data/provinces.json'),
        HashSearch.fetchJSON('/trail/registry.json')
      ]);
      this._provinceMeta = provincesRes;
      this._trailRegistry = trailRes;
    } catch (e) {
      console.error('Failed to load meta data:', e);
      this._provinceMeta = { provinces: [], protectionLabels: {} };
      this._trailRegistry = [];
    }
  },

  /** 获取省份元数据 */
  getProvinceMeta() { return this._provinceMeta; },

  /** 获取足迹注册表 */
  getTrailRegistry() { return this._trailRegistry; },

  /** 根据 ID 获取省份信息 */
  getProvinceById(provinceId) {
    return this._provinceMeta?.provinces?.find(p => p.id === provinceId);
  },

  /** 获取省份名称 */
  getProvinceName(provinceId) {
    if (!provinceId) return '';
    if (provinceId === 'cross') return '跨省';
    const p = this.getProvinceById(provinceId);
    return p ? p.name : provinceId;
  },

  /** 获取保护级别标签 */
  getProtectionLabel(provinceId) {
    return this._provinceMeta?.protectionLabels?.[provinceId] || '全国重点文物保护单位';
  },

  /** 获取全部建筑（跨省份聚合） */
  getAllBuildings() {
    const currentLoadedCount = HashSearch.getCacheStats().loadedProvinces;
    if (this._allBuildingsCache && currentLoadedCount === this._cachedLoadedCount) {
      return this._allBuildingsCache;
    }
    const all = [];
    this._buildingNameIndex = new Map();
    const allData = HashSearch.getAllProvinceData();
    for (const [provinceId, data] of allData) {
      const provinceName = this.getProvinceName(provinceId);
      if (data.buildings) {
        for (const b of data.buildings) {
          const entry = { ...b, province: provinceName, provinceId };
          all.push(entry);
          // 构建名称索引（按完整路径）
          const fullPath = `${provinceName}${b.districtName || ''}${b.name}`;
          this._buildingNameIndex.set(fullPath, entry);
        }
      }
    }
    this._allBuildingsCache = all;
    this._cachedLoadedCount = currentLoadedCount;
    return all;
  },

  /** 获取所有标签 */
  getAllTags() {
    if (this._allTagsCache) return this._allTagsCache;
    const tagCount = {};
    this.getAllBuildings().forEach(b => {
      if (b.tags) b.tags.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1; });
    });
    this._allTagsCache = Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return this._allTagsCache;
  },

  /** 根据标签获取建筑 */
  getBuildingsByTag(tag) {
    if (this._tagBuildingsCache[tag]) return this._tagBuildingsCache[tag];
    const result = this.getAllBuildings().filter(b => b.tags && b.tags.some(t => t === tag));
    this._tagBuildingsCache[tag] = result;
    return result;
  },

  /** 根据省份和区县获取建筑 */
  getBuildingsByDistrict(provinceId, districtId) {
    const data = HashSearch.getProvinceData(provinceId);
    if (!data?.buildings) return [];
    const provinceName = this.getProvinceName(provinceId);
    return data.buildings
      .filter(b => b.district === districtId)
      .map(b => ({ ...b, province: provinceName, provinceId }));
  },

  /** 获取区县数据 */
  getDistrictData(provinceId, districtId) {
    const data = HashSearch.getProvinceData(provinceId);
    if (data?.districts?.[districtId]) {
      return { id: districtId, ...data.districts[districtId] };
    }
    return null;
  },

  /** 获取省份所有区县 */
  getAllDistricts(provinceId) {
    const data = HashSearch.getProvinceData(provinceId);
    if (!data?.districts) return [];
    return Object.entries(data.districts).map(([id, d]) => ({ id, ...d }));
  },

  /** 根据完整路径查找建筑 */
  findBuildingByFullPath(fullPath) {
    if (!fullPath) return null;
    // 优先使用名称索引（O(1)）
    if (this._buildingNameIndex?.has(fullPath)) {
      return this._buildingNameIndex.get(fullPath);
    }
    // 回退到遍历查找
    const allBuildings = this.getAllBuildings();
    let building = allBuildings.find(b => b.name === fullPath);
    if (!building) {
      building = allBuildings.find(b => {
        const pn = b.province || this.getProvinceName(b.provinceId) || '';
        const dn = b.districtName || '';
        return `${pn}${dn}${b.name}` === fullPath;
      });
    }
    // 缓存未命中，直接遍历已加载的省份数据
    if (!building) {
      const allData = HashSearch.getAllProvinceData();
      for (const [provinceId, data] of allData) {
        if (!data.buildings) continue;
        const provinceName = this.getProvinceName(provinceId);
        for (const b of data.buildings) {
          const pn = provinceName || '';
          const dn = b.districtName || '';
          if (`${pn}${dn}${b.name}` === fullPath) {
            building = { ...b, province: provinceName, provinceId };
            return building;
          }
        }
      }
    }
    return building;
  },

  /** 通过引用解析建筑 */
  resolveBuildingRef(buildingRef) {
    if (!buildingRef) return null;
    if (buildingRef.embedded) return buildingRef.embedded;
    const allBuildings = this.getAllBuildings();
    const byName = allBuildings.find(b => b.name === buildingRef.name);
    if (!byName) return null;
    if (buildingRef.province && byName.provinceId !== buildingRef.province) {
      return allBuildings.find(b => b.name === buildingRef.name && b.provinceId === buildingRef.province) || byName;
    }
    return byName;
  },

  /** 确保数据已加载 */
  async ensureDataLoaded() {
    if (HashSearch.getCacheStats().loadedProvinces === 0) {
      const allIds = this._provinceMeta?.provinces?.map(p => p.id) || [];
      await HashSearch.loadProvinces(allIds);
    }
  },

  /** 清除所有派生缓存 */
  clearCache() {
    this._allBuildingsCache = null;
    this._allTagsCache = null;
    this._tagBuildingsCache = {};
    this._buildingNameIndex = null;
    this._cachedLoadedCount = 0;
  }
};

export default State;