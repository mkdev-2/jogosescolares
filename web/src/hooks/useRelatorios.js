import { useState, useCallback } from 'react'
import { relatoriosService } from '../services/relatoriosService'

/**
 * Hook para gerenciar estado e busca de dados dos relatórios.
 */
export default function useRelatorios() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getEscolasPorModalidade = useCallback(async (edicaoId, esporteId = null, apenasComEquipes = true) => {
    setLoading(true)
    setError(null)
    try {
      const data = await relatoriosService.getEscolasPorModalidade(edicaoId, esporteId, apenasComEquipes)
      return Array.isArray(data) ? data : []
    } catch (err) {
      const msg = err.message || 'Erro ao buscar dados'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getEscolasPorModalidade,
  }
}
