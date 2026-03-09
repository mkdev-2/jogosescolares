import { useState, useEffect, useCallback } from 'react'
import { equipesService } from '../services/equipesService'

export default function useEquipes() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLista = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await equipesService.listar()
      setLista(Array.isArray(data) ? data : [])
      return data
    } catch (err) {
      setError(err.message || 'Erro ao carregar equipes')
      setLista([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLista()
  }, [fetchLista])

  const deleteEquipe = useCallback(async (id) => {
    await equipesService.excluir(id)
    await fetchLista()
  }, [fetchLista])

  return {
    lista,
    loading,
    error,
    fetchLista,
    deleteEquipe,
  }
}
