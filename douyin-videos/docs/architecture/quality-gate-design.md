# 质量判断模块设计

## 一、模块概述

**职责**：计算内容完整度，进行路由分发

**文件路径**：`_shared/quality-gate.js`

**触发时机**：内容整理完成后

---

## 二、评分维度

### 2.1 维度定义

| 维度 | 权重 | 说明 | 核心维度 |
|------|------|------|----------|
| project_name | 25% | 项目名称 | ✅ 是 |
| how_to_do | 30% | 操作步骤 | ✅ 是 |
| investment | 10% | 投入成本 | - |
| return | 10% | 预期收益 | - |
| target | 10% | 目标人群 | - |
| risks | 15% | 风险提示 | - |

### 2.2 评分公式

```
完整度 = Σ(维度得分 × 权重)

维度得分：
- found = true → score = 1.0
- found = false → score = 0
```

---

## 三、路由规则

### 3.1 路由优先级

```
Step 1: 检查核心维度
  └── 有 how_to_do 或 project_name → 至少中质量
  
Step 2: 计算完整度分数
  └── ≥80% → 高质量
  └── 50%-80% → 中质量
  └── <50% → 低质量
  
Step 3: 检查灵感价值
  └── 有灵感价值 → 特殊标注
```

### 3.2 路由规则表

| 条件 | 路由目标 | 备注 |
|------|----------|------|
| 有 how_to_do 或 project_name | 至少中质量 | 核心维度一票通过 |
| 完整度 ≥ 80% | 高质量节点 | - |
| 完整度 50%-80% | 中质量节点 | - |
| 完整度 < 50% | 低质量节点 | - |
| 有灵感价值 | 特殊标注 | 点子类视频 |

---

## 四、代码实现

### 4.1 模块结构

```javascript
// _shared/quality-gate.js

export class QualityGate {
  static DIMENSIONS = {
    project_name: { weight: 0.25, isCore: true },
    how_to_do: { weight: 0.30, isCore: true },
    investment: { weight: 0.10, isCore: false },
    return: { weight: 0.10, isCore: false },
    target: { weight: 0.10, isCore: false },
    risks: { weight: 0.15, isCore: false }
  };
  
  static async evaluate(cleanedContent) {
    const dimensions = await this.detectDimensions(cleanedContent);
    const completenessScore = this.calculateScore(dimensions);
    const hasCoreDimension = this.checkCoreDimension(dimensions);
    const qualityLevel = this.determineLevel(completenessScore, hasCoreDimension);
    const inspirationValue = this.checkInspiration(cleanedContent);
    
    return {
      dimensions,
      completeness_score: completenessScore,
      has_core_dimension: hasCoreDimension,
      inspiration_value: inspirationValue,
      quality_level: qualityLevel,
      next_module: this.getNextModule(qualityLevel)
    };
  }
  
  static async detectDimensions(content) {
    const dimensions = {};
    for (const [name, config] of Object.entries(this.DIMENSIONS)) {
      dimensions[name] = {
        found: await this.checkDimension(name, content),
        score: 0
      };
      if (dimensions[name].found) {
        dimensions[name].score = 1.0;
      }
    }
    return dimensions;
  }
  
  static calculateScore(dimensions) {
    let totalScore = 0;
    for (const [name, config] of Object.entries(this.DIMENSIONS)) {
      totalScore += dimensions[name].score * config.weight;
    }
    return totalScore;
  }
  
  static checkCoreDimension(dimensions) {
    return dimensions.how_to_do.found || dimensions.project_name.found;
  }
  
  static determineLevel(score, hasCore) {
    if (hasCore && score < 0.5) {
      return 'medium';
    }
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }
  
  static getNextModule(level) {
    const moduleMap = {
      high: 'extraction_high',
      medium: 'extraction_medium',
      low: 'extraction_low'
    };
    return moduleMap[level];
  }
  
  static checkInspiration(content) {
    const indicators = ['新工具', '新平台', '避坑', '踩坑', '新玩法'];
    return indicators.some(i => content.main_content?.includes(i));
  }
}
```

---

## 五、输入输出格式

### 5.1 输入格式

```json
{
  "trace_id": "unique_id_001",
  "aweme_id": "7xxxxxxxxxxxxxx",
  "cleaning": {
    "topic": "视频主题",
    "main_content": "整理后的内容",
    "key_points": ["要点1", "要点2"],
    "mentioned_items": ["提及项1"]
  }
}
```

### 5.2 输出格式

```json
{
  "trace_id": "unique_id_001",
  "quality_gate": {
    "dimensions": {
      "project_name": { "found": true, "score": 1.0 },
      "how_to_do": { "found": true, "score": 1.0 },
      "investment": { "found": false, "score": 0 },
      "return": { "found": true, "score": 1.0 },
      "target": { "found": false, "score": 0 },
      "risks": { "found": false, "score": 0 }
    },
    "completeness_score": 0.65,
    "has_core_dimension": true,
    "inspiration_value": false,
    "quality_level": "medium",
    "next_module": "extraction_medium"
  }
}
```

---

## 六、测试方案

### 6.1 单元测试

```javascript
describe('QualityGate', () => {
  it('should return high quality for complete content', async () => {
    const content = {
      main_content: '第一步：注册账号。第二步：发布内容。盈利模式：广告分成。投入：零成本。收益：月入3000。适合：新手。风险：账号封禁。'
    };
    const result = await QualityGate.evaluate(content);
    expect(result.quality_level).toBe('high');
  });
  
  it('should promote to medium with core dimension', async () => {
    const content = {
      main_content: '第一步：注册账号。第二步：发布内容。'
    };
    const result = await QualityGate.evaluate(content);
    expect(result.quality_level).toBe('medium');
    expect(result.has_core_dimension).toBe(true);
  });
  
  it('should return low quality for empty content', async () => {
    const content = { main_content: '今天分享到这里' };
    const result = await QualityGate.evaluate(content);
    expect(result.quality_level).toBe('low');
  });
});
```

---

## 七、相关文档

- [[content-cleaner-design]] - 内容整理模块设计
- [[extraction-modules-design]] - 专业化提取模组设计
- [[../prompts/质量判断模块提示词]] - 提示词设计
- [[../optimization/future-optimization]] - 后期优化（权重补偿机制）
