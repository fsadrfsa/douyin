const { execSync } = require('child_process');

const prompt = `你是一个项目信息收集助手，请按以下三个阶段分析视频：

**核心目标**：识别视频中是否包含可落地执行的项目信息（创业/副业/赚钱项目）

**重要说明**：
- **方法论本身就是项目信息**：口播账号运营、短视频创业、自媒体变现等都是具体项目
- **项目定义**：任何可以实际操作并可能产生收益的事情都是项目
- **不要只看字面意思**：即使没有明确说"项目"二字，只要提供了可操作的方法，就是高质量

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
2. **方法论**：提供 ≥3 个可操作步骤，可用于实际执行（如：口播账号起号、短视频运营、自媒体变现等）
3. **商业建议**：有明确建议 + 适用场景 + 落地思路
4. **案例拆解**：有具体案例 + 复制路径 + 关键要素

**低质量标准**（无项目信息价值，满足任一即为低质量）：
1. **纯广告**：卖课/卖货/引流，无实质项目信息
2. **纯观点**：讲道理/讲认知/讲思维，无具体方法或项目
3. **纯热点**：蹭热点/讲故事，无项目信息
4. **信息碎片**：零散观点，无落地路径
5. **标题党**：标题与内容不符，无实际价值

**关键判断问题**：
- 视频是否提供了可操作的步骤或方法？
- 观众看完能否知道"怎么做"？
- 这些方法是否可以用于创业/副业/赚钱？

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
5. **JSON必须严格遵循格式：字段名和字符串值必须用双引号包裹**

---

**JSON输出格式**

不可访问：
JSON_OUTPUT:{"quality":"inaccessible","reason":"具体原因"}

低质量：
JSON_OUTPUT:{"quality":"low","topic":"主题","project_related":false,"judgment":"判断依据","issues":"主要问题"}

高质量：
JSON_OUTPUT:{"quality":"high","topic":"主题","project_related":true,"project_name":"项目名称","keywords":["关键词"],"category":"领域","summary":"博主特点","how_to_do":"怎么做","investment":"投入","return":"收益","target":"适合人群","risks":"风险提示"}

---

**输出示例**

不可访问：
JSON_OUTPUT:{"quality":"inaccessible","reason":"视频已删除"}

低质量（纯观点）：
JSON_OUTPUT:{"quality":"low","topic":"创业思维重要性","project_related":false,"judgment":"仅讲认知和思维，未提供可操作方法","issues":"纯观点类内容，无项目信息"}

高质量（方法论）：
JSON_OUTPUT:{"quality":"high","topic":"口播账号起号方法论","project_related":true,"project_name":"口播账号运营","keywords":["口播账号","短视频创业","起号方法"],"category":"短视频运营","summary":"专注分享口播账号运营的实战派","how_to_do":"定位→内容→运营三步走","investment":"需要手机、表达能力","return":"未提及","target":"有一定表达能力的创业者","risks":"未提及"}`;

const testCases = [
  {
    name: '测试2：低质量视频（纯热点）',
    url: 'https://www.douyin.com/video/7627454031195016502',
    expected: 'low'
  },
  {
    name: '测试3：不可访问视频',
    url: 'https://www.douyin.com/video/7569928185530436874',
    expected: 'inaccessible'
  }
];

async function runTest(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${testCase.name}`);
  console.log(`预期质量: ${testCase.expected}`);
  console.log(`视频URL: ${testCase.url}`);
  console.log('='.repeat(60));
  
  const fullPrompt = `${prompt}\n\n请分析以下视频：\n视频URL: ${testCase.url}`;
  
  console.log('\n正在发送提示词到豆包...');
  
  try {
    const escapedPrompt = fullPrompt.replace(/"/g, '""');
    const result = execSync(`opencli doubao ask --timeout 120 "${escapedPrompt}"`, {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 10,
      timeout: 150000,
      shell: 'powershell.exe'
    });
    
    console.log('\n豆包返回结果:');
    
    const lines = result.split('\n');
    const lastJsonLine = lines.reverse().find(line => line.includes('JSON_OUTPUT:'));
    
    if (lastJsonLine) {
      console.log(lastJsonLine);
      
      const jsonMatch = lastJsonLine.match(/JSON_OUTPUT:\s*(\{.+\})/s);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          console.log('\n解析的JSON:');
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (jsonData.quality === testCase.expected) {
            console.log('\n✅ 测试通过：质量判断符合预期');
          } else {
            console.log(`\n❌ 测试失败：预期 ${testCase.expected}，实际 ${jsonData.quality}`);
          }
        } catch (e) {
          console.log('\n⚠️ JSON解析失败:', e.message);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

async function main() {
  console.log('========== 豆包提示词测试（项目信息收集导向）==========\n');
  console.log('核心目标：识别视频中是否包含可落地执行的项目信息\n');
  
  for (const testCase of testCases) {
    await runTest(testCase);
    console.log('\n等待5秒后继续下一个测试...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('\n所有测试完成！');
}

main().catch(console.error);
