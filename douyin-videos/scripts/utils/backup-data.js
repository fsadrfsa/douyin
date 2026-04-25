#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const CRITICAL_FILES = [
  'bloggers.json',
  'videos.json',
  'pipeline-state.json',
  'search-keywords.json',
  'blogger-analysis.json',
  'blogger-blacklist.json',
  'discovered-keywords.json',
  'statistics.json'
];

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function backupCriticalFiles() {
  console.log('📦 开始备份关键数据文件...');
  
  const backupPath = path.join(BACKUP_DIR, `critical-${TIMESTAMP}`);
  fs.mkdirSync(backupPath, { recursive: true });
  
  let backedUp = 0;
  CRITICAL_FILES.forEach(file => {
    const sourcePath = path.join(DATA_DIR, file);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(backupPath, file);
      fs.copyFileSync(sourcePath, destPath);
      console.log(`  ✅ ${file}`);
      backedUp++;
    }
  });
  
  console.log(`\n✨ 已备份 ${backedUp}/${CRITICAL_FILES.length} 个关键文件到: ${backupPath}`);
  return backupPath;
}

function backupFullData() {
  console.log('\n📦 开始完整数据备份...');
  
  const backupPath = path.join(BACKUP_DIR, `full-${TIMESTAMP}`);
  
  try {
    if (process.platform === 'win32') {
      execSync(`xcopy /E /I /Y "${DATA_DIR}" "${backupPath}"`, { stdio: 'inherit' });
    } else {
      execSync(`cp -r "${DATA_DIR}" "${backupPath}"`, { stdio: 'inherit' });
    }
    console.log(`\n✨ 完整数据备份到: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ 完整备份失败:', error.message);
    return null;
  }
}

function cleanOldBackups(maxAge = 30) {
  console.log(`\n🧹 清理 ${maxAge} 天前的旧备份...`);
  
  const now = Date.now();
  const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
  
  let cleaned = 0;
  const backups = fs.readdirSync(BACKUP_DIR);
  
  backups.forEach(backup => {
    const backupPath = path.join(BACKUP_DIR, backup);
    const stat = fs.statSync(backupPath);
    
    if (now - stat.mtimeMs > maxAgeMs) {
      try {
        if (fs.statSync(backupPath).isDirectory()) {
          fs.rmSync(backupPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(backupPath);
        }
        console.log(`  🗑️  已删除: ${backup}`);
        cleaned++;
      } catch (error) {
        console.error(`  ❌ 删除失败: ${backup} - ${error.message}`);
      }
    }
  });
  
  console.log(`\n✨ 已清理 ${cleaned} 个旧备份`);
}

function showBackupStats() {
  console.log('\n📊 备份统计:');
  
  const backups = fs.readdirSync(BACKUP_DIR);
  const criticalBackups = backups.filter(b => b.startsWith('critical-'));
  const fullBackups = backups.filter(b => b.startsWith('full-'));
  
  console.log(`  - 关键文件备份: ${criticalBackups.length} 个`);
  console.log(`  - 完整数据备份: ${fullBackups.length} 个`);
  console.log(`  - 总计: ${backups.length} 个备份`);
  
  if (backups.length > 0) {
    const latestBackup = backups.sort().reverse()[0];
    const latestPath = path.join(BACKUP_DIR, latestBackup);
    const stat = fs.statSync(latestPath);
    console.log(`  - 最新备份: ${latestBackup} (${stat.mtime.toLocaleString()})`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'critical';
  
  console.log('🚀 数据备份工具');
  console.log('='.repeat(50));
  
  ensureBackupDir();
  
  switch (mode) {
    case 'critical':
      backupCriticalFiles();
      break;
    case 'full':
      backupFullData();
      break;
    case 'both':
      backupCriticalFiles();
      backupFullData();
      break;
    case 'clean':
      cleanOldBackups(parseInt(args[1]) || 30);
      break;
    case 'stats':
      showBackupStats();
      break;
    default:
      console.log(`
用法: node backup-data.js [mode] [options]

模式:
  critical  - 仅备份关键数据文件 (默认)
  full      - 完整数据备份
  both      - 同时执行关键和完整备份
  clean     - 清理旧备份 (可指定天数，默认30天)
  stats     - 显示备份统计

示例:
  node backup-data.js critical
  node backup-data.js full
  node backup-data.js both
  node backup-data.js clean 7
  node backup-data.js stats
      `);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ 备份完成！');
}

main();
