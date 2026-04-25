# 脚本目录说明

本目录包含抖音视频分析项目的所有脚本文件，按功能分类组织。

## 目录结构

```
scripts/
├── core/          # 核心流程脚本
├── migration/     # 数据迁移脚本（一次性使用）
├── test/          # 测试脚本
└── utils/         # 工具脚本
```

---

## core/ - 核心流程脚本

| 脚本 | 用途 | 使用场景 |
|------|------|---------|
| `test-full-flow.cjs` | 完整流程测试 | 测试四阶段完整流程 |
| `test-full-dataflow.cjs` | 完整数据流测试 | 测试数据在各阶段间的流转 |
| `simulate-stage3.cjs` | 阶段三模拟 | 模拟内容分析阶段 |

**使用方法**：
```bash
node scripts/core/test-full-flow.cjs
```

---

## migration/ - 数据迁移脚本

> **注意**：这些脚本通常只需运行一次，用于数据格式迁移或修复。

| 脚本 | 用途 | 使用场景 |
|------|------|---------|
| `migrate-to-json.cjs` | 迁移到 JSON 格式 | 将 Markdown 博主文件迁移到 JSON |
| `migrate-bloggers-to-json.cjs` | 博主数据迁移 | 博主数据格式转换 |
| `fix-results-format.cjs` | 修复结果格式 | 修复分析结果文件格式 |
| `fix-data-consistency.cjs` | 修复数据一致性 | 修复数据不一致问题 |
| `fix-blogger-format.cjs` | 修复博主格式 | 修复博主文件格式 |
| `sync-video-records.cjs` | 同步视频记录 | 同步视频记录到博主文件 |
| `sync-from-json.cjs` | 从 JSON 同步 | 从 JSON 数据同步到 Markdown |
| `create-bloggers.cjs` | 创建博主文件 | 根据 bloggers.json 创建博主 Markdown 文件 |

**使用方法**：
```bash
node scripts/migration/migrate-to-json.cjs
```

---

## test/ - 测试脚本

| 脚本 | 用途 | 使用场景 |
|------|------|---------|
| `test-json-flow.cjs` | JSON 流测试 | 测试 JSON 数据流转 |
| `test-adapter-output.cjs` | 适配器输出测试 | 测试适配器输出格式 |
| `verify-output.cjs` | 验证输出 | 验证分析输出结果 |
| `verify-data-consistency.cjs` | 验证数据一致性 | 验证数据文件一致性 |
| `test-doubao-prompt.cjs` | 豆包提示词测试 | 测试豆包分析提示词 |
| `test-prompt-project.cjs` | 项目提示词测试 | 测试项目相关提示词 |
| `test-prompt-manual.cjs` | 手动提示词测试 | 手动测试提示词效果 |
| `create-test-videos.cjs` | 创建测试视频 | 创建测试用视频数据 |

**使用方法**：
```bash
node scripts/test/verify-data-consistency.cjs
```

---

## utils/ - 工具脚本

| 脚本 | 用途 | 使用场景 |
|------|------|---------|
| `filter-blacklist.js` | 黑名单过滤 | 过滤黑名单中的博主 |
| `archive-blogger.js` | 博主归档 | 将黑名单博主归档到 archived/ 目录 |

**使用方法**：
```bash
# 过滤黑名单博主
node scripts/utils/filter-blacklist.js

# 归档指定博主
node scripts/utils/archive-blogger.js "博主名"

# 加入黑名单并归档（推荐）
node scripts/utils/archive-blogger.js --blacklist 145549815711955

# 归档所有黑名单博主
node scripts/utils/archive-blogger.js --all-blacklisted
```

---

## 归档功能说明

当博主被加入黑名单后，可以使用 `archive-blogger.js` 将其信息归档：

**归档位置**：`douyin-videos/archived/{博主名}_{sec_uid前10位}/`

**归档内容**：
- 移动 `results/{博主}/` 目录到 `archived/{博主}/`
- 从 `bloggers.json` 中删除该博主记录
- 从 `videos.json` 中删除该博主的视频记录
- 记录归档日志到 `archived/archive-log.json`

---

## 数据文件路径说明

所有脚本使用以下路径常量：

```javascript
const dataDir = 'd:/opencli/douyin-videos';
const dataFilesDir = path.join(dataDir, 'data');   // 数据文件目录
const stateDir = path.join(dataDir, 'state');      // 状态文件目录
const resultsDir = path.join(dataDir, 'results');  // 分析结果目录
```

**数据文件位置**：
- `data/bloggers.json` - 博主索引
- `data/blogger-blacklist.json` - 博主黑名单
- `data/videos.json` - 视频列表
- `data/search-keywords.json` - 搜索关键词
- `data/discovered-keywords.json` - 发现的关键词

**状态文件位置**：
- `state/pipeline-state.json` - 流程状态

**类型定义**：
- `clis/douyin-videos/_shared/types.js` - 数据结构类型定义

---

## 相关文档

- [适配器开发计划](../docs/adapter-development-plan.md)
- [使用指南](../docs/usage-guide.md)
