const fs = require('fs');
const path = require('path');

const dataDir = 'd:/opencli/douyin-videos';
const dataFilesDir = path.join(dataDir, 'data');
const bloggersDir = path.join(dataDir, 'bloggers');
const resultsDir = path.join(dataDir, 'results');

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

function getVideoTitleFromResult(result) {
  const titleMatch = result.match(/\| 视频标题 \| ([^|]+) \|/);
  if (titleMatch) return titleMatch[1].trim();
  return null;
}

function getAnalysisTimeFromResult(result) {
  const timeMatch = result.match(/\*\*分析时间\*\*:\s*([^\n]+)/);
  if (timeMatch) return timeMatch[1].trim();
  return null;
}

console.log('========== 补充视频分析记录 ==========\n');

const bloggerFiles = fs.readdirSync(bloggersDir).filter(f => f.endsWith('.md'));

for (const bloggerFile of bloggerFiles) {
  const bloggerPath = path.join(bloggersDir, bloggerFile);
  let content = fs.readFileSync(bloggerPath, 'utf-8');
  
  const nameMatch = content.match(/\| 博主名称 \| ([^|]+) \|/);
  const bloggerName = nameMatch ? nameMatch[1].trim() : bloggerFile.replace('.md', '');
  
  const secUidMatch = content.match(/\| sec_uid \| ([^|]+) \|/);
  const secUid = secUidMatch ? secUidMatch[1].trim() : null;
  
  const expectedResultsDir = getBloggerFileName(bloggerName, secUid).replace('.md', '');
  const resultsBloggerPath = path.join(resultsDir, expectedResultsDir);
  
  if (!fs.existsSync(resultsBloggerPath)) {
    continue;
  }
  
  const recordSectionMatch = content.match(/## 📹 视频分析记录\n\n/);
  if (!recordSectionMatch) {
    console.log(`⚠️  ${bloggerName} - 视频分析记录格式异常`);
    continue;
  }
  
  const hasVideoRecord = content.includes('| 视频ID |');
  if (hasVideoRecord) {
    console.log(`⏭️  ${bloggerName} - 已有视频记录，跳过`);
    continue;
  }
  
  const videoRecords = [];
  const dateDirs = fs.readdirSync(resultsBloggerPath);
  
  for (const dateDir of dateDirs) {
    const datePath = path.join(resultsBloggerPath, dateDir);
    const files = fs.readdirSync(datePath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(datePath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      const videoIdMatch = fileContent.match(/\*\*视频ID\*\*:\s*(\d+)/);
      const urlMatch = fileContent.match(/\*\*URL\*\*:\s*([^\n]+)/);
      
      if (!videoIdMatch) continue;
      
      const videoId = videoIdMatch[1];
      const url = urlMatch ? urlMatch[1].trim() : `https://www.douyin.com/video/${videoId}`;
      
      const { keywords, category, summary } = extractKeywordsAndCategory(fileContent);
      const videoTitle = getVideoTitleFromResult(fileContent) || `视频 ${videoId}`;
      const analysisTime = getAnalysisTimeFromResult(fileContent) || new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      
      const isLowQuality = fileContent.includes('未提及') || keywords.length === 0;
      const status = isLowQuality ? '低质量' : '成功';
      
      const analysisFilePath = `../results/${expectedResultsDir}/${dateDir}/${videoId}.md`;
      
      const record = `| 属性 | 值 |
|------|-----|
| 视频标题 | ${videoTitle} |
| 视频ID | ${videoId} |
| 视频URL | [查看视频](${url}) |
| 状态 | ${status} |
| 分析结果 | [查看分析](${analysisFilePath}) |
| 分析时间 | ${analysisTime} |
| 个人总结 | ${summary || '无'} |
| 领域 | ${category || '未分类'} |
| 关键词 | ${keywords.join('、') || '无'} |
---
`;
      
      videoRecords.push({ dateDir, record, videoId });
    }
  }
  
  if (videoRecords.length === 0) {
    console.log(`⚠️  ${bloggerName} - 无视频记录可补充`);
    continue;
  }
  
  videoRecords.sort((a, b) => b.videoId.localeCompare(a.videoId));
  
  const recordSection = '## 📹 视频分析记录\n\n';
  const insertPos = content.indexOf(recordSection) + recordSection.length;
  
  const allRecords = videoRecords.map(v => v.record).join('\n');
  content = content.slice(0, insertPos) + allRecords + content.slice(insertPos);
  
  const lastAnalysisTime = videoRecords[0].record.match(/\| 分析时间 \| ([^|]+) \|/);
  if (lastAnalysisTime) {
    content = content.replace(/\| 最后分析时间 \| [^|]+ \|/, `| 最后分析时间 | ${lastAnalysisTime[1].trim()} |`);
  }
  
  fs.writeFileSync(bloggerPath, content, 'utf-8');
  console.log(`✅ ${bloggerName} - 补充 ${videoRecords.length} 条视频记录`);
}

console.log('\n========== 完成 ==========\n');
