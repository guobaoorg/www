/**
 * 首页模块 — 国保猜猜看每日一题
 */
import HashSearch from '../hash-search.js';
import State from '../state.js';
import Config from '../config.js';
import Utils from '../utils.js';

let _destroyMap = null;

// 每日一题：使用日期作为随机种子，确保同一天所有用户看到同一题
function _getDailyRandomBuilding() {
  const all = State.getAllBuildings();
  const candidates = all.filter(b => b.architecture && b.description && b.features && b.history);
  if (candidates.length === 0) return null;

  // 基于当前日期生成种子，每日一题
  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = dateSeed % candidates.length;
  return candidates[index];
}

// 从线索文本中移除答案相关文字，避免泄露答案
// 1. 替换完整建筑名称 → "该建筑"
// 2. 替换核心名称（仅当独立出现、非复合词时）→ "该建筑"
// 3. 非地区/年代线索中，替换地区名和年代 → 泛称
function _sanitizeClueText(text, building, stageKey) {
  if (!text || !building) return text;
  let result = text;
  const name = building.name;

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
    if (building.province) {
      const provEscaped = building.province.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(provEscaped, 'g'), '该地区');
    }
    if (building.districtName) {
      const distEscaped = building.districtName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(distEscaped, 'g'), '当地');
    }
    if (building.era) {
      const eraEscaped = building.era.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(eraEscaped, 'g'), '某个时期');
    }
  }

  return result;
}

const CLUE_STAGES = [
  { key: 'architecture', label: '建筑风格', icon: '🏗️', hint: '这道建筑以什么风格著称？' },
  { key: 'description', label: '特色介绍', icon: '✨', hint: '看看它的特色描述...' },
  { key: 'features', label: '特色与价值', icon: '💎', hint: '它有什么独特价值？' },
  { key: 'history', label: '历史背景', icon: '📜', hint: '回顾它的历史...' },
  { key: 'location', label: '地区', icon: '📍', hint: '它在哪里？' },
  { key: 'era', label: '年代', icon: '📅', hint: '它属于什么年代？' }
];

function _getLocationClue(b) {
  const parts = [];
  if (b.province) parts.push(b.province);
  if (b.districtName) parts.push(b.districtName);
  return parts.join(' ');
}

function _getClueText(stageKey, building) {
  let raw = '';
  switch (stageKey) {
    case 'architecture':
      raw = building.architecture || '暂无建筑风格信息';
      break;
    case 'description':
      raw = building.description || '暂无特色介绍';
      break;
    case 'features':
      raw = building.features || '暂无特色与价值信息';
      break;
    case 'history':
      raw = building.history || '暂无历史背景信息';
      break;
    case 'location':
      raw = _getLocationClue(building) || '暂无地区信息';
      break;
    case 'era':
      raw = building.era || '暂无年代信息';
      break;
  }
  return _sanitizeClueText(raw, building, stageKey);
}

function _checkAnswer(userInput, correctName) {
  if (!userInput.trim()) return false;
  const input = userInput.trim().toLowerCase();
  const correct = correctName.toLowerCase();
  const correctLen = correct.length;

  // 完全匹配
  if (input === correct) return true;

  // 计算最小匹配长度：至少 3 个字符，且匹配度 >= 75%
  const minInputLen = correctLen <= 3 ? correctLen : Math.max(3, Math.ceil(correctLen * 0.75));

  // 去除常见后缀后匹配
  const stripped = correct.replace(/(故城|遗址|古城|墓群|陵墓|石窟|寺庙|塔|桥|村|镇|山|河|湖|海)$/, '');
  if (stripped !== correct && input === stripped) return true;

  // 包含匹配，需满足最小长度和匹配度
  if (correct.includes(input) && input.length >= minInputLen) return true;
  if (input.includes(correct) && correctLen >= minInputLen && correctLen >= 3) return true;

  return false;
}

function _getMatchInfo(input, correctName) {
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

function _renderAllClues(building, currentClueIndex) {
  const clues = [];
  for (let i = 0; i <= currentClueIndex; i++) {
    const stage = CLUE_STAGES[i];
    const text = _getClueText(stage.key, building);
    const isNewest = i === currentClueIndex;
    const hasMap = stage.key === 'location' && building.lat && building.lng;
    clues.push({ stage, text, isNewest, index: i + 1, hasMap });
}
return clues;
}

export async function render(container, destroyMapFn) {
  _destroyMap = destroyMapFn;
  if (_destroyMap) _destroyMap();

  container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">❓</div><div>正在加载今日题目...</div></div></div>`;

  const allProvinceIds = [...(State.getProvinceMeta()?.provinces?.map(p => p.id) || []), 'cross'];
  await HashSearch.loadProvinces(allProvinceIds);
  await State.ensureDataLoaded();

  const dailyBuilding = _getDailyRandomBuilding();
  if (!dailyBuilding) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">暂无题目</div><p>请检查数据</p></div></div>`;
    return;
  }

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  let currentClueIndex = 0;
  const remainingClues = () => CLUE_STAGES.length - currentClueIndex - 1;
  const allClues = () => _renderAllClues(dailyBuilding, currentClueIndex);

  function renderHomeQuiz() {
    const clues = allClues();
    container.innerHTML = `
      <div class="container">
        <div class="daily-quiz-page">
          <!-- 标题栏 -->
          <div class="daily-quiz-header">
            <div class="daily-quiz-title">
              <span class="daily-quiz-title-icon">🎯</span>
              <div>
                <h1>国保单位猜猜看 · 每日一题</h1>
                <p class="daily-quiz-date">${dateStr} · 挑战你的国保知识储备</p>
              </div>
            </div>
            <a href="?page=quiz" class="daily-quiz-more-link">进入完整答题 →</a>
          </div>

          <!-- 线索提示阶段 -->
          <div class="quiz-clue-stages">
            ${CLUE_STAGES.map((s, i) => {
              const revealed = i <= currentClueIndex;
              const current = i === currentClueIndex;
              return `<span class="quiz-clue-dot${revealed ? ' revealed' : ''}${current ? ' current' : ''}" title="${s.label}">${s.icon}</span>`;
            }).join('')}
          </div>

          <!-- 已揭示的线索列表 -->
          <div class="quiz-clue-list">
            ${clues.map(c => `
              <div class="quiz-clue-card${c.isNewest ? ' quiz-clue-card-newest' : ''}">
                <div class="quiz-clue-header">
                  <span class="quiz-clue-icon">${c.stage.icon}</span>
                  <span class="quiz-clue-label">${c.stage.label}</span>
                  <span class="quiz-clue-count">提示 ${c.index}</span>
                </div>
                <div class="quiz-clue-content">
                  <p>${c.text}</p>
                  ${c.hasMap ? `<div class="quiz-satellite-map" id="homeSatelliteMap"></div>` : ''}
                </div>
                ${c.isNewest ? `<div class="quiz-clue-hint">${c.stage.hint}</div>` : ''}
              </div>
            `).join('')}
          </div>

          <!-- 输入区 -->
          <div class="quiz-input-area">
            ${remainingClues() > 0 ? `
              <button class="quiz-btn quiz-btn-hint" id="dailyQuizMoreHint">
                💡 猜不出来？获取更多提示（还剩 ${remainingClues()} 条）
              </button>` : ''}
            <div class="quiz-input-row">
              <input type="text" class="quiz-input" id="dailyQuizInput" placeholder="输入建筑名称..." autocomplete="off">
              <button class="quiz-btn quiz-btn-submit" id="dailyQuizSubmit">提交答案</button>
            </div>
          </div>

          <!-- 结果区域 -->
          <div class="quiz-result" id="dailyQuizResult" style="display:none;"></div>
        </div>
      </div>`;

    bindEvents();
    _initHomeSatelliteMap(dailyBuilding);
  }

  function _initHomeSatelliteMap(building) {
    const mapDiv = document.getElementById('homeSatelliteMap');
    if (!mapDiv || !building?.lat || !building?.lng) return;

    const map = L.map(mapDiv, {
      center: [building.lat, building.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: 'quiz-satellite-marker',
      html: '<div class="quiz-satellite-pin"></div><div class="quiz-satellite-pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker([building.lat, building.lng], { icon: markerIcon }).addTo(map);
    setTimeout(() => { map.invalidateSize(); }, 100);
  }

  function bindEvents() {
    const input = document.getElementById('dailyQuizInput');
    const submitBtn = document.getElementById('dailyQuizSubmit');
    const hintBtn = document.getElementById('dailyQuizMoreHint');
    const resultArea = document.getElementById('dailyQuizResult');

    if (input) input.focus();

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        handleSubmit(input, resultArea);
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSubmit(input, resultArea);
      });
    }

    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        if (currentClueIndex < CLUE_STAGES.length - 1) {
          currentClueIndex++;
          renderHomeQuiz();
          const inputEl = document.getElementById('dailyQuizInput');
          if (inputEl) inputEl.focus();
        }
      });
    }
  }

  function handleSubmit(input, resultArea) {
    const userAnswer = input.value.trim();
    if (!userAnswer) return;

    const isCorrect = _checkAnswer(userAnswer, dailyBuilding.name);

    if (isCorrect) {
      resultArea.style.display = 'block';
      resultArea.className = 'quiz-result quiz-result-correct';
      resultArea.innerHTML = `
        <div class="quiz-result-icon">✅</div>
        <div class="quiz-result-title">回答正确！太棒了</div>
        <div class="quiz-result-answer">答案：<strong>${dailyBuilding.name}</strong></div>
        <div class="quiz-result-detail">${dailyBuilding.province} · ${dailyBuilding.districtName} · ${dailyBuilding.era}</div>
        <div style="margin-top: 0.75rem;">
          <a href="${Utils.generateBuildingHash(dailyBuilding, State.getProvinceName.bind(State))}" class="quiz-btn quiz-btn-next" style="text-decoration:none;display:inline-block;">查看详情 ↗</a>
          <a href="?page=quiz" class="quiz-btn quiz-btn-next" style="text-decoration:none;display:inline-block;margin-left: 0.5rem;">继续挑战 →</a>
        </div>`;

      input.disabled = true;
      document.getElementById('dailyQuizSubmit').disabled = true;
      const hintBtn = document.getElementById('dailyQuizMoreHint');
      if (hintBtn) hintBtn.style.display = 'none';
    } else {
      resultArea.style.display = 'block';
      resultArea.className = 'quiz-result quiz-result-wrong';
      const matchInfo = _getMatchInfo(userAnswer, dailyBuilding.name);
      const matchPct = matchInfo.correctLen > 0 ? Math.round(matchInfo.correctChars / matchInfo.correctLen * 100) : 0;
      const thresholdPct = Math.round(matchInfo.minInputLen / matchInfo.correctLen * 100);
      resultArea.innerHTML = `
        <div class="quiz-result-icon">❌</div>
        <div class="quiz-result-title">不对哦，再想想！</div>
        <div class="quiz-result-match">
          答案共 <strong>${matchInfo.correctLen}</strong> 字，你输入了 <strong>${matchInfo.inputLen}</strong> 字<br>
          正确 <strong>${matchInfo.correctChars}</strong> 字 · 错误 <strong>${matchInfo.wrongChars}</strong> 字<br>
          当前匹配度 <strong>${matchPct}%</strong>（正确字 ÷ 答案总字数，需 ≥ ${thresholdPct}% 才可匹配）
        </div>`;

      input.value = '';
      input.focus();
    }
  }

  renderHomeQuiz();
}
