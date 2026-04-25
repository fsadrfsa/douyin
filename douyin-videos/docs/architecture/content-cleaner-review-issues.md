# content-cleaner Skill 审查问题清单

> 审查日期：2026-04-21
> 审查对象：`.trae/skills/content-cleaner/SKILL.md`
> 交叉验证：`distribute-cleaned.js`、`check-cleaned-standalone.js`、`transcript-archiver.js`

---

## 一、确认的数据流向

### 1.1 AI 产出字段（主职责 + 副职责）

```
AI 输出 (cleaned-results/{video_id}.json)
│
├── 【主职责】
│   └── main_content ────→ 视频 JSON (main_content)
│
├── 【副职责】（下游"内容分析"节点可能接管）
│   ├── keywords[] ──────→ discovered-keywords.json (去重追加)
│   ├── category ────────→ metadata.json (去重追加，需实现)
│   └── summary ─────────→ metadata.json (summary 字符串，"、"连接去重追加)
│
└── 【状态更新】
    └── quality ──────────→ videos.json (status/quality/stage4_status)
```

### 1.2 脚本从其他地方提取（AI 不产出）

```
videos.json + metadata.json
│
├── video_id ────────────← videos.json (aweme_id)
├── url ─────────────────← videos.json (aweme_id → url)
├── author ──────────────← videos.json (author)
├── author_id ───────────← metadata.json (videos[].author_id) 或 videos.json
├── title ───────────────← metadata.json (videos[].title)（原始Douyin标题）
└── analyzed_at ─────────← AI 输出（时间戳）
```

### 1.3 最终视频 JSON 字段（8 个，删除 topic 后）

```json
{
  "video_id": "...",
  "url": "...",
  "author": "...",
  "author_id": "...",
  "title": "...",
  "analyzed_at": "...",
  "quality": "accessible",
  "main_content": "..."
}
```

### 1.4 metadata.json 被更新的字段

| 字段 | 写入方式 | 代码位置 | 状态 |
|------|----------|----------|------|
| `summary` | 字符串，"、"连接去重追加 | distribute-cleaned.js L149-165 | ✅ 已实现 |
| `category` | 去重追加（同 summary 模式） | — | ❌ 需实现 |
| `last_analyzed_at` | 覆盖为 analyzed_at | distribute-cleaned.js L181 | ✅ 已实现 |
| `videos[].status` | pending → processed | distribute-cleaned.js L172-176 | ✅ 已实现 |

---

## 二、已确认的决策

| 编号 | 决策 | 影响的问题 |
|------|------|------------|
| D-1 | **删除 topic 字段**：AI 不生成 topic，视频标题用原始 Douyin 标题 | F1部分、C4部分、check-cleaned-standalone.js 需更新 |
| D-2 | **category 保留并实现写入**：和 summary 一样去重追加到 metadata.json | F1、L3、C4、C5 |
| D-3 | **summary 是字符串**：用"、"连接去重追加，不存在 summaries[] 数组 | F2 |
| D-4 | **无批量整理**：删除所有批量处理相关内容 | C1、L2 |
| D-5 | **副职责待评估**：keywords/category/summary 可能移至下游"内容分析"节点 | 整体架构 |

---

## 三、问题清单

### 🔴 严重：事实性错误（文档与代码不一致）

| 编号 | 位置 | 问题描述 | 代码实际 | 修改建议 |
|------|------|----------|----------|----------|
| F1 | 步骤2.3 + 步骤3.1 + 脚本分发表 | category 输出到 `categories_history` | 脚本不处理 category | 在 distribute-cleaned.js 中实现 category 去重追加（同 summary 模式） |
| F2 | 步骤2.3 提取字段表 | summary 输出到 `summaries[]（去重追加）+ summary（join）` | 代码追加到 `metadata.summary` 字符串（"、"连接），无 summaries[] | 修正为：`metadata.json → summary（字符串，"、"连接去重追加）` |
| F3 | 步骤3.2 脚本输出示例 | `+ 添加分类: AI工具教程`、`+ 添加摘要: ...` | 代码无分类输出；摘要输出为 `+ 设置博主风格:` | 按代码实际输出更新示例，并补充分类输出 |
| F4 | 示例1 | `✅ 博主数据已更新: bloggers.json (categories_history + summary)` | 代码更新 metadata.json，不是 bloggers.json | 更新为 `✅ 博主数据已更新: metadata.json (category + summary)` |
| F5 | 输入输出规范 > 博主目录名示例 | `短视频运营老王_MS4wLjABAAA`（sec_uid 前10位） | `MS4wLjABAAA` 有 11 个字符，代码取前 10 位 | 修正为 `短视频运营老王_MS4wLjABAA` |
| F6 | 转录文件归档规则 | "分发脚本执行成功后立即归档" | distribute-cleaned.js 不调用 transcript-archiver.js | 明确归档为独立步骤，需 AI 单独调用 |

### 🔴 严重：信息冲突

| 编号 | 位置A | 位置B | 冲突描述 | 修改建议 |
|------|-------|-------|----------|----------|
| C1 | 步骤3.2 "何时运行脚本"：批量整理完成→统一运行 | 批量处理规范 | 策略互斥 | ✅ 已确认：删除批量相关内容 |
| C2 | 约束条件：topic/category/summary 填"未提及" | 步骤2.3：category/summary "未提及"时跳过 | 应填"未提及"还是跳过？ | 统一为：AI 输出中始终包含，脚本侧决定是否跳过写入 |
| C3 | 单文件处理流程图（5步） | 工作流程章节（3步） | 流程图含验证和归档，3步工作流未涵盖 | 扩展工作流或合并流程图 |
| C4 | 验证检查项 + 步骤3.2验证表 | 代码实际 | 引用 `categories_history` 和 `summaries`，不存在 | 更新为 `category 和 summary 包含新内容` |
| C5 | 验收标准 > 核心指标 | 代码实际 | `metadata.json 有 categories_history/summaries` 不存在 | 更新为 `metadata.json 有 category/summary` |

### 🟡 中等：内容遗漏

| 编号 | 位置 | 遗漏描述 | 修改建议 |
|------|------|----------|----------|
| O1 | 步骤1 + 边界条件 | insufficient 视频需更新 videos.json，无脚本支持 | 在 distribute-cleaned.js 中增加 insufficient 处理逻辑 |
| O2 | 转录文件归档规则 | 仅提供 import 语法，AI 无法直接运行 | 补充 CLI 调用命令或在 distribute-cleaned.js 中集成归档 |
| O3 | 步骤1 质量判断 | insufficient 判断标准缺失 | 补充具体标准 |
| O4 | 重处理机制 | 重处理时转录文件已归档，未说明如何定位 | 补充：在 `transcripts/archived/` 下搜索 |
| O5 | 步骤2.3 + 步骤3.1 | AI 输出→脚本补充→最终 JSON 映射未文档化 | 添加字段映射表 |

### 🟢 轻微：内容重复

| 编号 | 出现位置 | 重复内容 | 修改建议 |
|------|----------|----------|----------|
| D1 | 步骤1 + 批量处理规范 | "必须使用 Read 工具直接读取转录文件" | 保留步骤1详细说明，其他位置简化引用 |
| D2 | 执行原则 + 步骤3.2 + 自动化验收 | 验证检查项三处重复 | 合并为一处权威定义 |
| D3 | 约束条件 + 问题记录 + 检查结果 + 重处理 + 异常处理 | 压缩比阈值重复5次 | 约束条件中定义一次，其他引用 |
| D4 | 核心原则 + 约束条件 | "禁止虚构"原则重复 | 核心原则保留完整版，约束条件简化引用 |

### 🟡 中等：逻辑混乱

| 编号 | 位置 | 问题描述 | 修改建议 |
|------|------|----------|----------|
| L1 | 主工作流 | 未包含归档步骤，但验证检查项将归档列为必须项 | 将归档明确作为步骤4 |
| L2 | 批量处理规范 | 批量/单文件运行策略矛盾 | ✅ 已确认：删除批量相关内容 |
| L3 | category 字段 | AI 被要求输出但脚本不处理 | ✅ 已确认：在脚本中实现写入 |

### 🟡 中等：歧义内容

| 编号 | 位置 | 歧义描述 | 修改建议 |
|------|------|----------|----------|
| A1 | 步骤2.3 | "去重压缩比应 ≥ 0.3" 未定义公式 | 明确：`去重压缩比 = main_content长度 / 转录文本去重后长度` |
| A2 | 步骤2.3 | summary "博主风格与人设定位" | 明确为"该视频内容体现的博主风格特征" |
| A3 | 步骤2.3 | "5个关键词，不足5个用次相关补齐" | 改为"3-5个关键词，不足时不强行补齐" |
| A4 | 边界条件 | "内容过于碎片化"无量化标准 | 补充示例标准 |
| A5 | 步骤2.3 | main_content 最低 300 字符适用条件不明 | 补充"当原始转录去重后长度 ≥ 300 字符时适用" |

---

## 四、待确认事项

| 编号 | 事项 | 说明 |
|------|------|------|
| P1 | **副职责去留评估** | keywords/category/summary 可能移至下游"内容分析"节点，需评估是否保留在 content-cleaner |
| P2 | **insufficient 判断标准** | 需用户定义具体标准（字数阈值、信息密度等） |
| P3 | **topic 删除后的连锁影响** | check-cleaned-standalone.js 的 REQUIRED_FIELDS 包含 topic，需同步更新 |

---

## 五、问题统计

| 类型 | 数量 | 严重程度 |
|------|------|----------|
| 事实性错误 | 6 | 🔴 严重 |
| 信息冲突 | 5 | 🔴 严重 |
| 内容遗漏 | 5 | 🟡 中等 |
| 内容重复 | 4 | 🟢 轻微 |
| 逻辑混乱 | 3 | 🟡 中等 |
| 歧义内容 | 5 | 🟡 中等 |
| **合计** | **28** | — |
