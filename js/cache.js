// ==================== 统一缓存管理 + 全局 API 请求入口 ====================
// 全局仅此一处封装原生 fetch，所有业务数据请求必须经由 Cache.fetchMsgPack()，禁止业务代码直接调用 fetch()
// 修改此版本号即可全局失效所有缓存（内存 + localStorage + SW）
const CACHE_VERSION = 'v2';
import { decode as msgpackDecode } from './vendor/msgpack.js';
const LS_PREFIX = 'guobao';

// ==================== 数据路径 ====================
function getDataChina(lang) { return lang === 'en' ? '/en/china' : '/zh/china'; }
function getDataTrail(lang) { return lang === 'en' ? '/en/trail' : '/zh/trail'; }

const Cache = {
  _mem: new Map(),         // 内存缓存（LRU：Map保持插入顺序，访问时移到末尾）
  _memLimit: 500,
  _loaded: new Set(),      // 已加载数据标识
  _pending: {},            // 防止重复加载
  _bgActive: false,
  _bgGeneration: 0,

  // -------- LRU 辅助：将key移到Map末尾（最近使用） --------
  _touchMem(key) {
    if (this._mem.has(key)) {
      const val = this._mem.get(key);
      this._mem.delete(key);
      this._mem.set(key, val);
    }
  },

  // -------- 底层 fetch --------
  async fetchJSON(url, forceRefresh = false) {
    if (!forceRefresh && this._mem.has(url)) {
      this._touchMem(url);
      return this._mem.get(url);
    }
    try {
      const res = await fetch(url, forceRefresh ? { cache: 'no-cache' } : {});
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      const data = await res.json();
      this._cacheSet(url, data);
      return data;
    } catch (e) {
      return null;
    }
  },

  async fetchMsgPack(url, forceRefresh = false) {
    if (!forceRefresh && this._mem.has(url)) {
      this._touchMem(url);
      return this._mem.get(url);
    }
    try {
      const res = await fetch(url, forceRefresh ? { cache: 'no-cache' } : {});
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      const buf = await res.arrayBuffer();
      const data = msgpackDecode(new Uint8Array(buf));
      this._cacheSet(url, data);
      return data;
    } catch (e) {
      return null;
    }
  },

  _cacheSet(key, value) {
    if (this._mem.has(key)) {
      this._mem.delete(key);
    } else if (this._mem.size >= this._memLimit) {
      const first = this._mem.keys().next().value;
      if (first !== undefined) this._mem.delete(first);
    }
    this._mem.set(key, value);
  },

  // -------- 省份数据缓存 key --------
  _provinceKey(lang, provinceId) {
    return `province:${lang}:${provinceId}`;
  },

  // -------- 加载省份数据 --------
  async loadProvinceData(provinceId, lang) {
    // 'cross' 和 'cross-province' 是跨省路线的虚拟 ID，没有对应的 msgpack 数据文件
    if (provinceId === 'cross' || provinceId === 'cross-province') return null;
    const memKey = this._provinceKey(lang, provinceId);
    if (this._loaded.has(memKey)) {
      const cached = this._mem.get(memKey);
      if (cached) {
        this._touchMem(memKey);
        return cached;
      }
      this._loaded.delete(memKey);
    }
    if (this._pending[memKey]) return this._pending[memKey];

    const dataUrl = `${getDataChina(lang)}/${provinceId}.msgpack`;
    const lsKey = `${LS_PREFIX}_pd_${lang}_${CACHE_VERSION}:${provinceId}`;

    // 尝试 localStorage 缓存
    try {
      const cached = localStorage.getItem(lsKey);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 7 * 86400000) {
          this._loaded.add(memKey);
          this._cacheSet(memKey, data);
          setTimeout(() => this._refreshProvince(memKey, lsKey, lang), 200);
          return data;
        }
      }
    } catch (_) {}

    const promise = (async () => {
      try {
        const data = await this.fetchMsgPack(dataUrl);
        if (data) {
          this._loaded.add(memKey);
          this._cacheSet(memKey, data);
          try { localStorage.setItem(lsKey, JSON.stringify({ data, ts: Date.now() })); } catch (_) {}
          return data;
        }
      } finally {
        delete this._pending[memKey];
      }
      return null;
    })();
    this._pending[memKey] = promise;
    return promise;
  },

  _refreshProvince(memKey, lsKey, lang) {
    const provinceId = memKey.split(':').pop();
    this.fetchMsgPack(`${getDataChina(lang)}/${provinceId}.msgpack`, true).then(data => {
      if (data) {
        this._cacheSet(memKey, data);
        try { localStorage.setItem(lsKey, JSON.stringify({ data, ts: Date.now() })); } catch (_) {}
      }
    }).catch(() => {});
  },

  async loadProvinces(provinceIds, lang) {
    await Promise.all(provinceIds.map(id => this.loadProvinceData(id, lang)));
  },

  async loadTrailData(fileName, lang) {
    const key = `trail:${fileName}`;
    if (this._mem.has(key)) {
      this._touchMem(key);
      return this._mem.get(key);
    }
    const data = await this.fetchJSON(`${getDataTrail(lang)}/${fileName}`);
    if (data) this._cacheSet(key, data);
    return data;
  },

  // -------- 获取已缓存数据 --------
  getProvinceData(provinceId, lang) {
    const memKey = this._provinceKey(lang || 'zh', provinceId);
    if (this._mem.has(memKey)) {
      this._touchMem(memKey);
      return this._mem.get(memKey);
    }
    return null;
  },

  getAllProvinceData() {
    const result = new Map();
    for (const memKey of this._loaded) {
      const data = this._mem.get(memKey);
      if (data) result.set(memKey.split(':').pop(), data);
    }
    return result;
  },

  getLoadedProvinceIds(lang) {
    if (!lang) {
      const ids = new Set();
      for (const memKey of this._loaded) ids.add(memKey.split(':').pop());
      return ids;
    }
    const prefix = this._provinceKey(lang, '');
    const ids = new Set();
    for (const memKey of this._loaded) {
      if (memKey.startsWith(prefix)) ids.add(memKey.slice(prefix.length));
    }
    return ids;
  },

  // -------- 缓存清除 --------
  clearData() {
    this._mem.clear();
    this._loaded.clear();
    this._pending = {};
    this._bgActive = false;
    this._bgGeneration++;
  },

  purgePersistent(onClearState) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${LS_PREFIX}_`)) keys.push(key);
    }
    keys.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    this.clearData();
    if (onClearState) onClearState();
  },

  getStats() {
    return { size: this._mem.size, loaded: this._loaded.size };
  },

  // -------- 后台预加载 --------
  isBgActive() { return this._bgActive; },

  async startBgPreload(provinceIds, trailFiles, lang, onComplete) {
    if (this._bgActive) return;
    this._bgActive = true;
    const gen = ++this._bgGeneration;
    const batch = 8;
    try {
      if (provinceIds?.length) {
        for (let i = 0; i < provinceIds.length; i += batch) {
          if (this._bgGeneration !== gen) return;
          const ids = provinceIds.slice(i, i + batch);
          const unloaded = ids.filter(id => !this._loaded.has(this._provinceKey(lang, id)));
          if (unloaded.length) await this.loadProvinces(unloaded, lang);
          await new Promise(r => setTimeout(r, 0));
        }
      }
      if (trailFiles?.length) {
        for (let i = 0; i < trailFiles.length; i += batch) {
          if (this._bgGeneration !== gen) return;
          const files = trailFiles.slice(i, i + batch);
          await Promise.all(files.map(async f => {
            const data = await this.fetchJSON(`${getDataTrail(lang)}/${f}`).catch(() => null);
            if (data && this._bgGeneration === gen) this._cacheSet(`trail:${f}`, data);
          }));
          await new Promise(r => setTimeout(r, 0));
        }
      }
    } catch (e) {
    }
    if (this._bgGeneration !== gen) return;
    if (onComplete) onComplete();
    this._bgActive = false;
    window.dispatchEvent(new CustomEvent('bg-preload-complete'));
  }
};

export { Cache, CACHE_VERSION, LS_PREFIX, getDataChina, getDataTrail };
