const fs = require("fs");
const path = require("path");

const ROOT = "d:/opencli/douyin-videos";
const resultsDir = path.join(ROOT, "results");
const archivedDir = path.join(ROOT, "archived");
const transDir = path.join(ROOT, "transcripts");
const audioDir = path.join(ROOT, "audio");
const cleanedDir = path.join(ROOT, "data/cleaned-results");
const blacklistPath = path.join(ROOT, "data/blogger-blacklist.json");

const blackSecUids = new Set();
const blackAuthorIds = new Set();
if (fs.existsSync(blacklistPath)) {
  try {
    const bl = JSON.parse(fs.readFileSync(blacklistPath, "utf-8"));
    (bl.blacklist || []).forEach((b) => {
      if (b.sec_uid) blackSecUids.add(b.sec_uid);
      if (b.author_id) blackAuthorIds.add(b.author_id);
    });
  } catch (e) {}
}

const transIds = new Set(
  fs
    .readdirSync(transDir)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => f.replace(".txt", "")),
);

const audioIds = new Set();
function scanAudioDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanAudioDir(full);
    else if (entry.name.endsWith(".mp3"))
      audioIds.add(entry.name.replace(".mp3", ""));
  });
}
scanAudioDir(audioDir);

const cleanedIds = new Set();
if (fs.existsSync(cleanedDir)) {
  fs.readdirSync(cleanedDir)
    .filter((f) => f.endsWith(".json"))
    .forEach((f) => cleanedIds.add(f.replace(".json", "")));
}

function collectFromResults(baseDir) {
  const videos = [];
  if (!fs.existsSync(baseDir)) return videos;
  const dirs = fs.readdirSync(baseDir);
  dirs.forEach((d) => {
    const vDir = path.join(baseDir, d, "videos");
    const metaPath = path.join(baseDir, d, "metadata.json");
    let author = d.split("_MS4w")[0];
    let authorId = "";
    let secUid = "";
    if (fs.existsSync(metaPath)) {
      try {
        const m = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        author = m.author || author;
        authorId = m.author_id || "";
        secUid = m.sec_uid || "";
      } catch (e) {}
    }
    if (fs.existsSync(vDir)) {
      fs.readdirSync(vDir)
        .filter((f) => f.endsWith(".json"))
        .forEach((f) => {
          try {
            const v = JSON.parse(fs.readFileSync(path.join(vDir, f), "utf-8"));
            const vid = v.aweme_id || v.video_id || f.replace(".json", "");
            let status = "pending";
            if (v.quality === "insufficient") status = "processed";
            else if (v.quality === "accessible") status = "processed";
            else if (v.stage4_status === "cleaned") status = "processed";
            else if (transIds.has(vid)) status = "transcribed";
            else if (audioIds.has(vid)) status = "downloaded";

            const entry = {
              aweme_id: vid,
              url: v.url || "https://www.douyin.com/video/" + vid,
              author: v.author || author,
              author_id: v.author_id || authorId,
              sec_uid: v.sec_uid || secUid,
              status: status,
            };
            if (v.quality) entry.quality = v.quality;
            if (v.stage4_status) entry.stage4_status = v.stage4_status;
            if (v.stage4_processed_at)
              entry.stage4_processed_at = v.stage4_processed_at;
            if (transIds.has(vid)) {
              const tPath = path.join(transDir, vid + ".txt");
              try {
                entry.transcript_path = tPath;
                entry.transcript_length = fs.statSync(tPath).size;
              } catch (e) {}
            }
            videos.push(entry);
          } catch (e) {}
        });
    }
  });
  return videos;
}

const activeVideos = collectFromResults(resultsDir);

const allIds = new Set();
const uniqueVideos = [];
let blacklistedCount = 0;
activeVideos.forEach((v) => {
  if (blackSecUids.has(v.sec_uid) || blackAuthorIds.has(v.author_id)) {
    blacklistedCount++;
    return;
  }
  if (!allIds.has(v.aweme_id)) {
    allIds.add(v.aweme_id);
    uniqueVideos.push(v);
  }
});

const stats = {};
uniqueVideos.forEach((v) => {
  stats[v.status] = (stats[v.status] || 0) + 1;
});

const output = {
  version: "1.0",
  updated_at: new Date().toISOString(),
  videos: uniqueVideos,
};

const outPath = path.join(ROOT, "data/videos.json");
const content = JSON.stringify(output, null, 2);
const tempPath = `${outPath}.tmp-${process.pid}-${Date.now()}`;
fs.writeFileSync(tempPath, content, "utf-8");
fs.renameSync(tempPath, outPath);

console.log("重建完成!");
console.log("总视频数:", uniqueVideos.length);
console.log("已过滤黑名单博主视频:", blacklistedCount);
console.log("状态统计:", JSON.stringify(stats));
console.log("有转录:", [...allIds].filter((id) => transIds.has(id)).length);
console.log("有音频:", [...allIds].filter((id) => audioIds.has(id)).length);
console.log("已整理:", [...allIds].filter((id) => cleanedIds.has(id)).length);
