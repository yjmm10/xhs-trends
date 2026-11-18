# 小红书小工具 & Skill 趋势跟踪站 — 设计文档

日期：2026-11-18 ｜ 状态：已确认（用户批准方案 A）

## 目标

一个 Web 应用，跟踪小红书生态中 **RedSkill（技能商店）** 与 **小工具** 的趋势：
总量增长、榜单变化、赛道分布、关键词热度，用于发现赛道机会。

## 数据源（调研结论 2026-11-18）

| 数据源 | 内容 | 可行性 |
|---|---|---|
| 官方 `https://cowork.xiaohongshu.com/s/redskill-rank/data.json` | 全量技能 `allSkills`（skill_id/skill_name/skill_description，实测 52,314 条）+ 四个 TOP100 榜单（`useList` 使用人数 / `newList` 7天新增 / `todayList` 当日新增 / `authorList` 作者发布）+ `dataDate`/`genTime`。静态 JSON，无需登录。 | ⭐ 主数据源，已实测 |
| skill-radar (GitHub Canlah-AI/skill-radar) | 第三方快照与口径方法论 | 只借鉴口径教训 |
| 小工具生态 | 无公开榜单/商店页（已探测确认） | 手动登记，可插拔 |

**口径纪律（来自 skill-radar 的撤回教训）：**
1. 日新增 = 相邻快照 `skill_id` **集合差**，绝不用 `updated_at`/时间戳分桶。
2. 分类为关键词规则估算，标注口径；用条形图展示，明确"每技能归入首个命中赛道（合计=100%）"。
3. "下架/消失" = 连续 ≥3 份快照缺席才判定。

## 架构（方案 A：快照管道 + 静态聚合）

```
官方 data.json ──collect(每日,幂等)──▶ data/snapshots/skills-<dataDate>.json  (git 跟踪, 时间序列真源)
                                            │
                                 aggregate (构建时运行)
                                            ▼
                                 data/derived/*.json  (gitignore, 构建再生成)
                                            ▼
                          Vite + React 18 + TS + ECharts 静态站（无后端）
```

- Node ≥ 20（使用内置 `Intl.Segmenter` 中文分词，零分词依赖）。
- 采集脚本纯 `.mjs`，前端 TS。
- `npm run build` = `aggregate` + `vite build`，任何静态托管可部署。

## 管道

### collect.mjs
- 抓官方 data.json（URL 可用环境变量 `XHS_RANK_URL` 覆盖），失败重试 2 次。
- schema 校验：`dataDate`(YYYY-MM-DD)、`allSkills` 非空且含 `skill_id`/`skill_name`、四个榜单为数组。校验失败**不落盘**、非零退出。
- 幂等：同 `dataDate` 快照已存在则跳过。
- 输出路径 `data/snapshots/skills-<dataDate>.json`。

### aggregate.mjs
读全部快照（按 dataDate 升序），生成：
- `overview.json`：总量曲线 `series[{date,total,newSinceLast}]`、最新指标卡、小工具计数。
- `rankings.json`：最新四榜单；每项带 `prevRank`/`rankDelta`/`isNew`（对比上一份快照）。
- `categories.json`：最新赛道分布（计数+占比）+ 各快照历史趋势 + 未匹配数。
- `keywords.json`：分词统计 top（含 `prevCount`/`delta`）、上升关键词、新涌现关键词（上次=0 且本次≥3）。
- `minitools.json`：手动登记数据的聚合。

### 赛道分类（估算口径）
`data/sources/category-rules.json`：`[{category, keywords[]}]` 顺序匹配 `skill_name + skill_description`（大小写不敏感），**首个命中即归属**。分类规则可编辑，聚合时重算。

### 小工具数据（手动登记，可插拔）
`data/sources/minitools.json`：`[{name, category, launchDate?, noteId?, source, addedAt}]`。
未来若出现公开源或接入 redapp CLI 导出，只替换此来源文件，管道与前端不变。

## 前端页面（react-router 多路由）

| 路由 | 内容 |
|---|---|
| `/` 总览 | 指标卡（技能总量 / 较上次采集新增 / 快照覆盖天数 / 官方7日新增·TOP100合计）+ 总量趋势曲线 + 小工具总量卡 |
| `/rankings` | 四榜单 tab；表格含描述摘要、`🆕 新上榜`、`↑n/↓n` 排名变化；搜索过滤 |
| `/categories` | 赛道分布条形图 + 赛道历史趋势折线 + 口径脚注 |
| `/keywords` | 关键词表（count/prev/delta + 🔥）+ top20 条形图 + 新涌现区 + 搜索过滤 |
| `/minitools` | 登记数据展示（表格 + 类目条形）+ 诚实标注"手动登记，非全量" |

页脚「数据说明」：数据源链接、口径说明、生成时间。derived JSON 缺失/为空 → 占位说明，不白屏。

## 错误处理

- collect：网络失败重试 2 次；校验失败不写半截文件；官方新增字段宽容（只读已知字段）。
- aggregate：快照 JSON 解析失败 → 明确报错指出坏文件。
- 前端：JSON 导入失败/空数据 → EmptyState 组件。

## 测试（vitest，TDD）

管道纯函数全覆盖（`scripts/lib/*.test.mjs`）：
- diff：集合差新增、榜单排名对比、连续缺席判定
- categories：规则匹配（中英文、大小写、首命中）
- keywords：Intl.Segmenter 分词统计（中英文混合 fixture、停用词、新涌现判定）
- snapshot 校验：合法/非法 fixture
口径回归：新增必须=集合差。

## 非目标（YAGNI）

不做登录态爬取、不做笔记抓取、不上 ML 分类、不做用户系统、不做后端。

## 调度

初期手动 `npm run collect`；后续可选 Windows 任务计划每日定时 + git commit（collect 幂等，重复调度安全）。

---

## 补记（2026-11-18 重构）：聚焦小工具

用户确认：站点统计对象是**小红书最新功能「小工具」**，而非对 RedSkill 全量技能描述的内容分析（"全网内容"感）。

变更：
1. **首页改为小工具生态**：本账号作品状态（redapp CLI 只读查询，实测「瞎画」已发布）、平台官方 7 类目（redapp config 实测）、类目分布、手动观察清单。
2. **删除** 赛道分布页与关键词洞察页（对 52k 技能 name+description 的分析）；分类/分词库代码保留为休眠能力（测试仍在）。
3. **RedSkill 降级为二级板块**：仅官方四榜单 + 总量趋势（新增口径不变）。
4. 新增 `scripts/fetch-minitool-meta.mjs`（`npm run minitools:fetch`）：redapp config/list/status → data/sources/minitool-platform.json。
5. 站点更名「小红书小工具趋势」。

数据事实：小工具无公开榜单端点（minitool-rank 等路径 502/404 已复核）；RedSkill 榜单 data.json 是唯一官方公开生态数据源。
