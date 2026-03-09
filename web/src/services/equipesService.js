import { apiFetch } from '../config/api'
import { sanitizeErrorMessage } from '../utils/errorUtils'

/**
 * Serviço de equipes.
 * Equipe = esporte_variante (esporte + categoria + naipe + tipo) + alunos + professor-técnico.
 */
export const equipesService = {
  /**
   * Lista equipes da instituição do coordenador logado.
   */
  async listar() {
    const res = await apiFetch('/equipes')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => [])
  },

  /**
   * Cria uma nova equipe.
   * @param {Object} payload
   * @param {string} payload.esporte_variante_id - ID da variante (esporte+categoria+naipe+tipo)
   * @param {number[]} payload.estudante_ids - IDs dos estudantes
   * @param {number} payload.professor_tecnico_id - ID do professor-técnico
   */
  async getById(id) {
    const res = await apiFetch(`/equipes/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => ({}))
  },

  async criar(payload) {
    const res = await apiFetch('/equipes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const raw = data.detail || data.message || `Erro ${res.status}`
      throw new Error(sanitizeErrorMessage(raw, 'Erro ao criar equipe. Verifique os dados e tente novamente.'))
    }
    return res.json().catch(() => ({}))
  },

  async atualizar(id, payload) {
    const res = await apiFetch(`/equipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const raw = data.detail || data.message || `Erro ${res.status}`
      throw new Error(sanitizeErrorMessage(raw, 'Erro ao atualizar equipe. Verifique os dados e tente novamente.'))
    }
    return res.json().catch(() => ({}))
  },

  async excluir(id) {
    const res = await apiFetch(`/equipes/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
  },
}
