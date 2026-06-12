import { HashSearch, Config, State, Utils } from '../core.js';

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
      <div class="building-grid">${buildings.map(b => Utils.createBuildingCard(b)).join('')}</div>
    </div>`;
}

