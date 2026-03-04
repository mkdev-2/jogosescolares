import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  apiFetch,
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../config/api'

const AuthContext = createContext(null)

function normalizeCpf(value) {
  return (value || '').replace(/\D/g, '')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return null

    const res = await apiFetch('/auth/me')
    if (!res.ok) return null

    const data = await res.json()
    return data
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const token = getAccessToken()
      if (!token) {
        if (!cancelled) setLoading(false)
        return
      }

      const data = await fetchMe()
      if (!cancelled) {
        setUser(data || null)
        setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [fetchMe])

  const login = async (cpf, password) => {
    const normalizedCpf = normalizeCpf(cpf)
    if (!normalizedCpf || normalizedCpf.length !== 11) {
      return { success: false, error: 'CPF deve conter 11 dígitos.' }
    }

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ cpf: normalizedCpf, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'CPF ou senha incorretos.',
        }
      }

      setTokens(data.access_token, data.refresh_token)

      const meRes = await apiFetch('/auth/me')
      if (meRes.ok) {
        const meData = await meRes.json()
        setUser(meData)
      } else {
        setUser({ id: data.sub, nome: 'Usuário', role: data.role || 'ADMIN' })
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Erro de conexão. Verifique se a API está rodando.',
      }
    }
  }

  const logout = () => {
    setUser(null)
    clearTokens()
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
