const fs = require('fs');
const path = require('path');

const dataDir = 'd:/opencli/douyin-videos';
const dataFilesDir = path.join(dataDir, 'data');
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

function getVideoTitleFromBloggerFile(video) {
  const secUid = findBloggerSecUid(video.author);
  const fileName = getBloggerFileName(video.author, secUid);
  const bloggerPath = path.join(dataDir, 'bloggers', fileName);
  
  if (fs.existsSync(bloggerPath)) {
    const content = fs.readFileSync(bloggerPath, 'utf-8');
    const titleMatch = content.match(new RegExp(`\\| ${video.aweme_id} \\|.*\\| ([^|]+) \\|`));
    if (titleMatch) return titleMatch[1].trim();
  }
  return `视频 ${video.aweme_id}`;
}

console.log('========== 修复低质量 results 文件格式 ==========\n');

const bloggerDirs = fs.readdirSync(resultsDir);

for (const bloggerDir of bloggerDirs) {
  const bloggerPath = path.join(resultsDir, bloggerDir);
  if (!fs.statSync(bloggerPath).isDirectory()) continue;
  
  const dateDirs = fs.readdirSync(bloggerPath);
  
  for (const dateDir of dateDirs) {
    const datePath = path.join(bloggerPath, dateDir);
    const files = fs.readdirSync(datePath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(datePath, file);
      let content = fs.readFileSync(filePath, 'utf-8');
      
      if (!content.includes('# 视频分析结果')) {
        const videoId = file.replace('.md', '');
        const bloggerName = bloggerDir.replace(/_MS4wLjAB.*$/, '');
        
        const videosPath = path.join(dataFilesDir, 'videos.json');
        let videoUrl = `https://www.douyin.com/video/${videoId}`;
        let authorId = '-';
        
        if (fs.existsSync(videosPath)) {
          const videos = JSON.parse(fs.readFileSync(videosPath, 'utf-8'));
          const video = videos.find(v => v.aweme_id === videoId);
          if (video) {
            videoUrl = video.url || videoUrl;
            authorId = video.author_id || '-';
          }
        }
        
        const videoTitle = getVideoTitleFromBloggerFile({ aweme_id: videoId, author: bloggerName });
        
        const fixedContent = `# 视频分析结果

**视频ID**: ${videoId}
**URL**: ${videoUrl}
**分析时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
**分析方式**: 视频链接分析

---

## 博主信息

| 属性 | 值 |
|------|-----|
| 博主名称 | ${bloggerName} |
| 博主ID | ${authorId} |
| 视频标题 | ${videoTitle} |

---

## 详细分析

${content}

---

**分析完成时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
`;
        
        fs.writeFileSync(filePath, fixedContent, 'utf-8');
        console.log(`✅ 修复格式: ${bloggerDir}/${dateDir}/${file}`);
      }
    }
  }
}

console.log('\n========== 完成 ==========\n');
