import { useState, useRef, useEffect } from 'react'
import { User, UserCircle, School, Camera, TriangleAlert, FileSignature } from 'lucide-react'
import { DatePicker, Input, Select, Button, Steps, Upload, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import Modal from '../ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { estudantesService } from '../../services/estudantesService'
import { uploadFotoEstudante, uploadDocumentacaoAssinada, uploadDocumentacaoRg, getStorageUrl } from '../../services/storageService'
import StorageImage from '../StorageImage'
import FichaIndividualPrint from './FichaIndividualPrint'

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
  peso: '',
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
  fichaAssinada: false,
  documentacaoAssinadaUrl: '',
  documentacaoRgUrl: '',
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
  estudante: 0,
  responsavel: 1,
  assinaturas: 2,
}

function validateStepAssinaturas(form) {
  const err = {}
  if (!form.documentacaoRgUrl?.trim()) err.documentacaoRgUrl = 'Documento de Identidade é obrigatório'
  return err
}

function validateStep(step, form) {
  if (step === STEP_KEYS.assinaturas) return validateStepAssinaturas(form)
  const err = {}
  if (step === STEP_KEYS.estudante) {
    if (!form.nome?.trim() || form.nome.trim().length < 3) err.nome = 'Nome deve ter pelo menos 3 caracteres'
    if (onlyDigits(form.cpf).length !== 11) err.cpf = 'CPF deve conter 11 dígitos'
    else if (!isValidCpf(form.cpf)) err.cpf = 'CPF inválido'
    if (!form.rg?.trim()) err.rg = 'RG é obrigatório'
    else if (onlyDigits(form.rg).length > 15) err.rg = 'RG deve ter no máximo 15 caracteres'
    if (!form.dataNascimento?.trim()) err.dataNascimento = 'Data de nascimento é obrigatória'
    if (!form.sexo) err.sexo = 'Selecione o sexo'
    if (!form.peso?.toString().trim()) err.peso = 'Peso é obrigatório'
    else {
      const peso = Number(form.peso)
      if (Number.isNaN(peso) || peso <= 0 || peso > 500) err.peso = 'Peso deve estar entre 0,1 e 500 kg'
    }
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
  const err3 = validateStep(STEP_KEYS.assinaturas, form)
  return { ...err1, ...err2, ...err3 }
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
  { title: 'Dados do estudante' },
  { title: 'Responsável' },
  { title: 'Assinaturas e documentação' },
]

export default function EstudanteAtletaModal({ open, onClose, onSuccess, estudante = null, initialStep = 0 }) {
  const { user } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadingRgDoc, setUploadingRgDoc] = useState(false)
  const [checkingCpf, setCheckingCpf] = useState(false)
  const [uploadingFileInfo, setUploadingFileInfo] = useState(null)
  const [uploadingRgFileInfo, setUploadingRgFileInfo] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [fichaPreviewOpen, setFichaPreviewOpen] = useState(false)
  const fileInputRef = useRef(null)

  const nomeInstituicao = user?.escola_nome ?? ''
  const inepInstituicao = user?.inep ?? user?.escola_inep ?? ''
  const [loadingEstudante, setLoadingEstudante] = useState(false)
  const [instituicaoCarregada, setInstituicaoCarregada] = useState({ nome: '', inep: '' })

  // Exibição: em edição usa instituicaoCarregada e fallback no estudante (lista) para garantir que nome/INEP apareçam
  const nomeInstituicaoExibido = estudante
    ? (instituicaoCarregada.nome || estudante.escola_nome || '').trim()
    : nomeInstituicao
  const inepInstituicaoExibido = estudante
    ? (instituicaoCarregada.inep || (estudante.escola_inep != null && String(estudante.escola_inep).trim() !== '' ? String(estudante.escola_inep).trim() : '')).trim()
    : inepInstituicao

  // Ao abrir para edição, carregar dados completos da API (inclui assinaturas e documentação)
  useEffect(() => {
    if (!open) return
    if (estudante?.id) {
      setForm(INITIAL_FORM)
      setInstituicaoCarregada({
        nome: estudante.escola_nome ?? '',
        inep: (estudante.escola_inep != null && String(estudante.escola_inep).trim() !== '') ? String(estudante.escola_inep).trim() : '',
      })
      setLoadingEstudante(true)
      estudantesService
        .getById(estudante.id)
        .then((full) => {
          if (!full) return
          setInstituicaoCarregada({
            nome: full.escola_nome ?? '',
            inep: full.escola_inep != null && full.escola_inep !== '' ? String(full.escola_inep) : '',
          })
          setForm({
            fotoUrl: full.foto_url || '',
            nome: full.nome || '',
            cpf: estudantesService.formatCpf(full.cpf) || '',
            rg: full.rg || '',
            dataNascimento: full.data_nascimento || '',
            sexo: full.sexo || '',
            peso: full.peso != null ? String(full.peso) : '',
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
            fichaAssinada: Boolean(full.ficha_assinada),
            documentacaoAssinadaUrl: full.documentacao_assinada_url || '',
            documentacaoRgUrl: full.documentacao_rg_url || '',
          })
          setCurrentStep(initialStep)
        })
        .catch(() => { })
        .finally(() => setLoadingEstudante(false))
    } else {
      setLoadingEstudante(false)
      setInstituicaoCarregada({ nome: '', inep: '' })
      setForm(INITIAL_FORM)
      setCurrentStep(initialStep)
    }
  }, [open, estudante?.id, initialStep])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSubmitError(null)
  }

  const handleCpfBlur = async () => {
    const digits = onlyDigits(form.cpf)
    if (digits.length !== 11 || !isValidCpf(form.cpf)) return
    // Edição: pula se o CPF não mudou
    if (estudante?.id && onlyDigits(estudante.cpf || '') === digits) return
    setCheckingCpf(true)
    try {
      const found = await estudantesService.buscarPorCpf(digits)
      if (found) {
        setErrors((prev) => ({
          ...prev,
          cpf: `CPF já cadastrado: ${found.nome}${found.escola_nome ? ` — ${found.escola_nome}` : ''}`,
        }))
      }
    } catch {
      // 404 = não encontrado, tudo certo
    } finally {
      setCheckingCpf(false)
    }
  }

  const handleClose = () => {
    setForm(INITIAL_FORM)
    setInstituicaoCarregada({ nome: '', inep: '' })
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
      if (estudante?.id) {
        await estudantesService.atualizarFoto(estudante.id, url)
      }
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
  const docFileList = [
    ...(form.documentacaoAssinadaUrl
      ? [{ uid: 'doc', name: 'Documento assinado', status: 'done', url: getStorageUrl(form.documentacaoAssinadaUrl) }]
      : []),
    ...(uploadingFileInfo ? [{ uid: uploadingFileInfo.uid, name: uploadingFileInfo.name, status: 'uploading' }] : []),
  ]
  const handleDocCustomRequest = async ({ file, onSuccess, onError }) => {
    const isPdf = file.type === 'application/pdf'
    const isImage = file.type?.startsWith('image/')
    if (!isPdf && !isImage) {
      setSubmitError('Envie um arquivo PDF ou imagem (JPG, PNG).')
      onError(new Error('Tipo de arquivo inválido'))
      setUploadingFileInfo(null)
      return
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setSubmitError(`O arquivo excede o limite de ${MAX_DOC_MB}MB.`)
      onError(new Error('Arquivo muito grande'))
      setUploadingFileInfo(null)
      return
    }
    setUploadingDoc(true)
    setUploadingFileInfo({ uid: file.uid, name: file.name })
    try {
      const url = await uploadDocumentacaoAssinada(file)
      updateField('documentacaoAssinadaUrl', url)
      onSuccess(url)
    } catch (err) {
      setSubmitError(err.message || 'Erro ao enviar documentação')
      onError(err)
    } finally {
      setUploadingDoc(false)
      setUploadingFileInfo(null)
    }
  }
  const handleDocChange = ({ fileList }) => {
    if (fileList.length === 0) updateField('documentacaoAssinadaUrl', '')
  }
  const rgDocFileList = [
    ...(form.documentacaoRgUrl
      ? [{ uid: 'doc-rg', name: 'Documento RG', status: 'done', url: getStorageUrl(form.documentacaoRgUrl) }]
      : []),
    ...(uploadingRgFileInfo ? [{ uid: uploadingRgFileInfo.uid, name: uploadingRgFileInfo.name, status: 'uploading' }] : []),
  ]
  const handleRgDocCustomRequest = async ({ file, onSuccess, onError }) => {
    const isPdf = file.type === 'application/pdf'
    const isImage = file.type?.startsWith('image/')
    if (!isPdf && !isImage) {
      setSubmitError('Envie um arquivo PDF ou imagem (JPG, PNG).')
      onError(new Error('Tipo de arquivo inválido'))
      setUploadingRgFileInfo(null)
      return
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setSubmitError(`O arquivo excede o limite de ${MAX_DOC_MB}MB.`)
      onError(new Error('Arquivo muito grande'))
      setUploadingRgFileInfo(null)
      return
    }
    setUploadingRgDoc(true)
    setUploadingRgFileInfo({ uid: file.uid, name: file.name })
    try {
      const url = await uploadDocumentacaoRg(file)
      updateField('documentacaoRgUrl', url)
      onSuccess(url)
    } catch (err) {
      setSubmitError(err.message || 'Erro ao enviar documentação do RG')
      onError(err)
    } finally {
      setUploadingRgDoc(false)
      setUploadingRgFileInfo(null)
    }
  }
  const handleRgDocChange = ({ fileList }) => {
    if (fileList.length === 0) updateField('documentacaoRgUrl', '')
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const errs0 = validateStep(STEP_KEYS.estudante, form)
      const errs1 = validateStep(STEP_KEYS.responsavel, form)
      if (Object.keys(errs0).length > 0) {
        setCurrentStep(STEP_KEYS.estudante)
      } else if (Object.keys(errs1).length > 0) {
        setCurrentStep(STEP_KEYS.responsavel)
      }
      message.error('Há campos obrigatórios não preenchidos. Verifique os dados antes de salvar.')
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
        peso: Number(form.peso),
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
        ficha_assinada: Boolean(form.documentacaoAssinadaUrl?.trim()),
        documentacao_assinada_url: form.documentacaoAssinadaUrl?.trim() || null,
        documentacao_rg_url: form.documentacaoRgUrl?.trim() || null,
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
      title={estudante ? form.nome || estudante.nome || 'Editar aluno' : 'Novo aluno'}
      subtitle={
        estudante
          ? (nomeInstituicaoExibido ? `${nomeInstituicaoExibido}${inepInstituicaoExibido ? ` - ${inepInstituicaoExibido}` : ''}` : 'Altere os dados do estudante e do responsável')
          : 'Preencha os dados em etapas'
      }
      size="xl"
      footer={
        <div className="flex justify-between gap-3 w-full">
          <Button type="default" onClick={handleClose} disabled={loading || loadingEstudante}>
            Cancelar
          </Button>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button type="default" onClick={handlePrev} disabled={loading || loadingEstudante}>
                Voltar
              </Button>
            )}
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
              {/* Step 0: Dados do Estudante e Foto */}
              {currentStep === 0 && (
                <div className="space-y-6 pt-2">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    {/* Elemento Fotográfico */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFoto}
                        className="w-32 h-32 rounded-full border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center overflow-hidden hover:border-[#0f766e] hover:bg-[#f0fdfa] transition-colors disabled:opacity-60 mb-2 relative group"
                      >
                        {form.fotoUrl ? (
                          <>
                            <StorageImage path={form.fotoUrl} alt="Foto do Estudante" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : uploadingFoto ? (
                          <span className="text-xs text-[#64748b] font-medium">Buscando...</span>
                        ) : (
                          <Camera className="w-10 h-10 text-[#94a3b8]" />
                        )}
                      </button>
                      <p className="text-xs text-[#64748b] text-center w-32 m-0">
                        {form.fotoUrl
                          ? estudante?.id ? 'Clique para alterar (salva imediatamente)' : 'Clique para alterar'
                          : 'Foto obrigatória para emissão do crachá'}
                      </p>
                    </div>

                    {/* Inputs Básicos do grid (Nome, CPF...) agrupados à direita se tela grande */}
                    <div className="flex-grow w-full space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
                        <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                          <User className="w-4 h-4 text-[#64748b]" />
                          Dados Principais
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-5">
                        <div className="sm:col-span-8">
                          <label htmlFor="modal-nome" className={labelClass}>Nome Completo *</label>
                          <Input id="modal-nome" value={form.nome} onChange={(e) => updateField('nome', e.target.value)} placeholder="Digite o nome completo do aluno" status={errors.nome ? 'error' : undefined} />
                          {errors.nome && <p className={errorClass}>{errors.nome}</p>}
                        </div>
                        <div className="sm:col-span-4">
                          <label htmlFor="modal-cpf" className={labelClass}>CPF *</label>
                          <Input id="modal-cpf" inputMode="numeric" value={form.cpf} onChange={(e) => updateField('cpf', maskCpf(e.target.value))} onBlur={handleCpfBlur} placeholder="000.000.000-00" maxLength={14} status={errors.cpf ? 'error' : undefined} suffix={checkingCpf ? <span className="text-xs text-[#64748b]">Verificando...</span> : null} />
                          {errors.cpf && <p className={errorClass}>{errors.cpf}</p>}
                        </div>
                        <div className="sm:col-span-4">
                          <label htmlFor="modal-rg" className={labelClass}>Identidade (RG) *</label>
                          <Input id="modal-rg" inputMode="numeric" value={form.rg} onChange={(e) => updateField('rg', onlyDigits(e.target.value).slice(0, 15))} placeholder="Número do RG" maxLength={15} status={errors.rg ? 'error' : undefined} />
                          {errors.rg && <p className={errorClass}>{errors.rg}</p>}
                        </div>
                        <div className="sm:col-span-4">
                          <label htmlFor="modal-dataNascimento" className={labelClass}>Data de Nascimento *</label>
                          <DatePicker
                            id="modal-dataNascimento"
                            value={form.dataNascimento ? dayjs(form.dataNascimento) : null}
                            onChange={(date) => updateField('dataNascimento', date ? date.format('YYYY-MM-DD') : '')}
                            format={['DD/MM/YYYY', 'DDMMYYYY']}
                            placeholder="DD/MM/AAAA"
                            className="w-full"
                            status={errors.dataNascimento ? 'error' : undefined}
                          />
                          {errors.dataNascimento && <p className={errorClass}>{errors.dataNascimento}</p>}
                        </div>
                        <div className="sm:col-span-4">
                          <label htmlFor="modal-sexo" className={labelClass}>Sexo *</label>
                          <Select
                            id="modal-sexo"
                            value={form.sexo || undefined}
                            onChange={(v) => updateField('sexo', v)}
                            placeholder="Selecione o sexo"
                            options={SEXO_OPCOES}
                            className="w-full"
                            status={errors.sexo ? 'error' : undefined}
                          />
                          {errors.sexo && <p className={errorClass}>{errors.sexo}</p>}
                        </div>
                        <div className="sm:col-span-4">
                          <label htmlFor="modal-peso" className={labelClass}>Peso (kg) *</label>
                          <Input
                            id="modal-peso"
                            type="number"
                            inputMode="decimal"
                            min={0.1}
                            max={500}
                            step={0.1}
                            value={form.peso}
                            onChange={(e) => updateField('peso', e.target.value)}
                            placeholder="Ex: 62.5"
                            status={errors.peso ? 'error' : undefined}
                          />
                          {errors.peso && <p className={errorClass}>{errors.peso}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Restante dos dados de Contato e Endereço */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-5 mt-2">
                    <div className="sm:col-span-6">
                      <label htmlFor="modal-email" className={labelClass}>E-mail *</label>
                      <Input id="modal-email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="emaildoaluno@exemplo.com" status={errors.email ? 'error' : undefined} />
                      {errors.email && <p className={errorClass}>{errors.email}</p>}
                    </div>
                    <div className="sm:col-span-6">
                      <label htmlFor="modal-numeroRegistroConfederacao" className={labelClass}>Nº Registro na Confederação (Opcional)</label>
                      <Input id="modal-numeroRegistroConfederacao" value={form.numeroRegistroConfederacao} onChange={(e) => updateField('numeroRegistroConfederacao', e.target.value.slice(0, 20))} placeholder="Ex: RJ12345" maxLength={20} status={errors.numeroRegistroConfederacao ? 'error' : undefined} />
                      {errors.numeroRegistroConfederacao && <p className={errorClass}>{errors.numeroRegistroConfederacao}</p>}
                    </div>
                    <div className="sm:col-span-4">
                      <label htmlFor="modal-cep" className={labelClass}>CEP *</label>
                      <Input id="modal-cep" inputMode="numeric" value={form.cep} onChange={(e) => updateField('cep', maskCep(e.target.value))} placeholder="00000-000" maxLength={9} status={errors.cep ? 'error' : undefined} />
                      {errors.cep && <p className={errorClass}>{errors.cep}</p>}
                    </div>
                    <div className="sm:col-span-8">
                      <label htmlFor="modal-endereco" className={labelClass}>Endereço Completo *</label>
                      <Input id="modal-endereco" value={form.endereco} onChange={(e) => updateField('endereco', e.target.value)} placeholder="Rua, Número, Bairro, Complemento" status={errors.endereco ? 'error' : undefined} />
                      {errors.endereco && <p className={errorClass}>{errors.endereco}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Mãe / Responsável */}
              {currentStep === 1 && (
                <div className="space-y-4 border-t border-[#e2e8f0] pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
                    <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                      <UserCircle className="w-4 h-4 text-[#64748b]" />
                      Mãe / Responsável
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-5">
                    <div className="sm:col-span-8">
                      <label htmlFor="modal-responsavelNome" className={labelClass}>Nome Completo do Responsável *</label>
                      <Input id="modal-responsavelNome" value={form.responsavelNome} onChange={(e) => updateField('responsavelNome', e.target.value)} placeholder="Nome da mãe, pai ou responsável" status={errors.responsavelNome ? 'error' : undefined} />
                      {errors.responsavelNome && <p className={errorClass}>{errors.responsavelNome}</p>}
                    </div>
                    <div className="sm:col-span-4">
                      <label htmlFor="modal-responsavelCpf" className={labelClass}>CPF *</label>
                      <Input id="modal-responsavelCpf" inputMode="numeric" value={form.responsavelCpf} onChange={(e) => updateField('responsavelCpf', maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} status={errors.responsavelCpf ? 'error' : undefined} />
                      {errors.responsavelCpf && <p className={errorClass}>{errors.responsavelCpf}</p>}
                    </div>
                    <div className="sm:col-span-4">
                      <label htmlFor="modal-responsavelRg" className={labelClass}>Identidade (RG) *</label>
                      <Input id="modal-responsavelRg" inputMode="numeric" value={form.responsavelRg} onChange={(e) => updateField('responsavelRg', onlyDigits(e.target.value).slice(0, 15))} placeholder="Apenas os números" maxLength={15} status={errors.responsavelRg ? 'error' : undefined} />
                      {errors.responsavelRg && <p className={errorClass}>{errors.responsavelRg}</p>}
                    </div>
                    <div className="sm:col-span-4">
                      <label htmlFor="modal-responsavelNis" className={labelClass}>Número do NIS *</label>
                      <Input id="modal-responsavelNis" inputMode="numeric" value={form.responsavelNis} onChange={(e) => updateField('responsavelNis', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="Apenas 11 dígitos" maxLength={11} status={errors.responsavelNis ? 'error' : undefined} />
                      {errors.responsavelNis && <p className={errorClass}>{errors.responsavelNis}</p>}
                    </div>
                    <div className="sm:col-span-4">
                      <label htmlFor="modal-responsavelCelular" className={labelClass}>Telefone Celular *</label>
                      <Input id="modal-responsavelCelular" inputMode="numeric" value={form.responsavelCelular} onChange={(e) => updateField('responsavelCelular', maskCelular(e.target.value))} placeholder="(00) 90000-0000" maxLength={15} status={errors.responsavelCelular ? 'error' : undefined} />
                      {errors.responsavelCelular && <p className={errorClass}>{errors.responsavelCelular}</p>}
                    </div>
                    <div className="sm:col-span-12">
                      <label htmlFor="modal-responsavelEmail" className={labelClass}>E-mail do Responsável *</label>
                      <Input id="modal-responsavelEmail" type="email" value={form.responsavelEmail} onChange={(e) => updateField('responsavelEmail', e.target.value)} placeholder="emaildoresponsavel@exemplo.com" status={errors.responsavelEmail ? 'error' : undefined} />
                      {errors.responsavelEmail && <p className={errorClass}>{errors.responsavelEmail}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Assinaturas e documentação */}
              {currentStep === 2 && (
                <div className="space-y-4 border-t border-[#e2e8f0] pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
                    <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                      <FileSignature className="w-4 h-4 text-[#64748b]" />
                      Assinaturas e documentação
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-[#64748b] mb-1 m-0">
                      A Ficha de Inscrição Individual deve ser assinada pelo Aluno, Responsável, Médico e Escola.
                    </p>

                    {/* Botão de gerar ficha para coleta de assinaturas */}
                    <div className="p-4 bg-[#f0fdfa] border border-[#ccfbf1] rounded-lg">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#0f766e] rounded-lg">
                            <FileSignature className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-[#042f2e] m-0">Ficha de Inscrição Individual</h5>
                            <p className="text-xs text-[#0f766e] m-0">Gere o documento preenchido para coletar as assinaturas.</p>
                          </div>
                        </div>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setFichaPreviewOpen(true)}
                          className="bg-[#0f766e] hover:bg-[#0d6961] border-none"
                        >
                          Gerar Ficha de Inscrição
                        </Button>
                      </div>
                    </div>

                  </div>

                  <div className="border-t border-[#e2e8f0] pt-6 mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Ficha de Inscrição Individual Assinada */}
                      <div>
                        <h4 className="text-sm font-semibold text-[#334155] mb-2">Ficha de Inscrição Individual Assinada</h4>
                        <p className="text-sm text-[#64748b] mb-4 m-0">
                          {`PDF ou imagem (JPG, PNG), até ${MAX_DOC_MB}MB.`}
                        </p>
                        <Upload
                          listType="picture-card"
                          maxCount={1}
                          accept={ACCEPT_DOC}
                          fileList={docFileList}
                          customRequest={handleDocCustomRequest}
                          onChange={handleDocChange}
                          onPreview={(file) => {
                            if (file.url) window.open(file.url, '_blank')
                            else if (file.originFileObj) {
                              const url = URL.createObjectURL(file.originFileObj)
                              window.open(url, '_blank')
                            }
                          }}
                          showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                        >
                          {docFileList.length >= 1 ? null : (
                            <div className="flex flex-col items-center justify-center gap-1 py-2">
                              <PlusOutlined className="text-2xl text-[#94a3b8]" />
                              <span className="text-xs text-[#64748b]">Selecionar arquivo</span>
                            </div>
                          )}
                        </Upload>
                      </div>

                      {/* Documento de Identidade do Aluno (RG) — obrigatório */}
                      <div>
                        <h4 className="text-sm font-semibold text-[#334155] mb-2">
                          Documento de Identidade do Aluno (RG) <span className="text-[#dc2626]">*</span>
                        </h4>
                        <p className="text-sm text-[#64748b] mb-4 m-0">
                          {`PDF ou imagem (JPG, PNG), até ${MAX_DOC_MB}MB.`}
                        </p>
                        <Upload
                          listType="picture-card"
                          maxCount={1}
                          accept={ACCEPT_DOC}
                          fileList={rgDocFileList}
                          customRequest={handleRgDocCustomRequest}
                          onChange={handleRgDocChange}
                          onPreview={(file) => {
                            if (file.url) window.open(file.url, '_blank')
                            else if (file.originFileObj) {
                              const url = URL.createObjectURL(file.originFileObj)
                              window.open(url, '_blank')
                            }
                          }}
                          showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                        >
                          {rgDocFileList.length >= 1 ? null : (
                            <div className="flex flex-col items-center justify-center gap-1 py-2">
                              <PlusOutlined className={`text-2xl ${errors.documentacaoRgUrl ? 'text-[#dc2626]' : 'text-[#94a3b8]'}`} />
                              <span className="text-xs text-[#64748b]">
                                {uploadingRgDoc ? 'Enviando...' : 'Selecionar arquivo'}
                              </span>
                            </div>
                          )}
                        </Upload>
                        {errors.documentacaoRgUrl && (
                          <p className={errorClass}>{errors.documentacaoRgUrl}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </>
        )}
      </div>

      {/* Preview da Ficha Individual */}
      <Modal
        isOpen={fichaPreviewOpen}
        onClose={() => setFichaPreviewOpen(false)}
        title="Visualização da Ficha de Inscrição"
        size="xl"
        footer={null}
      >
        <div className="max-h-[80vh] overflow-y-auto">
          <FichaIndividualPrint
            onClose={() => setFichaPreviewOpen(false)}
            dados={{
              estudante: {
                ...form,
                escola_nome: nomeInstituicaoExibido,
                escola_inep: inepInstituicaoExibido
              },
              responsavel: {
                nome: form.responsavelNome,
                cpf: form.responsavelCpf,
                rg: form.responsavelRg,
                celular: form.responsavelCelular,
                email: form.responsavelEmail,
                nis: form.responsavelNis
              }
            }}
          />
        </div>
      </Modal>
    </Modal>
  )
}
