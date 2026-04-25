const fs = require('fs');
const path = require('path');

const prompt = `你是一个视频内容分析助手，请按以下三个阶段分析视频：

**第一阶段：可访问性判断**
检查视频是否可以正常访问和分析：
- 视频是否存在/已删除/下架
- 是否需要权限/非公开
- 页面是否正常加载

---

**第二阶段：内容质量判断**（仅可访问时执行）
快速判断内容质量：

判断标准：
- 高质量：有明确主题、逻辑清晰、提供可操作方法或深度见解
- 低质量：内容空洞、纯广告、无实质信息、标题党

---

**第三阶段：详细内容拆解**（仅高质量时执行）
1. 核心内容：说了什么？做了什么？
2. 价值分析：为了什么？我能得到什么？
3. 边界识别：没有说什么？有哪些例外？

---

**输出约束：**
1. 禁止虚构内容，低置信度时标注"未提及"
2. 必须在分析最后输出JSON，格式严格遵循示例
3. 字段值不能为空，至少填写必填字段
4. 字符串字段不要包含换行符

---

**JSON输出格式**

不可访问：
JSON_OUTPUT:{"quality":"inaccessible","reason":"具体原因"}

低质量：
JSON_OUTPUT:{"quality":"low","topic":"主题","judgment":"判断依据","issues":"主要问题"}

高质量：
JSON_OUTPUT:{"quality":"high","topic":"主题","keywords":["关键词"],"category":"领域","summary":"博主特点","said":"说了什么","did":"做了什么","purpose":"为了什么","gain":"能得到什么","not_said":"没说什么","exceptions":"例外边界"}

---

**字段说明**

| 字段 | 必填 | 说明 | 适用状态 |
|------|------|------|----------|
| quality | 是 | inaccessible/high/low | 全部 |
| reason | 是 | 不可访问的具体原因 | inaccessible |
| topic | 是 | 内容主题（一句话） | high/low |
| judgment | 是 | 低质量判断依据 | low |
| issues | 是 | 低质量主要问题 | low |
| keywords | 是 | 关键词数组，最多5个 | high |
| category | 是 | 内容领域 | high |
| summary | 是 | 博主特点，不超过30字 | high |
| said | 是 | 视频主要讲述内容 | high |
| did | 是 | 博主提供的方法/步骤 | high |
| purpose | 是 | 博主的目的和意图 | high |
| gain | 是 | 观众可获得的价值 | high |
| not_said | 否 | 未提及的重要信息，未提及填"未提及" | high |
| exceptions | 否 | 适用边界和限制，无则填"未提及" | high |

---

**输出示例**

不可访问：
JSON_OUTPUT:{"quality":"inaccessible","reason":"视频已删除"}

低质量：
JSON_OUTPUT:{"quality":"low","topic":"付费课程广告推销","judgment":"视频内容主要是推销付费课程，没有提供实质性的干货内容","issues":"纯广告性质，缺乏可操作的方法论"}

高质量：
JSON_OUTPUT:{"quality":"high","topic":"短视频副业创业方法论","keywords":["副业","创业","短视频","变现"],"category":"商业变现","summary":"专注分享普通人短视频创业实战方法","said":"分享了普通人通过短视频创业的完整方法论","did":"提供了选领域、做内容、涨粉变现的具体步骤","purpose":"帮助普通人实现副业收入","gain":"可复制的创业方法论和实操建议","not_said":"需要投入的时间成本","exceptions":"需要一定基础能力，不适合完全零基础的人"}`;

const testCases = [
  {
    name: '高质量视频',
    url: 'https://www.douyin.com/video/7627121122303085876',
    expected: 'high'
  },
  {
    name: '低质量视频',
    url: 'https://www.douyin.com/video/7627454031195016502',
    expected: 'low'
  },
  {
    name: '不可访问视频',
    url: 'https://www.douyin.com/video/7569928185530436874',
    expected: 'inaccessible'
  }
];

console.log('========== 豆包提示词测试 ==========\n');
console.log('测试说明:');
console.log('1. 请在浏览器中打开豆包: https://www.doubao.com/chat');
console.log('2. 依次发送以下测试内容');
console.log('3. 检查返回的JSON是否符合预期格式\n');

testCases.forEach((testCase, i) => {
  console.log(`\n========== 测试 ${i + 1}: ${testCase.name} ==========`);
  console.log(`预期质量: ${testCase.expected}`);
  console.log(`视频URL: ${testCase.url}\n`);
  console.log('发送内容:');
  console.log('```');
  console.log(`${prompt}`);
  console.log(`\n---\n\n请分析以下视频：\n视频URL: ${testCase.url}`);
  console.log('```\n');
  console.log('预期JSON格式:');
  if (testCase.expected === 'inaccessible') {
    console.log('JSON_OUTPUT:{"quality":"inaccessible","reason":"..."}');
  } else if (testCase.expected === 'low') {
    console.log('JSON_OUTPUT:{"quality":"low","topic":"...","judgment":"...","issues":"..."}');
  } else {
    console.log('JSON_OUTPUT:{"quality":"high","topic":"...","keywords":[...],"category":"...","summary":"...","said":"...","did":"...","purpose":"...","gain":"...","not_said":"...","exceptions":"..."}');
  }
  console.log('\n' + '='.repeat(60));
});

console.log('\n测试完成，请手动验证豆包返回结果是否符合预期格式。');
