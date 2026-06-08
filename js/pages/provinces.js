import { Config, State } from '../core.js';

export function render(container) {
  const crossStyle = Config.getProvinceStyle('cross');
  const provinces = State.getProvinceMeta()?.provinces || [];
  container.innerHTML = `
    <div class="container">
      <h2 class="section-title"><span class="section-icon">🗺️</span> 省份</h2>
      <div class="province-grid">
        ${provinces.map(province => {
          const style = Config.getProvinceStyle(province.id);
          return `<div class="province-card ${province.count > 0 ? 'has-data' : 'no-data'}" data-nav href="?page=province&id=${province.id}" style="border-left-color: ${style.color};">
            <div class="province-icon" style="background: ${style.bgColor}; color: ${style.color};">${style.icon}</div>
            <div class="province-info">
              <div class="province-name">${province.name}</div>
              <div class="province-count">${province.count > 0 ? province.count + '处' : '暂无数据'}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-light);">
        <h3 class="section-title" style="font-size: 1rem;"><span class="section-icon">🌊</span> 跨省文物保护单位</h3>
        <div class="province-card" data-nav href="?page=cross" style="border-left-color: ${crossStyle.color}; max-width: 400px;">
          <div class="province-icon" style="background: ${crossStyle.bgColor}; color: ${crossStyle.color};">${crossStyle.icon}</div>
          <div class="province-info">
            <div class="province-name">跨省文物保护单位</div>
            <div class="province-count">点击查看全部</div>
          </div>
        </div>
      </div>
    </div>`;
}