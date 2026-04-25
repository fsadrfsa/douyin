import fs from 'fs';
const videos = JSON.parse(fs.readFileSync('d:/opencli/douyin-videos/data/videos.json', 'utf-8')).videos;

// 分析所有视频的时间分布
const timeGroups = {};
videos.forEach(v => {
  const date = v.collect_time?.split('T')[0] || 'unknown';
  if (!timeGroups[date]) timeGroups[date] = [];
  timeGroups[date].push(v);
});

console.log('视频收集时间分布:');
Object.keys(timeGroups).sort().forEach(date => {
  const dayVideos = timeGroups[date];
  const undefinedCount = dayVideos.filter(v => v.stage2_status === undefined).length;
  console.log(date + ': ' + dayVideos.length + ' 个视频 (stage2_status=undefined: ' + undefinedCount + ')');
});

// 分析 stage2_status 分布
const statusGroups = {};
videos.forEach(v => {
  const status = v.stage2_status || 'undefined';
  if (!statusGroups[status]) statusGroups[status] = [];
  statusGroups[status].push(v);
});

console.log('\nstage2_status 分布:');
Object.keys(statusGroups).forEach(status => {
  console.log(status + ': ' + statusGroups[status].length);
});
