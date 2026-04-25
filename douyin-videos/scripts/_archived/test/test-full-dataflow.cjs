const fs = require("fs");
const path = require("path");

const resultsDir = "d:\\opencli\\douyin-videos\\results";
const dataDir = "d:\\opencli\\douyin-videos\\data";
const discoveredKeywordsPath = path.join(dataDir, "discovered-keywords.json");
const testBloggerName = "测试博主_test456";

function loadDiscoveredKeywords() {
  if (fs.existsSync(discoveredKeywordsPath)) {
    return JSON.parse(fs.readFileSync(discoveredKeywordsPath, "utf-8"));
  }
  return { version: "1.0", updated_at: new Date().toISOString(), keywords: [] };
}

function saveDiscoveredKeywords(data) {
  data.updated_at = new Date().toISOString();
  fs.writeFileSync(
    discoveredKeywordsPath,
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

function addKeywordsToDiscovered(newKeywords) {
  const discoveredKeywords = loadDiscoveredKeywords();
  const existingKeywords = discoveredKeywords.keywords.map((k) => k.keyword);

  for (const keyword of newKeywords) {
    if (
      keyword &&
      keyword !== "未提及" &&
      !existingKeywords.includes(keyword)
    ) {
      discoveredKeywords.keywords.push({
        keyword,
        source: "video_analysis",
        discovered_at: new Date().toISOString(),
        status: "pending",
      });
    }
  }

  saveDiscoveredKeywords(discoveredKeywords);
}

console.log("========== 完整数据流验证 ==========\n");

function extractKeywordsAndCategory(result) {
  const keywords = [];
  let category = "";
  let summary = "";
  let quality = "high";
  let topic = "";
  let reason = "";
  let judgment = "";
  let issues = "";
  let project_related = false;
  let project_name = "";
  let how_to_do = "";
  let investment = "";
  let return_value = "";
  let target = "";
  let risks = "";

  const jsonMatch = result.match(/JSON_OUTPUT:\s*(\{.+\})/s);
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.quality) quality = jsonData.quality;
      if (jsonData.topic) topic = jsonData.topic;
      if (jsonData.reason) reason = jsonData.reason;
      if (jsonData.judgment) judgment = jsonData.judgment;
      if (jsonData.issues) issues = jsonData.issues;
      if (jsonData.project_related !== undefined)
        project_related = jsonData.project_related;
      if (jsonData.project_name && jsonData.project_name !== "未提及")
        project_name = jsonData.project_name;
      if (jsonData.how_to_do && jsonData.how_to_do !== "未提及")
        how_to_do = jsonData.how_to_do;
      if (jsonData.investment && jsonData.investment !== "未提及")
        investment = jsonData.investment;
      if (jsonData.return && jsonData.return !== "未提及")
        return_value = jsonData.return;
      if (jsonData.target && jsonData.target !== "未提及")
        target = jsonData.target;
      if (jsonData.risks && jsonData.risks !== "未提及") risks = jsonData.risks;
      if (jsonData.keywords && Array.isArray(jsonData.keywords)) {
        keywords.push(...jsonData.keywords.filter((k) => k && k !== "未提及"));
      }
      if (jsonData.category && jsonData.category !== "未提及")
        category = jsonData.category;
      if (jsonData.summary && jsonData.summary !== "未提及")
        summary = jsonData.summary;
    } catch (e) {
      console.log("  JSON解析失败");
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

async function saveAnalysisResult(video, analysisResult, status = "success") {
  const bloggerDir = path.join(resultsDir, testBloggerName);
  const videosDir = path.join(bloggerDir, "videos");

  if (!fs.existsSync(bloggerDir)) {
    fs.mkdirSync(bloggerDir, { recursive: true });
  }
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const {
    keywords,
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
    return: returnValue,
    target,
    risks,
  } = extractKeywordsAndCategory(analysisResult);

  const isLowQuality = quality === "low" || status === "low_quality";
  const isInaccessible =
    quality === "inaccessible" || status === "inaccessible";

  const videoData = {
    video_id: video.aweme_id,
    url: video.url,
    author: video.author,
    author_id: video.author_id,
    title: video.title,
    analyzed_at: new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
    }),
    status: isInaccessible
      ? "inaccessible"
      : isLowQuality
        ? "low_quality"
        : "success",
    quality: isInaccessible ? "inaccessible" : isLowQuality ? "low" : "high",
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
  fs.writeFileSync(jsonFilePath, JSON.stringify(videoData, null, 2), "utf-8");

  return videoData;
}

async function updateBloggerMetadata(author, secUid, newVideoData) {
  const bloggerDir = path.join(resultsDir, testBloggerName);
  const metadataPath = path.join(bloggerDir, "metadata.json");

  let metadata = {
    blogger_name: author,
    blogger_id: null,
    sec_uid: secUid,
    blogger_url: secUid ? `https://www.douyin.com/user/${secUid}` : null,
    follower_count: 0,
    video_count: 0,
    score: null,
    source_keyword: null,
    discovered_at: null,
    last_fetch_time: null,
    total_videos: 0,
    high_quality_count: 0,
    low_quality_count: 0,
    inaccessible_count: 0,
    high_quality_ratio: "0%",
    low_quality_ratio: "0%",
    last_analyzed_at: null,
    videos: [],
  };

  if (fs.existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    } catch (e) {
      console.log("  读取 metadata.json 失败，将重新创建");
    }
  }

  const existingIndex = metadata.videos.findIndex(
    (v) => v.video_id === newVideoData.video_id,
  );
  if (existingIndex !== -1) {
    const oldVideo = metadata.videos[existingIndex];
    if (oldVideo.quality === "high") metadata.high_quality_count--;
    if (oldVideo.quality === "low") metadata.low_quality_count--;
    if (oldVideo.quality === "inaccessible") metadata.inaccessible_count--;

    metadata.videos[existingIndex] = {
      video_id: newVideoData.video_id,
      status: newVideoData.status,
      quality: newVideoData.quality,
      analyzed_at: newVideoData.analyzed_at,
      topic: newVideoData.topic,
      project_related: newVideoData.project_related,
      project_name: newVideoData.project_name,
      keywords: newVideoData.keywords,
      how_to_do: newVideoData.how_to_do,
      investment: newVideoData.investment,
      return: newVideoData["return"],
      target: newVideoData.target,
      risks: newVideoData.risks,
    };
  } else {
    metadata.videos.push({
      video_id: newVideoData.video_id,
      status: newVideoData.status,
      quality: newVideoData.quality,
      analyzed_at: newVideoData.analyzed_at,
      topic: newVideoData.topic,
      project_related: newVideoData.project_related,
      project_name: newVideoData.project_name,
      keywords: newVideoData.keywords,
      how_to_do: newVideoData.how_to_do,
      investment: newVideoData.investment,
      return: newVideoData["return"],
      target: newVideoData.target,
      risks: newVideoData.risks,
    });
  }

  if (newVideoData.quality === "high") metadata.high_quality_count++;
  if (newVideoData.quality === "low") metadata.low_quality_count++;
  if (newVideoData.quality === "inaccessible") metadata.inaccessible_count++;

  metadata.total_videos = metadata.videos.length;

  if (metadata.total_videos > 0) {
    metadata.high_quality_ratio =
      ((metadata.high_quality_count / metadata.total_videos) * 100).toFixed(1) +
      "%";
    metadata.low_quality_ratio =
      ((metadata.low_quality_count / metadata.total_videos) * 100).toFixed(1) +
      "%";
  }

  if (newVideoData.keywords && newVideoData.keywords.length > 0) {
    addKeywordsToDiscovered(newVideoData.keywords);
  }

  metadata.last_analyzed_at = newVideoData.analyzed_at;

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

  return metadata;
}

async function runTest() {
  console.log("测试1: 高质量视频（方法论）\n");

  const highQualityMockResult = `JSON_OUTPUT:{"quality":"high","topic":"口播账号起号方法论","project_related":true,"project_name":"口播账号运营","keywords":["口播账号","短视频创业","起号方法"],"category":"短视频运营","summary":"专注分享口播账号运营的实战派","how_to_do":"定位→内容→运营三步走","investment":"需要手机、表达能力","return":"未提及","target":"有一定表达能力的创业者","risks":"未提及"}`;

  const video1 = {
    aweme_id: "1111111111111111111",
    url: "https://www.douyin.com/video/1111111111111111111",
    author: testBloggerName,
    author_id: "test456",
    title: "测试视频 - 口播账号起号方法论",
  };

  const videoData1 = await saveAnalysisResult(video1, highQualityMockResult);
  console.log(`✅ videos/${video1.aweme_id}.json 已生成`);

  const metadata1 = await updateBloggerMetadata(
    testBloggerName,
    "test456_sec_uid",
    videoData1,
  );
  console.log("✅ metadata.json 已更新\n");

  console.log("测试2: 低质量视频（纯观点）\n");

  const lowQualityMockResult = `JSON_OUTPUT:{"quality":"low","topic":"创业思维重要性","project_related":false,"judgment":"仅讲认知和思维，未提供可操作方法","issues":"纯观点类内容，无项目信息"}`;

  const video2 = {
    aweme_id: "2222222222222222222",
    url: "https://www.douyin.com/video/2222222222222222222",
    author: testBloggerName,
    author_id: "test456",
    title: "测试视频 - 创业思维",
  };

  const videoData2 = await saveAnalysisResult(video2, lowQualityMockResult);
  console.log(`✅ videos/${video2.aweme_id}.json 已生成`);

  const metadata2 = await updateBloggerMetadata(
    testBloggerName,
    "test456_sec_uid",
    videoData2,
  );
  console.log("✅ metadata.json 已更新\n");

  console.log("========== 验证结果 ==========\n");

  console.log("1. videos/{video_id}.json 字段检查:");
  console.log(`   video_id: ${videoData1.video_id ? "✅" : "❌"}`);
  console.log(
    `   quality: ${videoData1.quality === "high" ? "✅" : "❌"} (${videoData1.quality})`,
  );
  console.log(
    `   project_related: ${videoData1.project_related === true ? "✅" : "❌"} (${videoData1.project_related})`,
  );
  console.log(
    `   project_name: ${videoData1.project_name ? "✅" : "❌"} (${videoData1.project_name})`,
  );
  console.log(
    `   how_to_do: ${videoData1.how_to_do ? "✅" : "❌"} (${videoData1.how_to_do})`,
  );
  console.log(
    `   investment: ${videoData1.investment ? "✅" : "⚠️"} (${videoData1.investment || "null"})`,
  );
  console.log(
    `   target: ${videoData1.target ? "✅" : "⚠️"} (${videoData1.target || "null"})`,
  );

  console.log("\n2. metadata.json 统计检查:");
  console.log(
    `   total_videos: ${metadata2.total_videos === 2 ? "✅" : "❌"} (${metadata2.total_videos})`,
  );
  console.log(
    `   high_quality_count: ${metadata2.high_quality_count === 1 ? "✅" : "❌"} (${metadata2.high_quality_count})`,
  );
  console.log(
    `   low_quality_count: ${metadata2.low_quality_count === 1 ? "✅" : "❌"} (${metadata2.low_quality_count})`,
  );
  console.log(
    `   high_quality_ratio: ${metadata2.high_quality_ratio === "50.0%" ? "✅" : "❌"} (${metadata2.high_quality_ratio})`,
  );

  console.log("\n3. metadata.json videos[] 字段检查:");
  const metaVideo = metadata2.videos[0];
  console.log(`   video_id: ${metaVideo.video_id ? "✅" : "❌"}`);
  console.log(
    `   topic: ${metaVideo.topic ? "✅" : "❌"} (${metaVideo.topic})`,
  );
  console.log(
    `   project_related: ${metaVideo.project_related !== undefined ? "✅" : "❌"} (${metaVideo.project_related})`,
  );
  console.log(
    `   project_name: ${metaVideo.project_name ? "✅" : "⚠️"} (${metaVideo.project_name || "null"})`,
  );
  console.log(
    `   how_to_do: ${metaVideo.how_to_do ? "✅" : "⚠️"} (${metaVideo.how_to_do || "null"})`,
  );
  console.log(
    `   investment: ${metaVideo.investment !== undefined ? "✅" : "❌"} (${metaVideo.investment || "null"})`,
  );
  console.log(
    `   return: ${metaVideo["return"] !== undefined ? "✅" : "❌"} (${metaVideo["return"] || "null"})`,
  );
  console.log(
    `   target: ${metaVideo.target !== undefined ? "✅" : "❌"} (${metaVideo.target || "null"})`,
  );
  console.log(
    `   risks: ${metaVideo.risks !== undefined ? "✅" : "❌"} (${metaVideo.risks || "null"})`,
  );

  console.log("\n4. 完整 metadata.json 结构:");
  console.log(JSON.stringify(metadata2, null, 2));

  console.log("\n测试完成！");
}

runTest().catch(console.error);
