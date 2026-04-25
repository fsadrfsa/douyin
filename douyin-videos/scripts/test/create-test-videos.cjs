const fs = require('fs');
const path = require('path');

const testVideos = [
  {
    name: '高质量视频',
    aweme_id: '7627121122303085876',
    url: 'https://www.douyin.com/video/7627121122303085876',
    author: '胡说老王（干货版）',
    author_id: '7611552797049717797',
    expected_quality: 'high'
  },
  {
    name: '低质量视频',
    aweme_id: '7627454031195016502',
    url: 'https://www.douyin.com/video/7627454031195016502',
    author: '魏成说商业',
    author_id: '1648864883912472',
    expected_quality: 'low'
  },
  {
    name: '不可访问视频',
    aweme_id: '7569928185530436874',
    url: 'https://www.douyin.com/video/7569928185530436874',
    author: '王翊',
    author_id: '3261573619259626',
    expected_quality: 'inaccessible'
  }
];

fs.writeFileSync(
  path.join(__dirname, 'test-videos.json'),
  JSON.stringify(testVideos, null, 2),
  'utf-8'
);

console.log('测试视频列表已生成: test-videos.json\n');
console.log('测试视频:');
testVideos.forEach((v, i) => {
  console.log(`${i + 1}. ${v.name}`);
  console.log(`   URL: ${v.url}`);
  console.log(`   博主: ${v.author}`);
  console.log(`   预期质量: ${v.expected_quality}\n`);
});

console.log('执行命令: node clis/douyin-videos/stage3-video-analyze.js --test');
