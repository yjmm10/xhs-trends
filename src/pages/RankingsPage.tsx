import { useState } from 'react';
import RankTable from '../components/RankTable';
import { rankings } from '../data';
import type { RankListKey } from '../types';

const TABS: {
  key: RankListKey;
  label: string;
  nameField: 'skill_name' | 'nickname';
  values: { key: 'use_cnt' | 'use_users' | 'new7_cnt' | 'cum_cnt' | 'skill_cnt'; label: string }[];
}[] = [
  {
    key: 'useList',
    label: '使用人数榜',
    nameField: 'skill_name',
    values: [
      { key: 'use_cnt', label: '使用次数' },
      { key: 'use_users', label: '使用人数' },
    ],
  },
  {
    key: 'newList',
    label: '7天新增榜',
    nameField: 'skill_name',
    values: [
      { key: 'new7_cnt', label: '7日新增' },
      { key: 'cum_cnt', label: '累计' },
    ],
  },
  {
    key: 'todayList',
    label: '当日新增榜',
    nameField: 'skill_name',
    values: [
      { key: 'use_cnt', label: '使用次数' },
      { key: 'use_users', label: '使用人数' },
    ],
  },
  {
    key: 'authorList',
    label: '作者发布榜',
    nameField: 'nickname',
    values: [{ key: 'skill_cnt', label: '技能数' }],
  },
];

export default function RankingsPage() {
  const [tab, setTab] = useState<RankListKey>('useList');
  const conf = TABS.find((t) => t.key === tab)!;

  return (
    <div className="page">
      <h1 className="page-title">官方榜单</h1>
      <p className="page-sub">
        数据日期 {rankings.date}
        {rankings.prevDate ? ` · 对比上一份快照 ${rankings.prevDate}：↑上升 ↓下降 ·「新上榜」= 上一份快照中未出现` : ' · 首份快照，全部标记为新上榜'}
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === tab ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <RankTable
          rows={rankings[tab]}
          nameField={conf.nameField}
          descField={conf.nameField === 'skill_name' ? 'skill_description' : undefined}
          valueColumns={conf.values}
        />
      </div>
    </div>
  );
}
