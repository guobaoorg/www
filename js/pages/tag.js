/**
 * 单标签结果页
 */
import { HashSearch, Config, State, Utils } from '../core.js';

export async function render(container) {
  const decodedTag = decodeURIComponent(State.currentTag);
  const doRender = () => {
    const buildings = State.getBuildingsByTag(decodedTag);
    const ts = Config.getTagStyle(decodedTag, 0);
    container.innerHTML = `
      <div class="container">
        <div class="tag-header" style="background: ${ts.bg}; border: 1px solid ${ts.color}30;">
          <div class="tag-header-icon" style="background: ${ts.color};">${ts.icon}</div>
          <div class="tag-header-info">
            <h2 class="section-title" style="margin: 0;">标签：${decodedTag}</h2>
            <p style="color: var(--text-secondary); margin: 0.5rem 0 0 0;">共找到 <strong style="color: ${ts.color};">${buildings.length}</strong> 处相关建筑</p>
          </div>
        </div>
        ${buildings.length > 0 ? `<div class="building-grid">${buildings.map(b => Utils.createBuildingCard(b)).join('')}</div>` : `<div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">未找到相关建筑</div></div>`}
      </div>`;
  };
  if (HashSearch.getCacheStats().loadedProvinces > 0) {
    doRender();
  } else {
    container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">🔄</div><div>正在加载数据...</div></div></div>`;
    await State.ensureDataLoaded();
    doRender();
  }
}

