const fs = require('fs');
const path = require('path');

const prompt = `你是一个项目信息收集助手，请按以下三个阶段分析视频：

**核心目标**：识别视频中是否包含可落地执行的项目信息（创业/副业/赚钱项目）

---

**第一阶段：可访问性判断**
检查视频是否可以正常访问和分析：
- 视频是否存在/已删除/下架
- 是否需要权限/非公开
- 页面是否正常加载

---

**第二阶段：项目信息价值判断**（仅可访问时执行）

**高质量标准**（包含可落地项目信息，满足任一即可）：
1. **具体项目**：提到具体项目名称 + 操作方式 + 收益预期
2. **方法论**：提供 ≥3 个可操作步骤，可用于实际执行
3. **商业建议**：有明确建议 + 适用场景 + 落地思路
4. **案例拆解**：有具体案例 + 复制路径 + 关键要素

**低质量标准**（无项目信息价值，满足任一即为低质量）：
1. **纯广告**：卖课/卖货/引流，无实质项目信息
2. **纯观点**：讲道理/讲认知/讲思维，无具体项目
3. **纯热点**：蹭热点/讲故事，无项目信息
4. **信息碎片**：零散观点，无落地路径
5. **标题党**：标题与内容不符，无实际价值

**关键判断问题**：
- 视频是否提到了具体项目/生意/赚钱方式？
- 是否提供了可操作的步骤或方法？
- 观众看完能否知道"怎么做"？

---

**第三阶段：项目信息提取**（仅高质量时执行）
1. 项目名称：具体是什么项目？
2. 操作方式：怎么做？有哪些步骤？
3. 投入产出：需要什么？能赚多少？
4. 适用人群：适合谁做？有什么门槛？
5. 风险提示：有什么坑？需要注意什么？

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
JSON_OUTPUT:{"quality":"low","topic":"主题","project_related":false,"judgment":"判断依据","issues":"主要问题"}

高质量：
JSON_OUTPUT:{"quality":"high","topic":"主题","project_related":true,"project_name":"项目名称","keywords":["关键词"],"category":"领域","summary":"博主特点","how_to_do":"怎么做","investment":"投入","return":"收益","target":"适合人群","risks":"风险提示"}

---

**字段说明**

| 字段 | 必填 | 说明 | 适用状态 |
|------|------|------|----------|
| quality | 是 | inaccessible/high/low | 全部 |
| reason | 是 | 不可访问的具体原因 | inaccessible |
| topic | 是 | 内容主题（一句话） | high/low |
| project_related | 是 | 是否包含项目信息 | high/low |
| judgment | 是 | 低质量判断依据 | low |
| issues | 是 | 低质量主要问题 | low |
| project_name | 是 | 具体项目名称 | high |
| keywords | 是 | 关键词数组，最多5个 | high |
| category | 是 | 内容领域 | high |
| summary | 是 | 博主特点，不超过30字 | high |
| how_to_do | 是 | 操作方式/步骤 | high |
| investment | 否 | 投入成本，未提及填"未提及" | high |
| return | 否 | 收益预期，未提及填"未提及" | high |
| target | 否 | 适用人群，未提及填"未提及" | high |
| risks | 否 | 风险提示，未提及填"未提及" | high |

---

**输出示例**

不可访问：
JSON_OUTPUT:{"quality":"inaccessible","reason":"视频已删除"}

低质量（纯观点）：
JSON_OUTPUT:{"quality":"low","topic":"创业思维重要性","project_related":false,"judgment":"仅讲认知和思维，未提及具体项目","issues":"纯观点类内容，无项目信息"}

低质量（纯广告）：
JSON_OUTPUT:{"quality":"low","topic":"付费课程推销","project_related":false,"judgment":"主要目的是卖课，无实质项目信息","issues":"纯广告性质，缺乏项目信息"}

高质量（具体项目）：
JSON_OUTPUT:{"quality":"high","topic":"口播账号起号项目","project_related":true,"project_name":"口播账号运营","keywords":["口播账号","短视频创业","起号方法"],"category":"短视频运营","summary":"专注分享口播账号运营的实战派","how_to_do":"定位→内容→运营三步走","investment":"需要手机、表达能力","return":"未提及","target":"有一定表达能力的创业者","risks":"未提及"}

高质量（商业建议）：
JSON_OUTPUT:{"quality":"high","topic":"品牌承接稀缺资源的建议","project_related":true,"project_name":"品牌资源承接","keywords":["品牌合作","资源承接","商业思维"],"category":"商业财经","summary":"结合热点分享品牌运营思路的商业博主","how_to_do":"给出品牌承接稀缺资源的3个建议","investment":"未提及","return":"未提及","target":"有品牌资源的企业","risks":"未提及"}`;

const testCases = [
  {
    name: '高质量视频（口播账号项目）',
    url: 'https://www.douyin.com/video/7627121122303085876',
    expected: 'high',
    reason: '应该包含口播账号起号的具体方法'
  },
  {
    name: '低质量视频（纯热点）',
    url: 'https://www.douyin.com/video/7627454031195016502',
    expected: 'low',
    reason: '之前被判定为低质量，需要验证新标准下的判断'
  },
  {
    name: '不可访问视频',
    url: 'https://www.douyin.com/video/7569928185530436874',
    expected: 'inaccessible',
    reason: '视频不存在或已删除'
  }
];

console.log('========== 豆包提示词测试（项目信息收集导向）==========\n');
console.log('测试说明:');
console.log('1. 请在浏览器中打开豆包: https://www.doubao.com/chat');
console.log('2. 依次发送以下测试内容');
console.log('3. 检查返回的JSON是否符合预期格式\n');
console.log('核心目标：识别视频中是否包含可落地执行的项目信息\n');

testCases.forEach((testCase, i) => {
  console.log(`\n========== 测试 ${i + 1}: ${testCase.name} ==========`);
  console.log(`预期质量: ${testCase.expected}`);
  console.log(`预期原因: ${testCase.reason}`);
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
    console.log('JSON_OUTPUT:{"quality":"low","topic":"...","project_related":false,"judgment":"...","issues":"..."}');
  } else {
    console.log('JSON_OUTPUT:{"quality":"high","topic":"...","project_related":true,"project_name":"...","keywords":[...],"category":"...","summary":"...","how_to_do":"...","investment":"...","return":"...","target":"...","risks":"..."}');
  }
  console.log('\n验证要点:');
  console.log('- project_related 字段是否正确');
  console.log('- 是否包含 project_name（高质量时）');
  console.log('- judgment 是否符合新标准');
  console.log('\n' + '='.repeat(60));
});

console.log('\n测试完成，请手动验证豆包返回结果是否符合预期格式。');
console.log('\n关键验证项:');
console.log('1. 高质量视频是否识别出项目名称');
console.log('2. 低质量视频是否正确判断为无项目信息');
console.log('3. project_related 字段是否准确');
