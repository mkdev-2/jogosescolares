import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

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

  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = login(cpf, password)

    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error || 'Falha ao fazer login.')
    }
    setSubmitting(false)
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-shape shape-1" />
        <div className="login-shape shape-2" />
        <div className="login-shape shape-3" />
      </div>

      <div className="login-card">
        <header className="login-header">
          <div className="login-logo">
            <span className="logo-icon">⚽</span>
            <h1>Jogos Escolares</h1>
            <p>Acesso administrativo</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="cpf">CPF</label>
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
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={submitting}
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="login-hint">
          Use o CPF e senha do administrador para acessar o sistema.
        </p>
      </div>
    </div>
  )
}
