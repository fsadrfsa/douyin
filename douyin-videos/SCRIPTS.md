# 抖音视频处理项目 - 脚本清单

**更新时间**: 2026-04-24

---

## 📁 目录结构

```
d:\opencli\douyin-videos\
├── .opencli/clis/douyin-videos/    # 核心 CLI 脚本 (已注册)
├── scripts/
│   ├── utils/                       # 工具脚本
│   └── _archived/                   # 归档脚本
│       ├── test/                    # 测试脚本
│       ├── migration/               # 迁移脚本
│       └── utils/                   # 临时工具
├── data/                            # 数据文件
├── audio/                           # 音频文件
├── transcripts/                     # 转录文件
└── results/                         # 整理结果
```

---

## ✅ 核心脚本 (活跃使用)

### 编排脚本

| 文件 | 命令 | 用途 |
|------|------|------|
| `pipeline-orchestrator.js` | `node .../pipeline-orchestrator.js` | 主编排脚本 |

### Stage 脚本

| 文件 | 命令 | 用途 |
|------|------|------|
| `stage1-blogger-discover.js` | `opencli douyin-videos stage1` | 博主发现 |
| `stage2-video-collect.js` | `opencli douyin-videos stage2` | 视频收集 |
| `stage4-transcribe-local.js` | `node .../stage4-transcribe-local.js` | 本地转录 |
| `stage4-fallback-process.js` | 内部调用 | Stage4 回退处理 |

### 数据处理脚本

| 文件 | 命令 | 用途 |
|------|------|------|
| `consistency-check.js` | `opencli douyin-videos consistency-check` | 数据一致性检查 |
| `distribute-cleaned.js` | 内部调用 | 分发整理结果 |
| `validate-cleaned.js` | 内部调用 | 验证整理结果 |
| `archive-transcripts.js` | `node .../archive-transcripts.js` | 归档转录文件 |
| `fill-metadata.js` | `node .../fill-metadata.js` | 填充元数据 |

---

## ⚠️ 工具脚本 (偶尔使用)

### .opencli/clis/douyin-videos/

| 文件 | 用途 |
|------|------|
| `reset-bloggers.cjs` | 重置博主采集状态 |
| `fix-status-anomalies.js` | 修复状态异常 |
| `fix-data-consistency.js` | 修复数据一致性 |

### scripts/utils/

| 文件 | 用途 |
|------|------|
| `archive-blogger.js` | 归档博主 |
| `backup-data.js` | 备份数据 |
| `filter-blacklist.js` | 过滤黑名单 |
| `clean-discovered-keywords.cjs` | 清理发现关键词 |
| `reorder-metadata-fields.cjs` | 重排元数据字段 |
| `clean-metadata-fields.cjs` | 清理元数据字段 |

---

## 📦 归档脚本 (scripts/_archived/)

详见 [scripts/_archived/README.md](file:///d:/opencli/douyin-videos/scripts/_archived/README.md)

---

## 🔧 共享模块 (_shared/)

| 文件 | 用途 |
|------|------|
| `audio-archiver.js` | 音频归档 |
| `audio-splitter.js` | 音频分割 |
| `audio-validator.js` | 音频验证 |
| `blogger-manager.js` | 博主管理 |
| `config.js` | 配置管理 |
| `constants.js` | 常量定义 |
| `deduplication.js` | 去重逻辑 |
| `error-handler.js` | 错误处理 |
| `file-cleaner.js` | 文件清理 |
| `file-lock.js` | 文件锁 |
| `media-downloader.js` | 媒体下载 |
| `pipeline-state.js` | 流水线状态 |
| `quality-gate.js` | 质量门控 |
| `statistics-manager.js` | 统计管理 |
| `transcript-archiver.js` | 转录归档 |
| `transcript-validator.js` | 转录验证 |
| `types.js` | 类型定义 |
| `videos-manager.js` | 视频管理 |
| `whisper-transcriber.js` | Whisper 转录 |

---

## 🗑️ 已删除文件

| 文件 | 删除原因 |
|------|----------|
| `verify-remaining.js` | 一次性脚本，问题已解决 |
| `analyze-mismatch.js` | 一次性脚本，问题已解决 |
| `remove-mismatched.js` | 一次性脚本，问题已解决 |
| `check-videos.js` | 简单诊断，不再需要 |
| `tmp-extract.cjs` | 临时脚本 |
| `scripts/stage3-batch.ts` | Stage3 已移除 |
