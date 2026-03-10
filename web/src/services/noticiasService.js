import { apiFetch } from '../config/api'
import { getStorageUrl } from './storageService'

const BASE = '/api/noticias'
const BASE_CATEGORIAS = '/api/categorias-noticias'

function resolveImageUrl(url) {
  if (!url) return null
  return getStorageUrl(url) || url
}

export const noticiasService = {
  async listar(params = {}) {
    const q = new URLSearchParams()
    if (params.status) q.set('status', params.status)
    if (params.category) q.set('category', params.category)
    if (params.skip != null) q.set('skip', params.skip)
    if (params.limit != null) q.set('limit', params.limit)
    const res = await apiFetch(`${BASE}?${q.toString()}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    const data = await res.json()
    return (data || []).map((n) => ({
      ...n,
      featured_image_url: resolveImageUrl(n.featured_image_url) || n.featured_image_url,
      gallery_urls: (n.gallery_urls || []).map((u) => resolveImageUrl(u) || u),
    }))
  },

  async buscarPorId(id) {
    const res = await apiFetch(`${BASE}/${id}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    const n = await res.json()
    return {
      ...n,
      featured_image_url: resolveImageUrl(n.featured_image_url) || n.featured_image_url,
      gallery_urls: (n.gallery_urls || []).map((u) => resolveImageUrl(u) || u),
    }
  },

  async buscarPorSlug(slug) {
    const res = await apiFetch(`${BASE}/slug/${encodeURIComponent(slug)}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    const n = await res.json()
    return {
      ...n,
      featured_image_url: resolveImageUrl(n.featured_image_url) || n.featured_image_url,
      gallery_urls: (n.gallery_urls || []).map((u) => resolveImageUrl(u) || u),
    }
  },

  async criar(payload) {
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json()
  },

  async atualizar(id, payload) {
    const res = await apiFetch(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json()
  },

  async excluir(id) {
    const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
  },

  async listarCategorias() {
    const res = await apiFetch(BASE_CATEGORIAS)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json()
  },

  async criarCategoria(payload) {
    const res = await apiFetch(BASE_CATEGORIAS, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json()
  },

  async atualizarCategoria(id, payload) {
    const res = await apiFetch(`${BASE_CATEGORIAS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
    return res.json()
  },

  async excluirCategoria(id) {
    const res = await apiFetch(`${BASE_CATEGORIAS}/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.message || `Erro ${res.status}`)
    }
  },

  getStorageUrl,
}
