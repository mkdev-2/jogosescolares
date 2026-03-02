import { useState, useEffect, useCallback } from 'react'
import { categoriasService } from '../services/categoriasService'

export default function useCategorias() {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCategorias = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await categoriasService.list()
      setCategorias(data)
      return data
    } catch (err) {
      setError(err.message || 'Erro ao buscar categorias')
      setCategorias([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createCategoria = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const nova = await categoriasService.create(data)
      setCategorias((prev) => [...prev, nova])
      return nova
    } catch (err) {
      setError(err.message || 'Erro ao criar categoria')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCategoria = useCallback(async (id, data) => {
    setLoading(true)
    setError(null)
    try {
      const atualizada = await categoriasService.update(id, data)
      setCategorias((prev) => prev.map((c) => (c.id === id ? atualizada : c)))
      return atualizada
    } catch (err) {
      setError(err.message || 'Erro ao atualizar categoria')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCategoria = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      await categoriasService.delete(id)
      setCategorias((prev) => prev.filter((c) => c.id !== id))
      return true
    } catch (err) {
      setError(err.message || 'Erro ao excluir categoria')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  return {
    categorias,
    loading,
    error,
    fetchCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
  }
}
