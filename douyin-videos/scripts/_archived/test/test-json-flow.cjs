const fs = require('fs');
const path = require('path');

const dataDir = 'd:/opencli/douyin-videos';
const dataFilesDir = path.join(dataDir, 'data');
const resultsDir = path.join(dataDir, 'results');
const bloggersDir = path.join(dataDir, 'bloggers');

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

function getBloggerFileName(author, secUid) {
  const sanitizedName = sanitizeFileName(author);
  const secUidPrefix = secUid ? `_${secUid.substring(0, 10)}` : '';
  return `${sanitizedName}${secUidPrefix}.md`;
}

function findBloggerSecUid(author) {
  const bloggersPath = path.join(dataFilesDir, 'bloggers.json');
  if (!fs.existsSync(bloggersPath)) return null;
  const bloggers = JSON.parse(fs.readFileSync(bloggersPath, 'utf-8'));
  const blogger = bloggers.find(b => b.name === author);
  return blogger ? blogger.sec_uid : null;
}

function extractKeywordsAndCategory(result) {
  const keywords = [];
  let category = '';
  let summary = '';
  
  const keywordMatch = result.match(/关键词[：:]\s*([^\n]+)/);
  if (keywordMatch) {
    keywords.push(...keywordMatch[1].trim().split(/[,，、\s]+/).filter(k => k.length > 0 && k !== '未提及'));
  }
  
  const categoryMatch = result.match(/领域[：:]\s*([^\n]+)/);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
    if (category === '未提及') category = '';
  }
  
  const summaryMatch = result.match(/博主一句话总结[：:]\s*([^\n]+)/);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
    if (summary === '未提及') summary = '';
  }
  
  return { keywords: [...new Set(keywords)].slice(0, 10), category, summary };
}

async function saveAnalysisResult(video, analysisResult, status = 'success') {
  const secUid = findBloggerSecUid(video.author);
  const bloggerDirName = getBloggerFileName(video.author, secUid).replace('.md', '');
  const bloggerDir = path.join(resultsDir, bloggerDirName);
  const videosDir = path.join(bloggerDir, 'videos');
  
  if (!fs.existsSync(bloggerDir)) fs.mkdirSync(bloggerDir, { recursive: true });
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  
  const { keywords, category, summary } = extractKeywordsAndCategory(analysisResult);
  
  const isLowQuality = status === 'low_quality';
  const isInaccessible = status === 'inaccessible';
  
  const videoData = {
    video_id: video.aweme_id,
    url: video.url,
    author: video.author,
    author_id: video.author_id,
    title: video.title,
    analyzed_at: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    status: isInaccessible ? 'inaccessible' : (isLowQuality ? 'low_quality' : 'success'),
    quality: isInaccessible ? 'inaccessible' : (isLowQuality ? 'low' : 'high'),
    keywords: keywords.length > 0 ? keywords : null,
    analysis: analysisResult,
  };
  
  const jsonFilePath = path.join(videosDir, `${video.aweme_id}.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(videoData, null, 2), 'utf-8');
  
  updateBloggerMetadata(video.author, secUid, videoData);
  
  return jsonFilePath;
}

function updateBloggerMetadata(author, secUid, newVideoData) {
  const bloggerDirName = getBloggerFileName(author, secUid).replace('.md', '');
  const bloggerDir = path.join(resultsDir, bloggerDirName);
  const metadataPath = path.join(bloggerDir, 'metadata.json');
  
  let metadata = {
    blogger_name: author,
    blogger_id: null,
    sec_uid: secUid,
    total_videos: 0,
    high_quality_count: 0,
    low_quality_count: 0,
    inaccessible_count: 0,
    high_quality_ratio: '0%',
    low_quality_ratio: '0%',
    last_analyzed_at: null,
    videos: [],
  };
  
  if (fs.existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    } catch (e) {}
  }
  
  const existingIndex = metadata.videos.findIndex(v => v.video_id === newVideoData.video_id);
  if (existingIndex !== -1) {
    const oldVideo = metadata.videos[existingIndex];
    if (oldVideo.quality === 'high') metadata.high_quality_count--;
    if (oldVideo.quality === 'low') metadata.low_quality_count--;
    if (oldVideo.quality === 'inaccessible') metadata.inaccessible_count--;
    
    metadata.videos[existingIndex] = {
      video_id: newVideoData.video_id,
      status: newVideoData.status,
      quality: newVideoData.quality,
      analyzed_at: newVideoData.analyzed_at,
      keywords: newVideoData.keywords,
    };
  } else {
    metadata.videos.push({
      video_id: newVideoData.video_id,
      status: newVideoData.status,
      quality: newVideoData.quality,
      analyzed_at: newVideoData.analyzed_at,
      keywords: newVideoData.keywords,
    });
  }
  
  if (newVideoData.quality === 'high') metadata.high_quality_count++;
  if (newVideoData.quality === 'low') metadata.low_quality_count++;
  if (newVideoData.quality === 'inaccessible') metadata.inaccessible_count++;
  
  metadata.total_videos = metadata.videos.length;
  
  if (metadata.total_videos > 0) {
    metadata.high_quality_ratio = ((metadata.high_quality_count / metadata.total_videos) * 100).toFixed(1) + '%';
    metadata.low_quality_ratio = ((metadata.low_quality_count / metadata.total_videos) * 100).toFixed(1) + '%';
  }
  
  metadata.last_analyzed_at = newVideoData.analyzed_at;
  
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  
  return metadata;
}

function syncBloggerFile(author, secUid) {
  const bloggerDirName = getBloggerFileName(author, secUid).replace('.md', '');
  const bloggerPath = path.join(bloggersDir, `${bloggerDirName}.md`);
  const metadataPath = path.join(resultsDir, bloggerDirName, 'metadata.json');
  
  if (!fs.existsSync(metadataPath)) {
    console.log(`  ⚠️ 无 metadata.json`);
    return;
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  
  let content = fs.readFileSync(bloggerPath, 'utf-8');
  
  content = content.replace(/\| 已分析视频数 \| [^|]+ \|/, `| 已分析视频数 | ${metadata.total_videos} |`);
  content = content.replace(/\| 高质量视频数 \| [^|]+ \|/, `| 高质量视频数 | ${metadata.high_quality_count} |`);
  content = content.replace(/\| 低质量视频数 \| [^|]+ \|/, `| 低质量视频数 | ${metadata.low_quality_count} |`);
  content = content.replace(/\| 不可访问视频数 \| [^|]+ \|/, `| 不可访问视频数 | ${metadata.inaccessible_count} |`);
  content = content.replace(/\| 高质量比例 \| [^|]+ \|/, `| 高质量比例 | ${metadata.high_quality_ratio} |`);
  content = content.replace(/\| 低质量比例 \| [^|]+ \|/, `| 低质量比例 | ${metadata.low_quality_ratio} |`);
  content = content.replace(/\| 最后分析时间 \| [^|]+ \|/, `| 最后分析时间 | ${metadata.last_analyzed_at} |`);
  
  fs.writeFileSync(bloggerPath, content, 'utf-8');
}

console.log('========== 模拟数据流转测试 ==========\n');

const testBlogger = '胡说老王（干货版）';
const secUid = findBloggerSecUid(testBlogger);

console.log('--- 步骤 1: 模拟写入高质量视频 ---\n');

const video1 = {
  aweme_id: '9999999999999999991',
  url: 'https://www.douyin.com/video/9999999999999999991',
  author: testBlogger,
  author_id: '7611552797049717797',
  title: '测试视频1：如何从零开始做副业',
};

const analysis1 = `这是一个关于副业创业的视频分析。

第一阶段：拆解底层逻辑
- 逻辑链路：从技能盘点到变现路径
- 内容质量：高

关键词：副业、创业、技能变现、线上项目
领域：创业副业
博主一句话总结：分享实用的副业创业方法论`;

const result1 = saveAnalysisResult(video1, analysis1, 'success');
console.log(`✅ 写入视频 JSON: ${result1}`);

const metadata1 = JSON.parse(fs.readFileSync(path.join(resultsDir, getBloggerFileName(testBlogger, secUid).replace('.md', ''), 'metadata.json'), 'utf-8'));
console.log(`✅ metadata 更新: 总视频=${metadata1.total_videos}, 高质量=${metadata1.high_quality_count}`);

syncBloggerFile(testBlogger, secUid);
console.log(`✅ 博主文件同步\n`);

console.log('--- 步骤 2: 模拟写入低质量视频 ---\n');

const video2 = {
  aweme_id: '9999999999999999992',
  url: 'https://www.douyin.com/video/9999999999999999992',
  author: testBlogger,
  author_id: '7611552797049717797',
  title: '测试视频2：低质量内容',
};

const analysis2 = `关键词：未提及
领域：未提及
博主一句话总结：未提及`;

const result2 = saveAnalysisResult(video2, analysis2, 'low_quality');
console.log(`✅ 写入视频 JSON: ${result2}`);

const metadata2 = JSON.parse(fs.readFileSync(path.join(resultsDir, getBloggerFileName(testBlogger, secUid).replace('.md', ''), 'metadata.json'), 'utf-8'));
console.log(`✅ metadata 更新: 总视频=${metadata2.total_videos}, 高质量=${metadata2.high_quality_count}, 低质量=${metadata2.low_quality_count}`);
console.log(`   高质量比例: ${metadata2.high_quality_ratio}, 低质量比例: ${metadata2.low_quality_ratio}`);

syncBloggerFile(testBlogger, secUid);
console.log(`✅ 博主文件同步\n`);

console.log('--- 步骤 3: 验证数据流转 ---\n');

const bloggerFile = path.join(bloggersDir, getBloggerFileName(testBlogger, secUid));
const bloggerContent = fs.readFileSync(bloggerFile, 'utf-8');

const analyzedMatch = bloggerContent.match(/\| 已分析视频数 \| (\d+) \|/);
const highMatch = bloggerContent.match(/\| 高质量视频数 \| (\d+) \|/);
const lowMatch = bloggerContent.match(/\| 低质量视频数 \| (\d+) \|/);
const ratioMatch = bloggerContent.match(/\| 高质量比例 \| ([^|]+) \|/);

console.log(`博主文件统计:`);
console.log(`  已分析视频数: ${analyzedMatch ? analyzedMatch[1] : '未找到'}`);
console.log(`  高质量视频数: ${highMatch ? highMatch[1] : '未找到'}`);
console.log(`  低质量视频数: ${lowMatch ? lowMatch[1] : '未找到'}`);
console.log(`  高质量比例: ${ratioMatch ? ratioMatch[1].trim() : '未找到'}`);

const videoJsonPath = path.join(resultsDir, getBloggerFileName(testBlogger, secUid).replace('.md', ''), 'videos', '9999999999999999991.json');
const videoJson = JSON.parse(fs.readFileSync(videoJsonPath, 'utf-8'));
console.log(`\n视频 JSON 内容:`);
console.log(`  video_id: ${videoJson.video_id}`);
console.log(`  status: ${videoJson.status}`);
console.log(`  quality: ${videoJson.quality}`);
console.log(`  keywords: ${videoJson.keywords.join(', ')}`);

console.log('\n--- 步骤 4: 清理测试数据 ---\n');

fs.unlinkSync(path.join(resultsDir, getBloggerFileName(testBlogger, secUid).replace('.md', ''), 'videos', '9999999999999999991.json'));
fs.unlinkSync(path.join(resultsDir, getBloggerFileName(testBlogger, secUid).replace('.md', ''), 'videos', '9999999999999999992.json'));

const cleanMetadata = JSON.parse(fs.readFileSync(path.join(resultsDir, getBloggerFileName(testBlogger, secUid).replace('.md', ''), 'metadata.json'), 'utf-8'));
cleanMetadata.videos = cleanMetadata.videos.filter(v => !v.video_id.startsWith('999999'));
cleanMetadata.total_videos = cleanMetadata.videos.length;
cleanMetadata.high_quality_count = cleanMetadata.videos.filter(v => v.quality === 'high').length;
cleanMetadata.low_quality_count = cleanMetadata.videos.filter(v => v.quality === 'low').length;
cleanMetadata.inaccessible_count = cleanMetadata.videos.filter(v => v.quality === 'inaccessible').length;

if (cleanMetadata.total_videos > 0) {
  cleanMetadata.high_quality_ratio = ((cleanMetadata.high_quality_count / cleanMetadata.total_videos) * 100).toFixed(1) + '%';
  cleanMetadata.low_quality_ratio = ((cleanMetadata.low_quality_count / cleanMetadata.total_videos) * 100).toFixed(1) + '%';
} else {
  cleanMetadata.high_quality_ratio = '0%';
  cleanMetadata.low_quality_ratio = '0%';
}

fs.writeFileSync(
  path.join(resultsDir, getBloggerFileName(testBlogger, secUid).replace('.md', ''), 'metadata.json'),
  JSON.stringify(cleanMetadata, null, 2),
  'utf-8'
);

syncBloggerFile(testBlogger, secUid);

console.log(`✅ 测试数据已清理`);
console.log(`✅ 原始数据已恢复\n`);

console.log('========== 测试完成 ==========\n');
