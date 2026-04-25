const fs = require('fs');
const path = require('path');

const dataDir = 'd:/opencli/douyin-videos';
const dataFilesDir = path.join(dataDir, 'data');
const bloggersDir = path.join(dataDir, 'bloggers');
const resultsDir = path.join(dataDir, 'results');

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

function getBloggerDirName(author, secUid) {
  const sanitizedName = sanitizeFileName(author);
  const secUidPrefix = secUid ? `_${secUid.substring(0, 10)}` : '';
  return `${sanitizedName}${secUidPrefix}`;
}

console.log('========== 博主数据化迁移 ==========\n');

const bloggersJsonPath = path.join(dataFilesDir, 'bloggers.json');
const bloggers = JSON.parse(fs.readFileSync(bloggersJsonPath, 'utf-8'));

for (const blogger of bloggers) {
  const dirName = getBloggerDirName(blogger.name, blogger.sec_uid);
  const resultsBloggerDir = path.join(resultsDir, dirName);
  const metadataPath = path.join(resultsBloggerDir, 'metadata.json');
  
  if (!fs.existsSync(resultsBloggerDir)) {
    fs.mkdirSync(resultsBloggerDir, { recursive: true });
  }
  
  let metadata = {
    blogger_name: blogger.name,
    blogger_id: blogger.author_id,
    sec_uid: blogger.sec_uid,
    blogger_url: blogger.url,
    follower_count: blogger.follower_count || 0,
    video_count: blogger.video_count || 0,
    score: blogger.score || null,
    source_keyword: blogger.source_keyword || null,
    discovered_at: blogger.discovered_at || null,
    last_fetch_time: blogger.last_fetch_time || null,
    summary: blogger.summary || null,
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
      const existing = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      metadata = {
        ...metadata,
        summary: existing.summary || metadata.summary,
        total_videos: existing.total_videos || 0,
        high_quality_count: existing.high_quality_count || 0,
        low_quality_count: existing.low_quality_count || 0,
        inaccessible_count: existing.inaccessible_count || 0,
        high_quality_ratio: existing.high_quality_ratio || '0%',
        low_quality_ratio: existing.low_quality_ratio || '0%',
        last_analyzed_at: existing.last_analyzed_at || null,
        videos: existing.videos || [],
      };
    } catch (e) {}
  }
  
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`✅ ${blogger.name}: ${metadata.total_videos} 个视频`);
}

console.log('\n========== 迁移完成 ==========\n');
console.log('博主数据已合并到 results/{blogger}/metadata.json');
console.log('原 bloggers/ 目录可删除或保留作为备份\n');
