import { HashSearch } from './hash-search.js';
import { Config } from './config.js';
import { State } from './state.js';
import { UI } from './ui.js';
import { t as i18nT } from './i18n.js';

export async function render(container) {
  if (State.hasAllTagsCache()) return _renderAll(container, State.getAllTags());

  container.innerHTML = `<div class="container"><h2 class="section-title"><span class="section-icon">🏷️</span> ${i18nT('tag.title')}</h2><div class="loading"><div class="loading__icon">🏷️</div><div>${i18nT('tag.loading')}</div></div></div>`;

  if (HashSearch.getCacheStats().loaded > 0) {
    return _renderAll(container, State.getAllTags());
  }

  if (!HashSearch.isBgActive()) {
    HashSearch.startBgPreload([...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'], null, State.lang, () => State._resetDerivedCaches());
  }

  let resolved = false;
  const onComplete = () => {
    if (resolved) return;
    resolved = true;
    window.removeEventListener('bg-preload-complete', onComplete);
    clearTimeout(fallback);
    if (document.getElementById('mainContent')?.contains(container)) {
      _renderAll(container, State.getAllTags());
    }
  };
  window.addEventListener('bg-preload-complete', onComplete);
  // 兜底超时：30 秒后如果事件仍未触发则强制渲染
  const fallback = setTimeout(() => {
    window.removeEventListener('bg-preload-complete', onComplete);
    if (document.getElementById('mainContent')?.contains(container)) {
      _renderAll(container, State.getAllTags());
    }
  }, 30000);
}

function _renderAll(container, tags) {
  if (!tags?.length) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">${i18nT('tag.noData')}</div></div></div>`;
    return;
  }

  const grouped = {};
  const uncategorized = [];
  for (const tag of tags) {
    const cat = Config.getTagCategory(tag.name);
    if (cat) { (grouped[cat.id] || (grouped[cat.id] = [])).push(tag); }
    else { uncategorized.push(tag); }
  }

  const allGroups = Config.tagCategories.map(c => ({ ...c, name: State.lang === 'en' && c.nameEn ? c.nameEn : c.name, tags: grouped[c.id] || [] })).filter(g => g.tags.length > 0);
  if (uncategorized.length) allGroups.push({ id: 'other', icon: '🔭', name: i18nT('tag.other'), tags: uncategorized });

  const activeCategory = State.currentTagCategory;
  const displayGroups = activeCategory ? allGroups.filter(g => g.id === activeCategory) : allGroups;
  const maxCount = Math.max(...tags.map(t => t.count));
  const minCount = Math.min(...tags.map(t => t.count));

  container.innerHTML = `
    <div class="container">

      ${_renderFilterBar(allGroups, activeCategory)}
      <div class="tag-categories">${_renderCategoryGroups(displayGroups, minCount, maxCount)}</div>
    </div>`;
  UI.setBreadcrumb([{ name: '🏷️ ' + i18nT('tag.title') }]);
}

function _renderFilterBar(allGroups, activeCategory) {
  return `<div class="tag-filter">
    <a href="?page=tags" class="trail-filter-btn ${!activeCategory ? 'active' : ''}" data-nav>${i18nT('trail.filterAll')}</a>
    ${allGroups.map(g => `<a href="?page=tags&cat=${g.id}" class="trail-filter-btn ${activeCategory === g.id ? 'active' : ''}" data-nav><span>${g.icon}</span> ${g.name}</a>`).join('')}
  </div>`;
}

function _renderCategoryGroups(groups, minCount, maxCount) {
  let gi = 0;
  return groups.map(g => {
    const tagsHTML = g.tags.map(t => {
      const ts = Config.getTagStyle(t.name, gi++, State.theme);
      const sz = minCount === maxCount ? 13 : 12 + (t.count - minCount) / (maxCount - minCount) * 6;
      return `<span class="tag-modern" data-nav href="?page=tag&name=${encodeURIComponent(t.name)}" style="font-size:${sz}px;background:${ts.bg};color:${ts.color};border:1px solid ${ts.color}30;">
        <span class="tag-modern-icon">${ts.icon}</span>
        <span class="tag-modern-name">${t.name}</span>
        <span class="tag-modern-count" style="background:${ts.color}20;">${t.count}</span>
      </span>`;
    }).join('');
    return `<div class="tag-category"><div class="tag-category__header"><span class="tag-category__icon">${g.icon}</span><span class="tag-category__name">${g.name}</span><span class="tag-category__count">${g.tags.length}${i18nT('tag.count')}</span></div><div class="tags-cloud-modern">${tagsHTML}</div></div>`;
  }).join('');
}
