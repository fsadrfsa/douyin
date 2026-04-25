const fs = require("fs");
const path = require("path");

const dataDir = "d:/opencli/douyin-videos";
const dataFilesDir = path.join(dataDir, "data");
const resultsDir = path.join(dataDir, "results");
const discoveredKeywordsPath = path.join(
  dataFilesDir,
  "discovered-keywords.json",
);

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

function getBloggerDirName(author, secUid) {
  const sanitizedName = sanitizeFileName(author);
  const secUidPrefix = secUid ? `_${secUid.substring(0, 10)}` : "";
  return `${sanitizedName}${secUidPrefix}`;
}

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

function extractKeywordsAndCategory(result) {
  const keywords = [];
  let category = "";
  let summary = "";
  let quality = "high";
  let topic = "";
  let reason = "";
  let judgment = "";
  let issues = "";
  let said = "";
  let did = "";
  let purpose = "";
  let gain = "";
  let not_said = "";
  let exceptions = "";

  const jsonMatch = result.match(/JSON_OUTPUT:\s*(\{[^}]+\})/);
  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.quality) {
        quality = jsonData.quality;
      }
      if (jsonData.topic) {
        topic = jsonData.topic;
      }
      if (jsonData.reason) {
        reason = jsonData.reason;
      }
      if (jsonData.judgment) {
        judgment = jsonData.judgment;
      }
      if (jsonData.issues) {
        issues = jsonData.issues;
      }
      if (jsonData.keywords && Array.isArray(jsonData.keywords)) {
        keywords.push(...jsonData.keywords.filter((k) => k && k !== "未提及"));
      }
      if (jsonData.category && jsonData.category !== "未提及") {
        category = jsonData.category;
      }
      if (jsonData.summary && jsonData.summary !== "未提及") {
        summary = jsonData.summary;
      }
      if (jsonData.said && jsonData.said !== "未提及") {
        said = jsonData.said;
      }
      if (jsonData.did && jsonData.did !== "未提及") {
        did = jsonData.did;
      }
      if (jsonData.purpose && jsonData.purpose !== "未提及") {
        purpose = jsonData.purpose;
      }
      if (jsonData.gain && jsonData.gain !== "未提及") {
        gain = jsonData.gain;
      }
      if (jsonData.not_said) {
        not_said = jsonData.not_said;
      }
      if (jsonData.exceptions) {
        exceptions = jsonData.exceptions;
      }
    } catch (e) {}
  }

  if (keywords.length === 0) {
    const keywordMatch = result.match(/关键词[：:]\s*([^\n]+)/);
    if (keywordMatch) {
      keywords.push(
        ...keywordMatch[1]
          .trim()
          .split(/[,，、\s]+/)
          .filter((k) => k.length > 0 && k !== "未提及"),
      );
    }
  }

  if (!category) {
    const categoryMatch = result.match(/领域[：:]\s*([^\n]+)/);
    if (categoryMatch) {
      category = categoryMatch[1].trim();
      if (category === "未提及") category = "";
    }
  }

  if (!summary) {
    const summaryMatch = result.match(/博主一句话总结[：:]\s*([^\n]+)/);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
      if (summary === "未提及") summary = "";
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
    said,
    did,
    purpose,
    gain,
    not_said,
    exceptions,
  };
}

function findBloggerSecUid(author) {
  const bloggersPath = path.join(dataFilesDir, "bloggers.json");
  if (!fs.existsSync(bloggersPath)) return null;
  const bloggers = JSON.parse(fs.readFileSync(bloggersPath, "utf-8"));
  const blogger = bloggers.find((b) => b.name === author);
  return blogger ? blogger.sec_uid : null;
}

function findBloggerInfo(author) {
  const bloggersPath = path.join(dataFilesDir, "bloggers.json");
  if (!fs.existsSync(bloggersPath)) return null;
  const bloggers = JSON.parse(fs.readFileSync(bloggersPath, "utf-8"));
  return bloggers.find((b) => b.name === author);
}

function saveAnalysisResult(video, analysisResult, status = "success") {
  const secUid = findBloggerSecUid(video.author);
  const bloggerDirName = getBloggerDirName(video.author, secUid);
  const bloggerDir = path.join(resultsDir, bloggerDirName);
  const videosDir = path.join(bloggerDir, "videos");

  if (!fs.existsSync(bloggerDir)) fs.mkdirSync(bloggerDir, { recursive: true });
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

  const {
    keywords,
    category,
    summary,
    quality,
    topic,
    reason,
    judgment,
    issues,
    said,
    did,
    purpose,
    gain,
    not_said,
    exceptions,
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

  const jsonFilePath = path.join(videosDir, `${video.aweme_id}.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(videoData, null, 2), "utf-8");

  updateBloggerMetadata(video.author, secUid, videoData);

  return jsonFilePath;
}

function updateBloggerMetadata(author, secUid, newVideoData) {
  const bloggerDirName = getBloggerDirName(author, secUid);
  const bloggerDir = path.join(resultsDir, bloggerDirName);
  const metadataPath = path.join(bloggerDir, "metadata.json");

  const bloggerInfo = findBloggerInfo(author);

  let metadata = {
    blogger_name: author,
    blogger_id: bloggerInfo?.author_id || null,
    sec_uid: secUid,
    blogger_url:
      bloggerInfo?.url ||
      (secUid ? `https://www.douyin.com/user/${secUid}` : null),
    follower_count: bloggerInfo?.follower_count || 0,
    video_count: bloggerInfo?.video_count || 0,
    score: bloggerInfo?.score || null,
    source_keyword: bloggerInfo?.source_keyword || null,
    discovered_at: bloggerInfo?.discovered_at || null,
    last_fetch_time: bloggerInfo?.last_fetch_time || null,
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
      const existing = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      metadata = { ...metadata, ...existing };
    } catch (e) {}
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
}

console.log("========== 完整数据流转测试 ==========\n");

const testBlogger = "胡说老王（干货版）";
const secUid = findBloggerSecUid(testBlogger);
const bloggerDirName = getBloggerDirName(testBlogger, secUid);
const metadataPath = path.join(resultsDir, bloggerDirName, "metadata.json");

const originalMetadata = fs.existsSync(metadataPath)
  ? JSON.parse(fs.readFileSync(metadataPath, "utf-8"))
  : null;

console.log("--- 步骤 1: 模拟写入高质量视频 ---\n");

const video1 = {
  aweme_id: "TEST_HIGH_QUALITY_001",
  url: "https://www.douyin.com/video/TEST_HIGH_QUALITY_001",
  author: testBlogger,
  author_id: "7611552797049717797",
  title: "测试高质量视频",
};

const analysis1 = `
JSON_OUTPUT:{"quality":"high","topic":"短视频副业创业方法论","keywords":["副业","创业","短视频","变现"],"category":"商业变现","summary":"专注分享普通人短视频创业实战方法","said":"分享了普通人通过短视频创业的完整方法论","did":"提供了选领域、做内容、涨粉变现的具体步骤","purpose":"帮助普通人实现副业收入","gain":"可复制的创业方法论和实操建议","not_said":"需要投入的时间成本","exceptions":"需要一定基础能力，不适合完全零基础的人"}
`;

saveAnalysisResult(video1, analysis1, "success");

const metadata1 = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
console.log(`✅ metadata 更新:`);
console.log(`   总视频: ${metadata1.total_videos}`);
console.log(`   高质量: ${metadata1.high_quality_count}`);
console.log(`   低质量: ${metadata1.low_quality_count}`);
console.log(`   高质量比例: ${metadata1.high_quality_ratio}`);
console.log(`   博主ID: ${metadata1.blogger_id}`);
console.log(`   来源关键词: ${metadata1.source_keyword}`);

console.log("\n--- 步骤 2: 模拟写入低质量视频 ---\n");

const video2 = {
  aweme_id: "TEST_LOW_QUALITY_001",
  url: "https://www.douyin.com/video/TEST_LOW_QUALITY_001",
  author: testBlogger,
  author_id: "7611552797049717797",
  title: "测试低质量视频",
};

const analysis2 = `
JSON_OUTPUT:{"quality":"low","topic":"付费课程广告推销","judgment":"视频内容主要是推销付费课程，没有提供实质性的干货内容","issues":"纯广告性质，缺乏可操作的方法论"}
`;

saveAnalysisResult(video2, analysis2, "low_quality");

const metadata2 = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
console.log(`✅ metadata 更新:`);
console.log(`   总视频: ${metadata2.total_videos}`);
console.log(`   高质量: ${metadata2.high_quality_count}`);
console.log(`   低质量: ${metadata2.low_quality_count}`);
console.log(`   高质量比例: ${metadata2.high_quality_ratio}`);
console.log(`   低质量比例: ${metadata2.low_quality_ratio}`);

console.log("\n--- 步骤 3: 模拟写入不可访问视频 ---\n");

const video3 = {
  aweme_id: "TEST_INACCESSIBLE_001",
  url: "https://www.douyin.com/video/TEST_INACCESSIBLE_001",
  author: testBlogger,
  author_id: "7611552797049717797",
  title: "测试不可访问视频",
};

const analysis3 = `
JSON_OUTPUT:{"quality":"inaccessible","reason":"视频已删除"}
`;

saveAnalysisResult(video3, analysis3, "inaccessible");

const metadata3 = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
console.log(`✅ metadata 更新:`);
console.log(`   总视频: ${metadata3.total_videos}`);
console.log(`   高质量: ${metadata3.high_quality_count}`);
console.log(`   低质量: ${metadata3.low_quality_count}`);
console.log(`   不可访问: ${metadata3.inaccessible_count}`);
console.log(`   高质量比例: ${metadata3.high_quality_ratio}`);

console.log("\n--- 步骤 4: 验证数据结构 ---\n");

const videoJsonPath = path.join(
  resultsDir,
  bloggerDirName,
  "videos",
  "TEST_HIGH_QUALITY_001.json",
);
const videoJson = JSON.parse(fs.readFileSync(videoJsonPath, "utf-8"));

console.log("视频 JSON 结构:");
console.log(`  video_id: ${videoJson.video_id}`);
console.log(`  status: ${videoJson.status}`);
console.log(`  quality: ${videoJson.quality}`);
console.log(`  topic: ${videoJson.topic || "-"}`);
console.log(`  keywords: ${videoJson.keywords?.join(", ") || "-"}`);

console.log("\n博主 metadata 结构:");
console.log(`  blogger_name: ${metadata3.blogger_name}`);
console.log(`  blogger_id: ${metadata3.blogger_id}`);
console.log(`  sec_uid: ${metadata3.sec_uid?.substring(0, 20)}...`);
console.log(`  source_keyword: ${metadata3.source_keyword}`);
console.log(`  total_videos: ${metadata3.total_videos}`);
console.log(`  high_quality: ${metadata3.high_quality_count}`);
console.log(`  low_quality: ${metadata3.low_quality_count}`);
console.log(`  inaccessible: ${metadata3.inaccessible_count}`);
console.log(`  high_quality_ratio: ${metadata3.high_quality_ratio}`);

console.log("\n--- 步骤 5: 清理测试数据 ---\n");

fs.unlinkSync(
  path.join(resultsDir, bloggerDirName, "videos", "TEST_HIGH_QUALITY_001.json"),
);
fs.unlinkSync(
  path.join(resultsDir, bloggerDirName, "videos", "TEST_LOW_QUALITY_001.json"),
);
fs.unlinkSync(
  path.join(resultsDir, bloggerDirName, "videos", "TEST_INACCESSIBLE_001.json"),
);

if (originalMetadata) {
  fs.writeFileSync(
    metadataPath,
    JSON.stringify(originalMetadata, null, 2),
    "utf-8",
  );
  console.log(`✅ 测试数据已清理，原始数据已恢复`);
} else {
  const cleanMetadata = metadata3;
  cleanMetadata.videos = cleanMetadata.videos.filter(
    (v) => !v.video_id.startsWith("TEST_"),
  );
  cleanMetadata.total_videos = cleanMetadata.videos.length;
  cleanMetadata.high_quality_count = cleanMetadata.videos.filter(
    (v) => v.quality === "high",
  ).length;
  cleanMetadata.low_quality_count = cleanMetadata.videos.filter(
    (v) => v.quality === "low",
  ).length;
  cleanMetadata.inaccessible_count = cleanMetadata.videos.filter(
    (v) => v.quality === "inaccessible",
  ).length;

  if (cleanMetadata.total_videos > 0) {
    cleanMetadata.high_quality_ratio =
      (
        (cleanMetadata.high_quality_count / cleanMetadata.total_videos) *
        100
      ).toFixed(1) + "%";
    cleanMetadata.low_quality_ratio =
      (
        (cleanMetadata.low_quality_count / cleanMetadata.total_videos) *
        100
      ).toFixed(1) + "%";
  }

  fs.writeFileSync(
    metadataPath,
    JSON.stringify(cleanMetadata, null, 2),
    "utf-8",
  );
  console.log(`✅ 测试数据已清理`);
}

console.log("\n========== 测试完成 ==========\n");
console.log("数据流转链路:");
console.log("  saveAnalysisResult() → 写入 videos/{id}.json");
console.log("  updateBloggerMetadata() → 更新 metadata.json");
console.log("  博主信息从 bloggers.json 自动填充");
