/**
 * 国保猜猜看 — 修仙等级猜建筑
 */
import HashSearch from '../hash-search.js';
import State from '../state.js';
import Config from '../config.js';
import Utils from '../utils.js';

let _loadedBuildingKey = null;

const LEVELS = [
  '炼气一层','炼气二层','炼气三层','炼气四层','炼气五层','炼气六层','炼气七层','炼气八层','炼气九层','炼气十层',
  '炼气十一层','炼气十二层','炼气十三层',
  '筑基初期','筑基中期','筑基后期','筑基巅峰',
  '结丹初期','结丹中期','结丹后期','结丹巅峰',
  '元婴初期','元婴中期','元婴后期','元婴巅峰',
  '化神初期','化神中期','化神后期','化神巅峰',
  '炼虚初期','炼虚中期','炼虚后期','炼虚巅峰',
  '合体初期','合体中期','合体后期','合体巅峰',
  '大乘初期','大乘中期','大乘后期','大乘巅峰',
  '渡劫期',
  '真仙初期','真仙中期','真仙后期','真仙巅峰',
  '金仙初期','金仙中期','金仙后期','金仙巅峰',
  '太乙仙初期','太乙仙中期','太乙仙后期','太乙仙巅峰',
  '大罗仙初期','大罗仙中期','大罗仙后期','大罗仙巅峰',
  '大罗仙圆满',
  '道祖'
];

const CLUE_STAGES = [
  { key: 'architecture', label: '建筑风格', icon: '🏗️', hint: '这道建筑以什么风格著称？' },
  { key: 'description', label: '特色介绍', icon: '✨', hint: '看看它的特色描述...' },
  { key: 'features', label: '特色与价值', icon: '💎', hint: '它有什么独特价值？' },
  { key: 'history', label: '历史背景', icon: '📜', hint: '回顾它的历史...' },
  { key: 'location', label: '地区', icon: '📍', hint: '它在哪里？' },
  { key: 'era', label: '年代', icon: '📅', hint: '它属于什么年代？' }
];

const STORAGE_KEY = 'guobao_quiz_state';

let _currentBuilding = null;
let _currentClueIndex = 0;
let _quizFinished = false;
let _wrongResultHtml = null;
let _userLevel = 0;
let _filterProvince = 'all';
let _filterEra = 'all';
let _score = 0;
let _totalAttempts = 0;
let _usedBuildingKeys = new Set();

function _saveState() {
  try {
    const state = {
      userLevel: _userLevel, score: _score, totalAttempts: _totalAttempts,
      usedBuildingKeys: [..._usedBuildingKeys],
      filterProvince: _filterProvince, filterEra: _filterEra,
      currentClueIndex: _currentClueIndex,
      quizFinished: _quizFinished,
      wrongResultHtml: _wrongResultHtml
    };
    if (_currentBuilding) {
      state.currentBuildingKey = `${_currentBuilding.provinceId || ''}_${_currentBuilding.district || ''}_${_currentBuilding.name}`;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function _loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      _userLevel = s.userLevel || 0;
      _score = s.score || 0;
      _totalAttempts = s.totalAttempts || 0;
      _usedBuildingKeys = new Set(s.usedBuildingKeys || []);
      _filterProvince = s.filterProvince || 'all';
      _filterEra = s.filterEra || 'all';
      _currentClueIndex = s.currentClueIndex || 0;
      _quizFinished = s.quizFinished === true;
      _wrongResultHtml = s.wrongResultHtml || null;
      // 不直接恢复 building，在 _startRound 中通过 key 查找
      _loadedBuildingKey = s.currentBuildingKey || null;
    }
  } catch (_) {}
}

function _getLevelName() {
  const idx = Math.min(_userLevel, LEVELS.length - 1);
  return LEVELS[idx];
}

function _getLevelProgress() {
  return _userLevel < LEVELS.length - 1 ? `${_userLevel + 1}/${LEVELS.length}` : 'MAX';
}

function _getCandidateBuildings() {
  const all = State.getAllBuildings();
  return all.filter(b => {
    if (!b.architecture && !b.description && !b.features && !b.history) return false;
    if (_filterProvince !== 'all' && b.provinceId !== _filterProvince) return false;
    if (_filterEra !== 'all') {
      const eraId = Config.getEarliestDynasty(b.era);
      if (eraId !== _filterEra) return false;
    }
    return true;
  });
}

function _pickRandomBuilding() {
  const candidates = _getCandidateBuildings();
  if (candidates.length === 0) return null;
  const available = candidates.filter(b => {
    const key = `${b.provinceId}_${b.district}_${b.name}`;
    return !_usedBuildingKeys.has(key);
  });
  if (available.length === 0) {
    _usedBuildingKeys.clear();
    _saveState();
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

function _checkAnswer(userInput) {
  if (!_currentBuilding || !userInput.trim()) return false;
  const input = userInput.trim().toLowerCase();
  const correctName = _currentBuilding.name.toLowerCase();
  const correctLen = correctName.length;

  // 完全匹配
  if (input === correctName) return true;

  // 计算最小匹配长度：至少 3 个字符，且匹配度 >= 75%
  const minInputLen = correctLen <= 3 ? correctLen : Math.max(3, Math.ceil(correctLen * 0.75));

  // 去除常见后缀后匹配
  const stripped = correctName.replace(/(故城|遗址|古城|墓群|陵墓|石窟|寺庙|塔|桥|村|镇|山|河|湖|海)$/, '');
  if (stripped !== correctName && input === stripped) return true;

  // 包含匹配（如"高昌"匹配"高昌故城"），需满足最小长度和匹配度
  if (correctName.includes(input) && input.length >= minInputLen) return true;
  if (input.includes(correctName) && correctLen >= minInputLen && correctLen >= 3) return true;

  return false;
}

function _getMatchInfo(input) {
  const correctName = _currentBuilding.name;
  const correctLen = correctName.length;
  const inputStr = input.trim();
  const inputLen = inputStr.length;
  const minInputLen = correctLen <= 3 ? correctLen : Math.max(3, Math.ceil(correctLen * 0.75));

  // 统计正确字数：输入中存在于答案的字符数（去重）
  const correctSet = new Set(correctName);
  let correctChars = 0;
  for (const ch of inputStr) {
    if (correctSet.has(ch)) correctChars++;
  }
  const wrongChars = inputLen - correctChars;

  return { correctLen, inputLen, correctChars, wrongChars, minInputLen };
}

function _getLocationClue(b) {
  return b.location || '暂无地区信息';
}

// 根据下一线索索引生成生动的提示文案
function _getHintPrompt(nextStageIndex) {
  const prompts = [
    '🤔 要不要来点提示？让我告诉你它的建筑风格有多特别！',
    '🧐 还没头绪吗？让我为你描绘它的特色～',
    '🎯 再想想？它的独特价值或许能给你启发！',
    '📖 想听听它的故事吗？历史背景里有答案哦！',
    '🗺️ 方向不对？让我告诉你它在哪里！',
    '⏳ 最后一击！它的年代即将揭晓～'
  ];
  return prompts[nextStageIndex] || '💡 让我来帮你！';
}

// 从线索文本中移除答案相关文字，避免泄露答案
// 1. 替换完整建筑名称 → "该建筑"
// 2. 替换核心名称（仅当独立出现、非复合词时）→ "该建筑"
// 3. 非地区/年代线索中，替换地区名和年代 → 泛称
function _sanitizeClueText(text, stageKey) {
  if (!text || !_currentBuilding) return text;
  let result = text;
  const name = _currentBuilding.name;

  // 1. 替换完整建筑名称
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  result = result.replace(new RegExp(escaped, 'g'), '该建筑');

  // 2. 提取核心名称（去除常见后缀），智能替换独立出现的核心名
  const coreName = name.replace(/(故城|遗址|古城|墓群|陵墓|石窟|寺庙|塔|桥|村|镇|山|河|湖|海|旧址|古墓|建筑群|衙门|祠堂|民居|大院|庄园|关隘|长城|烽燧|驿站|会馆|书院|孔庙|文庙|道观|佛寺|寺院|庵堂|宫观|教堂|清真寺|墓园|石刻|碑林|造像|经幢|古建|群)$/, '');
  if (coreName !== name && coreName.length >= 2) {
    const coreEscaped = coreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 仅替换独立出现的核心名：前有标点/句首，后跟标点/常见虚词/句尾
    // 避免将复合词中的核心名误替换（如"高昌回鹘"中的"高昌"）
    result = result.replace(
      new RegExp(`(^|[。，；：、！？""''\\s（）])${coreEscaped}(?=[。，；：、！？""''\\s（）的是了在为与和及等也都就已将被从由对向于至]|$)`, 'g'),
      '$1该建筑'
    );
  }

  // 3. 非地区、非年代线索中，替换地区名和年代信息
  if (stageKey && stageKey !== 'location' && stageKey !== 'era') {
    if (_currentBuilding.province) {
      const provEscaped = _currentBuilding.province.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(provEscaped, 'g'), '该地区');
    }
    if (_currentBuilding.districtName) {
      const distEscaped = _currentBuilding.districtName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(distEscaped, 'g'), '当地');
    }
    if (_currentBuilding.era) {
      const eraEscaped = _currentBuilding.era.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(eraEscaped, 'g'), '某个时期');
    }
  }

  return result;
}

// 渲染所有已揭示的线索列表
function _renderAllClues() {
  const clues = [];
  for (let i = 0; i <= _currentClueIndex; i++) {
    const stage = CLUE_STAGES[i];
    let raw = '';
    switch (stage.key) {
      case 'architecture':
        raw = _currentBuilding.architecture || '暂无建筑风格信息';
        break;
      case 'description':
        raw = _currentBuilding.description || '暂无特色介绍';
        break;
      case 'features':
        raw = _currentBuilding.features || '暂无特色与价值信息';
        break;
      case 'history':
        raw = _currentBuilding.history || '暂无历史背景信息';
        break;
      case 'location':
        raw = _getLocationClue(_currentBuilding) || '暂无地区信息';
        break;
      case 'era': {
        const eraTags = (_currentBuilding.tags || []).join(' · ');
        raw = `年代：${_currentBuilding.era || '暂无信息'} · ${eraTags || '暂无标签'}`;
        break;
      }
    }
    const text = _sanitizeClueText(raw, stage.key);
    const isNewest = i === _currentClueIndex;
    const hasMap = stage.key === 'location' && _currentBuilding.lat && _currentBuilding.lng;
    clues.push({ stage, text, isNewest, index: i + 1, hasMap });
  }
  return clues;
}

// 省份名称简化
function _shortProvince(name) {
  const map = {
    '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西', '西藏自治区': '西藏',
    '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆', '香港特别行政区': '香港',
    '澳门特别行政区': '澳门'
  };
  return map[name] || name;
}

// 年代名称简化
function _shortEra(name) {
  if (name === '中华人民共和国') return '共和国';
  return name;
}

async function _startRound(container, forceNew = false) {
  // 如果不是强制新题，且当前有未完成的题目，直接恢复
  if (!forceNew && _currentBuilding && !_quizFinished) {
    _renderQuizUI(container);
    return;
  }

  // 如果是强制新题或已结束，清除旧状态
  if (forceNew || _quizFinished) {
    _currentBuilding = null;
    _currentClueIndex = 0;
    _quizFinished = false;
    _wrongResultHtml = null;
    _loadedBuildingKey = null;
  }

  // 尝试从持久化存储恢复建筑
  if (!_currentBuilding && _loadedBuildingKey) {
    const allProvinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'];
    await HashSearch.loadProvinces(allProvinceIds);
    const all = State.getAllBuildings();
    _currentBuilding = all.find(b => {
      const key = `${b.provinceId || ''}_${b.district || ''}_${b.name}`;
      return key === _loadedBuildingKey;
    }) || null;
    if (!_currentBuilding) {
      _currentClueIndex = 0;
      _quizFinished = false;
      _loadedBuildingKey = null;
    }
  }

  // 如果还没有建筑，加载数据并随机选一个
  if (!_currentBuilding) {
    const allProvinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'];
    await HashSearch.loadProvinces(allProvinceIds);
    _currentBuilding = _pickRandomBuilding();
    _currentClueIndex = 0;
    _quizFinished = false;
  }

  _saveState();
  _renderQuizUI(container);
}

function _renderQuizUI(container) {
  // 候选建筑总数（包括已答过的）
  const totalCandidates = _getCandidateBuildings().length;

  if (!_currentBuilding) {
    // 显示空状态并保留筛选栏，让用户可以调整
    const eraOptions2 = Config.eras.filter(e => e.timeline !== false);
    container.innerHTML = `
      <div class="container">
        <div class="quiz-page">
          <div class="quiz-status-bar">
            <div class="quiz-status-level">
              <span class="quiz-status-icon">⚡</span>
              <span class="quiz-status-label">境界</span>
              <span class="quiz-status-value">${_getLevelName()}</span>
              <span class="quiz-status-progress">${_getLevelProgress()}</span>
            </div>
            <div class="quiz-status-stats">
              <span>🏆 ${_score} 答对</span>
            </div>
          </div>
          <div class="quiz-filters">
            <select class="quiz-filter-select" id="quizFilterProvince">
              <option value="all">🌏 地区</option>
              ${(State.getProvinceMeta()?.provinces || []).map(p => {
                const ps = Config.getProvinceStyle(p.id);
                const short = _shortProvince(p.name);
                return `<option value="${p.id}" ${_filterProvince === p.id ? 'selected' : ''}>${ps.icon} ${short}</option>`;
              }).join('')}
            </select>
            <select class="quiz-filter-select" id="quizFilterEra">
              <option value="all">📅 年代</option>
              ${eraOptions2.map(e => `<option value="${e.id}" ${_filterEra === e.id ? 'selected' : ''}>${_shortEra(e.name)}</option>`).join('')}
            </select>
            <button class="quiz-filter-apply" id="quizFilterApply">筛选</button>
          </div>
          <div class="empty-state">
            <div class="empty-state-icon">🏛️</div>
            <div class="empty-state-title">没有符合条件的建筑</div>
            <p>${totalCandidates === 0 ? '当前筛选条件下无建筑，请调整地区或年代' : '所有建筑已答完，请调整筛选条件或继续答题'}</p>
            ${totalCandidates === 0 ? '<button class="quiz-btn quiz-btn-submit" style="margin-top:0.75rem;" id="quizResetFilters">重置筛选</button>' : ''}
          </div>
        </div>
      </div>`;

    // 绑定筛选和重置
    const filterApply = document.getElementById('quizFilterApply');
    if (filterApply) {
      filterApply.addEventListener('click', () => {
        _filterProvince = document.getElementById('quizFilterProvince')?.value || 'all';
        _filterEra = document.getElementById('quizFilterEra')?.value || 'all';
        _saveState();
        _quizFinished = true;
        _startRound(container, true);
      });
    }
    const resetBtn = document.getElementById('quizResetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        _filterProvince = 'all';
        _filterEra = 'all';
        _saveState();
        _quizFinished = true;
        _startRound(container, true);
      });
    }
    return;
  }

  const levelName = _getLevelName();
  const levelProgress = _getLevelProgress();
  const accuracy = _totalAttempts > 0 ? Math.round(_score / _totalAttempts * 100) : 0;
  const remainingClues = CLUE_STAGES.length - _currentClueIndex - 1;
  const allClues = _renderAllClues();

  const eraOptions = Config.eras.filter(e => e.timeline !== false);

  container.innerHTML = `
    <div class="container">
      <div class="quiz-page">
        <!-- 状态栏 -->
        <div class="quiz-status-bar">
          <div class="quiz-status-level">
            <span class="quiz-status-icon">⚡</span>
            <span class="quiz-status-label">境界</span>
            <span class="quiz-status-value" id="quizLevelName">${levelName}</span>
            <span class="quiz-status-progress">${levelProgress}</span>
          </div>
          <div class="quiz-status-stats">
            <span>🏆 ${_score} 答对</span>
            <span>📊 ${accuracy}% 正确率</span>
          </div>
        </div>

        <!-- 筛选栏 -->
        <div class="quiz-filters">
          <select class="quiz-filter-select" id="quizFilterProvince">
            <option value="all">🌏 地区</option>
            ${(State.getProvinceMeta()?.provinces || []).map(p => {
              const ps = Config.getProvinceStyle(p.id);
              return `<option value="${p.id}" ${_filterProvince === p.id ? 'selected' : ''}>${ps.icon} ${_shortProvince(p.name)}</option>`;
            }).join('')}
          </select>
          <select class="quiz-filter-select" id="quizFilterEra">
            <option value="all">📅 年代</option>
            ${eraOptions.map(e => `<option value="${e.id}" ${_filterEra === e.id ? 'selected' : ''}>${_shortEra(e.name)}</option>`).join('')}
          </select>
          <button class="quiz-filter-apply" id="quizFilterApply">筛选</button>
        </div>

        <!-- 已揭示的线索列表 -->
        <div class="quiz-clue-list">
          ${allClues.map(c => `
            <div class="quiz-clue-card${c.isNewest ? ' quiz-clue-card-newest' : ''}">
              <div class="quiz-clue-content">
                <p>${c.text}</p>
                ${c.hasMap ? `<div class="quiz-satellite-map"></div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 输入区 -->
        <div class="quiz-input-area">
          ${remainingClues > 0 ? `
            <button class="quiz-btn quiz-btn-hint" id="quizMoreHint">
              ${_getHintPrompt(_currentClueIndex + 1)}
            </button>` : ''}
          <div class="quiz-input-row">
            <input type="text" class="quiz-input" id="quizAnswerInput" placeholder="输入建筑名称..." autocomplete="off">
            <button class="quiz-btn quiz-btn-submit" id="quizSubmit">提交答案</button>
          </div>
          <button class="quiz-btn quiz-btn-reveal" id="quizReveal">💡 猜不出来？直接看答案</button>
          <button class="quiz-btn quiz-btn-skip" id="quizSkip">⏭️ 跳过此题</button>
        </div>

        <!-- 结果区域 -->
        ${_wrongResultHtml ? `<div class="quiz-result quiz-result-wrong" id="quizResult">${_wrongResultHtml}</div>` : `<div class="quiz-result" id="quizResult" style="display:none;"></div>`}
      </div>
    </div>`;

  _bindQuizEvents(container);
  _initSatelliteMap();
}

function _initSatelliteMap() {
  const mapDivs = document.querySelectorAll('.quiz-satellite-map');
  const mapDiv = mapDivs[mapDivs.length - 1];
  if (!mapDiv || !_currentBuilding?.lat || !_currentBuilding?.lng) return;

  const lat = _currentBuilding.lat;
  const lng = _currentBuilding.lng;

  const map = L.map(mapDiv, {
    center: [lat, lng],
    zoom: 15,
    zoomControl: true,
    attributionControl: false
  });

  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© OpenStreetMap'
  });
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19
  });
  const road = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18, opacity: 0.7
  });
  const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18, opacity: 0.6
  });
  const satGroup = L.layerGroup([sat, road, labels]);
  L.control.layers({
    '标准': osm,
    '卫星': satGroup
  }, null, { position: 'bottomleft', collapsed: true }).addTo(map);
  satGroup.addTo(map);

  // 红色标记点 + 脉冲圆圈
  const markerIcon = L.divIcon({
    className: 'quiz-satellite-marker',
    html: '<div class="quiz-satellite-pin"></div><div class="quiz-satellite-pulse"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  L.marker([lat, lng], { icon: markerIcon }).addTo(map);

  // 延迟 invalidateSize 确保容器尺寸正确
  setTimeout(() => { map.invalidateSize(); }, 100);
}

function _appendClue(index) {
  const clueList = document.querySelector('.quiz-clue-list');
  if (!clueList || !_currentBuilding) return;

  const stage = CLUE_STAGES[index];
  let raw = '';
  switch (stage.key) {
    case 'architecture': raw = _currentBuilding.architecture || '暂无建筑风格信息'; break;
    case 'description': raw = _currentBuilding.description || '暂无特色介绍'; break;
    case 'features': raw = _currentBuilding.features || '暂无特色与价值信息'; break;
    case 'history': raw = _currentBuilding.history || '暂无历史背景信息'; break;
    case 'location': raw = _getLocationClue(_currentBuilding) || '暂无地区信息'; break;
    case 'era': {
      const eraTags = (_currentBuilding.tags || []).join(' · ');
      raw = `年代：${_currentBuilding.era || '暂无信息'} · ${eraTags || '暂无标签'}`;
      break;
    }
  }
  const text = _sanitizeClueText(raw, stage.key);
  const hasMap = stage.key === 'location' && _currentBuilding.lat && _currentBuilding.lng;

  // 移除旧卡片的新增标记
  clueList.querySelectorAll('.quiz-clue-card-newest').forEach(el => el.classList.remove('quiz-clue-card-newest'));

  const div = document.createElement('div');
  div.className = 'quiz-clue-card quiz-clue-card-newest';
  div.innerHTML = `
              <div class="quiz-clue-content">
                <p>${text}</p>
                ${hasMap ? '<div class="quiz-satellite-map"></div>' : ''}
              </div>
            </div>`;

  clueList.appendChild(div);

  // 如果是地区线索，初始化卫星地图
  if (hasMap) _initSatelliteMap();
}

function _bindQuizEvents(container) {
  const input = document.getElementById('quizAnswerInput');
  const submitBtn = document.getElementById('quizSubmit');
  const hintBtn = document.getElementById('quizMoreHint');
  const skipBtn = document.getElementById('quizSkip');
  const revealBtn = document.getElementById('quizReveal');
  const filterApply = document.getElementById('quizFilterApply');

  if (input) input.focus();

  if (submitBtn) {
    submitBtn.addEventListener('click', () => _handleSubmit());
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _handleSubmit();
    });
  }

  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      if (_currentClueIndex < CLUE_STAGES.length - 1) {
        _currentClueIndex++;
        _appendClue(_currentClueIndex);
        const remaining = CLUE_STAGES.length - _currentClueIndex - 1;
        if (remaining > 0) {
          hintBtn.textContent = _getHintPrompt(_currentClueIndex + 1);
        } else {
          hintBtn.style.display = 'none';
        }
        const inputEl = document.getElementById('quizAnswerInput');
        if (inputEl) inputEl.focus();
      }
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      _handleSkip(container);
    });
  }

  if (revealBtn) {
    revealBtn.addEventListener('click', () => {
      _handleReveal(container);
    });
  }

  if (filterApply) {
    filterApply.addEventListener('click', () => {
      _filterProvince = document.getElementById('quizFilterProvince')?.value || 'all';
      _filterEra = document.getElementById('quizFilterEra')?.value || 'all';
      _saveState();
      _quizFinished = true;
      _startRound(container, true);
    });
  }
}

function _handleSubmit() {
  const input = document.getElementById('quizAnswerInput');
  const resultArea = document.getElementById('quizResult');
  if (!input || !resultArea || !_currentBuilding) return;

  const userAnswer = input.value.trim();
  if (!userAnswer) return;

  // 清除旧结果，新提交将生成新结果
  _wrongResultHtml = null;
  _totalAttempts++;
  const isCorrect = _checkAnswer(userAnswer);

  if (isCorrect) {
    _score++;
    if (_userLevel < LEVELS.length - 1) _userLevel++;
    const buildingKey = `${_currentBuilding.provinceId}_${_currentBuilding.district}_${_currentBuilding.name}`;
    _usedBuildingKeys.add(buildingKey);
    _quizFinished = true;
    _wrongResultHtml = null;
    _saveState();

    const correctSet = new Set(_currentBuilding.name);
    const coloredChars = userAnswer.split('').map(ch =>
      `<span class="char-correct">${ch}</span>`
    ).join('');

    resultArea.style.display = 'block';
    resultArea.className = 'quiz-result quiz-result-correct';
    resultArea.innerHTML = `
      <div class="quiz-result-icon">✅</div>
      <div class="quiz-result-title">回答正确！</div>
      <div class="quiz-result-chars">
        <div class="quiz-result-chars-row">${coloredChars}</div>
      </div>
      <div class="quiz-result-answer">答案：<strong>${_currentBuilding.name}</strong></div>
      <div class="quiz-result-detail">${_currentBuilding.province} · ${_currentBuilding.districtName} · ${_currentBuilding.era}</div>
      <div class="quiz-result-level">⬆ 境界提升至 <strong>${_getLevelName()}</strong></div>
      <div class="quiz-result-actions">
        <a href="${Utils.generateBuildingHash(_currentBuilding, State.getProvinceName.bind(State))}" class="quiz-btn quiz-btn-outline" target="_blank">查看详情 ↗</a>
        <button class="quiz-btn quiz-btn-outline" id="quizNextRound">继续下一题 →</button>
      </div>`;

    document.getElementById('quizNextRound').addEventListener('click', () => {
      _startRound(document.getElementById('mainContent'), true);
    });

    input.disabled = true;
    document.getElementById('quizSubmit').disabled = true;
    const hintBtn = document.getElementById('quizMoreHint');
    if (hintBtn) hintBtn.style.display = 'none';
    const skipBtn = document.getElementById('quizSkip');
    if (skipBtn) skipBtn.style.display = 'none';
    const revealBtn = document.getElementById('quizReveal');
    if (revealBtn) revealBtn.style.display = 'none';
  } else {
    if (_userLevel > 0) _userLevel--;
    _saveState();

    const correctSet = new Set(_currentBuilding.name);
    const coloredChars = userAnswer.split('').map(ch =>
      `<span class="char-${correctSet.has(ch) ? 'correct' : 'wrong'}">${ch}</span>`
    ).join('');

    resultArea.style.display = 'block';
    resultArea.className = 'quiz-result quiz-result-wrong';
    const matchInfo = _getMatchInfo(userAnswer);
    _wrongResultHtml = `
      <div class="quiz-result-icon">❌</div>
      <div class="quiz-result-title">不对哦，再想想！</div>
      <div class="quiz-result-chars">
        <div class="quiz-result-chars-hint">🟢 正确字 · ⚪ 错误/多输的字</div>
        <div class="quiz-result-chars-row">${coloredChars}</div>
      </div>
      <div class="quiz-result-level">⬇ 境界降至 <strong>${_getLevelName()}</strong></div>`;
    resultArea.innerHTML = _wrongResultHtml;
    _saveState();

    input.value = '';
    input.focus();
  }
}

function _handleReveal(container) {
  if (!_currentBuilding) return;
  _totalAttempts++;
  if (_userLevel > 0) _userLevel--;
  const buildingKey = `${_currentBuilding.provinceId}_${_currentBuilding.district}_${_currentBuilding.name}`;
  _usedBuildingKeys.add(buildingKey);
  _quizFinished = true;
  _saveState();

  const resultArea = document.getElementById('quizResult');
  if (resultArea) {
    resultArea.style.display = 'block';
    resultArea.className = 'quiz-result quiz-result-reveal';
    resultArea.innerHTML = `
      <div class="quiz-result-icon">💡</div>
      <div class="quiz-result-title">答案揭晓</div>
      <div class="quiz-result-answer">答案：<strong>${_currentBuilding.name}</strong></div>
      <div class="quiz-result-detail">${_currentBuilding.province} · ${_currentBuilding.districtName} · ${_currentBuilding.era}</div>
      <div class="quiz-result-level">⬇ 境界降至 <strong>${_getLevelName()}</strong></div>
      <div class="quiz-result-actions">
        <a href="${Utils.generateBuildingHash(_currentBuilding, State.getProvinceName.bind(State))}" class="quiz-btn quiz-btn-outline" target="_blank">查看详情 ↗</a>
        <button class="quiz-btn quiz-btn-outline" id="quizNextRound">继续下一题 →</button>
      </div>`;

    document.getElementById('quizNextRound').addEventListener('click', () => {
      _startRound(document.getElementById('mainContent'), true);
    });

    const input = document.getElementById('quizAnswerInput');
    if (input) input.disabled = true;
    const submitBtn = document.getElementById('quizSubmit');
    if (submitBtn) submitBtn.disabled = true;
    const hintBtn = document.getElementById('quizMoreHint');
    if (hintBtn) hintBtn.style.display = 'none';
    const skipBtn = document.getElementById('quizSkip');
    if (skipBtn) skipBtn.style.display = 'none';
    const revealBtn = document.getElementById('quizReveal');
    if (revealBtn) revealBtn.style.display = 'none';
  }
}

function _handleSkip(container) {
  if (!_currentBuilding) return;
  _totalAttempts++;
  if (_userLevel > 0) _userLevel--;
  const buildingKey = `${_currentBuilding.provinceId}_${_currentBuilding.district}_${_currentBuilding.name}`;
  _usedBuildingKeys.add(buildingKey);
  _quizFinished = true;
  _saveState();

  const resultArea = document.getElementById('quizResult');
  if (resultArea) {
    resultArea.style.display = 'block';
    resultArea.className = 'quiz-result quiz-result-skip';
    resultArea.innerHTML = `
      <div class="quiz-result-icon">⏭️</div>
      <div class="quiz-result-title">已跳过</div>
      <div class="quiz-result-answer">答案：<strong>${_currentBuilding.name}</strong></div>
      <div class="quiz-result-detail">${_currentBuilding.province} · ${_currentBuilding.districtName} · ${_currentBuilding.era}</div>
      <div class="quiz-result-level">⬇ 境界降至 <strong>${_getLevelName()}</strong></div>
      <div class="quiz-result-actions">
        <a href="${Utils.generateBuildingHash(_currentBuilding, State.getProvinceName.bind(State))}" class="quiz-btn quiz-btn-outline" target="_blank">查看详情 ↗</a>
        <button class="quiz-btn quiz-btn-outline" id="quizNextRoundSkip">继续下一题 →</button>
      </div>`;

    document.getElementById('quizNextRoundSkip').addEventListener('click', () => {
      _startRound(document.getElementById('mainContent'), true);
    });

    const input = document.getElementById('quizAnswerInput');
    if (input) input.disabled = true;
    const submitBtn = document.getElementById('quizSubmit');
    if (submitBtn) submitBtn.disabled = true;
    const hintBtn = document.getElementById('quizMoreHint');
    if (hintBtn) hintBtn.style.display = 'none';
    const skipBtn = document.getElementById('quizSkip');
    if (skipBtn) skipBtn.style.display = 'none';
    const revealBtn = document.getElementById('quizReveal');
    if (revealBtn) revealBtn.style.display = 'none';
  }
}

export async function render(container) {
  _loadState();
  _startRound(container);
}