# 归档脚本说明

**归档时间**: 2026-04-24
**归档原因**: 清理项目结构，移除不再使用的脚本

---

## 📁 归档目录结构

```
scripts/_archived/
├── test/           # 测试脚本 (21 个)
├── migration/      # 迁移脚本 (8 个)
└── utils/          # 临时工具脚本 (6 个)
```

---

## 📦 test/ - 测试脚本

这些脚本用于开发阶段的测试和验证，已不再需要。

| 文件 | 原用途 |
|------|--------|
| `analyze-failed-logs.cjs` | 分析失败日志 |
| `blogger-optimizer-logic-test.cjs` | 博主优化逻辑测试 |
| `blogger-quality-model-test.mjs` | 博主质量模型测试 |
| `check-videos-status.cjs` | 检查视频状态 |
| `check-videos-url.cjs` | 检查视频 URL |
| `create-test-videos.cjs` | 创建测试视频 |
| `data-check.cjs` | 数据检查 |
| `pipeline-health-boundary-test.cjs` | 流水线边界测试 |
| `pipeline-health-check.cjs` | 流水线健康检查 |
| `test-adapter-output.cjs` | 适配器输出测试 |
| `test-doubao-prompt.cjs` | 豆包提示词测试 |
| `test-json-flow.cjs` | JSON 流程测试 |
| `test-prompt-manual.cjs` | 手动提示词测试 |
| `test-prompt-project.cjs` | 项目提示词测试 |
| `verify-data-consistency.cjs` | 验证数据一致性 |
| `verify-output.cjs` | 验证输出 |
| `simulate-stage3.cjs` | 模拟 Stage3 |
| `test-full-dataflow.cjs` | 完整数据流测试 |
| `test-full-flow.cjs` | 完整流程测试 |

---

## 📦 migration/ - 迁移脚本

这些脚本用于数据迁移，迁移已完成，不再需要。

| 文件 | 原用途 |
|------|--------|
| `create-bloggers.cjs` | 创建博主 |
| `fix-blogger-format.cjs` | 修复博主格式 |
| `fix-data-consistency.cjs` | 修复数据一致性 |
| `fix-results-format.cjs` | 修复结果格式 |
| `migrate-bloggers-to-json.cjs` | 迁移博主到 JSON |
| `migrate-to-json.cjs` | 迁移到 JSON |
| `sync-from-json.cjs` | 从 JSON 同步 |
| `sync-video-records.cjs` | 同步视频记录 |

---

## 📦 utils/ - 临时工具脚本

这些是一次性使用的脚本，问题已解决。

| 文件 | 原用途 | 删除原因 |
|------|--------|----------|
| `verify-remaining.js` | 验证剩余视频 author_id | 问题已解决 |
| `check-videos.js` | 分析视频时间分布 | 简单诊断，不再需要 |
| `analyze-mismatch.js` | 分析 author_id 不匹配 | 问题已解决 |
| `remove-mismatched.js` | 删除不匹配视频 | 问题已解决 |
| `tmp-extract.cjs` | 临时提取元数据 | 临时脚本 |

---

## 🗑️ 已删除文件

以下文件已直接删除（未归档）：

| 文件 | 删除原因 |
|------|----------|
| `scripts/stage3-batch.ts` | Stage3 已被移除，脚本无效 |

---

## ⚠️ 注意事项

1. 归档脚本仅作历史记录保留，不建议再次使用
2. 如需恢复某个脚本，请从 `_archived` 目录复制出来
3. 建议定期清理 `_archived` 目录（如 6 个月后）
