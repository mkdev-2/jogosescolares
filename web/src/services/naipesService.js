/**
 * Serviço de Naipes - listagem (MASCULINO, FEMININO)
 */
import { apiFetch } from '../config/api'

const BASE = '/api/naipes'

export const naipesService = {
  async list() {
    const res = await apiFetch(`${BASE}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || 'Erro ao listar naipes')
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  },
}
