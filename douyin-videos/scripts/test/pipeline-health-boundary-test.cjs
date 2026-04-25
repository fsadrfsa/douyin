const fs = require("fs");
const path = require("path");
const os = require("os");

const TEST_DIR = path.join(os.tmpdir(), `pipeline-health-test-${Date.now()}`);
const DATA_DIR = path.join(TEST_DIR, "data");
const RESULTS_DIR = path.join(TEST_DIR, "results");
const AUDIO_DIR = path.join(TEST_DIR, "audio");
const TRANSCRIPTS_DIR = path.join(TEST_DIR, "transcripts");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

function setupDir() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
}

function runHealthCheck() {
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
    const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
    if (!bloggers) {
      addIssue("stage1", "bloggers.json", "error", "bloggers.json 不存在或格式错误");
      return;
    }
    const bloggerArray = Array.isArray(bloggers) ? bloggers : [];
    stats.stage1_total_bloggers = bloggerArray.length;

    const secUidSet = new Set();
    let duplicates = 0;
    let missingFields = 0;
    const VALID_BLOGGER_STATUSES = new Set(["active", "blacklisted", "archived"]);

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
        addIssue("stage1", "blogger_empty_field", "warning",
          `博主字段为空字符串: ${b.name || "unknown"}`,
          { empty: emptyFields }
        );
      }

      if (b.status && !VALID_BLOGGER_STATUSES.has(b.status)) {
        addIssue("stage1", "blogger_invalid_status", "warning",
          `博主状态异常: ${b.name} status="${b.status}"`,
          { name: b.name, status: b.status }
        );
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
    }
    stats.stage1_duplicates = duplicates;
    stats.stage1_missing_fields = missingFields;

    const searchKeywords = loadJson(path.join(DATA_DIR, "search-keywords.json"));
    if (searchKeywords) {
      const kwList = searchKeywords.keywords || [];
      stats.stage1_search_keywords = kwList.length;
      const VALID_KW_STATUSES = new Set(["pending", "searching", "completed", "deleted"]);

      for (const kw of kwList) {
        if (kw.status && !VALID_KW_STATUSES.has(kw.status)) {
          addIssue("stage1", "keyword_invalid_status", "warning",
            `关键词状态异常: ${kw.keyword} status="${kw.status}"`);
        }
        if (kw.search_count > 0 && !kw.last_search_at) {
          addIssue("stage1", "keyword_contradictory", "warning",
            `关键词 search_count=${kw.search_count} 但 last_search_at 为 null: ${kw.keyword}`);
        }
        if (kw.found_bloggers > 0 && !kw.last_found_at) {
          stats.stage1_kw_last_found_null = (stats.stage1_kw_last_found_null || 0) + 1;
        }
      }
      if (stats.stage1_kw_last_found_null > 0) {
        addIssue("stage1", "keyword_last_found_null", "warning",
          `${stats.stage1_kw_last_found_null} 个关键词 found_bloggers>0 但 last_found_at 始终为 null`);
      }
    }

    const discoveredKeywords = loadJson(path.join(DATA_DIR, "discovered-keywords.json"));
    if (discoveredKeywords) {
      const dkList = discoveredKeywords.keywords || [];
      stats.stage1_discovered_keywords = dkList.length;
      const pendingDk = dkList.filter(k => k.status === "pending");
      const dkNames = new Set();
      let dkDuplicates = 0;
      const VALID_DK_STATUSES = new Set(["pending", "promoted", "rejected", "duplicate"]);

      for (const dk of dkList) {
        if (dkNames.has(dk.keyword)) dkDuplicates++;
        dkNames.add(dk.keyword);

        if (dk.status && !VALID_DK_STATUSES.has(dk.status)) {
          addIssue("stage1", "dk_invalid_status", "warning",
            `发现关键词状态异常: ${dk.keyword} status="${dk.status}"`);
        }

        if (dk.discovered_at) {
          const isoMatch = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dk.discovered_at);
          const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(dk.discovered_at);
          if (!isoMatch && !dateOnlyMatch) {
            addIssue("stage1", "dk_date_format", "warning",
              `发现关键词日期格式异常: ${dk.keyword} discovered_at="${dk.discovered_at}"`);
          }
        }
      }
      stats.stage1_discovered_keyword_dup = dkDuplicates;

      if (dkDuplicates > 0) {
        addIssue("stage1", "discovered_keyword_dup", "warning",
          `discovered-keywords.json 中有 ${dkDuplicates} 个重复关键词`);
      }

      if (dkList.length > 0 && pendingDk.length === dkList.length) {
        addIssue("stage1", "dk_all_pending", "warning",
          `${dkList.length} 个发现关键词全部处于 pending 状态，无任何处理进展`);
      }
    }
  }

  function checkStage2() {
    const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
    if (!videosData) {
      addIssue("stage2", "videos.json", "error", "videos.json 不存在或格式错误");
      return;
    }
    const videos = videosData.videos || [];
    stats.stage2_total_videos = videos.length;

    const awemeIdSet = new Set();
    let duplicateIds = 0;
    let missingFields = 0;
    const VALID_VIDEO_STATUSES = new Set(["pending", "downloaded", "transcribed", "processed", "insufficient", "skipped", "error"]);
    const VALID_QUALITIES = new Set(["accessible", "insufficient", "inaccessible"]);

    for (const v of videos) {
      if (!v.aweme_id || !v.url || !v.author || !v.sec_uid) {
        missingFields++;
      }

      const emptyFields = [];
      if (v.aweme_id === "") emptyFields.push("aweme_id");
      if (v.url === "") emptyFields.push("url");
      if (v.author === "") emptyFields.push("author");
      if (v.sec_uid === "") emptyFields.push("sec_uid");
      if (v.author_id === "") emptyFields.push("author_id");
      if (emptyFields.length > 0) {
        addIssue("stage2", "video_empty_field", "warning",
          `视频字段为空字符串: ${v.aweme_id || "unknown"}`,
          { empty: emptyFields }
        );
      }

      if (v.status && !VALID_VIDEO_STATUSES.has(v.status)) {
        addIssue("stage2", "video_invalid_status", "warning",
          `视频状态异常: ${v.aweme_id} status="${v.status}"`);
      }

      if (v.quality && !VALID_QUALITIES.has(v.quality)) {
        addIssue("stage2", "video_invalid_quality", "warning",
          `视频质量值异常: ${v.aweme_id} quality="${v.quality}"`);
      }

      if (v.url && !v.url.startsWith("https://www.douyin.com/video/")) {
        addIssue("stage2", "video_invalid_url", "warning",
          `视频 URL 格式异常: ${v.aweme_id}`);
      }

      if (v.aweme_id && !/^\d+$/.test(v.aweme_id)) {
        addIssue("stage2", "video_non_numeric_id", "warning",
          `视频 aweme_id 非纯数字: ${v.aweme_id}`);
      }

      if (v.aweme_id && awemeIdSet.has(v.aweme_id)) {
        duplicateIds++;
      }
      if (v.aweme_id) awemeIdSet.add(v.aweme_id);
    }
    stats.stage2_duplicate_ids = duplicateIds;
    stats.stage2_missing_fields = missingFields;

    const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
    const bloggerArray = Array.isArray(bloggers) ? bloggers : [];
    const bloggerSecUids = new Set(bloggerArray.map(b => b.sec_uid));
    let videosWithoutBlogger = 0;
    for (const v of videos) {
      if (v.sec_uid && !bloggerSecUids.has(v.sec_uid)) {
        videosWithoutBlogger++;
      }
    }
    stats.stage2_videos_without_blogger = videosWithoutBlogger;
  }

  function checkStage4a() {
    const videosData = loadJson(path.join(DATA_DIR, "videos.json"));
    const videos = videosData?.videos || [];

    const rootAudioFiles = fs.existsSync(AUDIO_DIR)
      ? fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith(".mp3"))
      : [];
    const archivedAudioFiles = collectFiles(path.join(AUDIO_DIR, "archived"), ".mp3", true);

    const allAudioIds = new Set();
    for (const f of rootAudioFiles) {
      allAudioIds.add(path.basename(f, ".mp3"));
    }
    for (const f of archivedAudioFiles) {
      allAudioIds.add(path.basename(f, ".mp3"));
    }

    stats.stage4a_total_audio = allAudioIds.size;
    stats.stage4a_root_audio = rootAudioFiles.length;
    stats.stage4a_archived_audio = archivedAudioFiles.length;

    const downloadedStatuses = ["downloaded", "transcribed", "processed", "insufficient"];
    const videosNeedingAudio = videos.filter(v => downloadedStatuses.includes(v.status));
    let missingAudio = 0;
    for (const v of videosNeedingAudio) {
      if (!allAudioIds.has(v.aweme_id)) {
        missingAudio++;
      }
    }
    stats.stage4a_missing_audio = missingAudio;
  }

  function checkStage4b() {
    const rootTranscripts = fs.existsSync(TRANSCRIPTS_DIR)
      ? fs.readdirSync(TRANSCRIPTS_DIR).filter(f => f.endsWith(".txt"))
      : [];
    const archivedTranscripts = collectFiles(path.join(TRANSCRIPTS_DIR, "archived"), ".txt", true);
    const reviewTranscripts = collectFiles(path.join(TRANSCRIPTS_DIR, "review"), ".txt", true);

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
    stats.stage4b_root_transcripts = rootTranscripts.length;
    stats.stage4b_archived_transcripts = archivedTranscripts.length;
    stats.stage4b_review_transcripts = reviewTranscripts.length;
  }

  function checkCrossStage() {
    const statistics = loadJson(path.join(DATA_DIR, "statistics.json"));
    if (statistics && statistics.overview) {
      const bloggers = loadJson(path.join(DATA_DIR, "bloggers.json"));
      const actualBloggers = Array.isArray(bloggers) ? bloggers.length : 0;
      const statBloggers = statistics.overview.total_bloggers;
      stats.cross_blogger_mismatch = (actualBloggers !== statBloggers);
    }

    const pipelineState = loadJson(path.join(DATA_DIR, "pipeline-state.json"));
    if (pipelineState && pipelineState.stages) {
      for (const [stage, info] of Object.entries(pipelineState.stages)) {
        if (!info) continue;
        if (info.status === "running" && info.startTime) {
          const start = new Date(info.startTime);
          const now = new Date();
          const hours = ((now - start) / 3600000).toFixed(1);
          if (hours > 24) {
            addIssue("cross", "stale_pipeline", "warning",
              `${stage} 运行超过 ${hours} 小时，可能卡住`);
          }
        }
      }
    }
  }

  checkStage1();
  checkStage2();
  checkStage4a();
  checkStage4b();
  checkCrossStage();

  return { issues, warnings, stats };
}

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

function autoFix(allIssues, dryRun) {
  const fixLog = [];

  const rc2TimestampIssues = allIssues.filter(
    i => i.category === "keyword_contradictory" || i.category === "keyword_last_found_null"
  );
  if (rc2TimestampIssues.length > 0) {
    const kwPath = path.join(DATA_DIR, "search-keywords.json");
    const kwData = JSON.parse(fs.readFileSync(kwPath, "utf-8"));
    if (kwData && kwData.keywords) {
      let fixedTimestamps = 0;
      for (const kw of kwData.keywords) {
        if (kw.status === "deleted") continue;
        if (kw.search_count > 0 && !kw.last_search_at) {
          const fallbackTs = kw.created_at || "2026-04-13T00:00:00.000Z";
          if (!dryRun) kw.last_search_at = fallbackTs;
          fixedTimestamps++;
        }
        if (kw.found_bloggers > 0 && !kw.last_found_at) {
          const fallbackTs = kw.last_search_at || kw.created_at || "2026-04-13T00:00:00.000Z";
          if (!dryRun) kw.last_found_at = fallbackTs;
          fixedTimestamps++;
        }
      }
      if (!dryRun && fixedTimestamps > 0) {
        fs.writeFileSync(kwPath, JSON.stringify(kwData, null, 2), "utf-8");
      }
      fixLog.push({ rc: "RC2", action: "fix_keyword_timestamps", affected: fixedTimestamps, dry_run: dryRun });
    }
  }

  const rc3DupIssues = allIssues.filter(i => i.category === "discovered_keyword_dup");
  if (rc3DupIssues.length > 0) {
    const dkPath = path.join(DATA_DIR, "discovered-keywords.json");
    const dkData = JSON.parse(fs.readFileSync(dkPath, "utf-8"));
    if (dkData && dkData.keywords) {
      const seen = new Set();
      const deduped = [];
      let dupCount = 0;
      for (const dk of dkData.keywords) {
        if (!seen.has(dk.keyword)) { seen.add(dk.keyword); deduped.push(dk); }
        else { dupCount++; }
      }
      if (!dryRun && dupCount > 0) {
        dkData.keywords = deduped;
        fs.writeFileSync(dkPath, JSON.stringify(dkData, null, 2), "utf-8");
      }
      fixLog.push({ rc: "RC3", action: "dedup_discovered_keywords", affected: dupCount, dry_run: dryRun });
    }
  }

  return fixLog;
}

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║          Pipeline 健康检查 - 边界测试                    ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

let result;

// ============================================================
// Test 1: bloggers.json 为空数组
// ============================================================
console.log("Test 1: bloggers.json 为空数组");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.stats.stage1_total_bloggers === 0, "空数组博主数=0");
assert(result.issues.length === 0, "无错误");
cleanup();

// ============================================================
// Test 2: bloggers.json 不存在
// ============================================================
console.log("\nTest 2: bloggers.json 不存在");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.issues.some(i => i.category === "bloggers.json"), "报告 bloggers.json 错误");
cleanup();

// ============================================================
// Test 3: bloggers.json 格式错误（非 JSON）
// ============================================================
console.log("\nTest 3: bloggers.json 格式错误");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "not json{{{");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.issues.some(i => i.category === "bloggers.json"), "报告格式错误");
cleanup();

// ============================================================
// Test 4: bloggers.json 为对象格式（非数组）
// ============================================================
console.log("\nTest 4: bloggers.json 为对象格式（非数组）");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify({ bloggers: [] }));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.stats.stage1_total_bloggers === 0, "对象格式博主数=0（不崩溃）");
cleanup();

// ============================================================
// Test 5: 博主 sec_uid 为 null 时不误报重复
// ============================================================
console.log("\nTest 5: 博主 sec_uid 为 null 时不误报重复");
setupDir();
const bloggersWithNull = [
  { sec_uid: null, name: "A", url: "http://a" },
  { sec_uid: null, name: "B", url: "http://b" },
];
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify(bloggersWithNull));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.stats.stage1_duplicates === 0, "null sec_uid 不误报重复");
assert(result.stats.stage1_missing_fields === 2, "两个博主缺少 sec_uid");
cleanup();

// ============================================================
// Test 6: 视频 aweme_id 为 null 时不误报重复
// ============================================================
console.log("\nTest 6: 视频 aweme_id 为 null 时不误报重复");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
const videosWithNull = [
  { aweme_id: null, url: "http://a", author: "A", sec_uid: "s1" },
  { aweme_id: null, url: "http://b", author: "B", sec_uid: "s2" },
];
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: videosWithNull }));
result = runHealthCheck();
assert(result.stats.stage2_duplicate_ids === 0, "null aweme_id 不误报重复");
cleanup();

// ============================================================
// Test 7: videos.json 不存在
// ============================================================
console.log("\nTest 7: videos.json 不存在");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
result = runHealthCheck();
assert(result.issues.some(i => i.category === "videos.json"), "报告 videos.json 错误");
cleanup();

// ============================================================
// Test 8: 音频归档路径含子目录时 basename 正确
// ============================================================
console.log("\nTest 8: 音频归档路径含子目录时 basename 正确");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
const archivedDir = path.join(AUDIO_DIR, "archived", "2026-04-23");
fs.mkdirSync(archivedDir, { recursive: true });
fs.writeFileSync(path.join(archivedDir, "12345.mp3"), "fake audio");
result = runHealthCheck();
assert(result.stats.stage4a_archived_audio === 1, "归档音频计数=1");
assert(result.stats.stage4a_total_audio === 1, "音频总数=1");
cleanup();

// ============================================================
// Test 9: 转录归档路径含子目录时 basename 正确
// ============================================================
console.log("\nTest 9: 转录归档路径含子目录时 basename 正确");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
const transArchivedDir = path.join(TRANSCRIPTS_DIR, "archived", "2026-04-23");
fs.mkdirSync(transArchivedDir, { recursive: true });
fs.writeFileSync(path.join(transArchivedDir, "67890.txt"), "fake transcript");
result = runHealthCheck();
assert(result.stats.stage4b_archived_transcripts === 1, "归档转录计数=1");
assert(result.stats.stage4b_total_transcripts === 1, "转录总数=1");
cleanup();

// ============================================================
// Test 10: statistics.json 博主数不一致检测
// ============================================================
console.log("\nTest 10: statistics.json 博主数不一致检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify([
  { sec_uid: "s1", name: "A", url: "http://a" },
  { sec_uid: "s2", name: "B", url: "http://b" },
]));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(DATA_DIR, "statistics.json"), JSON.stringify({
  overview: { total_bloggers: 5 }
}));
result = runHealthCheck();
assert(result.stats.cross_blogger_mismatch === true, "检测到博主数不一致");
cleanup();

// ============================================================
// Test 11: pipeline-state.json stages 中 info 为 null
// ============================================================
console.log("\nTest 11: pipeline-state.json stages 中 info 为 null");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(DATA_DIR, "pipeline-state.json"), JSON.stringify({
  status: "running",
  currentStage: "stage4",
  stages: {
    stage1: null,
    stage2: { status: "completed" },
    stage4: { status: "running", startTime: new Date().toISOString() }
  }
}));
result = runHealthCheck();
assert(!result.issues.some(i => i.category === "stale_pipeline"), "null stage 不崩溃");
cleanup();

// ============================================================
// Test 12: 空目录（data/audio/transcripts 全空）
// ============================================================
console.log("\nTest 12: 空目录场景");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.stats.stage4a_total_audio === 0, "空音频");
assert(result.stats.stage4b_total_transcripts === 0, "空转录");
assert(result.issues.length === 0, "无错误");
cleanup();

// ============================================================
// Test 13: 大量重复博主
// ============================================================
console.log("\nTest 13: 大量重复博主");
setupDir();
const dupBloggers = [];
for (let i = 0; i < 100; i++) {
  dupBloggers.push({ sec_uid: "same_uid", name: `Blogger${i}`, url: "http://x" });
}
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify(dupBloggers));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.stats.stage1_duplicates === 99, "99个重复博主");
cleanup();

// ============================================================
// Test 14: review 目录含非标准分类
// ============================================================
console.log("\nTest 14: review 目录含非标准分类");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
const reviewCat = path.join(TRANSCRIPTS_DIR, "review", "custom-category");
fs.mkdirSync(reviewCat, { recursive: true });
fs.writeFileSync(path.join(reviewCat, "test.txt"), "content");
result = runHealthCheck();
assert(result.stats.stage4b_total_transcripts === 1, "非标准分类转录计数=1");
assert(result.stats.stage4b_review_transcripts === 1, "review 转录计数=1");
cleanup();

// ============================================================
// Test 15: videos.json 为空对象（无 videos 键）
// ============================================================
console.log("\nTest 15: videos.json 为空对象（无 videos 键）");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), "{}");
result = runHealthCheck();
assert(result.stats.stage2_total_videos === 0, "无 videos 键时视频数=0");
assert(!result.issues.some(i => i.category === "videos.json"), "不报告错误");
cleanup();

// ============================================================
// Test 16: statistics.json 博主数一致（对象格式 bloggers 不崩溃）
// ============================================================
console.log("\nTest 16: statistics.json + 对象格式 bloggers.json 不崩溃");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify({ bloggers: [] }));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(DATA_DIR, "statistics.json"), JSON.stringify({
  overview: { total_bloggers: 0 }
}));
result = runHealthCheck();
assert(result.stats.cross_blogger_mismatch === false, "对象格式 bloggers 不误报不一致");
cleanup();

// ============================================================
// Test 17: pipeline-state 卡住检测（startTime 25h 前）
// ============================================================
console.log("\nTest 17: pipeline-state 卡住检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
const staleTime = new Date(Date.now() - 25 * 3600000).toISOString();
fs.writeFileSync(path.join(DATA_DIR, "pipeline-state.json"), JSON.stringify({
  status: "running",
  currentStage: "stage4",
  stages: {
    stage4: { status: "running", startTime: staleTime }
  }
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "stale_pipeline"), "检测到卡住的 pipeline");
cleanup();

// ============================================================
// Test 18: 视频博主不在 bloggers.json 中
// ============================================================
console.log("\nTest 18: 视频博主不在 bloggers.json 中");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify([
  { sec_uid: "known_uid", name: "Known", url: "http://x" }
]));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({
  videos: [
    { aweme_id: "v1", url: "http://v1", author: "Unknown", sec_uid: "unknown_uid" }
  ]
}));
result = runHealthCheck();
assert(result.stats.stage2_videos_without_blogger === 1, "1个视频博主不在 bloggers.json");
cleanup();

// ============================================================
// Test 19: 根目录音频泄漏检测
// ============================================================
console.log("\nTest 19: 根目录音频泄漏检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(AUDIO_DIR, "leaked.mp3"), "fake");
result = runHealthCheck();
assert(result.stats.stage4a_root_audio === 1, "检测到根目录音频泄漏");
cleanup();

// ============================================================
// Test 20: 根目录转录泄漏检测
// ============================================================
console.log("\nTest 20: 根目录转录泄漏检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(TRANSCRIPTS_DIR, "leaked.txt"), "fake");
result = runHealthCheck();
assert(result.stats.stage4b_root_transcripts === 1, "检测到根目录转录泄漏");
cleanup();

// ============================================================
// Test 21: discovered-keywords 重复检测
// ============================================================
console.log("\nTest 21: discovered-keywords 重复检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(DATA_DIR, "discovered-keywords.json"), JSON.stringify({
  keywords: [
    { keyword: "AI", status: "pending" },
    { keyword: "AI", status: "pending" },
    { keyword: "ML", status: "pending" },
  ]
}));
result = runHealthCheck();
assert(result.stats.stage1_discovered_keyword_dup === 1, "1个重复发现关键词");
cleanup();

// ============================================================
// Test 22: 所有数据文件都不存在
// ============================================================
console.log("\nTest 22: 所有数据文件都不存在");
setupDir();
result = runHealthCheck();
assert(result.issues.some(i => i.category === "bloggers.json"), "bloggers.json 缺失");
assert(result.issues.some(i => i.category === "videos.json"), "videos.json 缺失");
assert(result.stats.stage4a_total_audio === 0, "音频=0");
assert(result.stats.stage4b_total_transcripts === 0, "转录=0");
cleanup();

// ============================================================
// Test 23: sec_uid 为空字符串时不误报重复
// ============================================================
console.log("\nTest 23: sec_uid 为空字符串时不误报重复");
setupDir();
const bloggersWithEmpty = [
  { sec_uid: "", name: "A", url: "http://a" },
  { sec_uid: "", name: "B", url: "http://b" },
];
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify(bloggersWithEmpty));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.stats.stage1_duplicates === 0, "空字符串 sec_uid 不误报重复");
assert(result.stats.stage1_missing_fields === 2, "两个博主缺少 sec_uid（空字符串视为缺失）");
cleanup();

// ============================================================
// Test 24: 音频归档多级子目录
// ============================================================
console.log("\nTest 24: 音频归档多级子目录");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
const deepDir = path.join(AUDIO_DIR, "archived", "2026-04-23", "extra");
fs.mkdirSync(deepDir, { recursive: true });
fs.writeFileSync(path.join(deepDir, "deep.mp3"), "fake");
result = runHealthCheck();
assert(result.stats.stage4a_archived_audio === 1, "多级子目录归档音频计数=1");
assert(result.stats.stage4a_total_audio === 1, "音频总数=1");
cleanup();

// ============================================================
// Test 25: 同一视频ID同时存在于根目录和归档
// ============================================================
console.log("\nTest 25: 同一视频ID同时存在于根目录和归档（去重）");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(AUDIO_DIR, "dup.mp3"), "fake");
const dupArchDir = path.join(AUDIO_DIR, "archived", "2026-04-23");
fs.mkdirSync(dupArchDir, { recursive: true });
fs.writeFileSync(path.join(dupArchDir, "dup.mp3"), "fake");
result = runHealthCheck();
assert(result.stats.stage4a_total_audio === 1, "重复ID去重后=1");
assert(result.stats.stage4a_root_audio === 1, "根目录=1");
assert(result.stats.stage4a_archived_audio === 1, "归档=1");
cleanup();

// ============================================================
// Test 26: 博主空字符串字段检测
// ============================================================
console.log("\nTest 26: 博主空字符串字段检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify([
  { sec_uid: "s1", name: "A", url: "http://a", author_id: "" },
]));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "blogger_empty_field"), "检测到博主空字符串字段");
cleanup();

// ============================================================
// Test 27: 博主非法状态值检测
// ============================================================
console.log("\nTest 27: 博主非法状态值检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify([
  { sec_uid: "s1", name: "A", url: "http://a", status: "unknown_status" },
]));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "blogger_invalid_status"), "检测到博主非法状态");
cleanup();

// ============================================================
// Test 28: 关键词数据矛盾检测 (search_count>0 但 last_search_at=null)
// ============================================================
console.log("\nTest 28: 关键词数据矛盾检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(DATA_DIR, "search-keywords.json"), JSON.stringify({
  keywords: [
    { keyword: "AI", status: "completed", search_count: 5, last_search_at: null }
  ]
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "keyword_contradictory"), "检测到关键词数据矛盾");
cleanup();

// ============================================================
// Test 29: 发现关键词全部停滞检测
// ============================================================
console.log("\nTest 29: 发现关键词全部停滞检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(DATA_DIR, "discovered-keywords.json"), JSON.stringify({
  keywords: [
    { keyword: "AI", status: "pending", discovered_at: "2026-04-22" },
    { keyword: "ML", status: "pending", discovered_at: "2026-04-22" },
  ]
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "dk_all_pending"), "检测到全部发现关键词停滞");
cleanup();

// ============================================================
// Test 30: 视频非法状态值检测
// ============================================================
console.log("\nTest 30: 视频非法状态值检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({
  videos: [
    { aweme_id: "123", url: "http://x", author: "A", sec_uid: "s1", status: "broken" }
  ]
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "video_invalid_status"), "检测到视频非法状态");
cleanup();

// ============================================================
// Test 31: 视频非法质量值检测
// ============================================================
console.log("\nTest 31: 视频非法质量值检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({
  videos: [
    { aweme_id: "123", url: "http://x", author: "A", sec_uid: "s1", status: "processed", quality: "superb" }
  ]
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "video_invalid_quality"), "检测到视频非法质量值");
cleanup();

// ============================================================
// Test 32: 视频空字符串字段检测
// ============================================================
console.log("\nTest 32: 视频空字符串字段检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({
  videos: [
    { aweme_id: "123", url: "http://x", author: "A", sec_uid: "s1", author_id: "" }
  ]
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "video_empty_field"), "检测到视频空字符串字段");
cleanup();

// ============================================================
// Test 33: 视频 URL 格式异常检测
// ============================================================
console.log("\nTest 33: 视频 URL 格式异常检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({
  videos: [
    { aweme_id: "123", url: "https://example.com/wrong", author: "A", sec_uid: "s1" }
  ]
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "video_invalid_url"), "检测到视频 URL 格式异常");
cleanup();

// ============================================================
// Test 34: 视频 aweme_id 非纯数字检测
// ============================================================
console.log("\nTest 34: 视频 aweme_id 非纯数字检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({
  videos: [
    { aweme_id: "abc123", url: "https://www.douyin.com/video/abc123", author: "A", sec_uid: "s1" }
  ]
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "video_non_numeric_id"), "检测到 aweme_id 非纯数字");
cleanup();

// ============================================================
// Test 35: 发现关键词日期格式异常检测
// ============================================================
console.log("\nTest 35: 发现关键词日期格式异常检测");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(DATA_DIR, "discovered-keywords.json"), JSON.stringify({
  keywords: [
    { keyword: "AI", status: "pending", discovered_at: "April 22 2026" }
  ]
}));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "dk_date_format"), "检测到日期格式异常");
cleanup();

// ============================================================
// Test 36: 发现关键词合法日期格式不误报
// ============================================================
console.log("\nTest 36: 发现关键词合法日期格式不误报");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), "[]");
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
fs.writeFileSync(path.join(DATA_DIR, "discovered-keywords.json"), JSON.stringify({
  keywords: [
    { keyword: "AI", status: "promoted", discovered_at: "2026-04-22T00:00:00.000Z" },
    { keyword: "ML", status: "promoted", discovered_at: "2026-04-22" },
  ]
}));
result = runHealthCheck();
assert(!result.warnings.some(w => w.category === "dk_date_format"), "合法日期格式不误报");
assert(!result.warnings.some(w => w.category === "dk_all_pending"), "非全部 pending 不误报");
cleanup();

// ============================================================
// Test 37: 博主合法状态不误报
// ============================================================
console.log("\nTest 37: 博主合法状态不误报");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify([
  { sec_uid: "s1", name: "A", url: "https://www.douyin.com/user/s1", status: "active" },
  { sec_uid: "s2", name: "B", url: "https://www.douyin.com/user/s2", status: "blacklisted" },
]));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(!result.warnings.some(w => w.category === "blogger_invalid_status"), "合法状态不误报");
assert(!result.warnings.some(w => w.category === "blogger_invalid_url"), "合法 URL 不误报");
cleanup();

// ============================================================
// Test 38: 根因分析 - 已知根因匹配
// ============================================================
console.log("\nTest 38: 根因分析 - 已知根因匹配");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify([
  { sec_uid: "s1", name: "A", url: "https://www.douyin.com/user/s1", author_id: "a1" },
]));
fs.writeFileSync(path.join(DATA_DIR, "search-keywords.json"), JSON.stringify({
  version: "2.0",
  keywords: [
    { id: "kw-001", keyword: "测试", status: "completed", search_count: 5, last_search_at: null, found_bloggers: 3, last_found_at: null, created_at: "2026-04-13T00:00:00.000Z" }
  ]
}));
fs.writeFileSync(path.join(DATA_DIR, "discovered-keywords.json"), JSON.stringify({
  keywords: [
    { keyword: "创业", status: "pending", discovered_at: "2026-04-13T00:00:00.000Z" },
    { keyword: "创业", status: "pending", discovered_at: "2026-04-14T00:00:00.000Z" }
  ]
}));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
assert(result.warnings.some(w => w.category === "keyword_contradictory"), "检测到关键词矛盾");
assert(result.warnings.some(w => w.category === "discovered_keyword_dup"), "检测到发现关键词重复");
cleanup();

// ============================================================
// Test 39: 根因推断 - 未知问题自动推断
// ============================================================
console.log("\nTest 39: 根因推断规则 - 空字段推断");
const emptyFieldRule = CATEGORY_INFERENCE_RULES.find(r => r.pattern.test("blogger_empty_field"));
assert(emptyFieldRule !== undefined, "空字段推断规则存在");
assert(emptyFieldRule.rootCauseTemplate === "字段写入时未校验空值", "空字段推断根因正确");

const dupRule = CATEGORY_INFERENCE_RULES.find(r => r.pattern.test("discovered_keyword_dup"));
assert(dupRule !== undefined, "去重推断规则存在");
assert(dupRule.rootCauseTemplate === "写入前缺少去重检查", "去重推断根因正确");

const mismatchRule = CATEGORY_INFERENCE_RULES.find(r => r.pattern.test("statistics_mismatch"));
assert(mismatchRule !== undefined, "不一致推断规则存在");
assert(mismatchRule.autoFixable === true, "不一致问题可自动修复");

const unknownInference = inferRootCause({ category: "totally_unknown_category" });
assert(unknownInference.rootCause === "未知根因，需手动分析", "未知类别回退到手动分析");
assert(unknownInference.autoFixable === false, "未知类别不可自动修复");

// ============================================================
// Test 40: 自动修复预演模式不修改数据
// ============================================================
console.log("\nTest 40: 自动修复预演模式不修改数据");
setupDir();
const originalKwData = {
  version: "2.0",
  keywords: [
    { id: "kw-001", keyword: "测试", status: "completed", search_count: 5, last_search_at: null, found_bloggers: 3, last_found_at: null, created_at: "2026-04-13T00:00:00.000Z" }
  ]
};
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify([
  { sec_uid: "s1", name: "A", url: "https://www.douyin.com/user/s1" }
]));
fs.writeFileSync(path.join(DATA_DIR, "search-keywords.json"), JSON.stringify(originalKwData));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
const allIssues = [...result.issues, ...result.warnings];
const fixLog = autoFix(allIssues, true);
const kwAfter = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "search-keywords.json"), "utf-8"));
assert(kwAfter.keywords[0].last_search_at === null, "预演模式不修改 last_search_at");
assert(kwAfter.keywords[0].last_found_at === null, "预演模式不修改 last_found_at");
assert(fixLog.some(f => f.dry_run === true), "修复日志标记为预演");
cleanup();

// ============================================================
// Test 41: 自动修复执行模式修改数据
// ============================================================
console.log("\nTest 41: 自动修复执行模式修改数据");
setupDir();
fs.writeFileSync(path.join(DATA_DIR, "bloggers.json"), JSON.stringify([
  { sec_uid: "s1", name: "A", url: "https://www.douyin.com/user/s1" }
]));
fs.writeFileSync(path.join(DATA_DIR, "search-keywords.json"), JSON.stringify({
  version: "2.0",
  keywords: [
    { id: "kw-001", keyword: "测试", status: "completed", search_count: 5, last_search_at: null, found_bloggers: 3, last_found_at: null, created_at: "2026-04-13T00:00:00.000Z" }
  ]
}));
fs.writeFileSync(path.join(DATA_DIR, "videos.json"), JSON.stringify({ videos: [] }));
result = runHealthCheck();
const allIssues2 = [...result.issues, ...result.warnings];
const fixLog2 = autoFix(allIssues2, false);
const kwAfter2 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "search-keywords.json"), "utf-8"));
assert(kwAfter2.keywords[0].last_search_at !== null, "执行模式修改 last_search_at");
assert(kwAfter2.keywords[0].last_found_at !== null, "执行模式修改 last_found_at");
assert(fixLog2.some(f => f.dry_run === false), "修复日志标记为已执行");
cleanup();

// ============================================================
// Summary
// ============================================================
console.log("\n" + "=".repeat(60));
console.log(`边界测试结果: ${passed} 通过, ${failed} 失败`);
console.log("=".repeat(60));

if (failed > 0) {
  process.exit(1);
}
