# content-cleaner 改造执行计划

> 创建日期：2026-04-21
> 架构文档：`d:\opencli\clis\douyin-videos\architecture.canvas`
> 问题清单：`d:\opencli\douyin-videos\docs\architecture\content-cleaner-review-issues.md`

---

## 一、已确认的架构决策

### 1. AI 输出两种格式

**accessible 时（7 字段）：**
```json
{
  "video_id": "...",
  "analyzed_at": "...",
  "quality": "accessible",
  "main_content": "整理后内容",
  "category": "领域",
  "summary": "博主风格",
  "keywords": ["k1","k2"]
}
```

**insufficient 时（4 字段，跳过整理）：**
```json
{
  "video_id": "...",
  "analyzed_at": "...",
  "quality": "insufficient",
  "reason": "whisper_cpp幻觉，内容不通顺"
}
```

### 2. reason 映射规则

| reason 关键词 | 分类文件夹 |
|---------------|-----------|
| 幻觉/乱码/不通顺 | whisper-hallucination |
| 碎片化/无主题 | content-fragmented |
| 无法映射 | content-fragmented（默认） |

> 音频短/转录失败属于 Stage 4 问题，不会出现在 content-cleaner 的 insufficient 中

### 3. 四脚本体系

| 脚本 | 时机 | 职责 | 调用者 |
|------|------|------|--------|
| validate-cleaned.js | 事前 | 验证输出 + 路由决策 | 你 |
| distribute-cleaned.js | 事中 | 分发 + 归档 + 更新状态 | validate |
| review-handler.js | 事中 | 移至审阅文件夹 + 更新状态 | validate |
| check-cleaned-standalone.js | 事后 | 验证数据一致性（批量，手动运行） | 人工 |

### 4. 数据流向

```
AI 输出 → validate-cleaned.js（唯一路由器）
  ├── accessible + 通过 → distribute-cleaned.js
  │     ├── 补充原始数据（url/author/author_id/title）
  │     ├── 分发 AI 产出（视频JSON/metadata/keywords）
  │     ├── 归档转录文件（transcript-archiver.js）
  │     └── 更新状态（quality/stage4_status/stage4_processed_at）
  ├── accessible + 失败 → 重置 stage4_status=transcribed
  ├── insufficient + reason → review-handler.js
  │     ├── 移至 transcripts/review/{类别}/（追加追溯信息）
  │     └── 更新状态（quality=insufficient/stage4_status/stage4_processed_at）
  └── insufficient + reason缺失 → 重置 stage4_status=transcribed
```

### 5. 状态字段

- **更新 3 个字段**：quality、stage4_status、stage4_processed_at
- **不更新 status**（由管道全局管理）
- **判断是否整理过**：stage4_status 是唯一权威来源（transcribed=待整理，cleaned=已整理）

### 6. 最终视频 JSON（6 必需 + 2 可选字段，无 topic）

```json
{
  "video_id": "← videos.json",
  "author": "← videos.json",
  "url": "← videos.json",
  "author_id": "← videos.json（优先）/ metadata.json（备选）",
  "title": "← videos.json（优先）/ metadata.json（备选）",
  "analyzed_at": "← 你",
  "quality": "← 你",
  "main_content": "← 你 主职责"
}
```

### 7. metadata.json 更新

- category：字符串，"、"连接去重追加（**需在 distribute-cleaned.js 中实现**）
- summary：字符串，"、"连接去重追加（已有）
- last_analyzed_at：覆盖更新（已有）
- 仅 quality=accessible 时更新

### 8. insufficient 转录文件处理

- 从 transcripts/{video_id}.txt 移动到 transcripts/review/{类别}/{video_id}.txt
- 文件头部追加追溯信息：
```
=== 元数据 ===
URL: https://douyin.com/video/xxx
博主: xxx
标题: xxx
原因: whisper_cpp幻觉，内容不通顺
转录长度: 47字符
=== 转录内容 ===
（原始转录文本...）
```

---

## 二、执行任务清单

### 任务1：修改 distribute-cleaned.js

**文件**：`d:\opencli\clis\douyin-videos\distribute-cleaned.js`
**备份**：`d:\opencli\douyin-videos\backups\distribute-cleaned.js.backup`

修改内容：
- [ ] 实现 category 去重追加到 metadata.json（同 summary 模式，"、"连接）
- [ ] 集成 transcript-archiver.js 归档调用（替换当前独立归档流程）
- [ ] 移除 status 字段更新（只更新 quality/stage4_status/stage4_processed_at）
- [ ] 移除 topic 字段处理
- [ ] 从 validate-cleaned.js 被调用模式运行（接收 AI 输出路径参数）

### 任务2：创建 validate-cleaned.js

**文件**：`d:\opencli\clis\douyin-videos\validate-cleaned.js`（新建）

功能：
- [ ] 前置检查：cleaned-results/ 文件数量=1，videos.json 中存在 video_id
- [ ] 基础字段验证：video_id/analyzed_at/quality
- [ ] accessible 时：整理字段完整 + main_content ≥ 300 + 压缩比检查
- [ ] insufficient 时：reason 非空
- [ ] 路由：通过→调用 distribute-cleaned.js；insufficient→调用 review-handler.js；失败→重置状态
- [ ] 重置状态：stage4_status=transcribed，删除临时文件

### 任务3：创建 review-handler.js

**文件**：`d:\opencli\clis\douyin-videos\review-handler.js`（新建）

功能：
- [ ] 根据 reason 关键词映射到分类文件夹
- [ ] 移动转录文件到 transcripts/review/{类别}/
- [ ] 文件头部追加追溯信息（URL/博主/标题/原因/长度）
- [ ] 更新 videos.json：quality=insufficient/stage4_status=cleaned/stage4_processed_at
- [ ] 删除 cleaned-results/ 临时文件
- [ ] 不创建视频 JSON，不更新 metadata/keywords

### 任务4：修改 check-cleaned-standalone.js

**文件**：`d:\opencli\clis\douyin-videos\check-cleaned-standalone.js`
**备份**：`d:\opencli\douyin-videos\backups\check-cleaned-standalone.js.backup`

修改内容：
- [ ] REQUIRED_FIELDS 从 9 个改为 6 必需 + 2 可选（移除 topic，author_id/title 降为可选）
- [ ] 移除 topic 长度检查
- [ ] 过滤条件更新：stage4_status=cleaned（不再依赖 status=processed）
- [ ] 验证失败时自动重置状态（重置 stage4_status=transcribed + 删除视频 JSON）
- [ ] 转录文件检查路径更新（archived/ 和 review/ 而非 transcripts/ 根目录）

### 任务5：修改 SKILL.md

**文件**：`d:\opencli\.trae\skills\content-cleaner\SKILL.md`
**备份**：`d:\opencli\douyin-videos\backups\SKILL.md.backup`

修改内容（按问题清单 F1-F6, C1-C5, O1-O5, D1-D4, L1-L3, A1-A5）：
- [ ] 删除 topic 字段
- [ ] AI 输出改为两种格式（accessible 7字段 / insufficient 4字段）
- [ ] summary 描述修正为"字符串，"、"连接去重追加"，删除 summaries[] 引用
- [ ] category 描述修正，标注脚本已实现写入
- [ ] 删除所有批量处理内容
- [ ] 工作流改为：AI输出→运行validate-cleaned.js→（自动路由）
- [ ] 状态更新简化为 3 字段（删除 status）
- [ ] insufficient 判断标准补充（去重后<100字符）
- [ ] 补充字段映射表（AI输出→脚本补充→最终JSON）
- [ ] 归档改为由 distribute-cleaned.js 集成调用
- [ ] 验证改为 validate-cleaned.js 事前验证
- [ ] 示例1更新（bloggers.json→metadata.json，删除topic）
- [ ] 博主目录名示例修正（10位sec_uid）
- [ ] 去重压缩比公式定义
- [ ] summary 语义明确化
- [ ] keywords 改为 3-5 个
- [ ] main_content 300字符适用条件补充
- [ ] 删除重复内容（验证检查项、压缩比阈值、禁止虚构原则）

---

## 三、验证清单

修改完成后需验证：
- [ ] distribute-cleaned.js：category 正确写入 metadata.json
- [ ] validate-cleaned.js：accessible 通过→分发，失败→重置；insufficient+reason→审阅，无reason→重置
- [ ] review-handler.js：转录文件正确移至 review/{类别}/，追溯信息完整
- [ ] check-cleaned-standalone.js：8 字段检查，无 topic
- [ ] SKILL.md：与 canvas 和代码一致
- [ ] 对比备份文件确认无遗漏
