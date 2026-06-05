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
  tagCategories: [
    {
      id: 'building', icon: '🏛️', name: '古建筑',
      tags: [
        '古建筑', '古建筑群', '古塔', '古寺', '古桥', '古街', '古城', '古庙', '古亭', '古楼', '古宅',
        '宫殿', '园林', '衙署', '民居', '会馆', '书院', '四合院',
        '古村落', '历史文化街区', '戏台', '影壁', '钟鼓楼', '牌坊', '无梁殿', '楼阁',
        '古井', '古树名木', '木结构建筑', '木构建筑', '石构建筑', '石砌建筑', '砖木塔', '砖石塔', '楼阁式塔', '密檐式塔'
      ]
    },
    {
      id: 'temple', icon: '🕯️', name: '坛庙祠庙',
      tags: [
        '祭坛', '祠堂', '文庙', '坛庙建筑', '祠庙建筑', '宫庙建筑', '社区庙宇',
        '关帝庙', '城隍庙', '妈祖庙', '文昌阁', '后土庙', '玉皇庙',
        '龙王庙', '岳王庙', '禹王庙', '东岳庙', '真武庙', '二仙庙', '祖师庙',
        '观音庙', '药王庙', '车公庙', '城隍庙', '天后宫'
      ]
    },
    {
      id: 'religion', icon: '☸️', name: '宗教建筑',
      tags: [
        '佛教寺院', '藏传佛教', '格鲁派', '噶举派', '宁玛派', '萨迦派', '全真派',
        '道教建筑', '道教石窟', '道教圣地', '道教名山', '道教石刻', '道教摩崖',
        '教堂', '清真寺', '伊斯兰建筑', '伊斯兰教建筑',
        '塔', '舍利塔', '舍利塔', '燃灯塔', '塔林', '佛塔建筑',
        '佛寺遗址', '佛教遗址', '佛教圣地', '禅宗', '禅宗祖庭', '格鲁派', '藏传佛教',
        '中式庙宇', '宫庙建筑'
      ]
    },
    {
      id: 'grotto', icon: '🪨', name: '石窟石刻',
      tags: [
        '石窟寺', '石窟', '石刻', '碑刻', '雕塑', '岩画',
        '造像', '彩塑', '经幢', '壁画', '佛教艺术', '壁画艺术',
        '石经墙', '造像塔', '石雕艺术', '题刻', '摩崖石刻', '祈风石刻',
        '满蒙文碑', '石阙', '石祠', '魏碑书法', '颜真卿', '瘗鹤铭'
      ]
    },
    {
      id: 'archaeology', icon: '🏺', name: '考古遗址',
      tags: [
        '古遗址', '古城遗址', '都城遗址', '都城', '窑址', '大遗址',
        '龙山文化', '仰韶文化', '大汶口文化', '良渚文化', '红山文化', '马家窑文化', '齐家文化', '河姆渡文化',
        '二里头文化', '二里岗文化', '马家浜文化', '薛家岗文化', '青莲岗文化', '屈家岭文化', '岳石文化', '大溪文化', '崧泽文化', '北辛文化', '裴李岗文化', '石家河文化', '赵宝沟文化', '上山文化', '顺山集文化',
        '考古学文化', '考古学文化命名地', '百年百大考古发现', '考古新发现', '考古重大发现', '考古圣地'
      ]
    },
    {
      id: 'tomb', icon: '⚰️', name: '古墓葬',
      tags: [
        '古墓葬', '陵墓', '帝王陵墓', '帝王陵寝', '皇家陵墓', '皇家陵寝', '藩王墓', '名人墓', '名人墓葬', '壁画墓', '古墓', '石棺墓', '积石墓', '崖墓', '崖洞墓', '石人墓', '古战场',
        '楚墓', '车马坑', '黄肠题凑', '贵族墓地', '王族墓地', '石堆墓', '高句丽'
      ]
    },
    {
      id: 'military', icon: '⚔️', name: '军事防御',
      tags: [
        '军事遗址', '关隘', '长城', '齐长城', '城墙', '烽燧', '炮台',
        '防御建筑', '海防建筑', '海防', '城防建筑', '军事城堡', '古城堡', '边城',
        '万人坑', '惨案遗址', '侵华罪证', '警示遗产', '警示遗址', '劳工苦难', '盟军战俘营'
      ]
    },
    {
      id: 'modern', icon: '🚩', name: '近现代史',
      tags: [
        '革命遗址', '红色旅游', '红色政权', '红色旧址', '红色地标', '红军长征', '长征', '秋收起义', '百色起义',
        '近现代史迹', '中西合璧', '纪念建筑', '博物馆', '名人故居', '工业遗产', '产业遗产', '铁路遗产', '矿业遗迹',
        '西式建筑', '欧式建筑', '哥特式', '哥特式建筑', '法式建筑', '俄式建筑', '德式建筑', '葡式建筑', '英式建筑', '新古典主义', '巴洛克风格', '租界建筑',
        '日治时期建筑', '殖民建筑', '苏式建筑', '石库门建筑', '花园洋房', '洋楼建筑', '领事馆', '领事馆建筑', '使馆建筑',
        '五四运动', '鸦片战争', '甲午战争', '太平天国', '中共党史', '八路军', '东江纵队', '西路红军', '党史纪念', '烈士', '烈士陵园', '烈士纪念', '抗日', '抗战时期', '红色故都', '根据地'
      ]
    },
    {
      id: 'culture', icon: '📜', name: '历史文化',
      tags: [
        '青铜文化', '青铜文明', '楚文化', '滇文化', '龟兹文化', '西夏', '鲜卑遗址', '渤海国', '高句丽', '女真', '吴越', '曾国', '楚国', '芮国', '薛国', '赵国', '齐国', '燕国', '越国',
        '稻作', '稻作农业', '稻作文化', '稻作起源',
        '儒家文化', '理学', '理学文化', '科举', '科举建筑', '科举文化', '书院', '白鹿洞书院',
        '雕版印刷', '陶瓷', '青瓷', '白瓷', '白陶', '青瓷', '青花瓷', '秘色瓷', '耀州窑', '邢窑', '磁州窑', '彩陶', '琉璃艺术',
        '书法文化', '书法名迹', '美术展览', '戏曲舞台', '藏传佛教', '儒家'
      ]
    },
    {
      id: 'regional', icon: '🏘️', name: '地域民居',
      tags: [
        '徽派建筑', '晋商建筑', '岭南建筑', '闽南建筑', '客家建筑', '土楼', '客家民居', '赣派建筑', '赣南围屋',
        '窑洞', '窑洞群', '碉楼', '碉楼建筑', '碉房', '蒙古包',
        '傣族建筑', '侗族建筑', '苗族建筑', '藏式建筑', '彝族建筑', '土家族建筑', '维吾尔族建筑', '回族建筑', '白族建筑', '纳西族建筑',
        '瑶族建筑', '苗族文化', '侗族文化', '壮族文化', '藏族文化', '纳西族文化', '少数民族文化', '羌族建筑',
        '官式建筑', '王府', '衙署园林', '地主庄园', '庄园', '大宅门', '府第建筑'
      ]
    },
    {
      id: 'transport', icon: '🌉', name: '交通水利',
      tags: [
        '桥梁', '石拱桥', '木拱桥', '铁索桥', '钢索吊桥', '铁路桥梁', '水利工程', '灌溉工程', '运河', '京杭大运河', '码头', '驿站', '栈道',
        '驿道', '古驿道', '漕运', '航运', '铁路', '滇越铁路', '滇缅铁路', '中东铁路', '火车站',
        '航运设施', '交通遗产', '交通遗址', '交通设施'
      ]
    },
    {
      id: 'heritage', icon: '🌟', name: '世界遗产',
      tags: [
        '世界遗产', '世界文化遗产', '世界自然与文化遗产', '世界遗产预备名单', '文化景观', '自然遗产', '丝绸之路', '草原丝绸之路', '西南丝绸之路', '澳门历史城区',
        '农业遗产', '活态遗产', '线性文化遗产'
      ]
    },
    {
      id: 'craft', icon: '🎨', name: '工艺陶瓷',
      tags: [
        '陶瓷考古', '陶瓷史', '瓷器烧造', '邢窑', '磁州窑', '耀州窑', '瓯窑', '汝窑', '越窑', '龙泉窑',
        '青瓷', '青白瓷', '青花瓷', '秘色瓷', '白釉瓷器', '绞胎瓷', '彩陶', '紫砂', '灰塑', '砖雕艺术', '木雕艺术', '琉璃艺术',
        '酿酒遗址', '酿酒文化', '盐井', '盐业', '票号'
      ]
    },
    {
      id: 'nature', icon: '🌿', name: '自然景观',
      tags: [
        '大自然', '海洋', '河流', '岛屿', '山川', '森林', '湖泊', '岛屿海岸', '西湖', '钱塘江', '长江', '黄河', '泰山', '华山', '恒山', '衡山', '嵩山', '黄山', '庐山', '五台山', '普陀山', '九华山',
        '丹霞地貌', '喀斯特', '溶洞', '温泉'
      ]
    },
    {
      id: 'architecture', icon: '🏗️', name: '建筑风格',
      tags: [
        '建筑', '中式建筑', '西式建筑群', '西方建筑', '中西文化交流', '中西交流', '中西融合', '仿古建筑', '木结构', '石构建筑', '砖石建筑',
        '装饰艺术风格', '骑楼建筑', '围村', '大院', '城堡', '城堡建筑', '地标建筑', '地标', '古城堡', '庄园建筑'
      ]
    }
  ],

  // 关键词匹配规则（按分类，用于模糊匹配标签名）
  tagCategoryKeywords: {
    'building': ['殿', '阁', '楼', '亭', '塔', '桥', '街', '村', '城', '坊', '井', '木', '石', '砖'],
    'temple': ['庙', '祠', '坛', '祭', '祀', '阁', '宫', '信仰'],
    'religion': ['佛', '禅', '宗', '寺', '教', '伊斯兰', '天主', '基督', '道', '藏传', '格鲁派', '噶举派'],
    'grotto': ['窟', '石', '刻', '雕', '塑', '壁', '画', '岩画', '碑'],
    'archaeology': ['文化', '遗址', '类型', '考古', '窑'],
    'tomb': ['墓', '陵', '葬', '坟', '坑', '冢'],
    'military': ['军', '战', '兵', '炮', '防', '城', '墙', '关', '烽', '罪证', '警示', '俘虏'],
    'modern': ['革命', '红军', '长征', '红色', '近现代', '工业', '产业', '铁路', '殖民', '租界', '西式', '哥特', '法式', '俄式', '德式', '葡式', '英式', '运动', '抗日', '党史', '烈士'],
    'culture': ['文化', '历史', '书法', '艺术', '儒家', '理学', '科举', '稻作', '青铜'],
    'regional': ['建筑', '民居', '客家', '徽派', '晋商', '岭南', '土楼', '窑洞', '碉楼', '民族', '少数', '王府', '庄园'],
    'transport': ['桥', '运', '河', '渡', '闸', '驿', '道', '航', '水', '利', '灌溉', '铁路', '站'],
    'heritage': ['遗产', '世界', '文化景观', '丝绸之路', '活态', '农业', '线性'],
    'craft': ['窑', '瓷', '陶', '青', '白', '雕', '刻', '酒', '盐', '票', '琉璃'],
    'nature': ['山', '水', '湖', '河', '海', '岛', '森林', '江', '河', '峰', '崖', '洞'],
    'architecture': ['建筑', '风格', '结构', '中西', '西式', '新古典', '巴洛克']
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
    { id: 'paleolithic', name: '旧石器', keywords: ['旧石器'], yearMin: -Infinity, yearMax: -10000 },
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
    { id: 'tang', name: '唐', keywords: ['唐代', '唐朝', '唐', '高句丽'], yearMin: 618, yearMax: 907 },
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
    { id: 'republic', name: '民国', keywords: ['民国', '近代'], yearMin: 1912, yearMax: 1949 },
    { id: 'prc', name: '中华人民共和国', keywords: ['中华人民共和国'], yearMin: 1949, yearMax: 2030 }
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
    const yearMatch = eraStr.match(/(\d{3,4})年/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year > -500 && year < 2030) {
        for (const e of this.eras) {
          if (year >= e.yearMin && year <= e.yearMax) return e.id;
        }
      }
    }
    return null;
  }
};

export default Config;