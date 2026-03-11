import { useState, useRef, useEffect } from 'react'
import { User, UserCircle, School, Camera, TriangleAlert, FileSignature } from 'lucide-react'
import { DatePicker, Input, Select, Button, Steps, Checkbox } from 'antd'
import dayjs from 'dayjs'
import Modal from '../ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { estudantesService } from '../../services/estudantesService'
import { uploadFotoEstudante, uploadDocumentacaoAssinada, getStorageUrl } from '../../services/storageService'

const SEXO_OPCOES = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
]

const INITIAL_FORM = {
  fotoUrl: '',
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
  assinaturaEstudanteAtleta: false,
  assinaturaResponsavelLegal: false,
  assinaturaMedico: false,
  assinaturaResponsavelInstituicao: false,
  documentacaoAssinadaUrl: '',
}

function onlyDigits(s) {
  return (s || '').replace(/\D/g, '')
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Valida CPF pelo algoritmo oficial (dígitos verificadores). */
function isValidCpf(cpf) {
  const d = onlyDigits(cpf)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // todos iguais
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * (10 - i)
  let check = (sum % 11) < 2 ? 0 : 11 - (sum % 11)
  if (check !== parseInt(d[9], 10)) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i], 10) * (11 - i)
  check = (sum % 11) < 2 ? 0 : 11 - (sum % 11)
  return check === parseInt(d[10], 10)
}

const STEP_KEYS = {
  instituicao: 0,
  estudante: 1,
  responsavel: 2,
  assinaturas: 3,
}

function validateStep(step, form) {
  const err = {}
  if (step === STEP_KEYS.estudante) {
    if (!form.nome?.trim() || form.nome.trim().length < 3) err.nome = 'Nome deve ter pelo menos 3 caracteres'
    if (onlyDigits(form.cpf).length !== 11) err.cpf = 'CPF deve conter 11 dígitos'
    else if (!isValidCpf(form.cpf)) err.cpf = 'CPF inválido'
    if (!form.rg?.trim()) err.rg = 'RG é obrigatório'
    else if (onlyDigits(form.rg).length > 15) err.rg = 'RG deve ter no máximo 15 caracteres'
    if (!form.dataNascimento?.trim()) err.dataNascimento = 'Data de nascimento é obrigatória'
    if (!form.sexo) err.sexo = 'Selecione o sexo'
    if (!form.email?.trim() || !emailRe.test(form.email)) err.email = 'E-mail inválido'
    if (!form.endereco?.trim() || form.endereco.trim().length < 5) err.endereco = 'Endereço deve ter pelo menos 5 caracteres'
    if (!form.cep?.trim() || onlyDigits(form.cep).length !== 8) err.cep = 'CEP deve conter 8 dígitos'
    if (form.numeroRegistroConfederacao?.trim() && form.numeroRegistroConfederacao.trim().length > 20) err.numeroRegistroConfederacao = 'Nº Registro deve ter no máximo 20 caracteres'
  }
  if (step === STEP_KEYS.responsavel) {
    if (!form.responsavelNome?.trim() || form.responsavelNome.trim().length < 3) err.responsavelNome = 'Nome do responsável deve ter pelo menos 3 caracteres'
    if (onlyDigits(form.responsavelCpf).length !== 11) err.responsavelCpf = 'CPF do responsável deve conter 11 dígitos'
    else if (!isValidCpf(form.responsavelCpf)) err.responsavelCpf = 'CPF do responsável inválido'
    if (!form.responsavelRg?.trim()) err.responsavelRg = 'RG do responsável é obrigatório'
    else if (onlyDigits(form.responsavelRg).length > 15) err.responsavelRg = 'RG do responsável deve ter no máximo 15 caracteres'
    if (!form.responsavelCelular?.trim() || onlyDigits(form.responsavelCelular).length < 10) err.responsavelCelular = 'Celular deve ter pelo menos 10 dígitos'
    if (!form.responsavelEmail?.trim() || !emailRe.test(form.responsavelEmail)) err.responsavelEmail = 'E-mail do responsável inválido'
    if (!form.responsavelNis?.trim()) err.responsavelNis = 'NIS do responsável é obrigatório'
  }
  return err
}

function validateForm(form) {
  const err1 = validateStep(STEP_KEYS.estudante, form)
  const err2 = validateStep(STEP_KEYS.responsavel, form)
  return { ...err1, ...err2 }
}

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

const STEP_ITEMS = [
  { title: 'Instituição e foto' },
  { title: 'Dados do estudante' },
  { title: 'Responsável' },
  { title: 'Assinaturas e documentação' },
]

export default function EstudanteAtletaModal({ open, onClose, onSuccess, estudante = null }) {
  const { user } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const fileInputRef = useRef(null)
  const docInputRef = useRef(null)

  const nomeInstituicao = user?.escola_nome ?? ''
  const inepInstituicao = user?.inep ?? user?.escola_inep ?? ''
  const [loadingEstudante, setLoadingEstudante] = useState(false)

  // Ao abrir para edição, carregar dados completos da API (inclui assinaturas e documentação)
  useEffect(() => {
    if (!open) return
    if (estudante?.id) {
      setForm(INITIAL_FORM)
      setLoadingEstudante(true)
      estudantesService
        .getById(estudante.id)
        .then((full) => {
          if (!full) return
          setForm({
            fotoUrl: full.foto_url || '',
            nome: full.nome || '',
            cpf: estudantesService.formatCpf(full.cpf) || '',
            rg: full.rg || '',
            dataNascimento: full.data_nascimento || '',
            sexo: full.sexo || '',
            email: full.email || '',
            endereco: full.endereco || '',
            cep: full.cep ? maskCep(String(full.cep).replace(/\D/g, '')) : '',
            numeroRegistroConfederacao: full.numero_registro_confederacao || '',
            responsavelNome: full.responsavel_nome || '',
            responsavelCpf: estudantesService.formatCpf(full.responsavel_cpf) || '',
            responsavelRg: full.responsavel_rg || '',
            responsavelCelular: full.responsavel_celular ? maskCelular(String(full.responsavel_celular).replace(/\D/g, '')) : '',
            responsavelEmail: full.responsavel_email || '',
            responsavelNis: full.responsavel_nis || '',
            assinaturaEstudanteAtleta: Boolean(full.assinatura_estudante_atleta),
            assinaturaResponsavelLegal: Boolean(full.assinatura_responsavel_legal),
            assinaturaMedico: Boolean(full.assinatura_medico),
            assinaturaResponsavelInstituicao: Boolean(full.assinatura_responsavel_instituicao),
            documentacaoAssinadaUrl: full.documentacao_assinada_url || '',
          })
          setCurrentStep(0)
        })
        .catch(() => {})
        .finally(() => setLoadingEstudante(false))
    } else {
      setLoadingEstudante(false)
      setForm(INITIAL_FORM)
      setCurrentStep(0)
    }
  }, [open, estudante?.id])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSubmitError(null)
  }

  const handleClose = () => {
    setForm(INITIAL_FORM)
    setErrors({})
    setSubmitError(null)
    setCurrentStep(0)
    onClose?.()
  }

  const handleNext = () => {
    const errs = validateStep(currentStep, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setCurrentStep((s) => Math.min(s + 1, STEP_ITEMS.length - 1))
  }

  const handlePrev = () => {
    setErrors({})
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const MAX_SIZE_MB = 5
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setSubmitError(`O arquivo excede o limite de ${MAX_SIZE_MB}MB. Por favor, escolha uma imagem menor.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setUploadingFoto(true)
    try {
      const url = await uploadFotoEstudante(file)
      updateField('fotoUrl', url)
    } catch (err) {
      setSubmitError(err.message || 'Erro ao enviar foto')
    } finally {
      setUploadingFoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const ACCEPT_DOC = '.pdf,.jpg,.jpeg,.png'
  const MAX_DOC_MB = 10
  const handleDocumentacaoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      setSubmitError('Envie um arquivo PDF ou imagem (JPG, PNG).')
      if (docInputRef.current) docInputRef.current.value = ''
      return
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setSubmitError(`O arquivo excede o limite de ${MAX_DOC_MB}MB.`)
      if (docInputRef.current) docInputRef.current.value = ''
      return
    }
    setUploadingDoc(true)
    try {
      const url = await uploadDocumentacaoAssinada(file)
      updateField('documentacaoAssinadaUrl', url)
    } catch (err) {
      setSubmitError(err.message || 'Erro ao enviar documentação')
    } finally {
      setUploadingDoc(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
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
      const payload = {
        nome: form.nome.trim(),
        cpf: onlyDigits(form.cpf),
        rg: onlyDigits(form.rg).slice(0, 15),
        data_nascimento: form.dataNascimento,
        sexo: form.sexo,
        email: form.email.trim(),
        endereco: form.endereco.trim(),
        cep: onlyDigits(form.cep),
        numero_registro_confederacao: form.numeroRegistroConfederacao?.trim().slice(0, 20) || null,
        foto_url: form.fotoUrl?.trim() || null,
        responsavel_nome: form.responsavelNome.trim(),
        responsavel_cpf: onlyDigits(form.responsavelCpf),
        responsavel_rg: onlyDigits(form.responsavelRg).slice(0, 15),
        responsavel_celular: onlyDigits(form.responsavelCelular),
        responsavel_email: form.responsavelEmail.trim(),
        responsavel_nis: form.responsavelNis.trim(),
        inep_instituicao: (inepInstituicao && String(inepInstituicao).trim()) || undefined,
        assinatura_estudante_atleta: Boolean(form.assinaturaEstudanteAtleta),
        assinatura_responsavel_legal: Boolean(form.assinaturaResponsavelLegal),
        assinatura_medico: Boolean(form.assinaturaMedico),
        assinatura_responsavel_instituicao: Boolean(form.assinaturaResponsavelInstituicao),
        documentacao_assinada_url: form.documentacaoAssinadaUrl?.trim() || null,
      }
      if (estudante?.id) {
        const { inep_instituicao, ...updatePayload } = payload
        await estudantesService.atualizar(estudante.id, updatePayload)
      } else {
        await estudantesService.criar(payload)
      }
      handleClose()
      onSuccess?.()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const isLastStep = currentStep === STEP_ITEMS.length - 1

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={estudante ? 'Editar aluno' : 'Novo aluno'}
      subtitle={estudante ? 'Altere os dados do estudante e do responsável' : 'Preencha os dados em etapas'}
      size="xl"
      footer={
        <div className="flex justify-between gap-3">
          <div>
            {currentStep > 0 && (
              <Button type="default" onClick={handlePrev} disabled={loading || loadingEstudante}>
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="default" onClick={handleClose} disabled={loading || loadingEstudante}>
              Cancelar
            </Button>
            {!isLastStep ? (
              <Button type="primary" onClick={handleNext} disabled={loadingEstudante}>
                Próximo
              </Button>
            ) : (
              <Button type="primary" onClick={handleSubmit} loading={loading} disabled={loading || loadingEstudante}>
                {loading ? 'Salvando...' : estudante ? 'Salvar alterações' : 'Cadastrar'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="p-0">
        {loadingEstudante ? (
          <div className="py-8 text-center text-[#64748b] text-sm">Carregando dados do aluno...</div>
        ) : (
        <>
        <Steps current={currentStep} items={STEP_ITEMS} className="mb-6" size="small" />

        {submitError && (
          <div className="mb-4 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-lg text-sm">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 0: Instituição + Foto */}
          {currentStep === 0 && (
          <div className="space-y-6">
            <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
              <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                <School className="w-4 h-4 text-[#64748b]" />
                Instituição
              </h3>
            </div>
            <div>
              <label className={labelClass}>Nome da instituição</label>
              <Input
                value={nomeInstituicao}
                readOnly
                placeholder="Preenchido automaticamente com a escola do coordenador"
                className="bg-[#f8fafc]"
              />
            </div>
            <div>
              <label className={labelClass}>INEP da instituição</label>
              <Input
                value={inepInstituicao}
                readOnly
                placeholder="Preenchido automaticamente com o INEP do coordenador"
                className="bg-[#f8fafc]"
              />
              <p className="text-sm text-[#64748b] mt-1 m-0">Preenchido automaticamente com o INEP do coordenador.</p>
            </div>
          </div>

          {/* Foto do Aluno */}
          <div className="space-y-4 border-t border-[#e2e8f0] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
              <h3 className="text-base font-semibold text-[#042f2e] m-0">Foto do Aluno</h3>
            </div>
            <div className="flex items-center gap-4">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFoto}
                className="flex-shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center overflow-hidden hover:border-[#0f766e] hover:bg-[#f0fdfa] transition-colors disabled:opacity-60"
              >
                {form.fotoUrl ? (
                  <img src={getStorageUrl(form.fotoUrl)} alt="Foto" className="w-full h-full object-cover" />
                ) : uploadingFoto ? (
                  <span className="text-xs text-[#64748b]">Enviando...</span>
                ) : (
                  <Camera className="w-10 h-10 text-[#94a3b8]" />
                )}
              </button>
              <div>
                <p className="text-sm text-[#64748b] m-0">
                  {form.fotoUrl ? 'Clique para trocar a foto' : 'Clique para enviar uma foto do aluno'}
                </p>
                <p className="text-xs text-[#94a3b8] mt-1 m-0">Formatos: JPG, PNG. Máximo: 5MB.</p>
                <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  <TriangleAlert size={14} className="shrink-0 text-amber-600" />
                  O Upload de foto do aluno é opcional por enquanto, mas será OBRIGATÓRIO para a emissão dos crachás dos atletas no início do evento.
                </span>
              </div>
            </div>
          </div>
          </div>
          )}

          {/* Step 1: Dados do Estudante */}
          {currentStep === 1 && (
          <div className="space-y-4 border-t-0 pt-0">
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
                <Input id="modal-nome" value={form.nome} onChange={(e) => updateField('nome', e.target.value)} placeholder="Nome completo" status={errors.nome ? 'error' : undefined} />
                {errors.nome && <p className={errorClass}>{errors.nome}</p>}
              </div>
              <div>
                <label htmlFor="modal-cpf" className={labelClass}>CPF *</label>
                <Input id="modal-cpf" inputMode="numeric" value={form.cpf} onChange={(e) => updateField('cpf', maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} status={errors.cpf ? 'error' : undefined} />
                {errors.cpf && <p className={errorClass}>{errors.cpf}</p>}
              </div>
              <div>
                <label htmlFor="modal-rg" className={labelClass}>RG *</label>
                <Input id="modal-rg" inputMode="numeric" value={form.rg} onChange={(e) => updateField('rg', onlyDigits(e.target.value).slice(0, 15))} placeholder="Número do RG (apenas dígitos)" maxLength={15} status={errors.rg ? 'error' : undefined} />
                {errors.rg && <p className={errorClass}>{errors.rg}</p>}
              </div>
              <div>
                <label htmlFor="modal-dataNascimento" className={labelClass}>Data de Nascimento *</label>
                <DatePicker
                  id="modal-dataNascimento"
                  value={form.dataNascimento ? dayjs(form.dataNascimento) : null}
                  onChange={(date) => updateField('dataNascimento', date ? date.format('YYYY-MM-DD') : '')}
                  format={['DD/MM/YYYY', 'DDMMYYYY']}
                  placeholder="dd/mm/aaaa"
                  className="w-full"
                  status={errors.dataNascimento ? 'error' : undefined}
                />
                {errors.dataNascimento && <p className={errorClass}>{errors.dataNascimento}</p>}
              </div>
              <div>
                <label htmlFor="modal-sexo" className={labelClass}>Sexo *</label>
                <Select
                  id="modal-sexo"
                  value={form.sexo || undefined}
                  onChange={(v) => updateField('sexo', v)}
                  placeholder="Selecione"
                  options={SEXO_OPCOES}
                  className="w-full"
                  status={errors.sexo ? 'error' : undefined}
                />
                {errors.sexo && <p className={errorClass}>{errors.sexo}</p>}
              </div>
              <div>
                <label htmlFor="modal-email" className={labelClass}>E-mail *</label>
                <Input id="modal-email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="email@exemplo.com" status={errors.email ? 'error' : undefined} />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="modal-endereco" className={labelClass}>Endereço *</label>
                <Input id="modal-endereco" value={form.endereco} onChange={(e) => updateField('endereco', e.target.value)} placeholder="Rua, número, complemento" status={errors.endereco ? 'error' : undefined} />
                {errors.endereco && <p className={errorClass}>{errors.endereco}</p>}
              </div>
              <div>
                <label htmlFor="modal-cep" className={labelClass}>CEP *</label>
                <Input id="modal-cep" inputMode="numeric" value={form.cep} onChange={(e) => updateField('cep', maskCep(e.target.value))} placeholder="00000-000" maxLength={9} status={errors.cep ? 'error' : undefined} />
                {errors.cep && <p className={errorClass}>{errors.cep}</p>}
              </div>
              <div>
                <label htmlFor="modal-numeroRegistroConfederacao" className={labelClass}>Nº Registro da Conf. (opcional)</label>
                <Input id="modal-numeroRegistroConfederacao" value={form.numeroRegistroConfederacao} onChange={(e) => updateField('numeroRegistroConfederacao', e.target.value.slice(0, 20))} placeholder="Máx. 20 caracteres" maxLength={20} status={errors.numeroRegistroConfederacao ? 'error' : undefined} />
                {errors.numeroRegistroConfederacao && <p className={errorClass}>{errors.numeroRegistroConfederacao}</p>}
              </div>
            </div>
          </div>
          )}

          {/* Step 2: Mãe / Responsável */}
          {currentStep === 2 && (
          <div className="space-y-4 border-t border-[#e2e8f0] pt-6">
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
                <Input id="modal-responsavelNome" value={form.responsavelNome} onChange={(e) => updateField('responsavelNome', e.target.value)} placeholder="Nome completo" status={errors.responsavelNome ? 'error' : undefined} />
                {errors.responsavelNome && <p className={errorClass}>{errors.responsavelNome}</p>}
              </div>
              <div>
                <label htmlFor="modal-responsavelCpf" className={labelClass}>CPF *</label>
                <Input id="modal-responsavelCpf" inputMode="numeric" value={form.responsavelCpf} onChange={(e) => updateField('responsavelCpf', maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} status={errors.responsavelCpf ? 'error' : undefined} />
                {errors.responsavelCpf && <p className={errorClass}>{errors.responsavelCpf}</p>}
              </div>
              <div>
                <label htmlFor="modal-responsavelRg" className={labelClass}>RG *</label>
                <Input id="modal-responsavelRg" inputMode="numeric" value={form.responsavelRg} onChange={(e) => updateField('responsavelRg', onlyDigits(e.target.value).slice(0, 15))} placeholder="Número do RG (apenas dígitos)" maxLength={15} status={errors.responsavelRg ? 'error' : undefined} />
                {errors.responsavelRg && <p className={errorClass}>{errors.responsavelRg}</p>}
              </div>
              <div>
                <label htmlFor="modal-responsavelCelular" className={labelClass}>Celular *</label>
                <Input id="modal-responsavelCelular" inputMode="numeric" value={form.responsavelCelular} onChange={(e) => updateField('responsavelCelular', maskCelular(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} status={errors.responsavelCelular ? 'error' : undefined} />
                {errors.responsavelCelular && <p className={errorClass}>{errors.responsavelCelular}</p>}
              </div>
              <div>
                <label htmlFor="modal-responsavelEmail" className={labelClass}>E-mail *</label>
                <Input id="modal-responsavelEmail" type="email" value={form.responsavelEmail} onChange={(e) => updateField('responsavelEmail', e.target.value)} placeholder="email@exemplo.com" status={errors.responsavelEmail ? 'error' : undefined} />
                {errors.responsavelEmail && <p className={errorClass}>{errors.responsavelEmail}</p>}
              </div>
              <div>
                <label htmlFor="modal-responsavelNis" className={labelClass}>NIS *</label>
                <Input id="modal-responsavelNis" inputMode="numeric" value={form.responsavelNis} onChange={(e) => updateField('responsavelNis', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="Número do NIS" maxLength={11} status={errors.responsavelNis ? 'error' : undefined} />
                {errors.responsavelNis && <p className={errorClass}>{errors.responsavelNis}</p>}
              </div>
            </div>
          </div>
          )}

          {/* Step 3: Assinaturas e documentação */}
          {currentStep === 3 && (
          <div className="space-y-4 border-t border-[#e2e8f0] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
              <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                <FileSignature className="w-4 h-4 text-[#64748b]" />
                Confirmação de assinaturas
              </h3>
            </div>
            <p className="text-sm text-[#64748b] m-0 mb-4">
              Marque os itens abaixo para confirmar que as assinaturas foram obtidas na documentação.
            </p>
            <div className="space-y-3">
              <Checkbox
                checked={
                  form.assinaturaEstudanteAtleta &&
                  form.assinaturaResponsavelLegal &&
                  form.assinaturaMedico &&
                  form.assinaturaResponsavelInstituicao
                }
                indeterminate={
                  [form.assinaturaEstudanteAtleta, form.assinaturaResponsavelLegal, form.assinaturaMedico, form.assinaturaResponsavelInstituicao].some(Boolean) &&
                  !(form.assinaturaEstudanteAtleta && form.assinaturaResponsavelLegal && form.assinaturaMedico && form.assinaturaResponsavelInstituicao)
                }
                onChange={(e) => {
                  const v = e.target.checked
                  setForm((prev) => ({
                    ...prev,
                    assinaturaEstudanteAtleta: v,
                    assinaturaResponsavelLegal: v,
                    assinaturaMedico: v,
                    assinaturaResponsavelInstituicao: v,
                  }))
                }}
              >
                Marcar todas
              </Checkbox>
              <Checkbox
                checked={form.assinaturaEstudanteAtleta}
                onChange={(e) => updateField('assinaturaEstudanteAtleta', e.target.checked)}
              >
                Assinatura do estudante-atleta
              </Checkbox>
              <Checkbox
                checked={form.assinaturaResponsavelLegal}
                onChange={(e) => updateField('assinaturaResponsavelLegal', e.target.checked)}
              >
                Assinatura do responsável legal
              </Checkbox>
              <Checkbox
                checked={form.assinaturaMedico}
                onChange={(e) => updateField('assinaturaMedico', e.target.checked)}
              >
                Assinatura do médico
              </Checkbox>
              <Checkbox
                checked={form.assinaturaResponsavelInstituicao}
                onChange={(e) => updateField('assinaturaResponsavelInstituicao', e.target.checked)}
              >
                Assinatura do responsável da instituição de ensino
              </Checkbox>
            </div>

            <div className="border-t border-[#e2e8f0] pt-6 mt-6">
              <h4 className="text-sm font-semibold text-[#334155] mb-2">Anexo da documentação assinada</h4>
              <p className="text-sm text-[#64748b] mb-3 m-0">
                Envie o documento (ficha, termo ou atestado) com as assinaturas. PDF ou imagem (JPG, PNG), até {MAX_DOC_MB}MB.
              </p>
              <input
                ref={docInputRef}
                type="file"
                accept={ACCEPT_DOC}
                onChange={handleDocumentacaoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                disabled={uploadingDoc}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#e2e8f0] bg-[#f8fafc] text-[#334155] hover:bg-[#f0fdfa] hover:border-[#0f766e] transition-colors disabled:opacity-60"
              >
                {uploadingDoc ? 'Enviando...' : form.documentacaoAssinadaUrl ? 'Alterar anexo' : 'Selecionar arquivo'}
              </button>
              {form.documentacaoAssinadaUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-[#0f766e]">Documento anexado.</span>
                  <a
                    href={getStorageUrl(form.documentacaoAssinadaUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#0f766e] hover:underline"
                  >
                    Abrir
                  </a>
                  <button
                    type="button"
                    onClick={() => updateField('documentacaoAssinadaUrl', '')}
                    className="text-sm text-[#dc2626] hover:underline"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
        </form>
        </>
        )}
      </div>
    </Modal>
  )
}
