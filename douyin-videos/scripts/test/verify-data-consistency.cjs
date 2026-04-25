const fs = require('fs');
const path = require('path');

const dataDir = 'd:/opencli/douyin-videos';
const dataFilesDir = path.join(dataDir, 'data');
const bloggersDir = path.join(dataDir, 'bloggers');
const resultsDir = path.join(dataDir, 'results');

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

function getBloggerFileName(author, secUid) {
  const sanitizedName = sanitizeFileName(author);
  const secUidPrefix = secUid ? `_${secUid.substring(0, 10)}` : '';
  return `${sanitizedName}${secUidPrefix}.md`;
}

function findBloggerSecUid(author) {
  const bloggersPath = path.join(dataFilesDir, 'bloggers.json');
  if (!fs.existsSync(bloggersPath)) return null;
  
  const bloggers = JSON.parse(fs.readFileSync(bloggersPath, 'utf-8'));
  const blogger = bloggers.find(b => b.name === author);
  return blogger ? blogger.sec_uid : null;
}

function extractKeywordsAndCategory(result) {
  const keywords = [];
  let category = '';
  let summary = '';
  
  const keywordMatch = result.match(/关键词[：:]\s*([^\n]+)/);
  if (keywordMatch) {
    const keywordStr = keywordMatch[1].trim();
    keywords.push(
      ...keywordStr
        .split(/[,，、\s]+/)
        .filter((k) => k.length > 0 && k !== 'xxx' && k !== '未提及' && !k.includes('未提及'))
    );
  }
  
  const categoryMatch = result.match(/领域[：:]\s*([^\n]+)/);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
    if (category === 'xxx' || category === '未提及' || category.includes('未提及')) {
      category = '';
    }
  }
  
  const summaryMatch = result.match(/博主一句话总结[：:]\s*([^\n]+)/);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
    if (summary === 'xxx' || summary === '未提及' || summary.includes('未提及')) {
      summary = '';
    }
  }
  
  return {
    keywords: [...new Set(keywords)].slice(0, 10),
    category,
    summary,
  };
}

console.log('========== 数据一致性验证 ==========\n');

const issues = [];

const bloggerFiles = fs.readdirSync(bloggersDir).filter(f => f.endsWith('.md'));
console.log(`博主文件数: ${bloggerFiles.length}`);

const resultsBloggerDirs = fs.existsSync(resultsDir) ? fs.readdirSync(resultsDir) : [];
console.log(`results 博主目录数: ${resultsBloggerDirs.length}\n`);

console.log('--- 检查博主文件与 results 目录匹配 ---\n');

for (const bloggerFile of bloggerFiles) {
  const bloggerPath = path.join(bloggersDir, bloggerFile);
  const content = fs.readFileSync(bloggerPath, 'utf-8');
  
  const nameMatch = content.match(/\| 博主名称 \| ([^|]+) \|/);
  const bloggerName = nameMatch ? nameMatch[1].trim() : bloggerFile.replace('.md', '');
  
  const secUidMatch = content.match(/\| sec_uid \| ([^|]+) \|/);
  const secUid = secUidMatch ? secUidMatch[1].trim() : null;
  
  const expectedResultsDir = getBloggerFileName(bloggerName, secUid).replace('.md', '');
  const actualResultsDir = resultsBloggerDirs.find(d => d.startsWith(sanitizeFileName(bloggerName)));
  
  if (actualResultsDir) {
    if (actualResultsDir !== expectedResultsDir) {
      issues.push({
        type: '目录名不匹配',
        blogger: bloggerName,
        expected: expectedResultsDir,
        actual: actualResultsDir,
      });
      console.log(`❌ ${bloggerName}`);
      console.log(`   博主文件: ${bloggerFile}`);
      console.log(`   期望目录: ${expectedResultsDir}`);
      console.log(`   实际目录: ${actualResultsDir}\n`);
    } else {
      console.log(`✅ ${bloggerName} - 目录匹配`);
    }
  } else {
    console.log(`⚠️  ${bloggerName} - 无 results 目录`);
  }
}

console.log('\n--- 检查 results 目录格式问题 ---\n');

let formatIssues = 0;
let totalFiles = 0;

for (const bloggerDir of resultsBloggerDirs) {
  const bloggerPath = path.join(resultsDir, bloggerDir);
  const dateDirs = fs.readdirSync(bloggerPath);
  
  for (const dateDir of dateDirs) {
    const datePath = path.join(bloggerPath, dateDir);
    const files = fs.readdirSync(datePath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      totalFiles++;
      const filePath = path.join(datePath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (content.includes('关键词') && content.includes('领域')) {
        const keywordLine = content.match(/关键词[：:][^\n]*/);
        if (keywordLine) {
          const line = keywordLine[0];
          if (line.includes('领域') && !line.includes('\n')) {
            formatIssues++;
            console.log(`❌ 格式问题: ${bloggerDir}/${dateDir}/${file}`);
            console.log(`   ${line.substring(0, 80)}...\n`);
          }
        }
      }
    }
  }
}

console.log(`\n--- 统计 ---\n`);
console.log(`总 results 文件数: ${totalFiles}`);
console.log(`格式问题文件数: ${formatIssues}`);
console.log(`目录名不匹配数: ${issues.filter(i => i.type === '目录名不匹配').length}`);

console.log('\n========== 验证完成 ==========\n');
