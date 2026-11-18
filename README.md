# 小红书小工具趋势（xhs-trends）

跟踪小红书 **Builder Hub「小工具」** 生态与本账号作品状态，附 **REDSkill 技能商店**官方榜单查看。

> 站点定位（2026-11-18 重构确认）：**小工具为核心**；RedSkill 仅保留官方四榜单与总量趋势，不做对技能描述的内容分析。

与小红书官方无关，仅使用公开数据与自有账号的只读查询做个人研究。

## 快速开始

```bash
npm install
npm run collect           # 抓取 RedSkill 官方 data.json 存为当日快照（幂等）
npm run minitools:fetch   # 拉取小工具官方类目 + 本账号作品状态（需 redapp CLI 已登录）
npm run aggregate         # 汇总生成前端数据 data/derived/*.json
npm run dev               # 本地开发预览
npm run build             # = aggregate + vite build，产物在 dist/
npm run test              # vitest 管道测试
```

## 页面

| 路由 | 内容 |
|---|---|
| `/` | **小工具生态**（核心）：本账号作品状态（已发布/审核中）、平台官方 7 类目、类目分布、观察清单 |
| `/#/rankings` | REDSkill 官方四榜单（使用人数/7天新增/当日新增/作者榜）+ 总量趋势 |

## 数据来源与口径

### 小工具（核心）
- **本账号作品**：`npm run minitools:fetch` 用 redapp CLI（**只读**）查询 `config`（官方类目）/ `list`（作品列表）/ `status`（状态详情），写入 `data/sources/minitool-platform.json`。
- **观察清单**：平台无公开榜单/商店页（已探测确认），在 App 内刷到其他作者的小工具时手动登记 `data/sources/minitools.json`，跑 `aggregate` 生效。
- 平台官方类目（redapp config 实测）：生活方式、休闲玩法、图像创作、学习知识、实用工具、娱乐测试、其他。

### REDSkill（附带板块）
- 数据源：官方 `https://cowork.xiaohongshu.com/s/redskill-rank/data.json`（无需登录；`XHS_RANK_URL` 可覆盖）。
- 快照：`data/snapshots/skills-<dataDate>.json`，git 跟踪，时间序列唯一真源。
- 新增口径：相邻快照 `skill_id` **集合差**（绝不用时间戳分桶）；消失 = 连续 ≥3 快照缺席。

## 日常使用

```bash
npm run collect && npm run minitools:fetch
git add data && git commit -m "snapshot <date>"
```

快照与平台元数据越攒越多，趋势曲线、榜单对比（↑↓/新上榜）、作品状态变化自动出现。

### 定时采集（可选）

**Windows 任务计划程序**：每天 09:00 执行

```
程序: powershell.exe
参数: -Command "cd 'E:\Project\OPC\redbook\xhs-trends'; npm run collect; npm run minitools:fetch; git add data; git commit -m ('snapshot ' + (Get-Date -Format yyyy-MM-dd))"
```

**GitHub Actions**（若托管在 GitHub）：`schedule: cron` 每日跑 collect + commit + build 部署。

## 部署

`dist/` 为纯静态产物（相对路径 base + HashRouter），GitHub Pages / Vercel / 任意静态托管直接可用。

## 目录结构

```
scripts/
  collect.mjs              # RedSkill 采集：fetch + 校验 + 幂等落盘
  fetch-minitool-meta.mjs  # 小工具平台元数据导入（redapp CLI 只读）
  aggregate.mjs            # 聚合：快照+数据源 → derived JSON
  lib/
    snapshot.mjs           #   快照结构校验（校验失败不落盘）
    diff.mjs               #   集合差新增 / 榜单排名对比 / 连续缺席消失
    categories.mjs         #   （休眠）关键词分类能力，当前站点未使用，测试保留
    keywords.mjs           #   （休眠）分词统计能力，当前站点未使用，测试保留
  lib/*.test.mjs           # vitest 测试（口径纪律的回归防线）
data/
  snapshots/               # RedSkill 官方 data.json 日快照（git 跟踪）
  derived/                 # 聚合产物（gitignore，构建再生成）
  sources/                 # minitools.json 观察清单 / minitool-platform.json CLI 导入
src/                       # Vite + React + TS + ECharts 前端
docs/superpowers/          # 设计文档与实施计划
```

## 已知边界

- 小工具无公开数据源：观察清单为手动登记口径，页面已显著标注。
- `minitools:fetch` 依赖 redapp CLI 登录态（prod）；首次使用前按 redapp-cli skill 跑版本门禁。
- RedSkill 官方 data.json 若字段变更，`collect` 校验会拒绝落盘并报错——需跟进适配。
- 官方 `dataDate` 与本地采集日期可能不同（官方更新节奏决定），脚本按 `dataDate` 幂等。
