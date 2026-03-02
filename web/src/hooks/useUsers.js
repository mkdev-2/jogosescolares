import { useState, useEffect, useCallback } from 'react'
import { usersService } from '../services/usersService'

export default function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await usersService.list()
      setUsers(data)
      return data
    } catch (err) {
      setError(err.message || 'Erro ao buscar usuários')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createUser = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const novo = await usersService.create(data)
      setUsers((prev) => [...prev, novo])
      return novo
    } catch (err) {
      setError(err.message || 'Erro ao criar usuário')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateUser = useCallback(async (id, data) => {
    setLoading(true)
    setError(null)
    try {
      const atualizado = await usersService.update(id, data)
      setUsers((prev) => prev.map((u) => (u.id === id ? atualizado : u)))
      return atualizado
    } catch (err) {
      setError(err.message || 'Erro ao atualizar usuário')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteUser = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      await usersService.delete(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
      return true
    } catch (err) {
      setError(err.message || 'Erro ao excluir usuário')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
}
