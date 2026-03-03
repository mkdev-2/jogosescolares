import { apiFetch } from '../config/api'

/**
 * Serviço de equipes.
 * Equipe = modalidade + categoria + alunos (estudantes) + professor-técnico.
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
   * @param {string} payload.modalidade_id - ID da modalidade
   * @param {string} payload.categoria_id - ID da categoria
   * @param {number[]} payload.estudante_ids - IDs dos estudantes
   * @param {number} payload.professor_tecnico_id - ID do professor-técnico
   */
  async criar(payload) {
    const res = await apiFetch('/equipes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => ({}))
  },
}
