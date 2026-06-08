import { HashSearch, Config, State } from '../core.js';

export async function render(container) {
  const tags = State._allTagsCache ? State.getAllTags() : null;
  if (tags && tags.length > 0) {
    return renderTags(container, tags);
  }

  container.innerHTML = `<div class="container"><h2 class="section-title"><span class="section-icon">🏷️</span> 标签</div>`;

  showCategoriesOnly(container);

  if (HashSearch.getCacheStats().loadedProvinces === 0) {
    loadProvincesInBackground(container);
  } else {
    finishRender(container);
  }
}

function showCategoriesOnly(container) {
  const activeCategory = State.currentTagCategory;
  const visibleGroups = Config.tagCategories.filter(g => g.id === activeCategory || !activeCategory);

  container.innerHTML = `
    <div class="container">
      <h2 class="section-title"><span class="section-icon">🏷️</span> 标签</h2>
      <div class="tag-filter-bar">
        <a href="?page=tags" class="trail-filter-btn ${!activeCategory ? 'active' : ''}" data-nav>全部</a>
        ${Config.tagCategories.filter(g => g.id !== activeCategory || !activeCategory).map(g =>
          `<a href="?page=tags&cat=${g.id}" class="trail-filter-btn ${activeCategory === g.id ? 'active' : ''}" data-nav>
            <span>${g.icon}</span> ${g.name}</a>`
        ).join('')}
      </div>
      <div class="tag-categories">
        ${visibleGroups.map(group => `
          <div class="tag-category">
            <div class="tag-category__header">
              <span class="tag-category__icon">${group.icon}</span>
              <span class="tag-category__name">${group.name}</span>
              <span class="tag-category__count" id="tagCatCount_${group.id}">加载中...</span>
            </div>
            <div class="tags-cloud-modern">
              ${group.tags.map((tag, idx) => {
                const ts = Config.getTagStyle(tag, idx);
                return `<span class="tag-modern" data-nav href="?page=tag&name=${encodeURIComponent(tag)}" style="font-size:13px; background: ${ts.bg}; color: ${ts.color}; border: 1px solid ${ts.color}30;">
                  <span class="tag-modern-icon">${ts.icon}</span>
                  <span class="tag-modern-name">${tag}</span>
                  <span class="tag-modern-count" id="tagCount_${tag}" style="background: ${ts.color}20;">...</span>
                </span>`;
              }).join('')}
            </div>
          </div>`
        ).join('')}
      </div>
    </div>`;
}

async function loadProvincesInBackground(container) {
  const allIds = State.getProvinceMeta()?.provinces?.map(p => p.id) || [];
  const batchSize = 6;
  for (let i = 0; i < allIds.length; i += batchSize) {
    await HashSearch.loadProvinces(allIds.slice(i, i + batchSize));
    State.clearCache();
    updateCounts(State.getAllTags());
  }
}

function finishRender(container) {
  renderTags(container, State.getAllTags());
}

function renderTags(container, tags) {
  if (!tags || tags.length === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">暂无标签数据</div></div></div>`;
    return;
  }

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

  const allGroups = Config.tagCategories.map(cat => grouped[cat.id] || { ...cat, tags: [] });
  if (uncategorized.length > 0) {
    allGroups.push({ id: 'other', icon: '🔭', name: '其他', tags: uncategorized });
  }
  const visibleGroups = allGroups.filter(g => g.tags.length > 0);
  const activeCategory = State.currentTagCategory;
  const displayGroups = activeCategory ? visibleGroups.filter(g => g.id === activeCategory) : visibleGroups;

  const counts = tags.map(t => t.count);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  let globalIdx = 0;
  container.innerHTML = `
    <div class="container">
      <h2 class="section-title"><span class="section-icon">🏷️</span> 标签</h2>
      <div class="tag-filter-bar">
        <a href="?page=tags" class="trail-filter-btn ${!activeCategory ? 'active' : ''}" data-nav>全部</a>
        ${visibleGroups.map(g =>
          `<a href="?page=tags&cat=${g.id}" class="trail-filter-btn ${activeCategory === g.id ? 'active' : ''}" data-nav>
            <span>${g.icon}</span> ${g.name}</a>`
        ).join('')}
      </div>
      <div class="tag-categories">
        ${displayGroups.map(group => {
          const groupTagsHtml = group.tags.map(tag => {
            const ts = Config.getTagStyle(tag.name, globalIdx++);
            const size = minCount === maxCount ? 13 : 12 + (tag.count - minCount) / (maxCount - minCount) * 6;
            return `<span class="tag-modern" data-nav href="?page=tag&name=${encodeURIComponent(tag.name)}" style="font-size:${size}px; background:${ts.bg}; color:${ts.color}; border:1px solid ${ts.color}30;">
              <span class="tag-modern-icon">${ts.icon}</span>
              <span class="tag-modern-name">${tag.name}</span>
              <span class="tag-modern-count" style="background:${ts.color}20;">${tag.count}</span>
            </span>`;
          }).join('');
          return `
            <div class="tag-category">
              <div class="tag-category__header">
                <span class="tag-category__icon">${group.icon}</span>
                <span class="tag-category__name">${group.name}</span>
                <span class="tag-category__count">${group.tags.length}个</span>
              </div>
              <div class="tags-cloud-modern">${groupTagsHtml}</div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function updateCounts(tags) {
  const tagMap = {};
  for (const t of tags) tagMap[t.name] = t.count;

  document.querySelectorAll('[id^="tagCount_"]').forEach(el => {
    const tagName = el.id.replace('tagCount_', '');
    if (tagMap[tagName] !== undefined) el.textContent = tagMap[tagName];
  });

  const catCounts = {};
  for (const t of tags) {
    const cat = Config.getTagCategory(t.name);
    if (cat) catCounts[cat.id] = (catCounts[cat.id] || 0) + 1;
  }
  document.querySelectorAll('[id^="tagCatCount_"]').forEach(el => {
    const catId = el.id.replace('tagCatCount_', '');
    const cnt = catCounts[catId];
    if (cnt !== undefined) el.textContent = cnt + '个';
  });
}
