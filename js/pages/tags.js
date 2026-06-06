/**
 * 标签页 — 按分类筛选展示，与足迹页一致
 */
import HashSearch from '../hash-search.js';
import Config from '../config.js';
import State from '../state.js';

export async function render(container) {
  if (HashSearch.getCacheStats().loadedProvinces > 0) {
    _renderTags(container);
  } else {
    container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">🔄</div><div>正在加载标签数据...</div></div></div>`;
    await State.ensureDataLoaded();
    _renderTags(container);
  }
}

function _renderTags(container) {
  const tags = State.getAllTags();
  if (tags.length === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">暂无标签数据</div></div></div>`;
    return;
  }

  // 按分类分组
  const grouped = {};
  const uncategorized = [];
  for (const tag of tags) {
    const cat = Config.getTagCategory(tag.name);
    if (cat) {
      if (!grouped[cat.id]) grouped[cat.id] = { ...cat, tags: [] };
      grouped[cat.id].tags.push(tag);
    } else {
      uncategorized.push(tag);
    }
  }

  const allGroups = [...Config.tagCategories.map(cat => {
    const g = grouped[cat.id];
    return g || { ...cat, tags: [] };
  })];
  if (uncategorized.length > 0) {
    allGroups.push({ id: 'other', icon: '🔭', name: '其他', tags: uncategorized });
  }

  // 过滤空组
  const visibleGroups = allGroups.filter(g => g.tags.length > 0);

  const activeCategory = State.currentTagCategory;

  // 根据筛选决定显示哪些组
  const displayGroups = activeCategory
    ? visibleGroups.filter(g => g.id === activeCategory)
    : visibleGroups;

  const counts = tags.reduce((acc, t) => { acc.push(t.count); return acc; }, []);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  const renderTag = (tag, index) => {
    const ts = Config.getTagStyle(tag.name, index);
    const size = minCount === maxCount ? 13 : 12 + (tag.count - minCount) / (maxCount - minCount) * 6;
    return `<span class="tag-modern" data-nav href="?page=tag&name=${encodeURIComponent(tag.name)}" style="font-size: ${size}px; background: ${ts.bg}; color: ${ts.color}; border: 1px solid ${ts.color}30;">
      <span class="tag-modern-icon">${ts.icon}</span>
      <span class="tag-modern-name">${tag.name}</span>
      <span class="tag-modern-count" style="background: ${ts.color}20;">${tag.count}</span>
    </span>`;
  };

  let globalIdx = 0;
  container.innerHTML = `
    <div class="container">
      <h2 class="section-title"><span class="section-icon">🏷️</span> 标签</h2>
      <div class="tag-filter-bar">
        <a href="?page=tags" class="trail-filter-btn ${!activeCategory ? 'active' : ''}" data-nav>全部</a>
        ${visibleGroups.map(g => `
          <a href="?page=tags&cat=${g.id}" class="trail-filter-btn ${activeCategory === g.id ? 'active' : ''}" data-nav>
            <span>${g.icon}</span> ${g.name}
          </a>`).join('')}
      </div>
      <div class="tag-categories">
        ${displayGroups.map(group => {
          const groupTagsHtml = group.tags.map(tag => renderTag(tag, globalIdx++)).join('');
          return `
            <div class="tag-category">
              <div class="tag-category__header">
                <span class="tag-category__icon">${group.icon}</span>
                <span class="tag-category__name">${group.name}</span>
                <span class="tag-category__count">${group.tags.length}个</span>
              </div>
              <div class="tags-cloud-modern">
                ${groupTagsHtml}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}