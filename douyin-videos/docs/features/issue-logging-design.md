# 问题记录功能设计文档

**版本**: 3.1
**创建日期**: 2026-04-11
**最后更新**: 2026-04-13
**状态**: 已实现，本次更新修复文档问题（逻辑混乱、信息冲突、内容遗漏、歧义内容）

---

## 一、功能概述

### 1.1 目的

通过手动执行检查命令，分析运行日志、文件状态、数据一致性，发现并记录系统问题，为优化智能体提供反馈，持续改进系统质量。

### 1.2 核心原则

- **手动执行检查**：用户主动执行检查命令，非自动触发
- **基于日志和文件分析**：检查运行日志、输出文件、数据文件来发现问题
- **只记录问题**：不记录业务优化结果，只记录运行问题、代码问题、数据流向问题、输出正确性问题
- **详细记录**：记录问题的完整上下文信息
- **状态跟踪**：跟踪问题的解决状态

### 1.3 执行方式

**执行目录**：在项目根目录 `d:\opencli\douyin-videos` 下执行

**命令**：

```bash
# 执行问题检查
npx tsx src/main.ts douyin-videos check-issues

# 可选参数
npx tsx src/main.ts douyin-videos check-issues --stage=stage3  # 只检查特定阶段
npx tsx src/main.ts douyin-videos check-issues --type=runtime  # 只检查特定类型
npx tsx src/main.ts douyin-videos check-issues --skip-code-check  # 跳过代码逻辑检查
```

### 1.4 问题类型

| 问题类型 | type 值 | 说明 |
|----------|---------|------|
| 运行问题 | `runtime_error` | 程序执行错误、异常、超时等运行时问题 |
| 代码问题 | `code_error` | 代码逻辑错误、边界条件处理不当、异常处理缺失 |
| 数据流向问题 | `data_flow_error` | 数据传递丢失、格式转换错误、字段缺失、文件损坏 |
| 输出正确性问题 | `output_error` | 输出结果格式错误、内容缺失、字段值异常 |

### 1.5 问题识别场景

> 说明：本节从识别场景角度描述问题，与1.4节的问题类型分类互补。

| 识别场景 | 问题类型 | 所属阶段 | 说明 |
|----------|----------|----------|------|
| **视频分析失败** | `runtime_error` | 阶段三 | 豆包分析视频失败、超时、网络问题 |
| **Whisper转录失败** | `runtime_error` | 阶段四 | 转录进程异常、内存不足、模型加载失败 |
| **音频下载失败** | `runtime_error` | 阶段四 | 音频URL无效、下载超时、FFmpeg提取失败 |
| **API调用失败** | `runtime_error` | 阶段一、二 | 抖音API返回错误码、请求超时、网络异常 |
| **字段读取异常** | `code_error` | 所有阶段 | 硬编码字段名不存在、动态字段识别失败 |
| **路径处理错误** | `code_error` | 所有阶段 | 文件路径拼接错误、目录不存在未处理 |
| **异常处理缺失** | `code_error` | 所有阶段 | try-catch 未覆盖、错误未正确传递 |
| **数据传递丢失** | `data_flow_error` | 阶段间 | 阶段一→阶段二博主数据不完整 |
| **状态文件错误** | `data_flow_error` | 所有阶段 | pipeline-state.json 未正确更新 |
| **JSON解析失败** | `data_flow_error` | 所有阶段 | 文件损坏、格式错误、编码问题 |
| **字段缺失** | `data_flow_error` | 所有阶段 | 必需字段不存在、默认值未设置 |
| **输出格式错误** | `output_error` | 阶段三、四 | 视频分析结果缺少必要字段 |
| **转录文本异常** | `output_error` | 阶段四 | 转录文本长度不足、不含中文、内容乱码 |
| **分析结果异常** | `output_error` | 阶段三、四 | 关键词为空、领域为空、总结缺失 |

---

## 二、数据结构

### 2.1 问题记录文件

**文件路径**: `d:\opencli\douyin-videos\optimization-feedback.json`

**数据结构**:

```json
{
  "version": "1.0",
  "updated_at": "2026-04-13T00:00:00.000Z",
  "issues": [
    {
      "id": "issue-001",
      "type": "runtime_error",
      "timestamp": "2026-04-13T10:00:00.000Z",
      "description": "阶段三视频分析超时",
      "details": {
        "stage": "stage3",
        "aweme_id": "7627121122303085876",
        "error_message": "豆包分析视频超时，等待时间超过300秒"
      },
      "resolved": false,
      "resolved_at": null,
      "resolution": null
    }
  ]
}
```

### 2.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 问题唯一标识，格式：issue-{序号} |
| `type` | string | ✅ | 问题类型，见问题类型表 |
| `timestamp` | string | ✅ | 创建时间，ISO 8601 格式 |
| `description` | string | ✅ | 问题描述 |
| `details` | object | ✅ | 问题相关数据 |
| `resolved` | boolean | ✅ | 是否已解决 |
| `resolved_at` | string | ❌ | 解决时间，ISO 8601 格式 |
| `resolution` | string | ❌ | 解决方式说明 |

### 2.3 问题类型详细说明

#### runtime_error（运行问题）

**触发条件**：程序执行错误、异常、超时等运行时问题

**details 字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `stage` | string | ✅ | 阶段：stage1 / stage2 / stage3 / stage4 |
| `error_type` | string | ✅ | 错误类型：timeout / network / process / api |
| `error_message` | string | ✅ | 错误信息 |
| `aweme_id` | string | ❌ | 视频ID（阶段三、四相关问题时可选） |
| `log_file` | string | ❌ | 日志文件路径（从日志检查时可选） |

**示例**：

```json
{
  "id": "issue-001",
  "type": "runtime_error",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "description": "阶段三视频分析超时",
  "details": {
    "stage": "stage3",
    "aweme_id": "7627121122303085876",
    "error_type": "timeout",
    "error_message": "豆包分析视频超时，等待时间超过300秒"
  },
  "resolved": false,
  "resolved_at": null,
  "resolution": null
}
```

---

#### code_error（代码问题）

**触发条件**：代码逻辑错误、边界条件处理不当、异常处理缺失

**details 字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `file` | string | 出问题的代码文件 |
| `line` | number | 行号（可选） |
| `error_type` | string | 错误类型：field_access / path_handling / exception_handling |
| `error_message` | string | 错误信息 |

**示例**：

```json
{
  "id": "issue-002",
  "type": "code_error",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "description": "字段读取异常：硬编码字段名不存在",
  "details": {
    "file": "scripts/stage3-video-analyze.js",
    "line": 156,
    "error_type": "field_access",
    "error_message": "无法读取 metadata.high_quality_count，字段不存在"
  },
  "resolved": false,
  "resolved_at": null,
  "resolution": null
}
```

---

#### data_flow_error（数据流向问题）

**触发条件**：数据传递丢失、格式转换错误、字段缺失、文件损坏

**details 字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `source_stage` | string | 数据来源阶段 |
| `target_stage` | string | 数据目标阶段 |
| `file_path` | string | 相关文件路径 |
| `error_type` | string | 错误类型：data_loss / format_error / field_missing / file_corrupted |
| `error_message` | string | 错误信息 |

**示例**：

```json
{
  "id": "issue-003",
  "type": "data_flow_error",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "description": "阶段一→阶段二数据传递丢失",
  "details": {
    "source_stage": "stage1",
    "target_stage": "stage2",
    "file_path": "data/bloggers.json",
    "error_type": "data_loss",
    "error_message": "bloggers.json 中有5个博主，但 stage2 只读取到3个"
  },
  "resolved": false,
  "resolved_at": null,
  "resolution": null
}
```

---

#### output_error（输出正确性问题）

**触发条件**：输出结果格式错误、内容缺失、字段值异常

**details 字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `stage` | string | 输出阶段 |
| `output_file` | string | 输出文件路径 |
| `error_type` | string | 错误类型：format_error / content_missing / value_invalid |
| `error_message` | string | 错误信息 |

**示例**：

```json
{
  "id": "issue-004",
  "type": "output_error",
  "timestamp": "2026-04-13T10:00:00.000Z",
  "description": "视频分析结果缺少必要字段",
  "details": {
    "stage": "stage3",
    "output_file": "results/胡说老王（干货版）_MS4wLjABAA/videos/7627121122303085876.json",
    "error_type": "content_missing",
    "error_message": "分析结果缺少 keywords 和 category 字段"
  },
  "resolved": false,
  "resolved_at": null,
  "resolution": null
}
```

---

## 三、工作流程

### 3.1 问题检查工作流程

```
用户执行检查命令
       ↓
步骤1：检查运行日志
  - 扫描 data/logs/ 目录下的失败日志文件
  - 解析日志中的错误信息
  - 提取阶段、错误类型、错误消息

步骤2：检查文件状态
  - 检查输出文件是否存在
  - 检查文件内容是否有效
  - 检查必需字段是否完整

步骤3：检查数据一致性
  - 检查阶段间数据传递是否完整
  - 检查状态文件是否正确更新
  - 检查数据与状态是否一致

步骤4：检查代码逻辑（可选）
  - 检查硬编码字段是否存在
  - 检查边界条件处理

步骤5：记录发现的问题
  - 创建问题记录
  - 写入 optimization-feedback.json
```

### 3.2 问题检查详细步骤

#### 步骤1：检查运行日志

**检查方式**：

| 检查项 | 数据来源 | 判断方法 |
|--------|----------|----------|
| **失败日志文件** | `data/logs/*.failed.log` | 扫描目录下所有 `.failed.log` 文件 |
| **错误类型** | 日志文件名/内容 | 解析文件名或日志内容中的错误类型 |
| **错误消息** | 日志内容 | 提取日志中的错误堆栈或错误消息 |
| **所属阶段** | 日志文件路径/内容 | 根据文件路径或内容判断所属阶段 |

**日志文件结构**：

```
data/logs/
├── stage1/
│   ├── search-2026-04-13.failed.log
│   └── search-2026-04-13.success.log
├── stage2/
│   ├── videos-2026-04-13.failed.log
│   └── videos-2026-04-13.success.log
├── stage3/
│   ├── analyze-2026-04-13.failed.log
│   └── analyze-2026-04-13.success.log
└── stage4/
    ├── transcription-2026-04-13.failed.log
    └── transcription-2026-04-13.success.log
```

**日志文件格式规范**：

`.failed.log` 文件应包含以下内容：

```
[时间戳] 错误类型: 错误消息
[时间戳] 错误堆栈信息
[时间戳] 相关上下文数据（JSON格式）
```

**示例**：

```
[2026-04-13T10:00:00.000Z] ERROR: 豆包分析视频超时
[2026-04-13T10:00:00.100Z] Error: Timeout waiting for response
    at Timeout._onTimeout (scripts/stage3-video-analyze.js:156:12)
    at listOnTimeout (internal/timers.js:557:17)
[2026-04-13T10:00:00.200Z] CONTEXT: {"aweme_id":"7627121122303085876","timeout":300000}
```

**解析规则**：

| 字段 | 解析方式 |
|------|----------|
| `error_type` | 从 `ERROR:` 行提取，或根据错误消息关键词推断（timeout/network/process/api） |
| `error_message` | 从 `ERROR:` 行提取错误消息部分 |
| `stage` | 从日志文件路径提取目录名（stage1/stage2/stage3/stage4） |
| `aweme_id` | 从 `CONTEXT:` 行的 JSON 数据中提取（如果存在） |

**检查代码示例**：

```javascript
async function checkRuntimeErrors() {
  const logsDir = 'data/logs';
  const issues = [];

  // 递归扫描所有 .failed.log 文件
  const failedLogs = await glob('**/*.failed.log', { cwd: logsDir });

  for (const logFile of failedLogs) {
    const stage = logFile.split('/')[0]; // stage1, stage2, etc.
    const content = await fs.readFile(path.join(logsDir, logFile), 'utf-8');
    
    // 解析错误信息
    const errorInfo = parseErrorLog(content);
    
    issues.push({
      type: 'runtime_error',
      description: `${stage} 执行失败`,
      details: {
        stage: stage,
        error_type: errorInfo.type, // timeout, network, process, api
        error_message: errorInfo.message,
        log_file: logFile
      }
    });
  }

  return issues;
}
```

#### 步骤2：检查文件状态

**检查方式**：

| 检查项 | 数据来源 | 判断方法 |
|--------|----------|----------|
| **文件存在性** | 输出目录 | `fs.existsSync()` 检查预期文件是否存在 |
| **文件有效性** | 文件大小 | `fs.statSync().size` 检查文件大小是否 > 0 |
| **JSON可解析性** | 文件内容 | 尝试 `JSON.parse()` 解析 |
| **字段完整性** | JSON内容 | 检查必需字段是否存在 |

**预期文件列表**：

| 阶段 | 预期文件 | 必需字段 |
|------|----------|----------|
| 阶段一 | `data/bloggers.json` | `sec_uid`, `nickname`, `signature` |
| 阶段二 | `data/videos.json` | `aweme_id`, `desc`, `author`, `author_sec_uid` |
| 阶段三 | `results/{博主}/videos/{aweme_id}.json` | `keywords`, `category`, `summary` |
| 阶段四 | `results/{博主}/transcripts/{aweme_id}.txt` | 转录文本内容 |

**检查代码示例**：

```javascript
async function checkOutputFiles() {
  const issues = [];

  // 检查阶段三输出
  const resultsDir = 'results';
  const bloggerDirs = await fs.readdir(resultsDir);

  for (const bloggerDir of bloggerDirs) {
    const videosDir = path.join(resultsDir, bloggerDir, 'videos');
    if (!fs.existsSync(videosDir)) continue;

    const videoFiles = await fs.readdir(videosDir);
    
    for (const videoFile of videoFiles) {
      const filePath = path.join(videosDir, videoFile);
      const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      // 检查必需字段
      const requiredFields = ['keywords', 'category', 'summary'];
      const missingFields = requiredFields.filter(f => !content[f]);
      
      if (missingFields.length > 0) {
        issues.push({
          type: 'output_error',
          description: '视频分析结果缺少必需字段',
          details: {
            stage: 'stage3',
            output_file: filePath,
            error_type: 'content_missing',
            error_message: `缺少字段: ${missingFields.join(', ')}`
          }
        });
      }
    }
  }

  return issues;
}
```

#### 步骤3：检查数据一致性

**检查方式**：

| 检查项 | 数据来源 | 判断方法 |
|--------|----------|----------|
| **数据数量一致性** | 阶段间数据文件 | 对比相邻阶段的数据数量 |
| **状态文件存在性** | `data/pipeline-state.json` | 检查文件是否存在 |
| **状态值正确性** | 状态文件内容 | 检查状态值是否符合预期 |
| **状态与数据一致性** | 状态 + 数据文件 | 检查状态标记与实际文件是否匹配 |

**一致性检查规则**：

| 检查项 | 数据来源A | 数据来源B | 一致性规则 |
|--------|-----------|-----------|------------|
| 博主数据传递 | `data/bloggers.json` | 阶段二处理记录 | 博主数量应一致 |
| 视频数据传递 | `data/videos.json` | 阶段三处理记录 | 视频数量应一致 |
| 状态标记 | `pipeline-state.json` | 输出文件 | completed 应对应文件存在 |

**检查代码示例**：

```javascript
async function checkDataConsistency() {
  const issues = [];

  // 检查博主数据传递
  const bloggers = JSON.parse(await fs.readFile('data/bloggers.json', 'utf-8'));
  const videos = JSON.parse(await fs.readFile('data/videos.json', 'utf-8'));
  
  // 统计阶段二处理的博主数
  const processedBloggers = new Set(videos.map(v => v.author_sec_uid));
  const missingBloggers = bloggers.filter(b => !processedBloggers.has(b.sec_uid));
  
  if (missingBloggers.length > 0) {
    issues.push({
      type: 'data_flow_error',
      description: '阶段一→阶段二博主数据传递丢失',
      details: {
        source_stage: 'stage1',
        target_stage: 'stage2',
        file_path: 'data/bloggers.json',
        error_type: 'data_loss',
        error_message: `${missingBloggers.length} 个博主未在阶段二处理`
      }
    });
  }

  // 检查状态文件
  const statePath = 'data/pipeline-state.json';
  if (!fs.existsSync(statePath)) {
    issues.push({
      type: 'data_flow_error',
      description: '状态文件不存在',
      details: {
        source_stage: 'pipeline',
        target_stage: 'pipeline',
        file_path: statePath,
        error_type: 'file_corrupted',
        error_message: 'pipeline-state.json 文件不存在'
      }
    });
  }

  return issues;
}
```

#### 步骤4：检查代码逻辑（可选）

**说明**：此步骤默认执行，用户可通过参数 `--skip-code-check` 跳过。

**检查方式**：

| 检查项 | 数据来源 | 判断方法 |
|--------|----------|----------|
| **硬编码字段** | 代码文件 + 数据文件 | 检查代码中硬编码的字段名是否存在于数据中 |
| **边界条件** | 代码文件 | 静态分析代码中的边界条件处理 |

**硬编码字段配置**：

硬编码字段列表存储在 `config/hardcoded-fields.json` 文件中：

```json
{
  "fields": [
    {
      "file": "scripts/stage1-blogger-discovery.js",
      "field": "metadata.high_quality_count",
      "data_source": "data/bloggers.json"
    },
    {
      "file": "scripts/stage2-video-collect.js",
      "field": "aweme_details.statistics.play_count",
      "data_source": "data/videos.json"
    }
  ]
}
```

**检查逻辑**：

1. 读取 `config/hardcoded-fields.json` 配置文件
2. 对于每个配置项：
   - 读取 `data_source` 指定的数据文件
   - 检查数据中是否存在 `field` 指定的字段路径
   - 如果字段不存在，记录问题

**检查代码示例**：

```javascript
async function checkCodeIssues() {
  const issues = [];

  // 检查硬编码字段是否存在
  const hardcodedFields = [
    { file: 'scripts/stage1-blogger-discovery.js', field: 'metadata.high_quality_count' },
    { file: 'scripts/stage2-video-collect.js', field: 'aweme_details.statistics.play_count' }
  ];

  for (const { file, field } of hardcodedFields) {
    // 检查数据文件中是否存在该字段
    const fieldExists = await checkFieldExistsInData(field);
    
    if (!fieldExists) {
      issues.push({
        type: 'code_error',
        description: '硬编码字段不存在',
        details: {
          file: file,
          error_type: 'field_access',
          error_message: `字段 ${field} 在数据中不存在`
        }
      });
    }
  }

  return issues;
}
```

#### 步骤5：记录发现的问题

**创建规则**：

1. 生成唯一ID：`issue-{当前最大序号+1}`
2. 确定问题类型：根据检查结果确定
3. 生成问题描述：简洁明了地描述问题
4. 收集问题数据：记录相关上下文信息到 `details` 字段
5. 记录时间戳：当前时间，ISO 8601 格式
6. 设置初始状态：`resolved: false`

**写入规则**：

1. 读取现有的 optimization-feedback.json
2. 检查是否已存在相同问题（见同一问题判断规则）
3. 如果是新问题，添加到 issues 数组
4. 如果是重复问题，更新 details 中的 occurrence_count 和 timestamp
5. 更新 updated_at 字段
6. 写回文件

---

## 四、边界条件

### 4.1 不记录问题的情况

**明确不记录的场景**：

| 场景 | 说明 | 判断依据 |
|------|------|----------|
| **无失败日志** | `data/logs/` 目录下无 `.failed.log` 文件 | 无运行问题 |
| **文件状态正常** | 所有预期文件存在且内容完整 | 无输出问题 |
| **数据一致性正常** | 阶段间数据传递完整、状态正确 | 无数据流向问题 |
| **业务优化结果** | 关键词优化、博主优化的验收结果 | 业务层面，非问题记录职责 |
| **预期内的跳过** | 如黑名单博主被跳过、已处理的视频被跳过 | 正常业务逻辑 |

**记录与不记录的边界示例**：

| 场景 | 是否记录 | 问题类型 | 原因 |
|------|----------|----------|------|
| 发现 `.failed.log` 文件 | ✅ 记录 | `runtime_error` | 运行问题 |
| 输出文件不存在 | ✅ 记录 | `output_error` | 输出正确性问题 |
| 输出文件字段缺失 | ✅ 记录 | `output_error` | 输出正确性问题 |
| 阶段间数据数量不一致 | ✅ 记录 | `data_flow_error` | 数据流向问题 |
| 状态文件不存在 | ✅ 记录 | `data_flow_error` | 数据流向问题 |
| 硬编码字段在数据中不存在 | ✅ 记录 | `code_error` | 代码问题 |
| 无失败日志且文件正常 | ❌ 不记录 | - | 无问题 |
| 业务优化验收未通过 | ❌ 不记录 | - | 业务层面，非问题记录职责 |
| 黑名单博主被跳过 | ❌ 不记录 | - | 正常业务逻辑 |

### 4.2 需要特殊处理的情况

| 边界条件 | 说明 | 处理方式 |
|----------|------|----------|
| **问题记录文件不存在** | optimization-feedback.json 不存在 | 创建新文件 |
| **问题记录文件损坏** | 文件格式错误 | 备份损坏文件，创建新文件 |
| **同一问题重复出现** | 相同问题多次出现 | 更新现有问题的 details 字段，增加 occurrence_count |

**同一问题判断规则**：
```
1. 比较问题类型（type）是否相同
2. 比较关键数据字段是否相同：
   - runtime_error: stage + error_type
   - code_error: file + error_type
   - data_flow_error: source_stage + target_stage + error_type
   - output_error: output_file + error_type
3. 如果都相同，判定为同一问题
4. 更新操作：
   - 在 details 中增加 occurrence_count 字段，记录出现次数
   - 更新 timestamp 为最新时间
```

### 4.3 异常处理

| 异常类型 | 处理方式 |
|----------|----------|
| **文件写入失败** | 记录到控制台，不中断流程 |
| **ID生成冲突** | 使用时间戳作为后缀 |
| **数据序列化失败** | 记录原始数据到控制台 |

---

## 五、验收标准

### 5.1 核心指标

| 指标 | 验收标准 | 说明 |
|------|----------|------|
| **问题记录完整性** | 所有异常都被记录 | 无遗漏的异常情况 |
| **数据格式正确性** | 符合JSON格式规范 | 可正常解析和读取 |
| **状态跟踪准确性** | 问题状态正确更新 | 状态转换符合规则 |

### 5.2 验收流程

```
步骤1：模拟异常场景
  - 模拟运行问题（超时、异常、进程崩溃）
  - 模拟代码问题（字段访问异常、路径错误）
  - 模拟数据流向问题（数据丢失、格式错误）
  - 模拟输出正确性问题（字段缺失、值异常）
  - 其他异常场景

步骤2：检查问题记录文件
  - 文件是否存在
  - 格式是否正确
  - 数据是否完整

步骤3：验证记录内容
  - 问题类型是否正确
  - details字段是否完整
  - 时间戳是否准确

步骤4：验证状态管理
  - 初始状态是否为 resolved: false
  - 状态转换是否正确

步骤5：判断是否通过验收
  - 如果所有指标达标，则通过
  - 如果有指标未达标，则继续优化
```

---

## 六、命令输出格式

### 6.1 控制台输出

执行 `check-issues` 命令后，控制台输出格式如下：

```
=== 问题检查报告 ===
检查时间: 2026-04-13T10:00:00.000Z

【运行问题】
  ✗ 阶段三视频分析超时 (stage3)
    - 错误类型: timeout
    - 错误消息: 豆包分析视频超时，等待时间超过300秒
    - 日志文件: data/logs/stage3/analyze-2026-04-13.failed.log

【输出正确性问题】
  ✗ 视频分析结果缺少必需字段 (stage3)
    - 输出文件: results/胡说老王（干货版）_MS4wLjABAA/videos/7627121122303085876.json
    - 缺少字段: keywords, category

【数据流向问题】
  ✗ 阶段一→阶段二博主数据传递丢失
    - 数据来源: stage1
    - 数据目标: stage2
    - 错误消息: 2 个博主未在阶段二处理

【代码问题】
  ✓ 未发现问题

=== 检查结果 ===
发现问题: 3 个
已记录到: optimization-feedback.json
```

### 6.2 输出文件

问题记录写入 `optimization-feedback.json` 文件，格式见"二、数据结构"章节。

---

## 七、问题解决流程

### 7.1 问题状态管理

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `resolved: false` | 未解决 | 问题首次记录时 |
| `resolved: true` | 已解决 | 用户手动标记解决 |

### 7.2 标记问题已解决

**命令**：

```bash
# 标记单个问题已解决
npx tsx src/main.ts douyin-videos resolve-issue --id=issue-001

# 标记所有问题已解决
npx tsx src/main.ts douyin-videos resolve-issue --all
```

**更新内容**：

1. 设置 `resolved: true`
2. 记录 `resolved_at` 时间戳
3. 记录 `resolution` 解决方式说明

### 7.3 解决方式说明

用户标记问题已解决时，需提供解决方式说明：

```bash
npx tsx src/main.ts douyin-videos resolve-issue --id=issue-001 --resolution="增加超时时间到600秒"
```

---

## 八、约束条件

### 8.1 数量约束

| 约束类型 | 数量 | 说明 |
|----------|------|------|
| **最大问题数量** | 1000个 | 超过后自动清理已解决的问题 |
| **问题ID长度** | ≤20字符 | 格式：issue-{序号} |

### 8.2 内容约束

| 约束类型 | 规则 | 说明 |
|----------|------|------|
| **问题描述长度** | ≤200字符 | 简洁明了 |
| **details字段大小** | ≤10KB | 避免文件过大 |

### 8.3 状态约束

| 状态 | 说明 | 允许的转换 |
|------|------|------------|
| `resolved: false` | 未解决 | → `resolved: true` |
| `resolved: true` | 已解决 | 无 |

---

## 九、实现计划

### 9.1 开发任务

| 任务 | 优先级 | 状态 | 依赖 |
|------|--------|------|------|
| 设计问题记录数据结构 | 高 | ✅ 已完成 | 无 |
| 实现问题检测逻辑 | 高 | ✅ 已完成 | 无 |
| 实现问题记录创建逻辑 | 高 | ✅ 已完成 | 无 |
| 实现问题记录写入逻辑 | 高 | ✅ 已完成 | 无 |
| 集成到现有流程 | 中 | ✅ 已完成 | 问题记录创建逻辑、写入逻辑 |

### 9.2 开发时间线

| 阶段 | 任务 | 状态 |
|------|------|------|
| **阶段一** | 实现问题检测逻辑 | ✅ 已完成 |
| **阶段二** | 实现问题记录创建和写入逻辑 | ✅ 已完成 |
| **阶段三** | 集成到现有流程 | ✅ 已完成 |

---

**文档结束**
