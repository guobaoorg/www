/**
 * 工具函数模块
 */
import Config from './config.js';
import State from './state.js';

const Utils = {
  _cache: new Map(),
  _cacheLimits: {
    protectionBadges: 50,
    truncatedTexts: 500
  },

  /**
   * 截断文本
   */
  truncateText(text, maxLength, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    const cacheKey = `trunc_${text.length}_${maxLength}_${suffix}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);
    const result = text.substring(0, maxLength) + suffix;
    if (this._cache.size >= this._cacheLimits.truncatedTexts) {
      this._cache.delete(this._cache.keys().next().value);
    }
    this._cache.set(cacheKey, result);
    return result;
  },

  /**
   * 随机打乱数组
   */
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * 生成保护级别徽章 HTML
   */
  generateProtectionBadge(building) {
    const cacheKey = `badge_${building.worldHeritage}_${building.worldHeritageYear}_${building.protectionLevel}_${building.protectionBatch}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);
    let result = '';
    if (building.worldHeritage) {
      result = `<span class="protection-badge protection-badge--heritage">🌍 世界遗产${building.worldHeritageYear ? '·' + building.worldHeritageYear : ''}</span>`;
    } else if (building.protectionLevel && building.protectionLevel.includes('全国重点文物保护单位')) {
      result = `<span class="protection-badge protection-badge--national">${building.protectionBatch || '全国重点'}</span>`;
    }
    if (this._cache.size >= this._cacheLimits.protectionBadges) {
      this._cache.delete(this._cache.keys().next().value);
    }
    this._cache.set(cacheKey, result);
    return result;
  },

  /**
   * 生成建筑哈希链接
   */
  generateBuildingHash(building, getProvinceName) {
    const provinceName = building.province || (getProvinceName ? getProvinceName(building.provinceId) : '') || '';
    const districtName = building.districtName || '';
    const fullPath = `${provinceName}${districtName}${building.name}`;
    const pid = building.provinceId ? `&pid=${building.provinceId}` : '';
    return `?page=building&name=${encodeURIComponent(fullPath)}${pid}`;
  },

  /**
   * 生成建筑卡片 HTML（统一入口，所有页面模块共用）
   * @param {object} building - 建筑数据
   * @param {object} [opts] - 可选参数
   * @param {string[]} [opts.matchReasons] - 搜索匹配原因
   * @param {number} [opts.maxTags] - 最多显示标签数，默认 5
   */
  createBuildingCard(building, opts = {}) {
    const { matchReasons, maxTags = 5 } = opts;
    const href = this.generateBuildingHash(building, State.getProvinceName.bind(State));
    const provinceStyle = Config.getProvinceStyle(building.provinceId);
    const protectionBadge = this.generateProtectionBadge(building);
    const shortDesc = this.truncateText(building.description, 60, '');
    const priorityTags = ['世界遗产', '古建筑', '近代建筑', '寺庙', '宫殿', '园林', '陵墓', '石窟', '塔', '桥梁', '革命遗址', '名人故居'];
    const tags = building.tags || [];
    const sortedTags = [...tags].sort((a, b) => {
      const ap = priorityTags.indexOf(a), bp = priorityTags.indexOf(b);
      if (ap !== -1 && bp === -1) return -1;
      if (ap === -1 && bp !== -1) return 1;
      return 0;
    });

    const matchReasonsHtml = matchReasons?.length
      ? `<div class="match-reasons">${matchReasons.map(r => `<span class="match-reason">${r}</span>`).join('')}</div>`
      : '';

    return `
    <div class="building-card" data-href="${href}" style="border-left-color: ${provinceStyle.color};">
      <div class="building-card-header" style="background: ${provinceStyle.bgColor};">
        <div class="building-card-header-left">
          <div class="building-province-icon" style="color: ${provinceStyle.color};">${provinceStyle.icon}</div>
          <div class="building-district">${building.districtName === '跨省文物保护单位' ? '跨省' : building.districtName}</div>
        </div>
        ${protectionBadge}
      </div>
      <div class="building-content">
        <h3 class="building-title">${building.name}</h3>
        ${matchReasonsHtml}
        <div class="building-meta">
          <span class="building-era">📅 ${building.era}</span>
          <span class="building-type">${this.truncateText(building.type, 12)}</span>
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
  },

  clearCache() {
    this._cache.clear();
  }
};

export default Utils;