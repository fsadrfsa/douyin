const fs = require('fs');
const path = require('path');

const bloggersPath = 'd:/opencli/douyin-videos/data/bloggers.json';
const bloggersDir = 'd:/opencli/douyin-videos/bloggers';

const bloggers = JSON.parse(fs.readFileSync(bloggersPath, 'utf-8'));

for (const blogger of bloggers) {
  const fileName = blogger.name.replace(/[\\/:*?"<>|]/g, '_') + '_' + blogger.sec_uid.substring(0, 10) + '.md';
  const filePath = path.join(bloggersDir, fileName);
  
  const content = `# ${blogger.name}

## 📋 博主元数据

| 属性 | 值 |
|------|-----|
| 博主名称 | ${blogger.name} |
| 博主ID | ${blogger.author_id || '-'} |
| 博主URL | ${blogger.url || '-'} |
| sec_uid | ${blogger.sec_uid || '-'} |
| 粉丝数 | ${blogger.follower_count || 0} |
| 视频数 | ${blogger.video_count || 0} |
| 质量分 | ${blogger.score ? blogger.score.toFixed(1) : '-'} |
| 来源关键词 | ${blogger.source_keyword || '-'} |
| 发现时间 | ${blogger.discovered_at || '-'} |
| 最后获取时间 | ${blogger.last_fetch_time || '-'} |
| 已分析视频数 | 0 |
| 高质量视频数 | 0 |
| 低质量视频数 | 0 |
| 不可访问视频数 | 0 |
| 高质量比例 | - |
| 低质量比例 | - |
| 分析失败视频数 | 0 |
| 最后分析时间 | - |
| 关键词历史 | - |
| 领域历史 | - |

---

## 📹 视频分析记录

`;

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('已创建:', fileName);
}

console.log('\n所有博主文件已创建');
