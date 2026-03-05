import { useState, useEffect, useCallback } from 'react'
import { esportesService } from '../services/esportesService'

export default function useEsportes() {
  const [esportes, setEsportes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchEsportes = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let data = await esportesService.list()
      if (filters.search) {
        const searchLower = String(filters.search).toLowerCase()
        data = data.filter(
          (e) =>
            e.nome?.toLowerCase().includes(searchLower) ||
            e.descricao?.toLowerCase().includes(searchLower)
        )
      }
      setEsportes(data)
      return data
    } catch (err) {
      setError(err.message || 'Erro ao buscar esportes')
      setEsportes([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createEsporte = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const novo = await esportesService.create(data)
      setEsportes((prev) => [...prev, novo])
      return novo
    } catch (err) {
      setError(err.message || 'Erro ao criar esporte')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEsporte = useCallback(async (id, data) => {
    setLoading(true)
    setError(null)
    try {
      const atualizado = await esportesService.update(id, data)
      setEsportes((prev) => prev.map((e) => (e.id === id ? atualizado : e)))
      return atualizado
    } catch (err) {
      setError(err.message || 'Erro ao atualizar esporte')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteEsporte = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      await esportesService.delete(id)
      setEsportes((prev) => prev.filter((e) => e.id !== id))
      return true
    } catch (err) {
      setError(err.message || 'Erro ao excluir esporte')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEsportes()
  }, [fetchEsportes])

  return {
    esportes,
    loading,
    error,
    fetchEsportes,
    createEsporte,
    updateEsporte,
    deleteEsporte,
  }
}
