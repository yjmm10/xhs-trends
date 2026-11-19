import { useSyncExternalStore } from 'react';

/**
 * 本地缓存层（仅存于浏览器 localStorage，不上传）：
 * - 收藏：用户在榜单里点亮的 ★（SKILL / 小工具均支持）
 * - 分享图：生成下载/复制过的分享卡片缩略缓存，便于回看与重新下载
 */

export type FavKind = 'skill' | 'app';

export interface FavItem {
  kind: FavKind;
  id: string;
  name: string;
  /** 收藏时所在榜单（中文名） */
  list: string;
  /** 收藏时的数据日期 */
  date: string;
  /** 收藏时的关键数值（label → 展示值） */
  values: { label: string; value: string }[];
  noteId?: string;
  ts: number;
}

export interface ShareEntry {
  id: string;
  ts: number;
  label: string;
  dataUrl: string;
}

const FAV_KEY = 'xhs-trends:favs:v1';
const SHARE_KEY = 'xhs-trends:shares:v1';
const FAV_LIMIT = 100;
const SHARE_LIMIT = 6;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ── 收藏 ─────────────────────────────────── */

let favs = read<FavItem[]>(FAV_KEY, []);
const favListeners = new Set<() => void>();

function emitFavs() {
  favListeners.forEach((l) => l());
}

export function subscribeFavs(cb: () => void): () => void {
  favListeners.add(cb);
  return () => favListeners.delete(cb);
}

export function getFavs(): FavItem[] {
  return favs;
}

export function isFav(kind: FavKind, id: string): boolean {
  return favs.some((f) => f.kind === kind && f.id === id);
}

export function toggleFav(item: Omit<FavItem, 'ts'>): void {
  favs = isFav(item.kind, item.id)
    ? favs.filter((f) => !(f.kind === item.kind && f.id === item.id))
    : [{ ...item, ts: Date.now() }, ...favs].slice(0, FAV_LIMIT);
  write(FAV_KEY, favs);
  emitFavs();
}

export function removeFav(kind: FavKind, id: string): void {
  favs = favs.filter((f) => !(f.kind === kind && f.id === id));
  write(FAV_KEY, favs);
  emitFavs();
}

export function useFavs(): FavItem[] {
  return useSyncExternalStore(subscribeFavs, getFavs);
}

/* ── 分享图缓存 ───────────────────────────── */

let shares = read<ShareEntry[]>(SHARE_KEY, []);
const shareListeners = new Set<() => void>();

function emitShares() {
  shareListeners.forEach((l) => l());
}

export function subscribeShares(cb: () => void): () => void {
  shareListeners.add(cb);
  return () => shareListeners.delete(cb);
}

export function getShares(): ShareEntry[] {
  return shares;
}

/** 新增分享图缓存；超出配额时自动丢最旧（localStorage 写失败再丢一次）。 */
export function addShare(label: string, dataUrl: string): ShareEntry | null {
  const entry: ShareEntry = { id: `share-${Date.now().toString(36)}`, ts: Date.now(), label, dataUrl };
  let next = [entry, ...shares].slice(0, SHARE_LIMIT);
  if (!write(SHARE_KEY, next)) {
    next = next.slice(0, Math.max(1, SHARE_LIMIT - 2));
    if (!write(SHARE_KEY, next)) return null;
  }
  shares = next;
  emitShares();
  return entry;
}

export function removeShare(id: string): void {
  shares = shares.filter((s) => s.id !== id);
  write(SHARE_KEY, shares);
  emitShares();
}

export function useShares(): ShareEntry[] {
  return useSyncExternalStore(subscribeShares, getShares);
}
