import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import MinitoolsPage from './pages/MinitoolsPage';
import RankingsPage from './pages/RankingsPage';
import { overview } from './data';

const TABS = [
  { to: '/', label: '小工具' },
  { to: '/rankings', label: 'REDSkill 榜单' },
];

function Layout() {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <span className="brand">小红书小工具趋势</span>
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<MinitoolsPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="*" element={<MinitoolsPage />} />
      </Routes>
      <footer className="footer">
        <div className="footer-inner">
          <p style={{ margin: '0 0 6px' }}>
            <b>数据说明</b> · 小工具：本账号作品来自 redapp CLI 只读查询（官方类目 + 作品状态），观察清单为手动登记——平台暂无公开榜单；
            REDSkill 榜单来自官方{' '}
            <a href="https://cowork.xiaohongshu.com/s/redskill-rank/" target="_blank" rel="noreferrer">
              REDSkill 排行榜
            </a>{' '}
            公开静态 JSON（每日快照存档于 data/snapshots）。
          </p>
          <p style={{ margin: '0 0 6px' }}>
            口径：<b>RedSkill 新增</b> = 相邻快照 skill_id 集合差（非时间戳估算）；<b>小工具</b>数据非平台全量。
          </p>
          <p style={{ margin: 0 }}>
            聚合生成时间 {new Date(overview.generatedAt).toLocaleString('zh-CN')} · 本站为个人研究工具，与小红书官方无关。
          </p>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}
