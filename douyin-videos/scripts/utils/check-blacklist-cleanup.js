#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = 'd:/opencli/douyin-videos';
const DATA_FILES_DIR = path.join(DATA_DIR, 'data');

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function main() {
  console.log('🔍 黑名单数据清理检查\n');
  
  // 读取黑名单
  const blacklistData = readJsonFile(path.join(DATA_FILES_DIR, 'blogger-blacklist.json'));
  const blacklist = blacklistData?.blacklist || [];
  const blacklistIds = new Set(blacklist.map(b => b.author_id));
  const blacklistNames = new Set(blacklist.map(b => b.name));
  
  console.log(`📋 黑名单博主: ${blacklist.length} 个\n`);
  
  // 1. 检查 bloggers.json
  const bloggers = readJsonFile(path.join(DATA_FILES_DIR, 'bloggers.json')) || [];
  const bloggersInBlacklist = bloggers.filter(b => 
    blacklistIds.has(b.author_id) || blacklistNames.has(b.name)
  );
  
  console.log(`📁 bloggers.json:`);
  console.log(`   活跃博主: ${bloggers.length}`);
  console.log(`   黑名单博主: ${bloggersInBlacklist.length}`);
  if (bloggersInBlacklist.length > 0) {
    console.log(`   ❌ 未清理的博主:`);
    bloggersInBlacklist.forEach(b => console.log(`      - ${b.name} (${b.author_id})`));
  } else {
    console.log(`   ✅ 已清理干净`);
  }
  
  // 2. 检查 videos.json
  const videosData = readJsonFile(path.join(DATA_FILES_DIR, 'videos.json'));
  const videos = videosData?.videos || [];
  const videosInBlacklist = videos.filter(v => 
    blacklistIds.has(v.author_id) || blacklistNames.has(v.author)
  );
  
  console.log(`\n📁 videos.json:`);
  console.log(`   视频数量: ${videos.length}`);
  console.log(`   黑名单视频: ${videosInBlacklist.length}`);
  if (videosInBlacklist.length > 0) {
    console.log(`   ❌ 未清理的视频:`);
    videosInBlacklist.slice(0, 5).forEach(v => console.log(`      - ${v.aweme_id} (${v.author})`));
    if (videosInBlacklist.length > 5) console.log(`      ... 还有 ${videosInBlacklist.length - 5} 个`);
  } else {
    console.log(`   ✅ 已清理干净`);
  }
  
  // 3. 检查 videos-index.json
  const videosIndex = readJsonFile(path.join(DATA_FILES_DIR, 'videos-index.json'));
  const indexEntries = videosIndex?.index || {};
  const indexInBlacklist = Object.entries(indexEntries).filter(([id, info]) => 
    blacklistIds.has(info.author_id)
  );
  
  console.log(`\n📁 videos-index.json:`);
  console.log(`   视频索引: ${Object.keys(indexEntries).length}`);
  console.log(`   黑名单视频: ${indexInBlacklist.length}`);
  if (indexInBlacklist.length > 0) {
    console.log(`   ❌ 未清理的视频:`);
    indexInBlacklist.slice(0, 5).forEach(([id, info]) => console.log(`      - ${id} (author_id: ${info.author_id})`));
    if (indexInBlacklist.length > 5) console.log(`      ... 还有 ${indexInBlacklist.length - 5} 个`);
  } else {
    console.log(`   ✅ 已清理干净`);
  }
  
  // 4. 检查 videos-exceptions.json
  const exceptionsData = readJsonFile(path.join(DATA_FILES_DIR, 'videos-exceptions.json'));
  const exceptions = exceptionsData?.videos || [];
  const exceptionsInBlacklist = exceptions.filter(v => 
    blacklistIds.has(v.author_id) || blacklistNames.has(v.author)
  );
  
  console.log(`\n📁 videos-exceptions.json:`);
  console.log(`   异常视频: ${exceptions.length}`);
  console.log(`   黑名单视频: ${exceptionsInBlacklist.length}`);
  if (exceptionsInBlacklist.length > 0) {
    console.log(`   ❌ 未清理的视频:`);
    exceptionsInBlacklist.slice(0, 5).forEach(v => console.log(`      - ${v.aweme_id} (${v.author})`));
    if (exceptionsInBlacklist.length > 5) console.log(`      ... 还有 ${exceptionsInBlacklist.length - 5} 个`);
  } else {
    console.log(`   ✅ 已清理干净`);
  }
  
  // 5. 检查 videos-archive-*.json
  const archiveFiles = fs.readdirSync(DATA_FILES_DIR)
    .filter(f => f.startsWith('videos-archive-') && f.endsWith('.json'));
  
  let archiveTotal = 0;
  let archiveInBlacklist = 0;
  
  for (const file of archiveFiles) {
    const archiveData = readJsonFile(path.join(DATA_FILES_DIR, file));
    const archiveVideos = archiveData?.videos || [];
    archiveTotal += archiveVideos.length;
    archiveInBlacklist += archiveVideos.filter(v => 
      blacklistIds.has(v.author_id) || blacklistNames.has(v.author)
    ).length;
  }
  
  console.log(`\n📁 videos-archive-*.json:`);
  console.log(`   归档文件: ${archiveFiles.length} 个`);
  console.log(`   归档视频: ${archiveTotal}`);
  console.log(`   黑名单视频: ${archiveInBlacklist}`);
  if (archiveInBlacklist > 0) {
    console.log(`   ❌ 未清理的视频: ${archiveInBlacklist} 个`);
  } else {
    console.log(`   ✅ 已清理干净`);
  }
  
  // 6. 检查 transcripts/archived/
  const transcriptsDir = path.join(DATA_DIR, 'transcripts', 'archived');
  let transcriptsTotal = 0;
  let transcriptsInBlacklist = 0;
  
  if (fs.existsSync(transcriptsDir)) {
    const dateDirs = fs.readdirSync(transcriptsDir);
    for (const dateDir of dateDirs) {
      const dateDirPath = path.join(transcriptsDir, dateDir);
      if (!fs.statSync(dateDirPath).isDirectory()) continue;
      
      const files = fs.readdirSync(dateDirPath).filter(f => f.endsWith('.txt'));
      transcriptsTotal += files.length;
      
      // 检查每个转录文件是否属于黑名单博主的视频
      for (const file of files) {
        const videoId = file.replace('.txt', '');
        // 检查是否在 videos-index 中且属于黑名单博主
        if (indexEntries[videoId] && blacklistIds.has(indexEntries[videoId].author_id)) {
          transcriptsInBlacklist++;
        }
      }
    }
  }
  
  console.log(`\n📁 transcripts/archived/:`);
  console.log(`   转录文件: ${transcriptsTotal}`);
  console.log(`   黑名单转录: ${transcriptsInBlacklist}`);
  if (transcriptsInBlacklist > 0) {
    console.log(`   ❌ 未清理的转录: ${transcriptsInBlacklist} 个`);
  } else {
    console.log(`   ✅ 已清理干净`);
  }
  
  // 7. 检查 transcripts/review/
  const reviewDir = path.join(DATA_DIR, 'transcripts', 'review');
  let reviewTotal = 0;
  let reviewInBlacklist = 0;
  
  if (fs.existsSync(reviewDir)) {
    const subDirs = ['content-fragmented', 'whisper-hallucination'];
    for (const subDir of subDirs) {
      const subDirPath = path.join(reviewDir, subDir);
      if (!fs.existsSync(subDirPath)) continue;
      
      const files = fs.readdirSync(subDirPath).filter(f => f.endsWith('.txt'));
      reviewTotal += files.length;
      
      for (const file of files) {
        const videoId = file.replace('.txt', '');
        if (indexEntries[videoId] && blacklistIds.has(indexEntries[videoId].author_id)) {
          reviewInBlacklist++;
        }
      }
    }
  }
  
  console.log(`\n📁 transcripts/review/:`);
  console.log(`   Review文件: ${reviewTotal}`);
  console.log(`   黑名单Review: ${reviewInBlacklist}`);
  if (reviewInBlacklist > 0) {
    console.log(`   ❌ 未清理的Review: ${reviewInBlacklist} 个`);
  } else {
    console.log(`   ✅ 已清理干净`);
  }
  
  // 8. 检查 results/ 目录
  const resultsDir = path.join(DATA_DIR, 'results');
  let resultsTotal = 0;
  let resultsInBlacklist = 0;
  const resultsBlacklistNames = [];
  
  if (fs.existsSync(resultsDir)) {
    const bloggerDirs = fs.readdirSync(resultsDir);
    resultsTotal = bloggerDirs.length;
    
    for (const dir of bloggerDirs) {
      // 检查目录名是否包含黑名单博主名或ID
      const found = blacklist.find(b => 
        dir.includes(b.name) || dir.includes(b.author_id)
      );
      if (found) {
        resultsInBlacklist++;
        resultsBlacklistNames.push(dir);
      }
    }
  }
  
  console.log(`\n📁 results/:`);
  console.log(`   博主目录: ${resultsTotal}`);
  console.log(`   黑名单目录: ${resultsInBlacklist}`);
  if (resultsInBlacklist > 0) {
    console.log(`   ❌ 未归档的目录:`);
    resultsBlacklistNames.slice(0, 5).forEach(n => console.log(`      - ${n}`));
    if (resultsBlacklistNames.length > 5) console.log(`      ... 还有 ${resultsBlacklistNames.length - 5} 个`);
  } else {
    console.log(`   ✅ 已清理干净`);
  }
  
  // 总结
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 清理状态总结:`);
  
  const issues = [];
  if (bloggersInBlacklist.length > 0) issues.push(`bloggers.json: ${bloggersInBlacklist.length} 个`);
  if (videosInBlacklist.length > 0) issues.push(`videos.json: ${videosInBlacklist.length} 个`);
  if (indexInBlacklist.length > 0) issues.push(`videos-index.json: ${indexInBlacklist.length} 个`);
  if (exceptionsInBlacklist.length > 0) issues.push(`videos-exceptions.json: ${exceptionsInBlacklist.length} 个`);
  if (archiveInBlacklist > 0) issues.push(`videos-archive: ${archiveInBlacklist} 个`);
  if (transcriptsInBlacklist > 0) issues.push(`transcripts/archived: ${transcriptsInBlacklist} 个`);
  if (reviewInBlacklist > 0) issues.push(`transcripts/review: ${reviewInBlacklist} 个`);
  if (resultsInBlacklist > 0) issues.push(`results/: ${resultsInBlacklist} 个目录`);
  
  if (issues.length === 0) {
    console.log(`✅ 所有数据已清理干净！`);
  } else {
    console.log(`❌ 存在未清理的数据:`);
    issues.forEach(i => console.log(`   - ${i}`));
  }
}

main().catch(console.error);
