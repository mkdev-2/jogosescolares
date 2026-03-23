import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { edicoesService } from '../services/edicoesService'

const EdicaoContext = createContext(null)
const EDICAO_STORAGE_KEY = 'jels-edicao-id'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

export function EdicaoProvider({ children }) {
  const { user } = useAuth()
  const [edicoes, setEdicoes] = useState([])
  const [edicaoId, setEdicaoId] = useState(null)
  const [loading, setLoading] = useState(false)

  const isAdmin = ADMIN_ROLES.includes(user?.role)

  const fetchEdicoes = useCallback(async () => {
    if (!isAdmin) {
      setEdicoes([])
      setEdicaoId(null)
      return []
    }
    setLoading(true)
    try {
      const data = await edicoesService.list()
      setEdicoes(data)

      const active = data.find((e) => e.status === 'ATIVA') || data[0] || null
      const saved = localStorage.getItem(EDICAO_STORAGE_KEY)
      const savedId = saved ? Number(saved) : null
      const hasSaved = savedId && data.some((e) => e.id === savedId)
      const nextId = hasSaved ? savedId : (active?.id ?? null)
      setEdicaoId(nextId)
      if (nextId) localStorage.setItem(EDICAO_STORAGE_KEY, String(nextId))
      return data
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    fetchEdicoes().catch(() => {
      setEdicoes([])
      setEdicaoId(null)
    })
  }, [fetchEdicoes])

  const selectEdicao = useCallback((id) => {
    if (!id) {
      setEdicaoId(null)
      localStorage.removeItem(EDICAO_STORAGE_KEY)
      return
    }
    const next = Number(id)
    setEdicaoId(next)
    localStorage.setItem(EDICAO_STORAGE_KEY, String(next))
  }, [])

  const value = useMemo(() => ({
    isAdmin,
    edicoes,
    edicaoId,
    loading,
    selectEdicao,
    refetchEdicoes: fetchEdicoes,
  }), [isAdmin, edicoes, edicaoId, loading, selectEdicao, fetchEdicoes])

  return <EdicaoContext.Provider value={value}>{children}</EdicaoContext.Provider>
}

export function useEdicao() {
  const context = useContext(EdicaoContext)
  if (!context) {
    throw new Error('useEdicao deve ser usado dentro de EdicaoProvider')
  }
  return context
}
