# 小红书生态趋势（xhs-trends）

跟踪小红书 **RedSkill（技能商店）** 与 **小工具** 生态趋势的静态 Web 应用：总量增长、官方榜单变化、赛道分布、关键词热度。

与小红书官方无关，仅使用公开数据做个人研究。

## 快速开始

```bash
npm install
npm run collect     # 抓取官方 data.json 存为当日快照（幂等，可重复跑）
npm run aggregate   # 由快照生成前端数据 data/derived/*.json
npm run dev         # 本地开发预览
npm run build       # = aggregate + vite build，产物在 dist/
npm run test        # vitest 管道测试
```

> 首次使用请先跑 `collect`——前端构建依赖快照数据。

## 数据来源与口径

| 项 | 说明 |
|---|---|
| 数据源 | 官方 REDSkill 排行榜静态 JSON：`https://cowork.xiaohongshu.com/s/redskill-rank/data.json`（无需登录；可用环境变量 `XHS_RANK_URL` 覆盖） |
| 快照 | `data/snapshots/skills-<dataDate>.json`，**git 跟踪，是时间序列的唯一真源** |
| 新增 | 相邻快照 `skill_id` **集合差**（绝不用时间戳分桶估算） |
| 消失 | 连续 ≥3 份快照缺席才判定 |
| 赛道 | `data/sources/category-rules.json` 关键词规则估算（英文词边界匹配 / 中文子串匹配，首命中，每技能单一归属） |
| 关键词 | `Intl.Segmenter` 分词 + 中文未登录词 bigram 兜底 + `data/sources/stopwords.txt` 停用词 |
| 小工具 | 平台无公开榜单，`data/sources/minitools.json` **手动登记**（可插拔：发现新数据源只换这个文件） |

官方 `dataDate` 表示其数据生成日期，与本地采集日期可能不同（官方侧更新节奏决定）；采集脚本按 `dataDate` 幂等。

## 日常使用

每天（或随意）跑一次：

```bash
npm run collect && git add data/snapshots && git commit -m "snapshot <date>"
```

快照越攒越多，趋势曲线、榜单对比（↑↓/新上榜）、关键词变化（🔥/新涌现）就自动出现。

### 定时采集（可选）

**Windows 任务计划程序**：每天 09:00 执行

```
程序: powershell.exe
参数: -Command "cd 'E:\Project\OPC\redbook\xhs-trends'; npm run collect; git add data/snapshots; git commit -m ('snapshot ' + (Get-Date -Format yyyy-MM-dd))"
```

**GitHub Actions**（若托管在 GitHub）：`schedule: cron` 每日跑 collect + commit，再 `npm run build` 部署 dist。

## 部署

`dist/` 为纯静态产物（相对路径 base），GitHub Pages / Vercel / 任意静态托管直接可用。页面用 HashRouter，无需服务端路由配置。

## 目录结构

```
scripts/
  collect.mjs          # 采集：fetch + 校验 + 幂等落盘
  aggregate.mjs        # 聚合：快照 → derived JSON（overview/rankings/categories/keywords/minitools）
  lib/
    snapshot.mjs       #   结构校验（校验失败不落盘）
    diff.mjs           #   集合差新增 / 榜单排名对比 / 连续缺席消失
    categories.mjs     #   赛道规则分类（预编译 matcher）
    keywords.mjs       #   分词词频 / 上一期对比 / 新涌现
  lib/*.test.mjs       # vitest 测试（口径纪律的回归防线）
data/
  snapshots/           # 官方 data.json 日快照（git 跟踪）
  derived/             # 聚合产物（gitignore，构建再生成）
  sources/             # 可编辑源：分类规则 / 停用词 / 小工具登记
src/                   # Vite + React + TS + ECharts 前端
docs/superpowers/      # 设计文档与实施计划
```

## 已知边界

- 小工具生态暂无公开数据，页面为手动登记口径。
- 官方 data.json 若字段变更，`collect` 校验会拒绝落盘并报错——这时需要跟进适配。
- 赛道分类是关键词估算口径，页面已显著标注；规则可自由编辑后重跑 aggregate。
