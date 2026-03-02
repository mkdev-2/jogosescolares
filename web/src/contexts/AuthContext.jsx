import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Usuário administrador padrão (em produção, usar backend com autenticação segura)
const ADMIN_USER = {
  cpf: '12345678901',
  password: 'admin123',
  nome: 'Administrador',
  role: 'admin'
}

function normalizeCpf(value) {
  return (value || '').replace(/\D/g, '')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('jogos-escolares-user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('jogos-escolares-user')
      }
    }
    setLoading(false)
  }, [])

  const login = (cpf, password) => {
    const normalizedCpfValue = normalizeCpf(cpf)
    if (
      normalizedCpfValue === ADMIN_USER.cpf &&
      password === ADMIN_USER.password
    ) {
      const userData = {
        cpf: ADMIN_USER.cpf,
        nome: ADMIN_USER.nome,
        role: ADMIN_USER.role
      }
      setUser(userData)
      localStorage.setItem('jogos-escolares-user', JSON.stringify(userData))
      return { success: true }
    }
    return { success: false, error: 'CPF ou senha incorretos.' }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('jogos-escolares-user')
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
