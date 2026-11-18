import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import OverviewPage from './pages/OverviewPage';
import RankingsPage from './pages/RankingsPage';
import CategoriesPage from './pages/CategoriesPage';
import KeywordsPage from './pages/KeywordsPage';
import MinitoolsPage from './pages/MinitoolsPage';
import { overview } from './data';

const TABS = [
  { to: '/', label: '总览' },
  { to: '/rankings', label: '榜单' },
  { to: '/categories', label: '赛道' },
  { to: '/keywords', label: '关键词' },
  { to: '/minitools', label: '小工具' },
];

function Layout() {
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <span className="brand">小红书生态趋势</span>
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
        <Route path="/" element={<OverviewPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/keywords" element={<KeywordsPage />} />
        <Route path="/minitools" element={<MinitoolsPage />} />
      </Routes>
      <footer className="footer">
        <div className="footer-inner">
          <p style={{ margin: '0 0 6px' }}>
            <b>数据说明</b> · 数据源：官方{' '}
            <a href="https://cowork.xiaohongshu.com/s/redskill-rank/" target="_blank" rel="noreferrer">
              REDSkill 排行榜
            </a>{' '}
            公开静态 JSON（每日快照存档于 data/snapshots）。
          </p>
          <p style={{ margin: '0 0 6px' }}>
            口径：<b>新增</b> = 相邻快照 skill_id 集合差（非时间戳估算）；<b>赛道</b> = 关键词规则估算（每技能首命中）；{' '}
            <b>小工具</b> = 手动登记非全量。
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
