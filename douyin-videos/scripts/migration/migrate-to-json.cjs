const fs = require('fs');
const path = require('path');

const dataDir = 'd:/opencli/douyin-videos';
const dataFilesDir = path.join(dataDir, 'data');
const resultsDir = path.join(dataDir, 'results');
const resultsJsonDir = path.join(dataDir, 'results-json');

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

function getBloggerDirName(author, secUid) {
  const sanitizedName = sanitizeFileName(author);
  const secUidPrefix = secUid ? `_${secUid.substring(0, 10)}` : '';
  return `${sanitizedName}${secUidPrefix}`;
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
    const keywordStr = keywordMatch[1].trim();
    keywords.push(
      ...keywordStr
        .split(/[,，、\s]+/)
        .filter((k) => k.length > 0 && k !== 'xxx' && k !== '未提及' && !k.includes('未提及'))
    );
  }
  
  const categoryMatch = result.match(/领域[：:]\s*([^\n]+)/);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
    if (category === 'xxx' || category === '未提及' || category.includes('未提及')) {
      category = '';
    }
  }
  
  const summaryMatch = result.match(/博主一句话总结[：:]\s*([^\n]+)/);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
    if (summary === 'xxx' || summary === '未提及' || summary.includes('未提及')) {
      summary = '';
    }
  }
  
  return {
    keywords: [...new Set(keywords)].slice(0, 10),
    category,
    summary,
  };
}

function parseMarkdownFile(filePath, bloggerName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const videoIdMatch = content.match(/\*\*视频ID\*\*:\s*(\d+)/);
  const urlMatch = content.match(/\*\*URL\*\*:\s*([^\n]+)/);
  const authorIdMatch = content.match(/\| 博主ID \| ([^|]+) \|/);
  const titleMatch = content.match(/\| 视频标题 \| ([^|]+) \|/);
  const timeMatch = content.match(/\*\*分析时间\*\*:\s*([^\n]+)/);
  
  const detailMatch = content.match(/## 详细分析\n\n([\s\S]*?)\n\n---/);
  const detailContent = detailMatch ? detailMatch[1].trim() : content;
  
  const { keywords, category, summary } = extractKeywordsAndCategory(detailContent);
  
  const isLowQuality = detailContent.includes('未提及') || keywords.length === 0;
  const isInaccessible = /无法访问|非公开|权限限制|视频不存在|已删除|下架/.test(detailContent);
  
  const videoId = videoIdMatch ? videoIdMatch[1] : path.basename(filePath, '.md');
  
  return {
    video_id: videoId,
    url: urlMatch ? urlMatch[1].trim() : `https://www.douyin.com/video/${videoId}`,
    author: bloggerName,
    author_id: authorIdMatch ? authorIdMatch[1].trim() : '-',
    title: titleMatch ? titleMatch[1].trim() : `视频 ${videoId}`,
    analyzed_at: timeMatch ? timeMatch[1].trim() : new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    status: isInaccessible ? 'inaccessible' : (isLowQuality ? 'low_quality' : 'success'),
    quality: isInaccessible ? 'inaccessible' : (isLowQuality ? 'low' : 'high'),
    keywords: keywords,
    analysis: detailContent,
  };
}

console.log('========== Markdown → JSON 迁移 ==========\n');

if (fs.existsSync(resultsJsonDir)) {
  fs.rmSync(resultsJsonDir, { recursive: true });
}
fs.mkdirSync(resultsJsonDir, { recursive: true });

const bloggerDirs = fs.readdirSync(resultsDir);
let totalVideos = 0;
let totalBloggers = 0;

for (const bloggerDir of bloggerDirs) {
  const bloggerPath = path.join(resultsDir, bloggerDir);
  if (!fs.statSync(bloggerPath).isDirectory()) continue;
  
  const bloggerName = bloggerDir.replace(/_MS4wLjAB.*$/, '');
  const secUid = findBloggerSecUid(bloggerName);
  const newDirName = getBloggerDirName(bloggerName, secUid);
  
  const newBloggerPath = path.join(resultsJsonDir, newDirName);
  const videosPath = path.join(newBloggerPath, 'videos');
  fs.mkdirSync(videosPath, { recursive: true });
  
  const dateDirs = fs.readdirSync(bloggerPath);
  const allVideos = [];
  
  for (const dateDir of dateDirs) {
    const datePath = path.join(bloggerPath, dateDir);
    const files = fs.readdirSync(datePath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(datePath, file);
      const videoData = parseMarkdownFile(filePath, bloggerName);
      
      const jsonFileName = `${videoData.video_id}.json`;
      const jsonFilePath = path.join(videosPath, jsonFileName);
      fs.writeFileSync(jsonFilePath, JSON.stringify(videoData, null, 2), 'utf-8');
      
      allVideos.push({
        video_id: videoData.video_id,
        status: videoData.status,
        quality: videoData.quality,
        analyzed_at: videoData.analyzed_at,
        keywords: videoData.keywords,
      });
      
      totalVideos++;
    }
  }
  
  const highQualityCount = allVideos.filter(v => v.quality === 'high').length;
  const lowQualityCount = allVideos.filter(v => v.quality === 'low').length;
  const inaccessibleCount = allVideos.filter(v => v.quality === 'inaccessible').length;
  
  const metadata = {
    blogger_name: bloggerName,
    blogger_id: null,
    sec_uid: secUid,
    total_videos: allVideos.length,
    high_quality_count: highQualityCount,
    low_quality_count: lowQualityCount,
    inaccessible_count: inaccessibleCount,
    high_quality_ratio: allVideos.length > 0 ? ((highQualityCount / allVideos.length) * 100).toFixed(1) + '%' : '0%',
    low_quality_ratio: allVideos.length > 0 ? ((lowQualityCount / allVideos.length) * 100).toFixed(1) + '%' : '0%',
    last_analyzed_at: allVideos.length > 0 ? allVideos[allVideos.length - 1].analyzed_at : null,
    videos: allVideos,
  };
  
  const bloggersPath = path.join(dataFilesDir, 'bloggers.json');
  if (fs.existsSync(bloggersPath)) {
    const bloggers = JSON.parse(fs.readFileSync(bloggersPath, 'utf-8'));
    const blogger = bloggers.find(b => b.name === bloggerName);
    if (blogger) {
      metadata.blogger_id = blogger.author_id;
    }
  }
  
  const metadataPath = path.join(newBloggerPath, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  
  console.log(`✅ ${bloggerName}: ${allVideos.length} 个视频`);
  totalBloggers++;
}

console.log(`\n========== 迁移完成 ==========`);
console.log(`博主数: ${totalBloggers}`);
console.log(`视频数: ${totalVideos}`);
console.log(`输出目录: ${resultsJsonDir}\n`);
