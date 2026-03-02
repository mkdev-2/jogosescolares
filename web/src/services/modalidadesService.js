/**
 * Serviço de Modalidades
 * CRUD usando localStorage (substituir por API/Supabase em produção)
 */

const STORAGE_KEY = 'jogos-escolares-modalidades'

function getModalidades() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setModalidades(modalidades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modalidades))
}

function generateId() {
  return `modalidade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const modalidadesService = {
  async list() {
    return getModalidades()
  },

  async getById(id) {
    const modalidades = getModalidades()
    return modalidades.find((m) => m.id === id) || null
  },

  async create(data) {
    const modalidades = getModalidades()
    const novaModalidade = {
      id: data.id?.trim() ? data.id.toUpperCase().replace(/\s/g, '_') : generateId(),
      nome: data.nome?.trim() || '',
      descricao: data.descricao?.trim() || '',
      categoria: data.categoria || 'Coletiva',
      requisitos: data.requisitos?.trim() || '',
      ativa: data.ativa !== undefined ? data.ativa : true,
    }
    modalidades.push(novaModalidade)
    setModalidades(modalidades)
    return novaModalidade
  },

  async update(id, data) {
    const modalidades = getModalidades()
    const index = modalidades.findIndex((m) => m.id === id)
    if (index === -1) return null
    const atualizada = {
      ...modalidades[index],
      nome: data.nome?.trim() ?? modalidades[index].nome,
      descricao: data.descricao?.trim() ?? modalidades[index].descricao,
      categoria: data.categoria ?? modalidades[index].categoria,
      requisitos: data.requisitos?.trim() ?? modalidades[index].requisitos,
      ativa: data.ativa !== undefined ? data.ativa : modalidades[index].ativa,
    }
    modalidades[index] = atualizada
    setModalidades(modalidades)
    return atualizada
  },

  async delete(id) {
    const modalidades = getModalidades().filter((m) => m.id !== id)
    setModalidades(modalidades)
    return true
  },
}
