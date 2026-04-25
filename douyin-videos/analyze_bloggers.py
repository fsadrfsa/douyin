import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

DATA_ROOT = Path(r"d:\opencli\douyin-videos")
RESULTS_DIR = DATA_ROOT / "results"
REPORTS_DIR = DATA_ROOT / "reports"
FEEDBACK_FILE = DATA_ROOT / "optimization-feedback.json"

PROJECT_KEYWORDS = [
    "创业", "赚钱", "项目", "商业", "变现", "兼职", "轻资产", "低成本",
    "副业", "一人公司", "超级个体", "AI赚钱", "自媒体变现", "搞钱",
    "收入", "盈利", "生意", "开店", "电商", "带货", "跨境",
    "自由职业", "在家赚钱", "被动收入", "睡后收入", "流量变现",
    "私域", "社群", "知识付费", "课程", "咨询", "代运营",
    "自媒体运营", "账号运营", "爆款", "涨粉", "引流",
    "AI工具", "AI项目", "AI副业", "AI创业", "AI变现",
    "工作流", "自动化", "数字人", "直播", "短视频",
]

PROJECT_CONTENT_KEYWORDS = [
    "创业", "赚钱", "项目", "商业", "变现", "副业", "一人公司", "超级个体",
    "搞钱", "收入", "盈利", "生意", "开店", "电商", "带货", "跨境",
    "自由职业", "被动收入", "流量变现", "私域", "知识付费", "课程",
    "AI赚钱", "AI副业", "AI创业", "AI变现", "自媒体变现",
    "如何做", "怎么做", "操作流程", "步骤", "教程", "方法",
    "投入", "成本", "收益", "回报", "利润", "月入", "年入",
    "目标人群", "适合谁", "受众",
]

PROJECT_INFO_FIELDS = {
    "how_to_do": ["如何做", "怎么做", "操作流程", "步骤", "教程", "方法", "流程", "实操"],
    "investment": ["投入", "成本", "费用", "花钱", "投资", "预算"],
    "return": ["收益", "回报", "利润", "月入", "年入", "赚", "收入", "变现"],
    "target": ["适合谁", "受众", "目标人群", "人群", "用户"],
}


def load_json(path):
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def check_keyword_relevance(source_keyword):
    if not source_keyword:
        return "pending_verification"
    for kw in PROJECT_KEYWORDS:
        if kw in source_keyword:
            return "relevant"
    return "pending_verification"


def is_project_related(video_data):
    title = video_data.get("title", "") or ""
    main_content = video_data.get("main_content", "") or ""
    topic = video_data.get("topic", "") or ""
    combined = f"{title} {main_content} {topic}"
    for kw in PROJECT_CONTENT_KEYWORDS:
        if kw in combined:
            return True
    return False


def check_project_info_completeness(video_data):
    main_content = video_data.get("main_content", "") or ""
    title = video_data.get("title", "") or ""
    combined = f"{title} {main_content}"
    fields_present = {}
    for field, keywords in PROJECT_INFO_FIELDS.items():
        fields_present[field] = any(kw in combined for kw in keywords)
    return fields_present


def analyze_blogger(blogger_dir):
    metadata_path = blogger_dir / "metadata.json"
    metadata = load_json(metadata_path)
    if not metadata:
        return None

    blogger_name = metadata.get("blogger_name", blogger_dir.name.split("_MS4w")[0])
    source_keyword = metadata.get("source_keyword", "")
    discovered_at = metadata.get("discovered_at", "")
    last_analyzed_at = metadata.get("last_analyzed_at", "")
    collected_video_count = metadata.get("collected_video_count", 0)
    relevance_score = metadata.get("relevance_score", 0)

    keyword_relevance = check_keyword_relevance(source_keyword)

    videos_dir = blogger_dir / "videos"
    video_files = list(videos_dir.glob("*.json")) if videos_dir.exists() else []

    total_analyzed = 0
    project_related_count = 0
    project_videos_with_info = {"how_to_do": 0, "investment": 0, "return": 0, "target": 0}
    complete_project_videos = 0

    for vf in video_files:
        video_data = load_json(vf)
        if not video_data:
            continue
        if video_data.get("quality") in ["inaccessible", "low_quality"]:
            continue
        total_analyzed += 1

        if is_project_related(video_data):
            project_related_count += 1
            info = check_project_info_completeness(video_data)
            for field, present in info.items():
                if present:
                    project_videos_with_info[field] += 1
            if all(info.values()):
                complete_project_videos += 1

    project_related_ratio = (project_related_count / total_analyzed * 100) if total_analyzed > 0 else 0

    if project_related_count > 0:
        completeness_ratios = {}
        for field, count in project_videos_with_info.items():
            completeness_ratios[field] = count / project_related_count * 100
        avg_completeness = sum(completeness_ratios.values()) / len(completeness_ratios)
    else:
        completeness_ratios = {k: 0 for k in project_videos_with_info}
        avg_completeness = 0

    now = datetime.now(timezone.utc)
    if last_analyzed_at:
        try:
            last_dt = datetime.fromisoformat(last_analyzed_at.replace("Z", "+00:00"))
            days_since_update = (now - last_dt).days
        except:
            days_since_update = 999
    else:
        days_since_update = 999

    if discovered_at:
        try:
            disc_dt = datetime.fromisoformat(discovered_at.replace("Z", "+00:00"))
            days_since_discovery = (now - disc_dt).days
        except:
            days_since_discovery = 0
    else:
        days_since_discovery = 0

    if project_related_ratio >= 30:
        ratio_score = 100
    elif project_related_ratio >= 20:
        ratio_score = 80
    elif project_related_ratio >= 10:
        ratio_score = 60
    elif project_related_ratio > 0:
        ratio_score = 40
    else:
        ratio_score = 0

    if avg_completeness >= 80:
        completeness_score = 100
    elif avg_completeness >= 60:
        completeness_score = 80
    elif avg_completeness >= 40:
        completeness_score = 60
    elif avg_completeness > 0:
        completeness_score = 40
    else:
        completeness_score = 0

    if total_analyzed >= 20:
        video_count_score = 100
    elif total_analyzed >= 15:
        video_count_score = 80
    elif total_analyzed >= 10:
        video_count_score = 60
    elif total_analyzed >= 3:
        video_count_score = 40
    else:
        video_count_score = 20

    if days_since_update <= 7:
        timeliness_score = 100
    elif days_since_update <= 14:
        timeliness_score = 80
    elif days_since_update <= 30:
        timeliness_score = 60
    else:
        timeliness_score = 40

    if project_related_count == 0:
        composite_score = 0
    else:
        composite_score = (
            ratio_score * 0.4
            + completeness_score * 0.3
            + video_count_score * 0.2
            + timeliness_score * 0.1
        )

    if composite_score >= 70:
        grade = "优质博主"
        grade_icon = "✅"
    elif composite_score >= 50:
        grade = "良好博主"
        grade_icon = "⚠️"
    elif composite_score >= 30:
        grade = "一般博主"
        grade_icon = "⚠️"
    else:
        grade = "较差博主"
        grade_icon = "❌"

    if total_analyzed < 3:
        data_status = "数据不足"
    elif project_related_count == 0:
        data_status = "待观察"
    else:
        data_status = "正常"

    return {
        "name": blogger_name,
        "sec_uid": metadata.get("sec_uid", ""),
        "author_id": metadata.get("blogger_id", ""),
        "source_keyword": source_keyword,
        "keyword_relevance": keyword_relevance,
        "follower_count": metadata.get("follower_count", 0),
        "collected_video_count": collected_video_count,
        "total_analyzed": total_analyzed,
        "project_related_count": project_related_count,
        "project_related_ratio": round(project_related_ratio, 1),
        "avg_completeness": round(avg_completeness, 1),
        "complete_project_videos": complete_project_videos,
        "days_since_update": days_since_update,
        "days_since_discovery": days_since_discovery,
        "composite_score": round(composite_score, 1),
        "grade": grade,
        "grade_icon": grade_icon,
        "data_status": data_status,
        "ratio_score": ratio_score,
        "completeness_score": completeness_score,
        "video_count_score": video_count_score,
        "timeliness_score": timeliness_score,
        "relevance_score": relevance_score,
        "summary": metadata.get("summary", ""),
    }


def main():
    bloggers_data = load_json(DATA_ROOT / "data" / "bloggers.json") or []
    blacklist_raw = load_json(DATA_ROOT / "data" / "blogger-blacklist.json") or {}
    blacklist = blacklist_raw.get("blacklist", []) if isinstance(blacklist_raw, dict) else blacklist_raw

    blacklist_names = set()
    blacklist_uids = set()
    for b in blacklist:
        if isinstance(b, dict):
            if b.get("name"):
                blacklist_names.add(b["name"])
            if b.get("sec_uid"):
                blacklist_uids.add(b["sec_uid"])
        elif isinstance(b, str):
            blacklist_names.add(b)

    blogger_dirs = [d for d in RESULTS_DIR.iterdir() if d.is_dir()]
    results = []
    issues = []

    for bd in sorted(blogger_dirs):
        try:
            analysis = analyze_blogger(bd)
            if analysis:
                if analysis["name"] in blacklist_names or analysis["sec_uid"] in blacklist_uids:
                    continue
                results.append(analysis)
        except Exception as e:
            issues.append({
                "type": "data_error",
                "blogger_dir": str(bd),
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    results.sort(key=lambda x: x["composite_score"], reverse=True)

    blacklist_candidates = [r for r in results if r["composite_score"] < 30 and r["data_status"] != "数据不足"]
    observe_candidates = [r for r in results if 30 <= r["composite_score"] < 50]
    good_candidates = [r for r in results if 50 <= r["composite_score"] < 70]
    excellent_candidates = [r for r in results if r["composite_score"] >= 70]
    insufficient_data = [r for r in results if r["data_status"] == "数据不足"]

    total_valid_project_info = sum(r["complete_project_videos"] for r in results)
    total_project_related = sum(1 for r in results if r["project_related_count"] >= 1)
    avg_completeness_overall = (
        sum(r["avg_completeness"] for r in results if r["project_related_count"] > 0)
        / max(1, sum(1 for r in results if r["project_related_count"] > 0))
    )
    blogger_coverage = (len(results) - len(blacklist_candidates)) / max(1, len(results)) * 100
    project_related_ratio_overall = total_project_related / max(1, len(results)) * 100

    today = datetime.now().strftime("%Y-%m-%d")
    report_path = REPORTS_DIR / f"blogger-optimization-{today}.md"
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    report_lines = []
    report_lines.append("# 博主优化报告\n")
    report_lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"**分析周期**: 数据收集阶段")
    report_lines.append(f"**优化阶段**: 信息收集阶段")
    report_lines.append(f"**活跃博主数**: {len(results)}")
    report_lines.append(f"**黑名单博主数**: {len(blacklist)}")
    report_lines.append("")
    report_lines.append("---\n")
    report_lines.append("## 📊 博主质量概览\n")

    header = "| 博主名称 | 粉丝数 | 已分析视频 | 项目相关视频 | 项目相关比例 | 信息完整度 | 综合评分 | 等级 | 数据状态 | 建议 |"
    separator = "|----------|--------|------------|-------------|-------------|-----------|----------|------|----------|------|"
    report_lines.append(header)
    report_lines.append(separator)

    for r in results:
        suggestion = ""
        if r["composite_score"] >= 70:
            suggestion = "优先处理"
        elif r["composite_score"] >= 50:
            suggestion = "正常处理"
        elif r["composite_score"] >= 30:
            suggestion = "观察调整"
        elif r["data_status"] == "数据不足":
            suggestion = "继续收集"
        else:
            suggestion = "加入黑名单"

        report_lines.append(
            f"| {r['name']} | {r['follower_count']} | {r['total_analyzed']} | "
            f"{r['project_related_count']} | {r['project_related_ratio']}% | "
            f"{r['avg_completeness']}% | {r['composite_score']} | "
            f"{r['grade_icon']} {r['grade']} | {r['data_status']} | {suggestion} |"
        )

    report_lines.append("")
    report_lines.append("---\n")
    report_lines.append("## 🔍 详细分析\n")

    for r in results:
        report_lines.append(f"### 博主：{r['name']}")
        report_lines.append(f"- **来源关键词**: {r['source_keyword']}")
        report_lines.append(f"- **关键词相关性**: {r['keyword_relevance']}")
        report_lines.append(f"- **粉丝数**: {r['follower_count']}")
        report_lines.append(f"- **已分析视频数**: {r['total_analyzed']}")
        report_lines.append(f"- **项目相关视频数**: {r['project_related_count']}")
        report_lines.append(f"- **项目相关比例**: {r['project_related_ratio']}%")
        report_lines.append(f"- **项目信息完整度**: {r['avg_completeness']}%")
        report_lines.append(f"- **完整项目信息视频数**: {r['complete_project_videos']}")
        report_lines.append(f"- **综合评分**: {r['composite_score']}")
        report_lines.append(f"  - 项目相关比例得分: {r['ratio_score']} (权重40%)")
        report_lines.append(f"  - 信息完整度得分: {r['completeness_score']} (权重30%)")
        report_lines.append(f"  - 视频数得分: {r['video_count_score']} (权重20%)")
        report_lines.append(f"  - 时效性得分: {r['timeliness_score']} (权重10%)")
        report_lines.append(f"- **等级**: {r['grade_icon']} {r['grade']}")
        report_lines.append(f"- **数据状态**: {r['data_status']}")
        report_lines.append(f"- **发现天数**: {r['days_since_discovery']}天")
        summary_text = r.get('summary') or ''
        report_lines.append(f"- **简介**: {summary_text[:100]}..." if len(summary_text) > 100 else f"- **简介**: {summary_text or '无'}")
        report_lines.append("")

    report_lines.append("---\n")
    report_lines.append("## ✅ 优化建议\n")
    report_lines.append("### 立即执行")

    if blacklist_candidates:
        for r in blacklist_candidates:
            reason = f"项目相关视频数={r['project_related_count']}，综合评分={r['composite_score']}<30分"
            report_lines.append(f"- [ ] 加入黑名单：{r['name']}（{reason}）")
    else:
        report_lines.append("- 暂无需要加入黑名单的博主")

    report_lines.append("")
    report_lines.append("### 观察调整")

    if observe_candidates:
        for r in observe_candidates:
            report_lines.append(f"- [ ] 监控\"{r['name']}\"后续视频质量和项目信息完整度（当前评分：{r['composite_score']}）")
    else:
        report_lines.append("- 暂无需要观察调整的博主")

    report_lines.append("")
    report_lines.append("### 继续收集数据")

    if insufficient_data:
        for r in insufficient_data:
            report_lines.append(f"- [ ] \"{r['name']}\" 已分析视频不足3个（当前：{r['total_analyzed']}个），继续收集")
    else:
        report_lines.append("- 所有博主数据充足")

    report_lines.append("")
    report_lines.append("---\n")
    report_lines.append("## 📈 数据收集进度\n")

    report_lines.append("| 指标 | 当前值 | 目标值 | 完成度 |")
    report_lines.append("|------|--------|--------|--------|")
    report_lines.append(f"| 有效项目信息数量 | {total_valid_project_info}条 | ≥50条 | {min(100, round(total_valid_project_info / 50 * 100))}% |")
    report_lines.append(f"| 数据完整度 | {round(avg_completeness_overall, 1)}% | ≥80% | {min(100, round(avg_completeness_overall / 80 * 100))}% |")
    report_lines.append(f"| 博主覆盖率 | {round(blogger_coverage, 1)}% | ≥90% | {min(100, round(blogger_coverage / 90 * 100))}% |")
    report_lines.append(f"| 项目相关博主占比 | {round(project_related_ratio_overall, 1)}% | ≥60% | {min(100, round(project_related_ratio_overall / 60 * 100))}% |")

    report_lines.append("")
    report_lines.append("---\n")
    report_lines.append("## 📋 评分汇总\n")
    report_lines.append("| 等级 | 数量 | 博主 |")
    report_lines.append("|------|------|------|")
    report_lines.append(f"| ✅ 优质博主 (≥70分) | {len(excellent_candidates)} | {', '.join(r['name'] for r in excellent_candidates) or '无'} |")
    report_lines.append(f"| ⚠️ 良好博主 (50-69分) | {len(good_candidates)} | {', '.join(r['name'] for r in good_candidates) or '无'} |")
    report_lines.append(f"| ⚠️ 一般博主 (30-49分) | {len(observe_candidates)} | {', '.join(r['name'] for r in observe_candidates) or '无'} |")
    report_lines.append(f"| ❌ 较差博主 (<30分) | {len(blacklist_candidates)} | {', '.join(r['name'] for r in blacklist_candidates) or '无'} |")
    report_lines.append(f"| 📊 数据不足 (<3个视频) | {len(insufficient_data)} | {', '.join(r['name'] for r in insufficient_data) or '无'} |")

    report_lines.append("")
    report_lines.append("**报告结束**")

    report_content = "\n".join(report_lines)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    print(f"报告已生成: {report_path}")
    print(f"\n=== 分析摘要 ===")
    print(f"活跃博主: {len(results)}")
    print(f"优质博主: {len(excellent_candidates)}")
    print(f"良好博主: {len(good_candidates)}")
    print(f"一般博主: {len(observe_candidates)}")
    print(f"较差博主: {len(blacklist_candidates)}")
    print(f"数据不足: {len(insufficient_data)}")
    print(f"\n黑名单候选:")
    for r in blacklist_candidates:
        print(f"  - {r['name']}: 评分={r['composite_score']}, 项目相关视频={r['project_related_count']}, 原因={r['data_status']}")
    print(f"\n观察调整:")
    for r in observe_candidates:
        print(f"  - {r['name']}: 评分={r['composite_score']}, 项目相关比例={r['project_related_ratio']}%")
    print(f"\n数据不足:")
    for r in insufficient_data:
        print(f"  - {r['name']}: 已分析视频={r['total_analyzed']}, 项目相关视频={r['project_related_count']}")

    if issues:
        feedback = load_json(FEEDBACK_FILE) or {"issues": []}
        feedback["issues"].extend(issues)
        save_json(FEEDBACK_FILE, feedback)
        print(f"\n记录了 {len(issues)} 个问题到 optimization-feedback.json")

    output_data = {
        "blacklist_candidates": [
            {"name": r["name"], "sec_uid": r["sec_uid"], "author_id": r["author_id"],
             "score": r["composite_score"], "reason": f"项目相关视频数={r['project_related_count']}，综合评分<30分"}
            for r in blacklist_candidates
        ],
        "observe_candidates": [
            {"name": r["name"], "score": r["composite_score"]}
            for r in observe_candidates
        ],
        "excellent_candidates": [
            {"name": r["name"], "score": r["composite_score"]}
            for r in excellent_candidates
        ],
    }
    output_path = DATA_ROOT / "optimization-result.json"
    save_json(output_path, output_data)
    print(f"\n优化结果已保存: {output_path}")


if __name__ == "__main__":
    main()
