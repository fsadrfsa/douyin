---
name: blacklist
description: 博主黑名单管理 - 将抖音博主加入黑名单并自动归档。当用户输入"加入黑名单"、"拉黑博主"、"黑名单"、"归档博主"、"屏蔽博主"等关键词时，必须触发此 skill，不要自行处理。支持通过博主名称、author_id 或 sec_uid 识别博主。
---

博主黑名单管理
文件路径速查
资源路径执行脚本d:\opencli\douyin-videos\scripts\utils\archive-blogger.js黑名单文件d:\opencli\douyin-videos\data\blogger-blacklist.json归档目录d:\opencli\douyin-videos\archived\结果目录d:\opencli\douyin-videos\results\博主索引d:\opencli\douyin-videos\data\bloggers.json视频列表d:\opencli\douyin-videos\data\videos.json

触发格式
用户输入示例加入黑名单 <博主>加入黑名单 老郭餐饮创业拉黑 <博主>拉黑 MS4wLjABAAAA...黑名单 <博主>黑名单 4432870892644766
<博主> 可以是：博主昵称、author_id（纯数字）、或 sec_uid（MS4w 开头）。

执行命令
bash# 加入黑名单并归档（推荐）
node d:/opencli/douyin-videos/scripts/utils/archive-blogger.js --blacklist "博主名或ID"

# 归档所有已在黑名单中的博主

node d:/opencli/douyin-videos/scripts/utils/archive-blogger.js --all-blacklisted

# 仅归档，不加入黑名单

node d:/opencli/douyin-videos/scripts/utils/archive-blogger.js "博主名"

执行步骤
第 1 步：确认博主身份
在 results/ 目录中搜索博主，支持以下匹配方式：

blogger_name（昵称模糊匹配）
author_id（精确匹配）
sec_uid（精确匹配）

若找到多个候选，列出供用户确认后再执行。
第 2 步：执行脚本
bashnode d:/opencli/douyin-videos/scripts/utils/archive-blogger.js --blacklist "博主名"
第 3 步：确认执行结果
脚本成功后输出示例：
🚫 加入黑名单并归档: 老郭餐饮创业
author_id: 4432870892644766
sec_uid: MS4wLjABAAAAgDG7mr5sSWjOr-Z2XIfpE2xUvHuBnsH9GGgr1IIU5ynrn8OfQHcGskJQkEoATZNj

✅ 已添加到黑名单
✅ 已移动到: archived/老郭餐饮创业_MS4wLjABAA
✅ 已从 bloggers.json 删除 1 条记录
✅ 已从 videos.json 删除 1 条记录
✅ 已从 videos-index.json 删除 N 条记录
✅ 已从 videos-exceptions.json 删除 N 条记录
✅ 已从归档文件删除 N 条记录
✅ 已删除 N 个 transcripts/archived 文件
✅ 已从 review 文件删除 N 条记录
✅ 已更新统计信息
✅ 已记录归档日志
向用户汇报每项操作的完成状态。

数据清理范围
脚本会清理以下 10 个数据源：

| 数据源 | 文件 | 说明 |
|--------|------|------|
| 黑名单 | blogger-blacklist.json | 添加记录 |
| 博主列表 | bloggers.json | 删除记录 |
| 视频列表 | videos.json | 删除视频 |
| 视频索引 | videos-index.json | 删除索引 |
| 异常视频 | videos-exceptions.json | 删除异常记录 |
| 归档文件 | videos-archive-*.json | 删除视频 |
| 转录归档 | transcripts/archived/ | 删除转录文件 |
| Review文件 | transcripts/review/ | 删除问题转录 |
| Review统计 | active-bloggers-review-stats.json | 删除统计记录 |
| 博主分析 | blogger-analysis.json | 删除分析记录 |

错误处理
错误情况处理方式博主不在 results/ 中提示用户确认名称是否正确，或该博主是否已归档找到多个同名博主列出候选项，请用户通过 author_id 或 sec_uid 确认脚本路径不存在提示用户检查路径，并说明需要先确保项目已正确安装脚本执行报错原样展示错误信息，建议用户检查 Node.js 版本或文件权限博主已在黑名单中告知用户该博主已被加入黑名单，询问是否需要重新归档
