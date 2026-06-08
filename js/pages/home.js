/**
 * 首页模块 — 国保猜猜看每日一题
 */
import { HashSearch, State, Utils, UI } from '../core.js';

let _destroyMap = null;

export async function render(container, destroyMapFn) {
  _destroyMap = destroyMapFn;
  if (_destroyMap) _destroyMap();

  const provinceMeta = State.getProvinceMeta();
  const provinceIds = provinceMeta?.provinces?.map(p => p.id) || [];
  if (provinceIds.length === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">暂无题目</div><p>请检查数据</p></div></div>`;
    return;
  }

  container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">❓</div><div>正在加载今日题目...</div></div></div>`;

  // 用日期种子确定性选取一个省份，只加载该省 + 跨省数据（替代原来的全量加载）
  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const selectedId = provinceIds[dateSeed % provinceIds.length];
  await HashSearch.loadProvinces([selectedId, 'cross']);

  let candidates = State.getAllBuildings().filter(b => b.architecture && b.description && b.features && b.history);
  // 极端情况兜底：若该省无合格建筑则加载剩余省份
  if (candidates.length === 0) {
    const remaining = provinceIds.filter(id => id !== selectedId);
    await HashSearch.loadProvinces(remaining);
    candidates = State.getAllBuildings().filter(b => b.architecture && b.description && b.features && b.history);
  }

  if (candidates.length === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">暂无题目</div><p>请检查数据</p></div></div>`;
    return;
  }

  const dailyBuilding = candidates[dateSeed % candidates.length];

  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const sessionKey = `guobao_daily_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  // 从 sessionStorage 恢复状态
  let savedState = null;
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (raw) savedState = JSON.parse(raw);
  } catch (_) {}

  function _saveDailyState(clueIndex, finished, wrongResultHtml) {
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify({ clueIndex, finished, wrongResultHtml: wrongResultHtml || null }));
    } catch (_) {}
  }

  let currentClueIndex = savedState?.clueIndex || 0;
  let quizFinished = savedState?.finished || false;
  let wrongResultHtml = savedState?.wrongResultHtml || null;
  const remainingClues = () => Utils.CLUE_STAGES.length - currentClueIndex - 1;
  const allClues = () => _renderAllClues(dailyBuilding, currentClueIndex);

  function _renderAllClues(building, clueIndex) {
    const clues = [];
    for (let i = 0; i <= clueIndex; i++) {
      const stage = Utils.CLUE_STAGES[i];
      const text = Utils.sanitizeClueText(Utils.getClueText(stage.key, building), building, stage.key);
      const isNewest = i === clueIndex;
      const hasMap = stage.key === 'location' && building.lat && building.lng;
      clues.push({ stage, text, isNewest, index: i + 1, hasMap });
    }
    return clues;
  }

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
          </div>

          <!-- 已揭示的线索列表 -->
          <div class="quiz-clue-list">
            ${clues.map(c => `
              <div class="quiz-clue-card${c.isNewest ? ' quiz-clue-card-newest' : ''}">
                <div class="quiz-clue-content">
                  <p>${c.text}</p>
                  ${c.hasMap ? `<div class="quiz-satellite-map"></div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- 输入区（仅在未完成时显示） -->
          ${quizFinished ? '' : `
          <div class="quiz-input-area">
            ${remainingClues() > 0 ? `
              <button class="quiz-btn quiz-btn-hint" id="dailyQuizMoreHint">
                ${Utils.getHintPrompt(currentClueIndex + 1)}
              </button>` : ''}
            <div class="quiz-input-row">
              <input type="text" class="quiz-input" id="dailyQuizInput" placeholder="输入建筑名称..." autocomplete="off">
              <button class="quiz-btn quiz-btn-submit" id="dailyQuizSubmit">提交答案</button>
            </div>
            <button class="quiz-btn quiz-btn-reveal" id="dailyQuizReveal">💡 猜不出来？直接看答案</button>
          </div>`}

          <!-- 结果区域 -->
          ${quizFinished ? `<div class="quiz-result quiz-result-reveal">
            <div class="quiz-result-icon">💡</div>
            <div class="quiz-result-title">答案揭晓</div>
            <div class="quiz-result-answer">答案：<strong>${dailyBuilding.name}</strong></div>
            <div class="quiz-result-detail">${dailyBuilding.province} · ${dailyBuilding.districtName} · ${dailyBuilding.era}</div>
            <div class="quiz-result-actions">
              <a href="${Utils.generateBuildingHash(dailyBuilding, State.getProvinceName.bind(State))}" class="quiz-btn quiz-btn-outline">查看详情 ↗</a>
              <a href="?page=quiz" class="quiz-btn quiz-btn-outline" data-nav>继续挑战 →</a>
            </div>
          </div>` : wrongResultHtml ? `<div class="quiz-result quiz-result-wrong" id="dailyQuizResult">${wrongResultHtml}</div>` : `<div class="quiz-result" id="dailyQuizResult" style="display:none;"></div>`}
        </div>
      </div>`;

    if (!quizFinished) {
      bindEvents();
    }
    _initHomeSatelliteMap(dailyBuilding);
  }

  function _initHomeSatelliteMap(building) {
    const mapDivs = document.querySelectorAll('.quiz-satellite-map');
    const mapDiv = mapDivs[mapDivs.length - 1];
    UI.createSatelliteMap(mapDiv, building?.lat, building?.lng);
  }

  function _appendHomeClue(index) {
    const clueList = document.querySelector('.quiz-clue-list');
    if (!clueList || !dailyBuilding) return;

    const stage = Utils.CLUE_STAGES[index];
    const text = Utils.sanitizeClueText(Utils.getClueText(stage.key, dailyBuilding), dailyBuilding, stage.key);
    const hasMap = stage.key === 'location' && dailyBuilding.lat && dailyBuilding.lng;

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
    if (hasMap) _initHomeSatelliteMap(dailyBuilding);
  }

  function handleReveal(input, resultArea) {
    quizFinished = true;
    _saveDailyState(currentClueIndex, true);

    resultArea.style.display = 'block';
    resultArea.className = 'quiz-result quiz-result-reveal';
    resultArea.innerHTML = `
      <div class="quiz-result-icon">💡</div>
      <div class="quiz-result-title">答案揭晓</div>
      <div class="quiz-result-answer">答案：<strong>${dailyBuilding.name}</strong></div>
      <div class="quiz-result-detail">${dailyBuilding.province} · ${dailyBuilding.districtName} · ${dailyBuilding.era}</div>
      <div class="quiz-result-actions">
        <a href="${Utils.generateBuildingHash(dailyBuilding, State.getProvinceName.bind(State))}" class="quiz-btn quiz-btn-outline">查看详情 ↗</a>
        <a href="?page=quiz" class="quiz-btn quiz-btn-outline" data-nav>继续挑战 →</a>
      </div>`;

    input.disabled = true;
    document.getElementById('dailyQuizSubmit').disabled = true;
    const hintBtn = document.getElementById('dailyQuizMoreHint');
    if (hintBtn) hintBtn.style.display = 'none';
    const revealBtn = document.getElementById('dailyQuizReveal');
    if (revealBtn) revealBtn.style.display = 'none';
  }

  function bindEvents() {
    const input = document.getElementById('dailyQuizInput');
    const submitBtn = document.getElementById('dailyQuizSubmit');
    const hintBtn = document.getElementById('dailyQuizMoreHint');
    const revealBtn = document.getElementById('dailyQuizReveal');
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
        if (currentClueIndex < Utils.CLUE_STAGES.length - 1) {
          currentClueIndex++;
          _saveDailyState(currentClueIndex, false);
          _appendHomeClue(currentClueIndex);
          const remaining = Utils.CLUE_STAGES.length - currentClueIndex - 1;
          if (remaining > 0) {
            hintBtn.textContent = Utils.getHintPrompt(currentClueIndex + 1);
          } else {
            hintBtn.style.display = 'none';
          }
          const inputEl = document.getElementById('dailyQuizInput');
          if (inputEl) inputEl.focus();
        }
      });
    }

    if (revealBtn) {
      revealBtn.addEventListener('click', () => {
        handleReveal(input, resultArea);
      });
    }
  }

  function handleSubmit(input, resultArea) {
    const userAnswer = input.value.trim();
    if (!userAnswer) return;

    // 清除旧结果，新提交将生成新结果
    wrongResultHtml = null;

    const isCorrect = Utils.checkAnswer(userAnswer, dailyBuilding.name);

    if (isCorrect) {
      quizFinished = true;
      _saveDailyState(currentClueIndex, true, null);

      const coloredChars = userAnswer.split('').map(ch =>
        `<span class="char-correct">${ch}</span>`
      ).join('');

      resultArea.style.display = 'block';
      resultArea.className = 'quiz-result quiz-result-correct';
      resultArea.innerHTML = `
        <div class="quiz-result-icon">✅</div>
        <div class="quiz-result-title">回答正确！太棒了</div>
        <div class="quiz-result-chars">
          <div class="quiz-result-chars-row">${coloredChars}</div>
        </div>
        <div class="quiz-result-answer">答案：<strong>${dailyBuilding.name}</strong></div>
        <div class="quiz-result-detail">${dailyBuilding.province} · ${dailyBuilding.districtName} · ${dailyBuilding.era}</div>
        <div class="quiz-result-actions">
          <a href="${Utils.generateBuildingHash(dailyBuilding, State.getProvinceName.bind(State))}" class="quiz-btn quiz-btn-outline">查看详情 ↗</a>
        <a href="?page=quiz" class="quiz-btn quiz-btn-outline" data-nav>继续挑战 →</a>
      </div>`;

      input.disabled = true;
      document.getElementById('dailyQuizSubmit').disabled = true;
      const hintBtn = document.getElementById('dailyQuizMoreHint');
      if (hintBtn) hintBtn.style.display = 'none';
      const revealBtn = document.getElementById('dailyQuizReveal');
      if (revealBtn) revealBtn.style.display = 'none';
    } else {
      const correctSet = new Set(dailyBuilding.name);
      const coloredChars = userAnswer.split('').map(ch =>
        `<span class="char-${correctSet.has(ch) ? 'correct' : 'wrong'}">${ch}</span>`
      ).join('');

      resultArea.style.display = 'block';
      resultArea.className = 'quiz-result quiz-result-wrong';
      const matchInfo = Utils.getMatchInfo(userAnswer, dailyBuilding.name);
      wrongResultHtml = `
        <div class="quiz-result-icon">❌</div>
        <div class="quiz-result-title">不对哦，再想想！</div>
        <div class="quiz-result-chars">
          <div class="quiz-result-chars-hint">🟢 正确字 · ⚪ 错误/多输的字</div>
          <div class="quiz-result-chars-row">${coloredChars}</div>
        </div>`;
      resultArea.innerHTML = wrongResultHtml;
      _saveDailyState(currentClueIndex, false, wrongResultHtml);

      input.value = '';
      input.focus();
    }
  }

  renderHomeQuiz();
}
