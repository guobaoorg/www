/**
 * 省份详情页
 */
import HashSearch from '../hash-search.js';
import State from '../state.js';
import Config from '../config.js';
import Utils from '../utils.js';

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
  const allBuildings = State.getAllBuildings().filter(b => b.provinceId === provinceId);
  const buildingsByDistrict = {};
  allBuildings.forEach(b => {
    if (!buildingsByDistrict[b.district]) buildingsByDistrict[b.district] = [];
    buildingsByDistrict[b.district].push(b);
  });

  const districtsWithData = districts.filter(d => {
    const b = buildingsByDistrict[d.id];
    return b && b.length > 0;
  });

  const getEraSummary = (buildings) => {
    const eras = {};
    buildings.forEach(b => { if (b.era) eras[b.era] = (eras[b.era] || 0) + 1; });
    return Object.entries(eras).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([era, count]) => `${era}(${count})`).join(' · ');
  };

  const getTagSummary = (buildings) => {
    const tags = new Set();
    buildings.forEach(b => { if (b.tags) b.tags.forEach(tag => tags.add(tag)); });
    return Utils.shuffleArray([...tags]).slice(0, 7);
  };

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
      <div class="district-grid-cards">
        ${districtsWithData.map(district => {
          const districtBuildings = buildingsByDistrict[district.id] || [];
          const eraSummary = getEraSummary(districtBuildings);
          const tagSummary = getTagSummary(districtBuildings);
          const hasHeritage = districtBuildings.some(b => b.worldHeritage);
          const shuffledBuildings = Utils.shuffleArray([...districtBuildings]);
          const featuredBuildings = shuffledBuildings.slice(0, 7);
          return `
            <div class="district-grid-card" data-nav href="?page=district&pid=${provinceId}&did=${district.id}" style="border-top-color: ${provinceStyle.color};">
              <div class="district-grid-card-header">
                <span class="district-grid-card-name">${district.name}</span>
                ${hasHeritage ? '<span class="district-grid-heritage">🌍</span>' : ''}
              </div>
              <div class="district-grid-card-count">${districtBuildings.length} 处${protectionLabel}</div>
              ${eraSummary ? `<div class="district-grid-card-eras">${eraSummary}</div>` : ''}
              <div class="district-grid-card-examples">${featuredBuildings.map(b => `<div class="district-grid-card-example">🏛️ ${b.name}</div>`).join('')}</div>
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
}