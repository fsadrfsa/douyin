# 统一输出层设计文档

## 一、模块概述

**职责**：接收分析结果，输出统一格式数据

**文件路径**：`clis/douyin-videos/_shared/output-formatter.js`

**触发时机**：专业化提取完成后

**当前状态**：⏳ 待实现

---

## 二、数据来源

统一输出层接收统一格式的 `cleaned_content`：

| 来源 | 场景 | 数据结构 |
|------|------|----------|
| Stage 3 可见分支 | 视频可见，文案整理 | `cleaned_content` |
| Stage 4 + 内容整理 | 视频不可见，转录后整理 | `cleaned_content` |

**关键变化**：两种分支输出格式统一为 `cleaned_content`

---

## 三、输入数据结构

### 3.1 可见分支输入

```json
{
  "trace_id": "7xxxxxxxxxxxxxx",
  "aweme_id": "7xxxxxxxxxxxxxx",
  "is_transcribed": false,
  "cleaned_content": {
    "topic": "视频主题",
    "main_content": "整理后的内容",
    "key_points": ["要点1", "要点2"],
    "mentioned_items": ["提及项1"]
  }
}
```

### 3.2 转录分支输入

```json
{
  "trace_id": "7xxxxxxxxxxxxxx",
  "aweme_id": "7xxxxxxxxxxxxxx",
  "is_transcribed": true,
  "cleaned_content": {
    "topic": "视频主题",
    "main_content": "整理后的内容",
    "key_points": ["要点1", "要点2"],
    "mentioned_items": ["提及项1"],
    "correction_notes": "修正说明"
  }
}
```

**关键点**：两种分支输入格式完全一致，仅 `is_transcribed` 字段不同

---

## 四、输出数据结构

### 4.1 低质量输出

```json
{
  "trace_id": "7xxxxxxxxxxxxxx",
  "aweme_id": "7xxxxxxxxxxxxxx",
  "is_transcribed": false,
  "quality_level": "low",
  "basic_info": {
    "topic": "视频主题",
    "main_content": "整理后的内容",
    "key_points": ["要点1", "要点2"],
    "mentioned_items": ["提及项1"]
  },
  "extraction": {
    "project_name": null,
    "core_model": null,
    "investment": null,
    "return": null,
    "target": null,
    "risks": null
  },
  "metadata": {
    "processed_at": "2026-04-15T00:00:00.000Z",
    "source": "stage3_visible"
  }
}
```

### 4.2 中质量输出

```json
{
  "trace_id": "7xxxxxxxxxxxxxx",
  "aweme_id": "7xxxxxxxxxxxxxx",
  "is_transcribed": false,
  "quality_level": "medium",
  "basic_info": {
    "topic": "视频主题",
    "main_content": "整理后的内容",
    "key_points": ["要点1", "要点2"],
    "mentioned_items": ["提及项1"]
  },
  "extraction": {
    "project_name": "项目名称",
    "core_model": "核心模式",
    "investment": "投入成本",
    "return": "预期收益",
    "target": "目标人群",
    "risks": null
  },
  "metadata": {
    "processed_at": "2026-04-15T00:00:00.000Z",
    "source": "stage3_visible"
  }
}
```

### 4.3 高质量输出

```json
{
  "trace_id": "7xxxxxxxxxxxxxx",
  "aweme_id": "7xxxxxxxxxxxxxx",
  "is_transcribed": false,
  "quality_level": "high",
  "basic_info": {
    "topic": "视频主题",
    "main_content": "整理后的内容",
    "key_points": ["要点1", "要点2"],
    "mentioned_items": ["提及项1"]
  },
  "extraction": {
    "project_name": "项目名称",
    "core_model": "核心模式",
    "investment": "投入成本",
    "return": "预期收益",
    "target": "目标人群",
    "risks": "风险提示"
  },
  "metadata": {
    "processed_at": "2026-04-15T00:00:00.000Z",
    "source": "stage3_visible"
  }
}
```

---

## 五、核心代码设计

```javascript
class OutputFormatter {
  static format(data, qualityLevel) {
    return {
      trace_id: data.trace_id,
      aweme_id: data.aweme_id,
      is_transcribed: data.is_transcribed || false,
      quality_level: qualityLevel,
      basic_info: this.buildBasicInfo(data.cleaned_content),
      extraction: this.buildExtraction(data.extraction, qualityLevel),
      metadata: {
        processed_at: new Date().toISOString(),
        source: data.is_transcribed ? 'stage4_transcription' : 'stage3_visible'
      }
    };
  }
  
  static buildBasicInfo(cleanedContent) {
    return {
      topic: cleanedContent?.topic || '',
      main_content: cleanedContent?.main_content || '',
      key_points: cleanedContent?.key_points || [],
      mentioned_items: cleanedContent?.mentioned_items || []
    };
  }
  
  static buildExtraction(extraction, qualityLevel) {
    if (qualityLevel === 'low') {
      return {
        project_name: null,
        core_model: null,
        investment: null,
        return: null,
        target: null,
        risks: null
      };
    }
    
    return {
      project_name: extraction?.project_name || null,
      core_model: extraction?.core_model || null,
      investment: extraction?.investment || null,
      return: extraction?.return || null,
      target: extraction?.target || null,
      risks: qualityLevel === 'high' ? extraction?.risks : null
    };
  }
}
```

---

## 六、当前状态

### 6.1 已实现

- ✅ 设计文档

### 6.2 待实现

- ⏳ `output-formatter.js` 代码实现
- ⏳ 与质量判断模块集成
- ⏳ 与专业化提取模块集成
- ⏳ 最终数据存储路径

---

## 七、数据链路

```
Stage 3 可见分支
    │
    ├── cleaned_content
    │
    ▼
质量判断模块 (QualityGate)
    │
    ├── 低质量 → 低质量提取模块
    ├── 中质量 → 中质量提取模块
    └── 高质量 → 高质量提取模块
    │
    ▼
统一输出层 (OutputFormatter)
    │
    ▼
最终数据存储
```

---

## 八、相关文档

- [[stage3-modification-design]] - Stage 3 设计文档
- [[content-cleaner-design]] - 内容整理模块设计
- [[quality-gate-design]] - 质量判断模块设计
- [[extraction-modules-design]] - 专业化提取模组设计
