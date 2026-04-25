const fs = require('fs');
const path = require('path');

const bloggersDir = 'd:/opencli/douyin-videos/bloggers';
const resultsDir = 'd:/opencli/douyin-videos/results';

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

function sanitizeFileName(name, replacement) {
  return name.replace(/[\\/:*?"<>|]/g, replacement);
}

function getBloggerFileName(author, secUid) {
  const sanitizedName = sanitizeFileName(author, '_');
  const shortSecUid = secUid ? secUid.substring(0, 10) : 'unknown';
  return `${sanitizedName}_${shortSecUid}.md`;
}

async function findBloggerSecUid(author, dataDir) {
  const dataFilesDir = path.join(dataDir, 'data');
  const bloggersPath = path.join(dataFilesDir, 'bloggers.json');
  if (!fs.existsSync(bloggersPath)) return null;
  
  const bloggers = JSON.parse(fs.readFileSync(bloggersPath, 'utf-8'));
  const blogger = bloggers.find(b => b.name === author);
  return blogger ? blogger.sec_uid : null;
}

async function updateVideoStatusInBloggerFile(video, status) {
  const dataDir = 'd:/opencli/douyin-videos';
  const secUid = await findBloggerSecUid(video.author, dataDir);
  const fileName = getBloggerFileName(video.author, secUid);
  const filePath = path.join(bloggersDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log('博主文件不存在:', video.author);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const videoTitle = video.title || `视频 ${video.aweme_id}`;
  const videoStatusSection = `### ${video.aweme_id}\n状态: ${status}\n标题: ${videoTitle.substring(0, 50)}${videoTitle.length > 50 ? '...' : ''}\n时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
  
  if (!content.includes('## 📹 视频分析记录')) {
    content += '\n## 📹 视频分析记录\n\n';
  }
  
  if (content.includes(`### ${video.aweme_id}`)) {
    const regex = new RegExp(`### ${video.aweme_id}[\\s\\S]*?(?=###|$)`, 'g');
    content = content.replace(regex, videoStatusSection);
  } else {
    const recordIndex = content.indexOf('## 📹 视频分析记录');
    if (recordIndex !== -1) {
      const insertIndex = content.indexOf('\n', recordIndex + '## 📹 视频分析记录'.length) + 1;
      content = content.slice(0, insertIndex) + videoStatusSection + content.slice(insertIndex);
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function updateBloggerFile(video, analysisResult, status = '成功') {
  const dataDir = 'd:/opencli/douyin-videos';
  const secUid = await findBloggerSecUid(video.author, dataDir);
  const fileName = getBloggerFileName(video.author, secUid);
  const filePath = path.join(bloggersDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log('博主文件不存在，自动创建:', video.author);
    
    const dataFilesDir = path.join(dataDir, 'data');
    const bloggersPath = path.join(dataFilesDir, 'bloggers.json');
    let bloggerInfo = null;
    
    if (fs.existsSync(bloggersPath)) {
      try {
        const bloggers = JSON.parse(fs.readFileSync(bloggersPath, 'utf-8'));
        bloggerInfo = bloggers.find(b => b.name === video.author || b.author_id === video.author_id);
      } catch (e) {
        console.log('读取 bloggers.json 失败:', e.message);
      }
    }
    
    const bloggerName = bloggerInfo?.name || video.author;
    const bloggerId = bloggerInfo?.author_id || video.author_id || '-';
    const bloggerUrl = bloggerInfo?.url || (secUid ? `https://www.douyin.com/user/${secUid}` : '-');
    
    const initialContent = `# ${bloggerName}

## 📋 博主元数据

| 属性 | 值 |
|------|-----|
| 博主名称 | ${bloggerName} |
| 博主ID | ${bloggerId} |
| 博主URL | ${bloggerUrl} |
| sec_uid | ${secUid || '-'} |
| 粉丝数 | ${bloggerInfo?.follower_count || 0} |
| 视频数 | ${bloggerInfo?.video_count || 0} |
| 质量分 | ${bloggerInfo?.score ? bloggerInfo.score.toFixed(1) : '-'} |
| 来源关键词 | ${bloggerInfo?.source_keyword || '-'} |
| 发现时间 | ${bloggerInfo?.discovered_at || '-'} |
| 最后获取时间 | ${bloggerInfo?.last_fetch_time || '-'} |
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

    fs.writeFileSync(filePath, initialContent, 'utf-8');
    console.log('  ✅ 已创建博主文件:', fileName);
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const { keywords, category, summary } = extractKeywordsAndCategory(analysisResult);
  
  const analyzedCountMatch = content.match(/\| 已分析视频数 \| (\d+) \|/);
  const analyzedCount = analyzedCountMatch ? parseInt(analyzedCountMatch[1]) + 1 : 1;
  
  const highQualityMatch = content.match(/\| 高质量视频数 \| (\d+) \|/);
  let highQualityCount = highQualityMatch ? parseInt(highQualityMatch[1]) : 0;
  
  const lowQualityMatch = content.match(/\| 低质量视频数 \| (\d+) \|/);
  let lowQualityCount = lowQualityMatch ? parseInt(lowQualityMatch[1]) : 0;
  
  const inaccessibleMatch = content.match(/\| 不可访问视频数 \| (\d+) \|/);
  let inaccessibleCount = inaccessibleMatch ? parseInt(inaccessibleMatch[1]) : 0;
  
  if (status === '成功') {
    highQualityCount++;
  } else if (status === '低质量') {
    lowQualityCount++;
  } else if (status === '不可访问') {
    inaccessibleCount++;
  }
  
  const highQualityRatio = analyzedCount > 0 ? ((highQualityCount / analyzedCount) * 100).toFixed(1) + '%' : '-';
  const lowQualityRatio = analyzedCount > 0 ? ((lowQualityCount / analyzedCount) * 100).toFixed(1) + '%' : '-';
  
  const keywordsHistoryMatch = content.match(/\| 关键词历史 \| ([^\|]+) \|/);
  let keywordsHistory = keywordsHistoryMatch ? keywordsHistoryMatch[1].trim() : '';
  if (keywordsHistory === '-') keywordsHistory = '';
  if (keywords.length > 0) {
    const existingKeywords = keywordsHistory.split('、').filter((k) => k.trim());
    keywords.forEach((k) => {
      if (!existingKeywords.includes(k)) {
        existingKeywords.push(k);
      }
    });
    keywordsHistory = existingKeywords.slice(0, 10).join('、');
  }
  
  const categoryHistoryMatch = content.match(/\| 领域历史 \| ([^|]+) \|/);
  let categoryHistory = categoryHistoryMatch ? categoryHistoryMatch[1].trim() : '';
  if (categoryHistory === '-') categoryHistory = '';
  if (category) {
    const existingCategories = categoryHistory.split('、').filter((c) => c.trim());
    const newCategories = category.split('、').filter((c) => c.trim());
    newCategories.forEach((c) => {
      if (!existingCategories.includes(c)) {
        existingCategories.push(c);
      }
    });
    categoryHistory = existingCategories.slice(0, 5).join('、');
  }
  
  content = content.replace(/\| 已分析视频数 \| [^|]+ \|/, `| 已分析视频数 | ${analyzedCount} |`);
  content = content.replace(/\| 高质量视频数 \| [^|]+ \|/, `| 高质量视频数 | ${highQualityCount} |`);
  content = content.replace(/\| 低质量视频数 \| [^|]+ \|/, `| 低质量视频数 | ${lowQualityCount} |`);
  content = content.replace(/\| 不可访问视频数 \| [^|]+ \|/, `| 不可访问视频数 | ${inaccessibleCount} |`);
  content = content.replace(/\| 高质量比例 \| [^|]+ \|/, `| 高质量比例 | ${highQualityRatio} |`);
  content = content.replace(/\| 低质量比例 \| [^|]+ \|/, `| 低质量比例 | ${lowQualityRatio} |`);
  content = content.replace(
    /\| 最后分析时间 \| [^|]+ \|/,
    `| 最后分析时间 | ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} |`
  );
  content = content.replace(/\| 关键词历史 \| [^|]+ \|/, `| 关键词历史 | ${keywordsHistory || '-'} |`);
  content = content.replace(/\| 领域历史 \| [^|]+ \|/, `| 领域历史 | ${categoryHistory || '-'} |`);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const bloggerDirName = getBloggerFileName(video.author, secUid).replace('.md', '');
  const analysisFilePath = `../results/${bloggerDirName}/${dateStr}/${video.aweme_id}.md`;
  
  const analysisFields = `| 分析结果 | [查看分析](${analysisFilePath}) |
| 分析时间 | ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} |
| 个人总结 | ${summary || '无'} |
| 领域 | ${category || '未分类'} |
| 关键词 | ${keywords.join('、') || '无'} |
`;

  const videoIdPattern = new RegExp(`\\|\\s*视频ID\\s*\\|\\s*${video.aweme_id}\\s*\\|`, 'i');
  const videoIdIndex = content.search(videoIdPattern);

  if (videoIdIndex !== -1) {
    const recordStart = content.lastIndexOf('| 属性 | 值 |', videoIdIndex);
    if (recordStart !== -1) {
      const recordBlock = content.slice(recordStart);
      const separatorPos = recordBlock.indexOf('\n---');
      
      if (separatorPos !== -1) {
        const insertPos = recordStart + separatorPos;
        content = content.slice(0, insertPos) + '\n' + analysisFields + content.slice(insertPos);
      } else {
        content = content.trimEnd() + '\n' + analysisFields + '\n';
      }
    } else {
      console.log(`  ⚠️ 未找到视频 ${video.aweme_id} 的记录起始位置`);
    }
  } else {
    const videoTitle = video.title || `视频 ${video.aweme_id}`;
    const fullVideoRecord = `| 属性 | 值 |
|------|-----|
| 视频标题 | ${videoTitle} |
| 视频ID | ${video.aweme_id} |
| 视频URL | [查看视频](${video.url}) |
| 状态 | ${status} |
${analysisFields}---
`;
    
    const recordSection = content.indexOf('## 📹 视频分析记录');
    if (recordSection !== -1) {
      const afterRecordSection = content.slice(recordSection);
      const hasVideoRecord = afterRecordSection.includes('| 视频ID |');
      
      if (hasVideoRecord) {
        const firstVideoPos = afterRecordSection.indexOf('| 属性 | 值 |');
        if (firstVideoPos !== -1) {
          const insertPos = recordSection + firstVideoPos;
          content = content.slice(0, insertPos) + fullVideoRecord + content.slice(insertPos);
        } else {
          content = content.trimEnd() + '\n' + fullVideoRecord;
        }
      } else {
        const nextLinePos = content.indexOf('\n', recordSection + '## 📹 视频分析记录'.length);
        if (nextLinePos !== -1) {
          content = content.slice(0, nextLinePos + 1) + '\n' + fullVideoRecord + content.slice(nextLinePos + 1);
        } else {
          content = content.trimEnd() + '\n\n' + fullVideoRecord;
        }
      }
    } else {
      content = content.trimEnd() + '\n\n## 📹 视频分析记录\n' + fullVideoRecord;
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function saveAnalysisResult(video, analysisResult) {
  const dateStr = new Date().toISOString().split('T')[0];
  const secUid = await findBloggerSecUid(video.author, 'd:/opencli/douyin-videos');
  const bloggerDirName = getBloggerFileName(video.author, secUid).replace('.md', '');
  const resultDir = path.join(resultsDir, bloggerDirName, dateStr);
  
  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
  }
  
  const resultPath = path.join(resultDir, `${video.aweme_id}.md`);
  fs.writeFileSync(resultPath, analysisResult, 'utf-8');
  console.log('  已保存分析结果:', resultPath);
}

async function simulateStage3() {
  console.log('========== 模拟第一个视频分析（成功） ==========\n');
  
  const testVideo1 = {
    aweme_id: '7627121122303085876',
    url: 'https://www.douyin.com/video/7627121122303085876',
    author: '胡说老王（干货版）',
    author_id: '7611552797049717797',
    title: '口播账号如何快速起号？新手必看的短视频创业指南',
  };
  
  const testAnalysisResult1 = `第一阶段：拆解底层逻辑
- 逻辑链路：从0到1搭建口播账号的完整路径
- 逻辑自洽：内容完整，步骤清晰
- 内容质量：高

第二阶段详细拆解：
1. 说了什么？分享了口播账号起号的核心方法论
2. 做了什么？提供了具体的操作步骤和技巧
3. 为了什么？帮助新手快速入门短视频创业
4. 我能得到什么？可落地的实操指南
5. 没有说什么？没有涉及具体的变现路径
6. 有哪些例外与边界？适用于有一定表达能力的人

关键词：口播账号, 短视频创业, 口播技巧, 新手入门
领域：短视频运营、知识分享
博主一句话总结：专注分享口播账号运营技巧的实战派知识博主`;

  console.log('视频:', testVideo1.author, '-', testVideo1.aweme_id);
  await saveAnalysisResult(testVideo1, testAnalysisResult1);
  await updateBloggerFile(testVideo1, testAnalysisResult1, '成功');
  console.log('✅ 第一个视频模拟完成\n');
  
  console.log('========== 模拟第二个视频分析（成功） ==========\n');
  
  const testVideo2 = {
    aweme_id: '7627121122303085877',
    url: 'https://www.douyin.com/video/7627121122303085877',
    author: '胡说老王（干货版）',
    author_id: '7611552797049717797',
    title: '短视频变现的三个核心路径',
  };
  
  const testAnalysisResult2 = `关键词：短视频变现, 流量变现, 知识付费
领域：短视频运营、商业变现
博主一句话总结：实战派短视频变现专家`;

  console.log('视频:', testVideo2.author, '-', testVideo2.aweme_id);
  await saveAnalysisResult(testVideo2, testAnalysisResult2);
  await updateBloggerFile(testVideo2, testAnalysisResult2, '成功');
  console.log('✅ 第二个视频模拟完成\n');
  
  console.log('========== 模拟第三个视频分析（低质量） ==========\n');
  
  const testVideo3 = {
    aweme_id: '7627121122303085878',
    url: 'https://www.douyin.com/video/7627121122303085878',
    author: '胡说老王（干货版）',
    author_id: '7611552797049717797',
    title: '测试低质量视频',
  };
  
  const testAnalysisResult3 = `关键词：未提及
领域：未提及
博主一句话总结：未提及`;

  console.log('视频:', testVideo3.author, '-', testVideo3.aweme_id);
  await saveAnalysisResult(testVideo3, testAnalysisResult3);
  await updateBloggerFile(testVideo3, testAnalysisResult3, '低质量');
  console.log('✅ 第三个视频模拟完成\n');
  
  console.log('========== 验证结果 ==========\n');
  
  const blogger1Path = path.join(bloggersDir, '胡说老王（干货版）_MS4wLjABAA.md');
  
  console.log('--- 胡说老王（干货版）文件内容 ---');
  console.log(fs.readFileSync(blogger1Path, 'utf-8'));
}

simulateStage3().catch(console.error);
