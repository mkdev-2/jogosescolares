import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogIn, User, LogOut, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { handleAnchorClick } from '../../utils/smoothScroll'

export default function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = [
    { path: '/', label: 'Início' },
    { href: '#informacoes', label: 'Informações' },
    { path: '/resultados', label: 'Resultados' },
    { path: '/cadastro', label: 'Cadastro de Escola', external: true },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <header className="sticky top-0 z-50">
      {/* Barra Superior - Área Logada */}
      <div className="bg-primary text-white py-1.5 border-b border-white/10">
        <div className="container-portal flex items-center justify-between px-4">
          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/app"
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{user?.nome || 'Painel'}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link to="/login">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2 bg-white/10 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-full border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Área Logada</span>
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navbar com logo */}
      <div className="bg-white border-b-2 border-primary/20 overflow-visible relative">
        <div className="container-portal h-16 sm:h-20 px-3 sm:px-4 min-w-0 overflow-x-hidden">
          <div className="flex items-center justify-between h-full gap-2 min-w-0">
            <Link
              to="/"
              className="flex items-center group h-full py-2 sm:py-3 min-w-0 shrink"
            >
              <img
                src="/Jels-2026-horizontal.png"
                alt="JELS - Jogos Escolares Luminenses"
                className="h-10 sm:h-16 md:h-18 w-auto max-w-[180px] sm:max-w-[280px] md:max-w-[340px] object-contain object-left md:scale-110 origin-left transition-transform duration-300 md:group-hover:scale-115"
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-1 shrink-0">
              {navLinks.map((item) =>
                item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      handleAnchorClick(e)
                      setIsMenuOpen(false)
                    }}
                    className="px-5 py-2.5 rounded-lg text-base font-semibold transition-colors duration-200 text-gray-600 hover:text-primary hover:bg-primary/5"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-base font-semibold transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {item.label}
                    {item.external && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
                  </Link>
                )
              )}
            </nav>

            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden shrink-0 p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-primary/5 transition-colors"
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              )}
            </button>
          </div>
        </div>

        <nav
          className={`lg:hidden absolute left-0 right-0 top-full w-full py-4 sm:py-6 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-b-2xl sm:rounded-b-3xl px-4 sm:px-6 border-t border-slate-100 z-[100] transition-all duration-300 ease-out origin-top ${
            isMenuOpen
              ? 'opacity-100 visible translate-y-0 scale-y-100'
              : 'opacity-0 invisible -translate-y-2 scale-y-[0.98] pointer-events-none'
          }`}
          role="navigation"
          aria-label="Menu principal"
          aria-hidden={!isMenuOpen}
        >
          <div className="container-portal max-w-full flex flex-col gap-2">
            {navLinks.map((item) =>
              item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    handleAnchorClick(e)
                    setIsMenuOpen(false)
                  }}
                  className="block px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold text-gray-600 hover:bg-slate-50 transition-colors duration-200"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                  {item.external && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
                </Link>
              )
            )}
          </div>
        </nav>
      </div>
      <div
        className="w-full h-1"
        style={{
          background: 'linear-gradient(90deg, #0f766e 0%, #042f2e 100%)',
        }}
      />
    </header>
  )
}
