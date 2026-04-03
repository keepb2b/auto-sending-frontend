import { Routes, Route, Outlet, NavLink } from 'react-router-dom'
import { MdDashboard, MdBusiness, MdEmail, MdSearch, MdInbox, MdSettings } from 'react-icons/md'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Campaigns from './pages/Campaigns'
import Replies from './pages/Replies'
import EmailControl from './pages/EmailControl'
import Avatar from './components/Avatar'

function AppShell() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <div className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                className="icon-3d-rotate"
                style={{
                  background: 'white',
                  padding: '8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                <MdSearch size={28} style={{ color: '#3b82f6' }} />
              </div>
              営業自動化システム
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '13px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                管理者
              </div>
              <Avatar name="管理者" size={36} color="#3b82f6" />
            </div>
          </div>
          <nav className="nav" style={{ marginTop: '16px' }}>
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <MdDashboard size={18} /> ダッシュボード
            </NavLink>
            <NavLink to="/companies" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <MdBusiness size={18} /> 企業リスト
            </NavLink>
            <NavLink to="/campaigns" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <MdEmail size={18} /> 送信履歴
            </NavLink>
            <NavLink to="/replies" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <MdInbox size={18} /> 返信受信箱
            </NavLink>
            <NavLink to="/email" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <MdSettings size={18} /> メール管理
            </NavLink>
          </nav>
        </div>
      </div>
      <div className="container">
        <Outlet />
      </div>
      <footer
        style={{
          background: 'white',
          borderTop: '1px solid #e2e8f0',
          padding: '24px',
          marginTop: '40px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
        }}
      >
        <p> ©2026 営業自動化システム.</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="companies" element={<Companies />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="replies" element={<Replies />} />
        <Route path="email" element={<EmailControl />} />
      </Route>
    </Routes>
  )
}

export default App
