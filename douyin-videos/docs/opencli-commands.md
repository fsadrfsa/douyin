# OpenCLI 抖音视频采集命令说明

本文档介绍 `douyin-videos` 系列命令的使用方法和参数配置。

---

## 命令概览

| 命令 | 说明 | 调用方式 |
|------|------|----------|
| `stage1` | 博主发现 - 搜索关键词发现高质量博主 | `opencli douyin-videos stage1` |
| `stage2` | 视频采集 - 从博主主页获取最新视频 | `opencli douyin-videos stage2` |
| `stage4` | 音频下载 - 下载视频音频并可选转录 | `opencli douyin-videos stage4` |
| `stage4-transcribe-local` | 本地转录 - 使用 Whisper 转录音频 | `node stage4-transcribe-local.js` |
| `consistency-check` | 数据一致性检查 | `opencli douyin-videos consistency-check` |
| `archive-blogger` | 博主归档/黑名单管理 | `node archive-blogger.js` |
| `reset-bloggers` | 重置博主采集状态 | `node reset-bloggers.cjs` |

---

## stage1 - 博主发现

### 功能说明

通过搜索关键词在抖音发现高质量博主，自动进行：
- 关键词搜索和视频采集
- 博主质量评分和筛选
- 相关性分析（标题/内容关键词匹配）
- 评论分析辅助筛选（可选）
- 自动过滤黑名单和不相关博主

### 命令参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--limit` | int | 30 | 每个关键词搜索的视频数量 |
| `--max_keywords` | int | 5 | 最多处理的关键词数量 |
| `--min_score` | int | 40 | 最低质量分数阈值 |
| `--min_relevance_score` | int | 40 | 最低相关性评分阈值（0-100） |
| `--min_followers` | int | 1000 | 最低粉丝数 |
| `--enable_comments` | boolean | false | 启用评论分析辅助筛选 |
| `--reset_completed` | boolean | false | 重置已完成关键词状态（全量刷新） |
| `--dry_run` | boolean | false | 试运行，不保存结果 |

### 使用示例

```bash
# 基本用法
opencli douyin-videos stage1

# 指定参数
opencli douyin-videos stage1 --limit 50 --max_keywords 10 --min_score 50

# 启用评论分析
opencli douyin-videos stage1 --enable_comments

# 全量刷新（重置已完成关键词）
opencli douyin-videos stage1 --reset_completed

# 试运行
opencli douyin-videos stage1 --dry_run
```

### 输出字段

| 字段 | 说明 |
|------|------|
| `keyword` | 搜索关键词 |
| `status` | 状态：completed/failed/error |
| `videos_found` | 发现的视频数 |
| `candidates` | 候选博主数 |
| `bloggers_added` | 新增博主数 |
| `bloggers_skipped` | 跳过博主数 |

### 相关性评分规则

**加分关键词（+5 ~ +20）：**
- 创业/副业/赚钱/项目/变现：+15
- 实操/落地/手把手/保姆级：+20
- 月入/日入/收入/利润：+15
- AI/自动化/工具：+5

**减分关键词（-30 ~ -50）：**
- 游戏/电竞/娱乐/搞笑：-50
- 美食/旅游/穿搭/萌宠：-50
- 认知提升/思维认知：-30
- 英语/考研/考公：-30

---

## stage2 - 视频采集

### 功能说明

从已发现的博主主页获取最新视频元数据，包括：
- 博主资料更新（粉丝数、作品数等）
- 视频列表采集（支持 API 和 DOM 回退）
- 视频相关性筛选
- 数据一致性检查

### 命令参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--max_videos` | int | 1 | 每个博主获取的最大视频数 |
| `--max_bloggers` | int | 0 | 最多处理的博主数量（0=全部） |
| `--dry_run` | boolean | false | 试运行，不保存结果 |
| `--repair` | boolean | false | 补全 incomplete 视频的缺失字段 |
| `--video_url` | string | "" | 指定视频URL或aweme_id，更新对应博主的元数据 |

### 使用示例

```bash
# 基本用法
opencli douyin-videos stage2

# 每个博主采集 5 个视频
opencli douyin-videos stage2 --max_videos 5

# 处理 20 个博主
opencli douyin-videos stage2 --max_bloggers 20 --max_videos 3

# 补全缺失字段
opencli douyin-videos stage2 --repair

# 指定视频URL更新博主元数据
opencli douyin-videos stage2 --video_url https://www.douyin.com/video/7625983212317150516
```

### 输出字段

| 字段 | 说明 |
|------|------|
| `blogger` | 博主名称 |
| `status` | 状态：success/error/no_videos |
| `videos_found` | 发现的视频数 |
| `videos_new` | 新增视频数 |
| `videos_skipped` | 跳过视频数（已存在） |

### 自动跳过规则

- 状态为 `paused` 或 `archived` 的博主
- 今日已采集过的博主
- 图文作品（非视频）
- 不相关视频（游戏/娱乐/美食等）

---

## stage4 - 音频下载

### 功能说明

下载视频音频文件，支持：
- 直接音频下载
- 视频下载后提取音频
- 音频内容验证
- 并行转录（可选）
- 失败重试机制

### 命令参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--data_dir` | string | ~/.douyin-videos | 数据目录 |
| `--max_videos` | int | 20 | 最大处理视频数 |
| `--keep_media` | boolean | false | 保留媒体文件（视频/音频） |
| `--video_id` | string | - | 只处理指定视频（逗号分隔） |
| `--cleanup` | boolean | false | 执行文件清理（删除前天的文件） |

### 使用示例

```bash
# 基本用法
opencli douyin-videos stage4

# 指定参数
opencli douyin-videos stage4 --max_videos 50

# 只处理指定视频
opencli douyin-videos stage4 --video_id 7564805816054844699,7574700768452726068

# 执行清理
opencli douyin-videos stage4 --cleanup
```

### 输出字段

| 字段 | 说明 |
|------|------|
| `video_id` | 视频ID |
| `status` | 状态：downloaded/failed |
| `audio_path` | 音频文件路径 |

### 失败处理机制

下载失败的视频会被记录：
- `stage4_status`: "failed"
- `stage4_retry_count`: 重试次数
- `stage4_last_error`: 错误信息

**重试规则：**
- 重试次数 < 3 的视频会在下次运行时自动重试
- 重试次数 ≥ 3 后标记为"已达重试上限"

---

## stage4-transcribe-local - 本地转录

### 功能说明

使用 Whisper 模型在本地转录音频文件，支持：
- whisper.cpp（推荐，GPU 加速）
- OpenAI Whisper（Python 版本）
- 并发转录
- 音频分段处理

### 命令参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--engine` | string | whisper_cpp | 转录引擎：whisper_cpp / openai_whisper |
| `--data_dir` | string | ~/.douyin-videos | 数据目录 |
| `--whisper_model` | string | base | 模型：tiny/base/small/medium/large |
| `--whisper_cpp_dir` | string | d:\whisper-cublas-12.4.0-bin-x64 | whisper.cpp 安装目录 |
| `--whisper_path` | string | whisper | openai-whisper 可执行文件路径 |
| `--concurrency` | int | 2 | 并发转录数（自动根据GPU温度和显存调整） |
| `--max_videos` | int | 50 | 最大处理视频数 |
| `--video_id` | string | - | 只处理指定视频（逗号分隔） |
| `--keep_media` | boolean | false | 保留媒体文件 |
| `--dry_run` | boolean | false | 试运行，只显示待转录列表 |
| `--force` | boolean | false | 强制转录（包括短于30秒的音频） |
| `--force_concurrency` | boolean | false | 强制使用指定并发数（忽略GPU显存限制） |

### 使用示例

```bash
# 基本用法
node d:/opencli/.opencli/clis/douyin-videos/stage4-transcribe-local.js

# 指定引擎和模型
node d:/opencli/.opencli/clis/douyin-videos/stage4-transcribe-local.js --engine whisper_cpp --whisper_model small

# 并发转录
node d:/opencli/.opencli/clis/douyin-videos/stage4-transcribe-local.js --concurrency 4 --max_videos 100

# 只处理指定视频
node d:/opencli/.opencli/clis/douyin-videos/stage4-transcribe-local.js --video_id 7564805816054844699

# 试运行
node d:/opencli/.opencli/clis/douyin-videos/stage4-transcribe-local.js --dry_run
```

### 转录输出

转录结果保存在：
- `transcripts/{video_id}.txt` - 原始转录文本
- `data/cleaned-results/{video_id}.json` - 整理后的结构化数据

---

## consistency-check - 数据一致性检查

### 功能说明

检查数据一致性，找出缺失/孤立视频并修复：
- 检查 videos.json 与 results/ 目录的一致性
- 找出缺失的视频记录
- 找出孤立的视频文件
- 支持批量修复

### 命令参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--batch_fix` | boolean | false | 批量修复缺失视频（需要浏览器） |
| `--full_fix` | boolean | false | 完整修复模式（启用浏览器，获取完整信息） |

### 使用示例

```bash
# 基本检查（不需要浏览器）
opencli douyin-videos consistency-check

# 批量修复（需要浏览器）
opencli douyin-videos consistency-check --batch_fix true

# 完整修复模式
opencli douyin-videos consistency-check --full_fix true
```

---

## archive-blogger - 博主归档/黑名单管理

### 功能说明

将博主加入黑名单并归档：
- 添加到 blogger-blacklist.json
- 移动 results/{博主}/ 到 archived/{博主}/
- 从 bloggers.json 删除记录
- 从 videos.json 删除视频记录
- 记录归档日志

### 命令参数

| 参数 | 说明 |
|------|------|
| `--blacklist <博主>` | 加入黑名单并归档 |
| `<博主>` | 仅归档，不加入黑名单 |
| `--all-blacklisted` | 归档所有已在黑名单中的博主 |

### 使用示例

```bash
# 加入黑名单并归档（推荐）
node d:/opencli/douyin-videos/scripts/utils/archive-blogger.js --blacklist "博主名"

# 通过 sec_uid 加入黑名单
node d:/opencli/douyin-videos/scripts/utils/archive-blogger.js --blacklist "MS4wLjABAAAA..."

# 通过 author_id 加入黑名单
node d:/opencli/douyin-videos/scripts/utils/archive-blogger.js --blacklist "4432870892644766"

# 仅归档，不加入黑名单
node d:/opencli/douyin-videos/scripts/utils/archive-blogger.js "博主名"

# 归档所有已在黑名单中的博主
node d:/opencli/douyin-videos/scripts/utils/archive-blogger.js --all-blacklisted
```

---

## reset-bloggers - 重置博主采集状态

### 功能说明

重置博主的采集状态，使其可以被重新采集：
- 重置所有博主的 last_collect_date
- 重置 pipeline-state.json 的 stage2 状态

### 使用示例

```bash
# 重置所有博主状态
node d:/opencli/.opencli/clis/douyin-videos/reset-bloggers.cjs
```

---

## 工作流程

### 完整流程

```
stage1 (博主发现)
    ↓
stage2 (视频采集)
    ↓
stage4 (音频下载)
    ↓
stage4-transcribe-local (转录)
    ↓
content-cleaner (内容整理)
    ↓
distribute-cleaned.js (分发结果)
```

### 数据文件

| 文件 | 说明 |
|------|------|
| `data/search-keywords.json` | 搜索关键词列表 |
| `data/bloggers.json` | 已发现博主列表 |
| `data/videos.json` | 视频索引 |
| `data/blogger-blacklist.json` | 博主黑名单 |
| `results/{博主}/metadata.json` | 博主元数据 |
| `transcripts/{video_id}.txt` | 转录文本 |
| `audio/{video_id}.mp3` | 音频文件 |

---

## 注意事项

1. **Cookie 认证**：stage1、stage2、stage4 需要抖音登录 Cookie
2. **网络稳定性**：建议在网络稳定环境下运行
3. **磁盘空间**：音频文件会占用较多空间，定期清理
4. **GPU 加速**：whisper.cpp 支持 CUDA 加速，转录速度更快
5. **并发控制**：并发数过高可能导致 API 限流

---

## 相关链接

- [OpenCLI 使用指南](.trae/skills/opencli-usage/SKILL.md)
- [内容整理 Skill](.trae/skills/content-cleaner/SKILL.md)
- [博主优化 Skill](.trae/skills/blogger-optimizer/SKILL.md)
- [黑名单管理 Skill](.trae/skills/blacklist/SKILL.md)
