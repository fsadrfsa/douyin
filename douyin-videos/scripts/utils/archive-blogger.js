/**
 * @fileoverview 博主归档脚本
 * @description 当博主被加入黑名单后，将其信息归档到 archived/ 目录，等待人工审核
 * 
 * 使用方法：
 *   node scripts/utils/archive-blogger.js <博主名或sec_uid>
 *   node scripts/utils/archive-blogger.js --all-blacklisted
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = 'd:/opencli/douyin-videos';
const DATA_FILES_DIR = path.join(DATA_DIR, 'data');
const RESULTS_DIR = path.join(DATA_DIR, 'results');
const ARCHIVED_DIR = path.join(DATA_DIR, 'archived');

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, content, 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function getBloggerDirName(bloggerName, secUid) {
  const sanitizedName = bloggerName
    .replace(/[\/\\?%*:|"<>]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
  const secUidPrefix = secUid ? `_${secUid.substring(0, 10)}` : '';
  return `${sanitizedName}${secUidPrefix}`;
}

function findBloggerInResults(identifier) {
  if (!fs.existsSync(RESULTS_DIR)) {
    return null;
  }

  const dirs = fs.readdirSync(RESULTS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const dirName of dirs) {
    const metadataPath = path.join(RESULTS_DIR, dirName, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = readJsonFile(metadataPath);
      if (metadata) {
        if (metadata.blogger_name === identifier || 
            metadata.sec_uid === identifier ||
            metadata.blogger_id === identifier ||
            dirName.includes(identifier)) {
          return {
            dirName,
            metadata,
            path: path.join(RESULTS_DIR, dirName),
          };
        }
      }
    }
  }

  return null;
}

function findBloggerInBlacklist(secUid) {
  const blacklistPath = path.join(DATA_FILES_DIR, 'blogger-blacklist.json');
  const blacklist = readJsonFile(blacklistPath);
  if (!blacklist || !blacklist.blacklist) {
    return null;
  }
  return blacklist.blacklist.find(entry => entry.sec_uid === secUid);
}

function archiveBlogger(bloggerInfo, reason = '加入黑名单') {
  const { dirName, metadata, path: bloggerPath } = bloggerInfo;
  
  console.log(`\n📁 归档博主: ${metadata.blogger_name}`);
  console.log(`   sec_uid: ${metadata.sec_uid}`);
  console.log(`   原因: ${reason}`);

  if (!fs.existsSync(ARCHIVED_DIR)) {
    fs.mkdirSync(ARCHIVED_DIR, { recursive: true });
  }

  const archivedPath = path.join(ARCHIVED_DIR, dirName);
  if (fs.existsSync(archivedPath)) {
    console.log(`   ⚠️  归档目录已存在: ${archivedPath}`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newPath = path.join(ARCHIVED_DIR, `${dirName}_${timestamp}`);
    console.log(`   使用新目录: ${newPath}`);
    fs.renameSync(bloggerPath, newPath);
  } else {
    fs.renameSync(bloggerPath, archivedPath);
    console.log(`   ✅ 已移动到: ${archivedPath}`);
  }

  removeFromBloggersJson(metadata.sec_uid);
  removeFromVideosJson(metadata.blogger_name);
  removeFromArchiveFiles(metadata.blogger_name);
  removeFromExceptionsFile(metadata.blogger_name, metadata.blogger_id);
  const videoIds = removeFromIndexFile(metadata.blogger_id);
  removeFromTranscriptsArchived(videoIds);
  removeFromReviewFiles(metadata.blogger_name);
  removeFromActiveBloggersReviewStats(metadata.blogger_name);
  removeFromBloggerAnalysis(metadata.blogger_name, metadata.blogger_id);
  updateStatistics();

  const archiveLogPath = path.join(ARCHIVED_DIR, 'archive-log.json');
  const archiveLog = readJsonFile(archiveLogPath) || {
    version: '1.0',
    archives: [],
  };
  
  archiveLog.archives.push({
    name: metadata.blogger_name,
    sec_uid: metadata.sec_uid,
    author_id: metadata.blogger_id,
    archived_at: new Date().toISOString(),
    reason,
    source: 'blacklist',
  });
  
  archiveLog.updated_at = new Date().toISOString();
  writeJsonFile(archiveLogPath, archiveLog);
  console.log(`   ✅ 已记录归档日志`);

  return true;
}

function removeFromBloggersJson(secUid) {
  const bloggersPath = path.join(DATA_FILES_DIR, 'bloggers.json');
  const bloggers = readJsonFile(bloggersPath);
  
  if (!bloggers || !Array.isArray(bloggers)) {
    console.log(`   ⚠️  bloggers.json 不存在或格式错误`);
    return;
  }

  const originalLength = bloggers.length;
  const filteredBloggers = bloggers.filter(b => b.sec_uid !== secUid);
  
  if (filteredBloggers.length < originalLength) {
    writeJsonFile(bloggersPath, filteredBloggers);
    console.log(`   ✅ 已从 bloggers.json 删除 ${originalLength - filteredBloggers.length} 条记录`);
  } else {
    console.log(`   ⚠️  bloggers.json 中未找到该博主`);
  }
}

function removeFromVideosJson(bloggerName) {
  const videosPath = path.join(DATA_FILES_DIR, 'videos.json');
  const videosData = readJsonFile(videosPath);
  
  if (!videosData || !videosData.videos) {
    console.log(`   ⚠️  videos.json 不存在或格式错误`);
    return;
  }

  const originalLength = videosData.videos.length;
  videosData.videos = videosData.videos.filter(v => v.author !== bloggerName);
  
  if (videosData.videos.length < originalLength) {
    videosData.updated_at = new Date().toISOString();
    writeJsonFile(videosPath, videosData);
    console.log(`   ✅ 已从 videos.json 删除 ${originalLength - videosData.videos.length} 条记录`);
  } else {
    console.log(`   ⚠️  videos.json 中未找到该博主的视频`);
  }
}

function removeFromArchiveFiles(bloggerName) {
  const archiveFiles = fs.readdirSync(DATA_FILES_DIR)
    .filter(f => f.startsWith('videos-archive-') && f.endsWith('.json'));
  
  let totalRemoved = 0;
  
  for (const file of archiveFiles) {
    const filePath = path.join(DATA_FILES_DIR, file);
    const archiveData = readJsonFile(filePath);
    
    if (!archiveData || !archiveData.videos) continue;
    
    const originalLength = archiveData.videos.length;
    archiveData.videos = archiveData.videos.filter(v => v.author !== bloggerName);
    
    if (archiveData.videos.length < originalLength) {
      archiveData.updated_at = new Date().toISOString();
      writeJsonFile(filePath, archiveData);
      const removed = originalLength - archiveData.videos.length;
      totalRemoved += removed;
      console.log(`   ✅ 已从 ${file} 删除 ${removed} 条记录`);
    }
  }
  
  if (totalRemoved === 0) {
    console.log(`   ⚠️  归档文件中未找到该博主的视频`);
  }
}

function removeFromExceptionsFile(bloggerName, authorId) {
  const exceptionsPath = path.join(DATA_FILES_DIR, 'videos-exceptions.json');
  const exceptionsData = readJsonFile(exceptionsPath);
  
  if (!exceptionsData || !exceptionsData.videos) {
    console.log(`   ⚠️  videos-exceptions.json 不存在或格式错误`);
    return;
  }

  const originalLength = exceptionsData.videos.length;
  exceptionsData.videos = exceptionsData.videos.filter(v => 
    v.author !== bloggerName && v.author_id !== authorId
  );
  
  if (exceptionsData.videos.length < originalLength) {
    const removed = originalLength - exceptionsData.videos.length;
    exceptionsData.updated_at = new Date().toISOString();
    writeJsonFile(exceptionsPath, exceptionsData);
    console.log(`   ✅ 已从 videos-exceptions.json 删除 ${removed} 条记录`);
  } else {
    console.log(`   ⚠️  videos-exceptions.json 中未找到该博主的视频`);
  }
}

function removeFromIndexFile(authorId) {
  const indexPath = path.join(DATA_FILES_DIR, 'videos-index.json');
  const indexData = readJsonFile(indexPath);
  
  if (!indexData || !indexData.index) {
    console.log(`   ⚠️  videos-index.json 不存在或格式错误`);
    return [];
  }

  const originalCount = Object.keys(indexData.index).length;
  const newIndex = {};
  const removedVideoIds = [];
  
  for (const [videoId, info] of Object.entries(indexData.index)) {
    if (info.author_id !== authorId) {
      newIndex[videoId] = info;
    } else {
      removedVideoIds.push(videoId);
    }
  }
  
  if (removedVideoIds.length > 0) {
    indexData.index = newIndex;
    indexData.stats.total = Object.keys(newIndex).length;
    indexData.updated_at = new Date().toISOString();
    writeJsonFile(indexPath, indexData);
    console.log(`   ✅ 已从 videos-index.json 删除 ${removedVideoIds.length} 条记录`);
  } else {
    console.log(`   ⚠️  videos-index.json 中未找到该博主的视频`);
  }
  
  return removedVideoIds;
}

function removeFromReviewFiles(bloggerName) {
  const reviewDir = path.join(DATA_DIR, 'transcripts', 'review');
  
  if (!fs.existsSync(reviewDir)) {
    return;
  }

  const subDirs = ['content-fragmented', 'whisper-hallucination'];
  let totalRemoved = 0;

  for (const subDir of subDirs) {
    const subDirPath = path.join(reviewDir, subDir);
    
    if (!fs.existsSync(subDirPath)) continue;

    try {
      const files = fs.readdirSync(subDirPath).filter(f => f.endsWith('.txt'));
      
      for (const file of files) {
        const filePath = path.join(subDirPath, file);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (content.includes(`博主: ${bloggerName}`)) {
            fs.unlinkSync(filePath);
            totalRemoved++;
            console.log(`   🗑️  已删除 review/${subDir}/${file}`);
          }
        } catch (err) {
          // 忽略单个文件读取错误
        }
      }
    } catch (err) {
      console.log(`   ⚠️  读取 ${subDir} 目录失败`);
    }
  }

  if (totalRemoved > 0) {
    console.log(`   ✅ 已删除 ${totalRemoved} 个 review 文件`);
  } else {
    console.log(`   ℹ️  无需删除的 review 文件`);
  }
}

function removeFromTranscriptsArchived(videoIds) {
  const archivedDir = path.join(DATA_DIR, 'transcripts', 'archived');
  
  if (!fs.existsSync(archivedDir) || !videoIds || videoIds.length === 0) {
    return;
  }

  let totalRemoved = 0;

  try {
    const dateDirs = fs.readdirSync(archivedDir);
    
    for (const dateDir of dateDirs) {
      const dateDirPath = path.join(archivedDir, dateDir);
      
      if (!fs.statSync(dateDirPath).isDirectory()) continue;
      
      for (const videoId of videoIds) {
        const filePath = path.join(dateDirPath, `${videoId}.txt`);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          totalRemoved++;
          console.log(`   🗑️  已删除 transcripts/archived/${dateDir}/${videoId}.txt`);
        }
      }
    }
  } catch (err) {
    console.log(`   ⚠️  读取 transcripts/archived 目录失败`);
  }

  if (totalRemoved > 0) {
    console.log(`   ✅ 已删除 ${totalRemoved} 个 transcripts/archived 文件`);
  } else {
    console.log(`   ℹ️  无需删除的 transcripts/archived 文件`);
  }
}

function updateStatistics() {
  const statsPath = path.join(DATA_FILES_DIR, 'statistics.json');
  const bloggersPath = path.join(DATA_FILES_DIR, 'bloggers.json');
  
  const stats = readJsonFile(statsPath);
  const bloggers = readJsonFile(bloggersPath);
  
  if (!stats || !stats.overview) {
    console.log(`   ⚠️  statistics.json 不存在或格式错误`);
    return;
  }
  
  if (!Array.isArray(bloggers)) {
    console.log(`   ⚠️  bloggers.json 格式错误，无法同步统计`);
    return;
  }
  
  const actualCount = bloggers.length;
  const recordedCount = stats.overview.total_bloggers;
  
  if (recordedCount !== actualCount) {
    stats.overview.total_bloggers = actualCount;
    stats.updated_at = new Date().toISOString();
    writeJsonFile(statsPath, stats);
    console.log(`   ✅ 已同步 statistics.json: ${recordedCount} → ${actualCount}`);
  } else {
    console.log(`   ℹ️  statistics.json 已是最新 (${actualCount})`);
  }
}

function removeFromActiveBloggersReviewStats(bloggerName) {
  const statsPath = path.join(DATA_FILES_DIR, 'active-bloggers-review-stats.json');
  const stats = readJsonFile(statsPath);
  
  if (!stats) {
    console.log(`   ⚠️  active-bloggers-review-stats.json 不存在`);
    return;
  }

  let removed = 0;

  // 从 review_stats_by_type 中删除
  if (stats.review_stats_by_type) {
    for (const type of Object.keys(stats.review_stats_by_type)) {
      const typeData = stats.review_stats_by_type[type];
      if (typeData.affected_bloggers) {
        const originalLength = typeData.affected_bloggers.length;
        typeData.affected_bloggers = typeData.affected_bloggers.filter(
          b => b.name !== bloggerName
        );
        removed += originalLength - typeData.affected_bloggers.length;
        typeData.total_files = typeData.affected_bloggers.length;
      }
    }
  }

  // 从 affected_bloggers 中删除
  if (stats.affected_bloggers && stats.affected_bloggers[bloggerName]) {
    delete stats.affected_bloggers[bloggerName];
  }

  // 更新 summary
  if (stats.summary) {
    const affectedCount = Object.keys(stats.affected_bloggers || {}).length;
    stats.summary.bloggers_with_review_issues = affectedCount;
  }

  if (removed > 0) {
    stats.updated_at = new Date().toISOString();
    writeJsonFile(statsPath, stats);
    console.log(`   ✅ 已从 active-bloggers-review-stats.json 删除 ${removed} 条记录`);
  } else {
    console.log(`   ℹ️  active-bloggers-review-stats.json 中无该博主记录`);
  }
}

function removeFromBloggerAnalysis(bloggerName, authorId) {
  const analysisPath = path.join(DATA_FILES_DIR, 'blogger-analysis.json');
  const analysis = readJsonFile(analysisPath);
  
  if (!analysis || !analysis.bloggers) {
    console.log(`   ⚠️  blogger-analysis.json 不存在或格式错误`);
    return;
  }

  const originalLength = analysis.bloggers.length;
  analysis.bloggers = analysis.bloggers.filter(
    b => b.name !== bloggerName && b.author_id !== authorId
  );

  if (analysis.bloggers.length < originalLength) {
    analysis.updated_at = new Date().toISOString();
    writeJsonFile(analysisPath, analysis);
    console.log(`   ✅ 已从 blogger-analysis.json 删除 ${originalLength - analysis.bloggers.length} 条记录`);
  } else {
    console.log(`   ℹ️  blogger-analysis.json 中无该博主记录`);
  }
}

function archiveAllBlacklisted() {
  console.log('\n📋 归档所有黑名单博主...\n');

  const blacklistPath = path.join(DATA_FILES_DIR, 'blogger-blacklist.json');
  const blacklist = readJsonFile(blacklistPath);
  
  if (!blacklist || !blacklist.blacklist || blacklist.blacklist.length === 0) {
    console.log('黑名单为空，无需归档');
    return;
  }

  let archivedCount = 0;
  let notFoundCount = 0;

  for (const entry of blacklist.blacklist) {
    const bloggerInfo = findBloggerInResults(entry.sec_uid || entry.name);
    
    if (bloggerInfo) {
      const success = archiveBlogger(bloggerInfo, entry.reason || '加入黑名单');
      if (success) {
        archivedCount++;
      }
    } else {
      console.log(`\n⚠️  未找到博主: ${entry.name} (${entry.sec_uid})`);
      notFoundCount++;
    }
  }

  console.log(`\n📊 归档完成:`);
  console.log(`   ✅ 已归档: ${archivedCount} 个博主`);
  console.log(`   ⚠️  未找到: ${notFoundCount} 个博主`);
}

function addToBlacklist(bloggerInfo, reason = '用户手动加入黑名单') {
  const blacklistPath = path.join(DATA_FILES_DIR, 'blogger-blacklist.json');
  let blacklist = readJsonFile(blacklistPath);
  
  if (!blacklist) {
    blacklist = {
      version: '1.0',
      updated_at: new Date().toISOString(),
      blacklist: [],
    };
  }

  const existingEntry = blacklist.blacklist.find(
    entry => entry.sec_uid === bloggerInfo.metadata.sec_uid
  );
  
  if (existingEntry) {
    console.log(`   ⚠️  该博主已在黑名单中`);
    return false;
  }

  blacklist.blacklist.push({
    name: bloggerInfo.metadata.blogger_name,
    author_id: bloggerInfo.metadata.blogger_id,
    sec_uid: bloggerInfo.metadata.sec_uid,
    added_at: new Date().toISOString().split('T')[0],
    reason,
  });
  
  blacklist.updated_at = new Date().toISOString();
  writeJsonFile(blacklistPath, blacklist);
  console.log(`   ✅ 已添加到黑名单`);
  
  return true;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
使用方法：
  node scripts/utils/archive-blogger.js <博主ID>           归档指定博主
  node scripts/utils/archive-blogger.js --blacklist <ID>   加入黑名单并归档
  node scripts/utils/archive-blogger.js --all-blacklisted  归档所有黑名单博主

示例：
  node scripts/utils/archive-blogger.js "胡说老王"
  node scripts/utils/archive-blogger.js --blacklist 145549815711955
  node scripts/utils/archive-blogger.js --all-blacklisted
`);
    process.exit(0);
  }

  if (args[0] === '--all-blacklisted') {
    archiveAllBlacklisted();
    return;
  }

  if (args[0] === '--blacklist' && args[1]) {
    const identifier = args[1];
    const customReason = args.includes('--reason') 
      ? args[args.indexOf('--reason') + 1] 
      : null;
    const bloggerInfo = findBloggerInResults(identifier);

    if (!bloggerInfo) {
      console.log(`❌ 未找到博主: ${identifier}`);
      process.exit(1);
    }

    const reason = customReason || '用户手动加入黑名单';

    console.log(`\n🚫 加入黑名单并归档: ${bloggerInfo.metadata.blogger_name}`);
    console.log(`   author_id: ${bloggerInfo.metadata.blogger_id}`);
    console.log(`   sec_uid: ${bloggerInfo.metadata.sec_uid}`);

    addToBlacklist(bloggerInfo, reason);
    archiveBlogger(bloggerInfo, reason);
    return;
  }

  const identifier = args[0];
  const bloggerInfo = findBloggerInResults(identifier);

  if (!bloggerInfo) {
    console.log(`❌ 未找到博主: ${identifier}`);
    process.exit(1);
  }

  const blacklistEntry = findBloggerInBlacklist(bloggerInfo.metadata.sec_uid);
  const reason = blacklistEntry?.reason || '手动归档';

  archiveBlogger(bloggerInfo, reason);
}

main();
