import { useState } from 'react'
import { Steps } from 'antd'
import { User, UserCircle, School } from 'lucide-react'
import Modal from '../ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { estudantesService } from '../../services/estudantesService'

const SEXO_OPCOES = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
]

const STEPS = [
  { title: 'Estudante' },
  { title: 'Mãe / Responsável' },
]

const INITIAL_FORM = {
  nome: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  sexo: '',
  email: '',
  endereco: '',
  cep: '',
  numeroRegistroConfederacao: '',
  responsavelNome: '',
  responsavelCpf: '',
  responsavelRg: '',
  responsavelCelular: '',
  responsavelEmail: '',
  responsavelNis: '',
}

function onlyDigits(s) {
  return (s || '').replace(/\D/g, '')
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateStep(step, form) {
  const err = {}
  if (step === 0) {
    if (!form.nome?.trim() || form.nome.trim().length < 3) err.nome = 'Nome deve ter pelo menos 3 caracteres'
    if (onlyDigits(form.cpf).length !== 11) err.cpf = 'CPF deve conter 11 dígitos'
    if (!form.rg?.trim() || form.rg.trim().length < 4) err.rg = 'RG é obrigatório'
    if (!form.dataNascimento?.trim()) err.dataNascimento = 'Data de nascimento é obrigatória'
    if (!form.sexo) err.sexo = 'Selecione o sexo'
    if (!form.email?.trim() || !emailRe.test(form.email)) err.email = 'E-mail inválido'
    if (!form.endereco?.trim() || form.endereco.trim().length < 5) err.endereco = 'Endereço deve ter pelo menos 5 caracteres'
    if (!form.cep?.trim() || onlyDigits(form.cep).length !== 8) err.cep = 'CEP deve conter 8 dígitos'
    return err
  }
  if (step === 1) {
    if (!form.responsavelNome?.trim() || form.responsavelNome.trim().length < 3) err.responsavelNome = 'Nome do responsável deve ter pelo menos 3 caracteres'
    if (onlyDigits(form.responsavelCpf).length !== 11) err.responsavelCpf = 'CPF do responsável deve conter 11 dígitos'
    if (!form.responsavelRg?.trim() || form.responsavelRg.trim().length < 4) err.responsavelRg = 'RG do responsável é obrigatório'
    if (!form.responsavelCelular?.trim() || onlyDigits(form.responsavelCelular).length < 10) err.responsavelCelular = 'Celular deve ter pelo menos 10 dígitos'
    if (!form.responsavelEmail?.trim() || !emailRe.test(form.responsavelEmail)) err.responsavelEmail = 'E-mail do responsável inválido'
    if (!form.responsavelNis?.trim()) err.responsavelNis = 'NIS do responsável é obrigatório'
    return err
  }
  return err
}

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#334155] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent'
const inputErrorClass = 'border-[#dc2626] focus:ring-[#dc2626]'
const labelClass = 'block text-sm font-medium text-[#334155] mb-1.5'
const errorClass = 'text-[#dc2626] text-sm mt-1'

function maskCpf(value) {
  const v = onlyDigits(value).slice(0, 11)
  if (v.length <= 3) return v
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`
}
function maskCep(value) {
  const v = onlyDigits(value).slice(0, 8)
  if (v.length <= 5) return v
  return `${v.slice(0, 5)}-${v.slice(5)}`
}
function maskCelular(value) {
  const v = onlyDigits(value).slice(0, 11)
  if (v.length <= 2) return v ? `(${v}` : ''
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

export default function EstudanteAtletaModal({ open, onClose, onSuccess }) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const inepInstituicao = user?.inep ?? user?.escola_inep ?? ''

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSubmitError(null)
  }

  const handleClose = () => {
    setCurrentStep(0)
    setForm(INITIAL_FORM)
    setErrors({})
    setSubmitError(null)
    onClose?.()
  }

  const goNext = () => {
    const errs = validateStep(currentStep, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setCurrentStep(1)
  }

  const goPrev = () => {
    setErrors({})
    setCurrentStep(0)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const errs = validateStep(1, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setSubmitError(null)
    setLoading(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        cpf: onlyDigits(form.cpf),
        rg: form.rg.trim(),
        data_nascimento: form.dataNascimento,
        sexo: form.sexo,
        email: form.email.trim(),
        endereco: form.endereco.trim(),
        cep: onlyDigits(form.cep),
        numero_registro_confederacao: form.numeroRegistroConfederacao?.trim() || null,
        responsavel_nome: form.responsavelNome.trim(),
        responsavel_cpf: onlyDigits(form.responsavelCpf),
        responsavel_rg: form.responsavelRg.trim(),
        responsavel_celular: onlyDigits(form.responsavelCelular),
        responsavel_email: form.responsavelEmail.trim(),
        responsavel_nis: form.responsavelNis.trim(),
        inep_instituicao: (inepInstituicao && String(inepInstituicao).trim()) || undefined,
      }
      await estudantesService.criar(payload)
      handleClose()
      onSuccess?.()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="space-y-6">
          {/* Instituição */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
              <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                <School className="w-4 h-4 text-[#64748b]" />
                Instituição
              </h3>
            </div>
            <div>
              <label className={labelClass}>INEP da instituição</label>
              <input
                type="text"
                value={inepInstituicao}
                readOnly
                placeholder="Preenchido automaticamente com o INEP do coordenador"
                className={`${inputClass} bg-[#f8fafc] cursor-not-allowed`}
              />
              <p className="text-sm text-[#64748b] mt-1 m-0">Preenchido automaticamente com o INEP do coordenador.</p>
            </div>
          </div>

          {/* Dados do Estudante */}
          <div className="space-y-4 border-t border-[#e2e8f0] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
              <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                <User className="w-4 h-4 text-[#64748b]" />
                Dados do Estudante
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="modal-nome" className={labelClass}>Nome *</label>
                <input id="modal-nome" type="text" value={form.nome} onChange={(e) => updateField('nome', e.target.value)} placeholder="Nome completo" className={`${inputClass} ${errors.nome ? inputErrorClass : ''}`} />
                {errors.nome && <p className={errorClass}>{errors.nome}</p>}
              </div>
              <div>
                <label htmlFor="modal-cpf" className={labelClass}>CPF *</label>
                <input id="modal-cpf" type="text" inputMode="numeric" value={form.cpf} onChange={(e) => updateField('cpf', maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} className={`${inputClass} ${errors.cpf ? inputErrorClass : ''}`} />
                {errors.cpf && <p className={errorClass}>{errors.cpf}</p>}
              </div>
              <div>
                <label htmlFor="modal-rg" className={labelClass}>RG *</label>
                <input id="modal-rg" type="text" value={form.rg} onChange={(e) => updateField('rg', e.target.value)} placeholder="Número do RG" className={`${inputClass} ${errors.rg ? inputErrorClass : ''}`} />
                {errors.rg && <p className={errorClass}>{errors.rg}</p>}
              </div>
              <div>
                <label htmlFor="modal-dataNascimento" className={labelClass}>Data de Nascimento *</label>
                <input id="modal-dataNascimento" type="date" value={form.dataNascimento} onChange={(e) => updateField('dataNascimento', e.target.value)} className={`${inputClass} ${errors.dataNascimento ? inputErrorClass : ''}`} />
                {errors.dataNascimento && <p className={errorClass}>{errors.dataNascimento}</p>}
              </div>
              <div>
                <label htmlFor="modal-sexo" className={labelClass}>Sexo *</label>
                <select id="modal-sexo" value={form.sexo} onChange={(e) => updateField('sexo', e.target.value)} className={`${inputClass} ${errors.sexo ? inputErrorClass : ''}`}>
                  <option value="">Selecione</option>
                  {SEXO_OPCOES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.sexo && <p className={errorClass}>{errors.sexo}</p>}
              </div>
              <div>
                <label htmlFor="modal-email" className={labelClass}>E-mail *</label>
                <input id="modal-email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="email@exemplo.com" className={`${inputClass} ${errors.email ? inputErrorClass : ''}`} />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="modal-endereco" className={labelClass}>Endereço *</label>
                <input id="modal-endereco" type="text" value={form.endereco} onChange={(e) => updateField('endereco', e.target.value)} placeholder="Rua, número, complemento" className={`${inputClass} ${errors.endereco ? inputErrorClass : ''}`} />
                {errors.endereco && <p className={errorClass}>{errors.endereco}</p>}
              </div>
              <div>
                <label htmlFor="modal-cep" className={labelClass}>CEP *</label>
                <input id="modal-cep" type="text" inputMode="numeric" value={form.cep} onChange={(e) => updateField('cep', maskCep(e.target.value))} placeholder="00000-000" maxLength={9} className={`${inputClass} ${errors.cep ? inputErrorClass : ''}`} />
                {errors.cep && <p className={errorClass}>{errors.cep}</p>}
              </div>
              <div>
                <label htmlFor="modal-numeroRegistroConfederacao" className={labelClass}>Nº Registro Confederação (opcional)</label>
                <input id="modal-numeroRegistroConfederacao" type="text" value={form.numeroRegistroConfederacao} onChange={(e) => updateField('numeroRegistroConfederacao', e.target.value)} placeholder="Número de registro" className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      )
    }
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
            <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
              <UserCircle className="w-4 h-4 text-[#64748b]" />
              Mãe / Responsável
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="modal-responsavelNome" className={labelClass}>Nome *</label>
              <input id="modal-responsavelNome" type="text" value={form.responsavelNome} onChange={(e) => updateField('responsavelNome', e.target.value)} placeholder="Nome completo" className={`${inputClass} ${errors.responsavelNome ? inputErrorClass : ''}`} />
              {errors.responsavelNome && <p className={errorClass}>{errors.responsavelNome}</p>}
            </div>
            <div>
              <label htmlFor="modal-responsavelCpf" className={labelClass}>CPF *</label>
              <input id="modal-responsavelCpf" type="text" inputMode="numeric" value={form.responsavelCpf} onChange={(e) => updateField('responsavelCpf', maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} className={`${inputClass} ${errors.responsavelCpf ? inputErrorClass : ''}`} />
              {errors.responsavelCpf && <p className={errorClass}>{errors.responsavelCpf}</p>}
            </div>
            <div>
              <label htmlFor="modal-responsavelRg" className={labelClass}>RG *</label>
              <input id="modal-responsavelRg" type="text" value={form.responsavelRg} onChange={(e) => updateField('responsavelRg', e.target.value)} placeholder="Número do RG" className={`${inputClass} ${errors.responsavelRg ? inputErrorClass : ''}`} />
              {errors.responsavelRg && <p className={errorClass}>{errors.responsavelRg}</p>}
            </div>
            <div>
              <label htmlFor="modal-responsavelCelular" className={labelClass}>Celular *</label>
              <input id="modal-responsavelCelular" type="tel" inputMode="numeric" value={form.responsavelCelular} onChange={(e) => updateField('responsavelCelular', maskCelular(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} className={`${inputClass} ${errors.responsavelCelular ? inputErrorClass : ''}`} />
              {errors.responsavelCelular && <p className={errorClass}>{errors.responsavelCelular}</p>}
            </div>
            <div>
              <label htmlFor="modal-responsavelEmail" className={labelClass}>E-mail *</label>
              <input id="modal-responsavelEmail" type="email" value={form.responsavelEmail} onChange={(e) => updateField('responsavelEmail', e.target.value)} placeholder="email@exemplo.com" className={`${inputClass} ${errors.responsavelEmail ? inputErrorClass : ''}`} />
              {errors.responsavelEmail && <p className={errorClass}>{errors.responsavelEmail}</p>}
            </div>
            <div>
              <label htmlFor="modal-responsavelNis" className={labelClass}>NIS *</label>
              <input id="modal-responsavelNis" type="text" inputMode="numeric" value={form.responsavelNis} onChange={(e) => updateField('responsavelNis', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="Número do NIS" maxLength={11} className={`${inputClass} ${errors.responsavelNis ? inputErrorClass : ''}`} />
              {errors.responsavelNis && <p className={errorClass}>{errors.responsavelNis}</p>}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const footer = (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-lg border border-[#e2e8f0] text-[#475569] font-medium hover:bg-[#f1f5f9]">
        Cancelar
      </button>
      {currentStep > 0 && (
        <button type="button" onClick={goPrev} className="px-5 py-2.5 rounded-lg border border-[#e2e8f0] text-[#475569] font-medium hover:bg-[#f1f5f9]">
          Anterior
        </button>
      )}
      {currentStep < 1 ? (
        <button type="button" onClick={goNext} className="px-6 py-2.5 rounded-lg bg-[#0f766e] text-white font-semibold hover:opacity-90">
          Próximo
        </button>
      ) : (
        <button type="button" onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 rounded-lg bg-[#0f766e] text-white font-semibold hover:opacity-90 disabled:opacity-60">
          {loading ? 'Salvando...' : 'Cadastrar'}
        </button>
      )}
    </div>
  )

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Novo aluno"
      subtitle="Preencha os dados em etapas"
      size="lg"
      footer={footer}
    >
      <div className="p-0">
        <div className="mb-6">
          <Steps current={currentStep} size="small">
            {STEPS.map((step, i) => (
              <Steps.Step key={i} title={step.title} />
            ))}
          </Steps>
        </div>
        {submitError && (
          <div className="mb-4 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-lg text-sm">
            {submitError}
          </div>
        )}
        {renderStepContent()}
      </div>
    </Modal>
  )
}
