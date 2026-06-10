import { HashSearch, Utils } from '../core.js';

export async function render(container) {
  container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">🔄</div><div>正在加载跨省数据...</div></div></div>`;
  const data = await HashSearch.loadProvinceData('cross');
  if (!data || !data.bs) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">暂无数据</div></div></div>`;
    return;
  }
  container.innerHTML = `
    <div class="container">
      <h2 class="section-title"><span class="section-icon">🌊</span> 跨省文物保护单位</h2>
      <div class="building-grid">
        ${data.bs.map(b => Utils.createBuildingCard({ ...b, p: '跨省', pid: 'cross' })).join('')}
      </div>
    </div>`;
}

