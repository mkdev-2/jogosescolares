import { useState, useEffect, useCallback } from 'react'
import { naipesService } from '../services/naipesService'

export default function useNaipes() {
  const [naipes, setNaipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchNaipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await naipesService.list()
      setNaipes(data)
      return data
    } catch (err) {
      setError(err.message || 'Erro ao buscar naipes')
      setNaipes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNaipes()
  }, [fetchNaipes])

  return { naipes, loading, error, fetchNaipes }
}
