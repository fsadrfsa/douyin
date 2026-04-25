const fs = require('fs');

const videosPath = 'd:\\opencli\\douyin-videos\\data\\videos.json';
const data = JSON.parse(fs.readFileSync(videosPath, 'utf8'));

const today = '2026-04-13';
const todayVideos = data.videos.filter(v => v.collect_time && v.collect_time.startsWith(today));

console.log('========================================');
console.log('今天（2026-04-13）的视频链接检查');
console.log('========================================\n');

const bloggers = {};
todayVideos.forEach(v => {
  if (!bloggers[v.author]) {
    bloggers[v.author] = {
      name: v.author,
      author_id: v.author_id,
      sec_uid: v.sec_uid,
      videos: [],
      hasUrl: false
    };
  }
  
  bloggers[v.author].videos.push({
    aweme_id: v.aweme_id,
    url: v.url,
    title: v.title
  });
  
  if (v.url && v.url.trim() !== '') {
    bloggers[v.author].hasUrl = true;
  }
});

const bloggersWithoutUrl = Object.values(bloggers).filter(b => !b.hasUrl);

console.log('总博主数:', Object.keys(bloggers).length);
console.log('没有链接的博主数:', bloggersWithoutUrl.length);
console.log('');

if (bloggersWithoutUrl.length > 0) {
  console.log('========================================');
  console.log('没有链接的博主列表');
  console.log('========================================\n');
  
  bloggersWithoutUrl.forEach((blogger, index) => {
    console.log((index + 1) + '. ' + blogger.name);
    console.log('   author_id: ' + blogger.author_id);
    console.log('   sec_uid: ' + blogger.sec_uid);
    console.log('   视频数: ' + blogger.videos.length);
    console.log('   视频ID: ' + blogger.videos.map(v => v.aweme_id).join(', '));
    console.log('');
  });
} else {
  console.log('✅ 所有博主都有链接');
}

console.log('\n========================================');
console.log('博主详情统计');
console.log('========================================\n');

Object.values(bloggers).forEach(blogger => {
  const videosWithUrl = blogger.videos.filter(v => v.url && v.url.trim() !== '').length;
  const videosWithoutUrl = blogger.videos.filter(v => !v.url || v.url.trim() === '').length;
  
  console.log(blogger.name + ':');
  console.log('  总视频数: ' + blogger.videos.length);
  console.log('  有链接: ' + videosWithUrl);
  console.log('  无链接: ' + videosWithoutUrl);
  console.log('');
});
