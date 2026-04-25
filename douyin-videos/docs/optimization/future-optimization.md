# 后期优化方向

## 一、优化概述

本文档记录架构的后期优化方向，优先级为 P4，在基础功能稳定后实施。

---

## 二、信息溢出探测机制

### 2.1 目的

防止遗漏碎片化信息，提升信息收集的召回率

### 2.2 核心设计

在质量判断模块中引入"信息溢出（Information Overflow）"探测机制

### 2.3 实现方案

```javascript
// _shared/overflow-detector.js

export class OverflowDetector {
  static FRAGMENT_PATTERNS = [
    { type: 'tool', pattern: /用了?([^\s，。]{2,10})(这个|这个新)/ },
    { type: 'platform', pattern: /在([^\s，。]{2,8})上/ },
    { type: 'trick', pattern: /(技巧|方法|套路)[：:]([^\n]+)/ }
  ];
  
  static detect(content) {
    const fragments = [];
    
    for (const { type, pattern } of this.FRAGMENT_PATTERNS) {
      const matches = content.main_content?.matchAll(pattern) || [];
      for (const match of matches) {
        fragments.push({
          type,
          content: match[0],
          extracted: match[1] || match[2]
        });
      }
    }
    
    return {
      has_overflow: fragments.length > 0,
      fragments
    };
  }
}
```

---

## 三、逻辑独特性评估

### 3.1 定义

视频是否提到了尚未普及的新工具、新平台整合、或独特的流量获取套路

### 3.2 扫描内容

| 扫描项 | 说明 | 示例 |
|--------|------|------|
| 新奇工具 (New Tools) | 尚未普及的新工具或平台 | "用这个新出的AI工具自动生成..." |
| 跨平台玩法 (Cross-platform Strategy) | 独特的跨平台整合策略 | "把小红书流量导到私域..." |
| 避坑实录 (Specific Failure Lessons) | 具体的失败案例和教训 | "我踩过的三个坑..." |

### 3.3 实现方案

```javascript
// _shared/uniqueness-evaluator.js

export class UniquenessEvaluator {
  static NEW_TOOL_INDICATORS = [
    '新出的', '刚发布的', '最新的', '这个新工具', '新平台'
  ];
  
  static CROSS_PLATFORM_INDICATORS = [
    '导到', '引流到', '转移到', '跨平台', '多平台'
  ];
  
  static FAILURE_LESSON_INDICATORS = [
    '踩坑', '避坑', '失败', '教训', '别这样', '错误'
  ];
  
  static evaluate(content) {
    const text = content.main_content || '';
    
    const newTools = this.detectNewTools(text);
    const crossPlatform = this.detectCrossPlatform(text);
    const failureLessons = this.detectFailureLessons(text);
    
    const uniquenessScore = this.calculateScore({
      newTools: newTools.length,
      crossPlatform: crossPlatform.length,
      failureLessons: failureLessons.length
    });
    
    return {
      uniqueness_score: uniquenessScore,
      uniqueness_level: this.getLevel(uniquenessScore),
      detected: {
        new_tools: newTools,
        cross_platform: crossPlatform,
        failure_lessons: failureLessons
      }
    };
  }
  
  static calculateScore({ newTools, crossPlatform, failureLessons }) {
    // 每种类型最多贡献 0.4 分
    const toolScore = Math.min(newTools * 0.2, 0.4);
    const platformScore = Math.min(crossPlatform * 0.15, 0.4);
    const lessonScore = Math.min(failureLessons * 0.1, 0.2);
    
    return Math.min(toolScore + platformScore + lessonScore, 1.0);
  }
  
  static getLevel(score) {
    if (score >= 0.6) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }
}
```

---

## 四、权重补偿机制

### 4.1 规则

即使 6 大维度只满足 2 项，但若"逻辑独特性"极高，应将等级从 Low 提升至 Medium

### 4.2 路由调整

路由至特定的"灵感提取"模组

### 4.3 判定逻辑

```javascript
// _shared/quality-gate.js (升级版)

static determineLevel(score, hasCore, uniquenessLevel) {
  // 权重补偿：逻辑独特性高时提升等级
  if (uniquenessLevel === 'high' && score < 0.5) {
    return 'medium'; // 提升至中质量
  }
  
  // 核心维度一票通过
  if (hasCore && score < 0.5) {
    return 'medium';
  }
  
  // 正常评分
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}
```

---

## 五、灵感提取模组

### 5.1 触发条件

`potential_value = True` 且 `uniqueness_level = high`

### 5.2 职责

提取碎片化但有价值的信息

### 5.3 实现方案

```javascript
// _shared/extraction/extraction-inspiration.js

export class ExtractionInspiration {
  static async extract(content, uniquenessResult) {
    return {
      quality: 'medium',
      project_related: true,
      potential_value: true,
      project_name: await this.extractProjectName(content),
      keywords: await this.extractKeywords(content),
      category: await this.determineCategory(content),
      summary: await this.generateSummary(content),
      inspiration_type: this.getInspirationType(uniquenessResult),
      inspiration_content: this.extractInspirationContent(content, uniquenessResult),
      actionable_hint: await this.generateActionableHint(content),
      missing_info: await this.identifyMissingInfo(content)
    };
  }
  
  static getInspirationType(uniquenessResult) {
    const { detected } = uniquenessResult;
    
    if (detected.new_tools.length > 0) return 'new_tool';
    if (detected.cross_platform.length > 0) return 'cross_platform';
    if (detected.failure_lessons.length > 0) return 'failure_lesson';
    
    return 'unknown';
  }
  
  static extractInspirationContent(content, uniquenessResult) {
    const { detected } = uniquenessResult;
    const items = [
      ...detected.new_tools,
      ...detected.cross_platform,
      ...detected.failure_lessons
    ];
    
    return items.map(item => item.content || item).join('；');
  }
  
  static async generateActionableHint(content) {
    // 从碎片信息中提取可落地的启发点
    const hints = [];
    
    if (content.main_content?.includes('新工具')) {
      hints.push('可尝试使用新工具提升效率');
    }
    if (content.main_content?.includes('跨平台')) {
      hints.push('可考虑跨平台引流策略');
    }
    if (content.main_content?.includes('避坑')) {
      hints.push('注意避免已知的失败模式');
    }
    
    return hints.join('；') || '需要进一步调研';
  }
}
```

### 5.4 输出字段

```json
{
  "quality": "medium",
  "project_related": true,
  "potential_value": true,
  "project_name": "灵感来源",
  "keywords": ["关键词"],
  "category": "领域",
  "summary": "博主特点",
  "inspiration_type": "new_tool | cross_platform | failure_lesson",
  "inspiration_content": "具体内容描述",
  "actionable_hint": "可落地的启发点",
  "missing_info": "缺失的关键信息"
}
```

---

## 六、质量判断模块升级

### 6.1 原评分维度

| 维度 | 权重 |
|------|------|
| how_to_do | 30% |
| core_model | 25% |
| investment | 10% |
| return | 10% |
| target | 10% |
| risks | 15% |

### 6.2 升级后评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| how_to_do | 25% | 操作步骤（核心维度） |
| core_model | 20% | 盈利逻辑（核心维度） |
| investment | 8% | 投入成本 |
| return | 8% | 预期收益 |
| target | 8% | 目标人群 |
| risks | 11% | 风险提示 |
| uniqueness | 20% | 逻辑独特性（新增） |

### 6.3 评分公式

```
完整度 = Σ(维度得分 × 权重)
最终等级 = 完整度等级 OR 权重补偿后的等级
```

---

## 七、实施优先级

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P4 | 信息溢出探测 | 在质量判断模块中增加逻辑独特性评估 |
| P4 | 灵感提取模组 | 新增模组，处理碎片化价值信息 |
| P4 | 权重补偿机制 | 实现等级提升逻辑 |

---

## 八、相关文档

- [[../architecture/quality-gate-design]] - 质量判断模块设计
- [[../architecture/extraction-modules-design]] - 专业化提取模组设计
