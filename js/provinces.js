import { HashSearch } from './hash-search.js';
import { Config } from './config.js';
import { State } from './state.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

export async function render(container) {
  const crossStyle = Config.getProvinceStyle('cross', State.theme);
  const provinces = State.getProvinceMeta()?.provinces || [];
  const crossRaw = await HashSearch.loadTrailData('cross.json', State.lang);
  const crossArticles = (crossRaw?.bs || []).filter(b => b.route && b.cid);

  container.innerHTML = `
    <div class="container">

      ${Config.REGIONS.map(region => {
        const regionLabel = State.lang === 'en' ? region.nameEn : region.name;
        const regionProvinces = region.provinces.map(id => provinces.find(p => p.id === id)).filter(Boolean);
        if (regionProvinces.length === 0) return '';
        return `<div class="region-group">
          <h3 class="region-title">${regionLabel}</h3>
          <div class="province-grid">
            ${regionProvinces.map(province => {
              const style = Config.getProvinceStyle(province.id, State.theme);
              return `<div class="province-card ${province.count > 0 ? '' : 'no-data'}" data-nav href="?page=province&id=${province.id}" style="border-left-color: ${style.color};">
                <div class="province-icon" style="background: ${style.bgColor}; color: ${style.color};">${style.icon}</div>
                <div class="province-info">
                  <div class="province-name">${province.name}</div>
                  <div class="province-count">${province.count > 0 ? province.count + i18nT('province.count') : i18nT('province.noData')}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
      <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light);">
        <h3 class="section-title" style="font-size: 1rem;"><span class="section-icon">${crossStyle.icon}</span> ${i18nT('province.crossTitle')}</h3>
        <p style="color: var(--text-secondary); font-size: .8125rem; margin: .25rem 0 .75rem 0;">${i18nT('province.crossDesc')}</p>
        <div class="province-grid">
          ${crossArticles.map(b => Utils.renderCrossCard(b, crossStyle)).join('')}
        </div>
      </div>
    </div>`;

  UI.setBreadcrumb([{ name: '🗺️ ' + i18nT('province.title') }]);
}
