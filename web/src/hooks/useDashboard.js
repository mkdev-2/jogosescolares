/**
 * Hook useDashboard - carrega estatísticas do Quadro de Resumo
 */
import { useState, useEffect, useCallback } from 'react'
import { dashboardService } from '../services/dashboardService'

export function useDashboard(edicaoId = null) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const stats = await dashboardService.getStats(edicaoId)
      setData(stats)
      return stats
    } catch (err) {
      setError(err.message)
      setData(null)
      throw err
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
