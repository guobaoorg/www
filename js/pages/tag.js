import { HashSearch, Config, State, Utils } from '../core.js';

export async function render(container) {
  const tag = decodeURIComponent(State.currentTag);

  if (HashSearch.getCacheStats().loadedProvinces > 0 && State.hasTagBuildingsCache(tag)) {
    return _renderTag(container, tag);
  }

  const ts = Config.getTagStyle(tag, 0);
  container.innerHTML = `
    <div class="container">
      <div class="tag-header" style="background:${ts.bg};border:1px solid ${ts.color}30;">
        <div class="tag-header-icon" style="background:${ts.color};">${ts.icon}</div>
        <div class="tag-header-info"><h2 class="section-title" style="margin:0;">标签：${tag}</h2>
        <p style="color:var(--text-secondary);margin:0.5rem 0 0 0;">⏳ 数据加载中...</p></div>
      </div>
      <div class="loading"><div class="loading__icon">🔄</div><div>正在加载相关建筑...</div></div>
    </div>`;

  if (!HashSearch.isBgActive()) {
    await HashSearch.startBgPreload([...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross']);
  } else {
    while (!State.hasTagBuildingsCache(tag) && HashSearch.isBgActive()) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  _renderTag(container, tag);
}

function _renderTag(container, tag) {
  const buildings = State.getBuildingsByTag(tag);
  const ts = Config.getTagStyle(tag, 0);
  const hasCoords = buildings.filter(b => b.lat != null && b.lng != null);

  container.innerHTML = `
    <div class="container">
      <div class="tag-header" style="background:${ts.bg};border:1px solid ${ts.color}30;">
        <div class="tag-header-icon" style="background:${ts.color};">${ts.icon}</div>
        <div class="tag-header-info">
          <h2 class="section-title" style="margin:0;">标签：${tag}</h2>
          <p style="color:var(--text-secondary);margin:0.5rem 0 0 0;">共找到 <strong style="color:${ts.color};">${buildings.length}</strong> 处相关建筑</p>
        </div>
      </div>
      ${hasCoords.length > 0 ? `<div class="tag-map" id="tagMap"></div>` : ''}
      ${buildings.length
        ? `<div class="building-grid">${buildings.map(b => Utils.createBuildingCard(b)).join('')}</div>`
        : '<div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">未找到相关建筑</div></div>'}
    </div>`;

  if (hasCoords.length > 0) {
    Utils.setupBuildingMap(document.getElementById('tagMap'), hasCoords, {
      popupBuilder: (b, hash) => `<div class="map-popup"><div class="map-popup-header"><strong>🏛️ ${b.n}</strong></div><div class="map-popup-body"><div class="map-popup-info"><span class="map-popup-era">📅 ${b.e || ''}</span><span class="map-popup-district">📍 ${b.dn || ''}</span></div><a href="${hash(b)}" class="map-popup-link">查看详情 →</a></div></div>`
    });
  }
}
