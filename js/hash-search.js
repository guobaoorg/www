/**
 * HashSearch — 全局唯一统一数据检索层
 * 所有 JSON 数据请求必须通过本模块完成，禁止在页面模块中直接使用 fetch()
 *
 * 功能：
 * - 内置全局内存缓存，自动处理缓存淘汰
 * - URL 参数编码 / 解码
 * - 精确匹配、多条件组合匹配、模糊搜索
 * - 从 URLSearchParams 自动检索
 */

const HashSearch = {
  /** 内存缓存存储 */
  _cache: new Map(),

  /** 缓存上限 */
  _cacheLimit: 200,

  /** 页面数据加载跟踪（防重复加载） */
  _loadedData: new Set(),
  _pendingLoads: {},

  /* ==================== 核心数据加载 ==================== */

  /**
   * 异步加载 JSON 数据（唯一允许使用 fetch() 的位置）
   * @param {string} url - JSON 文件路径
   * @returns {Promise<object|null>}
   */
  async fetchJSON(url) {
    if (this._cache.has(url)) {
      return this._cache.get(url);
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${url}`);
      }
      const data = await res.json();
      this._cacheSet(url, data);
      return data;
    } catch (e) {
      console.error('HashSearch.fetchJSON 失败:', url, e);
      return null;
    }
  },

  /**
   * 加载省份数据（带防重复和去重）
   * @param {string} provinceId
   * @returns {Promise<object|null>}
   */
  async loadProvinceData(provinceId) {
    if (this._loadedData.has(provinceId)) {
      return this._cache.get(`province:${provinceId}`);
    }
    if (this._pendingLoads[provinceId]) {
      return this._pendingLoads[provinceId];
    }
    const fileName = provinceId === 'cross' ? 'cross-province.json' : `${provinceId}.json`;
    const promise = this.fetchJSON(`/data/${fileName}`).then(data => {
      delete this._pendingLoads[provinceId];
      if (data) {
        this._loadedData.add(provinceId);
        this._cacheSet(`province:${provinceId}`, data);
      }
      return data;
    });
    this._pendingLoads[provinceId] = promise;
    return promise;
  },

  /**
   * 批量加载多个省份数据
   * @param {string[]} provinceIds
   * @returns {Promise<void>}
   */
  async loadProvinces(provinceIds) {
    await Promise.all(provinceIds.map(id => this.loadProvinceData(id)));
  },

  /**
   * 获取已加载的省份数据
   * @param {string} provinceId
   * @returns {object|null}
   */
  getProvinceData(provinceId) {
    return this._cache.get(`province:${provinceId}`) || null;
  },

  /**
   * 获取所有已加载的省份数据
   * @returns {Map}
   */
  getAllProvinceData() {
    const result = new Map();
    for (const id of this._loadedData) {
      const data = this._cache.get(`province:${id}`);
      if (data) result.set(id, data);
    }
    return result;
  },

  /* ==================== URL 参数处理 ==================== */

  /**
   * 获取当前页面 URLSearchParams
   * @returns {URLSearchParams}
   */
  getParams() {
    return new URLSearchParams(window.location.search);
  },

  /**
   * 获取单个 URL 参数值
   * @param {string} key
   * @returns {string|null}
   */
  getParam(key) {
    return this.getParams().get(key);
  },

  /**
   * 构建查询字符串 URL
   * @param {object} params - 键值对
   * @returns {string} 以 ? 开头的查询字符串
   */
  buildURL(params) {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        sp.set(key, value);
      }
    }
    const qs = sp.toString();
    return qs ? '?' + qs : '?page=home';
  },

  /**
   * 从 URLSearchParams 自动检索数据
   * 根据当前 URL 参数自动判断需要加载的数据
   * @returns {object} 解析后的参数对象
   */
  autoRetrieve() {
    const params = this.getParams();
    return {
      view: params.get('page') || 'home',
      provinceId: params.get('id') || params.get('pid') || null,
      districtId: params.get('did') || null,
      buildingName: params.get('name') || null,
      tagName: params.get('name') && params.get('page') === 'tag' ? params.get('name') : null,
      trailId: params.get('id') && params.get('page') === 'trail-detail' ? params.get('id') : null,
      trailType: params.get('type') || null,
      tagCategory: params.get('cat') || null,
      rawParams: params
    };
  },

  /* ==================== 检索方法 ==================== */

  /**
   * 模糊搜索 — 在指定字段中搜索关键词
   * @param {Array} items - 数据集
   * @param {string} query - 搜索关键词
   * @param {Array<string>} fields - 要搜索的字段名数组
   * @returns {Array} 匹配结果，附带 matchReasons 字段
   */
  fuzzySearch(items, query, fields) {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    const fieldLabels = {
      name: '名称匹配', location: '地点匹配', era: '年代匹配',
      type: '类型匹配', districtName: '地区匹配', tags: '标签匹配',
      description: '描述匹配', history: '历史匹配',
      architecture: '建筑匹配', features: '特色匹配'
    };
    const results = [];
    for (const item of items) {
      const reasons = [];
      for (const field of fields) {
        const val = item[field];
        if (!val) continue;
        let matched = false;
        if (typeof val === 'string') {
          matched = val.toLowerCase().includes(lowerQuery);
        } else if (Array.isArray(val)) {
          matched = val.some(v => typeof v === 'string' && v.toLowerCase().includes(lowerQuery));
        }
        if (matched) {
          reasons.push(fieldLabels[field] || field + '匹配');
        }
      }
      if (reasons.length > 0) {
        results.push({ ...item, matchReasons: reasons });
      }
    }
    return results;
  },

  /* ==================== 内部缓存管理 ==================== */

  _cacheSet(key, value) {
    if (this._cache.size >= this._cacheLimit) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    this._cache.set(key, value);
  },

  /**
   * 清除所有缓存
   */
  clearCache() {
    this._cache.clear();
    this._loadedData.clear();
    this._pendingLoads = {};
  },

  /**
   * 获取缓存统计信息
   * @returns {{size: number, loadedProvinces: number}}
   */
  getCacheStats() {
    return {
      size: this._cache.size,
      loadedProvinces: this._loadedData.size
    };
  }
};

export default HashSearch;