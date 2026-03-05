import { useState, useEffect, useCallback } from 'react'
import { tiposModalidadeService } from '../services/tiposModalidadeService'

export default function useTiposModalidade() {
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchTipos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await tiposModalidadeService.list()
      setTipos(data)
      return data
    } catch (err) {
      setError(err.message || 'Erro ao buscar tipos de modalidade')
      setTipos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTipos()
  }, [fetchTipos])

  return { tipos, loading, error, fetchTipos }
}
