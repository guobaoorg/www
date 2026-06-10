import { HashSearch, Config, State, Utils } from '../core.js';

export async function render(container) {
  const buildingName = State.currentBuildingName;
  if (!buildingName) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">未找到该建筑</div></div></div>`;
    return;
  }

  let building = null;

  // 优先通过 pid 只加载目标省份数据
  const pid = State.currentProvince;
  if (pid) {
    await HashSearch.loadProvinceData(pid);
    building = State.findBuildingByFullPath(buildingName);
  }

  // 回退：在已加载数据中按名称尾部匹配查找
  if (!building) {
    const allBuildings = State.getAllBuildings();
    building = allBuildings.find(b => buildingName.endsWith(b.n));
  }

  if (!building) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">未找到该建筑</div></div></div>`;
    return;
  }

  const provinceStyle = Config.getProvinceStyle(building.pid);
  const searchKeyword = encodeURIComponent((building.p || State.getProvinceName(building.pid) || '') + (building.dn || '') + building.n);
  const relatedBuildings = getRelatedBuildings(building, 4);

  container.innerHTML = `
    <div class="container">
      <article class="building-detail">
        <header class="building-detail-header" style="border-left-color: ${provinceStyle.color};">
          <div class="building-detail-icon" style="background: ${provinceStyle.bgColor}; color: ${provinceStyle.color};">🏛️</div>
          <div class="building-detail-title-wrapper">
            <h2 class="building-detail-title">${building.n}</h2>
            <p class="building-detail-location">
              <span class="location-icon">📍</span> ${building.l}
              <span class="map-links-inline">
                <a href="https://ditu.amap.com/search?query=${searchKeyword}" target="_blank" class="map-link-inline amap" title="高德地图">🗺️</a>
                <a href="https://www.google.com/maps/search/${encodeURIComponent(building.l)}" target="_blank" class="map-link-inline google" title="谷歌地图">🌐</a>
              </span>
            </p>
          </div>
        </header>
        <div class="building-detail-sections">
          <div class="building-detail-section">
            <h3><span class="section-icon">🎬</span> 相关视频</h3>
            <div class="video-links">
              <a href="https://www.douyin.com/search/${searchKeyword}" target="_blank" rel="noopener" class="video-link douyin">🎵 抖音</a>
              <a href="https://www.xiaohongshu.com/search_result?keyword=${searchKeyword}" target="_blank" rel="noopener" class="video-link xiaohongshu">📕 小红书</a>
              <a href="https://search.bilibili.com/all?keyword=${searchKeyword}" target="_blank" rel="noopener" class="video-link bilibili">📺 哔哩哔哩</a>
            </div>
          </div>
          <div class="building-detail-section">
            <h3><span class="section-icon">📋</span> 基本信息</h3>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">年代</span><span class="info-value">${building.e}</span></div>
              <div class="info-item"><span class="info-label">类型</span><span class="info-value">${building.t}</span></div>
              <div class="info-item"><span class="info-label">地区</span><span class="info-value">${building.p} ${building.dn}</span></div>
              <div class="info-item"><span class="info-label">级别</span><span class="info-value">${building.protectionLevel || '全国重点文物保护单位'}</span></div>
              <div class="info-item"><span class="info-label">批次</span><span class="info-value">${building.pb}</span></div>
              ${building.wh ? `<div class="info-item heritage"><span class="info-label">世界遗产</span><span class="info-value">${building.why}年 🌍</span></div>` : ''}
            </div>
          </div>
          <div class="building-detail-section"><h3><span class="section-icon">✨</span> 初见惊鸿・千年开胜迹</h3><p class="detail-paragraph">${building.desc}</p></div>
          <div class="building-detail-section"><h3><span class="section-icon">📜</span> 史海钩沉・百代证沧桑</h3><p class="detail-paragraph">${building.hist}</p></div>
          <div class="building-detail-section"><h3><span class="section-icon">🏗️</span> 匠心营造・妙构凝风骨</h3><p class="detail-paragraph">${building.arch}</p></div>
          <div class="building-detail-section"><h3><span class="section-icon">💎</span> 华夏瑰宝・奇珍耀国光</h3><p class="detail-paragraph">${building.feat}</p></div>
          ${building.sec ? `
          <div class="building-detail-section"><h3><span class="section-icon">🗺️</span> 分段信息</h3>
            <div class="sections-grid">${building.sec.map(s => `<div class="section-card"><div class="section-name">${s.n}</div><div class="section-province">${s.p}</div></div>`).join('')}</div>
          </div>` : ''}
          <div class="building-detail-section">
            <h3><span class="section-icon">🏷️</span> 特色标签</h3>
            <div class="building-detail-tags">
              ${(building.g || []).map((tag, idx) => {
                const ts = Config.getTagStyle(tag, idx);
                return `<span class="building-detail-tag" data-nav href="?page=tag&name=${encodeURIComponent(tag)}" style="background: ${ts.bg}; color: ${ts.color}; border-color: ${ts.color}30;"><span class="tag-icon">${ts.icon}</span> ${tag}</span>`;
              }).join('')}
            </div>
          </div>
        </div>
      </article>
      ${relatedBuildings.length > 0 ? `
      <section class="related-buildings-section">
        <h2 class="section-title"><span class="section-icon">📝</span> 周边推荐</h2>
        <div class="building-grid">${relatedBuildings.map(b => Utils.createBuildingCard(b)).join('')}</div>
      </section>` : ''}
    </div>`;
}

function getRelatedBuildings(building, limit = 4) {
  const allBuildings = State.getAllBuildings();
  if (allBuildings.length < 2) return [];
  const district = building.d;
  const name = building.n;
  const sameDistrict = [];

  for (let i = 0; i < allBuildings.length; i++) {
    const b = allBuildings[i];
    if (b.n === name || b.d !== district) continue;
    sameDistrict.push(b);
    if (sameDistrict.length >= limit * 2) break;
  }

  return Utils.shuffleArray(sameDistrict).slice(0, limit);
}