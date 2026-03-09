import { apiFetch } from '../config/api'

function formatCpf(str) {
  if (!str) return '-'
  const d = String(str).replace(/\D/g, '')
  if (d.length !== 11) return str
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export const professoresTecnicosService = {
  /**
   * Lista professores-técnicos da instituição do coordenador logado.
   */
  async listar() {
    const res = await apiFetch('/professores-tecnicos')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => [])
  },

  formatCpf,

  /**
   * Cria um novo professor-técnico.
   * @param {Object} payload - nome, cpf, cref
   */
  async getById(id) {
    const res = await apiFetch(`/professores-tecnicos/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => ({}))
  },

  async criar(payload) {
    const res = await apiFetch('/professores-tecnicos', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => ({}))
  },

  async atualizar(id, payload) {
    const res = await apiFetch(`/professores-tecnicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => ({}))
  },

  async excluir(id) {
    const res = await apiFetch(`/professores-tecnicos/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
  },
}
