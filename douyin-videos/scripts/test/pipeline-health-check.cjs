const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = "d:\\opencli\\douyin-videos";
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const RESULTS_DIR = path.join(PROJECT_ROOT, "results");
const AUDIO_DIR = path.join(PROJECT_ROOT, "audio");
const TRANSCRIPTS_DIR = path.join(PROJECT_ROOT, "transcripts");

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
  } catch (e) {
    // permission/symlink errors
  }
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
    addIssue("stage1", "bloggers.json", "error", "bloggers.json 不存在或格式错误");
    console.log("  ❌ bloggers.json 不存在或格式错误");
    return;
  }

  const bloggerArray = Array.isArray(bloggers) ? bloggers : [];
  stats.stage1_total_bloggers = bloggerArray.length;
  console.log(`  博主总数: ${bloggerArray.length}`);

  const secUidSet = new Set();
  const nameSet = new Set();
  let missingFields = 0;
  let duplicates = 0;
  let blacklisted = 0;

  const VALID_BLOGGER_STATUSES = new Set(["active", "blacklisted", "archived"]);
  let invalidStatus = 0;
  let emptyStringFields = 0;

  for (const b of bloggerArray) {
    if (!b.sec_uid || !b.name || !b.url) {
      missingFields++;
      addIssue("stage1", "blogger_fields", "error",
        `博主缺少必需字段: ${b.name || b.sec_uid || "unknown"}`,
        { missing: [!b.sec_uid && "sec_uid", !b.name && "name", !b.url && "url"].filter(Boolean) }
      );
    }

    const emptyFields = [];
    if (b.sec_uid === "") emptyFields.push("sec_uid");
    if (b.name === "") emptyFields.push("name");
    if (b.url === "") emptyFields.push("url");
    if (b.author_id === "") emptyFields.push("author_id");
    if (emptyFields.length > 0) {
      emptyStringFields++;
      if (emptyStringFields <= 5) {
        addIssue("stage1", "blogger_empty_field", "warning",
          `博主字段为空字符串: ${b.name || "unknown"}`,
          { empty: emptyFields }
        );
      }
    }

    if (b.status && !VALID_BLOGGER_STATUSES.has(b.status)) {
      invalidStatus++;
      if (invalidStatus <= 5) {
        addIssue("stage1", "blogger_invalid_status", "warning",
          `博主状态异常: ${b.name} status="${b.status}"`,
          { name: b.name, status: b.status }
        );
      }
    }

    if (b.url && !b.url.startsWith("https://www.douyin.com/user/")) {
      addIssue("stage1", "blogger_invalid_url", "warning",
        `博主 URL 格式异常: ${b.name}`,
        { url: b.url }
      );
    }

    if (b.sec_uid && secUidSet.has(b.sec_uid)) {
      duplicates++;
      addIssue("stage1", "duplicate_blogger", "error",
        `重复博主 (sec_uid): ${b.name}`,
        { sec_uid: b.sec_uid }
      );
    }
    if (b.sec_uid) secUidSet.add(b.sec_uid);

    if (b.name && nameSet.has(b.name)) {
      addIssue("stage1", "duplicate_name", "warning",
        `博主名称重复: ${b.name}`,
        { name: b.name }
      );
    }
    nameSet.add(b.name);

    if (b.status === "blacklisted") {
      blacklisted++;
    }
  }

  stats.stage1_blacklisted = blacklisted;
  console.log(`  黑名单博主: ${blacklisted}`);
  if (missingFields > 0) console.log(`  ❌ 缺少必需字段: ${missingFields} 个`);
  if (duplicates > 0) console.log(`  ❌ 重复博主 (sec_uid): ${duplicates} 个`);
  if (missingFields === 0 && duplicates === 0) console.log("  ✅ bloggers.json 完整性检查通过");

  const searchKeywords = loadJson(path.join(DATA_DIR, "search-keywords.json"));
  if (searchKeywords) {
    const kwList = searchKeywords.keywords || [];
    stats.stage1_search_keywords = kwList.length;
    const activeKw = kwList.filter(k => k.status !== "deleted");
    const deletedKw = kwList.filter(k => k.status === "deleted");
    console.log(`  搜索关键词: ${kwList.length} 个 (活跃: ${activeKw.length}, 已删除: ${deletedKw.length})`);

    const VALID_KW_STATUSES = new Set(["pending", "searching", "completed", "deleted"]);
    let invalidKwStatus = 0;
    let contradictoryKw = 0;
    let nullLastFound = 0;

    for (const kw of activeKw) {
      if (!kw.keyword || !kw.status) {
        addIssue("stage1", "keyword_fields", "warning",
          `关键词缺少字段: ${kw.id || kw.keyword || "unknown"}`,
          { id: kw.id }
        );
      }

      if (kw.status && !VALID_KW_STATUSES.has(kw.status)) {
        invalidKwStatus++;
        if (invalidKwStatus <= 5) {
          addIssue("stage1", "keyword_invalid_status", "warning",
            `关键词状态异常: ${kw.keyword} status="${kw.status}"`,
            { keyword: kw.keyword, status: kw.status }
          );
        }
      }

      if (kw.search_count > 0 && !kw.last_search_at) {
        contradictoryKw++;
        if (contradictoryKw <= 5) {
          addIssue("stage1", "keyword_contradictory", "warning",
            `关键词 search_count=${kw.search_count} 但 last_search_at 为 null: ${kw.keyword}`,
            { keyword: kw.keyword, search_count: kw.search_count }
          );
        }
      }

      if (kw.found_bloggers > 0 && !kw.last_found_at) {
        nullLastFound++;
      }
    }

    if (invalidKwStatus > 0) console.log(`  ⚠️ 关键词状态异常: ${invalidKwStatus} 个`);
    if (contradictoryKw > 0) console.log(`  ⚠️ 关键词数据矛盾 (search_count>0 但 last_search_at=null): ${contradictoryKw} 个`);
    if (nullLastFound > 0) {
      addIssue("stage1", "keyword_last_found_null", "warning",
        `${nullLastFound} 个关键词 found_bloggers>0 但 last_found_at 始终为 null`);
      console.log(`  ⚠️ last_found_at 始终 null (found_bloggers>0): ${nullLastFound} 个`);
    }
  }

  const discoveredKeywords = loadJson(path.join(DATA_DIR, "discovered-keywords.json"));
  if (discoveredKeywords) {
    const dkList = discoveredKeywords.keywords || [];
    stats.stage1_discovered_keywords = dkList.length;
    const pendingDk = dkList.filter(k => k.status === "pending");
    const promotedDk = dkList.filter(k => k.status === "promoted");
    console.log(`  发现关键词: ${dkList.length} 个 (待处理: ${pendingDk.length}, 已提升: ${promotedDk.length})`);

    const dkNames = new Set();
    let dkDuplicates = 0;
    let dateFormatInconsistent = 0;
    const VALID_DK_STATUSES = new Set(["pending", "promoted", "rejected", "duplicate"]);
    let invalidDkStatus = 0;

    for (const dk of dkList) {
      if (dkNames.has(dk.keyword)) {
        dkDuplicates++;
      }
      dkNames.add(dk.keyword);

      if (dk.status && !VALID_DK_STATUSES.has(dk.status)) {
        invalidDkStatus++;
        if (invalidDkStatus <= 5) {
          addIssue("stage1", "dk_invalid_status", "warning",
            `发现关键词状态异常: ${dk.keyword} status="${dk.status}"`);
        }
      }

      if (dk.discovered_at) {
        const isoMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dk.discovered_at);
        const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(dk.discovered_at);
        if (!isoMatch && !dateOnlyMatch) {
          dateFormatInconsistent++;
          if (dateFormatInconsistent <= 5) {
            addIssue("stage1", "dk_date_format", "warning",
              `发现关键词日期格式异常: ${dk.keyword} discovered_at="${dk.discovered_at}"`);
          }
        }
      }
    }
    if (dkDuplicates > 0) {
      addIssue("stage1", "discovered_keyword_dup", "warning",
        `discovered-keywords.json 中有 ${dkDuplicates} 个重复关键词`);
      console.log(`  ⚠️ 发现关键词重复: ${dkDuplicates} 个`);
    }
    if (invalidDkStatus > 0) console.log(`  ⚠️ 发现关键词状态异常: ${invalidDkStatus} 个`);
    if (dateFormatInconsistent > 0) console.log(`  ⚠️ 发现关键词日期格式不一致: ${dateFormatInconsistent} 个`);

    if (dkList.length > 0 && pendingDk.length === dkList.length) {
      addIssue("stage1", "dk_all_pending", "warning",
        `${dkList.length} 个发现关键词全部处于 pending 状态，无任何处理进展`);
      console.log(`  ⚠️ 全部发现关键词停滞在 pending`);
    }
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

  const VALID_VIDEO_STATUSES = new Set(["pending", "downloaded", "transcribed", "processed", "insufficient", "skipped", "error"]);
  const VALID_QUALITIES = new Set(["accessible", "insufficient", "inaccessible"]);
  let invalidVideoStatus = 0;
  let invalidQuality = 0;
  let emptyStringVideoFields = 0;
  let invalidUrlFormat = 0;
  let nonNumericAwemeId = 0;

  for (const v of videos) {
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    if (v.quality) {
      qualityCounts[v.quality] = (qualityCounts[v.quality] || 0) + 1;
    }

    if (!v.aweme_id || !v.url || !v.author || !v.sec_uid) {
      missingFields++;
      if (missingFields <= 5) {
        addIssue("stage2", "video_fields", "error",
          `视频缺少必需字段: ${v.aweme_id || "unknown"}`,
          { missing: [!v.aweme_id && "aweme_id", !v.url && "url", !v.author && "author", !v.sec_uid && "sec_uid"].filter(Boolean) }
        );
      }
    }

    const emptyFields = [];
    if (v.aweme_id === "") emptyFields.push("aweme_id");
    if (v.url === "") emptyFields.push("url");
    if (v.author === "") emptyFields.push("author");
    if (v.sec_uid === "") emptyFields.push("sec_uid");
    if (v.author_id === "") emptyFields.push("author_id");
    if (v.title === "") emptyFields.push("title");
    if (emptyFields.length > 0) {
      emptyStringVideoFields++;
      if (emptyStringVideoFields <= 5) {
        addIssue("stage2", "video_empty_field", "warning",
          `视频字段为空字符串: ${v.aweme_id || "unknown"}`,
          { empty: emptyFields }
        );
      }
    }

    if (v.status && !VALID_VIDEO_STATUSES.has(v.status)) {
      invalidVideoStatus++;
      if (invalidVideoStatus <= 5) {
        addIssue("stage2", "video_invalid_status", "warning",
          `视频状态异常: ${v.aweme_id} status="${v.status}"`,
          { aweme_id: v.aweme_id, status: v.status }
        );
      }
    }

    if (v.quality && !VALID_QUALITIES.has(v.quality)) {
      invalidQuality++;
      if (invalidQuality <= 5) {
        addIssue("stage2", "video_invalid_quality", "warning",
          `视频质量值异常: ${v.aweme_id} quality="${v.quality}"`,
          { aweme_id: v.aweme_id, quality: v.quality }
        );
      }
    }

    if (v.url && !v.url.startsWith("https://www.douyin.com/video/")) {
      invalidUrlFormat++;
      if (invalidUrlFormat <= 5) {
        addIssue("stage2", "video_invalid_url", "warning",
          `视频 URL 格式异常: ${v.aweme_id}`,
          { aweme_id: v.aweme_id, url: v.url }
        );
      }
    }

    if (v.aweme_id && !/^\d+$/.test(v.aweme_id)) {
      nonNumericAwemeId++;
      if (nonNumericAwemeId <= 5) {
        addIssue("stage2", "video_non_numeric_id", "warning",
          `视频 aweme_id 非纯数字: ${v.aweme_id}`);
      }
    }

    if (v.aweme_id && awemeIdSet.has(v.aweme_id)) {
      duplicateIds++;
      if (duplicateIds <= 5) {
        addIssue("stage2", "duplicate_video", "error",
          `重复视频 (aweme_id): ${v.aweme_id}`);
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
  if (duplicateIds > 0) console.log(`  ❌ 重复视频 (aweme_id): ${duplicateIds} 个`);

  const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
  const bloggerArray = Array.isArray(bloggers) ? bloggers : [];
  const bloggerSecUids = new Set(bloggerArray.map(b => b.sec_uid));

  let videosWithoutBlogger = 0;
  for (const v of videos) {
    if (v.sec_uid && !bloggerSecUids.has(v.sec_uid)) {
      videosWithoutBlogger++;
      if (videosWithoutBlogger <= 5) {
        addIssue("stage2", "video_no_blogger", "error",
          `视频的博主不在 bloggers.json 中: ${v.aweme_id} (${v.author})`,
          { aweme_id: v.aweme_id, author: v.author, sec_uid: v.sec_uid }
        );
      }
    }
  }
  if (videosWithoutBlogger > 0) {
    console.log(`  ❌ 视频博主不在 bloggers.json: ${videosWithoutBlogger} 个`);
  }

  if (!fs.existsSync(RESULTS_DIR)) {
    addIssue("stage2", "results_dir", "error", "results/ 目录不存在");
    console.log("  ❌ results/ 目录不存在");
    return;
  }

  const bloggerDirs = fs.readdirSync(RESULTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  stats.stage2_blogger_dirs = bloggerDirs.length;
  console.log(`  博主目录数: ${bloggerDirs.length}`);

  let metadataCount = 0;
  let metadataIssues = 0;
  let totalVideoJsons = 0;

  for (const dirName of bloggerDirs) {
    const metaPath = path.join(RESULTS_DIR, dirName, "metadata.json");
    if (!fs.existsSync(metaPath)) {
      metadataIssues++;
      addIssue("stage2", "missing_metadata", "error",
        `博主目录缺少 metadata.json: ${dirName}`);
      continue;
    }

    const meta = loadJson(metaPath);
    if (!meta) {
      metadataIssues++;
      addIssue("stage2", "invalid_metadata", "error",
        `metadata.json 格式错误: ${dirName}`);
      continue;
    }

    metadataCount++;

    if (!meta.sec_uid) {
      addIssue("stage2", "metadata_no_sec_uid", "warning",
        `metadata.json 缺少 sec_uid: ${dirName}`);
    }

    const metaNullStats = [
      "total_videos", "high_quality_count", "low_quality_count",
      "inaccessible_count", "high_quality_ratio", "low_quality_ratio",
      "project_related_count", "project_names"
    ];
    const nullMetaFields = metaNullStats.filter(f => meta[f] === null || meta[f] === undefined);
    if (nullMetaFields.length === metaNullStats.length) {
      addIssue("stage2", "metadata_all_stats_null", "warning",
        `metadata.json 所有统计字段均为 null: ${dirName}`,
        { null_fields: nullMetaFields }
      );
    }

    if (meta.videos && Array.isArray(meta.videos)) {
      const allPlayCountZero = meta.videos.every(v => v.play_count === 0);
      if (allPlayCountZero && meta.videos.length > 0) {
        addIssue("stage2", "metadata_play_count_zero", "warning",
          `metadata.json 所有视频 play_count=0: ${dirName}`);
      }
    }

    const videosDir = path.join(RESULTS_DIR, dirName, "videos");
    if (fs.existsSync(videosDir)) {
      const videoFiles = fs.readdirSync(videosDir).filter(f => f.endsWith(".json"));
      totalVideoJsons += videoFiles.length;

      for (const vf of videoFiles) {
        const vj = loadJson(path.join(videosDir, vf));
        if (!vj) {
          addIssue("stage2", "invalid_video_json", "error",
            `视频 JSON 格式错误: ${dirName}/videos/${vf}`);
          continue;
        }

        const requiredFields = ["video_id", "url", "author", "analyzed_at", "quality", "main_content"];
        const missing = requiredFields.filter(f => !vj[f]);
        if (missing.length > 0 && vj.quality === "accessible") {
          addIssue("stage5", "video_json_incomplete", "error",
            `accessible 视频 JSON 缺少必需字段: ${vf}`,
            { dir: dirName, missing }
          );
        }

        if (vj.quality === "accessible") {
          const emptyFields = [];
          if (vj.main_content === "") emptyFields.push("main_content");
          if (vj.author_id === "") emptyFields.push("author_id");
          if (vj.topic === "") emptyFields.push("topic");
          if (vj.title === "") emptyFields.push("title");
          if (emptyFields.length > 0) {
            addIssue("stage5", "video_json_empty_field", "warning",
              `accessible 视频 JSON 字段为空字符串: ${vf}`,
              { dir: dirName, empty: emptyFields }
            );
          }
        }
      }
    }
  }

  stats.stage2_metadata_ok = metadataCount;
  stats.stage5_video_jsons = totalVideoJsons;
  console.log(`  metadata.json 正常: ${metadataCount} 个`);
  if (metadataIssues > 0) console.log(`  ❌ metadata 问题: ${metadataIssues} 个`);
  console.log(`  视频 JSON 文件: ${totalVideoJsons} 个`);

  if (missingFields === 0 && duplicateIds === 0 && videosWithoutBlogger === 0 && metadataIssues === 0) {
    console.log("  ✅ Stage 2 数据检查通过");
  }
}

function checkStage4a() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 4a: 音频下载");
  console.log("=".repeat(60));

  const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
  const videos = videosData?.videos || [];

  const rootAudioFiles = fs.existsSync(AUDIO_DIR)
    ? fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith(".mp3"))
    : [];
  stats.stage4a_root_audio = rootAudioFiles.length;

  const archivedAudioFiles = collectFiles(path.join(AUDIO_DIR, "archived"), ".mp3", true);
  stats.stage4a_archived_audio = archivedAudioFiles.length;

  console.log(`  根目录音频: ${rootAudioFiles.length} 个`);
  console.log(`  已归档音频: ${archivedAudioFiles.length} 个`);

  if (rootAudioFiles.length > 0) {
    addIssue("stage4a", "root_audio_leak", "warning",
      `audio/ 根目录有 ${rootAudioFiles.length} 个未归档音频文件`,
      { files: rootAudioFiles.slice(0, 10) }
    );
    console.log(`  ⚠️ 根目录有未归档音频: ${rootAudioFiles.length} 个`);
    for (const f of rootAudioFiles.slice(0, 5)) {
      console.log(`    - ${f}`);
    }
    if (rootAudioFiles.length > 5) {
      console.log(`    ... 还有 ${rootAudioFiles.length - 5} 个`);
    }
  }

  const allAudioIds = new Set();
  for (const f of rootAudioFiles) {
    allAudioIds.add(path.basename(f, ".mp3"));
  }
  for (const f of archivedAudioFiles) {
    allAudioIds.add(path.basename(f, ".mp3"));
  }
  stats.stage4a_total_audio = allAudioIds.size;
  console.log(`  音频总数(去重): ${allAudioIds.size} 个`);

  const downloadedStatuses = ["downloaded", "transcribed", "processed", "insufficient", "skipped"];
  const videosNeedingAudio = videos.filter(v => downloadedStatuses.includes(v.status));
  let missingAudio = 0;
  for (const v of videosNeedingAudio) {
    if (!allAudioIds.has(v.aweme_id)) {
      missingAudio++;
      if (missingAudio <= 5) {
        addIssue("stage4a", "missing_audio", "warning",
          `已下载视频缺少音频: ${v.aweme_id} (${v.author})`,
          { aweme_id: v.aweme_id, status: v.status }
        );
      }
    }
  }
  if (missingAudio > 0) {
    console.log(`  ⚠️ 已下载视频缺少音频: ${missingAudio} 个`);
  }

  const segmentsDir = path.join(TRANSCRIPTS_DIR, "_segments");
  if (fs.existsSync(segmentsDir)) {
    const segMp3Files = fs.readdirSync(segmentsDir).filter(f => f.endsWith(".mp3"));
    stats.stage4a_segment_mp3 = segMp3Files.length;
    console.log(`  分段音频缓存: ${segMp3Files.length} 个`);
  }

  if (rootAudioFiles.length === 0 && missingAudio === 0) {
    console.log("  ✅ Stage 4a 音频检查通过");
  }
}

function checkStage4b() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 4b: 转录");
  console.log("=".repeat(60));

  const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
  const videos = videosData?.videos || [];

  const rootTranscripts = fs.existsSync(TRANSCRIPTS_DIR)
    ? fs.readdirSync(TRANSCRIPTS_DIR).filter(f => f.endsWith(".txt"))
    : [];
  stats.stage4b_root_transcripts = rootTranscripts.length;

  const archivedTranscripts = collectFiles(path.join(TRANSCRIPTS_DIR, "archived"), ".txt", true);
  stats.stage4b_archived_transcripts = archivedTranscripts.length;

  const reviewTranscripts = collectFiles(path.join(TRANSCRIPTS_DIR, "review"), ".txt", true);
  stats.stage4b_review_transcripts = reviewTranscripts.length;

  console.log(`  根目录转录: ${rootTranscripts.length} 个`);
  console.log(`  已归档转录: ${archivedTranscripts.length} 个`);
  console.log(`  审阅转录: ${reviewTranscripts.length} 个`);

  if (rootTranscripts.length > 0) {
    addIssue("stage4b", "root_transcript_leak", "warning",
      `transcripts/ 根目录有 ${rootTranscripts.length} 个未归档转录文件`,
      { files: rootTranscripts.slice(0, 10) }
    );
    console.log(`  ⚠️ 根目录有未归档转录: ${rootTranscripts.length} 个`);
    for (const f of rootTranscripts.slice(0, 5)) {
      console.log(`    - ${f}`);
    }
    if (rootTranscripts.length > 5) {
      console.log(`    ... 还有 ${rootTranscripts.length - 5} 个`);
    }
  }

  const allTranscriptIds = new Set();
  for (const f of rootTranscripts) {
    allTranscriptIds.add(path.basename(f, ".txt"));
  }
  for (const f of archivedTranscripts) {
    allTranscriptIds.add(path.basename(f, ".txt"));
  }
  for (const f of reviewTranscripts) {
    allTranscriptIds.add(path.basename(f, ".txt"));
  }
  stats.stage4b_total_transcripts = allTranscriptIds.size;
  console.log(`  转录总数(去重): ${allTranscriptIds.size} 个`);

  const transcribedStatuses = ["transcribed", "processed", "insufficient"];
  const videosNeedingTranscript = videos.filter(v => transcribedStatuses.includes(v.status));
  let missingTranscript = 0;
  for (const v of videosNeedingTranscript) {
    if (!allTranscriptIds.has(v.aweme_id)) {
      missingTranscript++;
      if (missingTranscript <= 5) {
        addIssue("stage4b", "missing_transcript", "warning",
          `已转录视频缺少转录文件: ${v.aweme_id} (${v.author})`,
          { aweme_id: v.aweme_id, status: v.status }
        );
      }
    }
  }
  if (missingTranscript > 0) {
    console.log(`  ⚠️ 已转录视频缺少转录文件: ${missingTranscript} 个`);
  }

  let statusInconsistency = 0;
  for (const v of videos) {
    if (v.status === "transcribed" || v.status === "processed") {
      if (!allTranscriptIds.has(v.aweme_id)) {
        statusInconsistency++;
      }
    }
  }
  if (statusInconsistency > 0) {
    console.log(`  ⚠️ 状态与转录文件不一致: ${statusInconsistency} 个`);
  }

  const reviewDir = path.join(TRANSCRIPTS_DIR, "review");
  if (fs.existsSync(reviewDir)) {
    const categories = fs.readdirSync(reviewDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    console.log(`  审阅分类: ${categories.join(", ")}`);

    for (const cat of categories) {
      const catFiles = fs.readdirSync(path.join(reviewDir, cat)).filter(f => f.endsWith(".txt"));
      console.log(`    ${cat}: ${catFiles.length} 个`);
    }
  }

  if (rootTranscripts.length === 0 && missingTranscript === 0) {
    console.log("  ✅ Stage 4b 转录检查通过");
  }
}

function checkStage5() {
  console.log("\n" + "=".repeat(60));
  console.log("Stage 5: 内容整理");
  console.log("=".repeat(60));

  const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
  const videos = videosData?.videos || [];

  const processedVideos = videos.filter(v => v.status === "processed");
  const insufficientVideos = videos.filter(v => v.status === "insufficient" || v.quality === "insufficient");
  const skippedVideos = videos.filter(v => v.status === "skipped");

  stats.stage5_processed = processedVideos.length;
  stats.stage5_insufficient = insufficientVideos.length;
  stats.stage5_skipped = skippedVideos.length;

  console.log(`  已整理 (processed): ${processedVideos.length} 个`);
  console.log(`  内容不足 (insufficient): ${insufficientVideos.length} 个`);
  console.log(`  已跳过 (skipped): ${skippedVideos.length} 个`);

  const cleanedDir = path.join(DATA_DIR, "cleaned-results");
  if (fs.existsSync(cleanedDir)) {
    const cleanedFiles = fs.readdirSync(cleanedDir).filter(f => f.endsWith(".json"));
    if (cleanedFiles.length > 0) {
      addIssue("stage5", "stale_cleaned_results", "warning",
        `cleaned-results/ 有 ${cleanedFiles.length} 个未处理文件`,
        { files: cleanedFiles }
      );
      console.log(`  ⚠️ cleaned-results/ 有未处理文件: ${cleanedFiles.length} 个`);
    }
  }

  let missingVideoJson = 0;
  let missingTranscriptArchive = 0;

  const bloggerDirs = fs.existsSync(RESULTS_DIR)
    ? fs.readdirSync(RESULTS_DIR, { withFileTypes: true }).filter(d => d.isDirectory())
    : [];

  for (const v of processedVideos) {
    if (v.quality === "accessible") {
      let found = false;
      for (const bd of bloggerDirs) {
        const vjPath = path.join(RESULTS_DIR, bd.name, "videos", `${v.aweme_id}.json`);
        if (fs.existsSync(vjPath)) {
          found = true;

          const vj = loadJson(vjPath);
          if (vj && vj.main_content) {
            const contentLen = vj.main_content.length;
            if (contentLen < 300) {
              addIssue("stage5", "short_content", "warning",
                `accessible 视频内容过短: ${v.aweme_id} (${contentLen} 字符)`,
                { aweme_id: v.aweme_id, length: contentLen }
              );
            }
          }
          break;
        }
      }

      if (!found) {
        missingVideoJson++;
        if (missingVideoJson <= 5) {
          addIssue("stage5", "missing_video_json", "error",
            `processed+accessible 视频缺少 JSON: ${v.aweme_id} (${v.author})`,
            { aweme_id: v.aweme_id }
          );
        }
      }

      const rootTransPath = path.join(TRANSCRIPTS_DIR, `${v.aweme_id}.txt`);
      if (fs.existsSync(rootTransPath)) {
        missingTranscriptArchive++;
        if (missingTranscriptArchive <= 5) {
          addIssue("stage5", "transcript_not_archived", "warning",
            `processed 视频转录未归档: ${v.aweme_id}`,
            { aweme_id: v.aweme_id }
          );
        }
      }
    }
  }

  if (missingVideoJson > 0) {
    console.log(`  ❌ processed+accessible 缺少视频 JSON: ${missingVideoJson} 个`);
  }
  if (missingTranscriptArchive > 0) {
    console.log(`  ⚠️ processed 视频转录未归档: ${missingTranscriptArchive} 个`);
  }

  for (const v of insufficientVideos) {
    const reviewCategories = ["whisper-hallucination", "content-fragmented"];
    let foundInReview = false;
    for (const cat of reviewCategories) {
      const reviewPath = path.join(TRANSCRIPTS_DIR, "review", cat, `${v.aweme_id}.txt`);
      if (fs.existsSync(reviewPath)) {
        foundInReview = true;
        break;
      }
    }

    const archivedPath = findArchivedTranscript(v.aweme_id);
    if (!foundInReview && !archivedPath) {
      const rootPath = path.join(TRANSCRIPTS_DIR, `${v.aweme_id}.txt`);
      if (!fs.existsSync(rootPath)) {
        addIssue("stage5", "insufficient_no_review", "warning",
          `insufficient 视频转录不在 review/ 也不在 archived/: ${v.aweme_id}`,
          { aweme_id: v.aweme_id }
        );
      }
    }
  }

  if (missingVideoJson === 0 && missingTranscriptArchive === 0) {
    console.log("  ✅ Stage 5 内容整理检查通过");
  }
}

function findArchivedTranscript(videoId) {
  const archivedDir = path.join(TRANSCRIPTS_DIR, "archived");
  if (!fs.existsSync(archivedDir)) return null;
  const dateDirs = fs.readdirSync(archivedDir, { withFileTypes: true });
  for (const dateDir of dateDirs) {
    if (dateDir.isDirectory()) {
      const p = path.join(archivedDir, dateDir.name, `${videoId}.txt`);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function checkCrossStage() {
  console.log("\n" + "=".repeat(60));
  console.log("跨阶段: 引用完整性 & Pipeline 状态");
  console.log("=".repeat(60));

  const pipelineState = loadJson(path.join(DATA_DIR, "pipeline-state.json"));
  if (pipelineState) {
    console.log(`  Pipeline 状态: ${pipelineState.status}`);
    console.log(`  当前阶段: ${pipelineState.currentStage}`);

    if (pipelineState.stages) {
      for (const [stage, info] of Object.entries(pipelineState.stages)) {
        if (!info) continue;
        const status = info.status;
        console.log(`  ${stage}: ${status}`);
        if (status === "running" && info.startTime) {
          const start = new Date(info.startTime);
          const now = new Date();
          const hours = ((now - start) / 3600000).toFixed(1);
          if (hours > 24) {
            addIssue("cross", "stale_pipeline", "warning",
              `${stage} 运行超过 ${hours} 小时，可能卡住`,
              { stage, startTime: info.startTime }
            );
          }
        }
      }
    }
  } else {
    addIssue("cross", "pipeline_state", "warning", "pipeline-state.json 不存在");
  }

  const statistics = loadJson(path.join(DATA_DIR, "statistics.json"));
  if (statistics && statistics.overview) {
    const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
    const actualBloggers = Array.isArray(bloggers) ? bloggers.length : 0;
    const statBloggers = statistics.overview.total_bloggers;
    if (actualBloggers !== statBloggers) {
      addIssue("cross", "statistics_mismatch", "warning",
        `statistics.json 博主数 (${statBloggers}) 与实际 (${actualBloggers}) 不一致`);
      console.log(`  ⚠️ statistics.json 博主数不一致: 记录=${statBloggers}, 实际=${actualBloggers}`);
    }
  }

  const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
  const videos = videosData?.videos || [];
  const archiveFiles = fs.existsSync(DATA_DIR)
    ? fs.readdirSync(DATA_DIR).filter(f => f.startsWith("videos-archive-") && f.endsWith(".json"))
    : [];

  let archiveVideoCount = 0;
  for (const af of archiveFiles) {
    const ad = loadJson(path.join(DATA_DIR, af));
    if (ad && ad.videos) archiveVideoCount += ad.videos.length;
  }

  stats.cross_total_with_archive = videos.length + archiveVideoCount;
  console.log(`  videos.json: ${videos.length} 个`);
  console.log(`  归档文件: ${archiveFiles.length} 个 (${archiveVideoCount} 条记录)`);
  console.log(`  全量视频: ${videos.length + archiveVideoCount} 个`);

  const activeIssues = loadJson(path.join(DATA_DIR, "active-issues.json"));
  if (activeIssues) {
    const issueCount = Array.isArray(activeIssues) ? activeIssues.length : (activeIssues.issues?.length || 0);
    stats.cross_active_issues = issueCount;
    console.log(`  活跃问题: ${issueCount} 个`);
  }

  const failedLogs = fs.existsSync(path.join(DATA_DIR, "logs"))
    ? fs.readdirSync(path.join(DATA_DIR, "logs")).filter(f => f.startsWith("failed-")).length
    : 0;
  stats.cross_failed_logs = failedLogs;
  console.log(`  失败日志: ${failedLogs} 个`);

  if (failedLogs > 20) {
    addIssue("cross", "many_failed_logs", "warning",
      `失败日志较多 (${failedLogs} 个)，建议检查`);
  }

  const bloggerBlacklist = loadJson(path.join(DATA_DIR, "blogger-blacklist.json"));
  if (bloggerBlacklist) {
    const blCount = Array.isArray(bloggerBlacklist) ? bloggerBlacklist.length : (bloggerBlacklist.bloggers?.length || 0);
    stats.cross_blacklist = blCount;
    console.log(`  黑名单博主: ${blCount} 个`);
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
  console.log(`  Stage 1: ${stats.stage1_total_bloggers || 0} 博主, ${stats.stage1_search_keywords || 0} 搜索关键词, ${stats.stage1_discovered_keywords || 0} 发现关键词`);
  console.log(`  Stage 2: ${stats.stage2_total_videos || 0} 视频, ${stats.stage2_blogger_dirs || 0} 博主目录, ${stats.stage5_video_jsons || 0} 视频 JSON`);
  console.log(`  Stage 4a: ${stats.stage4a_total_audio || 0} 音频 (根目录: ${stats.stage4a_root_audio || 0}, 归档: ${stats.stage4a_archived_audio || 0})`);
  console.log(`  Stage 4b: ${stats.stage4b_total_transcripts || 0} 转录 (根目录: ${stats.stage4b_root_transcripts || 0}, 归档: ${stats.stage4b_archived_transcripts || 0}, 审阅: ${stats.stage4b_review_transcripts || 0})`);
  console.log(`  Stage 5: ${stats.stage5_processed || 0} processed, ${stats.stage5_insufficient || 0} insufficient, ${stats.stage5_skipped || 0} skipped`);

  const overall = errorCount === 0 && warningCount === 0 ? "🟢 健康" :
    errorCount === 0 ? "🟡 有警告" : "🔴 有错误";
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
  const historyPath = path.join(reportsDir, `pipeline-health-${ts}.json`);
  fs.writeFileSync(historyPath, JSON.stringify(reportData, null, 2), "utf-8");
  console.log(`\n  历史报告已保存: ${historyPath}`);
}

const ROOT_CAUSE_REGISTRY = [
  {
    id: "RC1",
    name: "Content-Cleaner 输出空 main_content",
    severity: "critical",
    categories: ["video_json_incomplete", "video_json_empty_field"],
    source_script: "content-cleaner (AI Skill) + distribute-cleaned.js",
    source_line: "distribute-cleaned.js:119 (main_content 纯透传，无校验)",
    root_cause: "AI 输出 main_content 为空字符串 → validate-cleaned.js 不存在(无拦截) → distribute-cleaned.js 无防御性校验 → 空数据持久化",
    fix_type: "code-fix",
    auto_fixable: true,
    auto_fix_action: "reset_empty_content",
    code_fixes: [
      "P0: 创建 validate-cleaned.js，校验 main_content >= 300 字符",
      "P0: distribute-cleaned.js:119 增加防御性校验 if(!result.main_content || result.main_content.length < 100)",
      "P1: SKILL.md 强化 main_content 生成约束",
      "P2: 修复已损坏数据：重置空 main_content 视频状态为 transcribed"
    ]
  },
  {
    id: "RC2",
    name: "Stage1 时间戳字段遗漏",
    severity: "medium",
    categories: ["keyword_contradictory", "keyword_last_found_null"],
    source_script: "stage1-blogger-discover.js + keyword-optimizer Skill",
    source_line: "stage1-blogger-discover.js:962 (更新 found_bloggers 但未设 last_found_at)",
    root_cause: "代码遗漏：stage1 更新 found_bloggers 时未赋值 last_found_at；外部 Skill 修改 search_count 时未同步 last_search_at",
    fix_type: "code-fix",
    auto_fixable: true,
    auto_fix_action: "fix_keyword_timestamps",
    code_fixes: [
      "P0: stage1-blogger-discover.js:962 增加 if(addResult.added>0) last_found_at = now()",
      "P1: keyword-optimizer Skill 修改 search_count 时同步更新 last_search_at",
      "P2: 数据修复：补全历史关键词的时间戳"
    ]
  },
  {
    id: "RC3",
    name: "发现关键词无去重/无处理流程",
    severity: "medium",
    categories: ["discovered_keyword_dup", "dk_all_pending"],
    source_script: "distribute-cleaned.js (写入 discovered-keywords.json)",
    source_line: "distribute-cleaned.js 写入时无去重检查",
    root_cause: "写入 discovered-keywords.json 时无去重逻辑；797 个关键词全部 pending，缺少 review/promote 流程",
    fix_type: "code-fix",
    auto_fixable: true,
    auto_fix_action: "dedup_discovered_keywords",
    code_fixes: [
      "P0: distribute-cleaned.js 写入前检查关键词是否已存在",
      "P1: 创建 discovered-keywords review 流程（自动/半自动提升）",
      "P2: 清理重复条目"
    ]
  },
  {
    id: "RC4",
    name: "抖音 API 不返回 play_count",
    severity: "low",
    categories: ["metadata_play_count_zero"],
    source_script: "stage2-video-collect.js (三级降级策略)",
    source_line: "stage2-video-collect.js:1308-1340",
    root_cause: "抖音 Web API (/aweme/v1/web/aweme/post/) 不返回 play_count 字段，三级降级策略全部失败：API列表→0，详情API→0，DOM解析→不可靠",
    fix_type: "known-limitation",
    auto_fixable: false,
    auto_fix_action: null,
    code_fixes: [
      "INFO: 平台限制，非代码 Bug",
      "P2: 考虑使用 digg_count (点赞数) 作为活跃度替代指标",
      "P2: 优化 DOM 解析正则，提高提取准确率"
    ]
  },
  {
    id: "RC5",
    name: "statistics.json 未同步更新",
    severity: "low",
    categories: ["statistics_mismatch"],
    source_script: "更新 statistics.json 的脚本",
    source_line: "statistics.json.overview.total_bloggers 与实际不一致",
    root_cause: "博主增删后未重新计算 statistics.json",
    fix_type: "auto-fix",
    auto_fixable: true,
    auto_fix_action: "sync_statistics",
    code_fixes: [
      "P1: 博主增删操作后自动触发 statistics.json 更新",
      "P2: 健康检查自动修复"
    ]
  },
  {
    id: "RC6",
    name: "失败日志堆积",
    severity: "low",
    categories: ["many_failed_logs"],
    source_script: "各阶段失败时写入 data/logs/failed-*.json",
    source_line: "无自动清理机制",
    root_cause: "失败日志无自动清理/归档机制，长期堆积",
    fix_type: "manual",
    auto_fixable: false,
    auto_fix_action: null,
    code_fixes: [
      "P1: 添加失败日志归档/清理机制（保留最近 N 天）",
      "P2: 手动审查失败原因"
    ]
  }
];

function getAllDetectedIssues() {
  return [...issues, ...warnings];
}

const STAGE_SCRIPT_MAP = {
  stage1: "stage1-blogger-discover.js",
  stage2: "stage2-video-collect.js",
  stage4a: "stage4-audio-download.js / audio-archiver.js",
  stage4b: "stage4-transcribe-local.js / transcript-archiver.js",
  stage5: "content-cleaner (AI Skill) / distribute-cleaned.js",
  cross: "跨阶段脚本"
};

const CATEGORY_INFERENCE_RULES = [
  { pattern: /_empty_field$/, rootCauseTemplate: "字段写入时未校验空值", fixType: "code-fix", autoFixable: false },
  { pattern: /_invalid_(status|quality|url)$/, rootCauseTemplate: "枚举值校验缺失，写入了非法值", fixType: "code-fix", autoFixable: false },
  { pattern: /_contradictory$/, rootCauseTemplate: "关联字段更新不同步，导致数据矛盾", fixType: "code-fix", autoFixable: true },
  { pattern: /_dup(licate)?$/, rootCauseTemplate: "写入前缺少去重检查", fixType: "code-fix", autoFixable: true },
  { pattern: /_mismatch$/, rootCauseTemplate: "缓存/统计文件未与源数据同步更新", fixType: "auto-fix", autoFixable: true },
  { pattern: /_zero$/, rootCauseTemplate: "数据源未返回该字段值", fixType: "known-limitation", autoFixable: false },
  { pattern: /_leak$/, rootCauseTemplate: "文件归档流程遗漏，未及时移动到归档目录", fixType: "code-fix", autoFixable: true },
  { pattern: /_missing_/, rootCauseTemplate: "流程中某环节未生成必需文件", fixType: "code-fix", autoFixable: false },
  { pattern: /_all_pending$/, rootCauseTemplate: "缺少后续处理流程，数据停滞在中间状态", fixType: "code-fix", autoFixable: false },
  { pattern: /_incomplete$/, rootCauseTemplate: "输出校验缺失，允许了不完整数据通过", fixType: "code-fix", autoFixable: true },
  { pattern: /_not_archived$/, rootCauseTemplate: "归档触发条件遗漏", fixType: "code-fix", autoFixable: true },
  { pattern: /many_failed/, rootCauseTemplate: "失败记录无自动清理机制", fixType: "manual", autoFixable: false },
];

function inferRootCause(issue) {
  for (const rule of CATEGORY_INFERENCE_RULES) {
    if (rule.pattern.test(issue.category)) {
      return {
        rootCause: rule.rootCauseTemplate,
        fixType: rule.fixType,
        autoFixable: rule.autoFixable
      };
    }
  }
  return {
    rootCause: "未知根因，需手动分析",
    fixType: "manual",
    autoFixable: false
  };
}

function rootCauseAnalysis() {
  console.log("\n" + "═".repeat(60));
  console.log("根因分析");
  console.log("═".repeat(60));

  const analysisResults = [];
  const matchedCategories = new Set();

  for (const rc of ROOT_CAUSE_REGISTRY) {
    const matchedIssues = getAllDetectedIssues().filter(
      i => rc.categories.includes(i.category)
    );

    if (matchedIssues.length === 0) continue;

    for (const i of matchedIssues) matchedCategories.add(i.category);

    const errorCount = matchedIssues.filter(i => i.severity === "error").length;
    const warningCount = matchedIssues.filter(i => i.severity === "warning").length;

    const result = {
      ...rc,
      matched_issues: matchedIssues.length,
      matched_errors: errorCount,
      matched_warnings: warningCount,
      affected_items: matchedIssues.map(i => ({
        category: i.category,
        message: i.message,
        detail: i.detail
      }))
    };

    analysisResults.push(result);

    const severityIcon = rc.severity === "critical" ? "🔴" :
      rc.severity === "medium" ? "🟡" : "🟢";
    const fixIcon = rc.auto_fixable ? "🔧" : "📋";

    console.log(`\n  ${severityIcon} [${rc.id}] ${rc.name}`);
    console.log(`     影响问题: ${matchedIssues.length} 个 (${errorCount} 错误 + ${warningCount} 警告)`);
    console.log(`     溯源: ${rc.source_script}`);
    console.log(`     根因链: ${rc.root_cause}`);
    console.log(`     修复类型: ${fixIcon} ${rc.fix_type}${rc.auto_fixable ? " (可自动修复)" : ""}`);

    if (rc.code_fixes.length > 0) {
      console.log(`     修复方案:`);
      for (const fix of rc.code_fixes) {
        console.log(`       - ${fix}`);
      }
    }
  }

  const unmatchedIssues = getAllDetectedIssues().filter(
    i => !matchedCategories.has(i.category)
  );

  if (unmatchedIssues.length > 0) {
    const unmatchedByCategory = {};
    for (const i of unmatchedIssues) {
      if (!unmatchedByCategory[i.category]) {
        unmatchedByCategory[i.category] = [];
      }
      unmatchedByCategory[i.category].push(i);
    }

    let rcCounter = analysisResults.length + 1;
    for (const [category, catIssues] of Object.entries(unmatchedByCategory)) {
      const inference = inferRootCause(catIssues[0]);
      const stage = catIssues[0].stage;
      const sourceScript = STAGE_SCRIPT_MAP[stage] || stage;
      const severity = catIssues.some(i => i.severity === "error") ? "medium" : "low";

      const rcId = `RC-AUTO-${rcCounter}`;
      const rcName = `${stage}/${category}: ${inference.rootCause}`;

      const result = {
        id: rcId,
        name: rcName,
        severity,
        categories: [category],
        source_script: sourceScript,
        source_line: "自动推断",
        root_cause: inference.rootCause,
        fix_type: inference.fixType,
        auto_fixable: inference.autoFixable,
        auto_fix_action: null,
        code_fixes: inference.autoFixable
          ? [`P1: 检查 ${sourceScript} 中 ${category} 相关逻辑并修复`]
          : [`P2: 手动分析 ${stage}/${category} 问题根因`],
        matched_issues: catIssues.length,
        matched_errors: catIssues.filter(i => i.severity === "error").length,
        matched_warnings: catIssues.filter(i => i.severity === "warning").length,
        affected_items: catIssues.map(i => ({
          category: i.category,
          message: i.message,
          detail: i.detail
        })),
        inferred: true
      };

      analysisResults.push(result);
      rcCounter++;

      const severityIcon = severity === "medium" ? "🟡" : "🟢";
      const fixIcon = inference.autoFixable ? "🔧" : "📋";
      const inferredTag = "🤖 自动推断";

      console.log(`\n  ${severityIcon} [${rcId}] ${rcName} ${inferredTag}`);
      console.log(`     影响问题: ${catIssues.length} 个`);
      console.log(`     溯源: ${sourceScript}`);
      console.log(`     根因链: ${inference.rootCause}`);
      console.log(`     修复类型: ${fixIcon} ${inference.fixType}`);
      if (result.code_fixes.length > 0) {
        console.log(`     修复方案:`);
        for (const fix of result.code_fixes) {
          console.log(`       - ${fix}`);
        }
      }
    }
  }

  return analysisResults;
}

function autoFix(dryRun = true) {
  console.log("\n" + "═".repeat(60));
  console.log(dryRun ? "自动修复 (预演模式)" : "自动修复 (执行模式)");
  console.log("═".repeat(60));

  const fixLog = [];
  const mode = dryRun ? "[预演]" : "[执行]";

  const rc1Issues = getAllDetectedIssues().filter(
    i => i.category === "video_json_incomplete" || i.category === "video_json_empty_field"
  );
  if (rc1Issues.length > 0) {
    console.log(`\n  🔧 RC1: 处理空 main_content 视频`);
    const emptyVideoIds = new Set();
    const emptyVideoDirs = {};
    for (const issue of rc1Issues) {
      const id = issue.message.match(/(\d{15,})\.json/);
      if (id) {
        emptyVideoIds.add(id[1]);
        if (issue.detail && issue.detail.dir) {
          emptyVideoDirs[id[1]] = issue.detail.dir;
        }
      }
    }

    if (emptyVideoIds.size > 0) {
      let resetCount = 0;
      let deletedCount = 0;

      const videosPath = path.join(DATA_DIR, "videos.json");
      const videosData = loadJson(videosPath);
      if (videosData && videosData.videos) {
        for (const v of videosData.videos) {
          if (emptyVideoIds.has(v.aweme_id) && (v.status === "processed" || v.status === "insufficient")) {
            console.log(`    ${mode} videos.json ${v.aweme_id}: ${v.status} → transcribed`);
            if (!dryRun) {
              v.status = "transcribed";
              v.quality = undefined;
            }
            resetCount++;
          }
        }
        if (!dryRun && resetCount > 0) {
          fs.writeFileSync(videosPath, JSON.stringify(videosData, null, 2), "utf-8");
        }
      }

      const activeIds = new Set((videosData?.videos || []).map(v => v.aweme_id));
      for (const [videoId, dirName] of Object.entries(emptyVideoDirs)) {
        if (!activeIds.has(videoId)) {
          const vjPath = path.join(RESULTS_DIR, dirName, "videos", `${videoId}.json`);
          if (fs.existsSync(vjPath)) {
            console.log(`    ${mode} 删除归档中损坏的 JSON: ${dirName}/videos/${videoId}.json`);
            if (!dryRun) {
              fs.unlinkSync(vjPath);
            }
            deletedCount++;
          }
        }
      }

      fixLog.push({
        rc: "RC1",
        action: "fix_empty_content",
        affected: resetCount + deletedCount,
        dry_run: dryRun,
        detail: `重置 ${resetCount} 个活跃视频状态 + 删除 ${deletedCount} 个归档中损坏 JSON`
      });
    }
  }

  const rc2TimestampIssues = getAllDetectedIssues().filter(
    i => i.category === "keyword_contradictory" || i.category === "keyword_last_found_null"
  );
  if (rc2TimestampIssues.length > 0) {
    console.log(`\n  🔧 RC2: 修复关键词时间戳`);
    const kwPath = path.join(DATA_DIR, "search-keywords.json");
    const kwData = loadJson(kwPath);
    if (kwData && kwData.keywords) {
      let fixedTimestamps = 0;
      for (const kw of kwData.keywords) {
        if (kw.status === "deleted") continue;

        if (kw.search_count > 0 && !kw.last_search_at) {
          const fallbackTs = kw.created_at || kw.evaluation_count > 0
            ? "2026-04-13T00:00:00.000Z"
            : null;
          if (fallbackTs) {
            console.log(`    ${mode} "${kw.keyword}": last_search_at null → ${fallbackTs}`);
            if (!dryRun) {
              kw.last_search_at = fallbackTs;
            }
            fixedTimestamps++;
          }
        }

        if (kw.found_bloggers > 0 && !kw.last_found_at) {
          const fallbackTs = kw.last_search_at || kw.created_at || "2026-04-13T00:00:00.000Z";
          console.log(`    ${mode} "${kw.keyword}": last_found_at null → ${fallbackTs}`);
          if (!dryRun) {
            kw.last_found_at = fallbackTs;
          }
          fixedTimestamps++;
        }
      }
      if (!dryRun && fixedTimestamps > 0) {
        kwData.updated_at = new Date().toISOString();
        fs.writeFileSync(kwPath, JSON.stringify(kwData, null, 2), "utf-8");
      }
      fixLog.push({
        rc: "RC2",
        action: "fix_keyword_timestamps",
        affected: fixedTimestamps,
        dry_run: dryRun,
        detail: `修复 ${fixedTimestamps} 个关键词时间戳`
      });
    }
  }

  const rc3DupIssues = getAllDetectedIssues().filter(i => i.category === "discovered_keyword_dup");
  if (rc3DupIssues.length > 0) {
    console.log(`\n  🔧 RC3: 去重发现关键词`);
    const dkPath = path.join(DATA_DIR, "discovered-keywords.json");
    const dkData = loadJson(dkPath);
    if (dkData && dkData.keywords) {
      const seen = new Set();
      const before = dkData.keywords.length;
      const deduped = [];
      let dupCount = 0;
      for (const dk of dkData.keywords) {
        if (!seen.has(dk.keyword)) {
          seen.add(dk.keyword);
          deduped.push(dk);
        } else {
          dupCount++;
        }
      }
      console.log(`    ${mode} 去重: ${before} → ${deduped.length} (移除 ${dupCount} 个重复)`);
      if (!dryRun && dupCount > 0) {
        dkData.keywords = deduped;
        fs.writeFileSync(dkPath, JSON.stringify(dkData, null, 2), "utf-8");
      }
      fixLog.push({
        rc: "RC3",
        action: "dedup_discovered_keywords",
        affected: dupCount,
        dry_run: dryRun,
        detail: `移除 ${dupCount} 个重复关键词`
      });
    }
  }

  const rc5Mismatch = getAllDetectedIssues().filter(i => i.category === "statistics_mismatch");
  if (rc5Mismatch.length > 0) {
    console.log(`\n  🔧 RC5: 同步 statistics.json`);
    const statPath = path.join(DATA_DIR, "statistics.json");
    const statData = loadJson(statPath);
    const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
    const actualCount = Array.isArray(bloggers) ? bloggers.length : 0;
    if (statData && statData.overview) {
      const oldCount = statData.overview.total_bloggers;
      console.log(`    ${mode} total_bloggers: ${oldCount} → ${actualCount}`);
      if (!dryRun) {
        statData.overview.total_bloggers = actualCount;
        statData.updated_at = new Date().toISOString();
        fs.writeFileSync(statPath, JSON.stringify(statData, null, 2), "utf-8");
      }
      fixLog.push({
        rc: "RC5",
        action: "sync_statistics",
        affected: 1,
        dry_run: dryRun,
        detail: `total_bloggers: ${oldCount} → ${actualCount}`
      });
    }
  }

  return fixLog;
}

function generateFixReport(analysisResults, fixLog) {
  console.log("\n" + "═".repeat(60));
  console.log("修复报告");
  console.log("═".repeat(60));

  const autoFixable = analysisResults.filter(r => r.auto_fixable);
  const manualFix = analysisResults.filter(r => !r.auto_fixable);

  console.log(`\n  可自动修复: ${autoFixable.length} 个根因`);
  console.log(`  需代码修复: ${manualFix.filter(r => r.fix_type === "code-fix").length} 个根因`);
  console.log(`  已知限制: ${manualFix.filter(r => r.fix_type === "known-limitation").length} 个根因`);
  console.log(`  需手动处理: ${manualFix.filter(r => r.fix_type === "manual").length} 个根因`);

  if (fixLog.length > 0) {
    console.log("\n  --- 修复操作记录 ---");
    for (const log of fixLog) {
      const icon = log.dry_run ? "📝" : "✅";
      console.log(`  ${icon} [${log.rc}] ${log.detail} (${log.dry_run ? "预演" : "已执行"})`);
    }
  }

  console.log("\n  --- 代码修复优先级 ---");
  const allCodeFixes = [];
  for (const rc of analysisResults) {
    for (const fix of rc.code_fixes) {
      allCodeFixes.push({ rc: rc.id, fix });
    }
  }
  const p0Fixes = allCodeFixes.filter(f => f.fix.startsWith("P0"));
  const p1Fixes = allCodeFixes.filter(f => f.fix.startsWith("P1"));
  const p2Fixes = allCodeFixes.filter(f => f.fix.startsWith("P2"));
  const infoItems = allCodeFixes.filter(f => f.fix.startsWith("INFO"));

  if (p0Fixes.length > 0) {
    console.log("\n  🔴 P0 (必须修复):");
    for (const f of p0Fixes) {
      console.log(`    [${f.rc}] ${f.fix}`);
    }
  }
  if (p1Fixes.length > 0) {
    console.log("\n  🟡 P1 (建议修复):");
    for (const f of p1Fixes) {
      console.log(`    [${f.rc}] ${f.fix}`);
    }
  }
  if (p2Fixes.length > 0) {
    console.log("\n  🟢 P2 (可选优化):");
    for (const f of p2Fixes) {
      console.log(`    [${f.rc}] ${f.fix}`);
    }
  }
  if (infoItems.length > 0) {
    console.log("\n  ℹ️ 已知限制:");
    for (const f of infoItems) {
      console.log(`    [${f.rc}] ${f.fix}`);
    }
  }

  const reportData = {
    generated_at: new Date().toISOString(),
    root_causes: analysisResults.map(r => ({
      id: r.id,
      name: r.name,
      severity: r.severity,
      matched_issues: r.matched_issues,
      fix_type: r.fix_type,
      auto_fixable: r.auto_fixable,
      source_script: r.source_script,
      root_cause: r.root_cause,
      code_fixes: r.code_fixes
    })),
    fix_log: fixLog,
    priority_summary: {
      P0: p0Fixes.map(f => ({ rc: f.rc, fix: f.fix })),
      P1: p1Fixes.map(f => ({ rc: f.rc, fix: f.fix })),
      P2: p2Fixes.map(f => ({ rc: f.rc, fix: f.fix }))
    }
  };

  const reportsDir = path.join(DATA_DIR, "health-reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fixReportPath = path.join(reportsDir, `root-cause-${ts}.json`);
  fs.writeFileSync(fixReportPath, JSON.stringify(reportData, null, 2), "utf-8");
  console.log(`\n  根因报告已保存: ${fixReportPath}`);
}

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║          Pipeline 全流程健康检查                         ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`时间: ${new Date().toISOString()}`);
console.log(`项目: ${PROJECT_ROOT}`);

checkStage1();
checkStage2();
checkStage4a();
checkStage4b();
checkStage5();
checkCrossStage();
generateReport();

const analysisResults = rootCauseAnalysis();
const isDryRun = !process.argv.includes("--fix");
const fixLog = autoFix(isDryRun);
generateFixReport(analysisResults, fixLog);

if (isDryRun && fixLog.length > 0) {
  console.log("\n  💡 提示: 使用 --fix 参数执行实际修复");
}
