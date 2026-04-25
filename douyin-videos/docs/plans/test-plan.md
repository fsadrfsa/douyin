# 测试方案

## 一、测试策略概述

### 1.1 测试层级

| 层级 | 工具 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest | 各模块独立功能 |
| 集成测试 | Vitest | 模块间协作 |
| 端到端测试 | 手动 | 完整流程 |

### 1.2 验收标准

| 指标 | 要求 |
|------|------|
| 单元测试覆盖率 | ≥ 80% |
| 集成测试通过率 | 100% |
| 关键路径覆盖 | 100% |

---

## 二、测试环境配置

### 2.1 安装依赖

```bash
npm install -D vitest @vitest/coverage-v8
```

### 2.2 配置文件

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
});
```

### 2.3 脚本命令

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

## 三、单元测试

### 3.1 内容整理模块测试

```javascript
// tests/unit/content-cleaner.test.js
import { describe, it, expect } from 'vitest';
import { ContentCleaner } from '../../clis/douyin-videos/_shared/content-cleaner.js';

describe('ContentCleaner', () => {
  describe('clean', () => {
    it('should correct common typos', async () => {
      const input = {
        transcript: '公种号变现方法，咸鱼卖货'
      };
      const result = await ContentCleaner.clean(input, { source: 'transcription' });
      
      expect(result.main_content).toContain('公众号');
      expect(result.main_content).toContain('闲鱼');
      expect(result.correction_notes).toHaveLength(2);
    });
    
    it('should not hallucinate content', async () => {
      const input = {
        transcript: '今天分享到这里'
      };
      const result = await ContentCleaner.clean(input, { source: 'transcription' });
      
      expect(result.key_points.length).toBeLessThanOrEqual(3);
      expect(result.mentioned_items.length).toBeLessThanOrEqual(5);
    });
    
    it('should preserve industry terms', async () => {
      const input = {
        transcript: '私域引流变现'
      };
      const result = await ContentCleaner.clean(input, { source: 'transcription' });
      
      expect(result.main_content).toContain('私域');
      expect(result.main_content).toContain('引流');
    });
  });
});
```

### 3.2 质量判断模块测试

```javascript
// tests/unit/quality-gate.test.js
import { describe, it, expect } from 'vitest';
import { QualityGate } from '../../clis/douyin-videos/_shared/quality-gate.js';

describe('QualityGate', () => {
  describe('evaluate', () => {
    it('should return high quality for complete content', async () => {
      const content = {
        main_content: '第一步：注册账号。第二步：发布内容。盈利模式：广告分成。投入：零成本。收益：月入3000。适合：新手。风险：账号封禁。'
      };
      const result = await QualityGate.evaluate(content);
      
      expect(result.quality_level).toBe('high');
      expect(result.completeness_score).toBeGreaterThanOrEqual(0.8);
    });
    
    it('should promote to medium with core dimension', async () => {
      const content = {
        main_content: '第一步：注册账号。第二步：发布内容。盈利模式：广告分成。'
      };
      const result = await QualityGate.evaluate(content);
      
      expect(result.quality_level).toBe('medium');
      expect(result.has_core_dimension).toBe(true);
    });
    
    it('should return low quality for empty content', async () => {
      const content = {
        main_content: '今天分享到这里'
      };
      const result = await QualityGate.evaluate(content);
      
      expect(result.quality_level).toBe('low');
      expect(result.completeness_score).toBeLessThan(0.5);
    });
    
    it('should detect inspiration value', async () => {
      const content = {
        main_content: '分享一个新工具，可以自动生成内容'
      };
      const result = await QualityGate.evaluate(content);
      
      expect(result.inspiration_value).toBe(true);
    });
  });
});
```

### 3.3 提取模块测试

```javascript
// tests/unit/extraction.test.js
import { describe, it, expect } from 'vitest';
import { ExtractionRouter } from '../../clis/douyin-videos/_shared/extraction/index.js';

describe('ExtractionRouter', () => {
  it('should route to low extractor', async () => {
    const qualityResult = { quality_level: 'low' };
    const content = { main_content: '今天分享到这里' };
    const result = await ExtractionRouter.extract(qualityResult, content, {});
    
    expect(result.quality).toBe('low');
    expect(result.judgment).toBeDefined();
  });
  
  it('should route to medium extractor', async () => {
    const qualityResult = { quality_level: 'medium' };
    const content = { 
      main_content: '分享闲鱼卖货方法',
      topic: '闲鱼变现',
      mentioned_items: ['闲鱼']
    };
    const result = await ExtractionRouter.extract(qualityResult, content, {});
    
    expect(result.quality).toBe('medium');
    expect(result.project_name).toBeDefined();
    expect(result.missing_info).toBeDefined();
  });
  
  it('should route to high extractor', async () => {
    const qualityResult = { quality_level: 'high' };
    const content = { 
      main_content: '第一步：注册账号。投入：零成本。收益：月入3000。',
      topic: '完整项目',
      key_points: ['步骤1', '步骤2'],
      mentioned_items: ['闲鱼']
    };
    const result = await ExtractionRouter.extract(qualityResult, content, {});
    
    expect(result.quality).toBe('high');
    expect(result.how_to_do).toBeDefined();
    expect(result.investment).toBeDefined();
    expect(result.return).toBeDefined();
  });
});
```

### 3.4 输出层测试

```javascript
// tests/unit/output-formatter.test.js
import { describe, it, expect } from 'vitest';
import { OutputFormatter } from '../../clis/douyin-videos/_shared/output-formatter.js';

describe('OutputFormatter', () => {
  it('should format low quality output correctly', () => {
    const extractedData = {
      quality: 'low',
      project_related: false,
      judgment: '内容空洞',
      issues: '无实操信息'
    };
    const originalData = {
      trace_id: 'test001',
      aweme_id: '7xxx001',
      cleaning: { topic: '测试', main_content: '内容', key_points: [], mentioned_items: [] }
    };
    const qualityResult = { quality_level: 'low', completeness_score: 0.2 };
    
    const result = OutputFormatter.format(extractedData, originalData, qualityResult);
    
    expect(result.trace_id).toBe('test001');
    expect(result.processing_meta.quality_level).toBe('low');
    expect(result.quality_info.judgment).toBe('内容空洞');
    expect(result.project_info.project_name).toBeNull();
  });
  
  it('should format high quality output correctly', () => {
    const extractedData = {
      quality: 'high',
      project_related: true,
      project_name: '测试项目',
      keywords: ['测试'],
      category: '电商',
      summary: '测试摘要',
      core_model: '测试模式',
      how_to_do: '步骤1...',
      investment: '零成本',
      return: '月入3000',
      target: '新手',
      risks: '无',
      tools: '无',
      cases: '无'
    };
    const originalData = {
      trace_id: 'test002',
      aweme_id: '7xxx002',
      cleaning: { topic: '测试', main_content: '内容', key_points: [], mentioned_items: [] }
    };
    const qualityResult = { quality_level: 'high', completeness_score: 0.9 };
    
    const result = OutputFormatter.format(extractedData, originalData, qualityResult);
    
    expect(result.processing_meta.quality_level).toBe('high');
    expect(result.project_info.project_name).toBe('测试项目');
    expect(result.project_info.how_to_do).toBe('步骤1...');
  });
});
```

---

## 四、集成测试

### 4.1 Stage 3 流程测试

```javascript
// tests/integration/stage3-flow.test.js
import { describe, it, expect } from 'vitest';
import { analyzeVideo } from '../../clis/douyin-videos/stage3-video-analyze.js';

describe('Stage 3 Integration', () => {
  it('should process accessible video correctly', async () => {
    const video = {
      aweme_id: 'test_accessible',
      url: 'https://www.douyin.com/video/test_accessible'
    };
    
    const result = await analyzeVideo(video);
    
    expect(result.trace_id).toBe('test_accessible');
    expect(result.accessibility.is_accessible).toBe(true);
    expect(result.cleaning).toBeDefined();
    expect(result.next_module).toBe('quality_gate');
  });
  
  it('should route inaccessible video to stage4', async () => {
    const video = {
      aweme_id: 'test_inaccessible',
      url: 'https://www.douyin.com/video/deleted'
    };
    
    const result = await analyzeVideo(video);
    
    expect(result.accessibility.is_accessible).toBe(false);
    expect(result.next_module).toBe('stage4_transcription');
  });
});
```

### 4.2 完整流程测试

```javascript
// tests/integration/full-pipeline.test.js
import { describe, it, expect } from 'vitest';
import { ContentCleaner } from '../../clis/douyin-videos/_shared/content-cleaner.js';
import { QualityGate } from '../../clis/douyin-videos/_shared/quality-gate.js';
import { ExtractionRouter } from '../../clis/douyin-videos/_shared/extraction/index.js';
import { OutputFormatter } from '../../clis/douyin-videos/_shared/output-formatter.js';

describe('Full Pipeline Integration', () => {
  it('should process high quality video end-to-end', async () => {
    const rawContent = {
      transcript: '第一步：注册闲鱼账号。第二步：发布虚拟资源。盈利模式：卖虚拟资料。投入：零成本。收益：月入3000。适合：新手。风险：账号限流。'
    };
    
    // Step 1: 内容整理
    const cleaned = await ContentCleaner.clean(rawContent, { source: 'transcription' });
    expect(cleaned.main_content).toBeDefined();
    
    // Step 2: 质量判断
    const qualityResult = await QualityGate.evaluate(cleaned);
    expect(qualityResult.quality_level).toBe('high');
    
    // Step 3: 信息提取
    const extracted = await ExtractionRouter.extract(qualityResult, cleaned, {});
    expect(extracted.quality).toBe('high');
    
    // Step 4: 统一输出
    const output = OutputFormatter.format(extracted, { 
      trace_id: 'test001', 
      aweme_id: '7xxx001',
      cleaning: cleaned 
    }, qualityResult);
    
    expect(output.trace_id).toBe('test001');
    expect(output.processing_meta.quality_level).toBe('high');
    expect(output.project_info.how_to_do).toBeDefined();
  });
});
```

---

## 五、测试执行

### 5.1 运行命令

```bash
# 运行所有测试
npm test

# 运行单元测试
npm test tests/unit/

# 运行集成测试
npm test tests/integration/

# 生成覆盖率报告
npm run test:coverage
```

### 5.2 测试报告

测试完成后，覆盖率报告将生成在 `coverage/` 目录下。

---

## 六、相关文档

- [[../architecture/content-cleaner-design]] - 内容整理模块设计
- [[../architecture/quality-gate-design]] - 质量判断模块设计
- [[../architecture/extraction-modules-design]] - 专业化提取模组设计
- [[../architecture/output-formatter-design]] - 统一输出层设计
