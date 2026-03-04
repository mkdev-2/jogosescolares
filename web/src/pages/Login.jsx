import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'

function formatCpf(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function Login() {
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/app'

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f766e_0%,#134e4a_50%,#042f2e_100%)] z-0" />
        <div className="relative z-10 w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
        <p className="relative z-10">Carregando...</p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await login(cpf, password)

    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error || 'Falha ao fazer login.')
    }
    setSubmitting(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
      <Link
        to="/"
        className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-[12px] border border-white/30 bg-white/20 text-white text-[0.9rem] font-semibold no-underline transition-colors hover:bg-white/30"
        aria-label="Voltar à página inicial"
      >
        <ArrowLeft size={20} />
        Voltar
      </Link>

      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f766e_0%,#134e4a_50%,#042f2e_100%)] z-0">
        <div className="absolute rounded-full blur-[80px] opacity-40 w-[400px] h-[400px] bg-[#14b8a6] -top-[150px] -right-[100px]" />
        <div className="absolute rounded-full blur-[80px] opacity-40 w-[300px] h-[300px] bg-[#f59e0b] -bottom-[80px] -left-[80px]" />
        <div className="absolute rounded-full blur-[80px] opacity-20 w-[200px] h-[200px] bg-[#0d9488] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] bg-[rgba(255,255,255,0.98)] rounded-[24px] p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] backdrop-blur-[12px]">
        <header className="text-center mb-8">
          <div>
            <img
              src="/Jels-2026-horizontal.png"
              alt="JELS - Jogos Escolares Luminenses"
              className="block h-[130px] w-auto max-w-[280px] object-contain mb-4 mx-auto"
            />
            <h1 className="font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-[1.75rem] font-bold text-[#042f2e] mb-1 tracking-[-0.02em]">
              
            </h1>
            <p className="text-[0.9rem] text-[#64748b] m-0"></p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div
              className="px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-[12px] text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="cpf">
              CPF
            </label>
            <input
              id="cpf"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              autoComplete="username"
              maxLength={14}
              required
              disabled={submitting}
              autoFocus
              className="px-4 py-3 border-2 border-[#e2e8f0] rounded-[12px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] focus:shadow-[0_0_0_3px_rgba(15,118,110,0.2)] placeholder:text-slate-400 disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={submitting}
              className="px-4 py-3 border-2 border-[#e2e8f0] rounded-[12px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] focus:shadow-[0_0_0_3px_rgba(15,118,110,0.2)] placeholder:text-slate-400 disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            className="mt-2 px-6 py-4 bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white rounded-[12px] text-base font-semibold cursor-pointer transition-transform disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-px hover:shadow-[0_10px_25px_-5px_rgba(15,118,110,0.4)] active:translate-y-0"
            disabled={submitting}
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

      
      </div>
    </div>
  )
}
