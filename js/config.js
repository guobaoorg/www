/**
 * 应用配置 — 省份样式、标签样式、年代、建筑分类等
 */

const Config = {
  provinceStyles: {
    'beijing': { icon: '⛩️', color: '#e74c3c', bgColor: '#fdf2f2' },
    'tianjin': { icon: '⚓', color: '#3498db', bgColor: '#ebf5fb' },
    'hebei': { icon: '🏔️', color: '#2ecc71', bgColor: '#eafaf1' },
    'shanxi': { icon: '🏛️', color: '#9b59b6', bgColor: '#f5eef8' },
    'neimenggu': { icon: '🌿', color: '#1abc9c', bgColor: '#e8f8f5' },
    'liaoning': { icon: '⚙️', color: '#34495e', bgColor: '#f2f4f6' },
    'jilin': { icon: '🌲', color: '#16a085', bgColor: '#e8f6f3' },
    'heilongjiang': { icon: '❄️', color: '#2980b9', bgColor: '#eaf2f8' },
    'shanghai': { icon: '🌆', color: '#e67e22', bgColor: '#fef5e7' },
    'jiangsu': { icon: '🌊', color: '#3498db', bgColor: '#ebf5fb' },
    'zhejiang': { icon: '🏞️', color: '#27ae60', bgColor: '#eafaf1' },
    'anhui': { icon: '📜', color: '#8e44ad', bgColor: '#f5eef8' },
    'fujian': { icon: '🏝️', color: '#d35400', bgColor: '#fdf2e9' },
    'jiangxi': { icon: '🌸', color: '#c0392b', bgColor: '#fdedec' },
    'shandong': { icon: '🌅', color: '#2980b9', bgColor: '#eaf2f8' },
    'henan': { icon: '🏺', color: '#f39c12', bgColor: '#fef9e7' },
    'hubei': { icon: '🌉', color: '#e74c3c', bgColor: '#fdf2f2' },
    'hunan': { icon: '🌶️', color: '#16a085', bgColor: '#e8f6f3' },
    'guangdong': { icon: '🌺', color: '#e67e22', bgColor: '#fef5e7' },
    'guangxi': { icon: '🌴', color: '#27ae60', bgColor: '#eafaf1' },
    'hainan': { icon: '🥥', color: '#2ecc71', bgColor: '#eafaf1' },
    'chongqing': { icon: '🍲', color: '#9b59b6', bgColor: '#f5eef8' },
    'sichuan': { icon: '🐼', color: '#34495e', bgColor: '#f2f4f6' },
    'guizhou': { icon: '🌁', color: '#1abc9c', bgColor: '#e8f8f5' },
    'yunnan': { icon: '🦚', color: '#e74c3c', bgColor: '#fdf2f2' },
    'xizang': { icon: '🏔️', color: '#3498db', bgColor: '#ebf5fb' },
    'shaanxi': { icon: '🐴', color: '#8e44ad', bgColor: '#f5eef8' },
    'gansu': { icon: '🏜️', color: '#f39c12', bgColor: '#fef9e7' },
    'qinghai': { icon: '💧', color: '#2980b9', bgColor: '#eaf2f8' },
    'ningxia': { icon: '🌾', color: '#27ae60', bgColor: '#eafaf1' },
    'xinjiang': { icon: '🍇', color: '#9b59b6', bgColor: '#f5eef8' },
    'taiwan': { icon: '🏝️', color: '#e67e22', bgColor: '#fef5e7' },
    'hongkong': { icon: '🌃', color: '#34495e', bgColor: '#f2f4f6' },
    'macau': { icon: '🎰', color: '#c0392b', bgColor: '#fdedec' },
    'cross': { icon: '🗺️', color: '#16a085', bgColor: '#e8f6f3' }
  },

  colorPalette: [
    { color: '#B22222', bg: '#FDF2F2' },
    { color: '#8B4513', bg: '#FDF8F3' },
    { color: '#2F4F4F', bg: '#F0F5F5' },
    { color: '#1E3A5F', bg: '#F0F4F8' },
    { color: '#DAA520', bg: '#FDF9F0' },
    { color: '#708090', bg: '#F5F5F7' }
  ],

  tagStyles: {
    '古建筑': { icon: '🏛️' }, '古遗址': { icon: '🏺' }, '古城遗址': { icon: '🏚️' },
    '古墓葬': { icon: '⚰️' }, '陵墓': { icon: '🪦' }, '名人墓': { icon: '👤' }, '壁画墓': { icon: '🎨' },
    '石窟寺': { icon: '🪨' }, '石刻': { icon: '🗿' }, '造像': { icon: '🙏' }, '碑刻': { icon: '📜' },
    '经幢': { icon: '🗼' }, '彩塑': { icon: '🤲' }, '雕塑': { icon: '🗽' }, '壁画': { icon: '🖼️' },
    '岩画': { icon: '🪨' }, '佛教艺术': { icon: '☸️' },
    '佛教寺院': { icon: '🛕' }, '塔': { icon: '🗼' }, '藏传佛教': { icon: '🪷' },
    '道教建筑': { icon: '☯️' }, '教堂': { icon: '⛪' }, '清真寺': { icon: '🕌' },
    '祭坛': { icon: '🕯️' }, '关帝庙': { icon: '⚔️' }, '城隍庙': { icon: '🏛️' },
    '妈祖庙': { icon: '🌊' }, '文昌阁': { icon: '⭐' },
    '革命遗址': { icon: '🚩' }, '红色旅游': { icon: '⭐' },
    '近现代史迹': { icon: '🏛️' }, '中西合璧': { icon: '🤝' }, '纪念建筑': { icon: '🗽' },
    '博物馆': { icon: '🏛️' }, '名人故居': { icon: '🏠' },
    '军事遗址': { icon: '⚔️' }, '关隘': { icon: '🏔️' }, '长城': { icon: '🐉' },
    '城墙': { icon: '🧱' }, '烽燧': { icon: '🔥' }, '炮台': { icon: '💣' },
    '工业遗产': { icon: '🏭' }, '桥梁': { icon: '🌉' }, '水利工程': { icon: '💧' },
    '运河': { icon: '🌊' }, '码头': { icon: '⚓' }, '天文': { icon: '🔭' },
    '驿站': { icon: '📮' }, '栈道': { icon: '🪜' },
    '宫殿': { icon: '👑' }, '园林': { icon: '🌿' }, '衙署': { icon: '⚖️' },
    '民居': { icon: '🏘️' }, '会馆': { icon: '🏤' }, '书院': { icon: '📚' },
    '祠堂': { icon: '👪' }, '文庙': { icon: '🎓' }, '牌坊': { icon: '⛩️' },
    '四合院': { icon: '🏚️' }, '古村落': { icon: '🏡' }, '历史文化街区': { icon: '🏙️' },
    '戏台': { icon: '🎭' }, '影壁': { icon: '🧱' }, '钟鼓楼': { icon: '🥁' },
    '窑址': { icon: '🔥' }, '农业遗产': { icon: '🌾' }, '活态遗产': { icon: '🔄' },
    '文化景观': { icon: '🌄' }, '世界遗产': { icon: '🌟' }, '自然遗产': { icon: '🌲' },
    '丝绸之路': { icon: '🐪' }, '澳门历史城区': { icon: '🏛️' },
    '徽派建筑': { icon: '🏘️' }, '晋商建筑': { icon: '💰' }, '岭南建筑': { icon: '🏠' },
    '闽南建筑': { icon: '🏡' }, '客家建筑': { icon: '🏘️' }, '土楼': { icon: '🟤' },
    '窑洞': { icon: '🕳️' }, '碉楼': { icon: '🗼' }, '蒙古包': { icon: '⛺' },
    '傣族建筑': { icon: '🏠' }, '侗族建筑': { icon: '🏘️' }, '苗族建筑': { icon: '🏠' },
    '藏式建筑': { icon: '🏔️' }, '古井': { icon: '🕳️' }, '古树名木': { icon: '🌳' },
    '龙山文化': { icon: '🏺' }, '仰韶文化': { icon: '🏺' }, '大汶口文化': { icon: '🏺' },
    '良渚文化': { icon: '🏺' }, '红山文化': { icon: '🏺' }, '马家窑文化': { icon: '🏺' },
    '齐家文化': { icon: '🏺' }, '河姆渡文化': { icon: '🏺' },
    '彝族建筑': { icon: '🏠' }, '土家族建筑': { icon: '🏠' },
    '维吾尔族建筑': { icon: '🏠' }, '回族建筑': { icon: '🏠' },
    '白族建筑': { icon: '🏠' }, '纳西族建筑': { icon: '🏠' },
    '龙王庙': { icon: '🐉' }, '岳王庙': { icon: '⚔️' }, '禹王庙': { icon: '💧' },
    '东岳庙': { icon: '⛰️' }, '真武庙': { icon: '⭐' },
    '古建筑群': { icon: '🏘️' }, '古塔': { icon: '🗼' }, '古寺': { icon: '🛕' },
    '古桥': { icon: '🌉' }, '古墓': { icon: '⚰️' }, '古街': { icon: '🏙️' },
    '古战场': { icon: '⚔️' }, '古城': { icon: '🏚️' }, '古庙': { icon: '🛕' },
    '古亭': { icon: '⛩️' }, '古楼': { icon: '🏯' }, '古宅': { icon: '🏚️' },
    '大自然': { icon: '🌿' }, '海洋': { icon: '🌊' }, '河流': { icon: '💧' },
    '岛屿': { icon: '🏝️' }, '山川': { icon: '⛰️' }, '森林': { icon: '🌲' },
    '湖泊': { icon: '🏞️' }, '岛屿海岸': { icon: '🏖️' },
  },

  // 标签分类（用于标签页分组展示）
  // 所有标签均通过精确匹配归入对应分类，避免关键词误匹配
  tagCategories: [
    {
      id: 'building', icon: '🏛️', name: '古建筑·形制',
      tags: [
        '别墅', '仓储建筑', '仓储', '藏书楼', '城堡', '城堡建筑', '祠堂', '村屋',
        '当铺建筑', '碉楼', '防御建筑', '干栏式建筑', '公共建筑', '公馆', '宫殿', '古建筑',
        '古村落', '古树名木', '古城', '古刹', '鼓楼', '官宦宅邸', '官宅', '会馆',
        '建筑', '建筑艺术', '魁星阁', '拉萨老城', '历史文化街区', '历史街区', '历史文化名城', '楼阁',
        '门楼', '民居', '牌坊', '牌坊建筑', '牌楼', '骑楼', '山地建筑', '书院',
        '围屋', '文庙', '无梁殿', '戏台', '戏曲舞台', '悬空建筑', '衙署', '洋房',
        '窑洞', '要塞', '园林', '钟楼', '钟鼓楼', '庄园'
      ]
    },
    {
      id: 'structure', icon: '🏗️', name: '建筑·构造',
      tags: [
        '八角形', '匾额', '彩绘', '彩塑', '穿斗式', '雕塑', '雕刻艺术', '斗拱',
        '多进院落', '飞檐', '汉白玉', '夯土', '回廊', '琉璃瓦', '琉璃艺术', '六角形',
        '楼阁式', '密檐式', '木构建筑', '木雕', '泥塑', '青砖', '穹顶', '三重檐',
        '石构建筑', '石雕', '石雕艺术', '石阙', '石构墓葬', '榫卯结构', '庑殿顶', '歇山顶',
        '须弥座', '悬山顶', '月台', '藻井', '重檐', '竹', '砖木结构', '砖石结构',
        '砖雕'
      ]
    },
    {
      id: 'style', icon: '🎨', name: '建筑·风格',
      tags: [
        '巴洛克风格', '德式建筑', '俄式建筑', '法式建筑', '赣派民居', '哥特式建筑', '官式建筑', '华侨建筑',
        '皇家建筑', '徽派建筑', '近代建筑', '客家建筑', '岭南建筑', '罗马式建筑', '欧式建筑', '葡式建筑',
        '日治时期建筑', '日式', '苏式', '土司建筑', '西式建筑', '现代建筑', '现代主义建筑', '异域风格',
        '英式建筑', '折衷主义', '殖民建筑', '殖民历史', '中西合璧', '中西文化交流'
      ]
    },
    {
      id: 'religion', icon: '☸️', name: '宗教建筑',
      tags: [
        '藏传佛教', '大佛', '道教建筑', '道教', '佛教寺院', '佛教遗址', '佛教石刻', '佛教艺术',
        '佛塔', '格鲁派', '观音', '汉传佛教', '教堂', '庙宇', '南传佛教', '儒释道',
        '儒家建筑', '儒学建筑', '三教合一', '舍利塔', '圣母', '石窟寺', '石窟', '寺庙园林',
        '伊斯兰建筑', '宗教建筑', '宗教活动场所'
      ]
    },
    {
      id: 'temple', icon: '🕯️', name: '坛庙祠堂',
      tags: [
        '城隍庙', '东岳庙', '二仙', '封建礼制', '关帝庙', '祭坛', '祭祀遗址', '礼制',
        '龙王庙', '龙王', '妈祖', '土地庙', '武庙之冠'
      ]
    },
    {
      id: 'grotto', icon: '🪨', name: '石窟石刻',
      tags: [
        '碑刻', '北魏石刻', '北魏石窟', '壁画', '壁画艺术', '壁画墓', '画像石', '画像砖',
        '纪念碑', '经幢', '摩崖石刻', '石刻', '题刻', '岩画', '造像'
      ]
    },
    {
      id: 'archaeology', icon: '🏺', name: '考古遗址',
      tags: [
        '安州', '百年百大考古发现', '北辛文化', '贝丘遗址', '贝丘', '边疆考古', '彩陶', '城墙遗址',
        '城垣建筑', '楚国', '楚汉', '楚文化', '大遗址', '大汶口文化', '稻作', '稻作农业',
        '地域文化', '洞穴遗址', '洞穴', '都城遗址', '都城', '二里头文化', '古遗址', '古生物',
        '古人类', '古滇国', '古蜀文明', '广西考古', '龟兹文化', '海洋考古', '红山文化', '简牍',
        '旧石器时代', '巨石文化', '聚落遗址', '聚落', '郡治', '考古', '考古文化', '考古圣地',
        '考古重大发现', '考古新发现', '考古学文化命名地', '良渚文化', '龙山文化', '龙山', '马家窑文化', '马家窑',
        '马家浜文化', '命名地', '女真', '齐家文化', '青铜文化', '青铜', '青瓷', '屈家岭文化',
        '屈家岭', '人类起源', '丧葬文化', '山城遗址', '商代', '十大考古新发现', '石家河文化', '史前',
        '世界文化遗产预备', '崧泽文化', '陶瓷', '铜柱', '吴国', '吴越', '西团山文化', '西域',
        '新石器时代', '玄菟郡', '仰韶文化', '仰韶', '窑址', '岳石文化'
      ]
    },
    {
      id: 'tomb', icon: '⚰️', name: '古墓葬',
      tags: [
        '北朝墓葬', '楚墓', '地宫', '帝王陵', '干尸', '古墓葬', '陵墓', '名人墓',
        '墓葬', '墓群', '墓志', '少数民族墓葬', '崖墓'
      ]
    },
    {
      id: 'military', icon: '⚔️', name: '军事防御',
      tags: [
        '边境', '城墙', '烽燧', '关隘', '海防', '海防建筑', '红军旧址', '警示遗址',
        '军事遗址', '军事要塞', '军事', '抗战纪念', '抗倭', '抗战', '炮台', '侵华罪证',
        '屯垦', '威海卫', '长城'
      ]
    },
    {
      id: 'modern', icon: '🚩', name: '近现代史迹',
      tags: [
        '博物馆', '革命遗址', '工业遗产', '工业', '海关建筑', '海关', '红色旅游', '红色',
        '红军长征', '会议旧址', '近现代史迹', '抗战时期', '矿业遗址', '烈士陵园', '领事馆建筑', '名人故居',
        '名人纪念建筑', '省委、省苏', '使馆建筑', '孙中山', '铁路遗产', '伪满', '租界'
      ]
    },
    {
      id: 'transport', icon: '🌉', name: '交通水利',
      tags: [
        '大运河', '灯塔', '交通设施', '交通遗址', '码头', '木拱桥', '桥梁', '水利工程',
        '水利', '驿道', '驿站', '运河', '运盐通道'
      ]
    },
    {
      id: 'heritage', icon: '🌟', name: '文化遗产',
      tags: [
        '澳门历史城区', '海岛', '活态遗产', '农业遗产', '世界遗产', '世界遗产预备', '丝绸之路', '文化景观',
        '长江'
      ]
    },
    {
      id: 'craft', icon: '🎭', name: '工艺非遗',
      tags: [
        '非遗', '工艺', '科举', '科举建筑', '老字号', '酿酒', '票号', '商业',
        '书法', '图腾', '武术', '盐业', '盐井', '艺术', '音乐'
      ]
    },
    {
      id: 'ethnic', icon: '🏘️', name: '民族地域',
      tags: [
        '藏族文化', '藏族民居', '侗族建筑', '多民族', '客家', '蒙古族', '苗族', '民族团结',
        '民族英雄', '侨乡', '少数民族', '土家族建筑', '游牧', '游牧民族', '壮族'
      ]
    },
    {
      id: 'culture', icon: '📚', name: '文化科教',
      tags: [
        '朝鲜半岛', '慈善', '大学校园', '家族', '家族历史', '教育', '教育史', '教会学校',
        '堪舆', '科学研究', '科研机构', '历史事件', '两岸交流', '名人', '名校', '儒学',
        '儒家文化', '图书馆', '文人', '行政中心', '医疗', '中外交流'
      ]
    }
  ],

  // 关键词匹配规则（仅用于完全未知的新标签的兜底分类）
  tagCategoryKeywords: {
    'building': ['殿', '阁', '楼', '亭', '村', '坊', '井'],
    'structure': ['斗栱', '檐', '顶', '角', '院落', '彩画', '瓦', '脊'],
    'style': ['派', '主义', '折衷', '洛可可', '古典'],
    'religion': ['佛', '禅', '寺', '伊斯兰', '天主', '基督', '清真', '藏传', '格鲁'],
    'temple': ['庙', '祠', '坛', '祭', '祀'],
    'grotto': ['窟', '摩崖', '经幢', '龛', '造像'],
    'archaeology': ['文化', '遗址', '考古', '窑', '石器', '新石器', '旧石器'],
    'tomb': ['墓', '陵', '葬', '坟', '冢'],
    'military': ['军', '战', '兵', '炮', '防', '烽', '罪证', '警示'],
    'modern': ['革命', '红军', '红色', '近代', '工业', '殖民', '租界', '抗日'],
    'transport': ['桥', '运河', '渡', '驿', '码头', '水利', '灌溉'],
    'heritage': ['遗产', '丝绸之路', '活态', '线性'],
    'craft': ['瓷', '窑', '陶', '酒', '盐', '票', '书法', '雕'],
    'ethnic': ['民族', '少数', '藏族', '蒙古', '苗族', '壮族', '维吾尔', '彝族', '白族', '纳西', '侗族', '瑶族', '土家', '羌族', '回族', '傣族'],
    'culture': ['教育', '学校', '大学', '学院', '科研', '图书', '医疗', '慈善']
  },

  // 查找标签所属分类
  // 1. 优先精确匹配
  // 2. 回退关键词匹配
  getTagCategory(tagName) {
    // 精确匹配
    for (const cat of this.tagCategories) {
      if (cat.tags.includes(tagName)) return cat;
    }
    // 关键词匹配（按顺序）
    for (const [catId, keywords] of Object.entries(this.tagCategoryKeywords)) {
      for (const kw of keywords) {
        if (tagName.includes(kw)) {
          return this.tagCategories.find(c => c.id === catId) || null;
        }
      }
    }
    return null;
  },

  buildingCategories: {
    ancient: {
      label: '古建筑', key: 'ancient', icon: '🏛️',
      color: '#8B0000', bgColor: '#FFF0F0', markerColor: '#C0392B', size: 20,
      matchTypes: ['古建筑']
    },
    ruins: {
      label: '古遗址', key: 'ruins', icon: '🏺',
      color: '#CD853F', bgColor: '#FFF8F0', markerColor: '#D2691E', size: 20,
      matchTypes: ['古遗址']
    },
    tomb: {
      label: '古墓葬', key: 'tomb', icon: '⚰️',
      color: '#708090', bgColor: '#F5F5F5', markerColor: '#5F6B7A', size: 20,
      matchTypes: ['古墓葬']
    },
    grotto: {
      label: '石窟寺及石刻', key: 'grotto', icon: '🧘',
      color: '#9370DB', bgColor: '#F5F0FF', markerColor: '#7B68EE', size: 20,
      matchTypes: ['石窟寺及石刻']
    },
    modern: {
      label: '近现代重要史迹及代表性建筑', key: 'modern', icon: '🏛️',
      color: '#4169E1', bgColor: '#F0F5FF', markerColor: '#2E5CB8', size: 20,
      matchTypes: ['近现代重要史迹及代表性建筑']
    },
    other: {
      label: '其他', key: 'other', icon: '📍',
      color: '#3498DB', bgColor: '#F0F8FF', markerColor: '#2980B9', size: 20,
      matchTypes: ['其他', '']
    }
  },

  eras: [
    { id: 'paleolithic', name: '旧石器', keywords: ['旧石器', '更新世', '古脊椎'], yearMin: -Infinity, yearMax: -10000 },
    { id: 'neolithic', name: '新石器', keywords: ['新石器', '龙山文化'], yearMin: -10000, yearMax: -2000 },
    { id: 'xia', name: '夏', keywords: ['夏代', '夏朝', '夏', '上古'], yearMin: -2070, yearMax: -1600 },
    { id: 'shang', name: '商', keywords: ['商代', '商朝', '商', '青铜时代', '殷'], yearMin: -1600, yearMax: -1046 },
    { id: 'western_zhou', name: '西周', keywords: ['西周'], yearMin: -1046, yearMax: -771 },
    { id: 'eastern_zhou', name: '东周', keywords: ['东周'], yearMin: -770, yearMax: -256, timeline: false },
    { id: 'spring_autumn', name: '春秋', keywords: ['春秋'], yearMin: -770, yearMax: -476 },
    { id: 'warring_states', name: '战国', keywords: ['战国'], yearMin: -475, yearMax: -221 },
    { id: 'zhou', name: '周', keywords: ['周代', '周朝', '周'], yearMin: -1046, yearMax: -256, timeline: false },
    { id: 'qin', name: '秦', keywords: ['秦代', '秦朝', '秦汉', '秦'], yearMin: -221, yearMax: -207 },
    { id: 'western_han', name: '西汉', keywords: ['西汉'], yearMin: -202, yearMax: 9 },
    { id: 'eastern_han', name: '东汉', keywords: ['东汉'], yearMin: 25, yearMax: 220 },
    { id: 'han', name: '汉', keywords: ['汉代', '汉朝', '汉'], yearMin: -202, yearMax: 220, timeline: false },
    { id: 'three_kingdoms', name: '三国', keywords: ['三国', '曹魏'], yearMin: 220, yearMax: 280 },
    { id: 'western_jin', name: '西晋', keywords: ['西晋'], yearMin: 265, yearMax: 316 },
    { id: 'eastern_jin', name: '东晋', keywords: ['东晋'], yearMin: 317, yearMax: 420 },
    { id: 'jin', name: '晋', keywords: ['晋代', '晋朝', '晋'], yearMin: 265, yearMax: 420, timeline: false },
    { id: 'sixteen_kingdoms', name: '十六国', keywords: ['十六国', '后赵'], yearMin: 304, yearMax: 439 },
    { id: 'northern_southern', name: '南北朝', keywords: ['南北朝', '北魏', '东魏', '西魏', '北齐', '北周', '北燕', '北朝', '南朝'], yearMin: 420, yearMax: 589 },
    { id: 'sui', name: '隋', keywords: ['隋代', '隋朝', '隋'], yearMin: 581, yearMax: 618 },
    { id: 'tang', name: '唐', keywords: ['唐代', '唐朝', '唐', '高句丽', '渤海', '南诏'], yearMin: 618, yearMax: 907 },
    { id: 'five_dynasties', name: '五代', keywords: ['五代', '南唐', '后周'], yearMin: 907, yearMax: 960 },
    { id: 'northern_song', name: '北宋', keywords: ['北宋'], yearMin: 960, yearMax: 1127 },
    { id: 'southern_song', name: '南宋', keywords: ['南宋'], yearMin: 1127, yearMax: 1279 },
    { id: 'song', name: '宋', keywords: ['宋代', '宋朝', '宋'], yearMin: 960, yearMax: 1279, timeline: false },
    { id: 'western_xia', name: '西夏', keywords: ['西夏'], yearMin: 1038, yearMax: 1227, timeline: false },
    { id: 'liao', name: '辽', keywords: ['辽代', '辽朝', '辽'], yearMin: 907, yearMax: 1125 },
    { id: 'jin_dynasty', name: '金', keywords: ['金代', '金朝', '金'], yearMin: 1115, yearMax: 1234 },
    { id: 'yuan', name: '元', keywords: ['元代', '元朝', '元'], yearMin: 1271, yearMax: 1368 },
    { id: 'ming', name: '明', keywords: ['明代', '明朝', '明'], yearMin: 1368, yearMax: 1644 },
    { id: 'qing', name: '清', keywords: ['清代', '清朝', '清'], yearMin: 1644, yearMax: 1912 },
    { id: 'republic', name: '民国', keywords: ['民国', '近代', '近现代', '日治', '荷据'], yearMin: 1912, yearMax: 1949 },
    { id: 'prc', name: '中华人民共和国', keywords: ['中华人民共和国', '现代'], yearMin: 1949, yearMax: 2030 }
  ],

  eraColors: {
    paleolithic: '#5D4037', neolithic: '#8D6E63', xia: '#F9A825',
    shang: '#F57F17', western_zhou: '#2E7D32', eastern_zhou: '#388E3C',
    spring_autumn: '#43A047', warring_states: '#66BB6A', zhou: '#1B5E20',
    qin: '#7B1FA2', western_han: '#C62828', eastern_han: '#E53935',
    han: '#B71C1C', three_kingdoms: '#FF6D00', western_jin: '#1565C0',
    eastern_jin: '#1E88E5', jin: '#0D47A1', sixteen_kingdoms: '#00838F',
    northern_southern: '#00695C', sui: '#6A1B9A', tang: '#E65100',
    five_dynasties: '#FDD835', northern_song: '#AD1457', southern_song: '#880E4F',
    song: '#C2185B', western_xia: '#FF8F00', liao: '#4527A0',
    jin_dynasty: '#283593', yuan: '#37474F', ming: '#D84315',
    qing: '#1A237E', republic: '#616161', prc: '#C62828'
  },

  // 根据省份 ID 获取样式
  getProvinceStyle(provinceId) {
    return this.provinceStyles[provinceId] || { icon: '📍', color: '#3498db', bgColor: '#ebf5fb' };
  },

  // 根据建筑获取分类
  getBuildingCategory(building) {
    const type = building.type || '';
    for (const [key, cat] of Object.entries(this.buildingCategories)) {
      if (cat.matchTypes.includes(type)) {
        const isWorldHeritage = (building.tags || []).includes('世界遗产');
        const result = { ...cat, key };
        if (isWorldHeritage) {
          result.size = 26;
          result.isWorldHeritage = true;
        }
        return result;
      }
    }
    return { ...this.buildingCategories.other, key: 'other' };
  },

  // 根据标签名获取样式
  getTagStyle(tagName, index) {
    const style = this.tagStyles[tagName] || { icon: '🏷️' };
    const palette = this.colorPalette[index % this.colorPalette.length];
    return { ...style, color: palette.color, bg: palette.bg };
  },

  // 获取最早朝代
  getEarliestDynasty(eraStr) {
    if (!eraStr || eraStr === '待考' || eraStr.startsWith('不可考') || eraStr.startsWith('估计')) return null;
    const matches = [];
    for (const e of this.eras) {
      for (const kw of e.keywords) {
        if (eraStr.includes(kw)) {
          matches.push(e);
          break;
        }
      }
    }
    if (matches.length > 0) return matches[0].id;

    // 尝试从字符串中提取所有年份数字，取最早的一年
    const yearNums = [...eraStr.matchAll(/(\d{3,4})/g)].map(m => parseInt(m[1])).filter(y => y > 0 && y < 2030);
    if (yearNums.length > 0) {
      const year = Math.min(...yearNums);
      for (const e of this.eras) {
        if (year >= e.yearMin && year <= e.yearMax) return e.id;
      }
    }

    // 尝试匹配世纪格式（如"16世纪"）
    const centuryMatch = eraStr.match(/(\d{1,2})世纪/);
    if (centuryMatch) {
      const century = parseInt(centuryMatch[1]);
      const year = (century - 1) * 100 + 1;
      for (const e of this.eras) {
        if (year >= e.yearMin && year <= e.yearMax) return e.id;
      }
    }

    return null;
  }
};

export default Config;