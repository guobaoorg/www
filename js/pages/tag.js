import { HashSearch, Config, State, Utils } from '../core.js';

export async function render(container) {
  const decodedTag = decodeURIComponent(State.currentTag);
  if (HashSearch.getCacheStats().loadedProvinces > 0 && State._tagBuildingsCache[decodedTag]) {
    return doRender(container, decodedTag);
  }

  const ts = Config.getTagStyle(decodedTag, 0);
  container.innerHTML = `
    <div class="container">
      <div class="tag-header" style="background:${ts.bg}; border:1px solid ${ts.color}30;">
        <div class="tag-header-icon" style="background:${ts.color};">${ts.icon}</div>
        <div class="tag-header-info">
          <h2 class="section-title" style="margin:0;">标签：${decodedTag}</h2>
          <p style="color:var(--text-secondary); margin:0.5rem 0 0 0;">⏳ 数据加载中...</p>
        </div>
      </div>
      <div class="loading"><div class="loading__icon">🔄</div><div>正在加载相关建筑...</div></div>
    </div>`;

  const allIds = State.getProvinceMeta()?.provinces?.map(p => p.id) || [];
  await HashSearch.loadProvinces(allIds);
  doRender(container, decodedTag);
}

function doRender(container, decodedTag) {
  const buildings = State.getBuildingsByTag(decodedTag);
  const ts = Config.getTagStyle(decodedTag, 0);
  container.innerHTML = `
    <div class="container">
      <div class="tag-header" style="background:${ts.bg}; border:1px solid ${ts.color}30;">
        <div class="tag-header-icon" style="background:${ts.color};">${ts.icon}</div>
        <div class="tag-header-info">
          <h2 class="section-title" style="margin:0;">标签：${decodedTag}</h2>
          <p style="color:var(--text-secondary); margin:0.5rem 0 0 0;">共找到 <strong style="color:${ts.color};">${buildings.length}</strong> 处相关建筑</p>
        </div>
      </div>
      ${buildings.length > 0
        ? `<div class="building-grid">${buildings.map(b => Utils.createBuildingCard(b)).join('')}</div>`
        : `<div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">未找到相关建筑</div></div>`}
    </div>`;
}
