const fs = require('fs');
const path = require('path');

const bloggersDir = path.join(__dirname, 'bloggers');
const files = fs.readdirSync(bloggersDir).filter(f => f.endsWith('.md'));

for (const file of files) {
  const filePath = path.join(bloggersDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  content = content.replace(/\|\s*关键词\s*\|([^|]+)\|\|\s*分享数\s*\|([^|]+)\|/g, 
    '| 关键词 |$1|\n| 分享数 |$2|');

  content = content.replace(/\n\n(\| 总点赞数 \|)/g, '\n$1');
  content = content.replace(/\n\n(\| 总评论数 \|)/g, '\n$1');
  content = content.replace(/\n\n(\| 总分享数 \|)/g, '\n$1');
  content = content.replace(/\n\n(\| 平均时长 \|)/g, '\n$1');

  content = content.replace(/\n\n---/g, '\n---');

  content = content.replace(/## 📋 博主元数据\n\| 属性 \| 值 \|/g, 
    '## 📋 博主元数据\n\n| 属性 | 值 |');

  content = content.replace(/\n\n\n+/g, '\n\n');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`已修复: ${file}`);
}

console.log('\n所有博主文件已修复');
