# 博主优化功能设计文档

**版本**: 2.0
**创建日期**: 2026-04-11
**最后更新**: 2026-04-13
**状态**: 设计完成，已更新为动态数据格式

***

## 一、功能概述

### 1.1 目的

提高博主质量，删除或屏蔽低质量博主，优先处理高质量博主。

### 1.2 主题定义

确保采集到的项目信息具备以下特征：具体可执行性、市场需求验证、启动成本与收益模型、操作步骤与所需技能、风险评估与应对策略。建立标准化数据收集模板，确保信息完整性与一致性，为后续的项目筛选、可行性分析及价值评估阶段积累充足且高质量的原始数据。

### 1.3 核心流程

```
博主发现 → 视频采集 → 内容分析 → 博主质量评估 → 博主优化
```

### 1.4 触发条件

| 触发场景       | 执行动作      | 说明                        |
| ---------- | --------- | ------------------------- |
| **阶段三完成后** | 快速判断      | 明显不符合主题的博主，立即加入黑名单        |
| **持续跟进后**  | 综合判断      | 持续跟进一段时间（如3-7天）后，综合评估博主质量 |
| **手动触发**   | 用户执行命令时运行 | 用户主动执行优化命令                |

### 1.5 优化策略

| 策略       | 触发条件         | 执行动作            |
| -------- | ------------ | --------------- |
| **快速判断** | 博主所有视频都不符合主题 | 立即加入黑名单         |
| **综合判断** | 持续跟进3-7天后    | 综合评估博主质量，决定是否保留 |

***

## 二、数据源

### 2.1 数据文件清单

**数据文件根目录**: `d:\opencli\douyin-videos\`

> ⚠️ **重要**：以下路径为实际项目结构。智能体在执行前必须先检查文件是否存在，动态读取文件结构，不要硬编码字段。

| 文件 | 相对路径 | 用途 | 说明 |
|------|---------|------|------|
| `data/bloggers.json` | data/ | 博主列表 | 存储所有博主的基本信息 |
| `results/{博主名}_{sec_uid}/metadata.json` | results/ | 博主元数据 | 存储博主的详细信息和视频分析汇总 |
| `results/{博主名}_{sec_uid}/videos/{aweme_id}.json` | results/ | 视频分析结果 | 存储每个视频的详细分析结果 |
| `data/blogger-blacklist.json` | data/ | 博主黑名单 | 存储被屏蔽的博主列表 |
| `data/videos.json` | data/ | 视频列表 | 存储所有视频的基本信息 |
| `data/statistics.json` | data/ | 统计信息 | 存储整体统计数据 |
| `data/search-keywords.json` | data/ | 搜索关键词 | 存储搜索关键词列表 |
| `data/discovered-keywords.json` | data/ | 推荐关键词 | 存储抖音推荐的关键词 |
| `data/pipeline-state.json` | data/ | 流程状态 | 存储当前流程执行状态 |
| `optimization-feedback.json` | 根目录 | 优化反馈 | 存储优化过程中的问题和反馈 |
| `archived/` | 根目录 | 归档博主 | 存储已归档的博主数据 |
| `audio/` | 根目录 | 音频文件 | 存储视频音频文件 |
| `transcripts/` | 根目录 | 转录文本 | 存储音频转录文本 |
| `backups/` | 根目录 | 备份文件 | 存储数据备份文件 |
| `state/` | 根目录 | 状态文件 | 存储状态文件（备用） |

### 2.2 数据文件结构

> 📌 **动态读取原则**：以下示例仅为参考，实际字段可能随项目演进变化。智能体在执行时必须：
> 1. 先读取实际文件
> 2. 动态识别字段结构
> 3. 根据实际字段进行处理
> 4. 不要硬编码字段名称

#### data/bloggers.json

**完整路径**: `d:\opencli\douyin-videos\data\bloggers.json`

**读取方式**：
```javascript
// 动态读取博主列表
const bloggers = JSON.parse(fs.readFileSync('data/bloggers.json', 'utf-8'));

// 动态识别字段
const fields = Object.keys(bloggers[0]);
```

**核心字段**（可能存在）：
- `sec_uid`: 博主唯一标识
- `name`: 博主名称
- `author_id`: 博主ID
- `url`: 博主主页URL
- `source_keyword`: 来源关键词
- `status`: 博主状态（active/archived/blacklisted）
- `discovered_at`: 发现时间
- `last_fetch_time`: 最后获取时间

#### results/{博主名}_{sec_uid}/metadata.json

**完整路径**: `d:\opencli\douyin-videos\results\{博主名}_{sec_uid}\metadata.json`

**路径模式**：
- 目录名格式：`{博主名}_{sec_uid前缀}`
- 例如：`放眼看世界_MS4wLjABAA`

**读取方式**：
```javascript
// 动态读取博主元数据
const metadataPath = `results/${bloggerName}_${sec_uid}/metadata.json`;
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

// 动态识别字段
const fields = Object.keys(metadata);
```

**核心字段**（可能存在）：
- `blogger_name`: 博主名称
- `blogger_id`: 博主ID
- `sec_uid`: 博主唯一标识
- `score`: 博主质量评分
- `source_keyword`: 来源关键词
- `videos`: 视频分析结果数组
- `high_quality_count`: 高质量视频数
- `total_videos`: 总视频数
- `high_quality_ratio`: 高质量视频比例
- `keywords_history`: 关键词历史
- `categories_history`: 领域历史
- `last_analyzed_at`: 最后分析时间

#### results/{博主名}_{sec_uid}/videos/{aweme_id}.json

**完整路径**: `d:\opencli\douyin-videos\results\{博主名}_{sec_uid}\videos\{aweme_id}.json`

**读取方式**：
```javascript
// 动态读取视频分析结果
const videoPath = `results/${bloggerName}_${sec_uid}/videos/${aweme_id}.json`;
const videoResult = JSON.parse(fs.readFileSync(videoPath, 'utf-8'));

// 动态识别字段
const fields = Object.keys(videoResult);
```

**核心字段**（可能存在）：
- `video_id`: 视频ID
- `status`: 分析状态（success/failed/low_quality）
- `quality`: 视频质量（high/medium/low）
- `topic`: 视频主题
- `project_related`: 是否与项目相关
- `keywords`: 关键词数组
- `category`: 领域分类
- `summary`: 内容摘要
- `analyzed_at`: 分析时间

#### data/blogger-blacklist.json

**完整路径**: `d:\opencli\douyin-videos\data\blogger-blacklist.json`

**读取方式**：
```javascript
// 动态读取黑名单
const blacklist = JSON.parse(fs.readFileSync('data/blogger-blacklist.json', 'utf-8'));

// 动态识别字段
const fields = Object.keys(blacklist.blacklist[0]);
```

**核心字段**（可能存在）：
- `name`: 博主名称
- `author_id`: 博主ID
- `sec_uid`: 博主唯一标识
- `reason`: 加入黑名单原因
- `added_at`: 加入时间

#### data/statistics.json

**完整路径**: `d:\opencli\douyin-videos\data\statistics.json`

**读取方式**：
```javascript
// 动态读取统计信息
const stats = JSON.parse(fs.readFileSync('data/statistics.json', 'utf-8'));

// 动态识别字段
const fields = Object.keys(stats);
```

**核心字段**（可能存在）：
- `overview`: 总体概览
- `keywords`: 关键词统计
- `categories`: 领域统计
- `quality_distribution`: 质量分布

### 2.3 数据读取原则

#### 原则1：动态路径发现

```javascript
// ❌ 错误：硬编码路径
const metadata = JSON.parse(fs.readFileSync('results/胡说老王（干货版）/metadata.json'));

// ✅ 正确：动态发现路径
const resultsDir = 'results/';
const bloggerDirs = fs.readdirSync(resultsDir);
const targetDir = bloggerDirs.find(dir => dir.includes(bloggerName));
const metadata = JSON.parse(fs.readFileSync(`${resultsDir}${targetDir}/metadata.json`));
```

#### 原则2：动态字段识别

```javascript
// ❌ 错误：硬编码字段
const quality = metadata.high_quality_count;

// ✅ 正确：动态识别字段
const qualityField = Object.keys(metadata).find(key => 
  key.includes('quality') && key.includes('count')
);
const quality = metadata[qualityField];
```

#### 原则3：容错处理

```javascript
// ✅ 正确：容错处理
const getField = (obj, possibleNames) => {
  for (const name of possibleNames) {
    if (obj[name] !== undefined) return obj[name];
  }
  return null;
};

const quality = getField(metadata, ['high_quality_count', 'quality_count', 'hq_count']);
```

### 2.4 文件路径模板

**博主元数据路径模板**：
```
results/{博主名}_{sec_uid}/metadata.json
```

**视频分析结果路径模板**：
```
results/{博主名}_{sec_uid}/videos/{aweme_id}.json
```

**黑名单路径**：
```
data/blogger-blacklist.json
```

**统计数据路径**：
```
data/statistics.json
```

***

## 三、评估逻辑

### 3.1 快速判断逻辑

**触发条件**：阶段三完成后

**判断标准**：

| 指标           | 阈值 | 判断结果         |
| ------------ | -- | ------------ |
| **符合主题视频比例** | 0% | 立即加入黑名单      |
| **分析成功率**    | 0% | 标记为"无法分析"，观察 |

**符合主题视频比例计算**：

```
符合主题视频比例 = 符合主题的视频数 / 已分析视频数
```

**分析成功率计算**：

```
分析成功率 = (已分析视频数 - 分析失败视频数) / 已分析视频数
```

**判断视频是否符合主题**：

```
1. 读取视频的分析结果
2. 检查"领域"字段是否包含主题关键词
3. 检查"关键词"字段是否包含主题关键词
4. 检查"博主一句话总结"是否包含主题关键词
5. 如果任一匹配，则判定为符合主题
```

**主题关键词**（可根据实际情况扩展）：

- 创业、副业、赚钱、项目、商业、AI落地、变现、创业项目、副业项目、赚钱项目
**主题定义（可根据实际情况扩展）：
- 创业：分享创业相关的内容，如创业项目推荐、创业加盟咨询、创业方法论等。
- 副业：分享副业相关的内容，如副业兼职、副业项目推荐、副业加盟咨询等。
- 赚钱：分享赚钱相关的内容，如赚钱方法论、赚钱技巧、赚钱项目推荐等。
- 项目：分享项目相关的内容，如创业项目推荐、副业项目推荐、赚钱项目推荐等。
确保采集到的项目信息具备以下特征：具体可执行性、市场需求验证、启动成本与收益模型、操作步骤与所需技能、风险评估与应对策略。建立标准化数据收集模板，确保信息完整性与一致性，为后续的项目筛选、可行性分析及价值评估阶段积累充足且高质量的原始数据。

**判断流程**：

```
步骤1：读取博主列表
  - 路径：data/bloggers.json
  - 动态读取所有博主信息
  
步骤2：读取博主元数据
  - 路径模式：results/{博主名}_{sec_uid}/metadata.json
  - 动态发现博主目录
  - 动态识别字段结构
  
步骤3：读取视频分析结果
  - 路径模式：results/{博主名}_{sec_uid}/videos/{aweme_id}.json
  - 遍历 videos 数组
  - 动态识别视频质量字段
  
步骤4：计算符合主题视频比例
  - 统计符合主题的视频数
  - 计算比例
  
步骤5：判断处理
  - 如果比例为0%，立即加入黑名单
  - 如果分析成功率为0%，标记为"无法分析"
```

**数据读取示例**：

```javascript
// 步骤1：读取博主列表
const bloggers = JSON.parse(fs.readFileSync('data/bloggers.json', 'utf-8'));

// 步骤2：遍历博主
for (const blogger of bloggers) {
  // 动态发现博主目录
  const resultsDir = 'results/';
  const bloggerDirs = fs.readdirSync(resultsDir);
  const targetDir = bloggerDirs.find(dir => 
    dir.includes(blogger.name) || dir.includes(blogger.sec_uid.substring(0, 10))
  );
  
  if (!targetDir) continue;
  
  // 步骤3：读取博主元数据
  const metadataPath = `${resultsDir}${targetDir}/metadata.json`;
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  
  // 步骤4：动态识别字段
  const videos = metadata.videos || [];
  const totalVideos = videos.length;
  
  // 动态识别质量字段
  const qualityField = Object.keys(videos[0] || {}).find(key => 
    key.includes('quality') || key.includes('status')
  );
  
  // 步骤5：计算符合主题视频比例
  const matchedVideos = videos.filter(video => {
    const keywords = video.keywords || [];
    const category = video.category || '';
    const topic = video.topic || '';
    
    // 检查是否包含主题关键词
    const hasKeyword = keywords.some(kw => topicKeywords.includes(kw));
    const hasCategory = topicKeywords.some(tk => category.includes(tk));
    const hasTopic = topicKeywords.some(tk => topic.includes(tk));
    
    return hasKeyword || hasCategory || hasTopic;
  });
  
  const matchRatio = totalVideos > 0 ? matchedVideos.length / totalVideos : 0;
  
  // 步骤6：判断处理
  if (matchRatio === 0) {
    // 加入黑名单
    addToBlacklist(blogger, '符合主题视频比例为0%');
  }
}
```

***

### 3.2 综合判断逻辑

**触发条件**：持续跟进3-7天后

**判断标准**：

| 指标           | 权重  | 优秀   | 良好     | 一般     | 较差   |
| ------------ | --- | ---- | ------ | ------ | ---- |
| **符合主题视频比例** | 40% | ≥70% | 50-69% | 30-49% | <30% |
| **视频质量评分**   | 30% | ≥80分 | 60-79分 | 40-59分 | <40分 |
| **分析成功率**    | 20% | ≥80% | 60-79% | 40-59% | <40% |
| **视频数量**     | 10% | ≥10个 | 5-9个   | 2-4个   | <2个  |

**视频质量评分计算**：

```
视频质量评分 = 从分析结果中提取内容质量判断，转换为评分后计算平均值

内容质量判断转换规则：
- 高质量内容 → 90分
- 中等质量内容 → 70分
- 低质量内容 → 50分
```

**内容质量判断依据**：

```
1. 信息完整度：是否包含收入验证、可复制性、启动成本、时间灵活、市场竞争等关键信息
2. 实操性：是否提供具体操作步骤或方法论
3. 价值密度：单位时间内提供的有价值信息量
```

**综合评分计算**：

```
综合评分 = (符合主题视频比例得分 × 0.4) + (视频质量评分 × 0.3) + (分析成功率得分 × 0.2) + (视频数量得分 × 0.1)
```

**评分转换表**：

| 指标       | 优秀(100分) | 良好(80分) | 一般(60分) | 较差(40分) |
| -------- | -------- | ------- | ------- | ------- |
| 符合主题视频比例 | ≥70%     | 50-69%  | 30-49%  | <30%    |
| 视频质量评分   | ≥80分     | 60-79分  | 40-59分  | <40分    |
| 分析成功率    | ≥80%     | 60-79%  | 40-59%  | <40%    |
| 视频数量     | ≥10个     | 5-9个    | 2-4个    | <2个     |

**判断结果**：

| 综合评分   | 博主等级 | 处理方式  |
| ------ | ---- | ----- |
| ≥80分   | 优质博主 | 优先处理  |
| 60-79分 | 良好博主 | 正常处理  |
| 40-59分 | 一般博主 | 观察调整  |
| <40分   | 较差博主 | 加入黑名单 |

***

## 四、验收标准

### 4.1 博主优化验收标准

#### 核心指标

| 指标           | 优化前 | 优化后  | 验收标准         |
| ------------ | --- | ---- | ------------ |
| **平均博主质量评分** | 当前值 | 优化后值 | 提升 ≥10%      |
| **优质博主占比**   | 当前值 | 优化后值 | 提升 ≥15%      |
| **黑名单博主数**   | 当前值 | 优化后值 | 增加 ≤总博主数的20% |

**优质博主定义**：综合评分≥80分的博主

**优质博主占比计算**：

```
优质博主占比 = 优质博主数 / 总博主数
```

#### 验收流程

```
步骤1：记录优化前的数据
  - 记录每个博主的质量评分
  - 记录优质博主占比

步骤2：执行优化
  - 快速判断：立即加入黑名单
  - 综合判断：评估后决定是否保留

步骤3：等待新一轮搜索和分析
  - 用户手动执行阶段一、二、三
  - 等待执行完成后，收集新的数据
  - 注意：优化后需要重新执行流程才能验证效果

步骤4：对比优化前后数据
  - 计算平均博主质量评分提升
  - 计算优质博主占比提升
  - 统计黑名单博主数

步骤5：判断是否通过验收
  - 如果所有指标达标，则通过
  - 如果有指标未达标，则继续优化
```

***

## 五、边界条件

### 5.1 不执行优化的情况

| 边界条件         | 说明                           | 处理方式             |
| ------------ | ---------------------------- | ---------------- |
| **数据不足**     | 已分析视频数 <3个                   | 不执行综合判断，只执行快速判断  |
| **所有博主质量优秀** | 平均博主质量评分 ≥85分                | 不执行优化，记录"已达最优"   |
| **阶段三未完成**   | pipeline-state.json 显示阶段三未完成 | 不执行优化，提示用户先完成阶段三 |
| **持续跟进时间不足** | 距离博主发现时间 <3天                 | 不执行综合判断，只执行快速判断  |

### 5.2 优化无效的情况

| 边界条件          | 说明             | 处理方式               |
| ------------- | -------------- | ------------------ |
| **连续3次优化无效果** | 验收标准连续3次未达标    | 停止自动优化，记录问题，建议人工介入 |
| **博主质量判断异常**  | 所有博主都被判定为优质或较差 | 记录问题，建议人工检查判断逻辑    |
| **主题关键词不明确**  | 主题定义模糊或冲突      | 不执行优化，提示用户明确主题     |

### 5.3 需要人工介入的情况

| 边界条件          | 说明             | 处理方式            |
| ------------- | -------------- | --------------- |
| **博主质量持续下降**  | 优化后质量反而下降      | 记录问题，建议人工检查     |
| **黑名单博主比例异常** | 黑名单博主比例 >50%   | 记录问题，建议人工检查判断逻辑 |
| **数据异常**      | 文件损坏、数据丢失、格式错误 | 记录问题，不执行优化      |

### 5.4 异常处理

| 异常类型       | 处理方式             |
| ---------- | ---------------- |
| **文件读取失败** | 记录错误，跳过该文件       |
| **数据格式错误** | 记录错误，使用默认值       |
| **写入失败**   | 记录错误，不更新文件，保留原数据 |

***

## 六、约束条件

### 6.1 数量约束

| 约束类型        | 数量  | 说明           |
| ----------- | --- | ------------ |
| **最小博主数量**  | ≥5个 | 保证有足够的博主进行评估 |
| **最大博主数量**  | 无限制 | 可根据实际情况调整    |
| **最小分析视频数** | ≥3个 | 保证评估数据的有效性   |

### 6.2 质量约束

| 约束类型       | 规则            | 说明      |
| ---------- | ------------- | ------- |
| **快速判断阈值** | 符合主题视频比例 = 0% | 立即加入黑名单 |
| **综合判断阈值** | 综合评分 <40分     | 加入黑名单   |
| **优质博主阈值** | 综合评分 ≥80分     | 优先处理    |

### 6.3 时间约束

| 约束类型       | 时间        | 说明      |
| ---------- | --------- | ------- |
| **快速判断时机** | 阶段三完成后    | 立即执行    |
| **综合判断时机** | 博主发现后3-7天 | 持续跟进后执行 |

### 6.4 边界处理

| 情况             | 处理方式             |
| -------------- | ---------------- |
| **博主数量 <5个**   | 不执行优化，提示用户添加更多博主 |
| **已分析视频数 <3个** | 不执行综合判断，只执行快速判断  |
| **博主已在黑名单中**   | 跳过该博主            |
| **博主数据缺失**     | 记录问题，跳过该博主       |

***

## 七、工作流程

### 7.1 智能体工作流程

> ⚠️ **重要**：以下路径为实际项目结构，智能体在执行前必须先检查文件是否存在，动态读取文件结构。

```
步骤0：文件结构检查（强制）
  操作：
    - 使用 LS 工具查看项目根目录
    - 确认 data/ 目录存在
    - 确认 results/ 目录存在
    - 动态发现博主目录名称
  输出：
    - 确认的文件路径映射
    - 博主目录列表

步骤1：读取数据
  输入：
    - data/bloggers.json（博主列表）
    - results/{博主名}_{sec_uid}/metadata.json（博主元数据）
    - data/blogger-blacklist.json（博主黑名单）
    - results/{博主名}_{sec_uid}/videos/{aweme_id}.json（视频分析结果）
    - data/videos.json（视频列表）
    - data/statistics.json（统计信息）
  操作：
    - 动态读取所有文件
    - 动态识别字段结构
    - 验证数据完整性
  输出：
    - 数据加载成功/失败状态
    - 字段结构映射

步骤2：快速判断
  输入：
    - 博主元数据（从 metadata.json 动态读取）
    - 视频分析结果（从 videos/*.json 动态读取）
  操作：
    - 动态识别质量字段
    - 计算符合主题视频比例
    - 判断是否需要加入黑名单
  输出：
    - 需要加入黑名单的博主列表
    - 需要观察的博主列表

步骤3：综合判断
  输入：
    - 博主元数据
    - 视频分析结果
    - 视频列表
  操作：
    - 动态识别评分字段
    - 计算综合评分
    - 确定博主等级
  输出：
    - 博主质量评分
    - 博主等级

步骤4：生成优化建议
  输入：
    - 快速判断结果
    - 综合判断结果
  操作：
    - 汇总优化建议
    - 生成报告
  输出：
    - 优化建议报告

步骤5：执行优化
  输入：
    - 优化建议
  操作：
    - 更新 data/blogger-blacklist.json
    - 更新 data/bloggers.json（status 字段）
    - 生成优化报告文件
  输出：
    - 更新后的 data/blogger-blacklist.json
    - 更新后的 data/bloggers.json
    - reports/blogger-optimization-{日期}.md
```

### 7.2 数据读取流程示例

```javascript
// 步骤0：文件结构检查
const rootDir = 'd:/opencli/douyin-videos/';
const dataDir = `${rootDir}data/`;
const resultsDir = `${rootDir}results/`;

// 检查目录是否存在
if (!fs.existsSync(dataDir)) {
  throw new Error('data/ 目录不存在');
}

if (!fs.existsSync(resultsDir)) {
  throw new Error('results/ 目录不存在');
}

// 动态发现博主目录
const bloggerDirs = fs.readdirSync(resultsDir).filter(dir => {
  const stat = fs.statSync(`${resultsDir}${dir}`);
  return stat.isDirectory() && dir.includes('_MS4wLjAB');
});

// 步骤1：读取数据
const bloggers = JSON.parse(fs.readFileSync(`${dataDir}bloggers.json`, 'utf-8'));
const blacklist = JSON.parse(fs.readFileSync(`${dataDir}blogger-blacklist.json`, 'utf-8'));
const statistics = JSON.parse(fs.readFileSync(`${dataDir}statistics.json`, 'utf-8'));

// 步骤2：读取博主元数据
const bloggerMetadata = [];
for (const blogger of bloggers) {
  // 动态发现博主目录
  const targetDir = bloggerDirs.find(dir => 
    dir.includes(blogger.name) || dir.includes(blogger.sec_uid.substring(0, 10))
  );
  
  if (targetDir) {
    const metadataPath = `${resultsDir}${targetDir}/metadata.json`;
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    bloggerMetadata.push({ blogger, metadata, dir: targetDir });
  }
}

// 步骤3：动态识别字段
for (const { blogger, metadata, dir } of bloggerMetadata) {
  // 动态识别视频数组字段
  const videosField = Object.keys(metadata).find(key => 
    Array.isArray(metadata[key]) && key.includes('video')
  );
  
  const videos = metadata[videosField] || [];
  
  // 动态识别质量字段
  const qualityField = Object.keys(videos[0] || {}).find(key => 
    key.includes('quality') || key.includes('status')
  );
  
  // 计算符合主题视频比例
  const matchedVideos = videos.filter(video => {
    const keywords = video.keywords || [];
    const category = video.category || '';
    return keywords.some(kw => topicKeywords.includes(kw)) || 
           topicKeywords.some(tk => category.includes(tk));
  });
  
  const matchRatio = videos.length > 0 ? matchedVideos.length / videos.length : 0;
  
  // 判断处理
  if (matchRatio === 0) {
    // 加入黑名单
    blacklist.blacklist.push({
      name: blogger.name,
      author_id: blogger.author_id,
      sec_uid: blogger.sec_uid,
      reason: '符合主题视频比例为0%',
      added_at: new Date().toISOString()
    });
  }
}

// 步骤4：保存更新
fs.writeFileSync(`${dataDir}blogger-blacklist.json`, JSON.stringify(blacklist, null, 2));
```

***

## 八、输出文件

### 8.1 博主优化报告

**文件路径**: `d:\opencli\douyin-videos\reports\blogger-optimization-{日期}.md`

**格式**:

```markdown
# 博主优化报告

**生成时间**: 2026-04-11 12:00:00
**分析周期**: 2026-04-10 - 2026-04-11

---

## 📊 博主质量概览

| 博主名称 | 已分析视频数 | 符合主题比例 | 质量评分 | 等级 | 建议 |
|----------|--------------|--------------|----------|------|------|
| 胡说老王（干货版） | 8 | 12.5% | 45 | ⚠️ 一般 | 观察调整 |
| 志诚（创业那点事） | 2 | 100% | 85 | ✅ 优质 | 优先处理 |
| Rick讲AI实战 | 2 | 0% | 30 | ❌ 较差 | 加入黑名单 |

---

## 🔍 详细分析

### 博主：胡说老王（干货版）
- **已分析视频数**: 8
- **符合主题视频数**: 1
- **符合主题比例**: 12.5%
- **分析成功率**: 25%
- **视频质量评分**: 60
- **综合评分**: 45
- **等级**: 一般
- **建议**: 观察调整，持续跟进

---

## ✅ 优化建议

### 立即执行
- [ ] 加入黑名单：Rick讲AI实战（符合主题比例为0%）
- [ ] 标记观察：胡说老王（干货版）（质量一般）

### 观察调整
- [ ] 监控"志诚（创业那点事）"后续视频质量

---

**报告结束**
```

### 8.2 问题记录文件

**文件路径**: `d:\opencli\douyin-videos\optimization-feedback.json`

**格式**:

```json
{
  "version": "1.0",
  "updated_at": "2026-04-11T00:00:00.000Z",
  "issues": [
    {
      "id": "issue-001",
      "type": "blogger_low_quality",
      "stage": "stage3",
      "description": "博主'Rick讲AI实战'质量较差，符合主题比例为0%",
      "data": {
        "blogger_name": "Rick讲AI实战",
        "analyzed_videos": 2,
        "matched_videos": 0,
        "match_ratio": 0,
        "quality_score": 30
      },
      "created_at": "2026-04-11T10:00:00.000Z",
      "status": "pending"
    }
  ]
}
```

***

## 九、实现计划

### 9.1 开发任务

| 任务          | 优先级 | 状态    | 依赖            |
| ----------- | --- | ----- | ------------- |
| 设计博主优化智能体框架 | 高   | ✅ 已完成 | 无             |
| 实现快速判断逻辑    | 高   | 待开发   | 无             |
| 实现综合判断逻辑    | 高   | 待开发   | 无             |
| 实现优化执行逻辑    | 高   | 待开发   | 快速判断逻辑、综合判断逻辑 |
| 实现优化报告生成    | 中   | 待开发   | 优化执行逻辑        |
| 实现问题记录功能    | 中   | 待开发   | 无             |
| 实现验收标准检查    | 中   | 待开发   | 优化执行逻辑        |

### 9.2 开发时间线

| 阶段      | 任务            | 预计时间 |
| ------- | ------------- | ---- |
| **阶段一** | 实现快速判断逻辑      | 1天   |
| **阶段二** | 实现综合判断逻辑      | 1天   |
| **阶段三** | 实现优化执行逻辑      | 1天   |
| **阶段四** | 实现优化报告生成和问题记录 | 1天   |
| **阶段五** | 实现验收标准检查      | 0.5天 |

***

**文档结束**
