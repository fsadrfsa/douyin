import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./douyin-videos/data/videos.json', 'utf-8'));
const pending = data.videos.filter(v => v.status === 'pending');
console.log('总视频数:', data.videos.length);
console.log('待处理视频数:', pending.length);
console.log('\n前5个待处理视频:');
pending.slice(0, 5).forEach((v, i) => {
  console.log(`${i+1}. ${v.author} - ${v.title.substring(0, 50)}...`);
});
