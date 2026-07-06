import { HashSearch } from './hash-search.js';
import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

export async function render(container, destroyMapFn) {
  const provinceId = State.currentProvince;
  const cityCode = State.currentCityCode;
  const loadData = await HashSearch.loadProvinceData(provinceId, State.lang);
  if (!loadData) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div></div></div>`;
    return;
  }

  const province = State.getProvinceById(provinceId);
  const provinceStyle = Config.getProvinceStyle(provinceId, State.theme);
  const provinceName = State.getProvinceName(provinceId);

  if (!cityCode) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-title">${i18nT('city.notSpecified')}</div></div></div>`;
    return;
  }

  const data = HashSearch.getProvinceData(provinceId, State.lang);
  if (!Array.isArray(data)) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div></div></div>`;
    return;
  }

  // Get buildings for this city (or district for municipalities)
  const districtId = State.currentDistrict;
  const filterFn = districtId
    ? (b => b.did === districtId)
    : (b => b.d === cityCode);
  const cityBuildings = data.filter(filterFn);
  const allBuildings = cityBuildings.map(b => {
    b.p = b.p || provinceName;
    b.pid = b.pid || provinceId;
    return b;
  });

  if (allBuildings.length === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-title">${i18nT('city.noData')}</div></div></div>`;
    return;
  }

  // Derive city/district name
  const cityName = districtId ? (allBuildings[0]?.dn || districtId) : State.getCityName(cityCode, allBuildings);

  const protectionLabel = State.getProtectionLabel(provinceId);
  const coordsBuildings = allBuildings.filter(b => b.lat != null && b.lng != null && isFinite(b.lat) && isFinite(b.lng));

  container.innerHTML = `
    <div class="container">
      <div class="province-header" style="background: linear-gradient(135deg, ${provinceStyle.bgColor} 0%, var(--bg-card) 100%); border: 1px solid ${provinceStyle.color}25;">
        <div class="province-header-icon" style="background: ${provinceStyle.color};">📍</div>
        <div class="province-header-info">
          <h2 class="section-title" style="margin: 0;">${province.name}${cityName ? ' - ' + cityName : ''}</h2>
          <p style="color: var(--text-secondary); margin: 0.5rem 0 0 0;">${i18nT('city.total')} <strong style="color: ${provinceStyle.color};">${allBuildings.length}</strong> ${i18nT('city.countUnit')}${protectionLabel}</p>
        </div>
      </div>
      ${coordsBuildings.length > 0 ? '<div class="district-map" id="cityMap"></div>' : ''}
      <div class="building-grid">
        ${allBuildings.map(b => Utils.createBuildingCard(b)).join('')}
      </div>
    </div>`;

  UI.setBreadcrumb([
    { name: '🗺️ ' + i18nT('province.title'), href: '?page=provinces' },
    { name: provinceStyle.icon + ' ' + provinceName, href: '?page=province&id=' + provinceId },
    { name: '📍 ' + cityName }
  ]);

  let cityMap = null;
  if (coordsBuildings.length > 0) {
    cityMap = await UI.setupBuildingMap(document.getElementById('cityMap'), coordsBuildings, {
      popupBuilder: (b, hash) => `<div class="map__popup"><div class="map__popup-header"><strong>🏛️ ${Utils.getDisplayName(b)}</strong></div><div class="map__popup-body"><div class="map__popup-info"><span class="map__popup-era">📅 ${b.e || ''}</span><span class="map__popup-district">📍 ${b.dn || ''}</span></div><a href="${hash(b)}" class="map__popup-link">${i18nT('common.viewDetail')}</a></div></div>`
    });
  }
  if (destroyMapFn && cityMap) destroyMapFn(() => cityMap.remove());
}
