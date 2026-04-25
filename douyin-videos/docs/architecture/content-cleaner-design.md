# 内容整理模块设计文档

## 一、模块概述

**职责**：整理 Stage 4 转录内容，输出与 Stage 3 相同格式

**文件路径**：`d:\opencli\.trae\skills\content-cleaner\SKILL.md`

**触发时机**：Stage 4 转录完成后

**当前状态**：✅ SKILL 已创建

---

## 二、运行方式对比

### 2.1 Stage 3 vs Stage 4 + ContentCleaner

| 项目       | Stage 3                              | Stage 4 + ContentCleaner |
| ---------- | ------------------------------------ | ------------------------ |
| **输入**   | 视频链接（豆包直接观看）              | 转录文本（Whisper 输出）  |
| **处理方式** | 豆包分析视频                         | **Skill 智能体直接处理**  |
| **提示词**  | 视频分析提示词                       | 转录内容整理提示词        |
| **输出**   | results/{博主}/videos/{video_id}.json | **相同**                 |

### 2.2 统一输出格式

无论通过哪个分支处理，最终输出完全一致：

```json
{
  "video_id": "7xxxxxxxxxxxxxx",
  "url": "https://www.douyin.com/video/7xxxxxxxxxxxxxx",
  "author": "博主名称",
  "author_id": "博主ID",
  "title": "视频标题",
  "analyzed_at": "2025-01-01T00:00:00.000Z",
  "quality": "accessible",
  "topic": "视频核心主题",
  "main_content": "整理后的完整内容"
}
```

---

## 三、Skill 触发条件

| 触发场景       | 条件                                  | 执行内容     |
| -------------- | ------------------------------------- | ------------ |
| **T1: 自动触发** | Stage 4 转录完成后                    | 优化 + 分析  |
| **T2: 手动请求** | 用户要求处理特定转录                  | 优化 + 分析  |
| **T3: 批量处理** | 多个转录文件待处理                    | 按队列逐个处理 |

---

## 四、输入数据结构

### 4.1 输入源

| 来源     | 文件路径                         | 内容                                        |
| -------- | -------------------------------- | ------------------------------------------- |
| 转录文本 | `transcripts/{video_id}.txt`     | Whisper 转录的原始文本                      |
| 视频元数据 | `videos.json`                    | aweme_id, author, author_id, title, url     |
| 博主元数据 | `bloggers.json`                  | sec_uid, categories_history                 |

### 4.2 输入数据格式

```json
{
  "aweme_id": "7xxxxxxxxxxxxxx",
  "transcript_path": "transcripts/7xxxxxxxxxxxxxx.txt",
  "transcript_text": "原始转录文本内容...",
  "video_meta": {
    "url": "https://www.douyin.com/video/7xxxxxxxxxxxxxx",
    "author": "博主名称",
    "author_id": "博主ID",
    "title": "视频标题"
  }
}
```

---

## 五、输出数据结构

### 5.1 输出格式（提示词要求）

```json
{
  "quality": "accessible",
  "topic": "用一句话精准概括视频核心主题（15-30字）",
  "main_content": "整理后的完整可读文本。要求：逻辑严密，保留博主语气，修正错别字，不包含换行符",
  "category": "内容所属领域（如：短视频运营、电商创业、职场技能等）",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "summary": "博主风格与人设定位总结（如：毒舌实战派、亲和力教学型）"
}
```

### 5.2 数据存储位置（与 Stage 3 完全一致）

| 字段                                       | 存储位置                              | 说明                 |
| ------------------------------------------ | ------------------------------------- | -------------------- |
| video_id, url, author, title, topic, main_content | `results/{博主}/videos/{video_id}.json` | 视频分析结果         |
| category                                   | `bloggers.json` → categories_history  | 博主领域标签（去重追加） |
| summary                                    | `bloggers.json` → summaries           | 博主风格总结（去重追加） |
| keywords                                   | `discovered-keywords.json`            | 关键词列表（去重追加）   |
| status                                     | `videos.json` → status                | 更新为 `processed`    |

### 5.3 videos.json 状态流转

```
Stage 3 标记 inaccessible
        ↓
Stage 4 转录完成 → stage4_status: transcribed
        ↓
ContentCleaner 整理完成 → status: processed, quality: accessible
```

---

## 六、处理流程

### 6.1 流程图

```
┌─────────────────────────────────────────────────────────────┐
│                     开始                                     │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  步骤1: 读取输入                                           │
│  - 读取 transcripts/{video_id}.txt                        │
│  - 从 videos.json 获取视频元数据                           │
│  - 从 bloggers.json 获取博主信息                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  步骤2: 文本优化                                           │
│  - 语义纠错：修正同音错别字                                 │
│  - 去噪精简：剔除语气词、重复表达                           │
│  - 逻辑重组：整理为连贯文本                                 │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  步骤3: 内容分析                                           │
│  - 提取 topic（核心主题）                                  │
│  - 提取 keywords（5个关键词）                              │
│  - 判断 category（领域分类）                               │
│  - 生成 summary（博主风格总结）                            │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  步骤4: 保存结果                                           │
│  - 写入 results/{博主}/videos/{video_id}.json              │
│  - 更新 bloggers.json (category, summary)                  │
│  - 更新 discovered-keywords.json                           │
│  - 更新 videos.json (status: processed)                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      结束                                   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 文本优化规则

| 规则     | 说明                                       | 示例                           |
| -------- | ------------------------------------------ | ------------------------------ |
| 语义纠错 | 修正同音错别字、行业黑话                   | "公种号" → "公众号"            |
| 去噪精简 | 剔除"呃"、"那个"、"然后"等语气词          | 删除冗余语气词                 |
| 逻辑重组 | 将零散口语整理为书面化连贯文本             | 合并重复表达，保留博主语气     |

### 6.3 约束条件

| 约束               | 要求                   | 说明                     |
| ------------------ | ---------------------- | ------------------------ |
| 严禁幻觉           | 禁止虚构事实           | 只整理已有内容           |
| 格式规范           | 禁止字符串内换行符     | 使用空格或标点替代       |
| 字段缺失处理       | 填入 "未提及" 或 []    | 保持输出完整性           |

---

## 七、提示词路径

**转录内容整理提示词**：`d:\opencli\douyin-videos\docs\prompts\转录内容整理提示词.md`

---

## 八、当前状态

### 8.1 已实现

- ✅ 设计文档
- ✅ 提示词文档

### 8.2 待实现

- ⏳ `SKILL.md` 文件创建
- ⏳ 与 Stage 4 集成（在转录完成后触发）

---

## 九、数据链路

```
Stage 3
    │
    ├── 视频可见 → 豆包分析 → results/{博主}/videos/{video_id}.json
    │
    └── 视频不可见 → 标记 inaccessible
                            ↓
                       Stage 4
                            │
                            ├── 下载音频
                            │
                            ├── Whisper 转录 → transcripts/{video_id}.txt
                            │
                            ▼
                       ContentCleaner (Skill)
                            │
                            ├── 读取转录文本
                            │
                            ├── 智能体按 SKILL 规范处理
                            │
                            ▼
                       results/{博主}/videos/{video_id}.json
                       （与 Stage 3 输出格式完全一致）
```

---

## 十、集成方式

### 10.1 Stage 4 触发 Skill

在 `stage4-fallback-process.js` 转录完成后，提示用户调用 Skill：

```javascript
// 在转录成功后
if (transcribeResult.success) {
  console.log(`\n✅ 转录完成: ${transcribeResult.transcriptPath}`);
  console.log(`📝 请运行 ContentCleaner Skill 整理内容`);
  console.log(`   命令: 整理转录 ${video.aweme_id}`);
  
  updateVideoStage4Status(dataDir, video.aweme_id, 'transcribed', {
    transcript_path: transcribeResult.transcriptPath,
    transcript_length: transcriptText.length,
  });
}
```

### 10.2 用户手动触发

用户输入以下命令触发 Skill：

```
整理转录 7123456789012345678
```

或批量处理：

```
整理所有待处理转录
```

---

## 十一、相关文档

- [[stage3-modification-design]] - Stage 3 设计文档
- [[../prompts/转录内容整理提示词]] - 转录提示词
- [[transcript-processor]] - 类似 Skill 参考
