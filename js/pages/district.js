import { HashSearch, Config, State, Utils, UI, ensureLeaflet } from '../core.js';

export async function render(container) {
  const provinceId = State.currentProvince;
  const districtId = State.currentDistrict;
  await HashSearch.loadProvinceData(provinceId);

  const province = State.getProvinceById(provinceId);
  const district = State.getDistrictData(provinceId, districtId);
  const provinceStyle = Config.getProvinceStyle(provinceId);

  if (!district) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-title">未找到该区县</div></div></div>`;
    return;
  }

  const buildings = State.getBuildingsByDistrict(provinceId, districtId);
  const protectionLabel = State.getProtectionLabel(provinceId);

  container.innerHTML = `
    <div class="container">
      <div class="district-header" style="background: linear-gradient(135deg, ${provinceStyle.bgColor} 0%, var(--bg-card) 100%); border: 1px solid ${provinceStyle.color}25;">
        <div class="district-header-icon" style="background: ${provinceStyle.color};">📍</div>
        <div class="district-header-info">
          <h2 class="section-title" style="margin: 0;">${province.name} - ${district.n}</h2>
          <p style="color: var(--text-secondary); margin: 0.5rem 0 0 0;">共有 <strong style="color: ${provinceStyle.color};">${buildings.length}</strong> 处${protectionLabel}</p>
        </div>
      </div>
      <div class="district-map" id="districtMap"></div>
      <div class="building-grid">${buildings.map(b => Utils.createBuildingCard(b)).join('')}</div>
    </div>`;

  // 初始化区县地图
  const coordsBuildings = buildings.filter(b => b.lat != null && b.lng != null);
  if (coordsBuildings.length > 0) {
    _initDistrictMap(coordsBuildings);
  }
}

async function _initDistrictMap(buildings) {
  const mapEl = document.getElementById('districtMap');
  if (!mapEl) return;

  await ensureLeaflet();
  const L = window.L;
  if (!L) return;

  const map = UI.createMapWithLayers(mapEl);

  const bounds = L.latLngBounds([]);
  buildings.forEach(b => {
    const ll = L.latLng(b.lat, b.lng);
    bounds.extend(ll);
    const markerIcon = L.divIcon({
      html: `<div class="district-marker-dot"></div>`,
      className: 'district-marker-container',
      iconSize: [10, 10], iconAnchor: [5, 5]
    });
    const marker = L.marker(ll, { icon: markerIcon });
    marker.bindPopup(
      `<div class="map-popup">
        <div class="map-popup-header"><strong>🏛️ ${b.n}</strong></div>
        <div class="map-popup-body">
          <div class="map-popup-info">
            <span class="map-popup-era">📅 ${b.e || ''}</span>
          </div>
          <a href="${Utils.generateBuildingHash(b)}" class="map-popup-link">查看详情 →</a>
        </div>
      </div>`,
      { maxWidth: 240, className: 'map-popup-container' }
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

