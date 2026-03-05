import { useState } from 'react'
import { User } from 'lucide-react'
import { Input, Button } from 'antd'
import Modal from '../ui/Modal'
import { professoresTecnicosService } from '../../services/professoresTecnicosService'

const INITIAL_FORM = { nome: '', cpf: '', cref: '' }

function onlyDigits(s) {
  return (s || '').replace(/\D/g, '')
}

function maskCpf(value) {
  const v = onlyDigits(value).slice(0, 11)
  if (v.length <= 3) return v
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`
}

function validateForm(form) {
  const err = {}
  if (!form.nome?.trim() || form.nome.trim().length < 3) {
    err.nome = 'Nome completo deve ter pelo menos 3 caracteres'
  }
  if (onlyDigits(form.cpf).length !== 11) {
    err.cpf = 'CPF deve conter 11 dígitos'
  }
  if (!form.cref?.trim()) {
    err.cref = 'Número do CREF é obrigatório'
  }
  return err
}

const labelClass = 'block text-sm font-medium text-[#334155] mb-1.5'
const errorClass = 'text-[#dc2626] text-sm mt-1'

export default function ProfessorTecnicoModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSubmitError(null)
  }

  const handleClose = () => {
    setForm(INITIAL_FORM)
    setErrors({})
    setSubmitError(null)
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setSubmitError(null)
    setLoading(true)
    try {
      await professoresTecnicosService.criar({
        nome: form.nome.trim(),
        cpf: onlyDigits(form.cpf),
        cref: form.cref.trim(),
      })
      handleClose()
      onSuccess?.()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const footer = (
    <div className="flex justify-end gap-3">
      <Button type="default" onClick={handleClose}>
        Cancelar
      </Button>
      <Button type="primary" onClick={handleSubmit} loading={loading} disabled={loading}>
        {loading ? 'Salvando...' : 'Cadastrar'}
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Novo professor-técnico"
      subtitle="Preencha os dados para vincular às equipes"
      size="lg"
      footer={footer}
    >
      <div className="p-0">
        {submitError && (
          <div className="mb-4 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-lg text-sm">
            {submitError}
          </div>
        )}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
            <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
              <User className="w-4 h-4 text-[#64748b]" />
              Dados do Professor-Técnico
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="pt-nome" className={labelClass}>Nome completo *</label>
              <Input
                id="pt-nome"
                value={form.nome}
                onChange={(e) => updateField('nome', e.target.value)}
                placeholder="Nome completo"
                status={errors.nome ? 'error' : undefined}
              />
              {errors.nome && <p className={errorClass}>{errors.nome}</p>}
            </div>
            <div>
              <label htmlFor="pt-cpf" className={labelClass}>CPF *</label>
              <Input
                id="pt-cpf"
                inputMode="numeric"
                value={form.cpf}
                onChange={(e) => updateField('cpf', maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                status={errors.cpf ? 'error' : undefined}
              />
              {errors.cpf && <p className={errorClass}>{errors.cpf}</p>}
            </div>
            <div>
              <label htmlFor="pt-cref" className={labelClass}>Número do CREF *</label>
              <Input
                id="pt-cref"
                value={form.cref}
                onChange={(e) => updateField('cref', e.target.value)}
                placeholder="Ex: 123456-G/MA"
                status={errors.cref ? 'error' : undefined}
              />
              {errors.cref && <p className={errorClass}>{errors.cref}</p>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
