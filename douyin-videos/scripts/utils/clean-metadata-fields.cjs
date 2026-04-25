const fs = require('fs');
const path = require('path');

const resultsDir = 'd:\\opencli\\douyin-videos\\results';
const archivedDir = 'd:\\opencli\\douyin-videos\\archived';

const metadataFieldsToRemove = ['keywords_history', 'categories_history', 'summaries'];
const videoFieldsToRemove = ['category', 'summary'];

function cleanMetadataFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = JSON.parse(content);
    
    let modified = false;
    
    for (const field of metadataFieldsToRemove) {
      if (metadata.hasOwnProperty(field)) {
        delete metadata[field];
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (e) {
    console.log(`  ❌ 处理失败: ${e.message}`);
    return false;
  }
}

function cleanVideoFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const video = JSON.parse(content);
    
    let modified = false;
    
    for (const field of videoFieldsToRemove) {
      if (video.hasOwnProperty(field)) {
        delete video[field];
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(video, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (e) {
    console.log(`    ❌ 视频处理失败: ${e.message}`);
    return false;
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return { metadataCount: 0, videoCount: 0 };
  
  let metadataCount = 0;
  let videoCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const bloggerPath = path.join(dir, entry.name);
      const metadataPath = path.join(bloggerPath, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        console.log(`处理: ${entry.name}`);
        if (cleanMetadataFile(metadataPath)) {
          console.log(`  ✅ metadata.json 已清理`);
          metadataCount++;
        }
      }
      
      const videosDir = path.join(bloggerPath, 'videos');
      if (fs.existsSync(videosDir)) {
        const videoFiles = fs.readdirSync(videosDir).filter(f => f.endsWith('.json'));
        for (const videoFile of videoFiles) {
          const videoPath = path.join(videosDir, videoFile);
          if (cleanVideoFile(videoPath)) {
            console.log(`    ✅ ${videoFile} 已清理`);
            videoCount++;
          }
        }
      }
    }
  }
  
  return { metadataCount, videoCount };
}

console.log('========== 清理冗余字段 ==========\n');
console.log(`metadata.json 待移除字段: ${metadataFieldsToRemove.join(', ')}`);
console.log(`视频 JSON 待移除字段: ${videoFieldsToRemove.join(', ')}\n`);

console.log('--- 处理 results 目录 ---\n');
const resultsResult = processDirectory(resultsDir);

console.log('\n--- 处理 archived 目录 ---\n');
const archivedResult = processDirectory(archivedDir);

console.log('\n========== 清理完成 ==========');
console.log(`results 目录: 清理了 ${resultsResult.metadataCount} 个 metadata.json, ${resultsResult.videoCount} 个视频 JSON`);
console.log(`archived 目录: 清理了 ${archivedResult.metadataCount} 个 metadata.json, ${archivedResult.videoCount} 个视频 JSON`);
console.log(`总计: 清理了 ${resultsResult.metadataCount + archivedResult.metadataCount} 个 metadata.json, ${resultsResult.videoCount + archivedResult.videoCount} 个视频 JSON`);
