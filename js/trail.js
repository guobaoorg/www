import { Config } from './config.js';
import { State } from './state.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

export function render(container) {
  const registry = State.getTrailRegistry() || [];
  const typeFilter = State.currentTrailType;
  const filtered = typeFilter ? registry.filter(t => t.type === typeFilter) : registry;
  const isDark = State.theme === 'dark';

  container.innerHTML = `
    <div class="container">
      <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">${i18nT('trail.description')}</p>
      <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
        <a href="?page=trail" class="trail-filter-btn ${!typeFilter ? 'active' : ''}" data-nav>${i18nT('trail.filterAll')}</a>
        ${Object.keys(Config.trailTypeLabels).map(type =>
          `<a href="?page=trail&type=${type}" class="trail-filter-btn ${typeFilter === type ? 'active' : ''}" data-nav>${Config.getTrailTypeLabel(type, State.lang)}</a>`
        ).join('')}
      </div>
      <div class="topics-grid">
        ${filtered.map(trail => `
          <div class="topic-card" data-nav href="?page=trail-detail&id=${trail.id}" style="border-left-color: ${trail.color};">
            <div class="topic-card-icon" style="background: ${isDark ? Config.darkenHexBg(trail.bgColor) : (trail.bgColor || '#f0f0f0')}; color: ${trail.color || '#666'};">${trail.icon}</div>
            <div class="topic-card-content">
              <div class="topic-card-title">${trail.title}</div>
              <div class="topic-card-subtitle">${Config.getTrailTypeLabel(trail.type, State.lang)} · ${trail.subtitle}</div>
              <div class="topic-card-desc">${trail.description}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;

  UI.setBreadcrumb([{ name: '👣 ' + i18nT('trail.title') }]);
}