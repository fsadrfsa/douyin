const fs = require('fs');
const path = require('path');

const resultsDir = 'd:\\opencli\\douyin-videos\\results';

console.log('========== 输出文件结构验证 ==========\n');

const bloggerDirs = fs.readdirSync(resultsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`发现 ${bloggerDirs.length} 个博主目录\n`);

let totalVideos = 0;
let highQualityCount = 0;
let lowQualityCount = 0;
let inaccessibleCount = 0;
let withProjectInfo = 0;
let withoutProjectInfo = 0;

const sampleFiles = [];

for (const bloggerDir of bloggerDirs) {
  const bloggerPath = path.join(resultsDir, bloggerDir);
  const videosPath = path.join(bloggerPath, 'videos');
  
  if (!fs.existsSync(videosPath)) {
    continue;
  }
  
  const videoFiles = fs.readdirSync(videosPath)
    .filter(file => file.endsWith('.json'));
  
  for (const videoFile of videoFiles) {
    totalVideos++;
    const videoPath = path.join(videosPath, videoFile);
    
    try {
      const content = fs.readFileSync(videoPath, 'utf-8');
      const videoData = JSON.parse(content);
      
      if (videoData.quality === 'high') {
        highQualityCount++;
        if (videoData.project_related) {
          withProjectInfo++;
        } else {
          withoutProjectInfo++;
        }
        if (sampleFiles.length < 3) {
          sampleFiles.push({
            file: videoPath,
            data: videoData
          });
        }
      } else if (videoData.quality === 'low') {
        lowQualityCount++;
      } else if (videoData.quality === 'inaccessible') {
        inaccessibleCount++;
      }
      
      const requiredFields = [
        'video_id', 'url', 'author', 'analyzed_at', 'status', 'quality'
      ];
      
      const missingFields = requiredFields.filter(field => !videoData[field]);
      if (missingFields.length > 0) {
        console.log(`⚠️  ${videoFile} 缺少必填字段: ${missingFields.join(', ')}`);
      }
      
      if (videoData.quality === 'high') {
        const newFields = ['project_related', 'project_name', 'how_to_do'];
        const missingNewFields = newFields.filter(field => videoData[field] === undefined);
        if (missingNewFields.length > 0) {
          console.log(`⚠️  ${videoFile} 缺少新字段: ${missingNewFields.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ${videoFile} 解析失败: ${error.message}`);
    }
  }
}

console.log('========== 统计结果 ==========\n');
console.log(`总视频数: ${totalVideos}`);
console.log(`高质量: ${highQualityCount}`);
console.log(`低质量: ${lowQualityCount}`);
console.log(`不可访问: ${inaccessibleCount}`);
console.log(`包含项目信息: ${withProjectInfo}`);
console.log(`不包含项目信息: ${withoutProjectInfo}`);

console.log('\n========== 示例文件结构 ==========\n');

for (const sample of sampleFiles) {
  console.log(`文件: ${sample.file}`);
  console.log('结构:');
  console.log(JSON.stringify(sample.data, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');
}

console.log('========== 字段验证 ==========\n');

if (sampleFiles.length > 0) {
  const sample = sampleFiles[0].data;
  
  console.log('必填字段检查:');
  console.log(`  video_id: ${sample.video_id ? '✅' : '❌'}`);
  console.log(`  url: ${sample.url ? '✅' : '❌'}`);
  console.log(`  author: ${sample.author ? '✅' : '❌'}`);
  console.log(`  analyzed_at: ${sample.analyzed_at ? '✅' : '❌'}`);
  console.log(`  status: ${sample.status ? '✅' : '❌'}`);
  console.log(`  quality: ${sample.quality ? '✅' : '❌'}`);
  
  console.log('\n新字段检查 (高质量视频):');
  console.log(`  project_related: ${sample.project_related !== undefined ? '✅' : '❌'} (${sample.project_related})`);
  console.log(`  project_name: ${sample.project_name ? '✅' : '⚠️ '} (${sample.project_name || 'null'})`);
  console.log(`  how_to_do: ${sample.how_to_do ? '✅' : '⚠️ '} (${sample.how_to_do || 'null'})`);
  console.log(`  investment: ${sample.investment !== undefined ? '✅' : '❌'} (${sample.investment || 'null'})`);
  console.log(`  return: ${sample['return'] !== undefined ? '✅' : '❌'} (${sample['return'] || 'null'})`);
  console.log(`  target: ${sample.target !== undefined ? '✅' : '❌'} (${sample.target || 'null'})`);
  console.log(`  risks: ${sample.risks !== undefined ? '✅' : '❌'} (${sample.risks || 'null'})`);
  
  console.log('\n旧字段检查 (应该已移除):');
  console.log(`  said: ${sample.said === undefined ? '✅ 已移除' : '❌ 仍存在'}`);
  console.log(`  did: ${sample.did === undefined ? '✅ 已移除' : '❌ 仍存在'}`);
  console.log(`  purpose: ${sample.purpose === undefined ? '✅ 已移除' : '❌ 仍存在'}`);
  console.log(`  gain: ${sample.gain === undefined ? '✅ 已移除' : '❌ 仍存在'}`);
}

console.log('\n验证完成！');
