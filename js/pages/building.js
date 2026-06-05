/**
 * 建筑详情页
 */
import HashSearch from '../hash-search.js';
import State from '../state.js';
import Config from '../config.js';
import Utils from '../utils.js';

export async function render(container) {
  const buildingName = State.currentBuildingName;
  if (!buildingName) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">未找到该建筑</div></div></div>`;
    return;
  }

  let building = null;

  // 优先通过 pid 只加载目标省份数据（性能优化）
  const pid = State.currentProvince;
  if (pid) {
    await HashSearch.loadProvinceData(pid);
    State.clearCache();
    building = State.findBuildingByFullPath(buildingName);
  }

  // 回退：加载全部省份数据
  if (!building) {
    const allProvinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'];
    await HashSearch.loadProvinces(allProvinceIds);
    State.clearCache();
    building = State.findBuildingByFullPath(buildingName);
  }

  // 回退：尝试用建筑名称直接搜索（从完整路径中提取最后一个名称）
  if (!building) {
    const allBuildings = State.getAllBuildings();
    building = allBuildings.find(b => buildingName.endsWith(b.name));
  }

  if (!building) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">未找到该建筑</div></div></div>`;
    return;
  }

  const provinceStyle = Config.getProvinceStyle(building.provinceId);
  const relatedBuildings = getRelatedBuildings(building, 4);

  container.innerHTML = `
    <div class="container">
      <article class="building-detail">
        <header class="building-detail-header" style="border-left-color: ${provinceStyle.color};">
          <div class="building-detail-icon" style="background: ${provinceStyle.bgColor}; color: ${provinceStyle.color};">🏛️</div>
          <div class="building-detail-title-wrapper">
            <h2 class="building-detail-title">${building.name}</h2>
            <p class="building-detail-location">
              <span class="location-icon">📍</span> ${building.location}
              <span class="map-links-inline">
                <a href="https://ditu.amap.com/search?query=${encodeURIComponent((building.province || State.getProvinceName(building.provinceId) || '') + (building.districtName || '') + building.name)}" target="_blank" class="map-link-inline amap" title="高德地图">🗺️</a>
                <a href="https://www.google.com/maps/search/${encodeURIComponent(building.location)}" target="_blank" class="map-link-inline google" title="谷歌地图">🌐</a>
              </span>
            </p>
          </div>
        </header>
        <div class="building-detail-sections">
          <div class="building-detail-section">
            <h3><span class="section-icon">🎬</span> 相关视频</h3>
            <div class="video-links">
              <a href="https://www.douyin.com/search/${encodeURIComponent((building.province || State.getProvinceName(building.provinceId) || '') + (building.districtName || '') + building.name)}" target="_blank" rel="noopener" class="video-link douyin">🎵 抖音</a>
              <a href="https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent((building.province || State.getProvinceName(building.provinceId) || '') + (building.districtName || '') + building.name)}" target="_blank" rel="noopener" class="video-link xiaohongshu">📕 小红书</a>
              <a href="https://search.bilibili.com/all?keyword=${encodeURIComponent((building.province || State.getProvinceName(building.provinceId) || '') + (building.districtName || '') + building.name)}" target="_blank" rel="noopener" class="video-link bilibili">📺 哔哩哔哩</a>
            </div>
          </div>
          <div class="building-detail-section">
            <h3><span class="section-icon">📋</span> 基本信息</h3>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">年代</span><span class="info-value">${building.era}</span></div>
              <div class="info-item"><span class="info-label">类型</span><span class="info-value">${building.type}</span></div>
              <div class="info-item"><span class="info-label">地区</span><span class="info-value">${building.province} ${building.districtName}</span></div>
              <div class="info-item"><span class="info-label">级别</span><span class="info-value">${building.protectionLevel}</span></div>
              <div class="info-item"><span class="info-label">批次</span><span class="info-value">${building.protectionBatch}</span></div>
              ${building.worldHeritage ? `<div class="info-item heritage"><span class="info-label">世界遗产</span><span class="info-value">${building.worldHeritageYear}年 🌍</span></div>` : ''}
            </div>
          </div>
          <div class="building-detail-section"><h3><span class="section-icon">✨</span> 特色介绍</h3><p class="detail-paragraph">${building.description}</p></div>
          <div class="building-detail-section"><h3><span class="section-icon">📜</span> 历史背景</h3><p class="detail-paragraph">${building.history}</p></div>
          <div class="building-detail-section"><h3><span class="section-icon">🏗️</span> 建筑风格</h3><p class="detail-paragraph">${building.architecture}</p></div>
          <div class="building-detail-section"><h3><span class="section-icon">💎</span> 特色与价值</h3><p class="detail-paragraph">${building.features}</p></div>
          ${building.sections ? `
          <div class="building-detail-section"><h3><span class="section-icon">🗺️</span> 分段信息</h3>
            <div class="sections-grid">${building.sections.map(s => `<div class="section-card"><div class="section-name">${s.name}</div><div class="section-province">${s.province}</div></div>`).join('')}</div>
          </div>` : ''}
          <div class="building-detail-section">
            <h3><span class="section-icon">🏷️</span> 标签</h3>
            <div class="building-detail-tags">
              ${(building.tags || []).map((tag, idx) => {
                const ts = Config.getTagStyle(tag, idx);
                return `<span class="building-detail-tag" data-nav href="?page=tag&name=${encodeURIComponent(tag)}" style="background: ${ts.bg}; color: ${ts.color}; border-color: ${ts.color}30;"><span class="tag-icon">${ts.icon}</span> ${tag}</span>`;
              }).join('')}
            </div>
          </div>
        </div>
      </article>
      ${relatedBuildings.length > 0 ? `
      <section class="related-buildings-section">
        <h2 class="section-title"><span class="section-icon">🔗</span> 相关推荐</h2>
        <p class="related-hint">同地区或同类型的其他文物保护单位</p>
        <div class="building-grid">${relatedBuildings.map(b => Utils.createBuildingCard(b)).join('')}</div>
      </section>` : ''}
    </div>`;
}

function getRelatedBuildings(building, limit = 4) {
  const allBuildings = State.getAllBuildings();
  const related = [];
  const buildingTags = building.tags || [];
  const sameDistrict = allBuildings.filter(b => b.district === building.district && b.name !== building.name);
  related.push(...sameDistrict);
  if (related.length < limit) {
    const sameTags = allBuildings.filter(b => {
      if (b.name === building.name || related.some(r => r.name === b.name)) return false;
      return (b.tags && buildingTags.some(tag => b.tags.includes(tag)));
    });
    related.push(...sameTags);
  }
  if (related.length < limit) {
    const sameEra = allBuildings.filter(b => {
      if (b.name === building.name || related.some(r => r.name === b.name)) return false;
      return b.era && b.era === building.era;
    });
    related.push(...sameEra);
  }
  return Utils.shuffleArray(related).slice(0, limit);
}