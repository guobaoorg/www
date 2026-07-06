import { HashSearch } from './hash-search.js';
import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { ensureLeaflet } from './leaflet.js';
import { t as i18nT } from './i18n.js';

export async function render(container, destroyMapFn) {
  const provinceId = State.currentProvince;
  const province = State.getProvinceById(provinceId);
  const provinceStyle = Config.getProvinceStyle(provinceId, State.theme);

  if (!province || province.count === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">${i18nT('common.noData')}</div><p>${i18nT('province.dataOrganizing')}</p></div></div>`;
    return;
  }

  container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">${provinceStyle.icon}</div><div>${i18nT('province.loading').replace('{name}', province.name)}</div></div></div>`;

  const data = await HashSearch.loadProvinceData(provinceId, State.lang);
  if (!data) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div></div></div>`;
    return;
  }

  const provinceName = State.getProvinceName(provinceId);
  const allBuildings = (data || []).map(b => {
    b.p = b.p || provinceName;
    b.pid = b.pid || provinceId;
    return b;
  });

  // Group by city (d code is province_city), or by district for municipalities
  const MCORE = Config.MCITIES;
  const isMCore = MCORE.has(provinceId);
  const cityGroups = {};
  const cityCounties = {};
  allBuildings.forEach(b => {
    if (!b.d) return;
    const groupKey = isMCore ? b.did : b.d;
    if (!cityGroups[groupKey]) { cityGroups[groupKey] = { buildings: [], cityCode: groupKey, countyCount: 0, cityName: groupKey }; cityCounties[groupKey] = new Set(); }
    cityGroups[groupKey].buildings.push(b);
    cityCounties[groupKey].add(b.dn);
  });

  // Derive names from city code
  Object.keys(cityGroups).forEach(cc => {
    cityGroups[cc].cityName = isMCore ? cityGroups[cc].buildings[0].dn : State.getCityName(cc, cityGroups[cc].buildings);
    cityGroups[cc].countyCount = isMCore ? 1 : cityCounties[cc].size;
  });

  const protectionLabel = State.getProtectionLabel(provinceId);

  const cityCodes = Object.keys(cityGroups).sort((a, b) => {
    return cityGroups[b].buildings.length - cityGroups[a].buildings.length;
  });

  const cityCardsHtml = cityCodes.map(cityCode => {
    const group = cityGroups[cityCode];
    const hasHeritage = group.buildings.some(b => {
      const g = b.g || [];
      return g.includes('世界遗产') || g.includes('World Heritage');
    });
    const eraSummary = Utils.getEraSummary(group.buildings);
    const tagSummary = Utils.getTagSummary(group.buildings);
    const featured = group.buildings.slice(0, 7);

    const cardHref = isMCore
      ? `?page=city&cid=${provinceId}&did=${encodeURIComponent(cityCode)}`
      : `?page=city&cid=${cityCode}`;

    return `
      <div class="district-grid-card" data-nav href="${cardHref}" style="border-top-color: ${provinceStyle.color};">
        <div class="district-grid-card-header">
          <span class="district-grid-card-name">${group.cityName}</span>
          ${hasHeritage ? '<span class="district-grid-heritage">🌍</span>' : ''}
        </div>
        <div class="district-grid-card-count">${group.buildings.length} ${i18nT('province.countUnit')}${protectionLabel}${!isMCore && group.countyCount > 1 ? ` · ${group.countyCount} ${i18nT('province.districts')}` : ''}</div>
        ${eraSummary ? `<div class="district-grid-card-eras">${eraSummary}</div>` : ''}
        <div class="district-grid-card-examples">
          ${featured.map(b => `<div>🏛️ ${Utils.getDisplayName(b)}</div>`).join('')}
        </div>
        <div class="district-grid-card-tags">
          ${tagSummary.map((tag, idx) => {
            const ts = Config.getTagStyle(tag, idx, State.theme);
            return `<span class="district-grid-tag" style="background: ${ts.bg}; color: ${ts.color};">${ts.icon} ${tag}</span>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="container">
      <div class="province-header" style="background: linear-gradient(135deg, ${provinceStyle.bgColor} 0%, var(--bg-card) 100%); border: 1px solid ${provinceStyle.color}25;">
        <div class="province-header-icon" style="background: ${provinceStyle.color};">${provinceStyle.icon}</div>
        <div class="province-header-info">
          <h2 class="section-title" style="margin: 0;">${province.name}</h2>
          <p style="color: var(--text-secondary); margin: 0.5rem 0 0 0;">${i18nT('province.total')} <strong style="color: ${provinceStyle.color};">${province.count}</strong> ${i18nT('province.countUnit')}${protectionLabel}，${i18nT('province.distributed')} ${cityCodes.length} ${isMCore ? i18nT('province.districts') : i18nT('province.cities')}</p>
        </div>
      </div>
      <div class="province-map" id="provinceMap"></div>
      <div class="district-grid-cards">
        ${cityCardsHtml}
      </div>
    </div>`;

  UI.setBreadcrumb([
    { name: '🏞️ ' + i18nT('province.title'), href: '?page=provinces' },
    { name: provinceStyle.icon + ' ' + provinceName }
  ]);

  const coordsBuildings = allBuildings.filter(b => b.lat != null && b.lng != null && isFinite(b.lat) && isFinite(b.lng));
  let provMap = null;
  if (coordsBuildings.length > 0) {
    provMap = await _initProvinceMap(coordsBuildings);
  }
  if (destroyMapFn && provMap) destroyMapFn(() => provMap.remove());
}

async function _initProvinceMap(buildings) {
  const mapEl = document.getElementById('provinceMap');
  if (!mapEl) return null;

  await ensureLeaflet();
  const L = window.L;
  if (!L) return null;

  const map = UI.createMapWithLayers(mapEl);
  const _hash = b => Utils.generateBuildingUrl(b);

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
    marker.bindTooltip(Utils.getDisplayName(b), { direction: 'top', offset: L.point(0, -9), className: 'route-map__tooltip' });
    marker.bindPopup(`<div class="map__popup"><div class="map__popup-header"><strong>🏛️ ${Utils.getDisplayName(b)}</strong></div><div class="map__popup-body"><a href="${_hash(b)}" class="map__popup-link">${i18nT('common.viewDetail')}</a></div></div>`, { maxWidth: 240, className: 'map__popup-container' });
    (cluster || map).addLayer(marker);
  });

  map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  UI.enableMapFullscreen(mapEl, () => map.invalidateSize(), (userLat, userLng) => {
    return buildings.map(b => ({
      name: b.n, lat: b.lat, lng: b.lng,
      distance: UI.haversineDistance(userLat, userLng, b.lat, b.lng),
      icon: '🏛️',
      detailUrl: _hash(b)
    })).sort((a, b) => a.distance - b.distance).slice(0, 5);
  });
  return map;
}
