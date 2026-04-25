# 专业化提取模组设计

## 一、模组概述

**设计目的**：解决"指令疲劳"，每个模组只需关注自己的 JSON Schema

**文件路径**：`_shared/extraction/`

---

## 二、模组结构

```
_shared/
└── extraction/
    ├── index.js              # 路由入口
    ├── extraction-low.js     # 低质量节点
    ├── extraction-medium.js  # 中质量节点
    └── extraction-high.js    # 高质量节点
```

---

## 三、路由入口

### 3.1 ExtractionRouter

```javascript
// _shared/extraction/index.js

import { ExtractionLow } from './extraction-low.js';
import { ExtractionMedium } from './extraction-medium.js';
import { ExtractionHigh } from './extraction-high.js';

export class ExtractionRouter {
  static async extract(qualityResult, cleanedContent, context) {
    const extractor = this.getExtractor(qualityResult.quality_level);
    return await extractor.extract(cleanedContent, context);
  }
  
  static getExtractor(level) {
    const extractors = {
      low: ExtractionLow,
      medium: ExtractionMedium,
      high: ExtractionHigh
    };
    return extractors[level];
  }
}
```

---

## 四、低质量节点

### 4.1 职责

只负责判断"项目相关性"和"主要问题"

### 4.2 代码实现

```javascript
// _shared/extraction/extraction-low.js

export class ExtractionLow {
  static async extract(content, context) {
    const projectRelated = await this.checkProjectRelated(content);
    const judgment = await this.getJudgment(content);
    const issues = await this.identifyIssues(content);
    
    return {
      quality: 'low',
      project_related: projectRelated,
      judgment,
      issues
    };
  }
  
  static async checkProjectRelated(content) {
    const keywords = ['赚钱', '变现', '副业', '项目', '创业'];
    return keywords.some(k => content.main_content?.includes(k));
  }
  
  static async getJudgment(content) {
    if (!content.main_content || content.main_content.length < 50) {
      return '内容过于简短，无法判断';
    }
    return '缺乏实操信息，仅有观点或广告';
  }
  
  static async identifyIssues(content) {
    const issues = [];
    if (!content.key_points?.length) issues.push('无关键要点');
    if (!content.mentioned_items?.length) issues.push('无具体工具/平台');
    return issues.join('；') || '无';
  }
}
```

### 4.3 输出字段

```json
{
  "quality": "low",
  "project_related": false,
  "judgment": "判断依据",
  "issues": "主要问题"
}
```

---

## 五、中质量节点

### 5.1 职责

重点提取"核心模式"和"缺失信息说明"

### 5.2 代码实现

```javascript
// _shared/extraction/extraction-medium.js

export class ExtractionMedium {
  static async extract(content, context) {
    return {
      quality: 'medium',
      project_related: true,
      project_name: await this.extractProjectName(content),
      keywords: await this.extractKeywords(content),
      category: await this.determineCategory(content),
      summary: await this.generateSummary(content),
      core_model: await this.extractCoreModel(content),
      missing_info: await this.identifyMissingInfo(content)
    };
  }
  
  static async extractProjectName(content) {
    // 从主题或内容中提取项目名称
    const match = content.topic?.match(/(.{2,10})[项目|玩法|方法]/);
    return match ? match[1] : '未命名项目';
  }
  
  static async extractKeywords(content) {
    const keywords = [];
    if (content.mentioned_items) {
      keywords.push(...content.mentioned_items);
    }
    return [...new Set(keywords)];
  }
  
  static async determineCategory(content) {
    const categories = {
      '电商': ['淘宝', '拼多多', '京东', '闲鱼'],
      '内容': ['抖音', '快手', '小红书', 'B站'],
      '私域': ['微信', '公众号', '社群']
    };
    
    for (const [cat, platforms] of Object.entries(categories)) {
      if (platforms.some(p => content.main_content?.includes(p))) {
        return cat;
      }
    }
    return '其他';
  }
  
  static async generateSummary(content) {
    return content.topic || '博主分享了实操经验';
  }
  
  static async extractCoreModel(content) {
    // 从 key_points 中提取核心模式
    return content.key_points?.join('；') || '未明确';
  }
  
  static async identifyMissingInfo(content) {
    const missing = [];
    if (!content.main_content?.includes('投入')) missing.push('投入成本');
    if (!content.main_content?.includes('收益')) missing.push('预期收益');
    if (!content.main_content?.includes('风险')) missing.push('风险提示');
    return missing.join('、') || '无';
  }
}
```

### 5.3 输出字段

```json
{
  "quality": "medium",
  "project_related": true,
  "project_name": "项目名称",
  "keywords": ["关键词"],
  "category": "领域",
  "summary": "博主特点",
  "core_model": "核心模式",
  "missing_info": "缺失的关键信息"
}
```

---

## 六、高质量节点

### 6.1 职责

火力全开，提取全维度数据

### 6.2 代码实现

```javascript
// _shared/extraction/extraction-high.js

export class ExtractionHigh {
  static async extract(content, context) {
    return {
      quality: 'high',
      project_related: true,
      project_name: await this.extractProjectName(content),
      keywords: await this.extractKeywords(content),
      category: await this.determineCategory(content),
      summary: await this.generateSummary(content),
      core_model: await this.extractCoreModel(content),
      how_to_do: await this.extractHowToDo(content),
      investment: await this.extractInvestment(content),
      return: await this.extractReturn(content),
      target: await this.extractTarget(content),
      risks: await this.extractRisks(content),
      tools: await this.extractTools(content),
      cases: await this.extractCases(content)
    };
  }
  
  static async extractHowToDo(content) {
    // 提取具体操作步骤
    const steps = content.key_points?.filter(p => 
      p.includes('第一步') || p.includes('首先') || p.includes('然后')
    );
    return steps?.join('\n') || content.key_points?.join('\n') || '';
  }
  
  static async extractInvestment(content) {
    const match = content.main_content?.match(/投入[：:]*([^\n。]+)/);
    return match ? match[1].trim() : '未提及';
  }
  
  static async extractReturn(content) {
    const match = content.main_content?.match(/收益[：:]*([^\n。]+)/);
    return match ? match[1].trim() : '未提及';
  }
  
  static async extractTarget(content) {
    const match = content.main_content?.match(/适合[：:]*([^\n。]+)/);
    return match ? match[1].trim() : '未提及';
  }
  
  static async extractRisks(content) {
    const match = content.main_content?.match(/风险[：:]*([^\n。]+)/);
    return match ? match[1].trim() : '未提及';
  }
  
  static async extractTools(content) {
    return content.mentioned_items?.join('、') || '未提及';
  }
  
  static async extractCases(content) {
    // 提取案例数据
    const caseMatch = content.main_content?.match(/案例[：:]*([^\n]+)/);
    return caseMatch ? caseMatch[1].trim() : '未提及';
  }
}
```

### 6.3 输出字段

```json
{
  "quality": "high",
  "project_related": true,
  "project_name": "项目名称",
  "keywords": ["关键词"],
  "category": "领域",
  "summary": "博主特点",
  "core_model": "核心模式",
  "how_to_do": "操作步骤",
  "investment": "投入成本",
  "return": "预期收益",
  "target": "目标人群",
  "risks": "风险提示",
  "tools": "所需工具",
  "cases": "案例数据"
}
```

---

## 七、测试方案

### 7.1 单元测试

```javascript
describe('ExtractionRouter', () => {
  it('should route to low extractor', async () => {
    const qualityResult = { quality_level: 'low' };
    const content = { main_content: '今天分享到这里' };
    const result = await ExtractionRouter.extract(qualityResult, content, {});
    expect(result.quality).toBe('low');
  });
  
  it('should route to high extractor', async () => {
    const qualityResult = { quality_level: 'high' };
    const content = { main_content: '完整内容...' };
    const result = await ExtractionRouter.extract(qualityResult, content, {});
    expect(result.quality).toBe('high');
    expect(result.how_to_do).toBeDefined();
  });
});
```

---

## 八、相关文档

- [[quality-gate-design]] - 质量判断模块设计
- [[output-formatter-design]] - 统一输出层设计
- [[../prompts/低质量提取节点提示词]] - 提示词设计
- [[../prompts/中质量提取节点提示词]] - 提示词设计
- [[../prompts/高质量提取节点提示词]] - 提示词设计
