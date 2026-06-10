import { State, Utils } from '../core.js';

export function render(container) {
  const registry = State.getTrailRegistry() || [];
  const typeFilter = State.currentTrailType;
  const filtered = typeFilter ? registry.filter(t => t.type === typeFilter) : registry;
  const typeLabels = { game: '🎮 游戏', novel: '📚 古典', journal: '📝 游记', drama: '🎭 戏曲', history: '📜 历史' };
  const isDark = State.theme === 'dark';

  container.innerHTML = `
    <div class="container">
      <h2 class="section-title"><span class="section-icon">👣</span> 足迹</h2>
      <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">玩游戏，听故事，走古道，看建筑——全方位的中国古建之旅</p>
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
        <a href="?page=trail" class="trail-filter-btn ${!typeFilter ? 'active' : ''}" data-nav>全部</a>
        ${Object.entries(typeLabels).map(([type, label]) =>
          `<a href="?page=trail&type=${type}" class="trail-filter-btn ${typeFilter === type ? 'active' : ''}" data-nav>${label}</a>`
        ).join('')}
      </div>
      <div class="topics-grid">
        ${filtered.map(trail => `
          <div class="topic-card" data-nav href="?page=trail-detail&id=${trail.id}" style="border-left-color: ${trail.color};">
            <div class="topic-card-icon" style="background: ${isDark ? Utils.darkenHexBg(trail.bgColor) : trail.bgColor}; color: ${trail.color};">${trail.icon}</div>
            <div class="topic-card-content">
              <div class="topic-card-title">${trail.title}</div>
              <div class="topic-card-subtitle">${typeLabels[trail.type] || ''} · ${trail.subtitle}</div>
              <div class="topic-card-desc">${trail.description}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}