/**
 * Serviço de autenticação - perfil do usuário (minha conta) e alteração de senha.
 */
import { apiFetch } from '../config/api'

function handleResponse(res, fallbackError = 'Erro ao processar requisição') {
  if (res.ok) return res.json().catch(() => null)
  return res.json().then((data) => {
    const msg = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(', ') : (data?.detail || fallbackError)
    throw new Error(msg)
  }).catch((err) => {
    if (err instanceof Error) throw err
    throw new Error(fallbackError)
  })
}

export const authService = {
  /** Atualiza nome, email e/ou foto do usuário autenticado (PUT /auth/me). Usa PUT para evitar 405 em proxies que bloqueiam PATCH. */
  async updateMe({ nome, email, foto_url }) {
    const payload = {}
    if (nome !== undefined) payload.nome = nome?.trim() ?? ''
    if (email !== undefined) payload.email = email?.trim() || null
    if (foto_url !== undefined) payload.foto_url = foto_url?.trim() || null
    const res = await apiFetch('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return handleResponse(res, 'Erro ao atualizar dados.')
  },

  /** Altera a senha do usuário autenticado (POST /auth/change-password). */
  async changePassword({ currentPassword, newPassword }) {
    const res = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })
    if (res.ok) return { message: 'Senha alterada com sucesso.' }
    return handleResponse(res, 'Erro ao alterar senha.')
  },
}
