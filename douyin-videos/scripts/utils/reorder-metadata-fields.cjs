const fs = require('fs');
const path = require('path');

const resultsDir = 'd:\\opencli\\douyin-videos\\results';
const archivedDir = 'd:\\opencli\\douyin-videos\\archived';

const orderedFields = [
  'blogger_name',
  'blogger_id',
  'sec_uid',
  'blogger_url',
  'avatar_url',
  'follower_count',
  'following_count',
  'likes_count',
  'video_count',
  'douyin_id',
  'ip_location',
  'gender',
  'signature',
  'score',
  'source_keyword',
  'discovered_at',
  'last_fetch_time',
  'collected_video_count',
  'summary',
  'relevance_score',
  'total_videos',
  'high_quality_count',
  'low_quality_count',
  'inaccessible_count',
  'high_quality_ratio',
  'low_quality_ratio',
  'project_related_count',
  'project_names',
  'last_analyzed_at',
  'comment_analysis',
  'comment_data',
  'videos',
];

function reorderObject(obj) {
  const ordered = {};
  
  for (const field of orderedFields) {
    if (obj.hasOwnProperty(field)) {
      ordered[field] = obj[field];
    }
  }
  
  for (const key of Object.keys(obj)) {
    if (!ordered.hasOwnProperty(key)) {
      ordered[key] = obj[key];
    }
  }
  
  return ordered;
}

function processMetadataFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = JSON.parse(content);
    
    const reordered = reorderObject(metadata);
    
    if (JSON.stringify(reordered) !== JSON.stringify(metadata)) {
      fs.writeFileSync(filePath, JSON.stringify(reordered, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (e) {
    console.log(`  ❌ 处理失败: ${e.message}`);
    return false;
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return 0;
  
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const metadataPath = path.join(dir, entry.name, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        console.log(`处理: ${entry.name}`);
        if (processMetadataFile(metadataPath)) {
          console.log(`  ✅ 字段顺序已调整`);
          count++;
        } else {
          console.log(`  ⏭️ 无需调整`);
        }
      }
    }
  }
  
  return count;
}

console.log('========== 重新排序 metadata.json 字段 ==========\n');
console.log(`summary 字段将移到博主详细信息部分\n`);

console.log('--- 处理 results 目录 ---\n');
const resultsCount = processDirectory(resultsDir);

console.log('\n--- 处理 archived 目录 ---\n');
const archivedCount = processDirectory(archivedDir);

console.log('\n========== 完成 ==========');
console.log(`results 目录: 调整了 ${resultsCount} 个文件`);
console.log(`archived 目录: 调整了 ${archivedCount} 个文件`);
console.log(`总计: 调整了 ${resultsCount + archivedCount} 个文件`);
