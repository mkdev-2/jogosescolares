import { useState, useEffect, useCallback } from 'react'
import { equipesService } from '../services/equipesService'

export default function useEquipes(edicaoId = null) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLista = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await equipesService.listar(edicaoId)
      setLista(Array.isArray(data) ? data : [])
      return data
    } catch (err) {
      setError(err.message || 'Erro ao carregar equipes')
      setLista([])
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => {
    fetchLista()
  }, [fetchLista])

  const deleteEquipe = useCallback(async (id) => {
    await equipesService.excluir(id, edicaoId)
    await fetchLista()
  }, [fetchLista, edicaoId])

  return {
    lista,
    loading,
    error,
    fetchLista,
    deleteEquipe,
  }
}
