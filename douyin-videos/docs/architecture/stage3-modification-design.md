# Stage 3 设计文档

## 一、模块概述

**职责**：读取 `videos.json`，调用豆包分析视频，输出分析结果

**执行命令**：`opencli douyin-videos stage3`

**触发时机**：Stage 2 完成后

**提示词路径**：`clis/douyin-videos/_shared/prompts/video-analysis.txt`

***

## 二、数据流设计

### 2.1 整体数据链路

```
输入：videos.json (status: pending)
    │
    ▼
豆包分析（三步提示词）
    │
    ├── Step 1：状态准入（Gatekeeper）
    │       │
    │       └── 不可访问 → videos.json (status: inaccessible)
    │                    跳过后续处理，不写 results JSON 文件，转录模块无需转录
    │
    ├── Step 2：内容充分性判断
    │       │
    │       └── 内容不充分 → videos.json (status: insufficient)
    │                       跳过后续处理，不写 results JSON 文件，转录模块无需转录
    │
    ├── Step 3：文案整理
    │       │
    │       └── 输出 topic, main_content, category, keywords, summary
    │
    ▼
字段映射处理
    │
    ├── topic, main_content → results/{blogger}/videos/{aweme_id}.json
    │
    ├── category → bloggers.json (categories_history 去重追加)
    │
    ├── keywords → discovered-keywords.json (去重追加)
    │
    ├── summary → bloggers.json (去重追加到 summaries，合并更新 summary)
    │
    ├── last_analyzed_at → bloggers.json (更新博主最后分析时间)
    │
    └── videos.json (status: processed)
```

### 2.2 输入输出状态

| 输入状态    | 视频可访问 | 内容充分 | 分析过程 | 输出状态         |
| ------- | ----- | ---- | ---- | ------------ |
| pending | 是     | 是    | 成功   | processed    |
| pending | 否     | -    | -    | inaccessible |
| pending | 是     | 否    | -    | insufficient |
| pending | -     | -    | 失败   | failed       |

> **说明**：
>
> - `inaccessible`：视频本身不可访问（已删除、链接失效、需要权限等），转录模块需转录。
> - `insufficient`：视频可访问但内容不充分（纯音乐、语音过短、语言无法识别等），转录模块无需转录。
> - `failed`：分析过程出错（超时、JSON解析失败等），可手动重试。

***

## 三、三步设计

详细提示词见：`clis/douyin-videos/_shared/prompts/video-analysis.txt`

### 3.1 Step 1：状态准入（Gatekeeper）

**职责**：检查视频是否可以正常访问

**判断条件**（任一即触发）：

- 视频链接失效、已删除或需要权限
- 页面无法正常加载
- 内容为空或纯乱码

**输出格式**：

```json
{
  "quality": "inaccessible",
  "reason": "视频已删除或需要权限访问"
}
```

### 3.2 Step 2：内容充分性判断

**职责**：检查视频内容是否足以进行文案整理

**判断条件**（任一即触发）：

- 无有效语音内容（纯音乐、纯舞蹈、纯画面展示）
- 语音内容极短（5秒以内）
- 语音语言无法识别（方言无法转写、外语不在支持范围）

**输出格式**：

```json
{
  "quality": "insufficient",
  "reason": "视频无有效语音内容"
}
```

> **说明**：`insufficient` 状态的视频可访问但无需转录，转录模块应跳过此类视频。

### 3.3 Step 3：文案整理

**职责**：整理视频文案

**输出字段**：`topic`, `main_content`, `category`, `keywords`, `summary`

详细格式见：`clis/douyin-videos/_shared/prompts/video-analysis.txt`

***

## 四、数据映射关系

### 4.1 字段映射表

| 提示词输出字段                 | 存储位置                                      | 处理逻辑                                          |
| ----------------------- | ----------------------------------------- | --------------------------------------------- |
| quality: "inaccessible" | videos.json                               | status: "inaccessible"，不写 results JSON，转录模块跳过 |
| quality: "insufficient" | videos.json                               | status: "insufficient"，不写 results JSON，转录模块跳过 |
| 包含 topic 字段（Step 3 输出）  | videos.json                               | status: "processed"                           |
| topic                   | results/{blogger}/videos/{aweme\_id}.json | 直接存储                                          |
| main\_content           | results/{blogger}/videos/{aweme\_id}.json | 直接存储                                          |
| category                | bloggers.json                             | 去重后追加到 categories\_history                    |
| keywords                | discovered-keywords.json                  | 去重后追加                                         |
| summary                 | bloggers.json                             | 去重后追加到 summaries，合并更新 summary                 |
| (隐含)                    | bloggers.json                             | 更新 last\_analyzed\_at                         |

### 4.2 阶段判断逻辑

```javascript
function routeResponse(jsonData) {
  if (jsonData.quality === "inaccessible") {
    return { stage: 1, action: "markInaccessible" };
  }
  if (jsonData.quality === "insufficient") {
    return { stage: 2, action: "markInsufficient" };
  }
  if (jsonData.topic !== undefined) {
    return { stage: 3, action: "processContent" };
  }
  return { stage: "unknown", action: "handleError" };
}
```

### 4.3 去重逻辑

```javascript
// keywords 去重
function addKeywords(newKeywords) {
  const existing = discoveredKeywords.keywords.map(k => k.keyword);
  for (const keyword of newKeywords) {
    if (!existing.includes(keyword)) {
      discoveredKeywords.keywords.push({
        keyword,
        source: "video_analysis",
        discovered_at: new Date().toISOString(),
        status: "pending"
      });
    }
  }
}

// category 去重
function addCategory(authorId, newCategory) {
  const blogger = bloggers.find(b => b.author_id === authorId);
  if (blogger) {
    if (!blogger.categories_history) {
      blogger.categories_history = [];
    }
    if (!blogger.categories_history.includes(newCategory)) {
      blogger.categories_history.push(newCategory);
    }
  }
}

// summary 去重追加
function addSummary(authorId, newSummary) {
  const blogger = bloggers.find(b => b.author_id === authorId);
  if (blogger) {
    if (!blogger.summaries) {
      blogger.summaries = [];
    }
    if (!blogger.summaries.includes(newSummary)) {
      blogger.summaries.push(newSummary);
    }
    blogger.summary = blogger.summaries.join("、");
  }
}
```

### 4.4 bloggers.json 批量读写机制

为避免每个视频都完整读写 `bloggers.json`，采用脏标记（dirty flag）批量写入策略：

```javascript
// 循环开始前加载一次
const bloggersRef = loadBloggersData(); // { data: [...], dirty: false }

// 每个视频处理时修改内存数据，标记 dirty
// updateBloggerMetadata() 内部：bloggersRef.dirty = true

// 循环结束后统一写回
saveBloggersDataIfDirty(bloggersRef);
```

### 4.5 异常处理

| 异常类型              | 处理方式                   | 代码实现                      |
| ----------------- | ---------------------- | ------------------------- |
| 豆包分析超时            | 重试 3 次，间隔 5-10 秒       | `analyzeVideoWithRetry()` |
| JSON 格式错误         | 自动修复（仅对已知字段名补引号、去尾逗号等） | `validateAndFixJson()`    |
| 单视频分析失败           | 标记 failed，记录日志，继续下一个   | `recordFailedAnalysis()`  |
| 验证码拦截             | 等待用户手动完成，超时抛出异常        | `checkDoubaoCaptcha()`    |
| 豆包未登录             | 阻断执行，提示用户登录            | `checkDoubaoBrowser()`    |
| JSON 解析失败（修复后仍无效） | 标记为 failed，写入失败日志      | `recordFailedAnalysis()`  |

> **重要**：三种不可处理状态严格区分：
>
> - `inaccessible`：视频不可访问，转录模块无需转录。
> - `insufficient`：视频可访问但内容不充分，转录模块无需转录。
> - `failed`：分析过程出错，可手动重试。

***

## 五、存储结构

### 5.1 videos.json 状态更新

**不可访问状态：**

```json
{
  "aweme_id": "7440126446787415330",
  "status": "inaccessible"
}
```

**内容不充分状态：**

```json
{
  "aweme_id": "7440126446787415330",
  "status": "insufficient"
}
```

**分析失败状态：**

```json
{
  "aweme_id": "7440126446787415330",
  "status": "failed",
  "fail_reason": "分析超时 (300000ms)"
}
```

**处理完成状态：**

```json
{
  "aweme_id": "7440126446787415330",
  "status": "processed"
}
```

### 5.2 results/{blogger}/videos/{aweme\_id}.json 存储

> **说明**：仅当视频可访问且内容充分时才生成此文件。不可访问（inaccessible）、内容不充分（insufficient）和分析失败（failed）的视频不写 results JSON 文件，仅更新 videos.json 状态。

```json
{
  "video_id": "7440126446787415330",
  "url": "https://www.douyin.com/video/7440126446787415330",
  "author": "-起航ˢᵗᵃʳᵗ",
  "author_id": "715119643602425",
  "title": "视频标题",
  "analyzed_at": "2026-04-16T00:00:00.000Z",
  "quality": "accessible",
  "topic": "视频核心主题",
  "main_content": "整理后的完整可读文本"
}
```

### 5.3 bloggers.json 更新

```json
{
  "sec_uid": "MS4wLjABAAAAv_vCJtcdsHgP5jMHV3jpJoE3nC6c-MtCKBgUtalMOJQ",
  "name": "-起航ˢᵗᵃʳᵗ",
  "author_id": "715119643602425",
  "url": "https://www.douyin.com/user/...",
  "summary": "毒舌实战派、亲和力教学型",
  "summaries": ["毒舌实战派", "亲和力教学型"],
  "categories_history": ["短视频运营", "电商创业"],
  "last_analyzed_at": "2026-04-16T00:00:00.000Z"
}
```

### 5.4 discovered-keywords.json 更新

```json
{
  "keywords": [
    {
      "keyword": "口播账号",
      "source": "video_analysis",
      "discovered_at": "2026-04-16T00:00:00.000Z",
      "status": "pending"
    }
  ]
}
```

***

## 六、后续模块说明

### 6.1 可见分支后续流程

```
Stage 3 输出 results/{blogger}/videos/{aweme_id}.json
    │
    ▼
质量判断模块 (QualityGate) - 待实现
    │
    ▼
对应质量提取模块 - 待实现
    │
    ▼
统一输出层 (OutputFormatter) - 待实现
```

### 6.2 不可访问分支后续流程

```
Stage 3 更新 videos.json (status: inaccessible)
    │
    ▼
转录模块跳过（无需转录）
```

### 6.3 内容不充分分支后续流程

```
Stage 3 更新 videos.json (status: insufficient)
    │
    ▼
转录模块跳过（无需转录）
```

### 6.4 分析失败分支后续流程

```
Stage 3 更新 videos.json (status: failed)
    │
    ▼
可手动重试：将 status 改回 pending 后重新执行 stage3
```

***

## 七、当前状态

### 7.1 已实现

- ✅ 读取 `videos.json`
- ✅ 调用豆包分析（三步提示词）
- ✅ 保存结果到 `results/{blogger}/videos/{aweme_id}.json`（仅可访问且内容充分的视频）
- ✅ 更新 `videos.json` 状态（processed / inaccessible / insufficient / failed）
- ✅ 字段映射（category → bloggers.json、keywords → discovered-keywords.json、summary → bloggers.json、last\_analyzed\_at → bloggers.json）
- ✅ bloggers.json 批量读写优化（脏标记机制）
- ✅ 异常处理（重试、JSON修复、失败日志、状态区分）
- ✅ KeepAlive 优化（500ms 间隔 + try-catch 异常隔离）
- ✅ JSON 修复正则安全性（仅对已知字段名加引号）

### 7.2 待实现

- ⏳ 质量判断模块 (QualityGate)
- ⏳ 统一输出层 (OutputFormatter)

***

## 八、测试要点

### 8.1 集成测试

```bash
node clis/douyin-videos/stage3-video-analyze.js --max_videos=1 --dry_run=true
```

***

## 九、相关文档

- `clis/douyin-videos/_shared/prompts/video-analysis.txt` - 豆包提示词（三步）
- \[\[content-cleaner-design.md]] - 内容整理模块设计
- \[\[quality-gate-design.md]] - 质量判断模块设计
- \[\[output-formatter-design.md]] - 统一输出层设计
- \[\[../plans/test-plan.md]] - 测试方案
- \[\[../plans/rollback-plan.md]] - 回滚方案

