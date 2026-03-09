import { useState, useEffect, useCallback } from 'react'
import { esporteVariantesService } from '../services/esporteVariantesService'

export default function useEsporteVariantes(esporteId = null, options = {}) {
  const { minhaEscola = false } = options
  const [variantes, setVariantes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchVariantes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = minhaEscola
        ? await esporteVariantesService.listMinhaEscola()
        : await esporteVariantesService.list(esporteId)
      setVariantes(data)
      return data
    } catch (err) {
      setError(err.message || 'Erro ao buscar variantes')
      setVariantes([])
    } finally {
      setLoading(false)
    }
  }, [esporteId, minhaEscola])

  const createVariante = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const nova = await esporteVariantesService.create(data)
      setVariantes((prev) => [...prev, nova])
      return nova
    } catch (err) {
      setError(err.message || 'Erro ao criar variante')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteVariante = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      await esporteVariantesService.delete(id)
      setVariantes((prev) => prev.filter((v) => v.id !== id))
      return true
    } catch (err) {
      setError(err.message || 'Erro ao excluir variante')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVariantes()
  }, [fetchVariantes])

  return {
    variantes,
    loading,
    error,
    fetchVariantes,
    createVariante,
    deleteVariante,
  }
}
