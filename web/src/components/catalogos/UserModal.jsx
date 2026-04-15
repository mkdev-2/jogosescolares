import { useState, useEffect, useRef } from 'react'
import { Input, Select, Button } from 'antd'
import { Info } from 'lucide-react'
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
    password_confirm: '',
    role: 'ADMIN',
    escola_id: '',
    status: 'ATIVO',
  })
  const [errors, setErrors] = useState({})
  // Aviso informativo de CPF já existente como coordenador (não bloqueia)
  const [cpfHint, setCpfHint] = useState(null)
  const cpfDebounceRef = useRef(null)

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
        password_confirm: '',
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
        password_confirm: '',
        role: defaultRole,
        escola_id: isDiretor ? (currentUser?.escola_id ?? '') : '',
        status: 'ATIVO',
      })
    }
    setErrors({})
    setCpfHint(null)
  }, [user, isOpen, isDiretor, currentUser?.escola_id, currentUser?.allowed_roles_for_create])

  // Busca informativa de CPF duplicado (apenas para DIRETOR criando novo coordenador)
  // existingCoord: dados do coordenador já cadastrado, quando encontrado
  const [existingCoord, setExistingCoord] = useState(null)

  useEffect(() => {
    if (!isDiretor || user || formData.role !== 'COORDENADOR') {
      setCpfHint(null)
      setExistingCoord(null)
      return
    }

    const digits = (formData.cpf || '').replace(/\D/g, '')
    if (digits.length !== 11) {
      setCpfHint(null)
      setExistingCoord(null)
      return
    }

    clearTimeout(cpfDebounceRef.current)
    cpfDebounceRef.current = setTimeout(async () => {
      const result = await usersService.checkCpf(digits)
      if (!result.exists) {
        setCpfHint(null)
        setExistingCoord(null)
        return
      }

      const minhaEscolaId = currentUser?.escola_id
      const jaMinhaEscola = result.escolas?.some((e) => e.id === minhaEscolaId)
      const outraEscolas = result.escolas?.filter((e) => e.id !== minhaEscolaId) ?? []
      const cpfFormatado = usersService.formatCpf(result.cpf)

      if (jaMinhaEscola) {
        // Já está nesta escola — erro no submit, apenas avisa
        setExistingCoord(null)
        setCpfHint({
          type: 'warning',
          text: `Coordenador ${result.nome} (${cpfFormatado}) já está vinculado à sua escola.`,
        })
      } else {
        // Existe em outra escola — será apenas vinculado, não criado
        setExistingCoord(result)
        // Pré-preencher nome com os dados já cadastrados
        setFormData((prev) => ({ ...prev, nome: result.nome }))

        const nomesEscolas = outraEscolas.map((e) => e.nome_escola).join(' e ')
        const texto = outraEscolas.length > 0
          ? `Coordenador ${result.nome} (${cpfFormatado}) já cadastrado na ${outraEscolas.length > 1 ? 'escolas' : 'escola'} ${nomesEscolas}. Cadastro terá acesso a ambas as escolas.`
          : `Coordenador ${result.nome} (${cpfFormatado}) já existe no sistema e será vinculado à sua escola.`
        setCpfHint({ type: 'info', text: texto })
      }
    }, 500)

    return () => clearTimeout(cpfDebounceRef.current)
  }, [formData.cpf, formData.role, isDiretor, user, currentUser?.escola_id])

  const updateField = (name, value) => {
    if (name === 'cpf') value = formatCpfInput(value)
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
    if (!user && (name === 'password' || name === 'password_confirm')) {
      const nextPwd = name === 'password' ? value : formData.password
      const nextConf = name === 'password_confirm' ? value : formData.password_confirm
      const mismatch = String(nextPwd ?? '') !== String(nextConf ?? '') && String(nextConf ?? '').length > 0
      setErrors((prev) => ({ ...prev, password_confirm: mismatch ? 'senhas devem coincidir' : undefined }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    const cpfDigits = (formData.cpf || '').replace(/\D/g, '')
    if (!user && (!cpfDigits || cpfDigits.length !== 11)) {
      newErrors.cpf = 'CPF deve conter 11 dígitos'
    }
    // Se for vínculo de coordenador existente, nome/senha não precisam ser validados
    if (!existingCoord) {
      if (!formData.nome?.trim()) newErrors.nome = 'Nome é obrigatório'
      if (!user && !formData.password?.trim()) {
        newErrors.password = 'Senha é obrigatória para novo usuário'
      }
      if (!user && formData.password?.length > 0 && formData.password.length < 6) {
        newErrors.password = 'Senha deve ter no mínimo 6 caracteres'
      }
      if (!user && formData.password?.trim() && formData.password !== (formData.password_confirm ?? '')) {
        newErrors.password_confirm = 'senhas devem coincidir'
      }
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
        const { password_confirm, ...rest } = dataToSubmit
        const createPayload = {
          ...rest,
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
          <Button type="default" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" form="user-form" loading={loading} disabled={loading}>
            {loading ? 'Salvando...' : user ? 'Atualizar' : existingCoord ? 'Vincular à escola' : 'Criar'}
          </Button>
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
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => updateField('cpf', e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
              status={errors.cpf ? 'error' : undefined}
            />
            {errors.cpf && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.cpf}</span>
            )}
            {!errors.cpf && cpfHint && (
              <div
                className={`flex items-start gap-2 px-3 py-2.5 rounded-[8px] text-sm leading-snug ${
                  cpfHint.type === 'warning'
                    ? 'bg-[#fffbeb] border border-[#fde68a] text-[#92400e]'
                    : 'bg-[#f0fdfa] border border-[#99f6e4] text-[#0f766e]'
                }`}
              >
                <Info size={15} className="flex-shrink-0 mt-[1px]" />
                <span>{cpfHint.text}</span>
              </div>
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

        {/* Nome: somente leitura quando for vínculo de coordenador existente */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#334155]" htmlFor="nome">
            Nome <span className="text-[#dc2626]">*</span>
          </label>
          {existingCoord ? (
            <p className="px-3 py-2.5 bg-[#f1f5f9] rounded-[8px] text-[#475569]">
              {existingCoord.nome}
            </p>
          ) : (
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              placeholder="Nome completo"
              status={errors.nome ? 'error' : undefined}
            />
          )}
          {errors.nome && (
            <span className="text-[0.8rem] text-[#dc2626]">{errors.nome}</span>
          )}
        </div>

        {/* E-mail e senha: ocultos quando for vínculo de coordenador existente */}
        {!existingCoord && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="email">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
        )}

        <div className={user ? 'flex flex-col gap-1.5' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'}>
          {!existingCoord && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="password">
              {user ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
              {!user && <span className="text-[#dc2626]"> *</span>}
            </label>
            <Input.Password
              id="password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder={user ? '••••••••' : 'Mínimo 6 caracteres'}
              status={errors.password ? 'error' : undefined}
            />
            {errors.password && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.password}</span>
            )}
          </div>
          )}
          {!user && !existingCoord && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#334155]" htmlFor="password_confirm">
                Confirmar Senha <span className="text-[#dc2626]">*</span>
              </label>
              <Input.Password
                id="password_confirm"
                value={formData.password_confirm ?? ''}
                onChange={(e) => updateField('password_confirm', e.target.value)}
                placeholder="Repita a senha"
                status={errors.password_confirm ? 'error' : undefined}
              />
              {errors.password_confirm && (
                <span className="text-[0.8rem] text-[#dc2626]">{errors.password_confirm}</span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="role">
              Perfil
            </label>
            <Select
              id="role"
              value={formData.role}
              onChange={(v) => updateField('role', v)}
              disabled={user && (isDiretor || currentUser?.role === 'COORDENADOR')}
              options={ROLES}
              className="w-full"
            />
          </div>
          {REQUIRES_ESCOLA.includes(formData.role) && !isDiretor && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-[#334155]" htmlFor="escola_id">
                Escola <span className="text-[#dc2626]">*</span>
              </label>
              <Select
                id="escola_id"
                value={formData.escola_id || undefined}
                onChange={(v) => updateField('escola_id', v)}
                placeholder="Selecione a escola"
                options={escolas.map((e) => ({ value: e.id, label: e.nome_escola }))}
                className="w-full"
                status={errors.escola_id ? 'error' : undefined}
              />
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
            <Select
              id="status"
              value={formData.status}
              onChange={(v) => updateField('status', v)}
              options={[
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'INATIVO', label: 'Inativo' },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
