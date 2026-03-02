import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Trophy, Menu, X, User, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import './AppLayout.css'

const menuItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Modalidades', path: '/modalidades', icon: Trophy },
]

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="je-app-shell">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="je-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`je-sidebar ${sidebarOpen ? 'je-sidebar-open' : ''}`}
      >
        <div className="je-sidebar-header">
          <Link to="/" className="je-sidebar-logo" onClick={() => setSidebarOpen(false)}>
            <span className="je-logo-icon">⚽</span>
            <span className="je-logo-text">Jogos Escolares</span>
          </Link>
          <button
            type="button"
            className="je-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="je-sidebar-nav">
          <ul className="je-nav-list">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`je-nav-link ${active ? 'je-nav-link-active' : ''}`}
                  >
                    <Icon size={20} className="je-nav-icon" />
                    <span>{item.label}</span>
                    {active && <span className="je-nav-badge">ativo</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Área principal */}
      <div className="je-main-area">
        {/* Header */}
        <header className="je-header">
          <button
            type="button"
            className="je-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>

          <div className="je-header-spacer" />

          <div className="je-header-user">
            <div className="je-user-avatar">
              <User size={20} />
            </div>
            <div className="je-user-info">
              <span className="je-user-name">{user.nome}</span>
              <span className="je-user-role">{user.role}</span>
            </div>
            <button
              type="button"
              className="je-logout-btn"
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="je-content">
          <div className="je-page-container">{children}</div>
        </main>
      </div>
    </div>
  )
}
