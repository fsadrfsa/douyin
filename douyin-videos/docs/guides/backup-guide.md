# 数据备份指南

## 快速备份

### 方法一：使用批处理脚本（推荐）

双击运行：
```
D:\opencli\douyin-videos\scripts\utils\backup-data.bat
```

### 方法二：使用 Node.js 脚本

```bash
cd D:\opencli\douyin-videos

# 仅备份关键文件
node scripts/utils/backup-data.js critical

# 完整数据备份
node scripts/utils/backup-data.js full

# 同时执行两种备份
node scripts/utils/backup-data.js both

# 清理30天前的旧备份
node scripts/utils/backup-data.js clean 30

# 查看备份统计
node scripts/utils/backup-data.js stats
```

### 方法三：手动备份

```bash
# 备份关键数据文件
xcopy /E /I /Y "D:\opencli\douyin-videos\data" "D:\opencli\douyin-videos\backups\manual-backup-%date:~0,10%"
```

## 关键数据文件

以下文件包含核心数据，必须定期备份：

| 文件 | 说明 | 重要性 |
|------|------|--------|
| `bloggers.json` | 博主列表 | ⭐⭐⭐⭐⭐ |
| `videos.json` | 视频记录 | ⭐⭐⭐⭐⭐ |
| `pipeline-state.json` | 流程状态 | ⭐⭐⭐⭐ |
| `search-keywords.json` | 搜索关键词 | ⭐⭐⭐⭐ |
| `blogger-analysis.json` | 博主分析 | ⭐⭐⭐ |
| `blogger-blacklist.json` | 黑名单 | ⭐⭐⭐ |
| `discovered-keywords.json` | 发现的关键词 | ⭐⭐⭐ |
| `statistics.json` | 统计数据 | ⭐⭐ |

## 备份策略建议

### 1. 本地备份（基础）

**频率**：每天一次
**保留**：最近 30 天
**位置**：`D:\opencli\douyin-videos\backups\`

```bash
# 添加到 Windows 任务计划程序
# 每天凌晨 2:00 自动执行
schtasks /create /tn "DouyinVideos-Backup" /tr "D:\opencli\douyin-videos\scripts\utils\backup-data.bat" /sc daily /st 02:00
```

### 2. 云端备份（推荐）

#### 方案 A：GitHub 私有仓库

```bash
# 1. 创建 .gitignore，排除大文件
echo "videos/*.mp4" >> .gitignore
echo "audio/*.mp3" >> .gitignore
echo "transcripts/*.txt" >> .gitignore

# 2. 提交数据文件
git add data/*.json
git commit -m "backup: data backup $(date +%Y%m%d)"
git push origin main
```

#### 方案 B：云盘同步

将 `D:\opencli\douyin-videos\data` 目录同步到：
- 百度网盘
- 阿里云盘
- OneDrive
- 坚果云

### 3. 多重备份（最佳实践）

采用 **3-2-1 备份策略**：
- **3** 份副本：原始数据 + 2个备份
- **2** 种介质：本地硬盘 + 云盘
- **1** 个异地：云端存储

```
原始数据 (D:\opencli\douyin-videos\data)
    ↓
本地备份 (D:\opencli\douyin-videos\backups\)
    ↓
云端备份 (GitHub/云盘)
```

## 自动备份设置

### Windows 任务计划

创建文件 `auto-backup.xml`：

```xml
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2">
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-04-18T02:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Actions>
    <Exec>
      <Command>D:\opencli\douyin-videos\scripts\utils\backup-data.bat</Command>
    </Exec>
  </Actions>
</Task>
```

导入任务：
```bash
schtasks /create /tn "DouyinVideos-Daily-Backup" /xml auto-backup.xml
```

### Git 自动提交

创建 `.git/hooks/post-commit`：

```bash
#!/bin/bash
# 每次提交后自动备份数据文件
cd D:\opencli\douyin-videos
node scripts/utils/backup-data.js critical
```

## 备份验证

### 检查备份完整性

```bash
# 查看备份文件列表
dir D:\opencli\douyin-videos\backups

# 验证 JSON 文件格式
node -e "const fs=require('fs'); const files=['bloggers.json','videos.json']; files.forEach(f=>{try{JSON.parse(fs.readFileSync('data/'+f)); console.log('✓',f)}catch(e){console.log('✗',f,e.message)}})"
```

### 恢复数据

```bash
# 从备份恢复
xcopy /E /I /Y "D:\opencli\douyin-videos\backups\data-backup-20260418-120000" "D:\opencli\douyin-videos\data"
```

## 备份监控

### 创建监控脚本

```javascript
// monitor-backups.js
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = './backups';
const MAX_AGE_HOURS = 26; // 最大允许26小时前的备份

function checkBackups() {
  const backups = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  
  const recentBackups = backups.filter(backup => {
    const stat = fs.statSync(path.join(BACKUP_DIR, backup));
    const age = now - stat.mtimeMs;
    return age < MAX_AGE_HOURS * 60 * 60 * 1000;
  });
  
  if (recentBackups.length === 0) {
    console.error('⚠️ 警告：没有找到最近的备份！');
    console.error(`最新备份应该在 ${MAX_AGE_HOURS} 小时内`);
    process.exit(1);
  } else {
    console.log(`✅ 找到 ${recentBackups.length} 个最近备份`);
    recentBackups.forEach(b => console.log(`  - ${b}`));
  }
}

checkBackups();
```

运行监控：
```bash
node monitor-backups.js
```

## 应急预案

### 数据丢失场景

1. **误删除文件**
   - 立即停止操作
   - 从最近备份恢复
   - 检查 git stash：`git stash list`

2. **硬盘故障**
   - 从云端备份恢复
   - 联系 IT 支持

3. **数据损坏**
   - 检查备份文件完整性
   - 从多个备份中选择最新的完整备份
   - 逐步恢复并验证

### 恢复优先级

1. `bloggers.json` - 博主列表（最高优先级）
2. `videos.json` - 视频记录
3. `pipeline-state.json` - 流程状态
4. 其他数据文件

## 最佳实践

✅ **定期备份**：每天自动备份
✅ **多重备份**：本地 + 云端
✅ **验证备份**：定期检查备份完整性
✅ **版本控制**：使用 git 管理关键数据
✅ **文档记录**：记录备份和恢复流程
✅ **测试恢复**：定期测试数据恢复流程

❌ **避免**：
- 仅依赖单一备份
- 忽略备份验证
- 长期不检查备份状态
- 备份文件与原始文件在同一磁盘
