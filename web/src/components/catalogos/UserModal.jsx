import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import useUsers from '../../hooks/useUsers'
import { usersService } from '../../services/usersService'
import { escolasService } from '../../services/escolasService'

const ALL_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DIRETOR', label: 'Diretor' },
  { value: 'COORDENADOR', label: 'Coordenador' },
  { value: 'MESARIO', label: 'Mesário' },
]

function formatCpfInput(value) {
  const digits = (value || '').replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

const REQUIRES_ESCOLA = ['DIRETOR', 'COORDENADOR']

export default function UserModal({ isOpen, onClose, user = null, currentUser, onSuccess }) {
  const { createUser, updateUser, loading } = useUsers()
  const [escolas, setEscolas] = useState([])
  const allowedRoles = currentUser?.allowed_roles_for_create ?? []
  const isDiretor = currentUser?.role === 'DIRETOR'
  const ROLES = allowedRoles.length > 0
    ? ALL_ROLES.filter((r) => allowedRoles.includes(r.value))
    : ALL_ROLES
  const [formData, setFormData] = useState({
    cpf: '',
    nome: '',
    email: '',
    password: '',
    role: 'ADMIN',
    escola_id: '',
    status: 'ATIVO',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      escolasService.list().then(setEscolas).catch(() => setEscolas([]))
    }
  }, [isOpen])

  useEffect(() => {
    if (user) {
      setFormData({
        cpf: usersService.formatCpf(user.cpf) || '',
        nome: user.nome || '',
        email: user.email || '',
        password: '',
        role: user.role || 'ADMIN',
        escola_id: user.escola_id ?? '',
        status: user.status || 'ATIVO',
      })
    } else {
      const defaultRole = allowedRoles[0] || 'ADMIN'
      setFormData({
        cpf: '',
        nome: '',
        email: '',
        password: '',
        role: defaultRole,
        escola_id: isDiretor ? (currentUser?.escola_id ?? '') : '',
        status: 'ATIVO',
      })
    }
    setErrors({})
  }, [user, isOpen, isDiretor, currentUser?.escola_id, currentUser?.allowed_roles_for_create])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let finalValue = type === 'checkbox' ? checked : value
    if (name === 'cpf') {
      finalValue = formatCpfInput(value)
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const validateForm = () => {
    const newErrors = {}
    const cpfDigits = (formData.cpf || '').replace(/\D/g, '')
    if (!user && (!cpfDigits || cpfDigits.length !== 11)) {
      newErrors.cpf = 'CPF deve conter 11 dígitos'
    }
    if (!formData.nome?.trim()) newErrors.nome = 'Nome é obrigatório'
    if (!user && !formData.password?.trim()) {
      newErrors.password = 'Senha é obrigatória para novo usuário'
    }
    if (!user && formData.password?.length > 0 && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres'
    }
    if (REQUIRES_ESCOLA.includes(formData.role) && !isDiretor && !formData.escola_id) {
      newErrors.escola_id = 'Escola é obrigatória para Diretor e Coordenador'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const dataToSubmit = {
        ...formData,
        cpf: formData.cpf?.replace(/\D/g, '') || '',
        email: formData.email?.trim() || null,
      }
      if (user) {
        const updateData = {
          nome: dataToSubmit.nome,
          email: dataToSubmit.email,
          role: dataToSubmit.role,
          escola_id: REQUIRES_ESCOLA.includes(dataToSubmit.role) ? Number(dataToSubmit.escola_id) : null,
          status: dataToSubmit.status,
        }
        if (dataToSubmit.password?.trim()) updateData.password = dataToSubmit.password
        await updateUser(user.id, updateData)
        onSuccess?.()
        onClose()
      } else {
        const escolaId = isDiretor
          ? currentUser?.escola_id
          : (REQUIRES_ESCOLA.includes(dataToSubmit.role) ? Number(dataToSubmit.escola_id) : null)
        const createPayload = {
          ...dataToSubmit,
          escola_id: escolaId,
          status: dataToSubmit.status || 'ATIVO',
        }
        await createUser(createPayload)
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao salvar usuário' })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Editar Usuário' : 'Novo Usuário'}
      subtitle={
        user
          ? 'Atualize as informações do usuário'
          : 'Preencha os dados para criar um novo usuário'
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-5 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold border-2 border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#334155] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="user-form"
            className="px-5 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-95 hover:-translate-y-px transition-transform"
            disabled={loading}
          >
            {loading ? 'Salvando...' : user ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errors.submit && (
          <div
            className="px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-[8px] text-sm"
            role="alert"
          >
            {errors.submit}
          </div>
        )}

        {!user && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="cpf">
              CPF <span className="text-[#dc2626]">*</span>
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              value={formData.cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
              maxLength={14}
              className={`px-3 py-2.5 border-2 rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] ${
                errors.cpf ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
              }`}
            />
            {errors.cpf && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.cpf}</span>
            )}
          </div>
        )}

        {user && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]">CPF</label>
            <p className="px-3 py-2.5 bg-[#f1f5f9] rounded-[8px] text-[#475569]">
              {usersService.formatCpf(user.cpf)}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#334155]" htmlFor="nome">
            Nome <span className="text-[#dc2626]">*</span>
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Nome completo"
            className={`px-3 py-2.5 border-2 rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] ${
              errors.nome ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
            }`}
          />
          {errors.nome && (
            <span className="text-[0.8rem] text-[#dc2626]">{errors.nome}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#334155]" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@exemplo.com"
            className="px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#334155]" htmlFor="password">
            {user ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
            {!user && <span className="text-[#dc2626]"> *</span>}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={user ? '••••••••' : 'Mínimo 6 caracteres'}
            className={`px-3 py-2.5 border-2 rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] ${
              errors.password ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
            }`}
          />
          {errors.password && (
            <span className="text-[0.8rem] text-[#dc2626]">{errors.password}</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="role">
              Perfil
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={user && (isDiretor || currentUser?.role === 'COORDENADOR')}
              className="px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {REQUIRES_ESCOLA.includes(formData.role) && !isDiretor && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-[#334155]" htmlFor="escola_id">
                Escola <span className="text-[#dc2626]">*</span>
              </label>
              <select
                id="escola_id"
                name="escola_id"
                value={formData.escola_id}
                onChange={handleChange}
                className={`px-3 py-2.5 border-2 rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] ${
                  errors.escola_id ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
                }`}
              >
                <option value="">Selecione a escola</option>
                {escolas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome_escola}
                  </option>
                ))}
              </select>
              {errors.escola_id && (
                <span className="text-[0.8rem] text-[#dc2626]">{errors.escola_id}</span>
              )}
            </div>
          )}
          {REQUIRES_ESCOLA.includes(formData.role) && isDiretor && !user && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-[#334155]">Escola</label>
              <p className="px-3 py-2.5 bg-[#f1f5f9] rounded-[8px] text-[#475569]">
                O coordenador será vinculado à sua escola automaticamente.
              </p>
            </div>
          )}
          {REQUIRES_ESCOLA.includes(formData.role) && (isDiretor || currentUser?.role === 'COORDENADOR') && user && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-[#334155]">Escola</label>
              <p className="px-3 py-2.5 bg-[#f1f5f9] rounded-[8px] text-[#475569]">
                {escolas.find((e) => e.id === Number(formData.escola_id))?.nome_escola || `ID ${formData.escola_id}`}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
            >
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  )
}
