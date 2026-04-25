#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = 'd:/opencli/douyin-videos';
const DATA_FILES_DIR = path.join(DATA_DIR, 'data');
const RESULTS_DIR = path.join(DATA_DIR, 'results');
const REPORTS_DIR = path.join(DATA_DIR, 'reports');

const KEYWORDS = ['创业', '赚钱', '项目', '商业', '变现', '兼职', '轻资产', '低成本', '自媒体', '短视频'];

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getBloggerMetadata(bloggerName, authorId) {
  const resultsDir = path.join(DATA_DIR, 'results');
  try {
    const dirs = fs.readdirSync(resultsDir);
    const targetDir = dirs.find(d => 
      d.includes(bloggerName) || d.includes(authorId)
    );
    
    if (!targetDir) return null;
    
    const metadataPath = path.join(resultsDir, targetDir, 'metadata.json');
    return readJsonFile(metadataPath);
  } catch (error) {
    return null;
  }
}

function calculateContentRelevance(blogger, metadata) {
  if (metadata?.relevance_score !== undefined) {
    return metadata.relevance_score;
  }
  
  const text = [
    blogger.source_keyword || metadata?.source_keyword || '',
    blogger.category || metadata?.category || '',
    blogger.signature || metadata?.signature || ''
  ].join(' ');
  
  const matchCount = KEYWORDS.filter(kw => text.includes(kw)).length;
  return (matchCount / KEYWORDS.length) * 100;
}

function calculateFollowerValue(followerCount, hasVideos) {
  if (!followerCount || followerCount <= 0) return 0;
  const baseScore = Math.min(100, (Math.log10(followerCount) / 6) * 100);
  return hasVideos ? baseScore : baseScore * 0.4;
}

function calculateCollectionEfficiency(collectedCount, videoCount) {
  if (!collectedCount || collectedCount <= 0) return 0;
  
  const expectedCount = Math.max(10, (videoCount || 100) * 0.1);
  return Math.min(100, (collectedCount / expectedCount) * 100);
}

function calculateFilterStructure(filterReasons, hasVideos) {
  if (!filterReasons || Object.keys(filterReasons).length === 0) {
    return hasVideos ? 50 : 30;
  }
  
  const total = Object.values(filterReasons).reduce((a, b) => a + b, 0);
  if (total === 0) return 30;
  
  const irrelevantRatio = (filterReasons.irrelevant || 0) / total;
  const tooShortRatio = (filterReasons.too_short || 0) / total;
  const duplicateRatio = (filterReasons.duplicate || 0) / total;
  
  let score = 50;
  
  if (irrelevantRatio > 0.5) score -= 40;
  else if (irrelevantRatio > 0.3) score -= 30;
  else if (irrelevantRatio > 0.1) score -= 15;
  
  if (tooShortRatio > 0.5) score -= 25;
  else if (tooShortRatio > 0.3) score -= 20;
  else if (tooShortRatio > 0.1) score -= 10;
  
  if (duplicateRatio > 0.5) score -= 15;
  else if (duplicateRatio > 0.3) score -= 10;
  else if (duplicateRatio > 0.1) score -= 5;
  
  return Math.max(10, Math.min(100, score));
}

function calculatePlatformVideoFactor(videoCount, relevanceScore) {
  if (!videoCount || videoCount <= 0) return 0;
  const countScore = Math.min(100, (videoCount / 50) * 100);
  return countScore * (relevanceScore / 100);
}

function calculateSamplePenalty(collectedCount) {
  if (!collectedCount || collectedCount < 3) return 0.5;
  if (collectedCount < 5) return 0.7;
  if (collectedCount < 10) return 0.9;
  return 1;
}

function calculateContentConsistency(metadata) {
  if (!metadata || !metadata.videos || metadata.videos.length < 2) {
    return 50;
  }
  
  const videos = metadata.videos;
  const categories = new Set();
  const topics = new Set();
  
  for (const video of videos) {
    if (video.topic) topics.add(video.topic);
    if (metadata.category) categories.add(metadata.category);
  }
  
  if (topics.size === 0) {
    return categories.size <= 1 ? 80 : 60;
  }
  
  const consistencyRatio = 1 - Math.min(1, (topics.size - 1) / Math.max(1, videos.length));
  return Math.round(consistencyRatio * 100);
}

function calculateAdPenalty(metadata) {
  if (!metadata || !metadata.videos || metadata.videos.length === 0) {
    return 0;
  }
  
  const adKeywords = ['评测', '开箱', '同款', '购买链接', '旗舰店', '下单', '优惠券', '限时', '折扣'];
  let adCount = 0;
  
  for (const video of metadata.videos) {
    const text = (video.title || '') + ' ' + (video.main_content || '');
    if (adKeywords.some(kw => text.includes(kw))) {
      adCount++;
    }
  }
  
  const adRatio = adCount / metadata.videos.length;
  return Math.round(adRatio * 30);
}

function calculateFilterRatio(filterReasons, collectedCount) {
  if (!filterReasons || Object.keys(filterReasons).length === 0) {
    return 0;
  }
  
  const filteredCount = Object.values(filterReasons).reduce((a, b) => a + b, 0);
  const totalAttempts = filteredCount + (collectedCount || 0);
  
  if (totalAttempts === 0) return 0;
  
  return filteredCount / totalAttempts;
}

function calculateFiveDimensionScore(blogger, metadata, filterReasons, highQualityRatio) {
  const collectedCount = metadata?.collected_video_count || blogger.collected_video_count || 0;
  const videoCount = metadata?.video_count || blogger.video_count || 0;
  const hasVideos = collectedCount > 0;
  
  const contentRelevance = calculateContentRelevance(blogger, metadata);
  const followerCount = metadata?.follower_count || blogger.follower_count || 0;
  const followerValue = calculateFollowerValue(followerCount, hasVideos);
  const collectionEfficiency = calculateCollectionEfficiency(collectedCount, videoCount);
  const filterStructure = calculateFilterStructure(filterReasons, hasVideos);
  const platformVideoFactor = calculatePlatformVideoFactor(videoCount, contentRelevance);
  
  const samplePenalty = calculateSamplePenalty(collectedCount);
  const adjustedQualityScore = (highQualityRatio || 0) * samplePenalty;
  
  const contentConsistency = calculateContentConsistency(metadata);
  const adPenalty = calculateAdPenalty(metadata);
  
  const filterRatio = calculateFilterRatio(filterReasons, collectedCount);
  const filterPenalty = Math.round(filterRatio * 20);
  
  let score;
  if (hasVideos) {
    score = contentRelevance * 0.30 
           + followerValue * 0.05 
           + collectionEfficiency * 0.10 
           + filterStructure * 0.05 
           + platformVideoFactor * 0.05
           + adjustedQualityScore * 0.15
           + contentConsistency * 0.10
           - adPenalty
           - filterPenalty;
  } else {
    score = contentRelevance * 0.50 
           + followerValue * 0.10 
           + filterStructure * 0.20 
           + platformVideoFactor * 0.20
           - filterPenalty;
  }
  
  score = Math.max(0, score);
  
  return {
    score: Math.round(score * 10) / 10,
    dimensions: {
      contentRelevance: Math.round(contentRelevance * 10) / 10,
      followerValue: Math.round(followerValue * 10) / 10,
      collectionEfficiency: Math.round(collectionEfficiency * 10) / 10,
      filterStructure: Math.round(filterStructure * 10) / 10,
      platformVideoFactor: Math.round(platformVideoFactor * 10) / 10,
      qualityScore: Math.round(adjustedQualityScore * 10) / 10,
      contentConsistency: Math.round(contentConsistency * 10) / 10,
      adPenalty: adPenalty,
      filterPenalty: filterPenalty,
      filterRatio: Math.round(filterRatio * 100)
    }
  };
}

function getGrade(score) {
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 30) return 'C';
  return 'D';
}

function getGradeEmoji(grade) {
  switch (grade) {
    case 'A': return '✅';
    case 'B': return '✅';
    case 'C': return '⚠️';
    case 'D': return '❌';
    default: return '❓';
  }
}

function getBloggerVideoStats(authorId, videosIndex, videosExceptions) {
  const stats = {
    total: 0,
    processed: 0,
    insufficient: 0,
    inaccessible: 0,
    transcribed: 0
  };
  
  if (videosIndex && videosIndex.index) {
    for (const [videoId, info] of Object.entries(videosIndex.index)) {
      if (info.author_id === authorId) {
        stats.total++;
        stats[info.status] = (stats[info.status] || 0) + 1;
      }
    }
  }
  
  if (videosExceptions && videosExceptions.videos) {
    for (const video of videosExceptions.videos) {
      if (video.author_id === authorId) {
        stats.total++;
        if (video.quality === 'insufficient') stats.insufficient++;
        if (video.quality === 'inaccessible') stats.inaccessible++;
      }
    }
  }
  
  stats.highQualityRatio = stats.total > 0 
    ? Math.round((stats.processed / stats.total) * 100) 
    : 0;
  
  return stats;
}

function getReviewStats(bloggerName, bloggerVideoIds) {
  const reviewDir = path.join(DATA_DIR, 'transcripts', 'review');
  const stats = {
    contentFragmented: 0,
    whisperHallucination: 0
  };
  
  if (!bloggerVideoIds || bloggerVideoIds.size === 0) {
    return stats;
  }
  
  try {
    const subDirs = ['content-fragmented', 'whisper-hallucination'];
    for (const subDir of subDirs) {
      const subDirPath = path.join(reviewDir, subDir);
      if (!fs.existsSync(subDirPath)) continue;
      
      const files = fs.readdirSync(subDirPath).filter(f => f.endsWith('.txt'));
      for (const file of files) {
        const videoId = file.replace('.txt', '');
        if (bloggerVideoIds.has(videoId)) {
          if (subDir === 'content-fragmented') {
            stats.contentFragmented++;
          } else {
            stats.whisperHallucination++;
          }
        }
      }
    }
  } catch (error) {
    // ignore
  }
  
  return stats;
}

function getBloggerVideoIds(authorId, videosIndex) {
  const videoIds = new Set();
  
  if (videosIndex && videosIndex.index) {
    for (const [videoId, info] of Object.entries(videosIndex.index)) {
      if (info.author_id === authorId) {
        videoIds.add(videoId);
      }
    }
  }
  
  return videoIds;
}

function generateReport(evaluationResults, qualityStats, reviewStats, blacklistCount) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  
  const report = `# 博主优化报告

**生成时间**: ${dateStr} ${timeStr}

---

## 📊 博主质量概览

| 博主 | 粉丝数 | 采集视频 | 五维评分 | 等级 | 高质量比例 | Review问题 | 建议 |
| ---- | ------ | -------- | -------- | ---- | ---------- | ---------- | ---- |
${evaluationResults.map(r => 
  `| ${r.name} | ${(r.follower_count / 10000).toFixed(1)}万 | ${r.collected_video_count} | ${r.score} | ${getGradeEmoji(r.grade)} ${r.grade} | ${r.highQualityRatio}% | ${r.reviewIssues} | ${r.suggestion} |`
).join('\n')}

---

## 📈 九维评分详情

| 博主 | 相关度 | 粉丝价值 | 采集效率 | 过滤结构 | 平台视频 | 质量得分 | 一致性 | 广告扣分 | 过滤扣分 | 综合评分 |
| ---- | ------ | -------- | -------- | -------- | -------- | -------- | ------ | -------- | -------- | -------- |
${evaluationResults.map(r => 
  `| ${r.name} | ${r.dimensions.contentRelevance} | ${r.dimensions.followerValue} | ${r.dimensions.collectionEfficiency} | ${r.dimensions.filterStructure} | ${r.dimensions.platformVideoFactor} | ${r.dimensions.qualityScore} | ${r.dimensions.contentConsistency} | -${r.dimensions.adPenalty} | -${r.dimensions.filterPenalty}(${r.dimensions.filterRatio}%) | ${r.score} |`
).join('\n')}

---

## 📋 评分权重说明

| 维度 | 权重 | 说明 |
| ---- | ---- | ---- |
| 内容相关度 | 30% | 核心指标，基于 relevance_score |
| 粉丝价值 | 5% | 辅助指标，对数函数避免大号垄断 |
| 采集效率 | 10% | 实际采集数量与期望值的比例 |
| 过滤结构 | 5% | 过滤原因分布的合理性 |
| 平台视频因子 | 5% | 视频数量与相关度的综合 |
| 质量得分 | 15% | 高质量比例 × 样本量惩罚因子 |
| 内容一致性 | 10% | 博主内容主题的稳定性 |
| 广告扣分 | - | 广告内容比例 × 30 |
| 过滤扣分 | - | 过滤比例 × 20（视频太短被淘汰） |

---

## ✅ 优化建议

### 立即执行

${evaluationResults.filter(r => r.grade === 'D' && r.highQualityRatio === 0).map(r => 
  `- [ ] 加入黑名单：${r.name}（评分${r.score}，无高质量视频）`
).join('\n') || '- 无'}

### 观察调整

${evaluationResults.filter(r => r.grade === 'C' || r.grade === 'D' && r.highQualityRatio > 0).map(r => 
  `- [ ] 继续监控：${r.name}（评分${r.score}）`
).join('\n') || '- 无'}

---

## 📊 数据统计

| 指标 | 数值 |
| ---- | ---- |
| 活跃博主 | ${evaluationResults.length} |
| 优质博主(A级) | ${evaluationResults.filter(r => r.grade === 'A').length} |
| 良好博主(B级) | ${evaluationResults.filter(r => r.grade === 'B').length} |
| 一般博主(C级) | ${evaluationResults.filter(r => r.grade === 'C').length} |
| 较差博主(D级) | ${evaluationResults.filter(r => r.grade === 'D').length} |
| 黑名单博主 | ${blacklistCount} |
| Review问题视频 | ${reviewStats.contentFragmented + reviewStats.whisperHallucination} |
`;

  return { report, dateStr };
}

async function main() {
  console.log('📊 博主优化评估开始...\n');
  
  // 读取数据文件
  const bloggers = readJsonFile(path.join(DATA_FILES_DIR, 'bloggers.json')) || [];
  const videosIndex = readJsonFile(path.join(DATA_FILES_DIR, 'videos-index.json'));
  const videosExceptions = readJsonFile(path.join(DATA_FILES_DIR, 'videos-exceptions.json'));
  const filterReport = readJsonFile(path.join(DATA_FILES_DIR, 'filter-report.json'));
  const blacklistData = readJsonFile(path.join(DATA_FILES_DIR, 'blogger-blacklist.json'));
  const blacklist = blacklistData?.blacklist || [];
  
  console.log(`📂 数据加载完成:`);
  console.log(`   - 博主数量: ${bloggers.length}`);
  console.log(`   - 黑名单数量: ${blacklist.length}`);
  console.log(`   - 视频索引: ${videosIndex ? Object.keys(videosIndex.index || {}).length : 0} 个视频`);
  console.log('');
  
  // 过滤黑名单博主
  const blacklistIds = new Set(blacklist.map(b => b.author_id || b.sec_uid));
  const activeBloggers = bloggers.filter(b => !blacklistIds.has(b.author_id) && !blacklistIds.has(b.sec_uid));
  
  console.log(`🔍 活跃博主: ${activeBloggers.length} 个\n`);
  
  // 评估每个博主
  const evaluationResults = [];
  
  for (const blogger of activeBloggers) {
    // 获取博主详细数据
    const metadata = getBloggerMetadata(blogger.name, blogger.author_id);
    
    // 获取过滤原因
    const filterReasons = filterReport?.bloggers_without_new_videos?.find(
      b => b.sec_uid === blogger.sec_uid || b.author_id === blogger.author_id
    )?.filter_reasons;
    
    // 获取视频质量统计
    const videoStats = getBloggerVideoStats(blogger.author_id, videosIndex, videosExceptions);
    
    // 优先使用 metadata 中的高质量比例
    const highQualityRatio = metadata?.high_quality_ratio 
      ? Math.round(metadata.high_quality_ratio * 100) 
      : videoStats.highQualityRatio;
    
    // 计算五维评分
    const { score, dimensions } = calculateFiveDimensionScore(blogger, metadata, filterReasons, highQualityRatio);
    const grade = getGrade(score);
    
    // 获取博主的视频ID列表
    const bloggerVideoIds = getBloggerVideoIds(blogger.author_id, videosIndex);
    
    // 获取 Review 问题（使用正确的博主视频ID）
    const reviewStats = getReviewStats(blogger.name, bloggerVideoIds);
    const reviewIssues = reviewStats.contentFragmented + reviewStats.whisperHallucination;
    
    // 生成建议
    let suggestion = '';
    if (grade === 'A') suggestion = '优先采集';
    else if (grade === 'B') suggestion = '正常采集';
    else if (grade === 'C') suggestion = '降低频率观察';
    else if (highQualityRatio > 0) suggestion = '休眠保留';
    else suggestion = '建议移除';
    
    evaluationResults.push({
      name: blogger.name,
      author_id: blogger.author_id,
      follower_count: metadata?.follower_count || blogger.follower_count || 0,
      collected_video_count: metadata?.collected_video_count || blogger.collected_video_count || 0,
      score,
      grade,
      dimensions,
      highQualityRatio,
      reviewIssues,
      suggestion
    });
  }
  
  // 按评分排序
  evaluationResults.sort((a, b) => b.score - a.score);
  
  // 统计全局 Review 问题
  const totalReviewStats = { contentFragmented: 0, whisperHallucination: 0 };
  const reviewDir = path.join(DATA_DIR, 'transcripts', 'review');
  try {
    const fragmentedPath = path.join(reviewDir, 'content-fragmented');
    if (fs.existsSync(fragmentedPath)) {
      totalReviewStats.contentFragmented = fs.readdirSync(fragmentedPath).filter(f => f.endsWith('.txt')).length;
    }
    const hallucinationPath = path.join(reviewDir, 'whisper-hallucination');
    if (fs.existsSync(hallucinationPath)) {
      totalReviewStats.whisperHallucination = fs.readdirSync(hallucinationPath).filter(f => f.endsWith('.txt')).length;
    }
  } catch (error) {
    // ignore
  }
  
  // 生成报告
  const { report, dateStr } = generateReport(evaluationResults, {}, totalReviewStats, blacklist.length);
  
  // 确保报告目录存在
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  // 写入报告
  const reportPath = path.join(REPORTS_DIR, `blogger-optimization-${dateStr}.md`);
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`\n📄 报告已生成: ${reportPath}\n`);
  
  // 输出摘要
  console.log('📊 评估结果摘要:');
  console.log(`   - A级博主: ${evaluationResults.filter(r => r.grade === 'A').length}`);
  console.log(`   - B级博主: ${evaluationResults.filter(r => r.grade === 'B').length}`);
  console.log(`   - C级博主: ${evaluationResults.filter(r => r.grade === 'C').length}`);
  console.log(`   - D级博主: ${evaluationResults.filter(r => r.grade === 'D').length}`);
  
  // 列出建议移除的博主
  const toRemove = evaluationResults.filter(r => r.grade === 'D' && r.highQualityRatio === 0);
  if (toRemove.length > 0) {
    console.log('\n❌ 建议移除的博主:');
    toRemove.forEach(r => {
      console.log(`   - ${r.name} (评分: ${r.score}, 粉丝: ${(r.follower_count / 10000).toFixed(1)}万)`);
    });
    console.log(`\n💡 执行归档命令:`);
    console.log(`   node scripts/utils/archive-blogger.js --blacklist "${toRemove[0].name}"`);
  }
}

main().catch(console.error);
