import { apiFetch } from '../config/api'

/**
 * Serviço de estudantes-atletas.
 * O INEP da instituição é vinculado automaticamente pelo backend com base no usuário autenticado (coordenador).
 */
function formatCpf(str) {
  if (!str) return '-'
  const d = String(str).replace(/\D/g, '')
  if (d.length !== 11) return str
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export const estudantesService = {
  /**
   * Lista estudantes-atletas da instituição do coordenador logado.
   */
  async listar() {
    const res = await apiFetch('/estudantes-atletas')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => [])
  },

  /**
   * Lista estudantes de uma escola com suas modalidades pré-carregadas para crachás.
   */
  async listarParaCredenciais(escolaId) {
    const res = await apiFetch(`/estudantes-atletas/escola/${escolaId}/credenciais`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => [])
  },

  formatCpf,

  /**
   * Cria um novo estudante.
   * @param {Object} payload - Dados do estudante e do responsável
   * @param {string} payload.nome
   * @param {string} payload.cpf
   * @param {string} payload.rg
   * @param {string} payload.data_nascimento
   * @param {string} payload.sexo
   * @param {string} payload.email
   * @param {string} payload.endereco
   * @param {string} payload.cep
   * @param {string|null} payload.numero_registro_confederacao
   * @param {string} payload.responsavel_nome
   * @param {string} payload.responsavel_cpf
   * @param {string} payload.responsavel_rg
   * @param {string} payload.responsavel_celular
   * @param {string} payload.responsavel_email
   * @param {string} payload.responsavel_nis
   * @param {string} [payload.inep_instituicao] - Opcional; backend pode usar o INEP do coordenador logado
   */
  async getById(id) {
    const res = await apiFetch(`/estudantes-atletas/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => ({}))
  },

  /**
   * Lista as modalidades (equipes) em que o estudante participa.
   */
  async getModalidades(estudanteId) {
    const res = await apiFetch(`/estudantes-atletas/${estudanteId}/modalidades`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json().catch(() => [])
  },

  async criar(payload) {
    const res = await apiFetch('/estudantes-atletas', {
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
    const res = await apiFetch(`/estudantes-atletas/${id}`, {
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
    const res = await apiFetch(`/estudantes-atletas/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
  },
}
