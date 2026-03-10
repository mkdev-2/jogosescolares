/**
 * Serviço de Configurações - leitura e atualização de datas/prazos (apenas admin).
 */
import { apiFetch } from '../config/api'

const BASE = '/api/configuracoes'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => ({}))
  return res.json().then((data) => {
    const msg = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(', ') : (data?.detail || fallbackError)
    throw new Error(msg)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const configuracoesService = {
  async get() {
    const res = await apiFetch(BASE)
    const data = await handleResponse(res, 'Erro ao carregar configurações')
    return data
  },

  /** Data limite de cadastro (público, para formulário de adesão). */
  async getCadastroDataLimite() {
    const res = await apiFetch(`${BASE}/publico`)
    const data = await handleResponse(res, 'Erro ao verificar prazo')
    return data?.cadastro_data_limite ?? null
  },

  /** Configurações para o app (usuário logado): ex. prazo para diretor cadastrar alunos. */
  async getApp() {
    const res = await apiFetch(`${BASE}/app`)
    const data = await handleResponse(res, 'Erro ao verificar configurações')
    return data
  },

  async update(payload) {
    const res = await apiFetch(BASE, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao salvar configurações')
  },
}
