/**
 * 分享卡片渲染器：纯 canvas 自绘（不走 DOM 截图），科技风、权威数据版式。
 * 三种内容：trend 趋势总览 / skill 单个技能 / list 榜单 TOP10
 * 四种平台尺寸：小红书 3:4、方形 1:1、横版 16:9、竖屏 9:16
 */
import { encode } from 'uqr';
import type { Overview, Rankings, RankRow, RankListKey } from '../types';

export type ShareType = 'trend' | 'skill' | 'list';
export type ShareSize = 'xhs' | 'square' | 'wide' | 'story';

export const SHARE_SIZES: Record<ShareSize, { w: number; h: number; label: string; desc: string }> = {
  xhs: { w: 1080, h: 1440, label: '3:4 小红书', desc: '小红书笔记配图' },
  square: { w: 1080, h: 1080, label: '1:1 方形', desc: '微博 / 朋友圈' },
  wide: { w: 1920, h: 1080, label: '16:9 横版', desc: '公众号头图 / X(Twitter)' },
  story: { w: 1080, h: 1920, label: '9:16 竖屏', desc: '短视频封面 / Story' },
};

export const LIST_LABELS: Record<RankListKey, string> = {
  useList: '使用人数榜',
  todayList: '当日新增榜',
  newList: '7天新增榜',
  authorList: '作者发布榜',
};

const LIST_EN: Record<RankListKey, string> = {
  todayList: 'TODAY NEW ADDITIONS',
  newList: '7-DAY NEW ADDITIONS',
  useList: 'MOST USED SKILLS',
  authorList: 'TOP PUBLISHERS',
};

const SANS = `'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,'SFMono-Regular',Consolas,monospace`;
const DISP = `'Orbitron','Noto Sans SC',sans-serif`;

/** #rrggbb → rgba(r,g,b,a) */
function tint(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** 分享卡主题：一套完整的霓虹深色配色 */
export interface ShareTheme {
  id: string;
  label: string;
  bg: [string, string, string];
  accent: string;
  accent2: string;
  gold: string;
  ink: string;
  muted: string;
  soft: string;
  softInk: string;
}

/** 十套主题配色：主色/副色/背景色相各自独立 */
export const SHARE_THEMES: ShareTheme[] = [
  {
    id: 'aurora', label: '极光青粉',
    bg: ['#070b16', '#0a1020', '#0d0a1c'],
    accent: '#22d3ee', accent2: '#f43f8e', gold: '#ffd166',
    ink: '#f2f7ff', muted: '#8fa0c0', soft: '#38bdf8', softInk: '#cfe0ff',
  },
  {
    id: 'matrix', label: '荧光矩阵',
    bg: ['#04120b', '#071a10', '#0a1410'],
    accent: '#34f5a3', accent2: '#a3e635', gold: '#fde047',
    ink: '#eafff5', muted: '#7ba88f', soft: '#10b981', softInk: '#c9f7e3',
  },
  {
    id: 'sunset', label: '落日余晖',
    bg: ['#160b06', '#1c0e08', '#1a0a14'],
    accent: '#fb923c', accent2: '#f87171', gold: '#fbbf24',
    ink: '#fff7ed', muted: '#c0a092', soft: '#f97316', softInk: '#ffe4d1',
  },
  {
    id: 'sakura', label: '樱花夜',
    bg: ['#14070d', '#1c0a12', '#180a1a'],
    accent: '#ff5c8a', accent2: '#ffb4c8', gold: '#ffd166',
    ink: '#fff5f8', muted: '#c495a5', soft: '#f9a8c9', softInk: '#ffdce8',
  },
  {
    id: 'electric', label: '电光蓝',
    bg: ['#060a18', '#0a1226', '#0b0a1e'],
    accent: '#38bdf8', accent2: '#f43f8e', gold: '#fde047',
    ink: '#f2f7ff', muted: '#8fa0c0', soft: '#60a5fa', softInk: '#d7e6ff',
  },
  {
    id: 'mint', label: '薄荷冰',
    bg: ['#041210', '#071c18', '#081518'],
    accent: '#2dd4bf', accent2: '#38bdf8', gold: '#fde047',
    ink: '#f0fffb', muted: '#7fa8a0', soft: '#14b8a6', softInk: '#ccf3ec',
  },
  {
    id: 'gold', label: '暗金郚银',
    bg: ['#0f0c04', '#161206', '#120e08'],
    accent: '#eab308', accent2: '#e2e8f0', gold: '#facc15',
    ink: '#fffbeb', muted: '#a89f8c', soft: '#d4a017', softInk: '#f2e8cf',
  },
  {
    id: 'crimson', label: '绯红霓虹',
    bg: ['#120508', '#1a080c', '#160810'],
    accent: '#fb7185', accent2: '#fb923c', gold: '#fbbf24',
    ink: '#fff1f2', muted: '#b08f98', soft: '#ef4444', softInk: '#ffd9de',
  },
  {
    id: 'ice', label: '冰川蓝白',
    bg: ['#040d14', '#07131d', '#081018'],
    accent: '#a5f3fc', accent2: '#93c5fd', gold: '#fcd34d',
    ink: '#f8fdff', muted: '#9ab4c4', soft: '#67e8f9', softInk: '#e4f6fc',
  },
  {
    id: 'neon', label: '品红霓虹',
    bg: ['#120612', '#1a0a16', '#140818'],
    accent: '#f43f8e', accent2: '#fb923c', gold: '#ffd166',
    ink: '#fff0f6', muted: '#b392a8', soft: '#ec4899', softInk: '#ffd6e7',
  },
];

/** 当前渲染主题（renderShareCard 每次入口处设置；同步渲染，无并发问题） */
let T: ShareTheme = SHARE_THEMES[0];

type Ctx = CanvasRenderingContext2D;

function font(weight: number | string, size: number, family = SANS): string {
  return `${weight} ${size}px ${family}`;
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString('zh-CN');
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  opts: {
    f?: string;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    glow?: number;
    glowColor?: string;
    maxWidth?: number;
  } = {}
) {
  const {
    f = font(400, 24),
    color = T.ink,
    align = 'left',
    baseline = 'alphabetic',
    glow = 0,
    glowColor,
    maxWidth,
  } = opts;
  ctx.save();
  ctx.font = f;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (glow > 0) {
    ctx.shadowColor = glowColor ?? color;
    ctx.shadowBlur = glow;
  }
  if (maxWidth) {
    const measured = ctx.measureText(str).width;
    if (measured > maxWidth) {
      const scale = maxWidth / measured;
      ctx.font = f.replace(
        /(\d+(?:\.\d+)?)px/,
        (_m, s) => `${Math.max(12, Math.floor(parseFloat(s) * scale))}px`
      );
    }
  }
  ctx.fillText(str, x, y);
  ctx.restore();
}

function wrapText(ctx: Ctx, str: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of str) {
    if (ctx.measureText(cur + ch).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
      if (lines.length === maxLines) return lines;
    } else {
      cur += ch;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

/** 固定 seed 伪随机星点 */
function drawStars(ctx: Ctx, w: number, h: number) {
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rand() * 1.8 + 0.4;
    ctx.globalAlpha = 0.12 + rand() * 0.3;
    ctx.fillStyle = i % 7 === 0 ? T.accent2 : T.soft;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 右上角雷达装饰：同心圆 + 十字 + 扫描弧 */
function drawRadar(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.strokeStyle = tint(T.accent, 0.22);
  ctx.lineWidth = 1.5;
  for (const k of [1, 0.66, 0.33]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  const grad = ctx.createConicGradient?.(-0.6, cx, cy);
  if (grad) {
    grad.addColorStop(0, tint(T.accent, 0.4));
    grad.addColorStop(0.12, tint(T.accent, 0));
    grad.addColorStop(1, tint(T.accent, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r * 0.96, -0.9, -0.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = T.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 深色科技底：渐变 + 网格 + 光晕 + 星点 + 角标 + 暗角 */
function drawBackground(ctx: Ctx, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, T.bg[0]);
  g.addColorStop(0.55, T.bg[1]);
  g.addColorStop(1, T.bg[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow1 = ctx.createRadialGradient(w * 0.5, -h * 0.12, 0, w * 0.5, -h * 0.12, h * 0.75);
  glow1.addColorStop(0, tint(T.accent, 0.22));
  glow1.addColorStop(1, tint(T.accent, 0));
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, w, h);
  const glow2 = ctx.createRadialGradient(w * 0.94, h * 1.04, 0, w * 0.94, h * 1.04, h * 0.6);
  glow2.addColorStop(0, tint(T.accent2, 0.17));
  glow2.addColorStop(1, tint(T.accent2, 0));
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = tint(T.soft, 0.05);
  ctx.lineWidth = 1;
  const step = Math.round(Math.min(w, h) / 22);
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  drawStars(ctx, w, h);

  // 顶部斜向光束
  const beam = ctx.createLinearGradient(w * 0.15, 0, w * 0.55, h * 0.5);
  beam.addColorStop(0, tint(T.accent, 0));
  beam.addColorStop(0.5, tint(T.accent, 0.07));
  beam.addColorStop(1, tint(T.accent, 0));
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, 0);
  ctx.lineTo(w * 0.3, 0);
  ctx.lineTo(w * 0.72, h * 0.5);
  ctx.lineTo(w * 0.6, h * 0.5);
  ctx.closePath();
  ctx.fill();

  // 暗角
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // 四角角标
  ctx.strokeStyle = tint(T.accent, 0.55);
  ctx.lineWidth = 3;
  const c = Math.round(Math.min(w, h) * 0.035);
  const m = Math.round(c * 0.7);
  const corners: [number, number, number, number][] = [
    [m, m, 1, 1],
    [w - m, m, -1, 1],
    [m, h - m, 1, -1],
    [w - m, h - m, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * c, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * c);
    ctx.stroke();
  }
}

/** LIVE 指示 chip */
function drawLive(ctx: Ctx, right: number, y: number, scale = 1) {
  const label = 'LIVE DATA';
  ctx.save();
  ctx.font = font(700, Math.round(20 * scale), MONO);
  const tw = ctx.measureText(label).width;
  const chipW = tw + 64 * scale;
  const chipH = 40 * scale;
  const x = right - chipW;
  roundRect(ctx, x, y - chipH / 2, chipW, chipH, chipH / 2);
  ctx.fillStyle = tint(T.accent2, 0.1);
  ctx.fill();
  ctx.strokeStyle = tint(T.accent2, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();
  const pulse = ctx.createRadialGradient(x + 26 * scale, y, 0, x + 26 * scale, y, 16 * scale);
  pulse.addColorStop(0, tint(T.accent2, 0.7));
  pulse.addColorStop(1, tint(T.accent2, 0));
  ctx.fillStyle = pulse;
  ctx.beginPath();
  ctx.arc(x + 26 * scale, y, 16 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = T.accent2;
  ctx.beginPath();
  ctx.arc(x + 26 * scale, y, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, label, x + 40 * scale, y, {
    f: font(700, Math.round(20 * scale), MONO),
    color: tint(T.accent2, 0.72),
    baseline: 'middle',
  });
  ctx.restore();
}

/** 顶部品牌栏：品牌字 + 中文副名 + LIVE + 日期 chip */
function drawBrand(ctx: Ctx, w: number, pad: number, top: number, dateLabel: string, inset = 0) {
  const brandSize = Math.round(pad * 0.42);
  text(ctx, 'REDSKILL TRENDS', pad, top, {
    f: font(900, brandSize, DISP),
    color: T.accent,
    glow: 16,
    glowColor: tint(T.accent, 0.8),
  });
  text(ctx, '小红书榜单趋势', pad, top + pad * 0.55, {
    f: font(700, Math.round(pad * 0.34)),
    color: T.muted,
  });
  drawLive(ctx, w - pad - inset, top - brandSize * 0.32, pad / 64);
  // 日期 chip
  ctx.save();
  ctx.font = font(600, Math.round(pad * 0.3), MONO);
  const tw = ctx.measureText(dateLabel).width;
  const chipW = tw + pad * 0.5;
  const chipH = pad * 0.5;
  const cx = w - pad - chipW - inset;
  const cy = top + pad * 0.28;
  roundRect(ctx, cx, cy, chipW, chipH, chipH / 2);
  ctx.strokeStyle = tint(T.accent, 0.5);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = tint(T.accent, 0.08);
  ctx.fill();
  text(ctx, dateLabel, cx + chipW / 2, cy + chipH / 2, {
    f: font(600, Math.round(pad * 0.3), MONO),
    color: T.accent,
    align: 'center',
    baseline: 'middle',
  });
  ctx.restore();
}

/** mono 数据跑马灯条 */
function drawTicker(ctx: Ctx, w: number, y: number, pad: number, items: [string, string][], accent = T.accent) {
  ctx.save();
  ctx.font = font(600, Math.round(pad * 0.27), MONO);
  const gap = 36;
  const segs: string[] = [];
  for (const [k, v] of items) segs.push(`${k} ${v}`);
  let totalW = 0;
  const widths = segs.map((s) => ctx.measureText(s).width);
  widths.forEach((wd) => (totalW += wd + gap * 2));
  const x0 = (w - totalW) / 2;
  ctx.strokeStyle = tint(T.soft, 0.25);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(Math.max(pad, x0 - 14), y);
  ctx.moveTo(Math.min(w - pad, x0 + totalW + 14), y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();
  let x = x0;
  segs.forEach((s, i) => {
    const isNum = i % 2 === 1;
    text(ctx, s, x + gap, y, {
      f: font(600, Math.round(pad * 0.27), MONO),
      color: isNum ? accent : T.muted,
      baseline: 'middle',
      glow: isNum ? 10 : 0,
      glowColor: tint(T.accent, 0.6),
    });
    x += widths[i] + gap * 2;
  });
  ctx.restore();
}

/** 底部来源栏 */
function drawFooter(ctx: Ctx, w: number, h: number, pad: number, generatedAt: string) {
  const y = h - pad * 0.9;
  ctx.strokeStyle = tint(T.soft, 0.25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, y - pad * 0.55);
  ctx.lineTo(w - pad, y - pad * 0.55);
  ctx.stroke();
  text(ctx, 'REDSKILL TRENDS · 每日追踪', pad, y, {
    f: font(500, Math.round(pad * 0.28)),
    color: T.muted,
  });
  text(ctx, `生成于 ${generatedAt}`, w - pad, y, {
    f: font(400, Math.round(pad * 0.26), MONO),
    color: tint(T.muted, 0.75),
    align: 'right',
  });
}

/** 指标面板：玻璃底 + 左霓虹条 + 标签/数值/副文 + 可选 sparkline */
function drawMetric(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub: string,
  accent = T.accent,
  spark?: number[]
) {
  roundRect(ctx, x, y, w, h, 18);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(26,37,62,0.9)');
  g.addColorStop(1, 'rgba(13,19,34,0.9)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = tint(T.soft, 0.28);
  ctx.lineWidth = 2;
  ctx.stroke();
  // 左霓虹条
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;
  roundRect(ctx, x + 14, y + 18, 5, h - 36, 3);
  ctx.fill();
  ctx.shadowBlur = 0;

  const padX = 40;
  if (spark && spark.length >= 2) {
    drawSparkline(ctx, x + w - 190, y + 22, 150, h - 44, spark, accent);
  }
  const vw = spark ? w - padX - 210 : w - padX - 30;
  text(ctx, label, x + padX, y + h * 0.3, { f: font(500, Math.round(h * 0.17)), color: T.muted });
  text(ctx, value, x + padX, y + h * 0.62, {
    f: font(800, Math.round(h * 0.32), MONO),
    color: accent,
    glow: 18,
    glowColor: tint(T.accent, 0.5),
    maxWidth: vw,
  });
  text(ctx, sub, x + padX, y + h * 0.86, {
    f: font(400, Math.round(h * 0.13), MONO),
    color: tint(T.muted, 0.85),
  });
}

/** sparkline 折线 + 渐变填充 */
function drawSparkline(ctx: Ctx, x: number, y: number, w: number, h: number, values: number[], color: string) {
  const vals = values.filter((v) => v !== null && v !== undefined) as number[];
  if (vals.length < 2) return;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => [
    x + (i / (vals.length - 1)) * w,
    y + h - 6 - ((v - min) / range) * (h - 12),
  ]);
  ctx.save();
  // 填充
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.lineTo(pts[pts.length - 1][0], y + h);
  ctx.lineTo(pts[0][0], y + h);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, y, 0, y + h);
  fill.addColorStop(0, tint(T.accent, 0.3));
  fill.addColorStop(1, tint(T.accent, 0));
  ctx.fillStyle = fill;
  ctx.fill();
  // 线
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.stroke();
  // 末点
  const [lx, ly] = pts[pts.length - 1];
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`900 80px "Noto Sans SC"`),
      document.fonts.load(`700 40px "Noto Sans SC"`),
      document.fonts.load(`800 46px "JetBrains Mono"`),
      document.fonts.load(`900 42px "Orbitron"`),
    ]);
    await document.fonts.ready;
  } catch {
    /* 字体加载失败则用系统回退 */
  }
}

/** 图表面板：边框容器 + 面板标题 + 自绘趋势曲线（不依赖 ECharts 导出，单快照也有内容） */
function drawChartPanel(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  series: { date: string; total: number; newSinceLast: number | null }[]
) {
  roundRect(ctx, x, y, w, h, 20);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(20,29,50,0.85)');
  g.addColorStop(1, 'rgba(10,15,28,0.85)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = tint(T.soft, 0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '收录量曲线 · TOTAL SKILLS', x + 26, y + 36, {
    f: font(700, 22),
    color: T.muted,
  });
  text(ctx, 'DAILY SNAPSHOT', x + w - 26, y + 36, {
    f: font(600, 18, MONO),
    color: tint(T.accent, 0.7),
    align: 'right',
  });

  const px = x + 30;
  const py = y + 66;
  const pw = w - 60;
  const ph = h - 100;
  const totals = series.map((s) => s.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);

  // 横向网格线
  ctx.strokeStyle = tint(T.soft, 0.08);
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const gy = py + (ph * i) / 3;
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.lineTo(px + pw, gy);
    ctx.stroke();
  }

  if (series.length >= 2) {
    const span = max - min || 1;
    const head = 0.18;
    const toXY = (i: number, v: number): [number, number] => [
      px + (i / (series.length - 1)) * pw,
      py + ph * (1 - head) - ((v - min) / span) * (ph * (1 - head - 0.12)),
    ];
    const pts = totals.map((v, i) => toXY(i, v));

    // 新增柱（底部 18% 区域）
    const barBase = py + ph;
    const barZone = ph * 0.16;
    const bw = Math.max(6, (pw / series.length) * 0.45);
    series.forEach((s, i) => {
      if (!s.newSinceLast) return;
      const bx = px + (i / (series.length - 1)) * pw - bw / 2;
      const bh = Math.min(barZone, (s.newSinceLast / max) * barZone + 4);
      roundRect(ctx, bx, barBase - bh, bw, bh, 3);
      ctx.fillStyle = tint(T.accent2, 0.75);
      ctx.fill();
    });

    // 面积填充
    ctx.beginPath();
    pts.forEach(([tx, ty], i) => (i ? ctx.lineTo(tx, ty) : ctx.moveTo(tx, ty)));
    ctx.lineTo(pts[pts.length - 1][0], py + ph);
    ctx.lineTo(pts[0][0], py + ph);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, py, 0, py + ph);
    fill.addColorStop(0, tint(T.accent, 0.32));
    fill.addColorStop(1, tint(T.accent, 0));
    ctx.fillStyle = fill;
    ctx.fill();

    // 平滑曲线（中点二次贝塞尔）
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      ctx.quadraticCurveTo(x0, y0, mx, (y0 + y1) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = 4;
    ctx.shadowColor = tint(T.accent, 0.7);
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 数据点
    pts.forEach(([tx, ty], i) => {
      const last = i === pts.length - 1;
      ctx.fillStyle = last ? '#ffffff' : '#0a1020';
      ctx.beginPath();
      ctx.arc(tx, ty, last ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = T.accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    // 末点数值标注
    const [lx, ly] = pts[pts.length - 1];
    text(ctx, fmt(totals[totals.length - 1]), lx, ly - 18, {
      f: font(800, 30, MONO),
      color: T.ink,
      align: lx > px + pw - 80 ? 'right' : 'center',
      glow: 12,
      glowColor: tint(T.accent, 0.7),
    });

    // x 轴日期
    text(ctx, series[0].date, px, py + ph + 26, { f: font(400, 18, MONO), color: T.muted });
    text(ctx, series[series.length - 1].date, px + pw, py + ph + 26, {
      f: font(400, 18, MONO),
      color: T.muted,
      align: 'right',
    });
  } else {
    // 单快照：基线 + 当前值 + 提示
    const baseY = py + ph * 0.72;
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = tint(T.accent, 0.5);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, baseY);
    ctx.lineTo(px + pw, baseY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px + pw * 0.5, baseY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, fmt(totals[0]), px + pw * 0.5, baseY - 26, {
      f: font(800, 44, MONO),
      color: T.ink,
      align: 'center',
      glow: 16,
      glowColor: tint(T.accent, 0.7),
    });
    text(ctx, `当前快照 ${series[0].date} · 累积多份快照后展示趋势曲线`, px + pw * 0.5, baseY + 44, {
      f: font(500, 22),
      color: T.muted,
      align: 'center',
    });
  }
}

// ── 各内容类型绘制 ─────────────────────────────────────────

function drawTrend(
  ctx: Ctx,
  w: number,
  h: number,
  pad: number,
  overview: Overview,
  reserve = 0,
  qrInset = 0
) {
  const { latest, series } = overview;
  const isWide = w > h;
  const top = pad * 1.5;
  // 右上角被二维码占用时跳过雷达装饰
  if (qrInset === 0) drawRadar(ctx, w - pad * 1.2, pad * 1.1, Math.min(w, h) * 0.09);
  drawBrand(ctx, w, pad, top, `DATA ${latest.date}`);

  const tickerY = top + pad * 1.15;
  drawTicker(ctx, w, tickerY, pad, [
    ['TOTAL', fmt(latest.total)],
    ['NEW', latest.newSinceLast === null ? 'N/A' : `+${fmt(latest.newSinceLast)}`],
    ['SNAPSHOTS', String(series.length)],
    ['SOURCE', 'OFFICIAL'],
  ]);

  const titleY = tickerY + pad * 1.35;
  text(ctx, '收录量趋势总览', pad, titleY, {
    f: font(900, isWide ? 84 : 76),
    color: T.ink,
    glow: 12,
    glowColor: tint(T.ink, 0.35),
    maxWidth: isWide ? w * 0.44 : w - pad * 2,
  });
  text(ctx, 'XIAOHONGSHU REDSKILL DAILY SNAPSHOT', pad, titleY + 52, {
    f: font(600, 22, MONO),
    color: T.accent,
    glow: 8,
    glowColor: tint(T.accent, 0.5),
  });

  const sparkTotals = series.map((p) => p.total);
  const sparkNews = series.map((p) => p.newSinceLast ?? 0);

  if (isWide) {
    const mw = w * 0.4 - pad * 1.2;
    const mh = 168;
    let y = titleY + 96;
    drawMetric(ctx, pad, y, mw, mh, '总收录量', fmt(latest.total), `截至 ${latest.date}`, T.accent, sparkTotals);
    y += mh + 22;
    drawMetric(
      ctx,
      pad,
      y,
      mw,
      mh,
      '较上次采集新增',
      latest.newSinceLast === null ? '—' : `+${fmt(latest.newSinceLast)}`,
      overview.prevDate ? `对比 ${overview.prevDate}` : '首份快照',
      T.accent2,
      sparkNews
    );
    y += mh + 22;
    drawMetric(ctx, pad, y, mw, mh, '快照覆盖', `${series.length} 份`, '日度存档 · GIT TRACKED', T.gold);
    if (isWide) {
      const ix = w * 0.42;
      drawChartPanel(ctx, ix, titleY + 90, w - ix - pad, h - titleY - 90 - pad * 1.9 - reserve, series);
    }
  } else {
    const mw = (w - pad * 2 - 24) / 3;
    const mh = mw * 0.62;
    let x = pad;
    const my = titleY + 96;
    drawMetric(ctx, x, my, mw, mh, '总收录量', fmt(latest.total), `截至 ${latest.date}`, T.accent, sparkTotals);
    x += mw + 24;
    drawMetric(
      ctx,
      x,
      my,
      mw,
      mh,
      '近次新增',
      latest.newSinceLast === null ? '—' : `+${fmt(latest.newSinceLast)}`,
      overview.prevDate ? `对比 ${overview.prevDate}` : '首份快照',
      T.accent2,
      sparkNews
    );
    x += mw + 24;
    drawMetric(ctx, x, my, mw, mh, '快照覆盖', `${series.length} 份`, '日度存档', T.gold);
    drawChartPanel(ctx, pad, my + mh + 30, w - pad * 2, h - (my + mh + 30) - pad * 1.9 - reserve, series);
  }
}

/** 统计小卡：与 drawMetric 同族玻璃面板，保证各内容块尺寸统一 */
function drawStatChip(ctx: Ctx, x: number, y: number, w: number, h: number, label: string, value: string, accent: string) {
  roundRect(ctx, x, y, w, h, 14);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(26,37,62,0.9)');
  g.addColorStop(1, 'rgba(13,19,34,0.9)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = tint(accent, 0.3);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = accent;
  roundRect(ctx, x + 12, y + 14, 4, h - 28, 2);
  ctx.fill();
  text(ctx, label, x + 26, y + h * 0.32, {
    f: font(600, Math.round(h * 0.17), MONO),
    color: T.muted,
  });
  text(ctx, value, x + 26, y + h * 0.68, {
    f: font(800, Math.round(h * 0.34), MONO),
    color: accent,
    glow: 10,
    glowColor: tint(accent, 0.5),
    maxWidth: w - 44,
  });
}

function drawSkill(
  ctx: Ctx,
  w: number,
  h: number,
  pad: number,
  row: RankRow,
  lists: { key: RankListKey; rows: RankRow[] }[],
  reserve = 0,
  qrInset = 0
) {
  const n0 = lists.length;
  // wide 且未勾选任何榜时退化为通栏排版（右栏无内容可放）
  const wide = w > h && n0 > 0;
  const isWide = wide;
  const top = pad * 1.5;
  const n = n0;
  // 右下大水印：主榜排名
  const mainRank = lists.map((l) => l.rows.find((x) => String(x.skill_id) === String(row.skill_id))?.rank).find(Boolean);
  ctx.save();
  ctx.font = font(900, Math.min(w, h) * 0.42, MONO);
  ctx.fillStyle = tint(T.accent, 0.055);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`#${mainRank ?? row.rank}`, w - pad * 0.4, h - pad * 1.2);
  ctx.restore();

  drawBrand(ctx, w, pad, top, `SKILL #${row.skill_id ?? row.rank}`, qrInset);

  const titleY = top + pad * 1.55;
  drawTicker(ctx, w, titleY - pad * 0.5, pad, [
    ['SKILL', 'PROFILE'],
    ['ID', String(row.skill_id ?? '—')],
    ['AUTHOR', String(row.nickname ?? '—').slice(0, 12)],
  ], T.accent2);

  text(ctx, '技能档案 · SKILL PROFILE', pad, titleY + pad * 0.5, {
    f: font(700, 26),
    color: T.accent2,
    glow: 10,
    glowColor: tint(T.accent2, 0.6),
  });
  const nameW = isWide ? w * 0.46 : w - pad * 2;
  text(ctx, String(row.skill_name ?? '—'), pad, titleY + pad * 0.5 + 74, {
    f: font(900, isWide ? 82 : 74),
    color: T.ink,
    maxWidth: nameW,
    glow: 12,
    glowColor: tint(T.ink, 0.3),
  });

  // 行区（wide 双栏右列 / portrait 通栏）
  const rx = isWide ? w * 0.52 : pad;
  const rw = isWide ? w - rx - pad : w - pad * 2;

  // 描述面板：无榜单行时放宽行数填充版面
  const desc = String(row.skill_description ?? '').trim();
  let descBottom = titleY + pad * 0.5 + 74 + 30;
  if (desc) {
    ctx.font = font(400, 27);
    const maxW = (isWide ? w * 0.44 : w - pad * 2) - 60;
    const lines = wrapText(ctx, desc, maxW, n === 0 ? 6 : isWide ? 4 : 3);
    const panelH = 30 + lines.length * 44 + 26;
    const py = descBottom + 26;
    roundRect(ctx, pad, py, isWide ? w * 0.44 : w - pad * 2, panelH, 16);
    ctx.fillStyle = 'rgba(23,33,56,0.65)';
    ctx.fill();
    ctx.strokeStyle = tint(T.soft, 0.2);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = T.accent2;
    roundRect(ctx, pad + 16, py + 22, 5, panelH - 44, 3);
    ctx.fill();
    lines.forEach((ln, i) => {
      text(ctx, ln, pad + 44, py + 52 + i * 44, {
        f: font(400, 27),
        color: tint(T.softInk, 0.9),
      });
    });
    descBottom = py + panelH;
  }

  // 核心指标 chips：无论勾选几个榜都展示，四格统一尺寸
  const useRank = (() => {
    const ul = lists.find((l) => l.key === 'useList');
    if (!ul) return null;
    const i = ul.rows.findIndex((x) => String(x.skill_id) === String(row.skill_id));
    return i >= 0 ? i + 1 : null;
  })();
  const chips: [string, string, string][] = [
    ['USERS · 在用', row.use_cnt != null ? fmt(row.use_cnt) : '—', T.accent],
    ['7D NEW · 7日新增', row.new7_cnt != null ? `+${fmt(row.new7_cnt)}` : '—', T.accent2],
    ['WORKS · 作品', row.skill_cnt != null ? fmt(row.skill_cnt) : '—', T.gold],
    ['USE RANK · 在用榜', useRank != null ? `#${useRank}` : '—', T.soft],
  ];
  const chipH = n === 0 ? 120 : 96;
  let chipsBottom: number;
  if (isWide) {
    // 左栏 2×2
    const cw = (w * 0.46 - 20) / 2;
    chips.forEach(([label, value, color], i) => {
      const cx = pad + (i % 2) * (cw + 20);
      const cy = descBottom + 26 + Math.floor(i / 2) * (chipH + 20);
      drawStatChip(ctx, cx, cy, cw, chipH, label, value, color);
    });
    chipsBottom = descBottom + 26 + 2 * chipH + 20;
  } else {
    const cw = (w - pad * 2 - 3 * 16) / 4;
    const cy = descBottom + 26;
    chips.forEach(([label, value, color], i) => {
      drawStatChip(ctx, pad + i * (cw + 16), cy, cw, chipH, label, value, color);
    });
    chipsBottom = cy + chipH;
  }

  // 榜单行：高度随数量自适应、整组垂直居中，把剩余空间吃满
  if (n > 0) {
    const rowsTop = isWide ? titleY + pad * 1.1 : chipsBottom + 30;
    const availH = h - rowsTop - pad * 1.9 - reserve;
    const rowGap = 18;
    const rowH = Math.max(56, Math.min(isWide ? 200 : 150, (availH - (n - 1) * rowGap) / n));
    const groupH = n * rowH + (n - 1) * rowGap;
    const groupTop = rowsTop + Math.max(0, (availH - groupH) / 2);
    lists.forEach((l, li) => {
      const y = groupTop + li * (rowH + rowGap);
      const r = l.rows.find((x) => String(x.skill_id) === String(row.skill_id));
      roundRect(ctx, rx, y, rw, rowH, 14);
      const g = ctx.createLinearGradient(rx, y, rx + rw, y);
      g.addColorStop(0, 'rgba(26,37,62,0.85)');
      g.addColorStop(1, 'rgba(13,19,34,0.85)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = r ? tint(T.soft, 0.24) : tint(T.soft, 0.1);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const cy = y + rowH / 2;
      if (!r) {
        text(ctx, LIST_LABELS[l.key], rx + 24, cy, {
          f: font(700, Math.round(rowH * 0.22)),
          color: tint(T.muted, 0.65),
          baseline: 'middle',
        });
        text(ctx, '未上榜', rx + rw - 24, cy, {
          f: font(500, Math.round(rowH * 0.2)),
          color: tint(T.muted, 0.45),
          align: 'right',
          baseline: 'middle',
        });
        return;
      }
      const value = listOf(r, l.key);
      const topVal = Math.max(listOf(l.rows[0] ?? r, l.key), 1);
      text(ctx, '#' + r.rank, rx + 24, cy, {
        f: font(800, Math.round(rowH * 0.38), MONO),
        color: r.rank <= 3 ? T.gold : T.accent,
        baseline: 'middle',
        glow: r.rank <= 3 ? 14 : 0,
        glowColor: tint(T.gold, 0.6),
      });
      text(ctx, LIST_LABELS[l.key], rx + 110, cy - rowH * 0.16, {
        f: font(700, Math.round(rowH * 0.24)),
        color: T.ink,
        baseline: 'middle',
      });
      const barY = cy + rowH * 0.14;
      const barW = rw - 110 - 40 - 220;
      const bx = rx + 110;
      if (barW > 60) {
        roundRect(ctx, bx, barY, barW, 8, 4);
        ctx.fillStyle = tint(T.soft, 0.12);
        ctx.fill();
        const frac = Math.max(0.06, Math.min(1, value / topVal));
        roundRect(ctx, bx, barY, barW * frac, 8, 4);
        const bg = ctx.createLinearGradient(bx, 0, bx + barW, 0);
        bg.addColorStop(0, tint(T.accent, 0.9));
        bg.addColorStop(1, tint(T.accent2, 0.9));
        ctx.fillStyle = bg;
        ctx.shadowColor = tint(T.accent, 0.7);
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      text(ctx, valueLabel(r, l.key), rx + rw - 24, cy, {
        f: font(600, Math.round(rowH * 0.22), MONO),
        color: tint(T.softInk, 0.92),
        align: 'right',
        baseline: 'middle',
      });
    });
  }
}

function listOf(r: RankRow, key: RankListKey): number {
  if (key === 'newList') return r.new7_cnt ?? 0;
  if (key === 'authorList') return r.skill_cnt ?? 0;
  return r.use_cnt ?? 0;
}

function valueLabel(r: RankRow, key: RankListKey): string {
  if (key === 'newList') return `+${fmt(r.new7_cnt)}`;
  if (key === 'authorList') return `${fmt(r.skill_cnt)} 个`;
  return `${fmt(r.use_cnt)} 次`;
}

function nameOf(r: RankRow, key: RankListKey): string {
  return String((key === 'authorList' ? r.nickname : r.skill_name) ?? '—');
}

function drawList(
  ctx: Ctx,
  w: number,
  h: number,
  pad: number,
  listKey: RankListKey,
  rows: RankRow[],
  dateLabel: string,
  _reserve = 0,
  qrInset = 0
) {
  const isWide = w > h;
  const top = pad * 1.5;
  drawBrand(ctx, w, pad, top, `TOP ${Math.min(10, rows.length)} · ${dateLabel}`, qrInset);

  const titleY = top + pad * 1.55;
  drawTicker(ctx, w, titleY - pad * 0.5, pad, [
    ['BOARD', LIST_EN[listKey]],
    ['DATE', dateLabel],
    ['RANGE', 'TOP 10'],
  ]);

  text(ctx, LIST_LABELS[listKey], pad, titleY + pad * 0.85, {
    f: font(900, isWide ? 84 : 76),
    color: T.ink,
    glow: 12,
    glowColor: tint(T.ink, 0.35),
  });
  text(ctx, `REDSKILL ${LIST_EN[listKey]}`, pad, titleY + pad * 0.85 + 50, {
    f: font(600, 22, MONO),
    color: T.accent,
    glow: 8,
    glowColor: tint(T.accent, 0.5),
  });

  const top10 = rows.slice(0, 10);
  const maxVal = Math.max(...top10.map((r) => listOf(r, listKey)), 1);

  const renderRow = (r: RankRow, i: number, x: number, y: number, rw: number, rh: number) => {
    const rank = i + 1;
    roundRect(ctx, x, y, rw, rh, Math.min(16, rh / 3));
    const g = ctx.createLinearGradient(x, y, x + rw, y);
    if (rank === 1) {
      g.addColorStop(0, tint(T.gold, 0.2));
      g.addColorStop(1, 'rgba(23,33,56,0.8)');
    } else if (rank <= 3) {
      g.addColorStop(0, tint(T.accent, 0.14));
      g.addColorStop(1, 'rgba(23,33,56,0.8)');
    } else {
      g.addColorStop(0, 'rgba(23,33,56,0.85)');
      g.addColorStop(1, 'rgba(13,19,34,0.85)');
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle =
      rank === 1 ? tint(T.gold, 0.6) : rank <= 3 ? tint(T.accent, 0.45) : tint(T.soft, 0.2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // rank 徽章
    const bs = Math.min(rh * 0.62, 64);
    const bx = x + 20;
    const by = y + (rh - bs) / 2;
    roundRect(ctx, bx, by, bs, bs, 12);
    const bg2 = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
    if (rank === 1) {
      bg2.addColorStop(0, tint(T.gold, 0.95));
      bg2.addColorStop(1, 'rgba(255,150,60,0.95)');
    } else if (rank === 2) {
      bg2.addColorStop(0, 'rgba(201,214,234,0.9)');
      bg2.addColorStop(1, 'rgba(130,150,180,0.9)');
    } else if (rank === 3) {
      bg2.addColorStop(0, tint(T.accent2, 0.85));
      bg2.addColorStop(1, 'rgba(180,40,100,0.85)');
    } else {
      bg2.addColorStop(0, tint(T.accent, 0.16));
      bg2.addColorStop(1, tint(T.accent, 0.05));
    }
    ctx.fillStyle = bg2;
    ctx.fill();
    if (rank > 3) {
      ctx.strokeStyle = tint(T.accent, 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    text(ctx, String(rank).padStart(2, '0'), bx + bs / 2, by + bs / 2, {
      f: font(800, Math.round(bs * 0.42), MONO),
      color: rank === 1 ? '#241a00' : rank === 2 ? '#101828' : rank === 3 ? '#fff' : T.accent,
      align: 'center',
      baseline: 'middle',
      glow: rank <= 3 ? 10 : 0,
      glowColor: rank === 1 ? tint(T.gold, 0.9) : tint(T.accent, 0.8),
    });

    // 名称 + 变化 chip
    const nameX = bx + bs + 24;
    const nameFont = font(700, Math.round(rh * 0.28));
    ctx.font = nameFont;
    let displayName = nameOf(r, listKey);
    const maxNameW = rw - (nameX - x) - 190;
    if (ctx.measureText(displayName).width > maxNameW) {
      while (displayName.length > 1 && ctx.measureText(displayName + '…').width > maxNameW) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '…';
    }
    const nameCy = y + rh * 0.4;
    text(ctx, displayName, nameX, nameCy, { f: nameFont, color: T.ink, baseline: 'middle' });
    let chipX = nameX + ctx.measureText(displayName).width + 14;
    if (r.isNew) {
      text(ctx, '新上榜', chipX, nameCy, {
        f: font(700, Math.round(rh * 0.17)),
        color: T.accent2,
        baseline: 'middle',
      });
    } else if (r.rankDelta !== null && r.rankDelta > 0) {
      text(ctx, `↑${r.rankDelta}`, chipX, nameCy, {
        f: font(700, Math.round(rh * 0.19), MONO),
        color: '#34f5c5',
        baseline: 'middle',
      });
    } else if (r.rankDelta !== null && r.rankDelta < 0) {
      text(ctx, `↓${Math.abs(r.rankDelta)}`, chipX, nameCy, {
        f: font(700, Math.round(rh * 0.19), MONO),
        color: '#ff4d6d',
        baseline: 'middle',
      });
    }
    void chipX;

    // 比例条（下行）
    const barY = y + rh * 0.68;
    const barW = rw - (nameX - x) - 200;
    if (barW > 60) {
      roundRect(ctx, nameX, barY, barW, 7, 3.5);
      ctx.fillStyle = tint(T.soft, 0.12);
      ctx.fill();
      const frac = Math.max(0.05, Math.min(1, listOf(r, listKey) / maxVal));
      roundRect(ctx, nameX, barY, barW * frac, 7, 3.5);
      const bg3 = ctx.createLinearGradient(nameX, 0, nameX + barW, 0);
      bg3.addColorStop(0, tint(T.accent, 0.9));
      bg3.addColorStop(1, rank === 1 ? tint(T.gold, 0.95) : tint(T.accent2, 0.9));
      ctx.fillStyle = bg3;
      ctx.shadowColor = tint(T.accent, 0.6);
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 数值
    text(ctx, valueLabel(r, listKey), x + rw - 24, nameCy, {
      f: font(700, Math.round(rh * 0.28), MONO),
      color: rank === 1 ? T.gold : tint(T.softInk, 0.95),
      align: 'right',
      baseline: 'middle',
      glow: rank === 1 ? 12 : 0,
      glowColor: tint(T.gold, 0.6),
    });
  };

  if (isWide) {
    const colW = (w - pad * 2 - 40) / 2;
    const availH = h - (titleY + pad * 0.85 + 90) - pad * 1.9;
    const rowH = Math.max(56, Math.min(96, availH / 5 - 14));
    top10.forEach((r, i) => {
      const col = i < 5 ? 0 : 1;
      const idx = i % 5;
      renderRow(r, i, pad + col * (colW + 40), titleY + pad * 0.85 + 90 + idx * (rowH + 14), colW, rowH);
    });
  } else {
    const availH = h - (titleY + pad * 0.85 + 90) - pad * 1.9;
    const rowH = Math.max(48, Math.min(104, availH / top10.length - 12));
    top10.forEach((r, i) => {
      renderRow(r, i, pad, titleY + pad * 0.85 + 90 + i * (rowH + 12), w - pad * 2, rowH);
    });
  }
}

/** 顶部右侧二维码卡片：白底 + 主题色描边 + SCAN 标注，不遮挡正文内容 */
function drawQRChip(ctx: Ctx, w: number, h: number, pad: number, url: string) {
  let n = 0;
  let rows: boolean[][] = [];
  try {
    const q = encode(url);
    n = q.size;
    rows = q.data as unknown as boolean[][];
  } catch {
    return; // 非法链接：静默跳过二维码
  }
  const box = Math.round(Math.min(w, h) * 0.115);
  const quiet = Math.round(box * 0.08);
  const total = box + quiet * 2;
  const bx = w - pad - total;
  const by = Math.round(pad * 0.92);
  roundRect(ctx, bx, by, total, total, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = tint(T.accent, 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();
  const cell = box / n;
  ctx.fillStyle = '#0b1220';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (rows[r]?.[c]) {
        ctx.fillRect(Math.round(bx + quiet + c * cell), Math.round(by + quiet + r * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
  }
  text(ctx, 'SCAN · 文章链接', bx + total, by + total + 26, {
    f: font(600, Math.round(pad * 0.2), MONO),
    color: tint(T.muted, 0.9),
    align: 'right',
  });
}

export interface CardOptions {
  type: ShareType;
  size: ShareSize;
  overview: Overview;
  rankings: Rankings;
  listKey: RankListKey;
  skill: RankRow | null;
  /** 单技能卡：要展示的榜单（默认全部四榜） */
  skillLists?: RankListKey[];
  /** 文章链接：非空时在卡片右下角生成二维码 */
  link?: string;
  /** 主题 id（默认第一套） */
  theme?: string;
}

/** 渲染分享卡片，返回 canvas */
export async function renderShareCard(opts: CardOptions): Promise<HTMLCanvasElement> {
  await ensureFonts();
  T = SHARE_THEMES.find((t) => t.id === opts.theme) ?? SHARE_THEMES[0];
  const { w, h } = SHARE_SIZES[opts.size];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  drawBackground(ctx, w, h);
  const pad = Math.round(Math.min(w, h) * 0.062);
  const generatedAt = new Date().toLocaleString('zh-CN', { hour12: false });

  // 二维码：置于顶部右侧，品牌栏 chip 左移避让
  const link = opts.link?.trim();
  const hasQR = !!link && /^https?:\/\//i.test(link);
  const qrBox = Math.round(Math.min(w, h) * 0.115);
  const qrTotal = qrBox + Math.round(qrBox * 0.08) * 2;
  const qrInset = hasQR ? qrTotal + 28 : 0;

  if (opts.type === 'trend') {
    drawTrend(ctx, w, h, pad, opts.overview, 0, qrInset);
  } else if (opts.type === 'skill' && opts.skill) {
    const sel = (opts.skillLists ?? []).filter((k) => k in LIST_LABELS);
    const lists = sel.map((key) => ({ key, rows: opts.rankings[key] }));
    drawSkill(ctx, w, h, pad, opts.skill, lists, 0, qrInset);
  } else {
    drawList(ctx, w, h, pad, opts.listKey, opts.rankings[opts.listKey], opts.rankings.date, 0, qrInset);
  }

  if (link && hasQR) drawQRChip(ctx, w, h, pad, link);
  drawFooter(ctx, w, h, pad, generatedAt);
  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}

export async function copyCanvas(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob || !navigator.clipboard || !('write' in navigator.clipboard)) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}
