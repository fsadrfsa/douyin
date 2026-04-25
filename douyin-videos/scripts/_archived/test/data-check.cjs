const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = "d:\\opencli\\douyin-videos";
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const RESULTS_DIR = path.join(PROJECT_ROOT, "results");
const AUDIO_DIR = path.join(PROJECT_ROOT, "audio");
const TRANSCRIPTS_DIR = path.join(PROJECT_ROOT, "transcripts");
const ARCHIVED_DIR = path.join(PROJECT_ROOT, "archived");

const issues = [];
const warnings = [];
const stats = {};

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return null;
  }
}

function collectFiles(dir, ext, recursive) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        results.push(...collectFiles(fullPath, ext, recursive));
      }
    }
  } catch (e) {}
  return results;
}

function addIssue(stage, category, severity, message, detail) {
  const entry = { stage, category, severity, message, detail: detail || null };
  if (severity === "error") {
    issues.push(entry);
  } else {
    warnings.push(entry);
  }
}

function checkStage1() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 1: 博主发现");
  console.log("=".repeat(60));

  const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
  if (!bloggers) {
    addIssue(
      "stage1",
      "bloggers.json",
      "error",
      "bloggers.json 不存在或格式错误",
    );
    console.log("  ❌ bloggers.json 不存在或格式错误");
    return;
  }

  const bloggerArray = Array.isArray(bloggers) ? bloggers : [];
  stats.stage1_total_bloggers = bloggerArray.length;
  console.log(`  博主总数: ${bloggerArray.length}`);

  const secUidSet = new Set();
  let missingFields = 0;
  let duplicates = 0;
  let blacklisted = 0;

  for (const b of bloggerArray) {
    if (!b.sec_uid || !b.name || !b.url) {
      missingFields++;
      addIssue(
        "stage1",
        "blogger_fields",
        "error",
        `博主缺少必需字段: ${b.name || b.sec_uid || "unknown"}`,
      );
    }

    if (b.sec_uid && secUidSet.has(b.sec_uid)) {
      duplicates++;
      addIssue(
        "stage1",
        "duplicate_blogger",
        "error",
        `重复博主 (sec_uid): ${b.name}`,
      );
    }
    if (b.sec_uid) secUidSet.add(b.sec_uid);

    if (b.status === "blacklisted") blacklisted++;
  }

  stats.stage1_blacklisted = blacklisted;
  console.log(`  黑名单博主: ${blacklisted}`);
  if (missingFields > 0) console.log(`  ❌ 缺少必需字段: ${missingFields} 个`);
  if (duplicates > 0) console.log(`  ❌ 重复博主: ${duplicates} 个`);
  if (missingFields === 0 && duplicates === 0)
    console.log("  ✅ bloggers.json 完整性检查通过");

  const searchKeywords = loadJson(path.join(DATA_DIR, "search-keywords.json"));
  if (searchKeywords) {
    const kwList = searchKeywords.keywords || [];
    stats.stage1_search_keywords = kwList.length;
    const activeKw = kwList.filter((k) => k.status !== "deleted");
    console.log(`  搜索关键词: ${kwList.length} 个 (活跃: ${activeKw.length})`);
  }

  const discoveredKeywords = loadJson(
    path.join(DATA_DIR, "discovered-keywords.json"),
  );
  if (discoveredKeywords) {
    const dkList = discoveredKeywords.keywords || [];
    stats.stage1_discovered_keywords = dkList.length;
    const pendingDk = dkList.filter((k) => k.status === "pending");
    console.log(
      `  发现关键词: ${dkList.length} 个 (待处理: ${pendingDk.length})`,
    );
  }
}

function checkStage2() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 2: 视频采集");
  console.log("=".repeat(60));

  const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
  if (!videosData) {
    addIssue("stage2", "videos.json", "error", "videos.json 不存在或格式错误");
    console.log("  ❌ videos.json 不存在或格式错误");
    return;
  }

  const videos = videosData.videos || [];
  stats.stage2_total_videos = videos.length;
  console.log(`  视频总数: ${videos.length}`);

  const statusCounts = {};
  const qualityCounts = {};
  let missingFields = 0;
  const awemeIdSet = new Set();
  let duplicateIds = 0;

  for (const v of videos) {
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    if (v.quality) {
      qualityCounts[v.quality] = (qualityCounts[v.quality] || 0) + 1;
    }

    if (!v.aweme_id || !v.url || !v.author || !v.sec_uid) {
      missingFields++;
      if (missingFields <= 5) {
        addIssue(
          "stage2",
          "video_fields",
          "error",
          `视频缺少必需字段: ${v.aweme_id || "unknown"}`,
        );
      }
    }

    if (v.aweme_id && awemeIdSet.has(v.aweme_id)) {
      duplicateIds++;
      if (duplicateIds <= 5) {
        addIssue(
          "stage2",
          "duplicate_video",
          "error",
          `重复视频 (aweme_id): ${v.aweme_id}`,
        );
      }
    }
    if (v.aweme_id) awemeIdSet.add(v.aweme_id);
  }

  stats.stage2_status = statusCounts;
  stats.stage2_quality = qualityCounts;

  console.log("  状态分布:");
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`    ${status}: ${count}`);
  }
  if (Object.keys(qualityCounts).length > 0) {
    console.log("  质量分布:");
    for (const [q, count] of Object.entries(qualityCounts)) {
      console.log(`    ${q}: ${count}`);
    }
  }

  if (missingFields > 0) console.log(`  ❌ 缺少必需字段: ${missingFields} 个`);
  if (duplicateIds > 0) console.log(`  ❌ 重复视频: ${duplicateIds} 个`);

  if (!fs.existsSync(RESULTS_DIR)) {
    addIssue("stage2", "results_dir", "error", "results/ 目录不存在");
    console.log("  ❌ results/ 目录不存在");
    return;
  }

  const bloggerDirs = fs
    .readdirSync(RESULTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  stats.stage2_blogger_dirs = bloggerDirs.length;
  console.log(`  博主目录数: ${bloggerDirs.length}`);

  let metadataCount = 0;
  let metadataIssues = 0;
  let totalVideoJsons = 0;

  for (const dirName of bloggerDirs) {
    const metaPath = path.join(RESULTS_DIR, dirName, "metadata.json");
    if (!fs.existsSync(metaPath)) {
      metadataIssues++;
      addIssue(
        "stage2",
        "missing_metadata",
        "error",
        `博主目录缺少 metadata.json: ${dirName}`,
      );
      continue;
    }

    const meta = loadJson(metaPath);
    if (!meta) {
      metadataIssues++;
      addIssue(
        "stage2",
        "invalid_metadata",
        "error",
        `metadata.json 格式错误: ${dirName}`,
      );
      continue;
    }

    metadataCount++;

    const videosDir = path.join(RESULTS_DIR, dirName, "videos");
    if (fs.existsSync(videosDir)) {
      const videoFiles = fs
        .readdirSync(videosDir)
        .filter((f) => f.endsWith(".json"));
      totalVideoJsons += videoFiles.length;

      for (const vf of videoFiles) {
        const vj = loadJson(path.join(videosDir, vf));
        if (!vj) {
          addIssue(
            "stage2",
            "invalid_video_json",
            "error",
            `视频 JSON 格式错误: ${dirName}/videos/${vf}`,
          );
          continue;
        }

        const requiredFields = [
          "video_id",
          "url",
          "author",
          "analyzed_at",
          "quality",
          "main_content",
        ];
        const missing = requiredFields.filter((f) => !vj[f]);
        if (missing.length > 0 && vj.quality === "accessible") {
          addIssue(
            "stage5",
            "video_json_incomplete",
            "error",
            `accessible 视频 JSON 缺少必需字段: ${vf}`,
            { dir: dirName, missing },
          );
        }
      }
    }
  }

  stats.stage2_metadata_ok = metadataCount;
  stats.stage5_video_jsons = totalVideoJsons;
  console.log(`  metadata.json 正常: ${metadataCount} 个`);
  if (metadataIssues > 0)
    console.log(`  ❌ metadata 问题: ${metadataIssues} 个`);
  console.log(`  视频 JSON 文件: ${totalVideoJsons} 个`);

  if (missingFields === 0 && duplicateIds === 0 && metadataIssues === 0) {
    console.log("  ✅ Stage 2 数据检查通过");
  }
}

function checkStage3() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 3: 商业信息筛选");
  console.log("=".repeat(60));

  const filterReport = loadJson(path.join(DATA_DIR, "filter-report.json"));
  if (!filterReport) {
    addIssue("stage3", "filter_report", "warning", "filter-report.json 不存在");
    console.log("  ⚠️ filter-report.json 不存在");
    return;
  }

  if (filterReport.summary) {
    console.log(`  博主总数: ${filterReport.summary.total_bloggers || 0}`);
    console.log(`  有新视频博主: ${filterReport.summary.bloggers_with_new_videos || 0}`);
    console.log(`  无新视频博主: ${filterReport.summary.bloggers_without_new_videos || 0}`);
  }

  if (filterReport.filter_totals) {
    console.log("  筛选统计:");
    for (const [reason, count] of Object.entries(filterReport.filter_totals)) {
      if (count > 0) {
        console.log(`    ${reason}: ${count}`);
      }
    }
  }

  if (filterReport.bloggers_without_new_videos && filterReport.bloggers_without_new_videos.length > 0) {
    console.log(`  无新视频博主详情:`);
    for (const b of filterReport.bloggers_without_new_videos.slice(0, 3)) {
      console.log(`    ${b.blogger}: duplicate=${b.filter_reasons?.duplicate || 0}, too_short=${b.filter_reasons?.too_short || 0}`);
    }
    if (filterReport.bloggers_without_new_videos.length > 3) {
      console.log(`    ... 还有 ${filterReport.bloggers_without_new_videos.length - 3} 个`);
    }
  }

  console.log("  ✅ Stage 3 筛选报告检查通过");
}

function checkStage4a() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 4a: 音频下载");
  console.log("=".repeat(60));

  const rootAudioFiles = fs.existsSync(AUDIO_DIR)
    ? fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3"))
    : [];
  stats.stage4a_root_audio = rootAudioFiles.length;

  const archivedAudioFiles = collectFiles(
    path.join(AUDIO_DIR, "archived"),
    ".mp3",
    true,
  );
  stats.stage4a_archived_audio = archivedAudioFiles.length;

  console.log(`  根目录音频: ${rootAudioFiles.length} 个`);
  console.log(`  已归档音频: ${archivedAudioFiles.length} 个`);

  if (rootAudioFiles.length > 0) {
    addIssue(
      "stage4a",
      "root_audio_leak",
      "warning",
      `audio/ 根目录有 ${rootAudioFiles.length} 个未归档音频文件`,
    );
    console.log(`  ⚠️ 根目录有未归档音频: ${rootAudioFiles.length} 个`);
  }

  const allAudioIds = new Set();
  for (const f of rootAudioFiles) allAudioIds.add(path.basename(f, ".mp3"));
  for (const f of archivedAudioFiles) allAudioIds.add(path.basename(f, ".mp3"));
  stats.stage4a_total_audio = allAudioIds.size;
  console.log(`  音频总数(去重): ${allAudioIds.size} 个`);

  if (rootAudioFiles.length === 0) {
    console.log("  ✅ Stage 4a 音频检查通过");
  }
}

function checkStage4b() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 4b: 转录");
  console.log("=".repeat(60));

  const rootTranscripts = fs.existsSync(TRANSCRIPTS_DIR)
    ? fs.readdirSync(TRANSCRIPTS_DIR).filter((f) => f.endsWith(".txt"))
    : [];
  stats.stage4b_root_transcripts = rootTranscripts.length;

  const archivedTranscripts = collectFiles(
    path.join(TRANSCRIPTS_DIR, "archived"),
    ".txt",
    true,
  );
  stats.stage4b_archived_transcripts = archivedTranscripts.length;

  const reviewTranscripts = collectFiles(
    path.join(TRANSCRIPTS_DIR, "review"),
    ".txt",
    true,
  );
  stats.stage4b_review_transcripts = reviewTranscripts.length;

  console.log(`  根目录转录: ${rootTranscripts.length} 个`);
  console.log(`  已归档转录: ${archivedTranscripts.length} 个`);
  console.log(`  审阅转录: ${reviewTranscripts.length} 个`);

  if (rootTranscripts.length > 0) {
    addIssue(
      "stage4b",
      "root_transcript_leak",
      "warning",
      `transcripts/ 根目录有 ${rootTranscripts.length} 个未归档转录文件`,
    );
    console.log(`  ⚠️ 根目录有未归档转录: ${rootTranscripts.length} 个`);
  }

  const allTranscriptIds = new Set();
  for (const f of rootTranscripts)
    allTranscriptIds.add(path.basename(f, ".txt"));
  for (const f of archivedTranscripts)
    allTranscriptIds.add(path.basename(f, ".txt"));
  for (const f of reviewTranscripts)
    allTranscriptIds.add(path.basename(f, ".txt"));
  stats.stage4b_total_transcripts = allTranscriptIds.size;
  console.log(`  转录总数(去重): ${allTranscriptIds.size} 个`);

  if (rootTranscripts.length === 0) {
    console.log("  ✅ Stage 4b 转录检查通过");
  }
}

function checkStage5() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 5: 内容整理");
  console.log("=".repeat(60));

  const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
  const videos = videosData?.videos || [];

  const processedVideos = videos.filter((v) => v.status === "processed");
  const insufficientVideos = videos.filter(
    (v) => v.status === "insufficient" || v.quality === "insufficient",
  );
  const skippedVideos = videos.filter((v) => v.status === "skipped");

  stats.stage5_processed = processedVideos.length;
  stats.stage5_insufficient = insufficientVideos.length;
  stats.stage5_skipped = skippedVideos.length;

  console.log(`  已整理 (processed): ${processedVideos.length} 个`);
  console.log(`  内容不足 (insufficient): ${insufficientVideos.length} 个`);
  console.log(`  已跳过 (skipped): ${skippedVideos.length} 个`);

  if (issues.filter((i) => i.stage === "stage5").length === 0) {
    console.log("  ✅ Stage 5 内容整理检查通过");
  }
}

function checkCrossStage() {
  console.log("\n" + "=".repeat(60));
  console.log("跨阶段: 引用完整性 & Pipeline 状态");
  console.log("=".repeat(60));

  const pipelineState = loadJson(path.join(DATA_DIR, "pipeline-state.json"));
  if (pipelineState) {
    console.log(`  Pipeline 状态: ${pipelineState.status}`);
    console.log(`  当前阶段: ${pipelineState.currentStage}`);

    if (pipelineState.status === "running" && pipelineState.currentStage) {
      const stageOrder = ["stage1", "stage2", "stage3", "stage4", "stage5"];
      const currentIndex = stageOrder.indexOf(pipelineState.currentStage);
      if (currentIndex > 0) {
        for (let i = 0; i < currentIndex; i++) {
          const prevStage = stageOrder[i];
          const stageInfo = pipelineState.stages?.[prevStage];
          if (stageInfo && stageInfo.status !== "completed") {
            addIssue(
              "cross",
              "pipeline_stage_inconsistent",
              "warning",
              `Pipeline 阶段状态不一致: ${prevStage} 应为 completed，实际为 ${stageInfo.status}`,
            );
          }
        }
      }
    }
  }

  const statistics = loadJson(path.join(DATA_DIR, "statistics.json"));
  if (statistics && statistics.overview) {
    const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
    const actualBloggers = Array.isArray(bloggers) ? bloggers.length : 0;
    const statBloggers = statistics.overview.total_bloggers;
    if (actualBloggers !== statBloggers) {
      addIssue(
        "cross",
        "statistics_mismatch",
        "warning",
        `statistics.json 博主数 (${statBloggers}) 与实际 (${actualBloggers}) 不一致`,
      );
      console.log(
        `  ⚠️ statistics.json 博主数不一致: 记录=${statBloggers}, 实际=${actualBloggers}`,
      );
    }
  }

  const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
  const bloggerArray = Array.isArray(bloggers) ? bloggers : [];
  const bloggerSecUids = new Set(bloggerArray.map((b) => b.sec_uid));

  const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
  const videos = videosData?.videos || [];

  let orphanVideos = 0;
  for (const v of videos) {
    if (v.sec_uid && !bloggerSecUids.has(v.sec_uid)) {
      orphanVideos++;
      if (orphanVideos <= 5) {
        addIssue(
          "cross",
          "orphan_video",
          "warning",
          `视频引用不存在的博主: ${v.author} (${v.aweme_id})`,
        );
      }
    }
  }
  if (orphanVideos > 0) {
    console.log(`  ⚠️ 引用不存在博主的视频: ${orphanVideos} 个`);
  }

  const archiveFiles = fs.existsSync(DATA_DIR)
    ? fs
        .readdirSync(DATA_DIR)
        .filter((f) => f.startsWith("videos-archive-") && f.endsWith(".json"))
    : [];

  let archiveVideoCount = 0;
  for (const af of archiveFiles) {
    const ad = loadJson(path.join(DATA_DIR, af));
    if (ad && ad.videos) archiveVideoCount += ad.videos.length;
  }

  stats.cross_total_with_archive = videos.length + archiveVideoCount;
  console.log(`  videos.json: ${videos.length} 个`);
  console.log(
    `  归档文件: ${archiveFiles.length} 个 (${archiveVideoCount} 条记录)`,
  );
  console.log(`  全量视频: ${videos.length + archiveVideoCount} 个`);

  const blacklist = loadJson(path.join(DATA_DIR, "blogger-blacklist.json"));
  const archiveLog = loadJson(path.join(ARCHIVED_DIR || path.join(PROJECT_ROOT, "archived"), "archive-log.json"));

  if (blacklist && blacklist.blacklist) {
    const blacklistSecUids = new Set(blacklist.blacklist.map((b) => b.sec_uid));
    let inBlacklistButInBloggers = 0;
    for (const b of bloggerArray) {
      if (blacklistSecUids.has(b.sec_uid)) {
        inBlacklistButInBloggers++;
        if (inBlacklistButInBloggers <= 5) {
          addIssue(
            "cross",
            "blacklist_inconsistency",
            "warning",
            `博主在黑名单中但仍存在于 bloggers.json: ${b.name}`,
          );
        }
      }
    }
    if (inBlacklistButInBloggers > 0) {
      console.log(`  ⚠️ 黑名单博主仍在 bloggers.json: ${inBlacklistButInBloggers} 个`);
    }
    stats.cross_blacklist_count = blacklist.blacklist.length;
    console.log(`  黑名单博主: ${blacklist.blacklist.length} 个`);
  }

  if (archiveLog && archiveLog.archives) {
    stats.cross_archived_count = archiveLog.archives.length;
    console.log(`  已归档博主: ${archiveLog.archives.length} 个`);
  }

  const activeIssues = loadJson(path.join(DATA_DIR, "active-issues.json"));
  if (activeIssues) {
    const issueCount = Array.isArray(activeIssues)
      ? activeIssues.length
      : activeIssues.issues?.length || 0;
    stats.cross_active_issues = issueCount;
    console.log(`  活跃问题: ${issueCount} 个`);
  }

  const failedLogs = fs.existsSync(path.join(DATA_DIR, "logs"))
    ? fs
        .readdirSync(path.join(DATA_DIR, "logs"))
        .filter((f) => f.startsWith("failed-")).length
    : 0;
  stats.cross_failed_logs = failedLogs;
  console.log(`  失败日志: ${failedLogs} 个 (Stage 3 历史遗留)`);

  if (failedLogs > 20) {
    addIssue(
      "cross",
      "many_failed_logs",
      "warning",
      `失败日志较多 (${failedLogs} 个)，均为 Stage 3 历史遗留，可清理`,
    );
  }

  const rootAudioFiles = fs.existsSync(AUDIO_DIR)
    ? fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3"))
    : [];
  const archivedAudioFiles = collectFiles(
    path.join(AUDIO_DIR, "archived"),
    ".mp3",
    true,
  );
  const audioIds = new Set();
  for (const f of rootAudioFiles) audioIds.add(path.basename(f, ".mp3"));
  for (const f of archivedAudioFiles) audioIds.add(path.basename(f, ".mp3"));

  const archiveVideoFiles = fs.existsSync(DATA_DIR)
    ? fs.readdirSync(DATA_DIR).filter((f) => f.startsWith("videos-archive-") && f.endsWith(".json"))
    : [];
  const allArchivedVideos = [];
  for (const af of archiveVideoFiles) {
    const ad = loadJson(path.join(DATA_DIR, af));
    if (ad && ad.videos) allArchivedVideos.push(...ad.videos);
  }

  const rootTranscripts = fs.existsSync(TRANSCRIPTS_DIR)
    ? fs.readdirSync(TRANSCRIPTS_DIR).filter((f) => f.endsWith(".txt"))
    : [];
  const archivedTranscripts = collectFiles(
    path.join(TRANSCRIPTS_DIR, "archived"),
    ".txt",
    true,
  );
  const reviewTranscripts = collectFiles(
    path.join(TRANSCRIPTS_DIR, "review"),
    ".txt",
    true,
  );
  const transcriptIds = new Set();
  for (const f of rootTranscripts) transcriptIds.add(path.basename(f, ".txt"));
  for (const f of archivedTranscripts) transcriptIds.add(path.basename(f, ".txt"));
  for (const f of reviewTranscripts) transcriptIds.add(path.basename(f, ".txt"));

  const skippedVideoIds = new Set([
    ...videos.filter((v) => v.status === "skipped").map((v) => v.aweme_id),
    ...allArchivedVideos.filter((v) => v.status === "skipped").map((v) => v.aweme_id),
  ]);
  const insufficientVideoIds = new Set([
    ...videos.filter((v) => v.status === "insufficient" || v.quality === "insufficient").map((v) => v.aweme_id),
    ...allArchivedVideos.filter((v) => v.status === "insufficient" || v.quality === "insufficient").map((v) => v.aweme_id),
  ]);

  let audioWithoutTranscript = 0;
  let skippedAudioWithoutTranscript = 0;
  let insufficientAudioWithoutTranscript = 0;
  const missingAudioIds = [];
  for (const audioId of audioIds) {
    if (!transcriptIds.has(audioId)) {
      if (skippedVideoIds.has(audioId)) {
        skippedAudioWithoutTranscript++;
      } else if (insufficientVideoIds.has(audioId)) {
        insufficientAudioWithoutTranscript++;
      } else {
        audioWithoutTranscript++;
        missingAudioIds.push(audioId);
      }
    }
  }
  if (skippedAudioWithoutTranscript > 0) {
    console.log(`  ℹ️ skipped 视频无转录: ${skippedAudioWithoutTranscript} 个 (正常)`);
  }
  if (insufficientAudioWithoutTranscript > 0) {
    console.log(`  ℹ️ insufficient 视频无转录: ${insufficientAudioWithoutTranscript} 个 (转录在review目录)`);
  }
  if (audioWithoutTranscript > 0) {
    console.log(`  ⚠️ 有音频无转录: ${audioWithoutTranscript} 个`);
    if (audioWithoutTranscript <= 10) {
      console.log(`     缺失转录的音频ID: ${missingAudioIds.join(", ")}`);
      addIssue(
        "cross",
        "audio_without_transcript",
        "warning",
        `${audioWithoutTranscript} 个音频文件缺少对应转录: ${missingAudioIds.join(", ")}`,
      );
    }
  }
}

function generateReport() {
  console.log("\n" + "=".repeat(60));
  console.log("健康检查报告");
  console.log("=".repeat(60));

  const errorCount = issues.length;
  const warningCount = warnings.length;

  console.log(`\n  错误: ${errorCount} 个`);
  console.log(`  警告: ${warningCount} 个`);

  if (errorCount > 0) {
    console.log("\n--- 错误详情 ---");
    const byCategory = {};
    for (const issue of issues) {
      const key = `${issue.stage}/${issue.category}`;
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(issue);
    }
    for (const [key, items] of Object.entries(byCategory)) {
      console.log(`\n  [${key}] (${items.length} 个)`);
      for (const item of items.slice(0, 5)) {
        console.log(`    ❌ ${item.message}`);
      }
      if (items.length > 5) {
        console.log(`    ... 还有 ${items.length - 5} 个`);
      }
    }
  }

  if (warningCount > 0) {
    console.log("\n--- 警告详情 ---");
    const byCategory = {};
    for (const w of warnings) {
      const key = `${w.stage}/${w.category}`;
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(w);
    }
    for (const [key, items] of Object.entries(byCategory)) {
      console.log(`\n  [${key}] (${items.length} 个)`);
      for (const item of items.slice(0, 3)) {
        console.log(`    ⚠️ ${item.message}`);
      }
      if (items.length > 3) {
        console.log(`    ... 还有 ${items.length - 3} 个`);
      }
    }
  }

  console.log("\n--- 数据统计摘要 ---");
  console.log(
    `  Stage 1: ${stats.stage1_total_bloggers || 0} 博主, ${stats.stage1_search_keywords || 0} 搜索关键词, ${stats.stage1_discovered_keywords || 0} 发现关键词`,
  );
  console.log(
    `  Stage 2: ${stats.stage2_total_videos || 0} 视频, ${stats.stage2_blogger_dirs || 0} 博主目录, ${stats.stage5_video_jsons || 0} 视频 JSON`,
  );
  console.log(
    `  Stage 4a: ${stats.stage4a_total_audio || 0} 音频 (根目录: ${stats.stage4a_root_audio || 0}, 归档: ${stats.stage4a_archived_audio || 0})`,
  );
  console.log(
    `  Stage 4b: ${stats.stage4b_total_transcripts || 0} 转录 (根目录: ${stats.stage4b_root_transcripts || 0}, 归档: ${stats.stage4b_archived_transcripts || 0})`,
  );
  console.log(
    `  Stage 5: ${stats.stage5_processed || 0} processed, ${stats.stage5_insufficient || 0} insufficient, ${stats.stage5_skipped || 0} skipped`,
  );

  const overall =
    errorCount === 0 && warningCount === 0
      ? "🟢 健康"
      : errorCount === 0
        ? "🟡 有警告"
        : "🔴 有错误";
  console.log(`\n  整体状态: ${overall}`);

  const reportData = {
    generated_at: new Date().toISOString(),
    overall,
    error_count: errorCount,
    warning_count: warningCount,
    issues,
    warnings,
    stats,
  };

  const reportsDir = path.join(DATA_DIR, "health-reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const historyPath = path.join(reportsDir, `data-check-${ts}.json`);
  fs.writeFileSync(historyPath, JSON.stringify(reportData, null, 2), "utf-8");
  console.log(`\n  报告已保存: ${historyPath}`);
}

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║              数据检查 (仅检测问题)                       ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`时间: ${new Date().toISOString()}`);
console.log(`项目: ${PROJECT_ROOT}`);

checkStage1();
checkStage2();
checkStage3();
checkStage4a();
checkStage4b();
checkStage5();
checkCrossStage();
generateReport();
