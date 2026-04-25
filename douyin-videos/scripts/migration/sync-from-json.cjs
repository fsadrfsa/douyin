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

console.log('========== 从 JSON 同步博主文件 ==========\n');

const bloggerFiles = fs.readdirSync(bloggersDir).filter(f => f.endsWith('.md'));

for (const bloggerFile of bloggerFiles) {
  const bloggerPath = path.join(bloggersDir, bloggerFile);
  let content = fs.readFileSync(bloggerPath, 'utf-8');
  
  const nameMatch = content.match(/\| 博主名称 \| ([^|]+) \|/);
  const bloggerName = nameMatch ? nameMatch[1].trim() : bloggerFile.replace('.md', '');
  
  const secUidMatch = content.match(/\| sec_uid \| ([^|]+) \|/);
  const secUid = secUidMatch ? secUidMatch[1].trim() : null;
  
  const bloggerDirName = getBloggerFileName(bloggerName, secUid).replace('.md', '');
  const metadataPath = path.join(resultsDir, bloggerDirName, 'metadata.json');
  
  if (!fs.existsSync(metadataPath)) {
    console.log(`⏭️  ${bloggerName} - 无 JSON 数据`);
    continue;
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  
  content = content.replace(/\| 已分析视频数 \| [^|]+ \|/, `| 已分析视频数 | ${metadata.total_videos || 0} |`);
  content = content.replace(/\| 高质量视频数 \| [^|]+ \|/, `| 高质量视频数 | ${metadata.high_quality_count || 0} |`);
  content = content.replace(/\| 低质量视频数 \| [^|]+ \|/, `| 低质量视频数 | ${metadata.low_quality_count || 0} |`);
  content = content.replace(/\| 不可访问视频数 \| [^|]+ \|/, `| 不可访问视频数 | ${metadata.inaccessible_count || 0} |`);
  content = content.replace(/\| 高质量比例 \| [^|]+ \|/, `| 高质量比例 | ${metadata.high_quality_ratio || '-'} |`);
  content = content.replace(/\| 低质量比例 \| [^|]+ \|/, `| 低质量比例 | ${metadata.low_quality_ratio || '-'} |`);
  
  if (metadata.last_analyzed_at) {
    content = content.replace(/\| 最后分析时间 \| [^|]+ \|/, `| 最后分析时间 | ${metadata.last_analyzed_at} |`);
  }
  
  const videosDir = path.join(resultsDir, bloggerDirName, 'videos');
  if (fs.existsSync(videosDir)) {
    const videoFiles = fs.readdirSync(videosDir).filter(f => f.endsWith('.json'));
    
    const recordSection = content.indexOf('## 📹 视频分析记录');
    if (recordSection !== -1) {
      content = content.slice(0, recordSection + '## 📹 视频分析记录\n\n'.length);
    } else {
      content = content.trimEnd() + '\n\n## 📹 视频分析记录\n\n';
    }
    
    for (const videoFile of videoFiles) {
      const videoPath = path.join(videosDir, videoFile);
      const videoData = JSON.parse(fs.readFileSync(videoPath, 'utf-8'));
      
      const record = `| 属性 | 值 |
|------|-----|
| 视频标题 | ${videoData.title} |
| 视频ID | ${videoData.video_id} |
| 视频URL | [查看视频](${videoData.url}) |
| 状态 | ${videoData.status === 'success' ? '成功' : (videoData.status === 'low_quality' ? '低质量' : '不可访问')} |
| 分析结果 | [查看分析](../results/${bloggerDirName}/videos/${videoData.video_id}.json) |
| 分析时间 | ${videoData.analyzed_at} |
| 个人总结 | ${videoData.summary || '无'} |
| 领域 | ${videoData.category || '未分类'} |
| 关键词 | ${(videoData.keywords || []).join('、') || '无'} |
---
`;
      content += record + '\n';
    }
  }
  
  fs.writeFileSync(bloggerPath, content, 'utf-8');
  console.log(`✅ ${bloggerName}: ${metadata.total_videos || 0} 个视频`);
}

console.log('\n========== 同步完成 ==========\n');
