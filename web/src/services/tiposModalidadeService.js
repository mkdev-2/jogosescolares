/**
 * Serviço de Tipos de Modalidade - listagem (INDIVIDUAIS, COLETIVAS, NOVAS)
 */
import { apiFetch } from '../config/api'

const BASE = '/api/tipos-modalidade'

export const tiposModalidadeService = {
  async list() {
    const res = await apiFetch(`${BASE}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || 'Erro ao listar tipos de modalidade')
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  },
}
