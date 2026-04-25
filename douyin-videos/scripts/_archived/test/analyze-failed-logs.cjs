const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = "d:\\opencli\\douyin-videos";
const LOGS_DIR = path.join(PROJECT_ROOT, "data", "logs");

function analyzeFailedLogs() {
  const files = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith("failed-"));

  const errorTypes = {};
  const stageStats = {};
  const authorStats = {};
  const samples = {};

  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, f), "utf-8"));
      const error = data.error || "unknown";
      const stage = data.stage || "unknown";
      const author = data.author || "unknown";

      let errorCategory = error;
      if (error.includes("ENOENT")) errorCategory = "ENOENT: 文件不存在";
      else if (error.includes("Page not found")) errorCategory = "Page not found: 页面失效";
      else if (error.includes("JSON解析失败")) errorCategory = "JSON解析失败";
      else if (error.includes("分析结果无效")) errorCategory = "分析结果无效";
      else if (error.includes("timeout")) errorCategory = "超时";
      else if (error.includes("ECONNREFUSED")) errorCategory = "连接被拒绝";
      else if (error.includes("network")) errorCategory = "网络错误";

      errorTypes[errorCategory] = (errorTypes[errorCategory] || 0) + 1;
      stageStats[stage] = (stageStats[stage] || 0) + 1;
      authorStats[author] = (authorStats[author] || 0) + 1;

      if (!samples[errorCategory]) {
        samples[errorCategory] = {
          video_id: data.video_id,
          url: data.url,
          author: data.author,
          error: data.error,
        };
      }
    } catch (e) {}
  }

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║              失败日志根因分析报告                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n总失败数: ${files.length}`);
  console.log("\n⚠️  注意: 所有失败均来自已废弃的 Stage 3 (内容分析)");
  console.log("    Stage 3 已废弃，这些是历史遗留数据，无需处理");

  console.log("\n" + "─".repeat(50));
  console.log("一、按错误类型分布");
  console.log("─".repeat(50));
  const sortedErrors = Object.entries(errorTypes).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedErrors) {
    const pct = ((count / files.length) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(count / files.length * 20));
    console.log(`  ${type}`);
    console.log(`    数量: ${count} (${pct}%) ${bar}`);
  }

  console.log("\n" + "─".repeat(50));
  console.log("二、按阶段分布");
  console.log("─".repeat(50));
  for (const [stage, count] of Object.entries(stageStats)) {
    console.log(`  ${stage}: ${count} 个`);
  }

  console.log("\n" + "─".repeat(50));
  console.log("三、按博主分布 (Top 10)");
  console.log("─".repeat(50));
  const sortedAuthors = Object.entries(authorStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [author, count] of sortedAuthors) {
    console.log(`  ${author}: ${count} 个`);
  }

  console.log("\n" + "─".repeat(50));
  console.log("四、各错误类型样本");
  console.log("─".repeat(50));
  for (const [type, sample] of Object.entries(samples)) {
    console.log(`\n  [${type}]`);
    console.log(`    video_id: ${sample.video_id}`);
    console.log(`    author: ${sample.author}`);
    console.log(`    error: ${sample.error.substring(0, 80)}${sample.error.length > 80 ? "..." : ""}`);
  }

  console.log("\n" + "─".repeat(50));
  console.log("五、结论");
  console.log("─".repeat(50));
  console.log("\n  ⚠️  Stage 3 已废弃，这些失败日志是历史遗留数据");
  console.log("  当前 Pipeline: Stage 1 → Stage 2 → Stage 4 (音频+转录)");
  console.log("  无需处理这些失败记录，可考虑清理日志文件");

  const rootCauses = [];

  if (errorTypes["ENOENT: 文件不存在"]) {
    rootCauses.push({
      id: "RC-LOG-1",
      name: "博主目录/文件缺失",
      count: errorTypes["ENOENT: 文件不存在"],
      severity: "high",
      cause: "Stage 2 采集时博主目录命名与 Stage 3 分析时不一致，或采集未完成就进入分析",
      fix: "统一博主目录命名规范，确保采集完成后再分析",
    });
  }

  if (errorTypes["Page not found: 页面失效"]) {
    rootCauses.push({
      id: "RC-LOG-2",
      name: "抖音页面失效",
      count: errorTypes["Page not found: 页面失效"],
      severity: "medium",
      cause: "视频已删除/私密/下架，或 OpenCLI 页面会话过期",
      fix: "增加页面失效检测，自动跳过或标记为 unavailable",
    });
  }

  if (errorTypes["JSON解析失败"]) {
    rootCauses.push({
      id: "RC-LOG-3",
      name: "AI 输出格式错误",
      count: errorTypes["JSON解析失败"],
      severity: "high",
      cause: "AI 返回非 JSON 格式，或 JSON 结构不完整",
      fix: "增加 AI 输出格式校验，失败时重试",
    });
  }

  if (errorTypes["分析结果无效"]) {
    rootCauses.push({
      id: "RC-LOG-4",
      name: "分析结果校验失败",
      count: errorTypes["分析结果无效"],
      severity: "medium",
      cause: "AI 返回的 JSON 缺少必需字段或字段值无效",
      fix: "强化校验逻辑，提供更明确的错误提示",
    });
  }

  for (const rc of rootCauses) {
    console.log(`\n  ${rc.id}: ${rc.name} (${rc.count} 个)`);
    console.log(`    严重性: ${rc.severity}`);
    console.log(`    根因: ${rc.cause}`);
    console.log(`    修复建议: ${rc.fix}`);
  }

  const report = {
    generated_at: new Date().toISOString(),
    total_failures: files.length,
    error_types: errorTypes,
    stage_stats: stageStats,
    author_stats: authorStats,
    samples,
    root_causes: rootCauses,
  };

  const reportPath = path.join(
    PROJECT_ROOT,
    "data",
    "health-reports",
    `failed-logs-analysis-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n报告已保存: ${reportPath}`);
}

analyzeFailedLogs();
