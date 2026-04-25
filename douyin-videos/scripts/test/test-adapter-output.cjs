const fs = require('fs');
const path = require('path');

const resultsDir = 'd:\\opencli\\douyin-videos\\results';
const testBloggerName = '测试博主_test123';
const testVideoId = '9999999999999999999';

console.log('========== 模拟适配器输出测试 ==========\n');

function extractKeywordsAndCategory(result) {
  const keywords = [];
  let category = '';
  let summary = '';
  let quality = 'high';
  let topic = '';
  let reason = '';
  let judgment = '';
  let issues = '';
  let project_related = false;
  let project_name = '';
  let how_to_do = '';
  let investment = '';
  let return_value = '';
  let target = '';
  let risks = '';
  
  const jsonMatch = result.match(/JSON_OUTPUT:\s*(\{.+\})/s);
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.quality) quality = jsonData.quality;
      if (jsonData.topic) topic = jsonData.topic;
      if (jsonData.reason) reason = jsonData.reason;
      if (jsonData.judgment) judgment = jsonData.judgment;
      if (jsonData.issues) issues = jsonData.issues;
      if (jsonData.project_related !== undefined) project_related = jsonData.project_related;
      if (jsonData.project_name && jsonData.project_name !== '未提及') project_name = jsonData.project_name;
      if (jsonData.how_to_do && jsonData.how_to_do !== '未提及') how_to_do = jsonData.how_to_do;
      if (jsonData.investment && jsonData.investment !== '未提及') investment = jsonData.investment;
      if (jsonData.return && jsonData.return !== '未提及') return_value = jsonData.return;
      if (jsonData.target && jsonData.target !== '未提及') target = jsonData.target;
      if (jsonData.risks && jsonData.risks !== '未提及') risks = jsonData.risks;
      if (jsonData.keywords && Array.isArray(jsonData.keywords)) {
        keywords.push(...jsonData.keywords.filter(k => k && k !== '未提及'));
      }
      if (jsonData.category && jsonData.category !== '未提及') category = jsonData.category;
      if (jsonData.summary && jsonData.summary !== '未提及') summary = jsonData.summary;
    } catch (e) {
      console.log('  JSON解析失败');
    }
  }
  
  return {
    keywords: [...new Set(keywords)].slice(0, 5),
    category,
    summary,
    quality,
    topic,
    reason,
    judgment,
    issues,
    project_related,
    project_name,
    how_to_do,
    investment,
    return: return_value,
    target,
    risks,
  };
}

async function saveAnalysisResult(video, analysisResult, status = 'success') {
  const bloggerDir = path.join(resultsDir, testBloggerName);
  const videosDir = path.join(bloggerDir, 'videos');
  
  if (!fs.existsSync(bloggerDir)) {
    fs.mkdirSync(bloggerDir, { recursive: true });
  }
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }
  
  const { 
    keywords, category, summary, quality, topic, reason, 
    judgment, issues, project_related, project_name, how_to_do, 
    investment, return: returnValue, target, risks 
  } = extractKeywordsAndCategory(analysisResult);
  
  const isLowQuality = quality === 'low' || status === 'low_quality';
  const isInaccessible = quality === 'inaccessible' || status === 'inaccessible';
  
  const videoData = {
    video_id: video.aweme_id,
    url: video.url,
    author: video.author,
    author_id: video.author_id,
    title: video.title,
    analyzed_at: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    status: isInaccessible ? 'inaccessible' : (isLowQuality ? 'low_quality' : 'success'),
    quality: isInaccessible ? 'inaccessible' : (isLowQuality ? 'low' : 'high'),
    topic: topic || null,
    project_related: project_related || false,
    project_name: project_name || null,
    keywords: keywords.length > 0 ? keywords : null,
    how_to_do: how_to_do || null,
    investment: investment || null,
    return: returnValue || null,
    target: target || null,
    risks: risks || null,
    reason: reason || null,
    judgment: judgment || null,
    issues: issues || null,
    analysis: analysisResult,
  };
  
  const jsonFileName = `${video.aweme_id}.json`;
  const jsonFilePath = path.join(videosDir, jsonFileName);
  fs.writeFileSync(jsonFilePath, JSON.stringify(videoData, null, 2), 'utf-8');
  
  return jsonFilePath;
}

async function updateBloggerMetadata(author, newVideoData) {
  const bloggerDir = path.join(resultsDir, testBloggerName);
  const metadataPath = path.join(bloggerDir, 'metadata.json');
  
  let metadata = {
    blogger_name: author,
    blogger_id: 'test123',
    sec_uid: 'test123',
    blogger_url: 'https://www.douyin.com/user/test123',
    follower_count: 1000,
    video_count: 10,
    score: null,
    source_keyword: '测试',
    discovered_at: new Date().toISOString(),
    last_fetch_time: new Date().toISOString(),
    total_videos: 0,
    high_quality_count: 0,
    low_quality_count: 0,
    inaccessible_count: 0,
    high_quality_ratio: '0%',
    low_quality_ratio: '0%',
    last_analyzed_at: null,
    videos: [],
  };
  
  if (fs.existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    } catch (e) {}
  }
  
  const existingIndex = metadata.videos.findIndex(v => v.video_id === newVideoData.video_id);
  if (existingIndex !== -1) {
    const oldVideo = metadata.videos[existingIndex];
    if (oldVideo.quality === 'high') metadata.high_quality_count--;
    if (oldVideo.quality === 'low') metadata.low_quality_count--;
    if (oldVideo.quality === 'inaccessible') metadata.inaccessible_count--;
    
    metadata.videos[existingIndex] = {
      video_id: newVideoData.video_id,
      status: newVideoData.status,
      quality: newVideoData.quality,
      analyzed_at: newVideoData.analyzed_at,
      keywords: newVideoData.keywords,
    };
  } else {
    metadata.videos.push({
      video_id: newVideoData.video_id,
      status: newVideoData.status,
      quality: newVideoData.quality,
      analyzed_at: newVideoData.analyzed_at,
      keywords: newVideoData.keywords,
    });
  }
  
  if (newVideoData.quality === 'high') metadata.high_quality_count++;
  if (newVideoData.quality === 'low') metadata.low_quality_count++;
  if (newVideoData.quality === 'inaccessible') metadata.inaccessible_count++;
  
  metadata.total_videos = metadata.videos.length;
  
  if (metadata.total_videos > 0) {
    metadata.high_quality_ratio = ((metadata.high_quality_count / metadata.total_videos) * 100).toFixed(1) + '%';
    metadata.low_quality_ratio = ((metadata.low_quality_count / metadata.total_videos) * 100).toFixed(1) + '%';
  }
  
  metadata.last_analyzed_at = newVideoData.analyzed_at;
  
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

async function runTest() {
  console.log('测试1: 高质量视频（方法论）\n');
  
  const highQualityMockResult = `JSON_OUTPUT:{"quality":"high","topic":"口播账号起号方法论","project_related":true,"project_name":"口播账号运营","keywords":["口播账号","短视频创业","起号方法"],"category":"短视频运营","summary":"专注分享口播账号运营的实战派","how_to_do":"定位→内容→运营三步走","investment":"需要手机、表达能力","return":"未提及","target":"有一定表达能力的创业者","risks":"未提及"}`;
  
  const video1 = {
    aweme_id: testVideoId,
    url: `https://www.douyin.com/video/${testVideoId}`,
    author: testBloggerName,
    author_id: 'test123',
    title: '测试视频 - 口播账号起号方法论',
  };
  
  const filePath1 = await saveAnalysisResult(video1, highQualityMockResult);
  console.log(`✅ 文件已生成: ${filePath1}`);
  
  const savedData1 = JSON.parse(fs.readFileSync(filePath1, 'utf-8'));
  await updateBloggerMetadata(testBloggerName, savedData1);
  console.log('✅ metadata.json 已更新\n');
  
  console.log('测试2: 低质量视频（纯观点）\n');
  
  const lowQualityMockResult = `JSON_OUTPUT:{"quality":"low","topic":"创业思维重要性","project_related":false,"judgment":"仅讲认知和思维，未提供可操作方法","issues":"纯观点类内容，无项目信息"}`;
  
  const video2 = {
    aweme_id: '8888888888888888888',
    url: 'https://www.douyin.com/video/8888888888888888888',
    author: testBloggerName,
    author_id: 'test123',
    title: '测试视频 - 创业思维',
  };
  
  const filePath2 = await saveAnalysisResult(video2, lowQualityMockResult);
  console.log(`✅ 文件已生成: ${filePath2}`);
  
  const savedData2 = JSON.parse(fs.readFileSync(filePath2, 'utf-8'));
  await updateBloggerMetadata(testBloggerName, savedData2);
  console.log('✅ metadata.json 已更新\n');
  
  console.log('测试3: 不可访问视频\n');
  
  const inaccessibleMockResult = `JSON_OUTPUT:{"quality":"inaccessible","reason":"该视频为非公开视频，暂无访问权限"}`;
  
  const video3 = {
    aweme_id: '7777777777777777777',
    url: 'https://www.douyin.com/video/7777777777777777777',
    author: testBloggerName,
    author_id: 'test123',
    title: '测试视频 - 不可访问',
  };
  
  const filePath3 = await saveAnalysisResult(video3, inaccessibleMockResult);
  console.log(`✅ 文件已生成: ${filePath3}`);
  
  const savedData3 = JSON.parse(fs.readFileSync(filePath3, 'utf-8'));
  await updateBloggerMetadata(testBloggerName, savedData3);
  console.log('✅ metadata.json 已更新\n');
  
  console.log('========== 验证结果 ==========\n');
  
  console.log('1. 高质量视频字段检查:');
  console.log(`   project_related: ${savedData1.project_related === true ? '✅' : '❌'} (${savedData1.project_related})`);
  console.log(`   project_name: ${savedData1.project_name ? '✅' : '❌'} (${savedData1.project_name})`);
  console.log(`   how_to_do: ${savedData1.how_to_do ? '✅' : '❌'} (${savedData1.how_to_do})`);
  console.log(`   investment: ${savedData1.investment ? '✅' : '⚠️'} (${savedData1.investment || 'null'})`);
  console.log(`   return: ${savedData1['return'] ? '⚠️' : '✅'} (${savedData1['return'] || 'null'})`);
  console.log(`   target: ${savedData1.target ? '✅' : '⚠️'} (${savedData1.target || 'null'})`);
  console.log(`   risks: ${savedData1.risks ? '⚠️' : '✅'} (${savedData1.risks || 'null'})`);
  
  console.log('\n2. 低质量视频字段检查:');
  console.log(`   project_related: ${savedData2.project_related === false ? '✅' : '❌'} (${savedData2.project_related})`);
  console.log(`   judgment: ${savedData2.judgment ? '✅' : '❌'}`);
  console.log(`   issues: ${savedData2.issues ? '✅' : '❌'}`);
  
  console.log('\n3. 不可访问视频字段检查:');
  console.log(`   quality: ${savedData3.quality === 'inaccessible' ? '✅' : '❌'} (${savedData3.quality})`);
  console.log(`   reason: ${savedData3.reason ? '✅' : '❌'} (${savedData3.reason})`);
  
  console.log('\n4. metadata.json 检查:');
  const metadataPath = path.join(resultsDir, testBloggerName, 'metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log(`   total_videos: ${metadata.total_videos === 3 ? '✅' : '❌'} (${metadata.total_videos})`);
  console.log(`   high_quality_count: ${metadata.high_quality_count === 1 ? '✅' : '❌'} (${metadata.high_quality_count})`);
  console.log(`   low_quality_count: ${metadata.low_quality_count === 1 ? '✅' : '❌'} (${metadata.low_quality_count})`);
  console.log(`   inaccessible_count: ${metadata.inaccessible_count === 1 ? '✅' : '❌'} (${metadata.inaccessible_count})`);
  
  console.log('\n5. 完整数据结构示例 (高质量视频):');
  console.log(JSON.stringify(savedData1, null, 2));
  
  console.log('\n测试完成！');
}

runTest().catch(console.error);
