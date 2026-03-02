import { useState, useEffect, useCallback } from 'react'
import { modalidadesService } from '../services/modalidadesService'

export default function useModalidades() {
  const [modalidades, setModalidades] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchModalidades = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let data = await modalidadesService.list()
      if (filters.search) {
        const searchLower = String(filters.search).toLowerCase()
        data = data.filter(
          (m) =>
            m.nome?.toLowerCase().includes(searchLower) ||
            m.descricao?.toLowerCase().includes(searchLower)
        )
      }
      if (filters.categoria) {
        data = data.filter((m) => m.categoria === filters.categoria)
      }
      setModalidades(data)
      return data
    } catch (err) {
      setError(err.message || 'Erro ao buscar modalidades')
      setModalidades([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createModalidade = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const nova = await modalidadesService.create(data)
      setModalidades((prev) => [...prev, nova])
      return nova
    } catch (err) {
      setError(err.message || 'Erro ao criar modalidade')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateModalidade = useCallback(async (id, data) => {
    setLoading(true)
    setError(null)
    try {
      const atualizada = await modalidadesService.update(id, data)
      setModalidades((prev) => prev.map((m) => (m.id === id ? atualizada : m)))
      return atualizada
    } catch (err) {
      setError(err.message || 'Erro ao atualizar modalidade')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteModalidade = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      await modalidadesService.delete(id)
      setModalidades((prev) => prev.filter((m) => m.id !== id))
      return true
    } catch (err) {
      setError(err.message || 'Erro ao excluir modalidade')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getEstatisticas = useCallback(() => {
    const total = modalidades.length
    const porCategoria = modalidades.reduce((acc, m) => {
      acc[m.categoria] = (acc[m.categoria] || 0) + 1
      return acc
    }, {})
    return { total, porCategoria }
  }, [modalidades])

  useEffect(() => {
    fetchModalidades()
  }, [fetchModalidades])

  return {
    modalidades,
    loading,
    error,
    fetchModalidades,
    createModalidade,
    updateModalidade,
    deleteModalidade,
    getEstatisticas,
  }
}
