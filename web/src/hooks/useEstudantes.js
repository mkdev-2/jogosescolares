import { useState, useEffect, useCallback } from 'react'
import { estudantesService } from '../services/estudantesService'

export default function useEstudantes() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchEstudantes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await estudantesService.listar()
      setLista(Array.isArray(data) ? data : [])
      return data
    } catch (err) {
      setError(err.message || 'Erro ao carregar alunos')
      setLista([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEstudantes()
  }, [fetchEstudantes])

  return {
    lista,
    loading,
    error,
    fetchEstudantes,
  }
}
