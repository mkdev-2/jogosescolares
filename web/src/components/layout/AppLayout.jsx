import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Trophy, LayoutGrid, Menu, X, User, LogOut, ChevronDown, ChevronRight, Activity, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const menuItems = [
  { label: 'Dashboard', path: '/app', icon: LayoutDashboard },
]

const menuGroups = [
  {
    label: 'Atividades',
    icon: Activity,
    items: [
      { label: 'Modalidades', path: '/app/modalidades', icon: Trophy },
      { label: 'Categorias', path: '/app/categorias', icon: LayoutGrid },
    ],
  },
  {
    label: 'Usuário',
    icon: Users,
    requiredRoles: ['SUPER_ADMIN', 'ADMIN'],
    items: [
      { label: 'Usuários', path: '/app/usuarios', icon: Users },
    ],
  },
]

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [groupExpanded, setGroupExpanded] = useState({ Atividades: true, Usuário: true })
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/app') return location.pathname === '/app'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-[288px] z-50 flex flex-col bg-white/95 backdrop-blur-[24px] border-r border-[rgba(15,118,110,0.2)] shadow-[4px_0_24px_rgba(15,118,110,0.08)] transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 min-h-[72px] border-b border-[rgba(15,118,110,0.15)]">
          <Link
            to="/app"
            className="flex items-center text-[#042f2e] no-underline flex-1 min-w-0"
            onClick={() => setSidebarOpen(false)}
          >
            <img
              src="/Jels-2026-horizontal.png"
              alt="JELS - Jogos Escolares Luminenses"
              className="h-9 w-auto max-w-full object-contain object-left"
            />
          </Link>
          <button
            type="button"
            className="flex items-center justify-center p-2 rounded-lg text-[#64748b] hover:bg-[rgba(15,118,110,0.1)] hover:text-[#0f766e] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="flex flex-col gap-1 list-none m-0 p-0">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[12px] no-underline text-[0.9375rem] font-medium transition-colors ${
                      active
                        ? 'bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white shadow-[0_4px_12px_rgba(15,118,110,0.35)]'
                        : 'text-[#475569] hover:bg-[rgba(15,118,110,0.08)] hover:text-[#0f766e]'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto text-[0.7rem] uppercase tracking-[0.05em] opacity-90">
                        ativo
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
            {menuGroups.filter((group) => {
              if (!group.requiredRoles) return true
              return group.requiredRoles.includes(user?.role)
            }).map((group) => {
              const GroupIcon = group.icon
              const isExpanded = groupExpanded[group.label] ?? true
              const hasActiveChild = group.items.some((item) => isActive(item.path))
              return (
                <li key={group.label}>
                  <button
                    type="button"
                    onClick={() => setGroupExpanded((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-[12px] border-0 bg-transparent text-left text-[0.9375rem] font-medium transition-colors cursor-pointer ${
                      hasActiveChild
                        ? 'text-[#0f766e]'
                        : 'text-[#475569] hover:bg-[rgba(15,118,110,0.08)] hover:text-[#0f766e]'
                    }`}
                  >
                    <GroupIcon size={20} className="shrink-0" />
                    <span className="flex-1">{group.label}</span>
                    {isExpanded ? (
                      <ChevronDown size={18} className="shrink-0 opacity-70" />
                    ) : (
                      <ChevronRight size={18} className="shrink-0 opacity-70" />
                    )}
                  </button>
                  {isExpanded && (
                    <ul className="flex flex-col gap-0.5 mt-0.5 ml-4 pl-4 border-l-2 border-[rgba(15,118,110,0.2)] list-none">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon
                        const active = isActive(item.path)
                        return (
                          <li key={item.path}>
                            <Link
                              to={item.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-[8px] no-underline text-[0.875rem] font-medium transition-colors ${
                                active
                                  ? 'bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white shadow-[0_2px_8px_rgba(15,118,110,0.3)]'
                                  : 'text-[#475569] hover:bg-[rgba(15,118,110,0.08)] hover:text-[#0f766e]'
                              }`}
                            >
                              <ItemIcon size={18} className="shrink-0" />
                              <span>{item.label}</span>
                              {active && (
                                <span className="ml-auto text-[0.65rem] uppercase tracking-[0.05em] opacity-90">
                                  ativo
                                </span>
                              )}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex flex-col min-h-screen w-full lg:ml-[288px] lg:w-[calc(100%-288px)]">
        <header className="sticky top-0 z-30 h-[72px] min-h-[72px] flex items-center gap-4 px-4 pl-6 bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_50%,#0f766e_100%)] border-b border-white/20 shadow-[0_4px_20px_rgba(15,118,110,0.25)]">
          <button
            type="button"
            className="flex items-center justify-center p-2 rounded-[10px] bg-white/15 text-white hover:bg-white/25 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-[12px] text-white border border-white/30">
              <User size={20} />
            </div>
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-semibold text-white">{user.nome}</span>
              <span className="text-[0.75rem] text-white/85 uppercase tracking-[0.03em]">
                {user.role}
              </span>
            </div>
            <button
              type="button"
              className="flex items-center justify-center px-3 py-2 rounded-[10px] bg-white/15 text-white border border-white/30 hover:bg-white/25"
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 bg-[#f8fafc] min-h-0">
          <div className="max-w-[1200px] w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
