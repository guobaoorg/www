import { HashSearch, Config, State, Utils, UI, ensureLeaflet } from '../core.js';

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
    await new Promise(resolve => {
      const check = () => { if (State.hasTagBuildingsCache(tag) || !HashSearch.isBgActive()) resolve(); else setTimeout(check, 300); };
      check();
    });
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

  // 初始化地图
  if (hasCoords.length > 0) {
    _initTagMap(hasCoords);
  }
}

async function _initTagMap(buildings) {
  const mapEl = document.getElementById('tagMap');
  if (!mapEl) return;

  await ensureLeaflet();
  const L = window.L;
  if (!L) return;

  const map = UI.createMapWithLayers(mapEl);

  // 添加所有建筑标记
  const bounds = L.latLngBounds([]);
  buildings.forEach(b => {
    const ll = L.latLng(b.lat, b.lng);
    bounds.extend(ll);
    const markerIcon = L.divIcon({
      html: `<div class="tag-marker-dot"></div>`,
      className: 'tag-marker-container',
      iconSize: [12, 12], iconAnchor: [6, 6]
    });
    const marker = L.marker(ll, { icon: markerIcon, interactive: true });
    marker.bindPopup(
      `<div class="map-popup">
        <div class="map-popup-header"><strong>🏛️ ${b.n}</strong></div>
        <div class="map-popup-body">
          <div class="map-popup-info">
            <span class="map-popup-era">📅 ${b.e || ''}</span>
            <span class="map-popup-district">📍 ${b.dn || ''}</span>
          </div>
          <a href="${Utils.generateBuildingHash(b)}" class="map-popup-link">查看详情 →</a>
        </div>
      </div>`,
      { maxWidth: 260, className: 'map-popup-container' }
    );
    marker.addTo(map);
  });

  map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });

  Utils.enableMapFullscreen(mapEl, () => map.invalidateSize(), (userLat, userLng) => {
    return buildings.map(b => ({
      name: b.n, lat: b.lat, lng: b.lng,
      distance: Utils.haversineDistance(userLat, userLng, b.lat, b.lng),
      icon: '🏛️',
      detailUrl: Utils.generateBuildingHash(b)
    })).sort((a, b) => a.distance - b.distance).slice(0, 5);
  });
}
