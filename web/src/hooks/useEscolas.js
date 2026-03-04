import { useState, useEffect, useCallback } from 'react'
import { escolasService } from '../services/escolasService'

export default function useEscolas() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchEscolas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await escolasService.list()
      setLista(Array.isArray(data) ? data : [])
      return data
    } catch (err) {
      setError(err.message || 'Erro ao carregar escolas')
      setLista([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEscolas()
  }, [fetchEscolas])

  return {
    lista,
    loading,
    error,
    fetchEscolas,
  }
}
