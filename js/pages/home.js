import { HashSearch, State, Utils } from '../core.js';
import { renderAllClues, appendClue, renderClueCardsHTML, initSatelliteMap, disableQuizInputs, correctResultHTML, wrongResultHTML, finalResultHTML } from '../quiz-core.js';

let _dailyCache = null;

async function _loadDaily() {
  if (_dailyCache) return _dailyCache;
  const manifest = await HashSearch.getManifest();
  const data = await HashSearch.loadEncrypted(`/_d/${manifest.p.daily}.dat`);
  if (data?.bs?.length) {
    _dailyCache = data.bs;
  }
  return _dailyCache || [];
}

export async function render(container) {
  container.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">🎯</div><div>正在加载今日题目...</div></div></div>`;

  const today = new Date();
  const dayOfMonth = today.getDate() - 1;
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const sessionKey = `guobao_daily_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  let savedState = null;
  try { const raw = sessionStorage.getItem(sessionKey); if (raw) savedState = JSON.parse(raw); } catch (_) {}

  let currentClueIndex = savedState?.clueIndex || 0;
  let quizFinished = savedState?.finished || false;
  let wrongResultHtml = savedState?.wrongResultHtml || null;

  const dailyBuildings = await _loadDaily();
  if (!dailyBuildings.length) {
    container.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">暂无题目</div></div></div>`;
    return;
  }

  const dailyBuilding = dailyBuildings[dayOfMonth % dailyBuildings.length];

  function saveState() {
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ clueIndex: currentClueIndex, finished: quizFinished, wrongResultHtml: wrongResultHtml || null })); } catch (_) {}
  }

  function getProvinceName() { return dailyBuilding.p || ''; }

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
    hintBtn?.addEventListener('click', async () => {
      if (currentClueIndex < Utils.CLUE_STAGES.length - 1) {
        currentClueIndex++;
        saveState();
        await appendClue(dailyBuilding, currentClueIndex);
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
    if (Utils.checkAnswer(userAnswer, dailyBuilding.n)) {
      quizFinished = true;
      saveState();
      resultArea.style.display = 'block';
      resultArea.className = 'quiz-result quiz-result-correct';
      resultArea.innerHTML = correctResultHTML(dailyBuilding, userAnswer, false, null, getProvinceName);
      disableQuizInputs();
    } else {
      wrongResultHtml = wrongResultHTML(userAnswer, dailyBuilding.n, null);
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
