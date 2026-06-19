import { HashSearch, Config, State, Utils, UI, ensureLeaflet } from '../core.js';

function getEraSummary(buildings) {
  const eras = {};
  buildings.forEach(b => { if (b.e) eras[b.e] = (eras[b.e] || 0) + 1; });
  return Object.entries(eras).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([era, count]) => `${era}(${count})`).join(' · ');
}

function getTagSummary(buildings) {
  const tags = new Set();
  buildings.forEach(b => { if (b.g) b.g.forEach(tag => tags.add(tag)); });
  return Utils.shuffleArray([...tags]).slice(0, 7);
}

export async function render(container) {
  const provinceId = State.currentProvince;
  const province = State.getProvinceById(provinceId);
  const provinceStyle = Config.getProvinceStyle(provinceId);

  if (!province || province.count === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">暂无数据</div><p>${province ? province.name : '该省份'}的文物保护单位数据正在整理中</p></div></div>`;
    return;
  }

  container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">${provinceStyle.icon}</div><div>正在加载${province.name}数据...</div></div></div>`;

  const data = await HashSearch.loadProvinceData(provinceId);
  if (!data) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">数据加载失败</div></div></div>`;
    return;
  }

  const districts = State.getAllDistricts(provinceId);
  const provinceName = State.getProvinceName(provinceId);
  // 确保建筑对象包含省份信息，供 generateBuildingHash 正确生成 URL
  const allBuildings = (data.bs || []).map(b => {
    b.p = b.p || provinceName;
    b.pid = b.pid || provinceId;
    return b;
  });
  const buildingsByDistrict = {};
  allBuildings.forEach(b => {
    if (!buildingsByDistrict[b.d]) buildingsByDistrict[b.d] = [];
    buildingsByDistrict[b.d].push(b);
  });

  const districtsWithData = districts.filter(d => {
    const b = buildingsByDistrict[d.id];
    return b && b.length > 0;
  });

  const protectionLabel = State.getProtectionLabel(provinceId);

  container.innerHTML = `
    <div class="container">
      <div class="province-header" style="background: linear-gradient(135deg, ${provinceStyle.bgColor} 0%, var(--bg-card) 100%); border: 1px solid ${provinceStyle.color}25;">
        <div class="province-header-icon" style="background: ${provinceStyle.color};">${provinceStyle.icon}</div>
        <div class="province-header-info">
          <h2 class="section-title" style="margin: 0;">${province.name}</h2>
          <p style="color: var(--text-secondary); margin: 0.5rem 0 0 0;">共有 <strong style="color: ${provinceStyle.color};">${province.count}</strong> 处${protectionLabel}</p>
        </div>
      </div>
      <div class="province-map" id="provinceMap"></div>
      <div class="district-grid-cards">
        ${districtsWithData.map(district => {
          const districtBuildings = buildingsByDistrict[district.id] || [];
          const eraSummary = getEraSummary(districtBuildings);
          const tagSummary = getTagSummary(districtBuildings);
          const hasHeritage = districtBuildings.some(b => b.wh);
          const featuredBuildings = Utils.shuffleArray(districtBuildings.slice(0, 20)).slice(0, 7);
          return `
            <div class="district-grid-card" data-nav href="?page=district&pid=${provinceId}&did=${district.id}" style="border-top-color: ${provinceStyle.color};">
              <div class="district-grid-card-header">
                <span class="district-grid-card-name">${district.n}</span>
                ${hasHeritage ? '<span class="district-grid-heritage">🌍</span>' : ''}
              </div>
              <div class="district-grid-card-count">${districtBuildings.length} 处${protectionLabel}</div>
              ${eraSummary ? `<div class="district-grid-card-eras">${eraSummary}</div>` : ''}
              <div class="district-grid-card-examples">${featuredBuildings.map(b => `<div>🏛️ ${b.n}</div>`).join('')}</div>
              <div class="district-grid-card-tags">
                ${tagSummary.map((tag, idx) => {
                  const ts = Config.getTagStyle(tag, idx);
                  return `<span class="district-grid-tag" style="background: ${ts.bg}; color: ${ts.color};">${ts.icon} ${tag}</span>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;

  // 初始化省份地图
  const coordsBuildings = allBuildings.filter(b => b.lat != null && b.lng != null);
  if (coordsBuildings.length > 0) {
    _initProvinceMap(coordsBuildings);
  }
}

async function _initProvinceMap(buildings) {
  const mapEl = document.getElementById('provinceMap');
  if (!mapEl) return;

  await ensureLeaflet();
  const L = window.L;
  if (!L) return;

  const map = UI.createMapWithLayers(mapEl);
  const _hash = b => Utils.generateBuildingHash(b, Utils.getProvinceNameFn());

  const bounds = L.latLngBounds([]);
  const cluster = buildings.length > 50 && L.markerClusterGroup
    ? L.markerClusterGroup({ maxClusterRadius: 50, spiderfyOnMaxZoom: true, showCoverageOnHover: false })
    : null;
  if (cluster) map.addLayer(cluster);

  buildings.forEach(b => {
    const ll = L.latLng(b.lat, b.lng);
    bounds.extend(ll);
    const markerIcon = L.divIcon({
      html: `<div class="marker-dot"></div>`,
      className: 'marker-container',
      iconSize: [10, 10], iconAnchor: [5, 5]
    });
    const marker = L.marker(ll, { icon: markerIcon });
    marker.bindTooltip(b.n, { direction: 'top', offset: L.point(0, -9), className: 'rm-tooltip' });
    marker.bindPopup(`<div class="map-popup"><div class="map-popup-header"><strong>🏛️ ${b.n}</strong></div><div class="map-popup-body"><a href="${_hash(b)}" class="map-popup-link">查看详情 →</a></div></div>`, { maxWidth: 240, className: 'map-popup-container' });
    (cluster || map).addLayer(marker);
  });

  map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });

  Utils.enableMapFullscreen(mapEl, () => map.invalidateSize(), (userLat, userLng) => {
    return buildings.map(b => ({
      name: b.n, lat: b.lat, lng: b.lng,
      distance: Utils.haversineDistance(userLat, userLng, b.lat, b.lng),
      icon: '🏛️',
      detailUrl: _hash(b)
    })).sort((a, b) => a.distance - b.distance).slice(0, 5);
  });
}
