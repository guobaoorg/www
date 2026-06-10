// ==================== HashSearch ====================

const HashSearch = {
  _cache: new Map(),
  _cacheLimit: 200,
  _loadedData: new Set(),
  _pendingLoads: {},

  async fetchJSON(url) {
    if (this._cache.has(url)) return this._cache.get(url);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      const data = await res.json();
      this._cacheSet(url, data);
      return data;
    } catch (e) {
      console.error('HashSearch.fetchJSON失败:', url, e);
      return null;
    }
  },

  async loadProvinceData(provinceId) {
    if (this._loadedData.has(provinceId)) return this._cache.get(`province:${provinceId}`);
    if (this._pendingLoads[provinceId]) return this._pendingLoads[provinceId];
    const fileName = provinceId === 'cross' ? 'cross-province.json' : `${provinceId}.json`;
    const cacheKey = `guobao_pd_v1:${provinceId}`;
    // 优先从 localStorage 读取（7天有效）
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 7 * 86400000) {
          this._loadedData.add(provinceId);
          this._cacheSet(`province:${provinceId}`, data);
          // 后台静默更新（延迟 invalidate）
          setTimeout(() => this._refreshProvince(provinceId, fileName, cacheKey), 200);
          return data;
        }
      }
    } catch (_) {}
    // 从网络加载
    const promise = (async () => {
      const data = await this.fetchJSON(`/data/${fileName}`);
      delete this._pendingLoads[provinceId];
      if (data) {
        this._loadedData.add(provinceId);
        this._cacheSet(`province:${provinceId}`, data);
        this._resolveDistrictNames(data);
        try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch (_) {}
      }
      return data;
    })();
    this._pendingLoads[provinceId] = promise;
    return promise;
  },

  _resolveDistrictNames(data) {
    if (data.ds && data.bs) {
      for (const b of data.bs) {
        if (!b.dn && b.d) b.dn = data.ds[b.d]?.n || '';
      }
    }
  },

  _refreshProvince(provinceId, fileName, cacheKey) {
    this.fetchJSON(`/data/${fileName}`).then(data => {
      if (data) {
        this._cacheSet(`province:${provinceId}`, data);
        this._resolveDistrictNames(data);
        try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch (_) {}
      }
    }).catch(() => {});
  },

  async loadProvinces(provinceIds) {
    await Promise.all(provinceIds.map(id => this.loadProvinceData(id)));
  },

  getProvinceData(provinceId) {
    return this._cache.get(`province:${provinceId}`) || null;
  },

  _allProvinceCache: null,
  _cachedLoadedCount: 0,

  getAllProvinceData() {
    if (this._allProvinceCache && this._cachedLoadedCount === this._loadedData.size) return this._allProvinceCache;
    const result = new Map();
    for (const id of this._loadedData) {
      const data = this._cache.get(`province:${id}`);
      if (data) result.set(id, data);
    }
    this._allProvinceCache = result;
    this._cachedLoadedCount = this._loadedData.size;
    return result;
  },

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
    return {
      view: params.get('page') || 'home',
      provinceId: params.get('id') || params.get('pid') || null,
      districtId: params.get('did') || null,
      buildingName: params.get('name') || null,
      tagName: params.get('name') && params.get('page') === 'tag' ? params.get('name') : null,
      trailId: params.get('id') && params.get('page') === 'trail-detail' ? params.get('id') : null,
      trailType: params.get('type') || null,
      tagCategory: params.get('cat') || null
    };
  },

  _fieldLabels: {
    n: '名称匹配', l: '地点匹配', e: '年代匹配',
    t: '类型匹配', dn: '地区匹配', g: '标签匹配',
    desc: '描述匹配', hist: '历史匹配',
    arch: '建筑匹配', feat: '特色匹配'
  },

  fuzzySearch(items, query, fields) {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    const fieldLabels = this._fieldLabels;
    const results = [];
    for (const item of items) {
      const reasons = [];
      for (const field of fields) {
        const val = item[field];
        if (!val) continue;
        let matched = false;
        if (typeof val === 'string') matched = val.toLowerCase().includes(lowerQuery);
        else if (Array.isArray(val)) matched = val.some(v => typeof v === 'string' && v.toLowerCase().includes(lowerQuery));
        if (matched) reasons.push(fieldLabels[field] || field + '匹配');
      }
      if (reasons.length > 0) results.push({ ...item, matchReasons: reasons });
    }
    return results;
  },

  _cacheSet(key, value) {
    if (this._cache.size >= this._cacheLimit) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    this._cache.set(key, value);
  },

  clearCache() {
    this._cache.clear();
    this._loadedData.clear();
    this._pendingLoads = {};
    this._allProvinceCache = null;
    this._cachedLoadedCount = 0;
  },

  getCacheStats() {
    return { size: this._cache.size, loadedProvinces: this._loadedData.size };
  },

  getLoadedProvinceIds() {
    return new Set(this._loadedData);
  },

  _bgActive: false,

  async startBgPreload(provinceIds, trailFiles) {
    if (this._bgActive) return;
    this._bgActive = true;
    const batchSize = 8;
    try {
      // 优先加载所有 data 下的省份数据
      if (provinceIds?.length) {
        for (let i = 0; i < provinceIds.length; i += batchSize) {
          const batch = provinceIds.slice(i, i + batchSize);
          const unloaded = batch.filter(id => !this._loadedData.has(id));
          if (unloaded.length) {
            await this.loadProvinces(unloaded);
          }
          await new Promise(r => setTimeout(r, 0));
        }
      }
      // 所有省份数据加载完成后，再加载 trail 下的数据
      if (trailFiles?.length) {
        for (let i = 0; i < trailFiles.length; i += batchSize) {
          const batch = trailFiles.slice(i, i + batchSize);
          await Promise.all(batch.map(f => this.fetchJSON(`/trail/${f}`).catch(() => {})));
          await new Promise(r => setTimeout(r, 0));
        }
      }
    } catch (e) {
      console.error('后台预加载失败:', e);
    }
    State.clearCache();
    this._bgActive = false;
    window.dispatchEvent(new CustomEvent('bg-preload-complete'));
  }
};

// ==================== Leaflet 按需加载 ====================

let _leafletReady = null;

function ensureLeaflet() {
  if (window.L && window.L.MarkerClusterGroup) return Promise.resolve();
  if (_leafletReady) return _leafletReady;

  _leafletReady = new Promise((resolve) => {
    const base = 'https://unpkg.com';
    // CSS
    const cssUrls = [
      `${base}/leaflet@1.9.4/dist/leaflet.css`,
      `${base}/leaflet.markercluster@1.5.3/dist/MarkerCluster.css`,
      `${base}/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css`
    ];
    cssUrls.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    });
    // JS: Leaflet → MarkerCluster
    const s1 = document.createElement('script');
    s1.src = `${base}/leaflet@1.9.4/dist/leaflet.js`;
    s1.async = true;
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = `${base}/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js`;
      s2.async = true;
      s2.onload = () => resolve();
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });
  return _leafletReady;
}

const Config = {
  provinceStyles: {
    'beijing': { icon: '⛩️', color: '#e74c3c', bgColor: '#fdf2f2' },
    'tianjin': { icon: '⚓', color: '#3498db', bgColor: '#ebf5fb' },
    'hebei': { icon: '🏔️', color: '#2ecc71', bgColor: '#eafaf1' },
    'shanxi': { icon: '🏛️', color: '#9b59b6', bgColor: '#f5eef8' },
    'neimenggu': { icon: '🌿', color: '#1abc9c', bgColor: '#e8f8f5' },
    'liaoning': { icon: '⚙️', color: '#34495e', bgColor: '#f2f4f6' },
    'jilin': { icon: '🌲', color: '#16a085', bgColor: '#e8f6f3' },
    'heilongjiang': { icon: '❄️', color: '#2980b9', bgColor: '#eaf2f8' },
    'shanghai': { icon: '🌆', color: '#e67e22', bgColor: '#fef5e7' },
    'jiangsu': { icon: '🌊', color: '#3498db', bgColor: '#ebf5fb' },
    'zhejiang': { icon: '🏞️', color: '#27ae60', bgColor: '#eafaf1' },
    'anhui': { icon: '📜', color: '#8e44ad', bgColor: '#f5eef8' },
    'fujian': { icon: '🏝️', color: '#d35400', bgColor: '#fdf2e9' },
    'jiangxi': { icon: '🌸', color: '#c0392b', bgColor: '#fdedec' },
    'shandong': { icon: '🌅', color: '#2980b9', bgColor: '#eaf2f8' },
    'henan': { icon: '🏺', color: '#f39c12', bgColor: '#fef9e7' },
    'hubei': { icon: '🌉', color: '#e74c3c', bgColor: '#fdf2f2' },
    'hunan': { icon: '🌶️', color: '#16a085', bgColor: '#e8f6f3' },
    'guangdong': { icon: '🌺', color: '#e67e22', bgColor: '#fef5e7' },
    'guangxi': { icon: '🌴', color: '#27ae60', bgColor: '#eafaf1' },
    'hainan': { icon: '🥥', color: '#2ecc71', bgColor: '#eafaf1' },
    'chongqing': { icon: '🍲', color: '#9b59b6', bgColor: '#f5eef8' },
    'sichuan': { icon: '🐼', color: '#34495e', bgColor: '#f2f4f6' },
    'guizhou': { icon: '🌁', color: '#1abc9c', bgColor: '#e8f8f5' },
    'yunnan': { icon: '🦚', color: '#e74c3c', bgColor: '#fdf2f2' },
    'xizang': { icon: '🏔️', color: '#3498db', bgColor: '#ebf5fb' },
    'shaanxi': { icon: '🐴', color: '#8e44ad', bgColor: '#f5eef8' },
    'gansu': { icon: '🏜️', color: '#f39c12', bgColor: '#fef9e7' },
    'qinghai': { icon: '💧', color: '#2980b9', bgColor: '#eaf2f8' },
    'ningxia': { icon: '🌾', color: '#27ae60', bgColor: '#eafaf1' },
    'xinjiang': { icon: '🍇', color: '#9b59b6', bgColor: '#f5eef8' },
    'taiwan': { icon: '🏝️', color: '#e67e22', bgColor: '#fef5e7' },
    'hongkong': { icon: '🌃', color: '#34495e', bgColor: '#f2f4f6' },
    'macau': { icon: '🎰', color: '#c0392b', bgColor: '#fdedec' },
    'cross': { icon: '🗺️', color: '#16a085', bgColor: '#e8f6f3' }
  },

  colorPalette: [
    { color: '#B22222', bg: '#FDF2F2' }, { color: '#8B4513', bg: '#FDF8F3' },
    { color: '#2F4F4F', bg: '#F0F5F5' }, { color: '#1E3A5F', bg: '#F0F4F8' },
    { color: '#DAA520', bg: '#FDF9F0' }, { color: '#708090', bg: '#F5F5F7' }
  ],

  tagStyles: {
    '古建筑': { icon: '🏛️' }, '古遗址': { icon: '🏺' }, '古城遗址': { icon: '🏚️' },
    '古墓葬': { icon: '⚰️' }, '陵墓': { icon: '🪦' }, '名人墓': { icon: '👤' }, '壁画墓': { icon: '🎨' },
    '石窟寺': { icon: '🪨' }, '石刻': { icon: '🗿' }, '造像': { icon: '🙏' }, '碑刻': { icon: '📜' },
    '经幢': { icon: '🗼' }, '彩塑': { icon: '🤲' }, '雕塑': { icon: '🗽' }, '壁画': { icon: '🖼️' },
    '岩画': { icon: '🪨' }, '佛教艺术': { icon: '☸️' },
    '佛教寺院': { icon: '🛕' }, '塔': { icon: '🗼' }, '藏传佛教': { icon: '🪷' },
    '道教建筑': { icon: '☯️' }, '教堂': { icon: '⛪' }, '清真寺': { icon: '🕌' },
    '祭坛': { icon: '🕯️' }, '关帝庙': { icon: '⚔️' }, '城隍庙': { icon: '🏛️' },
    '妈祖庙': { icon: '🌊' }, '文昌阁': { icon: '⭐' },
    '革命遗址': { icon: '🚩' }, '红色旅游': { icon: '⭐' },
    '近现代史迹': { icon: '🏛️' }, '中西合璧': { icon: '🤝' }, '纪念建筑': { icon: '🗽' },
    '博物馆': { icon: '🏛️' }, '名人故居': { icon: '🏠' },
    '军事遗址': { icon: '⚔️' }, '关隘': { icon: '🏔️' }, '长城': { icon: '🐉' },
    '城墙': { icon: '🧱' }, '烽燧': { icon: '🔥' }, '炮台': { icon: '💣' },
    '工业遗产': { icon: '🏭' }, '桥梁': { icon: '🌉' }, '水利工程': { icon: '💧' },
    '运河': { icon: '🌊' }, '码头': { icon: '⚓' }, '天文': { icon: '🔭' },
    '驿站': { icon: '📮' }, '栈道': { icon: '🪜' },
    '宫殿': { icon: '👑' }, '园林': { icon: '🌿' }, '衙署': { icon: '⚖️' },
    '民居': { icon: '🏘️' }, '会馆': { icon: '🏤' }, '书院': { icon: '📚' },
    '祠堂': { icon: '👪' }, '文庙': { icon: '🎓' }, '牌坊': { icon: '⛩️' },
    '四合院': { icon: '🏚️' }, '古村落': { icon: '🏡' }, '历史文化街区': { icon: '🏙️' },
    '戏台': { icon: '🎭' }, '影壁': { icon: '🧱' }, '钟鼓楼': { icon: '🥁' },
    '窑址': { icon: '🔥' }, '农业遗产': { icon: '🌾' }, '活态遗产': { icon: '🔄' },
    '文化景观': { icon: '🌄' }, '世界遗产': { icon: '🌟' }, '自然遗产': { icon: '🌲' },
    '丝绸之路': { icon: '🐪' }, '澳门历史城区': { icon: '🏛️' },
    '徽派建筑': { icon: '🏘️' }, '晋商建筑': { icon: '💰' }, '岭南建筑': { icon: '🏠' },
    '闽南建筑': { icon: '🏡' }, '客家建筑': { icon: '🏘️' }, '土楼': { icon: '🟤' },
    '窑洞': { icon: '🕳️' }, '碉楼': { icon: '🗼' }, '蒙古包': { icon: '⛺' },
    '傣族建筑': { icon: '🏠' }, '侗族建筑': { icon: '🏘️' }, '苗族建筑': { icon: '🏠' },
    '藏式建筑': { icon: '🏔️' }, '古井': { icon: '🕳️' }, '古树名木': { icon: '🌳' },
    '龙山文化': { icon: '🏺' }, '仰韶文化': { icon: '🏺' }, '大汶口文化': { icon: '🏺' },
    '良渚文化': { icon: '🏺' }, '红山文化': { icon: '🏺' }, '马家窑文化': { icon: '🏺' },
    '齐家文化': { icon: '🏺' }, '河姆渡文化': { icon: '🏺' },
    '彝族建筑': { icon: '🏠' }, '土家族建筑': { icon: '🏠' },
    '维吾尔族建筑': { icon: '🏠' }, '回族建筑': { icon: '🏠' },
    '白族建筑': { icon: '🏠' }, '纳西族建筑': { icon: '🏠' },
    '龙王庙': { icon: '🐉' }, '岳王庙': { icon: '⚔️' }, '禹王庙': { icon: '💧' },
    '东岳庙': { icon: '⛰️' }, '真武庙': { icon: '⭐' },
    '古建筑群': { icon: '🏘️' }, '古塔': { icon: '🗼' }, '古寺': { icon: '🛕' },
    '古桥': { icon: '🌉' }, '古墓': { icon: '⚰️' }, '古街': { icon: '🏙️' },
    '古战场': { icon: '⚔️' }, '古城': { icon: '🏚️' }, '古庙': { icon: '🛕' },
    '古亭': { icon: '⛩️' }, '古楼': { icon: '🏯' }, '古宅': { icon: '🏚️' }
  },

  tagCategories: [
    { id: 'building', icon: '🏛️', name: '古建筑·形制',
      tags: ['别墅','仓储建筑','仓储','藏书楼','城堡','城堡建筑','祠堂','村屋','当铺建筑','碉楼','防御建筑','干栏式建筑','公共建筑','公馆','宫殿','古建筑','古村落','古树名木','古城','古刹','鼓楼','官宦宅邸','官宅','会馆','建筑','建筑艺术','魁星阁','拉萨老城','历史文化街区','历史街区','历史文化名城','楼阁','门楼','民居','牌坊','牌坊建筑','牌楼','骑楼','山地建筑','书院','围屋','文庙','无梁殿','戏台','戏曲舞台','悬空建筑','衙署','洋房','窑洞','要塞','园林','钟楼','钟鼓楼','庄园'] },
    { id: 'structure', icon: '🏗️', name: '建筑·构造',
      tags: ['八角形','匾额','彩绘','彩塑','穿斗式','雕塑','雕刻艺术','斗拱','多进院落','飞檐','汉白玉','夯土','回廊','琉璃瓦','琉璃艺术','六角形','楼阁式','密檐式','木构建筑','木雕','泥塑','青砖','穹顶','三重檐','石构建筑','石雕','石雕艺术','石阙','石构墓葬','榫卯结构','庑殿顶','歇山顶','须弥座','悬山顶','月台','藻井','重檐','竹','砖木结构','砖石结构','砖雕'] },
    { id: 'style', icon: '🎨', name: '建筑·风格',
      tags: ['巴洛克风格','德式建筑','俄式建筑','法式建筑','赣派民居','哥特式建筑','官式建筑','华侨建筑','皇家建筑','徽派建筑','近代建筑','客家建筑','岭南建筑','罗马式建筑','欧式建筑','葡式建筑','日治时期建筑','日式','苏式','土司建筑','西式建筑','现代建筑','现代主义建筑','异域风格','英式建筑','折衷主义','殖民建筑','殖民历史','中西合璧','中西文化交流'] },
    { id: 'religion', icon: '☸️', name: '宗教建筑',
      tags: ['藏传佛教','大佛','道教建筑','道教','佛教寺院','佛教遗址','佛教石刻','佛教艺术','佛塔','格鲁派','观音','汉传佛教','教堂','庙宇','南传佛教','儒释道','儒家建筑','儒学建筑','三教合一','舍利塔','圣母','石窟寺','石窟','寺庙园林','伊斯兰建筑','宗教建筑','宗教活动场所'] },
    { id: 'temple', icon: '🕯️', name: '坛庙祠堂',
      tags: ['城隍庙','东岳庙','二仙','封建礼制','关帝庙','祭坛','祭祀遗址','礼制','龙王庙','龙王','妈祖','土地庙','武庙之冠'] },
    { id: 'grotto', icon: '🪨', name: '石窟石刻',
      tags: ['碑刻','北魏石刻','北魏石窟','壁画','壁画艺术','壁画墓','画像石','画像砖','纪念碑','经幢','摩崖石刻','石刻','题刻','岩画','造像'] },
    { id: 'archaeology', icon: '🏺', name: '考古遗址',
      tags: ['安州','百年百大考古发现','北辛文化','贝丘遗址','贝丘','边疆考古','彩陶','城墙遗址','城垣建筑','楚国','楚汉','楚文化','大遗址','大汶口文化','稻作','稻作农业','地域文化','洞穴遗址','洞穴','都城遗址','都城','二里头文化','古遗址','古生物','古人类','古滇国','古蜀文明','广西考古','龟兹文化','海洋考古','红山文化','简牍','旧石器时代','巨石文化','聚落遗址','聚落','郡治','考古','考古文化','考古圣地','考古重大发现','考古新发现','考古学文化命名地','良渚文化','龙山文化','龙山','马家窑文化','马家窑','马家浜文化','命名地','女真','齐家文化','青铜文化','青铜','青瓷','屈家岭文化','屈家岭','人类起源','丧葬文化','山城遗址','商代','十大考古新发现','石家河文化','史前','世界文化遗产预备','崧泽文化','陶瓷','铜柱','吴国','吴越','西团山文化','西域','新石器时代','玄菟郡','仰韶文化','仰韶','窑址','岳石文化'] },
    { id: 'tomb', icon: '⚰️', name: '古墓葬',
      tags: ['北朝墓葬','楚墓','地宫','帝王陵','干尸','古墓葬','陵墓','名人墓','墓葬','墓群','墓志','少数民族墓葬','崖墓'] },
    { id: 'military', icon: '⚔️', name: '军事防御',
      tags: ['边境','城墙','烽燧','关隘','海防','海防建筑','红军旧址','警示遗址','军事遗址','军事要塞','军事','抗战纪念','抗倭','抗战','炮台','侵华罪证','屯垦','威海卫','长城'] },
    { id: 'modern', icon: '🚩', name: '近现代史迹',
      tags: ['博物馆','革命遗址','工业遗产','工业','海关建筑','海关','红色旅游','红色','红军长征','会议旧址','近现代史迹','抗战时期','矿业遗址','烈士陵园','领事馆建筑','名人故居','名人纪念建筑','省委省苏','使馆建筑','孙中山','铁路遗产','伪满','租界'] },
    { id: 'transport', icon: '🌉', name: '交通水利',
      tags: ['大运河','灯塔','交通设施','交通遗址','码头','木拱桥','桥梁','水利工程','水利','驿道','驿站','运河','运盐通道'] },
    { id: 'heritage', icon: '🌟', name: '文化遗产',
      tags: ['澳门历史城区','海岛','活态遗产','农业遗产','世界遗产','世界遗产预备','丝绸之路','文化景观','长江'] },
    { id: 'craft', icon: '🎭', name: '工艺非遗',
      tags: ['非遗','工艺','科举','科举建筑','老字号','酿酒','票号','商业','书法','图腾','武术','盐业','盐井','艺术','音乐'] },
    { id: 'ethnic', icon: '🏘️', name: '民族地域',
      tags: ['藏族文化','藏族民居','侗族建筑','多民族','客家','蒙古族','苗族','民族团结','民族英雄','侨乡','少数民族','土家族建筑','游牧','游牧民族','壮族'] },
    { id: 'culture', icon: '📚', name: '文化科教',
      tags: ['朝鲜半岛','慈善','大学校园','家族','家族历史','教育','教育史','教会学校','堪舆','科学研究','科研机构','历史事件','两岸交流','名人','名校','儒学','儒家文化','图书馆','文人','行政中心','医疗','中外交流'] }
  ],

  tagCategoryKeywords: {
    'building': ['殿','阁','楼','亭','村','坊','井'],
    'structure': ['斗栱','檐','顶','角','院落','彩画','瓦','脊'],
    'style': ['派','主义','折衷','洛可可','古典'],
    'religion': ['佛','禅','寺','伊斯兰','天主','基督','清真','藏传','格鲁'],
    'temple': ['庙','祠','坛','祭','祀'],
    'grotto': ['窟','摩崖','经幢','龛','造像'],
    'archaeology': ['文化','遗址','考古','窑','石器','新石器','旧石器'],
    'tomb': ['墓','陵','葬','坟','冢'],
    'military': ['军','战','兵','炮','防','烽','罪证','警示'],
    'modern': ['革命','红军','红色','近代','工业','殖民','租界','抗日'],
    'transport': ['桥','运河','渡','驿','码头','水利','灌溉'],
    'heritage': ['遗产','丝绸之路','活态','线性'],
    'craft': ['瓷','窑','陶','酒','盐','票','书法','雕'],
    'ethnic': ['民族','少数','藏族','蒙古','苗族','壮族','维吾尔','彝族','白族','纳西','侗族','瑶族','土家','羌族','回族','傣族'],
    'culture': ['教育','学校','大学','学院','科研','图书','医疗','慈善']
  },

  _tagCategoryCache: null,
  _keywordToCategory: null,
  _tagCategoryById: null,

  getTagCategory(tagName) {
    if (!this._tagCategoryCache) {
      this._tagCategoryCache = {};
      this._tagCategoryById = {};
      for (const cat of this.tagCategories) {
        this._tagCategoryById[cat.id] = cat;
        for (const t of cat.tags) this._tagCategoryCache[t] = cat;
      }
    }
    if (this._tagCategoryCache[tagName]) return this._tagCategoryCache[tagName];
    // 关键词反向索引：一次构建，多次复用
    if (!this._keywordToCategory) {
      this._keywordToCategory = [];
      for (const [catId, keywords] of Object.entries(this.tagCategoryKeywords)) {
        for (const kw of keywords) this._keywordToCategory.push({ kw, catId });
      }
    }
    for (const { kw, catId } of this._keywordToCategory) {
      if (tagName.includes(kw)) return this._tagCategoryById[catId] || null;
    }
    return null;
  },

  buildingCategories: {
    ancient: { label: '古建筑', key: 'ancient', icon: '🏛️', color: '#8B0000', bgColor: '#FFF0F0', markerColor: '#C0392B', size: 20, matchTypes: ['古建筑'] },
    ruins: { label: '古遗址', key: 'ruins', icon: '🏺', color: '#CD853F', bgColor: '#FFF8F0', markerColor: '#D2691E', size: 20, matchTypes: ['古遗址'] },
    tomb: { label: '古墓葬', key: 'tomb', icon: '⚰️', color: '#708090', bgColor: '#F5F5F5', markerColor: '#5F6B7A', size: 20, matchTypes: ['古墓葬'] },
    grotto: { label: '石窟寺及石刻', key: 'grotto', icon: '🧘', color: '#9370DB', bgColor: '#F5F0FF', markerColor: '#7B68EE', size: 20, matchTypes: ['石窟寺及石刻'] },
    modern: { label: '近现代重要史迹及代表性建筑', key: 'modern', icon: '🏛️', color: '#4169E1', bgColor: '#F0F5FF', markerColor: '#2E5CB8', size: 20, matchTypes: ['近现代重要史迹及代表性建筑'] },
    other: { label: '其他', key: 'other', icon: '📍', color: '#3498DB', bgColor: '#F0F8FF', markerColor: '#2980B9', size: 20, matchTypes: ['其他', ''] }
  },

  eras: [
    { id: 'paleolithic', name: '旧石器', keywords: ['旧石器','更新世','古脊椎'], yearMin: -Infinity, yearMax: -10000 },
    { id: 'neolithic', name: '新石器', keywords: ['新石器','龙山文化'], yearMin: -10000, yearMax: -2000 },
    { id: 'xia', name: '夏', keywords: ['夏代','夏朝','夏','上古'], yearMin: -2070, yearMax: -1600 },
    { id: 'shang', name: '商', keywords: ['商代','商朝','商','青铜时代','殷'], yearMin: -1600, yearMax: -1046 },
    { id: 'western_zhou', name: '西周', keywords: ['西周'], yearMin: -1046, yearMax: -771 },
    { id: 'eastern_zhou', name: '东周', keywords: ['东周'], yearMin: -770, yearMax: -256, timeline: false },
    { id: 'spring_autumn', name: '春秋', keywords: ['春秋'], yearMin: -770, yearMax: -476 },
    { id: 'warring_states', name: '战国', keywords: ['战国'], yearMin: -475, yearMax: -221 },
    { id: 'zhou', name: '周', keywords: ['周代','周朝','周'], yearMin: -1046, yearMax: -256, timeline: false },
    { id: 'qin', name: '秦', keywords: ['秦代','秦朝','秦汉','秦'], yearMin: -221, yearMax: -207 },
    { id: 'western_han', name: '西汉', keywords: ['西汉'], yearMin: -202, yearMax: 9 },
    { id: 'eastern_han', name: '东汉', keywords: ['东汉'], yearMin: 25, yearMax: 220 },
    { id: 'han', name: '汉', keywords: ['汉代','汉朝','汉'], yearMin: -202, yearMax: 220, timeline: false },
    { id: 'three_kingdoms', name: '三国', keywords: ['三国','曹魏'], yearMin: 220, yearMax: 280 },
    { id: 'western_jin', name: '西晋', keywords: ['西晋'], yearMin: 265, yearMax: 316 },
    { id: 'eastern_jin', name: '东晋', keywords: ['东晋'], yearMin: 317, yearMax: 420 },
    { id: 'jin', name: '晋', keywords: ['晋代','晋朝','晋'], yearMin: 265, yearMax: 420, timeline: false },
    { id: 'sixteen_kingdoms', name: '十六国', keywords: ['十六国','后赵'], yearMin: 304, yearMax: 439 },
    { id: 'northern_southern', name: '南北朝', keywords: ['南北朝','北魏','东魏','西魏','北齐','北周','北燕','北朝','南朝'], yearMin: 420, yearMax: 589 },
    { id: 'sui', name: '隋', keywords: ['隋代','隋朝','隋'], yearMin: 581, yearMax: 618 },
    { id: 'tang', name: '唐', keywords: ['唐代','唐朝','唐','高句丽','渤海','南诏'], yearMin: 618, yearMax: 907 },
    { id: 'five_dynasties', name: '五代', keywords: ['五代','南唐','后周'], yearMin: 907, yearMax: 960 },
    { id: 'northern_song', name: '北宋', keywords: ['北宋'], yearMin: 960, yearMax: 1127 },
    { id: 'southern_song', name: '南宋', keywords: ['南宋'], yearMin: 1127, yearMax: 1279 },
    { id: 'song', name: '宋', keywords: ['宋代','宋朝','宋'], yearMin: 960, yearMax: 1279, timeline: false },
    { id: 'western_xia', name: '西夏', keywords: ['西夏'], yearMin: 1038, yearMax: 1227, timeline: false },
    { id: 'liao', name: '辽', keywords: ['辽代','辽朝','辽'], yearMin: 907, yearMax: 1125 },
    { id: 'jin_dynasty', name: '金', keywords: ['金代','金朝','金'], yearMin: 1115, yearMax: 1234 },
    { id: 'yuan', name: '元', keywords: ['元代','元朝','元'], yearMin: 1271, yearMax: 1368 },
    { id: 'ming', name: '明', keywords: ['明代','明朝','明'], yearMin: 1368, yearMax: 1644 },
    { id: 'qing', name: '清', keywords: ['清代','清朝','清'], yearMin: 1644, yearMax: 1912 },
    { id: 'republic', name: '民国', keywords: ['民国','近代','近现代','日治','荷据'], yearMin: 1912, yearMax: 1949 },
    { id: 'prc', name: '中华人民共和国', keywords: ['中华人民共和国','现代'], yearMin: 1949, yearMax: 2030 }
  ],

  eraColors: {
    paleolithic: '#5D4037', neolithic: '#8D6E63', xia: '#F9A825',
    shang: '#F57F17', western_zhou: '#2E7D32', eastern_zhou: '#388E3C',
    spring_autumn: '#43A047', warring_states: '#66BB6A', zhou: '#1B5E20',
    qin: '#7B1FA2', western_han: '#C62828', eastern_han: '#E53935',
    han: '#B71C1C', three_kingdoms: '#FF6D00', western_jin: '#1565C0',
    eastern_jin: '#1E88E5', jin: '#0D47A1', sixteen_kingdoms: '#00838F',
    northern_southern: '#00695C', sui: '#6A1B9A', tang: '#E65100',
    five_dynasties: '#FDD835', northern_song: '#AD1457', southern_song: '#880E4F',
    song: '#C2185B', western_xia: '#FF8F00', liao: '#4527A0',
    jin_dynasty: '#283593', yuan: '#37474F', ming: '#D84315',
    qing: '#1A237E', republic: '#616161', prc: '#C62828'
  },

  _provinceStyleCache: {},
  _lastTheme: null,
  getProvinceStyle(provinceId) {
    if (State.theme !== this._lastTheme) { this._provinceStyleCache = {}; this._lastTheme = State.theme; }
    if (this._provinceStyleCache[provinceId]) return this._provinceStyleCache[provinceId];
    const base = this.provinceStyles[provinceId] || this._defaultProvinceStyle;
    if (State.theme === 'dark') {
      return this._provinceStyleCache[provinceId] = { ...base, bgColor: Utils.darkenHexBg(base.bgColor) };
    }
    return this._provinceStyleCache[provinceId] = { ...base };
  },

  _defaultProvinceStyle: { icon: '📍', color: '#3498db', bgColor: '#ebf5fb' },

  _buildingCategoriesArray: null,

  _initBuildCatArray() {
    if (this._buildingCategoriesArray) return;
    this._buildingCategoriesArray = Object.entries(this.buildingCategories).map(([key, cat]) => ({ ...cat, key }));
  },

  getBuildingCategory(building) {
    this._initBuildCatArray();
    const type = building.t || '';
    for (const cat of this._buildingCategoriesArray) {
      if (cat.matchTypes.includes(type)) {
        if (!(building.g || []).includes('世界遗产')) return cat;
        return { ...cat, size: 26, isWorldHeritage: true };
      }
    }
    const last = this._buildingCategoriesArray[this._buildingCategoriesArray.length - 1];
    return last;
  },

  _tagStyleCache: {},
  _tagThemeCache: null,
  getTagStyle(tagName, index) {
    if (State.theme !== this._tagThemeCache) { this._tagStyleCache = {}; this._tagThemeCache = State.theme; }
    const cacheKey = `${tagName}|${index % 6}`;
    if (this._tagStyleCache[cacheKey]) return this._tagStyleCache[cacheKey];
    const base = this.tagStyles[tagName] || { icon: '🏷️' };
    const pal = this.colorPalette[index % this.colorPalette.length];
    const bg = State.theme === 'dark' ? Utils.darkenHexBg(pal.bg) : pal.bg;
    return this._tagStyleCache[cacheKey] = { icon: base.icon, color: pal.color, bg };
  },

  _dynastyCache: null,

  getEarliestDynasty(eraStr) {
    if (!eraStr || eraStr === '待考' || eraStr.startsWith('不可考') || eraStr.startsWith('估计')) return null;
    if (this._dynastyCache?.has(eraStr)) return this._dynastyCache.get(eraStr);
    if (!this._dynastyCache) this._dynastyCache = new Map();
    for (const e of this.eras) {
      for (const kw of e.keywords) { if (eraStr.includes(kw)) { this._dynastyCache.set(eraStr, e.id); return e.id; } }
    }
    const yearNums = [...eraStr.matchAll(/(\d{3,4})/g)].map(m => parseInt(m[1])).filter(y => y > 0 && y < 2030);
    if (yearNums.length > 0) {
      const year = Math.min(...yearNums);
      for (const e of this.eras) { if (year >= e.yearMin && year <= e.yearMax) { this._dynastyCache.set(eraStr, e.id); return e.id; } }
    }
    const centuryMatch = eraStr.match(/(\d{1,2})世纪/);
    if (centuryMatch) {
      const year = (parseInt(centuryMatch[1]) - 1) * 100 + 1;
      for (const e of this.eras) { if (year >= e.yearMin && year <= e.yearMax) { this._dynastyCache.set(eraStr, e.id); return e.id; } }
    }
    this._dynastyCache.set(eraStr, null);
    return null;
  },

  TILE_URLS: {
    OSM: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    SAT: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ROAD: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    LABELS: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
  }
};

// ==================== State ====================

const State = {
  currentView: 'home',
  currentProvince: null,
  currentDistrict: null,
  currentBuildingName: null,
  currentTag: null,
  currentTrailId: null,
  currentTrailType: null,
  currentTagCategory: null,

  theme: localStorage.getItem('theme') || 'light',

  _provinceMeta: null,
  _trailRegistry: null,
  _allBuildingsCache: null,
  _allTagsCache: null,
  _tagBuildingsCache: {},
  _buildingNameIndex: null,
  _cachedLoadedCount: 0,

  async initMeta() {
    // Try localStorage cache first for instant first render
    const cacheKey = 'guobao_meta_v1';
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        this._provinceMeta = parsed.provinces;
        this._trailRegistry = parsed.trail;
      }
    } catch (_) {}
    try {
      const [provincesRes, trailRes] = await Promise.all([
        HashSearch.fetchJSON('/data/provinces.json'),
        HashSearch.fetchJSON('/trail/registry.json')
      ]);
      this._provinceMeta = provincesRes;
      this._trailRegistry = trailRes;
      try { localStorage.setItem(cacheKey, JSON.stringify({ provinces: provincesRes, trail: trailRes })); } catch (_) {}
    } catch (e) {
      console.error('Failed to load meta data:', e);
      if (!this._provinceMeta) { this._provinceMeta = { provinces: [], protectionLabels: {} }; this._trailRegistry = []; }
    }
  },

  getProvinceMeta() { return this._provinceMeta; },
  getTrailRegistry() { return this._trailRegistry; },

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
    if (provinceId === 'cross') return '跨省';
    if (provinceId in this._provinceNameCache) return this._provinceNameCache[provinceId];
    const p = this.getProvinceById(provinceId);
    const name = p ? p.name : provinceId;
    this._provinceNameCache[provinceId] = name;
    return name;
  },

  _protectionLabelCache: {},

  getProtectionLabel(provinceId) {
    if (provinceId in this._protectionLabelCache) return this._protectionLabelCache[provinceId];
    const label = this._provinceMeta?.protectionLabels?.[provinceId] || '全国重点文物保护单位';
    this._protectionLabelCache[provinceId] = label;
    return label;
  },

  getAllBuildings() {
    const currentLoadedCount = HashSearch.getCacheStats().loadedProvinces;
    if (this._allBuildingsCache && currentLoadedCount === this._cachedLoadedCount) return this._allBuildingsCache;
    const all = [];
    this._buildingNameIndex = new Map();
    const allData = HashSearch.getAllProvinceData();
    for (const [provinceId, data] of allData) {
      const provinceName = this.getProvinceName(provinceId);
      if (data.bs) {
        HashSearch._resolveDistrictNames(data);
        for (const b of data.bs) {
          b.p = provinceName;
          b.pid = provinceId;
          all.push(b);
          this._buildingNameIndex.set(`${provinceName}${b.dn || ''}${b.n}`, b);
        }
      }
    }
    this._allBuildingsCache = all;
    this._cachedLoadedCount = currentLoadedCount;
    return all;
  },

  getAllTags() {
    if (this._allTagsCache) return this._allTagsCache;
    const tagCount = {};
    this.getAllBuildings().forEach(b => { if (b.g) b.g.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1; }); });
    this._allTagsCache = Object.entries(tagCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return this._allTagsCache;
  },

  getBuildingsByTag(tag) {
    if (this._tagBuildingsCache[tag]) return this._tagBuildingsCache[tag];
    const result = this.getAllBuildings().filter(b => b.g && b.g.some(t => t === tag));
    this._tagBuildingsCache[tag] = result;
    return result;
  },

  getBuildingsByDistrict(provinceId, districtId) {
    const data = HashSearch.getProvinceData(provinceId);
    if (!data?.bs) return [];
    const provinceName = this.getProvinceName(provinceId);
    return data.bs.filter(b => {
      if (b.d !== districtId) return false;
      b.p = b.p || provinceName;
      b.pid = b.pid || provinceId;
      return true;
    });
  },

  getDistrictData(provinceId, districtId) {
    const data = HashSearch.getProvinceData(provinceId);
    if (data?.ds?.[districtId]) return { id: districtId, ...data.ds[districtId] };
    return null;
  },

  getAllDistricts(provinceId) {
    const data = HashSearch.getProvinceData(provinceId);
    if (!data?.ds) return [];
    return Object.entries(data.ds).map(([id, d]) => ({ id, ...d }));
  },

  findBuildingByFullPath(fullPath) {
    if (!fullPath) return null;
    if (this._buildingNameIndex?.has(fullPath)) return this._buildingNameIndex.get(fullPath);
    const allBuildings = this.getAllBuildings();
    let building = allBuildings.find(b => b.n === fullPath);
    if (!building) building = allBuildings.find(b => { const dn = b.dn || ''; return `${b.p}${dn}${b.n}` === fullPath; });
    if (!building) {
      const allData = HashSearch.getAllProvinceData();
      for (const [provinceId, data] of allData) {
        if (!data.bs) continue;
        const provinceName = this.getProvinceName(provinceId);
        for (const b of data.bs) {
          if (`${provinceName}${b.dn || ''}${b.n}` === fullPath) return { ...b, p: provinceName, pid: provinceId };
        }
      }
    }
    return building;
  },

  resolveBuildingRef(buildingRef) {
    if (!buildingRef) return null;
    if (buildingRef.embedded) return buildingRef.embedded;
    const allBuildings = this.getAllBuildings();
    const byName = allBuildings.find(b => b.n === buildingRef.n);
    if (!byName) return null;
    if (buildingRef.p && byName.pid !== buildingRef.p) {
      return allBuildings.find(b => b.n === buildingRef.n && b.pid === buildingRef.p) || byName;
    }
    return byName;
  },

  clearCache() {
    this._allBuildingsCache = null;
    this._allTagsCache = null;
    this._tagBuildingsCache = {};
    this._buildingNameIndex = null;
    this._cachedLoadedCount = 0;
  }
};

// ==================== Utils ====================

const Utils = {

  darkenHexBg(hex) {
    // Convert a light pastel hex bg color to a dark-friendly version
    if (!hex || !hex.startsWith('#')) return hex || '';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Darken by blending with dark background: mix with #0d1117 at ~15% lightness
    const dr = Math.round(r * 0.2 + 13 * 0.8);
    const dg = Math.round(g * 0.2 + 17 * 0.8);
    const db = Math.round(b * 0.2 + 23 * 0.8);
    const toHex = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
    return `#${toHex(dr)}${toHex(dg)}${toHex(db)}`;
  },

  truncateText(text, maxLength, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
  },

  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  CLUE_STAGES: [
    { key: 'architecture', label: '建筑风格', icon: '🏗️', hint: '这道建筑以什么风格著称？' },
    { key: 'description', label: '特色介绍', icon: '✨', hint: '看看它的特色描述...' },
    { key: 'features', label: '特色与价值', icon: '💎', hint: '它有什么独特价值？' },
    { key: 'history', label: '历史背景', icon: '📜', hint: '回顾它的历史...' },
    { key: 'location', label: '地区', icon: '📍', hint: '它在哪里？' },
    { key: 'era', label: '年代', icon: '📅', hint: '它属于什么年代？' }
  ],

  getLocationClue(b) { return b.l || '暂无地区信息'; },

  _hintPrompts: [
    '🤔提示？它的建筑风格很特别！', '🧐没头绪？我来描绘它的特色～',
    '🎯再想想？它的特点会有帮助！', '📖或许答案就在它的故事里：',
    '🗺️方向不对？看看它在哪里！', '⏳最后一击！年代即将揭晓～'
  ],

  getHintPrompt(nextStageIndex) {
    return this._hintPrompts[nextStageIndex] || '💡 让我来帮你！';
  },

  getClueText(stageKey, building) {
    switch (stageKey) {
      case 'architecture': return building.arch || '暂无建筑风格信息';
      case 'description': return building.desc || '暂无特色介绍';
      case 'features': return building.feat || '暂无特色与价值信息';
      case 'history': return building.hist || '暂无历史背景信息';
      case 'location': return this.getLocationClue(building) || '暂无地区信息';
      case 'era': {
        const eraTags = (building.g || []).join(' · ');
        return `年代：${building.e || '暂无信息'} · ${eraTags || '暂无标签'}`;
      }
      default: return '';
    }
  },

  checkAnswer(userInput, correctName) {
    if (!userInput.trim()) return false;
    const input = userInput.trim().toLowerCase();
    const correct = correctName.toLowerCase();
    const correctLen = correct.length;
    if (input === correct) return true;
    const minInputLen = correctLen <= 3 ? correctLen : Math.max(3, Math.ceil(correctLen * 0.75));
    const stripped = correct.replace(/(故城|遗址|古城|墓群|陵墓|石窟|寺庙|塔|桥|村|镇|山|河|湖|海)$/, '');
    if (stripped !== correct && input === stripped) return true;
    if (correct.includes(input) && input.length >= minInputLen) return true;
    if (input.includes(correct) && correctLen >= minInputLen && correctLen >= 3) return true;
    return false;
  },

  sanitizeClueText(text, building, stageKey) {
    if (!text || !building) return text;
    let result = text;
    // Simple replacements using replaceAll (no regex overhead)
    result = result.replaceAll(building.n, '该建筑');
    const coreName = building.n.replace(/(故城|遗址|古城|墓群|陵墓|石窟|寺庙|塔|桥|村|镇|山|河|湖|海|旧址|古墓|建筑群|衙门|祠堂|民居|大院|庄园|关隘|长城|烽燧|驿站|会馆|书院|孔庙|文庙|道观|佛寺|寺院|庵堂|宫观|教堂|清真寺|墓园|石刻|碑林|造像|经幢|古建|群)$/, '');
    if (coreName !== building.n && coreName.length >= 2) {
      result = result.replaceAll(coreName, '该建筑');
    }
    if (stageKey && stageKey !== 'location' && stageKey !== 'era') {
      if (building.p) result = result.replaceAll(building.p, '该地区');
      if (building.dn) result = result.replaceAll(building.dn, '当地');
      if (building.e) result = result.replaceAll(building.e, '某个时期');
    }
    return result;
  },

  generateProtectionBadge(building) {
    if (building.wh) {
      return `<span class="protection-badge protection-badge--heritage">🌍 世界遗产${building.why ? '·' + building.why : ''}</span>`;
    }
    const pl = building.protectionLevel || '全国重点文物保护单位';
    if (pl.includes('全国重点文物保护单位')) {
      return `<span class="protection-badge protection-badge--national">${building.pb || '全国重点'}</span>`;
    }
    return '';
  },

  generateBuildingHash(building, getProvinceName) {
    const provinceName = building.p || (getProvinceName ? getProvinceName(building.pid) : '') || '';
    const districtName = building.dn || '';
    const pid = building.pid ? `&pid=${building.pid}` : '';
    return `?page=building&name=${encodeURIComponent(`${provinceName}${districtName}${building.n}`)}${pid}`;
  },

  _cardPriority: {'世界遗产':1,'古建筑':1,'近代建筑':1,'寺庙':1,'宫殿':1,'园林':1,'陵墓':1,'石窟':1,'塔':1,'桥梁':1,'革命遗址':1,'名人故居':1},
  _cachedProvinceNameFn: null,

  createBuildingCard(building, opts = {}) {
    const { matchReasons, maxTags = 5 } = opts;
    if (!this._cachedProvinceNameFn) this._cachedProvinceNameFn = State.getProvinceName.bind(State);
    const href = this.generateBuildingHash(building, this._cachedProvinceNameFn);
    const provinceStyle = Config.getProvinceStyle(building.pid);
    const protectionBadge = this.generateProtectionBadge(building);
    const shortDesc = building.desc ? (building.desc.length > 60 ? building.desc.slice(0, 60) : building.desc) : '';
    const priority = this._cardPriority;
    const tags = building.g || [];
    const sortedTags = tags.length > maxTags ? [...tags].sort((a, b) => {
      const ap = priority[a]|0, bp = priority[b]|0;
      return bp - ap;
    }) : tags;
    const matchReasonsHtml = matchReasons?.length
      ? `<div class="match-reasons">${matchReasons.map(r => `<span class="match-reason">${r}</span>`).join('')}</div>` : '';
    return `
    <div class="building-card" data-href="${href}" style="border-left-color: ${provinceStyle.color};">
      <div class="building-card-header" style="background: ${provinceStyle.bgColor};">
        <div class="building-card-header-left">
          <div class="building-province-icon" style="color: ${provinceStyle.color};">${provinceStyle.icon}</div>
          <div class="building-district">${building.dn === '跨省文物保护单位' ? '跨省' : building.dn}</div>
        </div>
        ${protectionBadge}
      </div>
      <div class="building-content">
        <h3 class="building-title">${building.n}</h3>
        ${matchReasonsHtml}
        <div class="building-meta">
          <span class="building-era">📅 ${building.e}</span>
          <span class="building-type">${this.truncateText(building.t, 12)}</span>
        </div>
        <p class="building-desc">${shortDesc}</p>
        <div class="building-tags">
          ${sortedTags.slice(0, maxTags).map((tag, idx) => {
            const ts = Config.getTagStyle(tag, idx);
            return `<span class="building-tag" style="background: ${ts.bg}; color: ${ts.color};">${ts.icon} ${tag}</span>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }
};

// ==================== UI ====================

const UI = {
  setupTheme() {
    document.documentElement.setAttribute('data-theme', State.theme);
  },

  toggleTheme() {
    State.theme = State.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', State.theme);
    localStorage.setItem('theme', State.theme);
  },

  setupEventListeners(onNavigate) {
    document.querySelector('.theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    document.querySelector('.nav-toggle')?.addEventListener('click', () => {
      document.querySelector('.nav-menu')?.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      const card = target.closest('.building-card');
      if (card) { e.preventDefault(); onNavigate(card.getAttribute('data-href')); return; }
      const link = target.closest('[data-nav]');
      if (link) {
        if (link.getAttribute('target') === '_blank') return;
        e.preventDefault(); onNavigate(link.getAttribute('href') || link.getAttribute('data-nav'));
      }
    });
    window.addEventListener('popstate', () => { window.dispatchEvent(new CustomEvent('route-change')); });
  },

  updateBreadcrumb() {
    const breadcrumbList = document.getElementById('breadcrumbList');
    if (!breadcrumbList) return;
    let items = [{ name: '🏠 首页', href: '?page=home' }];
    const v = State.currentView;
    if (v === 'provinces') items.push({ name: '🗺️ 省份' });
    else if (v === 'province' && State.currentProvince) {
      items.push({ name: '🗺️ 省份', href: '?page=provinces' });
      const province = State.getProvinceById(State.currentProvince);
      if (province) items.push({ name: `${Config.getProvinceStyle(State.currentProvince).icon} ${province.name}` });
    } else if (v === 'district') {
      items.push({ name: '🗺️ 省份', href: '?page=provinces' });
      const province = State.getProvinceById(State.currentProvince);
      if (province) items.push({ name: `${Config.getProvinceStyle(State.currentProvince).icon} ${province.name}`, href: `?page=province&id=${province.id}` });
      const district = State.getDistrictData(State.currentProvince, State.currentDistrict);
      if (district) items.push({ name: `📍 ${district.n}` });
    } else if (v === 'building' && State.currentBuildingName) {
      const building = State.findBuildingByFullPath(State.currentBuildingName);
      items.push({ name: '🗺️ 省份', href: '?page=provinces' });
      if (building) {
        const pStyle = Config.getProvinceStyle(building.pid);
        if (building.pid === 'cross') {
          items.push({ name: `${pStyle.icon} ${building.p}`, href: '?page=cross' });
          items.push({ name: `📍 ${building.dn}`, href: '?page=cross' });
        } else {
          items.push({ name: `${pStyle.icon} ${building.p}`, href: `?page=province&id=${building.pid}` });
          items.push({ name: `📍 ${building.dn}`, href: `?page=district&pid=${building.pid}&did=${building.d}` });
        }
        items.push({ name: `🏛️ ${building.n}` });
      }
    } else if (v === 'tags') items.push({ name: '🏷️ 标签' });
    else if (v === 'tag') {
      items.push({ name: '🏷️ 标签', href: '?page=tags' });
      items.push({ name: `${Config.getTagStyle(decodeURIComponent(State.currentTag), 0).icon} ${decodeURIComponent(State.currentTag)}` });
    } else if (v === 'search') items.push({ name: '🔍 搜索' });
    else if (v === 'quiz') items.push({ name: '🗝️ 猜保' });
    else if (v === 'cross') items.push({ name: '🌊 跨省文物保护单位' });
    else if (v === 'trail') items.push({ name: '👣 足迹' });
    else if (v === 'map') items.push({ name: '🗺️ 地图' });
    else if (v === 'trail-detail' && State.currentTrailId) {
      items.push({ name: '👣 足迹', href: '?page=trail' });
      const trail = State.getTrailRegistry()?.find(t => t.id === State.currentTrailId);
      if (trail) {
        const _tl = { game: '🎮 游戏', novel: '📚 古典', journal: '📝 游记', drama: '🎭 戏曲', history: '📜 历史' };
        if (trail.type && _tl[trail.type]) items.push({ name: _tl[trail.type], href: `?page=trail&type=${trail.type}` });
        items.push({ name: `${trail.icon} ${trail.title}` });
      }
    }
    breadcrumbList.innerHTML = items.map((item, index) => {
      if (index === items.length - 1 || !item.href) return `<li class="active">${item.name}</li>`;
      return `<li><a href="${item.href}" data-nav>${item.name}</a></li>`;
    }).join('');
  },

  updateActiveNav() {
    document.querySelectorAll('.nav-menu__link').forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      const v = State.currentView;
      if ((v === 'trail' || v === 'trail-detail') && href === '?page=trail') link.classList.add('active');
      else if (href === `?page=${v}`) link.classList.add('active');
    });
  },

  async createSatelliteMap(mapDiv, lat, lng) {
    if (!mapDiv || !lat || !lng) return;
    await ensureLeaflet();
    const map = L.map(mapDiv, {
      center: [lat, lng], zoom: 15, zoomControl: true, attributionControl: false
    });
    const osm = L.tileLayer(Config.TILE_URLS.OSM, { maxZoom: 18, attribution: '© OpenStreetMap' });
    const sat = L.tileLayer(Config.TILE_URLS.SAT, { maxZoom: 19 });
    const road = L.tileLayer(Config.TILE_URLS.ROAD, { maxZoom: 18, opacity: 0.7 });
    const labels = L.tileLayer(Config.TILE_URLS.LABELS, { maxZoom: 18, opacity: 0.6 });
    const satGroup = L.layerGroup([sat, road, labels]);
    L.control.layers({ '标准': osm, '卫星': satGroup }, null, { position: 'bottomleft', collapsed: true }).addTo(map);
    satGroup.addTo(map);
    const markerIcon = L.divIcon({
      className: 'quiz-satellite-marker',
      html: '<div class="quiz-satellite-pin"></div><div class="quiz-satellite-pulse"></div>',
      iconSize: [20, 20], iconAnchor: [10, 10]
    });
    L.marker([lat, lng], { icon: markerIcon }).addTo(map);
    setTimeout(() => { map.invalidateSize(); }, 100);
  },

  injectStructuredData() {
    let script = document.getElementById('ld-json');
    if (!script) {
      script = document.createElement('script');
      script.id = 'ld-json';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    const breadcrumbs = [];
    const items = document.querySelectorAll('#breadcrumbList li');
    items.forEach((li, i) => {
      const a = li.querySelector('a');
      const name = li.textContent.trim();
      if (a) breadcrumbs.push({ '@type': 'ListItem', position: i + 1, name, item: new URL(a.href, location.origin).href });
      else breadcrumbs.push({ '@type': 'ListItem', position: i + 1, name });
    });
    const ld = { '@context': 'https://schema.org', '@graph': [] };
    if (breadcrumbs.length > 1) ld['@graph'].push({ '@type': 'BreadcrumbList', itemListElement: breadcrumbs });
    script.textContent = JSON.stringify(ld);
  }
};

// ==================== Router ====================

const Router = {
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
    document.querySelector('.nav-menu')?.classList.remove('active');
    return parsed;
  },

  navigateTo(url) {
    window.history.pushState({}, '', url);
    this.parseParams();
    window.dispatchEvent(new CustomEvent('route-change'));
  },

  _moduleMap: {
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
    'trail-detail': () => import('./pages/trail-detail.js'),
    'quiz': () => import('./pages/quiz.js')
  },
  _moduleCache: {},

  async loadPageModule(viewName) {
    if (this._moduleCache[viewName]) return this._moduleCache[viewName];
    const loader = this._moduleMap[viewName];
    if (loader) {
      try { const mod = await loader(); const m = mod.default || mod; this._moduleCache[viewName] = m; return m; }
      catch (e) { console.error(`Failed to load page module: ${viewName}`, e); return null; }
    }
    return null;
  }
};

// ==================== 统一导出 ====================
export { HashSearch, Config, State, Utils, UI, Router, ensureLeaflet };
