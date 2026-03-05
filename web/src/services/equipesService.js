import { apiFetch } from '../config/api'

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
