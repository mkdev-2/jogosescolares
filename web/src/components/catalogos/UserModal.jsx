import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import useUsers from '../../hooks/useUsers'
import { usersService } from '../../services/usersService'

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DIRETOR', label: 'Diretor' },
  { value: 'MESARIO', label: 'Mesário' },
]

function formatCpfInput(value) {
  const digits = (value || '').replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export default function UserModal({ isOpen, onClose, user = null, onSuccess }) {
  const { createUser, updateUser, loading } = useUsers()
  const [formData, setFormData] = useState({
    cpf: '',
    nome: '',
    email: '',
    password: '',
    role: 'ADMIN',
    ativo: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (user) {
      setFormData({
        cpf: usersService.formatCpf(user.cpf) || '',
        nome: user.nome || '',
        email: user.email || '',
        password: '',
        role: user.role || 'ADMIN',
        ativo: user.ativo !== undefined ? user.ativo : true,
      })
    } else {
      setFormData({
        cpf: '',
        nome: '',
        email: '',
        password: '',
        role: 'ADMIN',
        ativo: true,
      })
    }
    setErrors({})
  }, [user, isOpen])

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
          ativo: dataToSubmit.ativo,
        }
        if (dataToSubmit.password?.trim()) updateData.password = dataToSubmit.password
        await updateUser(user.id, updateData)
        onSuccess?.()
        onClose()
      } else {
        await createUser(dataToSubmit)
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
              className="px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 justify-end">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                name="ativo"
                checked={formData.ativo}
                onChange={handleChange}
                className="w-[1.125rem] h-[1.125rem]"
              />
              Usuário ativo
            </label>
          </div>
        </div>
      </form>
    </Modal>
  )
}
