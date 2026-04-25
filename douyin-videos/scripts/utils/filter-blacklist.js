import fs from 'fs';

const data = JSON.parse(fs.readFileSync('inaccessible-videos.json', 'utf8'));

const blacklistAuthorIds = [
  '145549815711955',  // 小胖讲AI
  '1522189770962935', // 慢炖AI
  '100702500820',     // 廖老大
  '61999502856',      // 德良精读
  '111375584040',     // 蛋仔wang
  '99863954409',      // 阿伦聊餐饮
];

const filteredVideos = data.videos.filter(v => !blacklistAuthorIds.includes(v.author_id));

console.log('原始记录数:', data.videos.length);
console.log('删除记录数:', data.videos.length - filteredVideos.length);
console.log('剩余记录数:', filteredVideos.length);

data.videos = filteredVideos;
data.updated_at = new Date().toISOString();

fs.writeFileSync('inaccessible-videos.json', JSON.stringify(data, null, 2), 'utf8');
console.log('\n已更新 inaccessible-videos.json');
