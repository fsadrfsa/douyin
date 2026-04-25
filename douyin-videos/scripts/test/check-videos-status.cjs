const fs = require('fs');

const videosPath = 'd:\\opencli\\douyin-videos\\data\\videos.json';
const data = JSON.parse(fs.readFileSync(videosPath, 'utf8'));

console.log('========================================');
console.log('videos.json 视频处理统计');
console.log('========================================\n');

const totalVideos = data.videos.length;
const statusCount = {};
const stage4StatusCount = {};

data.videos.forEach(video => {
  const status = video.status || 'unknown';
  statusCount[status] = (statusCount[status] || 0) + 1;
  
  if (video.stage4_status) {
    stage4StatusCount[video.stage4_status] = (stage4StatusCount[video.stage4_status] || 0) + 1;
  }
});

console.log('总视频数:', totalVideos);
console.log('\n========================================');
console.log('视频状态统计');
console.log('========================================\n');

Object.entries(statusCount).forEach(([status, count]) => {
  const percentage = ((count / totalVideos) * 100).toFixed(1);
  console.log(status + ': ' + count + ' (' + percentage + '%)');
});

if (Object.keys(stage4StatusCount).length > 0) {
  console.log('\n========================================');
  console.log('阶段四状态统计');
  console.log('========================================\n');
  
  Object.entries(stage4StatusCount).forEach(([status, count]) => {
    console.log(status + ': ' + count);
  });
}

console.log('\n========================================');
console.log('处理进度');
console.log('========================================\n');

const processed = (statusCount['success'] || 0) + 
                  (statusCount['low_quality'] || 0) + 
                  (statusCount['inaccessible'] || 0);
const pending = statusCount['pending'] || 0;
const failed = stage4StatusCount['failed_analysis'] || 0;

console.log('已处理: ' + processed);
console.log('待处理: ' + pending);
console.log('处理失败: ' + failed);
console.log('处理进度: ' + ((processed / totalVideos) * 100).toFixed(1) + '%');

console.log('\n========================================');
console.log('博主统计');
console.log('========================================\n');

const bloggers = {};
data.videos.forEach(video => {
  if (!bloggers[video.author]) {
    bloggers[video.author] = {
      total: 0,
      pending: 0,
      processed: 0
    };
  }
  bloggers[video.author].total++;
  
  if (video.status === 'pending') {
    bloggers[video.author].pending++;
  } else {
    bloggers[video.author].processed++;
  }
});

Object.entries(bloggers).forEach(([author, stats]) => {
  console.log(author + ':');
  console.log('  总视频: ' + stats.total);
  console.log('  已处理: ' + stats.processed);
  console.log('  待处理: ' + stats.pending);
  console.log('');
});
