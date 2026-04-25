import * as fs from "fs";
import * as path from "path";

const RESULTS_DIR = "D:/opencli/douyin-videos/results";
const DATA_DIR = "D:/opencli/douyin-videos/data";
const FILTER_REPORT_PATH = path.join(DATA_DIR, "filter-report.json");

const PROJECT_KEYWORDS = [
  "创业",
  "副业",
  "赚钱",
  "项目",
  "商业",
  "变现",
  "兼职",
  "轻资产",
  "低成本",
  "零成本",
  "一人公司",
  "超级个体",
  "自媒体",
  "AI赚钱",
  "AI创业",
  "个人IP",
  "搞钱",
];

function loadAllBloggers() {
  const bloggers = [];
  for (const d of fs.readdirSync(RESULTS_DIR)) {
    const mp = path.join(RESULTS_DIR, d, "metadata.json");
    if (!fs.existsSync(mp)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(mp, "utf-8"));
      bloggers.push(m);
    } catch {}
  }
  return bloggers;
}

function loadFilterReport() {
  if (!fs.existsSync(FILTER_REPORT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(FILTER_REPORT_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function calcContentRelevance(blogger) {
  const sourceKw = blogger.source_keyword || "";
  const category = blogger.category || "";
  const signature = blogger.signature || "";
  const combined = (sourceKw + " " + category + " " + signature).toLowerCase();

  let matchCount = 0;
  for (const kw of PROJECT_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) matchCount++;
  }

  const ratio = matchCount / PROJECT_KEYWORDS.length;

  if (ratio >= 0.3) return 100;
  if (ratio >= 0.15) return 70;
  if (ratio >= 0.05) return 40;
  if (ratio > 0) return 20;
  return 0;
}

function calcFollowerValue(followerCount, collected) {
  if (!followerCount || followerCount <= 0) return 0;

  let base;
  if (followerCount >= 1000000) base = 100;
  else if (followerCount >= 500000) base = 85;
  else if (followerCount >= 100000) base = 70;
  else if (followerCount >= 50000) base = 55;
  else if (followerCount >= 10000) base = 40;
  else if (followerCount >= 5000) base = 25;
  else base = 10;

  if (collected === 0) {
    return base * 0.4;
  }

  return base;
}

function calcCollectionEfficiency(blogger) {
  const collected = blogger.collected_video_count || 0;
  const videosInMeta = blogger.videos?.length || 0;
  const effectiveCollected = Math.max(collected, videosInMeta);

  if (effectiveCollected >= 5) return 100;
  if (effectiveCollected >= 3) return 80;
  if (effectiveCollected >= 2) return 60;
  if (effectiveCollected >= 1) return 40;
  return 0;
}

function calcFilterStructure(blogger, filterReport) {
  const collected = blogger.collected_video_count || 0;

  if (!filterReport) {
    return collected > 0 ? 70 : 30;
  }

  const secUid = blogger.sec_uid;
  const noVideoEntry = filterReport.bloggers_without_new_videos?.find(
    (b) => b.sec_uid === secUid,
  );

  if (!noVideoEntry) {
    return collected > 0 ? 80 : 30;
  }

  const reasons = noVideoEntry.filter_reasons || {};
  const total =
    (reasons.duplicate || 0) +
    (reasons.too_short || 0) +
    (reasons.irrelevant || 0) +
    (reasons.author_mismatch || 0) +
    (reasons.image_post || 0);

  if (total === 0) return collected > 0 ? 60 : 30;

  const duplicateRatio = (reasons.duplicate || 0) / total;
  const tooShortRatio = (reasons.too_short || 0) / total;
  const irrelevantRatio = (reasons.irrelevant || 0) / total;

  if (duplicateRatio >= 0.8) return 90;
  if (irrelevantRatio >= 0.8) return 10;
  if (tooShortRatio >= 0.8) return 25;
  if (tooShortRatio >= 0.5) return 35;
  if (irrelevantRatio >= 0.5) return 20;

  return 60;
}

function calcPlatformVideoFactor(blogger) {
  const platformTotal = blogger.video_count || 0;
  const collected = blogger.collected_video_count || 0;
  const contentRelevance = calcContentRelevance(blogger);

  if (platformTotal > 0 && collected === 0) {
    if (contentRelevance >= 70) {
      if (platformTotal >= 100) return 45;
      if (platformTotal >= 50) return 50;
      if (platformTotal >= 20) return 55;
      return 60;
    }
    if (contentRelevance >= 40) {
      if (platformTotal >= 100) return 30;
      if (platformTotal >= 50) return 35;
      if (platformTotal >= 20) return 40;
      return 50;
    }
    if (platformTotal >= 100) return 15;
    if (platformTotal >= 50) return 20;
    if (platformTotal >= 20) return 25;
    return 35;
  }

  if (platformTotal > 0 && collected > 0) {
    const collectionRate = collected / platformTotal;
    if (collectionRate >= 0.1) return 100;
    if (collectionRate >= 0.05) return 80;
    if (collectionRate >= 0.02) return 60;
    return 40;
  }

  if (platformTotal === 0 && collected > 0) return 70;
  if (platformTotal === 0 && collected === 0) return 20;

  return 50;
}

function evaluateBlogger(blogger, filterReport) {
  const collected = blogger.collected_video_count || 0;
  const contentRelevance = calcContentRelevance(blogger);
  const followerValue = calcFollowerValue(blogger.follower_count, collected);
  const collectionEfficiency = calcCollectionEfficiency(blogger);
  const filterStructure = calcFilterStructure(blogger, filterReport);
  const platformVideoFactor = calcPlatformVideoFactor(blogger);

  let relevanceW, followerW, collectionW, filterW, platformW;

  if (collected > 0) {
    relevanceW = 0.25;
    followerW = 0.15;
    collectionW = 0.3;
    filterW = 0.15;
    platformW = 0.15;
  } else {
    relevanceW = 0.4;
    followerW = 0.1;
    collectionW = 0.0;
    filterW = 0.25;
    platformW = 0.25;
  }

  const qualityScore =
    contentRelevance * relevanceW +
    followerValue * followerW +
    collectionEfficiency * collectionW +
    filterStructure * filterW +
    platformVideoFactor * platformW;

  let grade;
  let action;
  if (qualityScore >= 70) {
    grade = "A";
    action = "优先采集";
  } else if (qualityScore >= 50) {
    grade = "B";
    action = "正常采集";
  } else if (qualityScore >= 30) {
    grade = "C";
    action = "降低频率观察";
  } else {
    grade = "D";
    action = "建议移除";
  }

  return {
    blogger: blogger.blogger_name,
    sec_uid: blogger.sec_uid,
    scores: {
      contentRelevance,
      followerValue,
      collectionEfficiency,
      filterStructure,
      platformVideoFactor,
    },
    weights: { relevanceW, followerW, collectionW, filterW, platformW },
    qualityScore: Math.round(qualityScore * 10) / 10,
    grade,
    action,
    context: {
      collected: blogger.collected_video_count || 0,
      platform_total: blogger.video_count || 0,
      followers: blogger.follower_count || 0,
      source_keyword: blogger.source_keyword || "",
      relevance_score: blogger.relevance_score || "N/A",
    },
  };
}

function runBoundaryTests() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 边界测试");
  console.log("=".repeat(70));

  const tests = [
    {
      name: "全0博主（无任何数据）",
      blogger: {
        blogger_name: "测试_全0",
        sec_uid: "test_all_zero",
        collected_video_count: 0,
        video_count: 0,
        follower_count: 0,
        source_keyword: "",
        category: "",
        signature: "",
        videos: [],
      },
      expected: { minScore: 0, maxScore: 20, grade: "D" },
    },
    {
      name: "高粉丝但0采集（短视频博主）",
      blogger: {
        blogger_name: "测试_高粉0采",
        sec_uid: "test_high_follower_0_collect",
        collected_video_count: 0,
        video_count: 200,
        follower_count: 1000000,
        source_keyword: "创业",
        category: "创业经验",
        signature: "分享创业干货",
        videos: [],
      },
      expected: { minScore: 20, maxScore: 45, grade: "C" },
    },
    {
      name: "低粉丝高采集（精准博主）",
      blogger: {
        blogger_name: "测试_低粉高采",
        sec_uid: "test_low_follower_high_collect",
        collected_video_count: 5,
        video_count: 30,
        follower_count: 5000,
        source_keyword: "零成本创业",
        category: "创业项目分享",
        signature: "专注零成本创业项目",
        videos: new Array(5).fill({}),
      },
      expected: { minScore: 60, maxScore: 90, grade: "A" },
    },
    {
      name: "高粉丝高采集（优质博主）",
      blogger: {
        blogger_name: "测试_优质博主",
        sec_uid: "test_premium",
        collected_video_count: 8,
        video_count: 100,
        follower_count: 500000,
        source_keyword: "AI赚钱",
        category: "AI创业变现",
        signature: "分享AI赚钱项目",
        videos: new Array(8).fill({}),
      },
      expected: { minScore: 70, maxScore: 100, grade: "A" },
    },
    {
      name: "无关内容博主（irrelevant高）",
      blogger: {
        blogger_name: "测试_无关内容",
        sec_uid: "test_irrelevant",
        collected_video_count: 0,
        video_count: 50,
        follower_count: 200000,
        source_keyword: "搞笑",
        category: "搞笑段子",
        signature: "每天一个搞笑视频",
        videos: [],
      },
      expected: { minScore: 0, maxScore: 30, grade: "D" },
    },
    {
      name: "platform_total=0但高采集（数据缺失）",
      blogger: {
        blogger_name: "测试_数据缺失",
        sec_uid: "test_data_missing",
        collected_video_count: 3,
        video_count: 0,
        follower_count: 300000,
        source_keyword: "自媒体变现",
        category: "自媒体运营",
        signature: "自媒体变现教学",
        videos: new Array(3).fill({}),
      },
      expected: { minScore: 50, maxScore: 80, grade: "B" },
    },
    {
      name: "极高粉丝但完全无关",
      blogger: {
        blogger_name: "测试_高粉无关",
        sec_uid: "test_high_follower_irrelevant",
        collected_video_count: 0,
        video_count: 500,
        follower_count: 10000000,
        source_keyword: "美食",
        category: "美食探店",
        signature: "分享美食",
        videos: [],
      },
      expected: { minScore: 0, maxScore: 25, grade: "D" },
    },
    {
      name: "中等粉丝中等采集（典型博主）",
      blogger: {
        blogger_name: "测试_典型博主",
        sec_uid: "test_typical",
        collected_video_count: 2,
        video_count: 60,
        follower_count: 80000,
        source_keyword: "副业赚钱",
        category: "副业项目",
        signature: "分享副业赚钱方法",
        videos: new Array(2).fill({}),
      },
      expected: { minScore: 50, maxScore: 75, grade: "B" },
    },
    {
      name: "仅keyword匹配但0采集0粉丝",
      blogger: {
        blogger_name: "测试_仅keyword",
        sec_uid: "test_keyword_only",
        collected_video_count: 0,
        video_count: 0,
        follower_count: 100,
        source_keyword: "创业",
        category: "",
        signature: "",
        videos: [],
      },
      expected: { minScore: 15, maxScore: 40, grade: "D" },
    },
    {
      name: "有采集但全部duplicate（活跃博主）",
      blogger: {
        blogger_name: "测试_全duplicate",
        sec_uid: "test_all_duplicate",
        collected_video_count: 2,
        video_count: 100,
        follower_count: 200000,
        source_keyword: "商业思维",
        category: "商业分析",
        signature: "深度商业分析",
        videos: new Array(2).fill({}),
      },
      expected: { minScore: 50, maxScore: 75, grade: "B" },
    },
    {
      name: "0采集+高相关+高粉丝+平台视频多（值得深挖）",
      blogger: {
        blogger_name: "测试_值得深挖",
        sec_uid: "test_worth_deep",
        collected_video_count: 0,
        video_count: 190,
        follower_count: 150000,
        source_keyword: "一人创业项目推荐",
        category: "创业项目分享",
        signature: "专注一人创业项目",
        videos: [],
      },
      expected: { minScore: 30, maxScore: 55, grade: "C" },
    },
    {
      name: "0采集+0相关+0粉丝+0平台（彻底无价值）",
      blogger: {
        blogger_name: "测试_彻底无价值",
        sec_uid: "test_worthless",
        collected_video_count: 0,
        video_count: 0,
        follower_count: 0,
        source_keyword: "",
        category: "",
        signature: "",
        videos: [],
      },
      expected: { minScore: 0, maxScore: 25, grade: "D" },
    },
  ];

  const filterReportForTest = {
    bloggers_without_new_videos: [
      {
        sec_uid: "test_irrelevant",
        filter_reasons: {
          duplicate: 0,
          too_short: 1,
          irrelevant: 9,
          author_mismatch: 0,
          image_post: 0,
        },
      },
      {
        sec_uid: "test_high_follower_0_collect",
        filter_reasons: {
          duplicate: 0,
          too_short: 8,
          irrelevant: 2,
          author_mismatch: 0,
          image_post: 0,
        },
      },
      {
        sec_uid: "test_worth_deep",
        filter_reasons: {
          duplicate: 0,
          too_short: 10,
          irrelevant: 0,
          author_mismatch: 0,
          image_post: 0,
        },
      },
    ],
  };

  const summary = [];
  const issues = [];

  for (const test of tests) {
    const result = evaluateBlogger(test.blogger, filterReportForTest);
    const exp = test.expected;
    const scoreOk =
      result.qualityScore >= exp.minScore &&
      result.qualityScore <= exp.maxScore;
    const gradeOk = result.grade === exp.grade;

    summary.push({
      name: test.name,
      score: result.qualityScore,
      grade: result.grade,
      action: result.action,
      expectedRange: `${exp.minScore}-${exp.maxScore}`,
      expectedGrade: exp.grade,
      scoreOk: scoreOk ? "✅" : "❌",
      gradeOk: gradeOk ? "✅" : "❌",
    });

    if (!scoreOk) {
      issues.push(
        `❌ ${test.name}: 分数${result.qualityScore}不在期望范围[${exp.minScore},${exp.maxScore}]`,
      );
    }
    if (!gradeOk) {
      issues.push(`❌ ${test.name}: 等级${result.grade}≠期望${exp.grade}`);
    }
  }

  console.table(summary);

  if (issues.length === 0) {
    console.log("\n✅ 边界测试全部通过！");
  } else {
    console.log(`\n❌ 边界测试发现 ${issues.length} 个问题：`);
    for (const issue of issues) console.log(`   ${issue}`);
  }

  return issues.length === 0;
}

function validateRealData(results) {
  console.log("\n" + "=".repeat(70));
  console.log("� 实际数据合理性验证");
  console.log("=".repeat(70));

  const issues = [];

  const collected0 = results.filter((r) => r.context.collected === 0);
  const collectedGt0 = results.filter((r) => r.context.collected > 0);

  const c0Grades = collected0.map((r) => r.grade);
  const c0UniqueGrades = [...new Set(c0Grades)];
  if (c0UniqueGrades.length < 2) {
    issues.push(
      `❌ 采集=0博主等级无区分度: 全部为 ${c0UniqueGrades.join(",")}`,
    );
  } else {
    console.log(`✅ 采集=0博主等级有区分度: ${c0UniqueGrades.join(",")}`);
  }

  const c0Scores = collected0.map((r) => r.qualityScore);
  const c0Range = Math.max(...c0Scores) - Math.min(...c0Scores);
  if (c0Range < 10) {
    issues.push(
      `❌ 采集=0博主分数区间过窄: ${Math.min(...c0Scores)}-${Math.max(...c0Scores)} (差值=${c0Range})`,
    );
  } else {
    console.log(
      `✅ 采集=0博主分数区间合理: ${Math.min(...c0Scores)}-${Math.max(...c0Scores)} (差值=${c0Range})`,
    );
  }

  const irrelevant0 = collected0.filter((r) => r.scores.contentRelevance === 0);
  const relevant0 = collected0.filter((r) => r.scores.contentRelevance > 0);
  if (irrelevant0.length > 0 && relevant0.length > 0) {
    const avgIrrelevant =
      irrelevant0.reduce((s, r) => s + r.qualityScore, 0) / irrelevant0.length;
    const avgRelevant =
      relevant0.reduce((s, r) => s + r.qualityScore, 0) / relevant0.length;
    if (avgRelevant > avgIrrelevant) {
      console.log(
        `✅ 采集=0中: 相关博主均分(${avgRelevant.toFixed(1)}) > 无关博主均分(${avgIrrelevant.toFixed(1)})`,
      );
    } else {
      issues.push(
        `❌ 采集=0中: 相关博主均分(${avgRelevant.toFixed(1)}) <= 无关博主均分(${avgIrrelevant.toFixed(1)})`,
      );
    }
  }

  const gradeDist = {};
  for (const r of results) gradeDist[r.grade] = (gradeDist[r.grade] || 0) + 1;
  const totalA = gradeDist["A"] || 0;
  const totalD = gradeDist["D"] || 0;
  if (totalA === 0) issues.push("❌ 无A级博主，模型可能过于严格");
  if (totalD === 0) console.log("ℹ️ 无D级博主（stage1已初步筛选，属正常现象）");

  const avgScore =
    results.reduce((s, r) => s + r.qualityScore, 0) / results.length;
  if (avgScore < 35 || avgScore > 75) {
    issues.push(`❌ 平均分${avgScore.toFixed(1)}偏离合理范围[35,75]`);
  } else {
    console.log(`✅ 平均分${avgScore.toFixed(1)}在合理范围内`);
  }

  if (issues.length === 0) {
    console.log("\n✅ 实际数据验证全部通过！");
  } else {
    console.log(`\n⚠️ 实际数据验证发现 ${issues.length} 个问题：`);
    for (const issue of issues) console.log(`   ${issue}`);
  }

  return issues.length === 0;
}

function main() {
  const bloggers = loadAllBloggers();
  const filterReport = loadFilterReport();

  console.log("=".repeat(70));
  console.log("📊 博主质量评估模型 v2 - 实际数据测试");
  console.log("=".repeat(70));
  console.log(`博主总数: ${bloggers.length}`);
  console.log(`过滤报告: ${filterReport ? "已加载" : "未找到"}`);

  const results = bloggers
    .map((b) => evaluateBlogger(b, filterReport))
    .sort((a, b) => b.qualityScore - a.qualityScore);

  console.log("\n" + "-".repeat(70));
  console.log("📋 评估结果（按质量分降序）");
  console.log("-".repeat(70));

  const collected0 = results.filter((r) => r.context.collected === 0);
  const collectedGt0 = results.filter((r) => r.context.collected > 0);

  console.log("\n## 采集视频 > 0 的博主");
  console.table(
    collectedGt0.map((r) => ({
      博主: r.blogger,
      质量分: r.qualityScore,
      等级: r.grade,
      处理: r.action,
      相关度: r.scores.contentRelevance,
      粉丝: r.scores.followerValue,
      采集: r.scores.collectionEfficiency,
      过滤: r.scores.filterStructure,
      平台: r.scores.platformVideoFactor,
      采集数: r.context.collected,
      平台总数: r.context.platform_total,
    })),
  );

  console.log("\n## 采集视频 = 0 的博主（重点关注）");
  console.table(
    collected0.map((r) => ({
      博主: r.blogger,
      质量分: r.qualityScore,
      等级: r.grade,
      处理: r.action,
      相关度: r.scores.contentRelevance,
      粉丝: r.scores.followerValue,
      采集: r.scores.collectionEfficiency,
      过滤: r.scores.filterStructure,
      平台: r.scores.platformVideoFactor,
      平台总数: r.context.platform_total,
      粉丝数: r.context.followers,
    })),
  );

  const gradeDist = {};
  for (const r of results) gradeDist[r.grade] = (gradeDist[r.grade] || 0) + 1;
  console.log("\n## 等级分布");
  console.table(gradeDist);

  const collected0GradeDist = {};
  for (const r of collected0)
    collected0GradeDist[r.grade] = (collected0GradeDist[r.grade] || 0) + 1;
  console.log("\n## 采集=0 博主等级分布");
  console.table(collected0GradeDist);

  const realDataOk = validateRealData(results);
  const boundaryOk = runBoundaryTests();

  console.log("\n" + "=".repeat(70));
  console.log("📋 最终结论");
  console.log("=".repeat(70));
  if (realDataOk && boundaryOk) {
    console.log("✅ 模型验证通过！可以集成到 blogger-optimizer");
  } else {
    console.log("❌ 模型存在问题，需要继续调整");
    if (!realDataOk) console.log("   - 实际数据验证未通过");
    if (!boundaryOk) console.log("   - 边界测试未通过");
  }
}

main();
