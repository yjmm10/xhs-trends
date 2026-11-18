# 小红书榜单趋势（xhs-trends）

跟踪小红书 **Builder Hub REDSkill 官方排行榜** 的静态 Web 应用：收录量趋势 + 使用人数 / 7天新增 / 当日新增 / 作者发布四榜单，带快照间排名对比。

与小红书官方无关，仅使用官方公开数据做个人研究。

## 快速开始

```bash
npm install
npm run collect     # 抓取官方 data.json 存为当日快照（幂等，可重复跑）
npm run aggregate   # 由快照生成前端数据 data/derived/*.json
npm run dev         # 本地开发预览
npm run build       # = aggregate + vite build，产物在 dist/
npm run test        # vitest 管道测试
```

> 首次使用请先跑 `npm run collect`——前端构建依赖快照数据。

## 数据来源与口径

| 项 | 说明 |
|---|---|
| 数据源 | 官方 REDSkill 排行榜静态 JSON：`https://cowork.xiaohongshu.com/s/redskill-rank/data.json`（无需登录；环境变量 `XHS_RANK_URL` 可覆盖） |
| 榜单 | `useList` 使用人数 / `newList` 7天新增 / `todayList` 当日新增 / `authorList` 作者发布（各 TOP100），`allSkills` 全量收录（实测 52,314 条） |
| 快照 | `data/snapshots/skills-<dataDate>.json`，git 跟踪，时间序列唯一真源 |
| 新增 | 相邻快照 `skill_id` **集合差**（绝不用时间戳分桶估算） |
| 消失 | 连续 ≥3 份快照缺席才判定 |
| 榜单对比 | 每行带 `rank / prevRank / rankDelta / isNew`，对比上一份快照 |

官方 `dataDate` 表示其数据生成日期，与本地采集日期可能不同（官方更新节奏决定）；采集脚本按 `dataDate` 幂等。

## 日常使用

```bash
npm run collect && git add data/snapshots && git commit -m "snapshot <date>"
```

快照越攒越多，趋势曲线、榜单对比（↑↓ / 新上榜）自动出现。

### 定时采集（可选）

**Windows 任务计划程序**：每天 09:00 执行

```
程序: powershell.exe
参数: -Command "cd 'E:\Project\OPC\redbook\xhs-trends'; npm run collect; git add data/snapshots; git commit -m ('snapshot ' + (Get-Date -Format yyyy-MM-dd))"
```

**GitHub Actions**（若托管在 GitHub）：`schedule: cron` 每日 collect + commit + build 部署。

## 内容板块

- **官方榜单总览**：Builder Hub REDSkill 四榜（当日新增 / 7天新增 / 使用人数 / 作者发布），含排名徽章（金银铜高亮）、升降/新上榜标记、数值比例条与站内搜索。
- **收录量趋势**：官方 `dataDate` 时间序列，快照累积后自动成图。
- **小工具榜（预留）**：官方在小红书 App 内设有「小工具」榜单专属页（每日 9:00 更新）。入口/接口待接入自动采集，当前展示预留空态；接通后将并入 collect 云端定时直采（与现有 cron 同批）。
- **分享卡片**：纯 Canvas 自绘（非 DOM 截图），三种内容（趋势总览 / 单个技能 / 榜单 TOP10）× 四种平台尺寸（小红书 3:4、方形 1:1、横版 16:9、竖屏 9:16），支持下载 PNG / 复制剪贴板。

## 部署

`dist/` 为纯静态产物（相对路径 base），GitHub Pages / Vercel / 任意静态托管直接可用。

## 目录结构

```
scripts/
  collect.mjs        # 采集：fetch + 结构校验（失败不落盘）+ 幂等落盘
  aggregate.mjs      # 聚合：快照 → overview.json / rankings.json
  lib/
    snapshot.mjs     #   官方 data.json 结构校验
    diff.mjs         #   集合差新增 / 榜单排名对比 / 连续缺席消失
  lib/*.test.mjs     # vitest 测试（口径纪律的回归防线）
data/
  snapshots/         # 官方 data.json 日快照（git 跟踪）
  derived/           # 聚合产物（gitignore，构建再生成）
src/                 # Vite + React + TS + ECharts 单页应用
docs/superpowers/    # 设计文档与实施计划（含两轮方向修正补记）
```

## 已知边界

- 官方 data.json 若字段变更，`collect` 校验会拒绝落盘并报错——需跟进适配。
- 官方数据更新节奏决定快照日期间隔，趋势曲线 x 轴为官方 `dataDate`。
