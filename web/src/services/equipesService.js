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
  async listar(edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`/equipes${qs}`)
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
  async getById(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`/equipes/${id}${qs}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => ({}))
  },

  async criar(payload, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`/equipes${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.detail && typeof data.detail === 'object' && data.detail.tipo === 'conflito_modalidade') {
        const err = new Error('conflito_modalidade')
        err.conflitos = data.detail.conflitos
        err.tipoModalidade = data.detail.tipo_modalidade
        throw err
      }
      const raw = data.detail || data.message || `Erro ${res.status}`
      throw new Error(sanitizeErrorMessage(raw, 'Erro ao criar equipe. Verifique os dados e tente novamente.'))
    }
    return res.json().catch(() => ({}))
  },

  async atualizar(id, payload, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`/equipes/${id}${qs}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.detail && typeof data.detail === 'object' && data.detail.tipo === 'conflito_modalidade') {
        const err = new Error('conflito_modalidade')
        err.conflitos = data.detail.conflitos
        err.tipoModalidade = data.detail.tipo_modalidade
        throw err
      }
      const raw = data.detail || data.message || `Erro ${res.status}`
      throw new Error(sanitizeErrorMessage(raw, 'Erro ao atualizar equipe. Verifique os dados e tente novamente.'))
    }
    return res.json().catch(() => ({}))
  },

  async excluir(id, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`/equipes/${id}${qs}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
  },

  /**
   * Dados para impressão da Ficha Coletiva JELS (apenas modalidades coletivas).
   */
  async getFichaColetiva(equipeId, edicaoId = null) {
    const qs = edicaoId ? `?edicao_id=${encodeURIComponent(edicaoId)}` : ''
    const res = await apiFetch(`/equipes/${equipeId}/ficha-coletiva${qs}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json()
  },
}
