import { HashSearch } from './hash-search.js';
import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

export async function render(container, destroyMapFn) {
  try {
    await _render(container, destroyMapFn);
  } catch (e) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div><div class="empty-state-subtitle">${Utils.escapeHtml(e.message || e)}</div></div></div>`;
  }
}

async function _render(container, destroyMapFn) {
  // 优先使用新格式查找
  let buildingName = State.currentBuildingName;
  let pid = State.currentProvince;
  let building = null;
  // 捕获当前语言，避免在异步操作期间 State.lang 被改变导致缓存键不一致
  const lang = State.lang;

  if (State.currentBuildingPid && State.currentBuildingN) {
    // 新格式：pid + d + n（n 为英文名，通过 en 字段匹配）
    pid = State.currentBuildingPid;
    // URL 中使用下划线代替空格，解析时还原为空格进行匹配
    buildingName = State.currentBuildingN.replace(/_/g, ' ');
    const buildingD = State.currentBuildingD;
    // 加载省份数据
    let provinceData = null;
    if (pid) {
      try {
        provinceData = await HashSearch.loadProvinceData(pid, lang);
        if (!provinceData) {
          container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div></div></div>`;
          return;
        }
      } catch (loadErr) {
        container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div><div class="empty-state-subtitle">Load error: ${Utils.escapeHtml(loadErr.message)}</div></div></div>`;
        return;
      }
    }
    // 查找建筑：先精确匹配，再名称匹配（支持 en 字段和 n 字段）
    const allData = provinceData;
    if (Array.isArray(allData)) {
      if (buildingD) {
        building = allData.find(b => b.d === buildingD && (b.en === buildingName || b.n === buildingName));
      }
      if (!building) {
        building = allData.find(b => b.en === buildingName || b.n === buildingName);
      }
    }
    // 清除 State 衍生缓存，确保后续 getAllBuildings 等使用最新数据
    State._resetDerivedCaches();
    // 如果找到，更新 URL 为新格式（空格替换为下划线）
    if (building) {
      building.pid = building.pid || pid;
      building.p = building.p || State.getProvinceName(pid);
      const newUrl = Utils.generateBuildingUrl(building);
      // 只在当前 URL 不一致时更新
      const curSearch = window.location.search;
      const newSearch = newUrl.substring(1);
      if (curSearch !== newSearch) {
        history.replaceState({}, '', newUrl);
      }
    }
  } else if (pid) {
    // 旧格式兼容
    if (!buildingName) {
      container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">${i18nT('building.notFound')}</div></div></div>`;
      return;
    }
    await HashSearch.loadProvinceData(pid, lang);
    State._resetDerivedCaches();
    building = State.findBuildingByFullPath(buildingName);
    if (!building) {
      const allBuildings = State.getAllBuildings();
      building = allBuildings.find(b => buildingName.endsWith(b.n) && b.n.length >= 2);
      if (!building) {
        const parts = buildingName.replace(/[市县区]$/, '').split(/[市州区县]/);
        const lastName = parts[parts.length - 1];
        if (lastName && lastName.length >= 2) {
          building = allBuildings.find(b => b.n === lastName) || allBuildings.find(b => b.n.includes(lastName));
        }
      }
    }
    // 如果通过旧格式找到，更新 URL 为新格式（空格替换为下划线）
    if (building) {
      history.replaceState({}, '', Utils.generateBuildingUrl(building));
    }
  } else {
    // 既没有新格式也没有旧格式
    if (!buildingName) {
      container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">${i18nT('building.notFound')}</div></div></div>`;
      return;
    }
  }

  if (!building) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">${i18nT('building.notFound')}</div></div></div>`;
    return;
  }

  try {
    const provinceStyle = Config.getProvinceStyle(building.pid, State.theme);
    const searchKeyword = encodeURIComponent(Utils.getLocationString(building) + Utils.getDisplayName(building));
    const isTwoLevel = Config.MCITIES.has(building.pid);
    const enParts = isTwoLevel
      ? [building.p, building.dn]
      : [building.p, building.cn, building.dn];
    const enSearchKeywordFull = encodeURIComponent(enParts.filter(Boolean).join(' ') + ' ' + (building.en || building.n));
    const relatedBuildings = getRelatedBuildings(building, 4);

    container.innerHTML = `
      <div class="container">
        <article class="building-detail">
          <header class="building-detail-header" style="border-left-color: ${provinceStyle.color};">
            <div class="building-detail-icon" style="background: ${provinceStyle.bgColor}; color: ${provinceStyle.color};">🏛️</div>
            <div class="building-detail-title-wrapper">
              <h2 class="building-detail-title">${Utils.getDisplayName(building)}</h2>
              <p class="building-detail-location">
                <span class="location-icon">📍</span> ${Utils.getLocationString(building)}
                <span class="map-links-inline">
                  ${State.lang === 'en' ? `
                  <a href="https://www.google.com/maps/search/${enSearchKeywordFull}" target="_blank" class="map-link-inline google" title="Google Maps">🌐</a>
                  <a href="https://www.bing.com/maps?q=${enSearchKeywordFull}" target="_blank" class="map-link-inline bing" title="Bing Maps">🗺️</a>
                  <a href="https://maps.apple.com/?q=${enSearchKeywordFull}" target="_blank" class="map-link-inline apple" title="Apple Maps">🍎</a>
                  ` : `
                  <a href="https://ditu.amap.com/search?query=${searchKeyword}" target="_blank" class="map-link-inline amap" title="高德地图">🗺️</a>
                  <a href="https://www.bing.com/maps?q=${searchKeyword}" target="_blank" class="map-link-inline bing" title="必应地图">🔍</a>
                  <a href="https://maps.apple.com/?q=${searchKeyword}" target="_blank" class="map-link-inline apple" title="苹果地图">🍎</a>
                  `}
                </span>
              </p>
            </div>
          </header>
          <div class="building-detail-map" id="buildingDetailMap"></div>
          <div class="building-detail-sections">
            <div class="building-detail-section">
              <h3><span class="section-icon">🎬</span> ${i18nT('building.videos')}</h3>
              <div class="video-links">
                ${State.lang === 'en' ? `
                <a href="https://www.youtube.com/results?search_query=${enSearchKeywordFull}" target="_blank" rel="noopener" class="video-link youtube">▶️ YouTube</a>
                <a href="https://www.tiktok.com/search?q=${enSearchKeywordFull}" target="_blank" rel="noopener" class="video-link tiktok">🎵 TikTok</a>
                <a href="https://www.instagram.com/explore/search/keyword/?q=${enSearchKeywordFull}" target="_blank" rel="noopener" class="video-link instagram">📷 Instagram</a>
                ` : `
                <a href="https://www.douyin.com/search/${searchKeyword}" target="_blank" rel="noopener" class="video-link douyin">🎵 抖音</a>
                <a href="https://www.xiaohongshu.com/search_result?keyword=${searchKeyword}" target="_blank" rel="noopener" class="video-link xiaohongshu">📕 小红书</a>
                <a href="https://search.bilibili.com/all?keyword=${searchKeyword}" target="_blank" rel="noopener" class="video-link bilibili">📺 哔哩哔哩</a>
                `}
              </div>
            </div>
            <div class="building-detail-section">
              <h3><span class="section-icon">📋</span> ${i18nT('building.basicInfo')}</h3>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">${i18nT('building.eraLabel')}</span><span class="info-value">${building.e}</span></div>
                <div class="info-item"><span class="info-label">${i18nT('building.typeLabel')}</span><span class="info-value">${building.t}</span></div>
                <div class="info-item"><span class="info-label">${i18nT('building.districtLabel')}</span><span class="info-value">${building.p} ${building.dn}</span></div>
                <div class="info-item"><span class="info-label">${i18nT('building.levelLabel')}</span><span class="info-value">${getProtectionLevel(building)}</span></div>
                <div class="info-item"><span class="info-label">${i18nT('building.batchLabel')}</span><span class="info-value">${building.pb}</span></div>
                ${((building.g || []).includes('世界遗产') || (building.g || []).includes('World Heritage')) ? `<div class="info-item heritage"><span class="info-label">${i18nT('building.worldHeritage')}</span><span class="info-value">🌍</span></div>` : ''}
              </div>
            </div>
            <div class="building-detail-section"><h3><span class="section-icon">✨</span> ${i18nT('building.sectionDesc')}</h3><p class="detail-paragraph">${building.desc}</p></div>
            <div class="building-detail-section"><h3><span class="section-icon">📜</span> ${i18nT('building.sectionHistory')}</h3><p class="detail-paragraph">${building.hist}</p></div>
            <div class="building-detail-section"><h3><span class="section-icon">🏗️</span> ${i18nT('building.sectionArch')}</h3><p class="detail-paragraph">${building.arch}</p></div>
            <div class="building-detail-section"><h3><span class="section-icon">💎</span> ${i18nT('building.sectionFeature')}</h3><p class="detail-paragraph">${building.feat}</p></div>
            ${building.sec ? `
            <div class="building-detail-section"><h3><span class="section-icon">🗺️</span> ${i18nT('building.sections')}</h3>
              <div class="sections-grid">${building.sec.map(s => `<div class="section-card"><div class="section-name">${s.n}</div><div class="section-province">${s.p}</div></div>`).join('')}</div>
            </div>` : ''}
            <div class="building-detail-section">
              <h3><span class="section-icon">🏷️</span> ${i18nT('building.tags')}</h3>
              <div class="building-detail-tags">
                ${(building.g || []).map((tag, idx) => {
                  const ts = Config.getTagStyle(tag, idx, State.theme);
                  return `<span class="building-detail-tag" data-nav href="?page=tag&name=${encodeURIComponent(tag)}" style="background: ${ts.bg}; color: ${ts.color}; border-color: ${ts.color}30;"><span class="tag-icon">${ts.icon}</span> ${tag}</span>`;
                }).join('')}
              </div>
              <p class="building-detail-disclaimer">${i18nT('building.disclaimer')} <a href="#" class="feedback-link" data-open-feedback>${i18nT('building.feedback')}</a></p>
            </div>
          </div>
        </article>
        ${relatedBuildings.length > 0 ? `
        <section class="related-buildings-section">
          <h2 class="section-title"><span class="section-icon">📝</span> ${i18nT('building.related')}</h2>
          <div class="building-grid">${relatedBuildings.map(b => Utils.createBuildingCard(b)).join('')}</div>
        </section>` : ''}
      </div>`;

    // 面包屑导航
    const pStyle = Config.getProvinceStyle(building.pid, State.theme);
    const pName = State.getProvinceName(building.pid);
    const isMCore = Config.MCITIES.has(building.pid);
    const cityCode = building.d || '';
    const cityName = State.getCityName(cityCode, [building]);
    UI.setBreadcrumb([
      { name: '🗺️ ' + i18nT('province.title'), href: '?page=provinces' },
      { name: pStyle.icon + ' ' + pName, href: '?page=province&id=' + building.pid },
      ...(isMCore
        ? [{ name: '📍 ' + building.dn, href: building.did ? `?page=city&cid=${building.pid}&did=${building.did}` : null }]
        : [{ name: '📍 ' + cityName, href: cityCode ? '?page=city&cid=' + cityCode : null }]
      ),
      { name: '🏛️ ' + Utils.getDisplayName(building) }
    ]);

    // 初始化地图
    if (building.lat != null && building.lng != null && isFinite(building.lat) && isFinite(building.lng)) {
      const mapDiv = document.getElementById('buildingDetailMap');
      if (mapDiv) {
        const map = await UI.createSatelliteMap(mapDiv, building.lat, building.lng, Utils.getDisplayName(building));
        if (destroyMapFn && map) destroyMapFn(() => map.remove());
      }
    }

  } catch (renderErr) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div><div class="empty-state-subtitle">${Utils.escapeHtml(renderErr.message)}</div></div></div>`;
  }
}

function getProtectionLevel(building) {
  if (building.protectionLevel) return building.protectionLevel;
  const pid = building.pid;
  if (pid === 'hongkong') return i18nT('building.badgeHongkong');
  if (pid === 'macau') return i18nT('building.badgeMacau');
  if (pid === 'taiwan') return i18nT('building.badgeTaiwan');
  return i18nT('building.badgeNational');
}

function getRelatedBuildings(building, limit = 4) {
  const allBuildings = State.getAllBuildings();
  if (allBuildings.length < 2) return [];
  const district = building.d;
  const name = building.n;
  const sameDistrict = [];
  for (let i = 0, len = allBuildings.length; i < len; i++) {
    const b = allBuildings[i];
    if (b.n !== name && b.d === district) sameDistrict.push(b);
  }
  if (sameDistrict.length <= limit) return sameDistrict;
  for (let i = sameDistrict.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sameDistrict[i], sameDistrict[j]] = [sameDistrict[j], sameDistrict[i]];
  }
  return sameDistrict.slice(0, limit);
}