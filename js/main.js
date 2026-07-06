import { Cache } from './cache.js';
import { Config } from './config.js';
import { State } from './state.js';
import { Router } from './router.js';
import { UI } from './ui.js';
import { t as i18nT, tr } from './i18n.js';

let _currentDestroyMap = null;
let _cachedMain = null;
let _cachedBreadcrumb = null;
const _hideBreadcrumbViews = new Set(['map', 'trail', 'provinces', 'tags', 'quiz', 'search']);

// ==================== PWA Service Worker 注册（渐进增强） ====================
function _registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => {
      // SW 注册成功，静默运行
    }).catch(() => {
      // 注册失败不影响网站核心功能
    });
  });
}

// ==================== PWA 安装提示 ====================
let _installPrompt = null;
function _setupPWAInstall() {
  const banner = document.getElementById('pwaInstallBanner');
  const installBtn = document.getElementById('pwaInstallBtn');
  const dismissBtn = document.getElementById('pwaDismissBtn');
  if (!banner) return;

  // 监听浏览器安装事件
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installPrompt = e;
    // 延迟显示，避免首次加载干扰
    setTimeout(() => banner.classList.add('show'), 3000);
  });

  // 已安装则不显示
  window.addEventListener('appinstalled', () => {
    banner.classList.remove('show');
    _installPrompt = null;
  });

  // 在 standalone 模式下不显示
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  installBtn.addEventListener('click', async () => {
    if (_installPrompt) {
      _installPrompt.prompt();
      await _installPrompt.userChoice;
      _installPrompt = null;
      banner.classList.remove('show');
    }
  });

  dismissBtn.addEventListener('click', () => {
    banner.classList.remove('show');
    // 一天内不再显示
    try { localStorage.setItem('pwa-dismissed', Date.now()); } catch (_) {}
  });

  // 如果之前关闭过，一天内不再显示
  try {
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;
  } catch (_) {}
}

// ==================== 导航遮罩 ====================
function _setupNavBackdrop() {
  const backdrop = document.querySelector('.nav-backdrop');
  const navMenu = document.querySelector('.nav-menu');
  const navToggle = document.querySelector('.nav-toggle');
  if (!backdrop || !navMenu || !navToggle) return;

  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    backdrop.classList.toggle('active');
    document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
  });

  backdrop.addEventListener('click', () => {
    navMenu.classList.remove('active');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  });

  // 点击导航链接后关闭菜单
  navMenu.querySelectorAll('.nav-menu__link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

function _updateStaticText() {
  const lang = State.lang;
  // Update html lang attribute
  document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
  // Update meta tags via i18n
  const setMeta = (selector, attr, key) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, tr(lang, key));
  };
  setMeta('meta[name="description"]', 'content', 'meta.description');
  setMeta('meta[property="og:title"]', 'content', 'meta.ogTitle');
  setMeta('meta[property="og:description"]', 'content', 'meta.ogDesc');
  setMeta('meta[property="og:locale"]', 'content', 'meta.ogLocale');
  setMeta('meta[name="twitter:title"]', 'content', 'meta.twitterTitle');
  setMeta('meta[name="twitter:description"]', 'content', 'meta.twitterDesc');
  setMeta('meta[name="apple-mobile-web-app-title"]', 'content', 'meta.appleTitle');
  // Update canonical URL based on language
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = lang === 'en' ? 'https://guobao.org/?lang=en' : 'https://guobao.org/';
  }
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.setAttribute('content', lang === 'en' ? 'https://guobao.org/?lang=en' : 'https://guobao.org/');
  }
  // Update page title
  document.title = tr(lang, 'meta.pageTitle');
  // Update logo text
  const logoText = document.querySelector('.site-logo__text');
  if (logoText) logoText.textContent = tr(lang, 'meta.logoText');
  // Update sr-only
  const srOnly = document.querySelector('.sr-only');
  if (srOnly) srOnly.textContent = tr(lang, 'meta.srOnlyText');
  // Update footer
  const footerDesc = document.querySelector('.site-footer__inner p');
  if (footerDesc) {
    const year = document.getElementById('footerYear')?.textContent || '2026';
    footerDesc.innerHTML = tr(lang, 'meta.footerText').replace('{year}', year);
  }
  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = tr(lang, key);
    if (translated && translated !== key) el.textContent = translated;
  });
  // Update PWA banner text
  const pwaTitle = document.querySelector('.pwa-install-banner-title');
  if (pwaTitle) pwaTitle.textContent = tr(lang, 'meta.pwaTitle');
  const pwaDesc = document.querySelectorAll('.pwa-install-banner-text div');
  if (pwaDesc.length > 1) pwaDesc[1].textContent = tr(lang, 'meta.pwaDesc');
  const pwaDismiss = document.getElementById('pwaDismissBtn');
  if (pwaDismiss) pwaDismiss.textContent = tr(lang, 'meta.pwaDismiss');
  const pwaInstall = document.getElementById('pwaInstallBtn');
  if (pwaInstall) pwaInstall.textContent = tr(lang, 'meta.pwaInstall');
}

// ==================== 反馈弹窗 ====================
function _setupFeedbackModal() {
  const modal = document.getElementById('feedbackModal');
  if (!modal) return;

  document.addEventListener('click', (e) => {
    // 打开反馈弹窗
    const openBtn = e.target.closest('[data-open-feedback]');
    if (openBtn) {
      e.preventDefault();
      _resetFeedbackForm();
      modal.classList.add('active');
      return;
    }
    // 关闭反馈弹窗
    const closeBtn = e.target.closest('[data-close-feedback]');
    if (closeBtn) {
      modal.classList.remove('active');
      return;
    }
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });

  // 表单提交（no-cors 模式，兼容第三方服务 CORS 限制）
  const form = document.getElementById('feedbackForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('.feedback-form__submit');
      const formData = new FormData(form);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = tr(State.lang, 'common.submitting') || '提交中...';
      }
      const successEl = document.getElementById('feedbackSuccess');

      try {
        await fetch(form.action, {
          method: 'POST',
          body: formData,
          mode: 'no-cors'
        });
        console.log('[Feedback] 反馈已提交');
        form.style.display = 'none';
        if (successEl) {
          successEl.style.display = 'block';
          const msg = tr(State.lang, 'building.feedbackThanks');
          if (msg && msg !== 'building.feedbackThanks') successEl.textContent = msg;
          // Scroll to show result
          const modalContent = document.querySelector('.feedback-modal__content');
          if (modalContent) modalContent.scrollTop = 0;
        }
        setTimeout(() => {
          modal.classList.remove('active');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = tr(State.lang, 'building.feedbackSubmit');
          }
        }, 1500);
      } catch (err) {
        console.error('[Feedback] 提交失败:', err);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = tr(State.lang, 'building.feedbackSubmit');
        }
        if (successEl) {
          successEl.style.display = 'block';
          const msg = tr(State.lang, 'building.feedbackError');
          if (msg && msg !== 'building.feedbackError') successEl.textContent = msg;
          else successEl.textContent = '提交失败，请稍后重试';
          // Scroll to show result
          const modalContent = document.querySelector('.feedback-modal__content');
          if (modalContent) modalContent.scrollTop = 0;
        }
      }
    });
  }
}

function _resetFeedbackForm() {
  const form = document.getElementById('feedbackForm');
  const success = document.getElementById('feedbackSuccess');
  if (form) { form.style.display = ''; form.reset(); }
  if (success) success.style.display = 'none';
  const btn = document.querySelector('.feedback-form__submit');
  if (btn) btn.textContent = tr(State.lang, 'building.feedbackSubmit');
  // Scroll modal content to top
  const modalContent = document.querySelector('.feedback-modal__content');
  if (modalContent) modalContent.scrollTop = 0;
}

let _langSwitching = false;
function _setupLangSwitch() {
  const btn = document.querySelector('.lang-toggle');
  if (!btn) return;
  const updateBtn = () => {
    btn.textContent = tr(State.lang, 'meta.langLabel');
    btn.setAttribute('aria-label', tr(State.lang, 'meta.langAria'));
  };
  updateBtn();
  btn.addEventListener('click', async () => {
    if (_langSwitching) return;
    _langSwitching = true;
    btn.disabled = true;
    try {
      const newLang = State.lang === 'en' ? 'zh' : 'en';
      const curUrl = new URL(window.location.href);
      if (newLang === 'en') {
        curUrl.searchParams.set('lang', 'en');
      } else {
        curUrl.searchParams.delete('lang');
      }
      window.history.pushState({}, '', curUrl.pathname + curUrl.search);
      await State.switchLang(newLang);
      updateBtn();
      _updateStaticText();
      window.dispatchEvent(new CustomEvent('route-change'));
    } finally {
      btn.disabled = false;
      _langSwitching = false;
    }
  });
}

async function init() {
  UI.setupTheme();
  State.initI18n();
  _setupLangSwitch();
  _registerSW();
  _setupPWAInstall();
  _setupNavBackdrop();
  _setupFeedbackModal();
  UI.setupEventListeners((url) => Router.navigateTo(url));
  _cachedMain = document.getElementById('mainContent');
  _cachedBreadcrumb = document.querySelector('.breadcrumb');
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  // GitHub Pages 404 SPA 回退：恢复被重定向的原始 URL
  const redirect = sessionStorage.getItem('gh-pages-redirect');
  if (redirect) {
    sessionStorage.removeItem('gh-pages-redirect');
    window.history.replaceState(null, '', redirect);
  }

  Router.parseParams();
  // Update static text AFTER URL restoration and language detection
  try { _updateStaticText(); } catch (e) { }
  window.addEventListener('route-change', async () => {
    try {
      const parsed = Router.parseParams();
      if (parsed.langChanged && !_langSwitching) {
        await State.switchLang(State.lang);
        _updateStaticText();
        const langBtn = document.querySelector('.lang-toggle');
        if (langBtn) {
          langBtn.textContent = tr(State.lang, 'meta.langLabel');
          langBtn.setAttribute('aria-label', tr(State.lang, 'meta.langAria'));
        }
      }
      await renderPage();
    } catch (e) {
      console.error('Route change failed:', e);
      if (_cachedMain) {
        _cachedMain.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div></div></div>`;
      }
    }
  });
  await State.initMeta();
  try {
    await renderPage();
  } catch (e) {
    if (_cachedMain) {
      _cachedMain.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div></div></div>`;
    }
  }
  if (State.currentView === 'map') startBgPreload();
}

function startBgPreload() {
  const meta = State.getProvinceMeta();
  if (!meta?.provinces) return;
  const provinceIds = meta.provinces.map(p => p.id);
  // Start background preloads sorted by file size (smallest first to fill cache quickly)
  const sorted = Config.getSortedProvinceIds(provinceIds);
  const trailFiles = (State.getTrailRegistry() || []).map(t => t.fileName).filter(Boolean);
  Cache.startBgPreload(sorted, trailFiles, State.lang, () => State._resetDerivedCaches());
}

async function renderPage() {
  const mainContent = _cachedMain;
  const breadcrumb = _cachedBreadcrumb;
  const view = State.currentView;
  if (!mainContent) return;

  const hide = _hideBreadcrumbViews.has(view);
  if (breadcrumb) breadcrumb.style.display = hide ? 'none' : '';
  mainContent.style.paddingTop = (hide && view !== 'map') ? 'calc(var(--header-height) + 8px)' : '';

  window.scrollTo(0, 0);

  if (_currentDestroyMap) {
    try {
      _currentDestroyMap();
    } catch (e) {
      console.warn('Failed to destroy map:', e);
    }
    _currentDestroyMap = null;
  }

  mainContent.innerHTML = `<div class="container"><div class="loading"><div class="loading__icon">${i18nT('common.loadingIcon')}</div><div>${i18nT('common.loading')}</div></div></div>`;
  const pageModule = await Router.loadPageModule(view);

  if (pageModule) {
    const destroyMapFn = (fn) => { _currentDestroyMap = fn; };
    try {
      await pageModule.render(mainContent, destroyMapFn);
    } catch (e) {
      mainContent.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${i18nT('common.loadFailed')}</div></div></div>`;
    }
  } else {
    mainContent.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🏛️</div><div class="empty-state-title">${i18nT('common.pageNotFound')}</div></div></div>`;
  }

  UI.updateActiveNav();
  if (!hide) UI.injectStructuredData();

  if (view === 'map' && !Cache.isBgActive()) startBgPreload();
}

document.addEventListener('DOMContentLoaded', init);
