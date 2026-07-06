import { Config } from './config.js';
import { State } from './state.js';
import { HashSearch } from './hash-search.js';
import { t as i18nT } from './i18n.js';

// 模块级常量：卡片标签排序优先级
const CARD_PRIORITY = { '世界遗产': 1, '古建筑': 1, '近代建筑': 1, '寺庙': 1, '宫殿': 1, '园林': 1, '陵墓': 1, '石窟': 1, '塔': 1, '桥梁': 1, '革命遗址': 1, '名人故居': 1 };

let _clueStagesCache = null;
let _clueStagesLang = null;
let _hintPromptsCache = null;
let _hintPromptsLang = null;

const Utils = {

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  truncateText(text, maxLength, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
  },

  get CLUE_STAGES() {
    if (_clueStagesCache && _clueStagesLang === State.lang) return _clueStagesCache;
    _clueStagesLang = State.lang;
    return _clueStagesCache = [
      { key: 'architecture', label: i18nT('quiz.clueStageArch'), icon: '🏗️', hint: i18nT('quiz.hintPrompt1') },
      { key: 'description', label: i18nT('quiz.clueStageDesc'), icon: '✨', hint: i18nT('quiz.hintPrompt2') },
      { key: 'features', label: i18nT('quiz.clueStageFeat'), icon: '💎', hint: i18nT('quiz.hintPrompt3') },
      { key: 'history', label: i18nT('quiz.clueStageHist'), icon: '📜', hint: i18nT('quiz.hintPrompt4') },
      { key: 'location', label: i18nT('quiz.clueStageLoc'), icon: '📍', hint: i18nT('quiz.hintPrompt5') },
      { key: 'era', label: i18nT('quiz.clueStageEra'), icon: '📅', hint: i18nT('quiz.hintPrompt6') }
    ];
  },

  getHintPrompt(nextStageIndex) {
    if (!_hintPromptsCache || _hintPromptsLang !== State.lang) {
      _hintPromptsLang = State.lang;
      _hintPromptsCache = [
        i18nT('quiz.hintPrompt1'), i18nT('quiz.hintPrompt2'),
        i18nT('quiz.hintPrompt3'), i18nT('quiz.hintPrompt4'),
        i18nT('quiz.hintPrompt5'), i18nT('quiz.hintPrompt6')
      ];
    }
    return _hintPromptsCache[nextStageIndex] || i18nT('quiz.hintDefault');
  },

  getClueText(stageKey, building) {
    switch (stageKey) {
      case 'architecture': return building.arch || i18nT('quiz.noArch');
      case 'description': return building.desc || i18nT('quiz.noDesc');
      case 'features': return building.feat || i18nT('quiz.noFeat');
      case 'history': return building.hist || i18nT('quiz.noHist');
      case 'location': return this.getLocationClue(building) || i18nT('quiz.noLoc');
      case 'era': {
        const eraTags = (building.g || []).join(' · ');
        return `${i18nT('quiz.era')}：${building.e || i18nT('quiz.noEra')} · ${eraTags || i18nT('quiz.noTags')}`;
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
    const isEn = State.lang === 'en';
    const placeholder = isEn ? 'this site' : '该建筑';
    let result = text.replaceAll(building.n, placeholder);
    const coreName = building.n.replace(/(故城|遗址|古城|墓群|陵墓|石窟|寺庙|塔|桥|村|镇|山|河|湖|海|旧址|古墓|建筑群|衙门|祠堂|民居|大院|庄园|关隘|长城|烽燧|驿站|会馆|书院|孔庙|文庙|道观|佛寺|寺院|庵堂|宫观|教堂|清真寺|墓园|石刻|碑林|造像|经幢|古建|群)$/, '');
    if (coreName !== building.n && coreName.length >= 2) result = result.replaceAll(coreName, placeholder);
    if (stageKey && stageKey !== 'location' && stageKey !== 'era') {
      if (building.p) result = result.replaceAll(building.p, isEn ? 'this region' : '该地区');
      if (building.dn) result = result.replaceAll(building.dn, isEn ? 'locally' : '当地');
      if (building.e) result = result.replaceAll(building.e, isEn ? 'a certain period' : '某个时期');
    }
    return result;
  },

  generateProtectionBadge(building) {
    const g = building.g || [];
    if (g.includes('世界遗产') || g.includes('World Heritage')) {
      return `<span class="protection-badge protection-badge--heritage">${i18nT('building.badgeWH')}</span>`;
    }
    const pl = building.protectionLevel || i18nT('building.badgeNational');
    if (pl.includes('全国重点文物保护单位') || pl.includes('National Protected Site')) {
      return `<span class="protection-badge protection-badge--national">${building.pb || i18nT('map.badgeNationalShort')}</span>`;
    }
    return '';
  },

  generateBuildingUrl(building) {
    const d = building.d || '';
    const n = (building.en || building.n || '').replace(/\s+/g, '_');
    let url = `?page=building&d=${d}&n=${encodeURIComponent(n)}`;
    if (State.lang === 'en') url += '&lang=en';
    return url;
  },

  getDisplayName(building) {
    return (State.lang === 'en' && building.en) ? building.en : building.n;
  },

  getLocationString(building) {
    const isEn = State.lang === 'en';
    const p = building.p || '';
    const cn = building.cn || '';
    const dn = building.dn || '';
    const isTwoLevel = Config.MCITIES.has(building.pid);
    const parts = isTwoLevel ? [p, dn] : [p, cn, dn];
    if (isEn) {
      return parts.filter(Boolean).join(', ');
    }
    return parts.filter(Boolean).join('');
  },

  createBuildingCard(building, opts = {}) {
    const { matchReasons, maxTags = 5 } = opts;
    const href = this.generateBuildingUrl(building);
    const provinceStyle = Config.getProvinceStyle(building.pid, State.theme);
    const protectionBadge = this.generateProtectionBadge(building);
    const desc = building.desc;
    const shortDesc = desc ? (desc.length > 60 ? desc.slice(0, 60) : desc) : '';
    const tags = building.g || [];
    const maxT = maxTags;
    const tagCount = tags.length;
    let sortedTags = tags;
    if (tagCount > maxT) {
      const tagMap = Config._tagEnToZh || {};
      sortedTags = [...tags].sort((a, b) => ((CARD_PRIORITY[b] || CARD_PRIORITY[tagMap[b]] || 0) - (CARD_PRIORITY[a] || CARD_PRIORITY[tagMap[a]] || 0)));
    }
    const matchHtml = matchReasons?.length ? `<div class="building-card__match-reasons">${matchReasons.map(r => `<span class="building-card__match-reason">${i18nT(HashSearch._fieldToI18n[r] || r)}</span>`).join('')}</div>` : '';
    const dn = building.dn === '跨省文物保护单位' ? (State?.lang === 'en' ? 'Cross-Province' : '跨省') : (building.dn === 'Cross-Province Heritage Sites' ? (State?.lang === 'en' ? 'Cross-Province' : '跨省') : building.dn);
    const t12 = this.truncateText(building.t, 12);
    const tagsHtml = sortedTags.slice(0, maxT).map((tag, idx) => {
      const ts = Config.getTagStyle(tag, idx, State.theme);
      return `<span class="building-card__tag" style="background:${ts.bg};color:${ts.color};">${ts.icon} ${tag}</span>`;
    }).join('');
    return `<div class="building-card" data-href="${href}" style="border-left-color:${provinceStyle.color};"><div class="building-card-header" style="background:${provinceStyle.bgColor};"><div class="building-card-header-left"><div class="building-card__province-icon" style="color:${provinceStyle.color};">${provinceStyle.icon}</div><div class="building-card__district">${dn}</div></div>${protectionBadge}</div><div class="building-card__body"><h3 class="building-title">${this.getDisplayName(building)}</h3>${matchHtml}<div class="building-meta"><span class="building-era">📅 ${building.e}</span><span class="building-type">${t12}</span></div><p class="building-desc">${shortDesc}</p><div class="building-card__tags">${tagsHtml}</div></div></div>`;
  },

  getEraSummary(buildings) {
    const eras = {};
    buildings.forEach(b => { if (b.e) eras[b.e] = (eras[b.e] || 0) + 1; });
    return Object.entries(eras).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([era, count]) => `${era}(${count})`).join(' · ');
  },

  getTagSummary(buildings) {
    const tags = new Set();
    buildings.forEach(b => { if (b.g) b.g.forEach(tag => tags.add(tag)); });
    const arr = [...tags];
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr.slice(0, 7);
  },

  renderCrossCard(b, style) {
    const stops = (b.route?.stops) || [];
    const refCount = stops.reduce((s, st) => s + (st.buildings || []).length, 0);
    const pbLabel = b.pb || '';
    const eLabel = (b.e || '').replace(/[／]/g, '/');
    const stopUnit = State?.lang === 'en' ? ' stops' : '站';
    const refUnit = State?.lang === 'en' ? ' sites' : '处国保';
    return `<div class="province-card" data-nav href="?page=trail-detail&id=${b.cid}" style="border-left-color: ${style.color};"><div class="province-icon" style="background: ${style.bgColor}; color: ${style.color};">${style.icon}</div><div class="province-info"><div class="province-name">${b.n}</div><div class="province-count">${pbLabel ? pbLabel + ' · ' : ''}${eLabel} · ${stops.length}${stopUnit}${refCount > 0 ? ' · ' + refCount + refUnit : ''}</div></div></div>`;
  },

  splitText(text) {
    return text.split('\n\n').map(p => {
      if (p.startsWith('<div') || p.startsWith('</div')) return p;
      return '<p>' + p + '</p>';
    }).join('');
  }
};

export { Utils };