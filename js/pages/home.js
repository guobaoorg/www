import { HashSearch, State, Utils } from '../core.js';
import { renderAllClues, appendClue, renderClueCardsHTML, initSatelliteMap, disableQuizInputs, correctResultHTML, wrongResultHTML, finalResultHTML } from '../quiz-core.js';

export async function render(container) {
  const provinceMeta = State.getProvinceMeta();
  const provinceIds = provinceMeta?.provinces?.map(p => p.id) || [];
  if (provinceIds.length === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">暂无题目</div><p>请检查数据</p></div></div>`;
    return;
  }

  container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">❓</div><div>正在加载今日题目...</div></div></div>`;

  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const selectedId = provinceIds[dateSeed % provinceIds.length];
  await HashSearch.loadProvinces([selectedId, 'cross']);

  let candidates = State.getAllBuildings().filter(b => b.architecture && b.description && b.features && b.history);
  if (candidates.length === 0) {
    const loadedBefore = HashSearch.getCacheStats().loadedProvinces;
    if (!HashSearch._bgActive) {
      await HashSearch.loadProvinces(provinceIds.filter(id => id !== selectedId && id !== 'cross').slice(0, 5));
    } else {
      await new Promise(resolve => {
        const check = () => {
          if (HashSearch.getCacheStats().loadedProvinces > loadedBefore || !HashSearch._bgActive) resolve();
          else setTimeout(check, 200);
        };
        check();
      });
      State.clearCache();
    }
    candidates = State.getAllBuildings().filter(b => b.architecture && b.description && b.features && b.history);
  }

  if (candidates.length === 0) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">暂无题目</div><p>请检查数据</p></div></div>`;
    return;
  }

  const dailyBuilding = candidates[dateSeed % candidates.length];
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const sessionKey = `guobao_daily_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  let savedState = null;
  try { const raw = sessionStorage.getItem(sessionKey); if (raw) savedState = JSON.parse(raw); } catch (_) {}

  let currentClueIndex = savedState?.clueIndex || 0;
  let quizFinished = savedState?.finished || false;
  let wrongResultHtml = savedState?.wrongResultHtml || null;
  const getProvinceName = State.getProvinceName.bind(State);

  function saveState() {
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ clueIndex: currentClueIndex, finished: quizFinished, wrongResultHtml: wrongResultHtml || null })); } catch (_) {}
  }

  function renderHomeQuiz() {
    const clues = renderAllClues(dailyBuilding, currentClueIndex);
    container.innerHTML = `
      <div class="container">
        <div class="daily-quiz-page">
          <div class="daily-quiz-header">
            <div class="daily-quiz-title">
              <span class="daily-quiz-title-icon">🎯</span>
              <div>
                <h1>国保单位猜猜看 · 每日一题</h1>
                <p class="daily-quiz-date">${dateStr} · 挑战你的国保知识储备</p>
              </div>
            </div>
          </div>
          <div class="quiz-clue-list">${renderClueCardsHTML(clues)}</div>
          ${quizFinished ? '' : `
          <div class="quiz-input-area">
            ${Utils.CLUE_STAGES.length - currentClueIndex - 1 > 0 ? `<button class="quiz-btn quiz-btn-hint" id="dailyQuizMoreHint">${Utils.getHintPrompt(currentClueIndex + 1)}</button>` : ''}
            <div class="quiz-input-row">
              <input type="text" class="quiz-input" id="dailyQuizInput" placeholder="输入建筑名称..." autocomplete="off">
              <button class="quiz-btn quiz-btn-submit" id="dailyQuizSubmit">提交答案</button>
            </div>
            <button class="quiz-btn quiz-btn-reveal" id="dailyQuizReveal">💡 猜不出来？直接看答案</button>
          </div>`}
          ${quizFinished ? `<div class="quiz-result quiz-result-reveal">${finalResultHTML(dailyBuilding, 'reveal', '💡', '答案揭晓', null, getProvinceName)}</div>`
            : wrongResultHtml ? `<div class="quiz-result quiz-result-wrong" id="dailyQuizResult">${wrongResultHtml}</div>`
            : `<div class="quiz-result" id="dailyQuizResult" style="display:none;"></div>`}
        </div>
      </div>`;
    if (!quizFinished) bindEvents();
    initSatelliteMap(dailyBuilding);
  }

  function bindEvents() {
    const input = document.getElementById('dailyQuizInput');
    const submitBtn = document.getElementById('dailyQuizSubmit');
    const hintBtn = document.getElementById('dailyQuizMoreHint');
    const revealBtn = document.getElementById('dailyQuizReveal');
    const resultArea = document.getElementById('dailyQuizResult');

    if (input) input.focus();
    submitBtn?.addEventListener('click', () => handleSubmit(input, resultArea));
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(input, resultArea); });
    hintBtn?.addEventListener('click', () => {
      if (currentClueIndex < Utils.CLUE_STAGES.length - 1) {
        currentClueIndex++;
        saveState();
        appendClue(dailyBuilding, currentClueIndex);
        const remaining = Utils.CLUE_STAGES.length - currentClueIndex - 1;
        if (remaining > 0) hintBtn.textContent = Utils.getHintPrompt(currentClueIndex + 1);
        else hintBtn.style.display = 'none';
        document.getElementById('dailyQuizInput')?.focus();
      }
    });
    revealBtn?.addEventListener('click', () => {
      quizFinished = true;
      saveState();
      resultArea.style.display = 'block';
      resultArea.className = 'quiz-result quiz-result-reveal';
      resultArea.innerHTML = finalResultHTML(dailyBuilding, 'reveal', '💡', '答案揭晓', null, getProvinceName);
      disableQuizInputs();
    });
  }

  function handleSubmit(input, resultArea) {
    const userAnswer = input.value.trim();
    if (!userAnswer) return;
    wrongResultHtml = null;
    if (Utils.checkAnswer(userAnswer, dailyBuilding.name)) {
      quizFinished = true;
      saveState();
      resultArea.style.display = 'block';
      resultArea.className = 'quiz-result quiz-result-correct';
      resultArea.innerHTML = correctResultHTML(dailyBuilding, userAnswer, false, null, getProvinceName);
      disableQuizInputs();
    } else {
      wrongResultHtml = wrongResultHTML(userAnswer, dailyBuilding.name, null);
      resultArea.style.display = 'block';
      resultArea.className = 'quiz-result quiz-result-wrong';
      resultArea.innerHTML = wrongResultHtml;
      saveState();
      input.value = '';
      input.focus();
    }
  }

  renderHomeQuiz();
}
