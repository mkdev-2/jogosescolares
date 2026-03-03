import { useState, useEffect, useCallback } from 'react'
import { professoresTecnicosService } from '../services/professoresTecnicosService'

export default function useProfessoresTecnicos() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLista = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await professoresTecnicosService.listar()
      setLista(Array.isArray(data) ? data : [])
      return data
    } catch (err) {
      setError(err.message || 'Erro ao carregar professores-técnicos')
      setLista([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLista()
  }, [fetchLista])

  return {
    lista,
    loading,
    error,
    fetchLista,
  }
}
