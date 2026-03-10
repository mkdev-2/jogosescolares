import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { configuracoesService } from '../services/configuracoesService'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

/**
 * Retorna se o cadastro de novos alunos por diretor/coordenador está bloqueado (prazo encerrado).
 * Admin sempre pode cadastrar.
 */
export default function usePrazoCadastroAlunos() {
  const { user } = useAuth()
  const [bloqueado, setBloqueado] = useState(false)
  const [loading, setLoading] = useState(true)

  const isAdmin = user && ADMIN_ROLES.includes(user.role)

  useEffect(() => {
    if (isAdmin) {
      setBloqueado(false)
      setLoading(false)
      return
    }
    setLoading(true)
    configuracoesService
      .getApp()
      .then((data) => {
        const limit = data?.diretor_cadastro_alunos_data_limite
        if (!limit || typeof limit !== 'string') {
          setBloqueado(false)
          return
        }
        const limitStr = limit.trim().slice(0, 10)
        if (!limitStr) {
          setBloqueado(false)
          return
        }
        const limitDate = new Date(limitStr)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        limitDate.setHours(0, 0, 0, 0)
        setBloqueado(today > limitDate)
      })
      .catch(() => setBloqueado(false))
      .finally(() => setLoading(false))
  }, [isAdmin])

  return { bloqueado, loading }
}
