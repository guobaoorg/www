const _strings = {
  zh: {
    nav: {
      map: '地图', trail: '足迹', provinces: '省份',
      tags: '标签', quiz: '猜保', search: '搜索'
    },
    breadcrumb: {
      home: '🏠 首页', provinces: '🏞️ 省份', tags: '🏷️ 标签',
      search: '🔍 搜索', quiz: '🗝️ 猜保', cross: '🌊 跨省国保',
      trail: '👣 足迹', map: '🗺️ 地图'
    },
    map: {
      allEras: '全部', allCategories: '全部分类', loading: '数据加载中',
      statLoaded: '数据加载中', allEraLabel: '全部年代', allCatLabel: '全部分类',
      cover: '覆盖', provinceShort: '省', tip: '⚠️港澳台为近似坐标',
      mapLoading: '地图加载中...', nearbyGeolocated: '📍 已定位 · 附近国保',
      unknownEra: '年代未知', badgeNationalShort: '全国重点',
      geoLocating: '📍 定位中...',
      geoNeedHttps: '📍 需HTTPS',
      geoNotSupported: '📍 不支持',
      geoDenied: '📍 已拒绝',
      geoNoSignal: '📍 无信号',
      geoTimeout: '📍 超时',
      geoFailed: '📍 定位失败',
      distToggle: '折叠面板'
    },
    common: {
      loading: '正在加载...', loadingIcon: '🔄', noData: '暂无数据', pageNotFound: '页面未找到',
      viewDetail: '查看详情 →', learnMore: '了解更多 ↗', noInfo: '暂无信息',
      loadFailed: '数据加载失败', viewAll: '全文', CN: '中', EN: 'EN', langSwitch: 'English',
      submitting: '提交中...'
    },
    province: {
      title: '省份', count: '处', countUnit: '处', crossTitle: '跨省文物保护单位',
      crossDesc: '以下路线跨越多个省份，点击查看沿途的全国重点文物保护单位。',
      noData: '暂无数据', loading: '正在加载{name}数据...',
      dataOrganizing: '该省份的文物保护单位数据正在整理中',
      districts: '区县', total: '共有', distributed: '分布于', cities: '个市'
    },
    building: {
      notFound: '未找到该建筑', era: '📅', location: '📍',
      badgeWH: '🌍 世界遗产', badgeNational: '全国重点文物保护单位',
    badgeHongkong: '一级历史建筑', badgeMacau: '澳门文物名录', badgeTaiwan: '国定古迹',
      nearby: '附近暂无国保建筑', videos: '相关视频', basicInfo: '基本信息',
      eraLabel: '年代', typeLabel: '类型', districtLabel: '地区',
      levelLabel: '级别', batchLabel: '批次', worldHeritage: '世界遗产',
      sectionDesc: '初见惊鸿・千年开胜迹', sectionHistory: '史海钩沉・百代证沧桑',
      sectionArch: '匠心营造・妙构凝风骨', sectionFeature: '华夏瑰宝・奇珍耀国光',
      sections: '分段信息', tags: '特色标签', disclaimer: '⚠️ 免责声明：内容整理自公开信息，不保证准确完整，仅供学习参考，不构成任何建议。', feedback: '反馈', feedbackTitle: '反馈', feedbackName: '姓名', feedbackEmail: '邮箱', feedbackMessage: '反馈内容', feedbackRequired: '必填', feedbackSubmit: '提交反馈', feedbackClose: '关闭', feedbackThanks: '🙏 感谢您的反馈！', feedbackError: '提交失败，请稍后重试。',
      related: '周边推荐'
    },
    trail: {
      title: '足迹', filterAll: '全部', all: '全', stops: '站', sites: '处国保',
      description: '玩游戏，听故事，走古道，看建筑——全方位的中国国保单位之旅',
      notFound: '足迹未找到', routeNotFound: '路线未找到',
      toc: '目录', viewAll: '全文'
    },
    search: {
      title: '搜索', placeholder: '🔍 搜索文物、年代、类型...', noResults: '未找到相关结果',
      hint: '输入关键词搜索', loadingHint: '国保单位数据正在后台加载，请稍后再试',
      tryOther: '请尝试其他关键词', tips: '💡 搜索提示：',
      found: '找到', relatedBuildings: '处相关国保单位',
      matchName: '名称匹配', matchLocation: '地点匹配', matchEra: '年代匹配',
      matchType: '类型匹配', matchArea: '地区匹配', matchTag: '标签匹配',
      matchDesc: '描述匹配', matchHist: '历史匹配', matchArch: '建筑匹配', matchFeat: '特色匹配'
    },
    quiz: {
      title: '🗝️ 猜保', realm: '境界', correct: '答对', accuracy: '正确率',
      region: '地区', era: '年代', filter: '筛选',
      noMatch: '没有符合条件的国保单位', noMatchHint: '当前筛选条件下无国保单位，请调整地区或年代',
      allAnswered: '所有国保单位已答完，请调整筛选条件或继续答题',
      resetFilter: '重置筛选', placeholder: '输入建筑名称...',
      submit: '提交答案', reveal: '💡 猜不出来？直接看答案', skip: '⏭️ 跳过此题',
      correctTitle: '✅ 回答正确！太棒了', wrongTitle: '❌ 不对哦，再想想！',
      charHint: '🟢 正确字 · ⚪ 错误/多输的字', levelUp: '⬆ 境界提升至', levelDown: '⬇ 境界降至',
      revealed: '答案揭晓', skipped: '已跳过', continue: '继续挑战 →',
      clueStageArch: '建筑风格', clueStageDesc: '特色介绍',
      clueStageFeat: '特色与价值', clueStageHist: '历史背景', clueStageLoc: '地区',
      clueStageEra: '年代', hintPrompt1: '🤔提示？它的建筑风格很特别！',
      hintPrompt2: '🧐没头绪？我来描绘它的特色～',
      hintPrompt3: '🎯再想想？它的特点会有帮助！',
      hintPrompt4: '📖或许答案就在它的故事里：',
      hintPrompt5: '🗺️方向不对？看看它在哪里！',
      hintPrompt6: '⏳最后一击！年代即将揭晓～',
      hintDefault: '💡 让我来帮你！',
      noArch: '暂无建筑风格信息', noDesc: '暂无特色介绍',
      noFeat: '暂无特色与价值信息', noHist: '暂无历史背景信息',
      noLoc: '暂无地区信息', noEra: '暂无信息', noTags: '暂无标签',
      satelliteMarker: '🏛️'
    },
    cross: {
      title: '跨省国保单位',
      description: '跨越多个省份的全国重点文物保护单位路线，每一条都串联起数个省份的文化遗产精华。',
      notSpecified: '未指定路线', routeNotFound: '路线未找到',
      toc: '路线目录', stops: '站', sites: '处国保'
    },
    tag: {
      title: '标签', loading: '正在加载标签数据...', noData: '暂无标签数据',
      other: '其他', count: '个', loadingBuildings: '正在加载相关国保...',
      label: '标签：', noBuildings: '未找到相关国保',
      found: '共找到', relatedBuildings: '处相关国保'
    },
    city: {
      notSpecified: '未指定城市', noData: '该城市暂无数据',
      total: '共有', countUnit: '处'
    },
    meta: {
      description: '国保地图（guobao.org）收录全国34个省级行政区5000+处全国重点文物保护单位（国保单位），涵盖古建筑、古遗址、古墓葬、石窟寺及石刻、近现代重要史迹等八大类别。提供国保查询、GIS地理分布地图、历史文化故事与主题旅行路线，探索中国文化遗产的数字化平台。',
      ogTitle: '国保地图 - 全国重点文物保护单位查询与文化遗产地图',
      ogDesc: '收录34个省级行政区5000+处全国重点文物保护单位，提供国保单位查询、文化地图、历史故事与主题路线。',
      ogLocale: 'zh_CN',
      twitterTitle: '国保地图 - 全国重点文物保护单位查询',
      twitterDesc: '5000+处全国重点文物保护单位的地理分布查询平台',
      pageTitle: '国保地图：全国重点文物保护单位查询与文化遗产地图 guobao.org',
      appleTitle: '国保地图',
      logoText: '国保地图',
      srOnlyText: '国保地图 - 全国重点文物保护单位查询与文化遗产地图',
      footerText: '©<span id="footerYear">{year}</span> 国保地图 guobao.org 开图寻往迹，揽胜阅千秋 · <a href="#" data-open-feedback>反馈</a>',
      pwaTitle: '🐲 添加到主屏幕',
      pwaDesc: '像使用 App 一样访问国保地图',
      pwaDismiss: '暂不',
      pwaInstall: '安装',
      langLabel: 'EN',
      langAria: 'Switch to English'
    }
  },
  en: {
    nav: {
      map: 'Map', trail: 'Trails', provinces: 'Provinces',
      tags: 'Tags', quiz: 'Quiz', search: 'Search'
    },
    breadcrumb: {
      home: '🏠 Home', provinces: '🏞️ Provinces', tags: '🏷️ Tags',
      search: '🔍 Search', quiz: '🗝️ Quiz', cross: '🌊 Cross-Province Sites',
      trail: '👣 Trails', map: '🗺️ Map'
    },
    map: {
      allEras: 'All Eras', allCategories: 'All Categories', loading: 'Loading data',
      statLoaded: 'Loading data', allEraLabel: 'All Eras', allCatLabel: 'All Categories',
      cover: 'Covering', provinceShort: 'prov.',
      tip: '⚠️ HK/Macau/Taiwan are approximate',
      mapLoading: 'Loading map...', nearbyGeolocated: '📍 Located · Nearby Sites',
      unknownEra: 'Unknown era', badgeNationalShort: 'National Key',
      geoLocating: '📍 Locating...',
      geoNeedHttps: '📍 HTTPS Required',
      geoNotSupported: '📍 Not Supported',
      geoDenied: '📍 Permission Denied',
      geoNoSignal: '📍 No Signal',
      geoTimeout: '📍 Timeout',
      geoFailed: '📍 Location Failed',
      distToggle: 'Collapse Panel'
    },
    common: {
      loading: 'Loading...', noData: 'No data', pageNotFound: 'Page Not Found',
      viewDetail: 'View Details →', learnMore: 'Learn More ↗', noInfo: 'No information',
      loadFailed: 'Failed to load data', viewAll: 'View All', CN: '中', EN: 'EN', langSwitch: '中文',
      submitting: 'Submitting...'
    },
    province: {
      title: 'Provinces', count: ' sites', countUnit: ' sites',
      crossTitle: 'Cross-Province Heritage Sites',
      crossDesc: 'The following routes span multiple provinces. Click to explore national heritage sites along the way.',
      noData: 'No data', loading: 'Loading {name} data...',
      dataOrganizing: 'Heritage site data for this province is being organized.',
      districts: ' districts', total: '', distributed: 'across', cities: ' cities'
    },
    building: {
      notFound: 'Building not found', era: '📅', location: '📍',
      badgeWH: '🌍 World Heritage', badgeNational: 'National Protected Site',
    badgeHongkong: 'Grade I Historic Building', badgeMacau: 'Macau Heritage List', badgeTaiwan: 'National Monument',
      nearby: 'No nearby heritage sites', videos: 'Related Videos', basicInfo: 'Basic Info',
      eraLabel: 'Era', typeLabel: 'Type', districtLabel: 'Location',
      levelLabel: 'Level', batchLabel: 'Batch', worldHeritage: 'World Heritage',
      sectionDesc: 'First Glimpse · A Thousand Years of Splendor',
      sectionHistory: 'Echoes of History · Centuries of Witness',
      sectionArch: 'Masterful Craft · Elegance in Structure',
      sectionFeature: 'National Treasure · Wonders of China',
      sections: 'Sections', tags: 'Tags', disclaimer: '⚠️ Disclaimer: Content compiled from public sources. Accuracy not guaranteed. For reference and study only.', feedback: 'Feedback', feedbackTitle: 'Feedback', feedbackName: 'Name', feedbackEmail: 'Email', feedbackMessage: 'Message', feedbackRequired: 'Required', feedbackSubmit: 'Submit', feedbackClose: 'Close', feedbackThanks: '🙏 Thank you for your feedback!', feedbackError: 'Submission failed, please try again later.',
      related: 'Nearby Recommendations'
    },
    trail: {
      title: 'Trails', filterAll: 'All', all: 'All', stops: ' stops', sites: ' sites',
      description: 'Play games, read stories, walk ancient paths, explore architecture — a complete journey through Chinese heritage',
      notFound: 'Trail not found', routeNotFound: 'Route not found',
      toc: 'Contents', viewAll: 'View All'
    },
    search: {
      placeholder: '🔍 Search sites, eras, types...',
      noResults: 'No results found', hint: 'Enter keywords to search',
      loadingHint: 'Building data is loading in the background, please try again later',
      tryOther: 'Please try other keywords', tips: '💡 Search tips:',
      found: 'Found', relatedBuildings: ' matching sites',
      matchName: 'Name match', matchLocation: 'Location match', matchEra: 'Era match',
      matchType: 'Type match', matchArea: 'Area match', matchTag: 'Tag match',
      matchDesc: 'Description match', matchHist: 'History match',
      matchArch: 'Architecture match', matchFeat: 'Feature match'
    },
    quiz: {
      title: '🗝️ Quiz', realm: 'Realm', correct: 'Correct', accuracy: 'Accuracy',
      region: 'Region', era: 'Era', filter: 'Filter',
      noMatch: 'No matching buildings', noMatchHint: 'No buildings match the current filters. Please adjust region or era.',
      allAnswered: 'All buildings have been answered. Adjust filters or continue.',
      resetFilter: 'Reset Filters', placeholder: 'Enter building name...',
      submit: 'Submit', reveal: '💡 Give up? Show answer', skip: '⏭️ Skip',
      correctTitle: '✅ Correct! Great job!', wrongTitle: '❌ Not quite, try again!',
      charHint: '🟢 Correct characters · ⚪ Wrong/extra characters', levelUp: '⬆ Realm advanced to', levelDown: '⬇ Realm dropped to',
      revealed: 'Answer Revealed', skipped: 'Skipped', continue: 'Continue →',
      clueStageArch: 'Architecture', clueStageDesc: 'Description',
      clueStageFeat: 'Features & Value', clueStageHist: 'History',
      clueStageLoc: 'Location', clueStageEra: 'Era',
      hintPrompt1: '🤔Need a hint? Its architecture is special!',
      hintPrompt2: '🧐No idea? Let me describe its features~',
      hintPrompt3: '🎯Think again? Its characteristics help!',
      hintPrompt4: '📖Maybe the answer is in its story:',
      hintPrompt5: '🗺️Wrong direction? Check its location!',
      hintPrompt6: '⏳Final blow! The era is about to be revealed~',
      hintDefault: '💡 Let me help you!',
      noArch: 'No architecture info', noDesc: 'No description',
      noFeat: 'No feature info', noHist: 'No history info',
      noLoc: 'No location info', noEra: 'No info', noTags: 'No tags',
      satelliteMarker: '🏛️'
    },
    cross: {
      title: 'Cross-Province Heritage Sites',
      description: 'National heritage routes spanning multiple provinces, each connecting cultural treasures across regions.',
      notSpecified: 'No route specified', routeNotFound: 'Route not found',
      toc: 'Route Contents', stops: ' stops', sites: ' sites'
    },
    tag: {
      title: 'Tags', loading: 'Loading tags...', noData: 'No tag data',
      other: 'Other', count: '', loadingBuildings: 'Loading related buildings...',
      label: 'Tag: ', noBuildings: 'No related buildings found',
      found: 'Found', relatedBuildings: ' related buildings'
    },
    city: {
      notSpecified: 'No city specified', noData: 'No data for this city',
      total: '', countUnit: ' sites'
    },
    meta: {
      description: 'Guobao Map (guobao.org) features 5000+ National Cultural Heritage Sites across 34 provinces. Explore cultural heritage with GIS maps, historical stories, and themed travel routes.',
      ogTitle: 'Guobao Map - National Cultural Heritage Map of China',
      ogDesc: '5000+ National Heritage Sites across 34 provinces with GIS maps, history stories and travel routes.',
      ogLocale: 'en_US',
      twitterTitle: 'Guobao Map - National Heritage Sites',
      twitterDesc: '5000+ National Cultural Heritage Sites geographic map',
      pageTitle: 'Guobao Map - National Cultural Heritage Sites of China',
      appleTitle: 'Guobao Map',
      logoText: 'Guobao Map',
      srOnlyText: 'Guobao Map - National Cultural Heritage Map',
      footerText: '©<span id="footerYear">{year}</span> Guobao Map guobao.org · Explore China\'s Cultural Heritage · <a href="#" data-open-feedback>Feedback</a>',
      pwaTitle: '🐲 Add to Home Screen',
      pwaDesc: 'Access Guobao Map like an app',
      pwaDismiss: 'Not now',
      pwaInstall: 'Install',
      langLabel: '中',
      langAria: 'Switch to Chinese'
    }
  }
};

let _state = null;

function setState(s) { _state = s; }

function detectLang() {
  // 1. URL 参数优先（显式分享链接）
  const params = new URLSearchParams(window.location.search);
  if (params.get('lang') === 'en') return 'en';
  if (params.get('lang') === 'zh') return 'zh';
  // 2. localStorage 用户偏好
  try {
    const stored = localStorage.getItem('guobao_lang');
    if (stored === 'en' || stored === 'zh') return stored;
  } catch (_) { /* private browsing */ }
  // 3. 浏览器/系统语言自动检测
  try {
    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('en')) return 'en';
  } catch (_) { /* not available */ }
  // 4. 默认中文
  return 'zh';
}

function t(key) {
  if (!_state) return key;
  const lang = _state.lang || 'zh';
  const parts = key.split('.');
  let obj = _strings[lang];
  for (const p of parts) {
    if (!obj || !obj[p]) return key;
    obj = obj[p];
  }
  return obj;
}

function tr(lang, key) {
  const parts = key.split('.');
  let obj = _strings[lang] || _strings.zh;
  for (const p of parts) {
    if (!obj || !obj[p]) return key;
    obj = obj[p];
  }
  return obj;
}

export { setState, detectLang, t, tr };