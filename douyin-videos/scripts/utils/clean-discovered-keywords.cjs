const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const INPUT_FILE = path.join(DATA_DIR, 'discovered-keywords.json');

const THEME_KEYWORDS = [
  '创业', '副业', '赚钱', '项目', '商业', '变现', '自媒体',
  '一人', '超级个体', '轻资产', '零成本', '草根', '摆摊', '地摊',
  '生意', '搞钱', '流量', '内容创业', '知识付费', '个人IP', '信息差',
  '副业思维', '赚钱思维', '商业思维', '创业商机', '创业学习', '创业准备',
  '价值交换', '发现需求', '创业粉', '账号变现', '自媒体运营', '自媒体赚钱',
  '副业变现', '副业规划', 'AI副业', 'AI赚钱', 'AI变现', 'AI工具',
  'AI创作', 'AI自媒体', 'AI短视频', 'AI代运营', 'AI教学', 'AI电商',
  'AI图文', 'AI视频', '电商运营', '跨境电商', '闲鱼', '小红书',
  '创作者', '伙伴计划', '流量变现', '垂直', '对标', '起号', '涨粉',
  '运营', '短视频', '直播', '带货', '货源', '供应链', '零售创业',
  '服装创业', '上门服务', '小本创业', '低成本创业', '普通人创业',
  '创业经历', '原始积累', '借势借力', '老板思维', '销售思维',
  '赚钱本质', '自媒体销售', '视频赚钱', '创作者中心',
  'AI工作流', '工作流思维', 'AI能力', 'AI信息源', 'AI视频生成',
  '爆款视频', '视频营销', '电商带货', 'AI员工团队', 'AI工具选型',
  'AI时代财富分配', 'AI能力分层', '思考层收入', '智力变现',
  '商业模式', '个人品牌', '内容产能', 'AI杠杆', '技能结合',
  '垂直赛道', '批量生产', '多平台分发', '一键成片',
  '垂直细分', '选题能力', '文案生成', '热点事件',
  '抖音创作', '流量密码', 'AI工具组合', '自媒体全链路',
  '效率提升', '自媒体趋势', '小而美', '精准粉丝', 'AI机会',
  '竞争优势', '找对标', 'AI时代', '流程优化', '商业价值',
  '创业心态', '创业者心态', '成功思维', '信念力量', '执行力',
  '真诚营销', '自媒体策略', '自媒体工具', '自媒体创作', '自媒体焦虑',
  '全职自媒体', '兼职自媒体', '自媒体赛道', '自媒体口播',
  '兴趣变现', '爱好变现', '账号运营', '抖音运营', '抖音玩法',
  '抖音涨粉', '短视频起号', '短视频引流', '短视频变现',
  '新手入行', '新手入门', '普通人', '逆袭', '翻身',
  '年入百万', '信息差生意', '试错迭代', '最小可行产品',
  '正反馈', '数据思维', '蹭热点', '完播率', '持续输出',
  '自媒体真相', '学习赚钱', '业务流程', 'DTC模式', '合伙人',
  '语音转文字', 'AI照片动效', '方言识别', '图生视频',
  '知识付费', '文生视频', '图片去水印', '降本增效',
  '借力思维', '成功心态', '信息源', '跨界联想', '资金能力',
  '六个月翻身', '抖音起号', '火伴计划', '串门视频',
  'AI自学', '提示词工程', '工作流', '赚钱思维', '老板思维',
  '兴趣变现', '商业模式', '对标账号', '预售裂变', '单款股东',
  '组货玩法', '生意设计', '产品包装', '销售说服', '流量运营',
  '情绪价值', '选址口诀', '摆摊选址', '摆摊创业', '地摊经济',
  '轻资产创业', '一人生意', '互联网副业', '有积累副业', '人工智能',
  '闲鱼无货源', '小红书图文', '真实反套路', '中长视频',
  'Pika', 'Runway', 'Kling', 'ChatGPT', 'Midjourney',
  '豆包', '剪映AI', '即梦', 'Magic Eraser', 'CreatOk',
  'Suno'
];

const EXCLUDE_EXACT = [
  '广州', '义乌', '马昕彤', '折扣牛', '年度演讲', '荷花', '莲子',
  '蚊香液', '艾草', '驱蚊', '贝因美', '防烫设计', '自行车教学',
  'Sbti', 'MBTI', '玩梗', '公益施粥', '武林外传小米', '张清',
  '爱心粥铺', '素食公益', '马年春节带货', '红包封面', '和声进行',
  '伴奏制作', '音乐创作', '卡农和声', '音频生成音乐',
  '文本生成音乐', 'AI作曲', '音乐制作', '万能伴奏',
  'AI音乐制作', 'AI音乐', '量化基金', '量化交易', '股市投资',
  '短线交易', '指数基金', '散户', '机构博弈', '零和博弈',
  'A股分析', '基金入门', '散户博弈', '理财', '量化投资',
  '养艺宝', '母婴行业', '育儿解决方案', '母婴2.0', '母婴',
  'BOSS直聘', '微信隐藏功能', '加号键', '数字红包', '批改作业',
  '滚动弹幕', '微信技巧', '微信功能', '张雪', '王栋',
  '语言欺骗', '情感类比', '工业革命类比', '自我设限', '女性力量',
  '社交圈层', '向上社交', '个人成长', '实力提升', '认知升级',
  '技能思维', '深度思考', '科学练习', '过程导向', '专注当下',
  '信念力量', '真诚待人', '人际关系', '真诚忠诚', '老实人联盟',
  '社群监督', '拍摄技巧', '表达技巧', '剪辑手法',
  '陆路贸易', '阿里国际站', '速卖通', '一带一路',
  '东南亚市场', '平台选择', '货源优势', '算法岗位',
  '算力需求', '数据方向', '职业规划', 'AI产业',
  '思维层级', '数据分析', '财富分配', 'AI团队',
  'AI 团队', 'AI 赚钱', 'AI 工具', 'AI 思维', 'AI 工作流',
  'AI 创作', '适合宝妈用的ai工具'
];

function isRelated(keyword) {
  if (EXCLUDE_EXACT.includes(keyword)) return false;
  for (const tk of THEME_KEYWORDS) {
    if (keyword.includes(tk)) return true;
  }
  return false;
}

function cleanDiscoveredKeywords(inputFile = INPUT_FILE, dryRun = false) {
  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    return { error: 'file_not_found' };
  }

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const before = data.keywords.length;

  const kept = [];
  const removed = [];

  for (const kw of data.keywords) {
    if (isRelated(kw.keyword)) {
      kept.push(kw);
    } else {
      removed.push(kw.keyword);
    }
  }

  const after = kept.length;
  const result = { before, after, removed: before - after, removedKeywords: removed };

  if (!dryRun) {
    data.keywords = kept;
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(inputFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Cleaned: ${before} -> ${after} (removed ${before - after})`);
  } else {
    console.log(`[Dry Run] Would clean: ${before} -> ${after} (removed ${before - after})`);
  }

  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const inputFile = args.find(a => !a.startsWith('--')) || INPUT_FILE;
  cleanDiscoveredKeywords(inputFile, dryRun);
}

module.exports = { cleanDiscoveredKeywords, isRelated, THEME_KEYWORDS, EXCLUDE_EXACT };
