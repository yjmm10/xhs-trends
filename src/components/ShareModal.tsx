import { useEffect, useMemo, useRef, useState } from 'react';
import type { Overview, Rankings, RankListKey, RankRow } from '../types';
import {
  LIST_LABELS,
  SHARE_SIZES,
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

export default function ShareModal({ open, onClose, overview, rankings }: Props) {
  const [type, setType] = useState<ShareType>('trend');
  const [size, setSize] = useState<ShareSize>('xhs');
  const [listKey, setListKey] = useState<RankListKey>('todayList');
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
  }, [open, type, size, listKey, skillId, overview, rankings, selectedSkill]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    const ok = await copyCanvas(canvasRef.current);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
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
              <div className="seg">
                <button className={type === 'trend' ? 'active' : ''} onClick={() => setType('trend')}>
                  <span className="t">📈 趋势总览</span>
                  <span className="d">收录量趋势 + 核心指标</span>
                </button>
                <button className={type === 'skill' ? 'active' : ''} onClick={() => setType('skill')}>
                  <span className="t">🎯 单个技能</span>
                  <span className="d">指定技能的四榜档案</span>
                </button>
                <button className={type === 'list' ? 'active' : ''} onClick={() => setType('list')}>
                  <span className="t">🏆 榜单 TOP10</span>
                  <span className="d">某一榜单前 10 名</span>
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
                  <select value={skillId} onChange={(e) => setSkillId(e.target.value)} size={6}>
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
              </>
            )}

            <label className="field">
              <span>卡片尺寸（平台）</span>
              <div className="seg">
                {SIZE_KEYS.map((k) => (
                  <button key={k} className={size === k ? 'active' : ''} onClick={() => setSize(k)}>
                    <span className="t">{SHARE_SIZES[k].label}</span>
                    <span className="d">
                      {SHARE_SIZES[k].w}×{SHARE_SIZES[k].h} · {SHARE_SIZES[k].desc}
                    </span>
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
                onClick={() =>
                  canvasRef.current &&
                  downloadCanvas(
                    canvasRef.current,
                    `redskill-${type}-${size}-${overview.latestDate}.png`
                  )
                }
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
          </div>
        </div>
      </div>
    </div>
  );
}
