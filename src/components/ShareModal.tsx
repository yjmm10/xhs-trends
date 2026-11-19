import { useEffect, useMemo, useRef, useState } from 'react';
import type { Overview, Rankings, RankListKey, RankRow } from '../types';
import { addShare, removeShare, useShares } from '../lib/localStore';
import { xhsNoteUrl } from '../lib/vibeCats';
import {
  LIST_LABELS,
  SHARE_SIZES,
  SHARE_THEMES,
  copyCanvas,
  downloadCanvas,
  renderShareCard,
  type ShareSize,
  type ShareType,
} from '../share/cardRenderer';

interface Props {
  open: boolean;
  onClose: () => void;
  overview: Overview;
  rankings: Rankings;
}

const SIZE_KEYS = Object.keys(SHARE_SIZES) as ShareSize[];
const ALL_LIST_KEYS = Object.keys(LIST_LABELS) as RankListKey[];

/** 检测技能当前上榜的榜单；一个都没上则默认使用人数榜 */
function detectLists(r: RankRow | null, rankings: Rankings): RankListKey[] {
  if (!r) return ['useList'];
  const hit = ALL_LIST_KEYS.filter((k) =>
    rankings[k].some((x) => String(x.skill_id) === String(r.skill_id))
  );
  return hit.length ? hit : ['useList'];
}

export default function ShareModal({ open, onClose, overview, rankings }: Props) {
  const [type, setType] = useState<ShareType>('trend');
  const [size, setSize] = useState<ShareSize>('xhs');
  const [listKey, setListKey] = useState<RankListKey>('useList');
  const [theme, setTheme] = useState(SHARE_THEMES[0].id);
  const [skillLists, setSkillLists] = useState<RankListKey[]>(['useList']);
  const [link, setLink] = useState('');
  const [skillQuery, setSkillQuery] = useState('');
  const [skillId, setSkillId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  // 技能选项：三个技能榜并集
  const skillOptions = useMemo(() => {
    const map = new Map<string, RankRow>();
    for (const key of ['todayList', 'newList', 'useList'] as const) {
      for (const r of rankings[key]) {
        const id = String(r.skill_id ?? '');
        if (id && !map.has(id)) map.set(id, r);
      }
    }
    return [...map.values()];
  }, [rankings]);

  const filteredSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    if (!q) return skillOptions.slice(0, 60);
    return skillOptions
      .filter(
        (r) =>
          String(r.skill_name ?? '').toLowerCase().includes(q) ||
          String(r.skill_description ?? '').toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [skillOptions, skillQuery]);

  const selectedSkill = useMemo(
    () => skillOptions.find((r) => String(r.skill_id) === skillId) ?? null,
    [skillOptions, skillId]
  );

  // 渲染预览 + 保存成品 canvas
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    renderShareCard({
      type,
      size,
      overview,
      rankings,
      listKey,
      theme,
      skillLists,
      link,
      skill: type === 'skill' ? selectedSkill : null,
    })
      .then((canvas) => {
        if (cancelled) return;
        canvasRef.current = canvas;
        const preview = previewRef.current;
        if (preview) {
          preview.width = canvas.width;
          preview.height = canvas.height;
          preview.getContext('2d')!.drawImage(canvas, 0, 0);
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, type, size, listKey, theme, skillLists, link, skillId, overview, rankings, selectedSkill]);

  const shares = useShares();

  if (!open) return null;

  /** 成品图写入本地缓存（JPEG，超出配额自动丢最旧） */
  const cacheCurrent = () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const typeLabel = type === 'trend' ? '趋势总览' : type === 'skill' ? `技能 ${selectedSkill?.skill_name ?? ''}` : '榜单 TOP10';
      addShare(`${typeLabel} · ${SHARE_SIZES[size].label} · ${overview.latestDate}`, c.toDataURL('image/jpeg', 0.9));
    } catch {
      /* 缓存失败静默降级：不影响下载/复制 */
    }
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    const ok = await copyCanvas(canvasRef.current);
    if (ok) cacheCurrent();
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadShare = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--display)', marginRight: 8 }}>◈</span>
            生成分享卡片
          </h2>
          <button className="x" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="share-grid">
          <div>
            <label className="field">
              <span>内容类型</span>
              <div className="seg inline">
                <button className={type === 'trend' ? 'active' : ''} onClick={() => setType('trend')}>
                  <span className="t">📈 趋势总览</span>
                </button>
                <button className={type === 'skill' ? 'active' : ''} onClick={() => setType('skill')}>
                  <span className="t">🎯 单个技能</span>
                </button>
                <button className={type === 'list' ? 'active' : ''} onClick={() => setType('list')}>
                  <span className="t">🏆 榜单 TOP10</span>
                </button>
              </div>
            </label>

            {type === 'list' && (
              <label className="field">
                <span>选择榜单</span>
                <select value={listKey} onChange={(e) => setListKey(e.target.value as RankListKey)}>
                  {(Object.keys(LIST_LABELS) as RankListKey[]).map((k) => (
                    <option key={k} value={k}>
                      {LIST_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {type === 'skill' && (
              <>
                <label className="field">
                  <span>搜索技能</span>
                  <input
                    type="text"
                    placeholder="技能名 / 描述关键词…"
                    value={skillQuery}
                    onChange={(e) => setSkillQuery(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>选择技能（{skillOptions.length} 个上榜技能）</span>
                  <select
                    className="skill-select"
                    value={skillId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSkillId(v);
                      // 切换技能时：自动勾选其上榜的榜单 + 预填笔记链接
                      const r = skillOptions.find((x) => String(x.skill_id) === v) ?? null;
                      setSkillLists(detectLists(r, rankings));
                      setLink(r?.note_id ? xhsNoteUrl(r.note_id) ?? '' : '');
                    }}
                    size={6}
                  >
                    {filteredSkills.map((r) => (
                      <option key={r.skill_id} value={String(r.skill_id)}>
                        {r.skill_name}
                      </option>
                    ))}
                  </select>
                </label>
                {!selectedSkill && (
                  <div className="modal-note" style={{ marginBottom: 12 }}>
                    请从列表中选择一个技能
                  </div>
                )}
                {selectedSkill && (
                  <label className="field">
                    <span>展示榜单（一般只上 1～2 个榜，可只勾实际上榜的）</span>
                    <div className="chip-row">
                      {ALL_LIST_KEYS.map((k) => {
                        const on = skillLists.includes(k);
                        return (
                          <button
                            key={k}
                            className={on ? 'chip-toggle active' : 'chip-toggle'}
                            onClick={() => {
                              const next = on ? skillLists.filter((x) => x !== k) : [...skillLists, k];
                              // 允许一个都不选：卡片只展示标题/简介，不渲染榜单行
                              setSkillLists(next);
                            }}
                          >
                            {on ? '✓ ' : ''}
                            {LIST_LABELS[k]}
                            {!rankings[k].some((x) => String(x.skill_id) === String(selectedSkill.skill_id)) &&
                              ' （未上榜）'}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                )}
              </>
            )}

            <label className="field">
              <span>主题配色（10 款）</span>
              <div className="theme-row">
                {SHARE_THEMES.map((t) => (
                  <button
                    key={t.id}
                    title={t.label}
                    aria-label={t.label}
                    className={theme === t.id ? 'theme-dot active' : 'theme-dot'}
                    onClick={() => setTheme(t.id)}
                  >
                    <i
                      style={{
                        background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                      }}
                    />
                  </button>
                ))}
              </div>
            </label>

            <label className="field">
              <span>文章链接（右下角生成二维码，可留空）</span>
              <input
                type="url"
                placeholder="https://www.xiaohongshu.com/explore/…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </label>

            <label className="field">
              <span>卡片尺寸（平台）</span>
              <div className="seg">
                {SIZE_KEYS.map((k) => (
                  <button key={k} className={size === k ? 'active' : ''} onClick={() => setSize(k)}>
                    <span className="t">{SHARE_SIZES[k].label}</span>
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div>
            <div className="preview-box">
              <canvas ref={previewRef} style={{ maxHeight: 560 }} />
            </div>
            <div className="modal-actions">
              <button
                className="btn-solid"
                disabled={busy || !canvasRef.current || (type === 'skill' && !selectedSkill)}
                onClick={() => {
                  if (!canvasRef.current) return;
                  cacheCurrent();
                  downloadCanvas(canvasRef.current, `redskill-${type}-${size}-${overview.latestDate}.png`);
                }}
              >
                ⬇ 下载 PNG
              </button>
              <button className="btn-ghost" onClick={handleCopy} disabled={busy || !canvasRef.current}>
                {copied ? '✓ 已复制到剪贴板' : '⧉ 复制图片'}
              </button>
              <span className="modal-note">
                {busy ? '渲染中…' : `${SHARE_SIZES[size].w}×${SHARE_SIZES[size].h}px · 数据日期 ${overview.latestDate}`}
              </span>
            </div>

            {shares.length > 0 && (
              <div className="share-cache">
                <div className="share-cache-head">本地缓存 · 最近 {shares.length} 张（仅存于浏览器）</div>
                <div className="share-cache-list">
                  {shares.map((s) => (
                    <div className="share-cache-item" key={s.id} title={s.label}>
                      <img src={s.dataUrl} alt={s.label} onClick={() => downloadShare(s.dataUrl, `${s.id}.jpg`)} />
                      <div className="share-cache-ops">
                        <button title="下载" onClick={() => downloadShare(s.dataUrl, `${s.id}.jpg`)}>
                          ⬇
                        </button>
                        <button title="删除" onClick={() => removeShare(s.id)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
