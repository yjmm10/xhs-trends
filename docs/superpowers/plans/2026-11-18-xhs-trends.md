# XHS Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 构建跟踪小红书 RedSkill 与小工具生态趋势的静态 Web 应用（采集→快照→聚合→可视化）。

**Architecture:** 每日抓官方 data.json 存带日期快照（git=时间序列库），构建时聚合为前端专用 JSON，Vite+React 静态站只读聚合结果，无后端。

**Tech Stack:** Node ≥20 (Intl.Segmenter), Vite + React 18 + TypeScript, ECharts, vitest。

**Spec:** docs/superpowers/specs/2026-11-18-xhs-trends-design.md

## Global Constraints

- 新增口径：相邻快照 `skill_id` 集合差；禁止时间戳分桶。
- 分类口径：规则首命中，每技能单一归属；UI 必须标注估算口径。
- "消失"判定：连续 ≥3 快照缺席。
- collect 校验失败不落盘；同 dataDate 幂等跳过。
- 分词只用 `Intl.Segmenter`，不引入分词依赖。
- 所有管道脚本为 `.mjs`；前端为 TS。

---

## Tasks

### Task 1: 项目脚手架
- [x] git init、.gitignore（node_modules/dist/data/derived）
- [x] package.json（scripts: dev/build/collect/aggregate/test）、tsconfig、vite.config.ts、index.html、src/vite-env.d.ts
- [x] npm install 通过

### Task 2: diff 库（TDD）
- [x] `scripts/lib/diff.test.mjs` 失败测试：`newSkillIds(prev,curr)` 集合差；`compareRanks(prevList,currList)` 返回 rankDelta/isNew；`disappeared(series,n)` 连续 n 份缺席
- [x] 实现 `scripts/lib/diff.mjs`，测试通过

### Task 3: 赛道分类库（TDD）
- [x] `data/sources/category-rules.json`（8 赛道关键词规则）
- [x] `scripts/lib/categories.test.mjs`：首命中、大小写不敏感、中英文混合、未匹配→其它
- [x] 实现 `scripts/lib/categories.mjs`

### Task 4: 关键词库（TDD）
- [x] `data/sources/stopwords.txt`
- [x] `scripts/lib/keywords.test.mjs`：中英文混合分词统计、停用词过滤、新涌现判定（prev=0 且 ≥3）、delta
- [x] 实现 `scripts/lib/keywords.mjs`（Intl.Segmenter）

### Task 5: 快照校验 + collect.mjs（TDD）
- [x] `scripts/lib/snapshot.test.mjs`：合法/缺字段/坏类型 fixture
- [x] 实现 `scripts/lib/snapshot.mjs`（validateSnapshot）
- [x] 实现 `scripts/collect.mjs`：fetch+重试2、校验、幂等、落盘 `data/snapshots/skills-<dataDate>.json`

### Task 6: aggregate.mjs
- [x] 读全部快照升序 → 生成 overview/rankings/categories/keywords/minitools 五个 derived JSON
- [x] 用真实第一份快照 + 一份合成第二快照 fixture 验证输出结构与口径

### Task 7: 真实数据采集
- [x] `npm run collect` 拉取官方 data.json 成功落盘；`npm run aggregate` 产出五 JSON；抽查数字合理

### Task 8: 前端骨架 + 总览页
- [x] types.ts、data 加载、Layout（路由+页脚数据说明）、EChart 包装组件、MetricCard、EmptyState
- [x] OverviewPage：指标卡 + 趋势双线图（总量/较上次新增）

### Task 9: 榜单页
- [x] RankingsPage：四榜单 tab、排名变化/新上榜标记、搜索过滤、口径提示

### Task 10: 赛道页 + 关键词页 + 小工具页
- [x] CategoriesPage：条形图 + 历史趋势 + 脚注
- [x] KeywordsPage：表格（delta/🔥/新涌现）+ top20 条形 + 搜索
- [x] MinitoolsPage：登记表 + 类目条形 + "手动登记非全量"声明
- [x] data/sources/minitools.json 种子数据

### Task 11: 构建验证 + README + 提交
- [x] vitest 全绿；`npm run build` 成功；`vite preview` 抽查页面
- [x] README（用法/口径/调度/部署）
- [x] git 提交
