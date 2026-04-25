# 回滚方案

## 一、回滚策略概述

### 1.1 回滚层级

| 层级 | 适用场景 | 影响范围 |
|------|----------|----------|
| Level 1 | 单个视频分析错误 | 单条记录 |
| Level 2 | 阶段执行异常 | 当前阶段所有记录 |
| Level 3 | 系统性故障 | 全部数据 |

### 1.2 回滚原则

- **最小影响**：优先使用低层级回滚
- **数据安全**：回滚前必须备份
- **可追溯**：记录回滚操作日志

---

## 二、备份策略

### 2.1 文件级备份

```javascript
// _shared/backup-manager.js

export class BackupManager {
  static BACKUP_DIR = 'data/backups';
  
  static async createFileBackup(filePath, reason = 'manual') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(
      this.BACKUP_DIR, 
      'files', 
      `${fileName}.${timestamp}.bak`
    );
    
    await fs.copy(filePath, backupPath);
    await this.logBackup(filePath, backupPath, reason);
    
    return backupPath;
  }
  
  static async restoreFileBackup(backupPath, targetPath) {
    await fs.copy(backupPath, targetPath);
    await this.logRestore(backupPath, targetPath);
  }
}
```

### 2.2 阶段级备份

```javascript
export class StageBackup {
  static async createStageBackup(stage) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(
      BackupManager.BACKUP_DIR,
      'stages',
      `stage${stage}_${timestamp}`
    );
    
    // 备份该阶段相关的所有文件
    const filesToBackup = this.getStageFiles(stage);
    for (const file of filesToBackup) {
      await fs.copy(file, path.join(backupDir, path.basename(file)));
    }
    
    return backupDir;
  }
  
  static getStageFiles(stage) {
    const stageFiles = {
      3: ['data/videos.json', 'data/cleaning.json'],
      4: ['data/transcripts/', 'data/audio/'],
      5: ['data/quality-gate.json'],
      6: ['data/final-output.json']
    };
    return stageFiles[stage] || [];
  }
}
```

### 2.3 完整备份

```javascript
export class FullBackup {
  static async createFullBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(
      BackupManager.BACKUP_DIR,
      'full',
      timestamp
    );
    
    // 备份整个 data 目录
    await fs.copy('data', backupDir);
    
    // 记录备份元信息
    const meta = {
      timestamp,
      files: await this.listFiles(backupDir),
      size: await this.getDirSize(backupDir)
    };
    await fs.writeJson(path.join(backupDir, 'backup-meta.json'), meta);
    
    return backupDir;
  }
}
```

---

## 三、回滚脚本

### 3.1 Level 1：单视频回滚

```javascript
// scripts/rollback-video.js

import { PipelineState } from '../clis/douyin-videos/_shared/pipeline-state.js';

async function rollbackVideo(awemeId) {
  console.log(`Rolling back video: ${awemeId}`);
  
  // 1. 获取当前状态
  const currentState = await PipelineState.getState(awemeId);
  console.log('Current state:', currentState);
  
  // 2. 重置到 stage3 之前
  await PipelineState.resetToStage(awemeId, 'stage2_completed');
  
  // 3. 删除该视频的分析结果文件
  const resultFiles = [
    `data/cleaning/${awemeId}.json`,
    `data/quality-gate/${awemeId}.json`,
    `data/final-output/${awemeId}.json`
  ];
  
  for (const file of resultFiles) {
    if (await fs.exists(file)) {
      await fs.remove(file);
      console.log(`Removed: ${file}`);
    }
  }
  
  console.log(`Rollback completed for video: ${awemeId}`);
}

// 使用方式
const awemeId = process.argv[2];
if (!awemeId) {
  console.error('Usage: node scripts/rollback-video.js <aweme_id>');
  process.exit(1);
}

rollbackVideo(awemeId);
```

### 3.2 Level 2：阶段回滚

```javascript
// scripts/rollback-stage.js

import { StageBackup } from '../clis/douyin-videos/_shared/backup-manager.js';
import { PipelineState } from '../clis/douyin-videos/_shared/pipeline-state.js';

async function rollbackStage(stage) {
  console.log(`Rolling back stage: ${stage}`);
  
  // 1. 查找最近的备份
  const backupDir = await findLatestBackup('stage', stage);
  if (!backupDir) {
    console.error('No backup found for stage:', stage);
    process.exit(1);
  }
  
  // 2. 恢复文件
  const files = await fs.readdir(backupDir);
  for (const file of files) {
    if (file === 'backup-meta.json') continue;
    await fs.copy(
      path.join(backupDir, file),
      path.join('data', file),
      { overwrite: true }
    );
    console.log(`Restored: ${file}`);
  }
  
  // 3. 更新所有视频状态
  await PipelineState.resetAllToStage(stage - 1);
  
  console.log(`Stage ${stage} rollback completed`);
}

async function findLatestBackup(type, stage) {
  const backupBase = path.join('data/backups', type === 'stage' ? 'stages' : 'full');
  const dirs = await fs.readdir(backupBase);
  const stageDirs = dirs.filter(d => d.startsWith(`stage${stage}`));
  
  if (stageDirs.length === 0) return null;
  
  // 按时间排序，返回最新的
  stageDirs.sort().reverse();
  return path.join(backupBase, stageDirs[0]);
}

// 使用方式
const stage = parseInt(process.argv[2]);
if (!stage || stage < 3 || stage > 6) {
  console.error('Usage: node scripts/rollback-stage.js <stage: 3-6>');
  process.exit(1);
}

rollbackStage(stage);
```

### 3.3 Level 3：完整回滚

```javascript
// scripts/rollback-full.js

import { FullBackup } from '../clis/douyin-videos/_shared/backup-manager.js';

async function rollbackFull(backupDate) {
  console.log(`Full rollback to: ${backupDate}`);
  
  // 1. 查找指定日期的备份
  const backupDir = path.join('data/backups/full', backupDate);
  if (!await fs.exists(backupDir)) {
    console.error('Backup not found:', backupDir);
    process.exit(1);
  }
  
  // 2. 创建当前状态的备份（以防需要恢复）
  const currentBackup = await FullBackup.createFullBackup();
  console.log('Current state backed up to:', currentBackup);
  
  // 3. 恢复数据
  await fs.remove('data');
  await fs.copy(backupDir, 'data');
  
  console.log('Full rollback completed');
  console.log('Current state backup:', currentBackup);
}

// 使用方式
const backupDate = process.argv[2];
if (!backupDate) {
  console.error('Usage: node scripts/rollback-full.js <backup_date>');
  console.error('Example: node scripts/rollback-full.js 2024-01-15T10-30-00');
  process.exit(1);
}

rollbackFull(backupDate);
```

---

## 四、备份保留策略

| 备份类型 | 保留时长 | 存储位置 |
|----------|----------|----------|
| 文件级备份 | 7 天 | `data/backups/files/` |
| 阶段级备份 | 30 天 | `data/backups/stages/` |
| 完整备份 | 90 天 | `data/backups/full/` |

---

## 五、回滚验证

### 5.1 验证脚本

```javascript
// scripts/verify-rollback.js

async function verifyRollback(awemeId) {
  console.log(`Verifying rollback for: ${awemeId}`);
  
  const checks = [];
  
  // 1. 检查状态是否正确
  const state = await PipelineState.getState(awemeId);
  checks.push({
    name: 'Pipeline State',
    passed: state.current_stage === 'stage2_completed',
    expected: 'stage2_completed',
    actual: state.current_stage
  });
  
  // 2. 检查文件是否已删除
  const resultFiles = [
    `data/cleaning/${awemeId}.json`,
    `data/quality-gate/${awemeId}.json`,
    `data/final-output/${awemeId}.json`
  ];
  
  for (const file of resultFiles) {
    const exists = await fs.exists(file);
    checks.push({
      name: `File: ${file}`,
      passed: !exists,
      expected: 'not exists',
      actual: exists ? 'exists' : 'not exists'
    });
  }
  
  // 3. 输出验证结果
  console.log('\nVerification Results:');
  console.log('='.repeat(50));
  
  let allPassed = true;
  for (const check of checks) {
    const status = check.passed ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (!check.passed) {
      console.log(`   Expected: ${check.expected}`);
      console.log(`   Actual: ${check.actual}`);
      allPassed = false;
    }
  }
  
  console.log('='.repeat(50));
  console.log(allPassed ? 'All checks passed!' : 'Some checks failed!');
  
  return allPassed;
}
```

---

## 六、操作命令汇总

```bash
# Level 1: 单视频回滚
node scripts/rollback-video.js 7xxxxxxxxxxxxxx

# Level 2: 阶段回滚
node scripts/rollback-stage.js 3

# Level 3: 完整回滚
node scripts/rollback-full.js 2024-01-15T10-30-00

# 验证回滚结果
node scripts/verify-rollback.js 7xxxxxxxxxxxxxx
```

---

## 七、相关文档

- [[../architecture/stage3-modification-design]] - Stage 3 修改详细内容
- [[test-plan]] - 测试方案
