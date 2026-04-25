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
  
  let fixedResult = result;
  
  fixedResult = fixedResult.replace(/关键词[：:]\s*([^领域\n]+)(领域[：:])/g, '关键词：$1\n$2');
  fixedResult = fixedResult.replace(/领域[：:]\s*([^博\n]+)(博主一句话总结[：:])/g, '领域：$1\n$2');
  
  const keywordMatch = fixedResult.match(/关键词[：:]\s*([^\n]+)/);
  if (keywordMatch) {
    const keywordStr = keywordMatch[1].trim();
    keywords.push(
      ...keywordStr
        .split(/[,，、\s]+/)
        .filter((k) => k.length > 0 && k !== 'xxx' && k !== '未提及' && !k.includes('未提及'))
    );
  }
  
  const categoryMatch = fixedResult.match(/领域[：:]\s*([^\n]+)/);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
    if (category === 'xxx' || category === '未提及' || category.includes('未提及')) {
      category = '';
    }
  }
  
  const summaryMatch = fixedResult.match(/博主一句话总结[：:]\s*([^\n]+)/);
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
    fixedResult,
  };
}

console.log('========== 数据修复 ==========\n');

const resultsBloggerDirs = fs.existsSync(resultsDir) ? fs.readdirSync(resultsDir) : [];

console.log('--- 步骤 1: 重命名 results 目录 (8位 → 10位) ---\n');

const renameMap = new Map();

for (const oldDirName of resultsBloggerDirs) {
  const oldPath = path.join(resultsDir, oldDirName);
  if (!fs.statSync(oldPath).isDirectory()) continue;
  
  const bloggerName = oldDirName.replace(/_MS4wLjAB.*$/, '');
  const secUid = findBloggerSecUid(bloggerName);
  
  if (secUid) {
    const newDirName = getBloggerFileName(bloggerName, secUid).replace('.md', '');
    
    if (oldDirName !== newDirName) {
      const newPath = path.join(resultsDir, newDirName);
      
      if (fs.existsSync(newPath)) {
        console.log(`⚠️  目标已存在，合并: ${oldDirName} → ${newDirName}`);
        const oldDateDirs = fs.readdirSync(oldPath);
        for (const dateDir of oldDateDirs) {
          const srcDatePath = path.join(oldPath, dateDir);
          const destDatePath = path.join(newPath, dateDir);
          
          if (!fs.existsSync(destDatePath)) {
            fs.mkdirSync(destDatePath, { recursive: true });
          }
          
          const files = fs.readdirSync(srcDatePath);
          for (const file of files) {
            const srcFile = path.join(srcDatePath, file);
            const destFile = path.join(destDatePath, file);
            if (!fs.existsSync(destFile)) {
              fs.copyFileSync(srcFile, destFile);
              console.log(`   复制: ${dateDir}/${file}`);
            }
          }
        }
        fs.rmSync(oldPath, { recursive: true });
        console.log(`   删除原目录: ${oldDirName}`);
      } else {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ ${oldDirName} → ${newDirName}`);
      }
      
      renameMap.set(oldDirName, newDirName);
    }
  }
}

console.log('\n--- 步骤 2: 修复格式问题 ---\n');

let fixedCount = 0;

for (const [oldName, newName] of renameMap) {
  const bloggerPath = path.join(resultsDir, newName);
  const dateDirs = fs.readdirSync(bloggerPath);
  
  for (const dateDir of dateDirs) {
    const datePath = path.join(bloggerPath, dateDir);
    const files = fs.readdirSync(datePath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(datePath, file);
      let content = fs.readFileSync(filePath, 'utf-8');
      
      if (content.includes('关键词') && content.includes('领域')) {
        const originalContent = content;
        content = content.replace(/关键词[：:]\s*([^领域\n]+)(领域[：:])/g, '关键词：$1\n$2');
        content = content.replace(/领域[：:]\s*([^博\n]+)(博主一句话总结[：:])/g, '领域：$1\n$2');
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`✅ 修复格式: ${newName}/${dateDir}/${file}`);
          fixedCount++;
        }
      }
    }
  }
}

console.log(`\n修复文件数: ${fixedCount}`);

console.log('\n--- 步骤 3: 更新博主文件统计 ---\n');

const bloggerFiles = fs.readdirSync(bloggersDir).filter(f => f.endsWith('.md'));

for (const bloggerFile of bloggerFiles) {
  const bloggerPath = path.join(bloggersDir, bloggerFile);
  let content = fs.readFileSync(bloggerPath, 'utf-8');
  
  const nameMatch = content.match(/\| 博主名称 \| ([^|]+) \|/);
  const bloggerName = nameMatch ? nameMatch[1].trim() : bloggerFile.replace('.md', '');
  
  const secUidMatch = content.match(/\| sec_uid \| ([^|]+) \|/);
  const secUid = secUidMatch ? secUidMatch[1].trim() : null;
  
  const expectedResultsDir = getBloggerFileName(bloggerName, secUid).replace('.md', '');
  const resultsBloggerPath = path.join(resultsDir, expectedResultsDir);
  
  if (!fs.existsSync(resultsBloggerPath)) {
    continue;
  }
  
  let highQualityCount = 0;
  let lowQualityCount = 0;
  let inaccessibleCount = 0;
  const allKeywords = [];
  const allCategories = [];
  
  const dateDirs = fs.readdirSync(resultsBloggerPath);
  
  for (const dateDir of dateDirs) {
    const datePath = path.join(resultsBloggerPath, dateDir);
    const files = fs.readdirSync(datePath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(datePath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      const { keywords, category, summary } = extractKeywordsAndCategory(fileContent);
      
      if (fileContent.includes('未提及') || keywords.length === 0) {
        lowQualityCount++;
      } else {
        highQualityCount++;
        allKeywords.push(...keywords);
        if (category) allCategories.push(category);
      }
    }
  }
  
  const analyzedCount = highQualityCount + lowQualityCount + inaccessibleCount;
  const highQualityRatio = analyzedCount > 0 ? ((highQualityCount / analyzedCount) * 100).toFixed(1) + '%' : '-';
  const lowQualityRatio = analyzedCount > 0 ? ((lowQualityCount / analyzedCount) * 100).toFixed(1) + '%' : '-';
  
  const uniqueKeywords = [...new Set(allKeywords)].slice(0, 10);
  const uniqueCategories = [...new Set(allCategories)].slice(0, 5);
  
  content = content.replace(/\| 已分析视频数 \| [^|]+ \|/, `| 已分析视频数 | ${analyzedCount} |`);
  content = content.replace(/\| 高质量视频数 \| [^|]+ \|/, `| 高质量视频数 | ${highQualityCount} |`);
  content = content.replace(/\| 低质量视频数 \| [^|]+ \|/, `| 低质量视频数 | ${lowQualityCount} |`);
  content = content.replace(/\| 不可访问视频数 \| [^|]+ \|/, `| 不可访问视频数 | ${inaccessibleCount} |`);
  content = content.replace(/\| 高质量比例 \| [^|]+ \|/, `| 高质量比例 | ${highQualityRatio} |`);
  content = content.replace(/\| 低质量比例 \| [^|]+ \|/, `| 低质量比例 | ${lowQualityRatio} |`);
  content = content.replace(/\| 关键词历史 \| [^|]+ \|/, `| 关键词历史 | ${uniqueKeywords.join('、') || '-'} |`);
  content = content.replace(/\| 领域历史 \| [^|]+ \|/, `| 领域历史 | ${uniqueCategories.join('、') || '-'} |`);
  
  fs.writeFileSync(bloggerPath, content, 'utf-8');
  console.log(`✅ 更新统计: ${bloggerName} (高质量: ${highQualityCount}, 低质量: ${lowQualityCount})`);
}

console.log('\n========== 修复完成 ==========\n');
