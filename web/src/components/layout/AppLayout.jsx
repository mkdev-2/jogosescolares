import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutDashboard, Trophy, Menu, X, User, LogOut, ChevronDown, ChevronRight, Activity, History, Users, ClipboardList, UserPlus, GraduationCap, UsersRound, Building2, Settings, UserCheck, Newspaper, Tag, Megaphone, UserCircle, Image, IdCard, Calendar, ChevronsUpDown, Check, Loader2, FileBarChart2 } from 'lucide-react'

import { useAuth } from '../../contexts/AuthContext'
import StorageImage from '../StorageImage'

const menuItems = [
  { label: 'Dashboard', path: '/app', icon: LayoutDashboard },
]

const menuFooterItem = { label: 'Minha conta', path: '/app/minha-conta', icon: UserCircle }

const menuGroups = [
  {
    label: 'Gestão',
    icon: ClipboardList,
    items: [
      { label: 'Alunos', path: '/app/gestao', icon: UserPlus, tab: 'alunos' },
      { label: 'Professores', path: '/app/gestao', icon: GraduationCap, tab: 'professores' },
      { label: 'Equipes', path: '/app/gestao', icon: UsersRound, tab: 'equipes' },
      { label: 'Escolas', path: '/app/gestao', icon: Building2, tab: 'escolas', adminOnly: true },
    ],
  },
  {
    label: 'Atividades',
    icon: Activity,
    items: [
      { label: 'Esportes', path: '/app/atividades', icon: Trophy, tab: 'esportes' },
      // { label: 'Campeonatos', path: '/app/atividades', icon: ClipboardList, tab: 'campeonatos', adminOnly: true }, // em desenvolvimento
    ],
  },
  {
    label: 'Administrativo',
    icon: Users,
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'DIRETOR', 'COORDENADOR'],
    items: [
      { label: 'Usuários', path: '/app/administrativo', icon: Users, tab: 'usuarios' },
      { label: 'Solicitações de Adesão', path: '/app/administrativo', icon: ClipboardList, tab: 'usuarios-pendentes', adminOnly: true },
      { label: 'Credenciais', path: '/app/administrativo', icon: IdCard, tab: 'credenciais', adminOnly: true },
      { label: 'Edições', path: '/app/administrativo', icon: Calendar, tab: 'edicoes', adminOnly: true },
      { label: 'Configurações', path: '/app/administrativo', icon: Settings, tab: 'configuracoes', adminOnly: true },
      { label: 'Auditoria', path: '/app/auditoria', icon: History, adminOnly: true },
    ],
  },
  {
    label: 'Relatórios',
    icon: FileBarChart2,
    requiredRoles: ['SUPER_ADMIN', 'ADMIN'],
    items: [
      { label: 'Escolas por Modalidade', path: '/app/relatorios', icon: Trophy, tab: 'escolas-modalidade', adminOnly: true },
    ],
  },
]

function EscolaSwitcher({ user, switchEscola, navigate }) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitch = async (escolaId) => {
    if (escolaId === user.escola_id || switching) return
    setOpen(false)
    setSwitching(true)
    await switchEscola(escolaId)
    setSwitching(false)
    // Navegar para home para garantir que todos os dados recarreguem no novo contexto
    navigate('/app', { replace: true })
  }

  const currentNome = user.escola_nome || user.escolas?.find(e => e.id === user.escola_id)?.nome_escola || '—'

  return (
    <div ref={ref} className="sm:relative">
      {/* Botão — desktop: com nome da escola | mobile: só ícone */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        title={currentNome}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-[10px] bg-white/15 text-white border border-white/30 hover:bg-white/25 transition-colors disabled:opacity-60"
      >
        {switching
          ? <Loader2 size={15} className="flex-shrink-0 animate-spin" />
          : <Building2 size={15} className="flex-shrink-0" />
        }
        {/* Nome da escola: visível apenas em sm+ */}
        <span className="hidden sm:block text-xs font-medium truncate max-w-[160px] leading-none">
          {currentNome}
        </span>
        <ChevronsUpDown size={13} className="flex-shrink-0 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] bg-white rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-[#e2e8f0] overflow-hidden">
          <div className="px-3 py-2 border-b border-[#f1f5f9]">
            <p className="text-[0.7rem] font-semibold text-[#94a3b8] uppercase tracking-wider">Trocar escola</p>
            {/* No mobile, mostrar escola atual dentro do dropdown como contexto */}
            <p className="text-xs text-[#64748b] mt-0.5 sm:hidden truncate">{currentNome}</p>
          </div>
          <ul className="py-1">
            {user.escolas?.map(escola => {
              const isActive = escola.id === user.escola_id
              return (
                <li key={escola.id}>
                  <button
                    type="button"
                    onClick={() => handleSwitch(escola.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-[#f0fdfa] text-[#0f766e] font-semibold'
                        : 'text-[#334155] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <Building2 size={14} className={`flex-shrink-0 ${isActive ? 'text-[#0d9488]' : 'text-[#94a3b8]'}`} />
                    <span className="truncate leading-snug">{escola.nome_escola}</span>
                    {isActive && <Check size={13} className="flex-shrink-0 ml-auto text-[#0d9488]" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [groupExpanded, setGroupExpanded] = useState({ Gestão: true, Atividades: true, Administrativo: true })
  const { user, logout, switchEscola } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const DEFAULT_TAB = { '/app/gestao': 'alunos', '/app/atividades': 'esportes', '/app/administrativo': 'usuarios', '/app/relatorios': 'escolas-modalidade' }
  const isActive = (path, item) => {
    if (path === '/app') return location.pathname === '/app'
    if (item?.tab) {
      const currentTab = searchParams.get('tab') || DEFAULT_TAB[path] || 'alunos'
      return location.pathname === path && currentTab === item.tab
    }
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
        className={`fixed top-0 left-0 h-screen w-[288px] z-50 flex flex-col bg-white/95 backdrop-blur-[24px] border-r border-[rgba(15,118,110,0.2)] shadow-[4px_0_24px_rgba(15,118,110,0.08)] transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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
              className="h-[100px] w-auto max-w-full object-contain object-center"
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

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col min-h-0">
          <ul className="flex flex-col gap-1 list-none m-0 p-0 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[12px] no-underline text-[0.9375rem] font-medium transition-colors ${active
                      ? 'bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white shadow-[0_4px_12px_rgba(15,118,110,0.35)]'
                      : 'text-[#475569] hover:bg-[rgba(15,118,110,0.08)] hover:text-[#0f766e]'
                      }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span>{item.label}</span>
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
              const hasActiveChild = group.items.some((item) => isActive(item.path, item))
              return (
                <li key={group.label}>
                  <button
                    type="button"
                    onClick={() => setGroupExpanded((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-[12px] border-0 bg-transparent text-left text-[0.9375rem] font-medium transition-colors cursor-pointer ${hasActiveChild
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
                      {group.items.filter((item) => {
                        if (item.adminOnly && !['SUPER_ADMIN', 'ADMIN'].includes(user?.role)) return false
                        return true
                      }).map((item) => {
                        const ItemIcon = item.icon
                        const active = isActive(item.path, item)
                        const defaultTab = DEFAULT_TAB[item.path] || 'alunos'
                        const to = item.tab && item.tab !== defaultTab ? `${item.path}?tab=${item.tab}` : item.path
                        return (
                          <li key={item.path + (item.tab || '')}>
                            <Link
                              to={to}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-[8px] no-underline text-[0.875rem] font-medium transition-colors ${active
                                ? 'bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white shadow-[0_2px_8px_rgba(15,118,110,0.3)]'
                                : 'text-[#475569] hover:bg-[rgba(15,118,110,0.08)] hover:text-[#0f766e]'
                                }`}
                            >
                              <ItemIcon size={18} className="shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
            <li className="mt-auto pt-4 border-t border-[rgba(15,118,110,0.2)]">
              <Link
                to={menuFooterItem.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-[12px] no-underline text-[0.9375rem] font-medium transition-colors ${location.pathname === menuFooterItem.path
                  ? 'bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white shadow-[0_4px_12px_rgba(15,118,110,0.35)]'
                  : 'text-[#475569] hover:bg-[rgba(15,118,110,0.08)] hover:text-[#0f766e]'
                  }`}
              >
                <UserCircle size={20} className="shrink-0" />
                <span>{menuFooterItem.label}</span>
              </Link>
            </li>
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

          <div className="relative flex items-center gap-3">
            {/* Seletor de escola: visível apenas para coordenadores com múltiplas escolas */}
            {user.role === 'COORDENADOR' && user.escolas?.length > 1 && (
              <EscolaSwitcher user={user} switchEscola={switchEscola} navigate={navigate} />
            )}

            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-[12px] text-white border border-white/30 overflow-hidden">
              {user.foto_url
                ? <StorageImage path={user.foto_url} alt={user.nome} className="w-full h-full object-cover" />
                : <User size={20} />
              }
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

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-[#f8fafc] min-h-0">
          <div className="max-w-[1200px] w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
