import fs from 'fs';

const mismatched = JSON.parse(fs.readFileSync('d:/opencli/douyin-videos/mismatched-videos.json', 'utf-8'));
const mismatchedIds = new Set(mismatched.map(m => m.aweme_id));

const data = JSON.parse(fs.readFileSync('d:/opencli/douyin-videos/data/videos.json', 'utf-8'));
const originalCount = data.videos.length;

// 过滤掉不匹配的视频
data.videos = data.videos.filter(v => !mismatchedIds.has(v.aweme_id));
const newCount = data.videos.length;

// 保存
fs.writeFileSync('d:/opencli/douyin-videos/data/videos.json', JSON.stringify(data, null, 2));

console.log('删除不匹配视频:');
console.log('  原始数量: ' + originalCount);
console.log('  删除数量: ' + mismatchedIds.size);
console.log('  剩余数量: ' + newCount);
console.log('\n已更新 videos.json');
