import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Select, Checkbox, Button, Spin } from 'antd'
import { ArrowLeft, School, Building2, User, Users, Trophy, AlertCircle } from 'lucide-react'
import PublicHeader from '../components/landing/PublicHeader'
import { escolasService } from '../services/escolasService'
import { configuracoesService } from '../services/configuracoesService'
import { esporteVariantesService } from '../services/esporteVariantesService'
import ModalidadeIcon from '../components/catalogos/ModalidadeIcon'
import ModalidadesForm from '../components/catalogos/ModalidadesForm'
import ModalAdesaoEscola from '../components/catalogos/ModalAdesaoEscola'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidCpf(cpf) {
  const digits = (cpf || '').replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i)
  let d1 = (sum * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== parseInt(digits[9], 10)) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i)
  let d2 = (sum * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === parseInt(digits[10], 10)
}

function isValidCnpj(cnpj) {
  const digits = (cnpj || '').replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digits)) return false
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i], 10) * weights1[i]
  let d1 = sum % 11
  d1 = d1 < 2 ? 0 : 11 - d1
  if (d1 !== parseInt(digits[12], 10)) return false
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i], 10) * weights2[i]
  let d2 = sum % 11
  d2 = d2 < 2 ? 0 : 11 - d2
  return d2 === parseInt(digits[13], 10)
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

const INITIAL_FORM = {
  // INSTITUIÇÃO
  nomeRazaoSocial: '',
  inep: '',
  cnpj: '',
  endereco: '',
  cidade: 'Paço do Lumiar',
  uf: 'MA',
  email: '',
  telefone: '',
  // DIRETOR (CPF = credencial de login; senha definida no formulário)
  diretorNome: '',
  diretorCpf: '',
  diretorRg: '',
  diretorSenha: '',
  diretorSenhaConfirm: '',
  // COORDENADOR
  coordenadorNome: '',
  coordenadorCpf: '',
  coordenadorRg: '',
  coordenadorEndereco: '',
  coordenadorEmail: '',
  coordenadorTelefone: '',
  // VARIANTES DE ESPORTES (IDs selecionados)
  varianteIds: [],
}

function validateForm(form) {
  const err = {}
  const onlyDigits = (s) => (s || '').replace(/\D/g, '')

  // INSTITUIÇÃO
  if (!form.nomeRazaoSocial?.trim() || form.nomeRazaoSocial.trim().length < 3) {
    err.nomeRazaoSocial = 'Nome/Razão Social deve ter pelo menos 3 caracteres'
  }
  const inepDigits = onlyDigits(form.inep)
  if (!inepDigits || inepDigits.length !== 8) {
    err.inep = 'INEP deve conter 8 dígitos'
  }
  const cnpjDigits = onlyDigits(form.cnpj)
  if (!cnpjDigits || cnpjDigits.length !== 14) {
    err.cnpj = 'CNPJ deve conter 14 dígitos'
  } else if (!isValidCnpj(form.cnpj)) {
    err.cnpj = 'CNPJ inválido'
  }
  if (!form.endereco?.trim() || form.endereco.trim().length < 5) {
    err.endereco = 'Endereço deve ter pelo menos 5 caracteres'
  }
  if (!form.cidade?.trim() || form.cidade.trim().length < 2) {
    err.cidade = 'Cidade é obrigatória'
  }
  if (!form.uf) err.uf = 'Selecione a UF'
  if (!form.email?.trim()) {
    err.email = 'E-mail é obrigatório'
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    err.email = 'E-mail inválido'
  }
  const telDigits = onlyDigits(form.telefone)
  if (!telDigits || telDigits.length < 10) {
    err.telefone = 'Telefone inválido (mínimo 10 dígitos)'
  }

  // DIRETOR
  if (!form.diretorNome?.trim() || form.diretorNome.trim().length < 3) {
    err.diretorNome = 'Nome do diretor deve ter pelo menos 3 caracteres'
  }
  if (onlyDigits(form.diretorCpf).length !== 11) {
    err.diretorCpf = 'CPF deve conter 11 dígitos'
  } else if (!isValidCpf(form.diretorCpf)) {
    err.diretorCpf = 'CPF inválido'
  }
  const diretorRgDigits = onlyDigits(form.diretorRg)
  if (!diretorRgDigits || diretorRgDigits.length < 4) {
    err.diretorRg = 'RG é obrigatório (apenas números, máx. 15 dígitos)'
  } else if (diretorRgDigits.length > 15) {
    err.diretorRg = 'RG deve ter no máximo 15 dígitos'
  }
  if (!form.diretorSenha || form.diretorSenha.length < 6) {
    err.diretorSenha = 'A senha deve ter pelo menos 6 caracteres'
  }
  if (form.diretorSenha && form.diretorSenha !== (form.diretorSenhaConfirm ?? '')) {
    err.diretorSenhaConfirm = 'As senhas devem coincidir'
  }

  // COORDENADOR
  if (!form.coordenadorNome?.trim() || form.coordenadorNome.trim().length < 3) {
    err.coordenadorNome = 'Nome do coordenador deve ter pelo menos 3 caracteres'
  }
  if (onlyDigits(form.coordenadorCpf).length !== 11) {
    err.coordenadorCpf = 'CPF deve conter 11 dígitos'
  } else if (!isValidCpf(form.coordenadorCpf)) {
    err.coordenadorCpf = 'CPF inválido'
  }
  const coordRgDigits = onlyDigits(form.coordenadorRg)
  if (!coordRgDigits || coordRgDigits.length < 4) {
    err.coordenadorRg = 'RG é obrigatório (apenas números, máx. 15 dígitos)'
  } else if (coordRgDigits.length > 15) {
    err.coordenadorRg = 'RG deve ter no máximo 15 dígitos'
  }
  if (!form.coordenadorEndereco?.trim() || form.coordenadorEndereco.trim().length < 5) {
    err.coordenadorEndereco = 'Endereço deve ter pelo menos 5 caracteres'
  }
  if (!form.coordenadorEmail?.trim()) {
    err.coordenadorEmail = 'E-mail é obrigatório'
  } else if (!EMAIL_REGEX.test(form.coordenadorEmail.trim())) {
    err.coordenadorEmail = 'E-mail inválido'
  }
  const coordTelDigits = onlyDigits(form.coordenadorTelefone)
  if (!coordTelDigits || coordTelDigits.length < 10) {
    err.coordenadorTelefone = 'Telefone inválido (mínimo 10 dígitos)'
  }

  // VARIANTES - pelo menos uma selecionada
  if (!Array.isArray(form.varianteIds) || form.varianteIds.length === 0) {
    err.varianteIds = 'Selecione pelo menos uma modalidade em que sua escola pretende competir'
  }

  return err
}

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
const errorClass = 'text-red-600 text-sm mt-1'

const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }))

// Ordem dos campos no formulário (para scroll ao primeiro erro de validação)
const FIELD_ORDER = [
  'nomeRazaoSocial', 'inep', 'cnpj', 'endereco', 'cidade', 'uf', 'email', 'telefone',
  'diretorNome', 'diretorCpf', 'diretorRg', 'diretorSenha', 'diretorSenhaConfirm',
  'coordenadorNome', 'coordenadorCpf', 'coordenadorRg', 'coordenadorEndereco', 'coordenadorEmail', 'coordenadorTelefone',
  'varianteIds',
]

function maskCpf(value) {
  const v = value.replace(/\D/g, '').slice(0, 11)
  if (v.length <= 3) return v
  if (v.length <= 6) return v.replace(/(\d{3})(\d+)/, '$1.$2')
  if (v.length <= 9) return v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
}

function maskCnpj(value) {
  const v = value.replace(/\D/g, '').slice(0, 14)
  if (v.length <= 2) return v
  if (v.length <= 5) return v.replace(/(\d{2})(\d+)/, '$1.$2')
  if (v.length <= 8) return v.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3')
  if (v.length <= 12) return v.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4')
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
}

function maskInep(value) {
  return value.replace(/\D/g, '').slice(0, 8)
}

function maskTelefone(value) {
  const v = value.replace(/\D/g, '').slice(0, 11)
  if (v.length === 0) return ''
  if (v.length <= 2) return `(${v}`
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

function maskRg(value) {
  return value.replace(/\D/g, '').slice(0, 15)
}

function SectionCard({ icon: Icon, title, children, id }) {
  return (
    <div id={id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function CadastroEscola() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [formEncerrado, setFormEncerrado] = useState(false)
  const [dataLimite, setDataLimite] = useState(null)
  const [loadingDataLimite, setLoadingDataLimite] = useState(true)

  useEffect(() => {
    configuracoesService.getCadastroDataLimite()
      .then((valor) => {
        setDataLimite(valor || null)
        if (valor) {
          const limit = valor.trim().slice(0, 10)
          if (limit && new Date(limit) < new Date()) {
            setFormEncerrado(true)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDataLimite(false))
  }, [])

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      return next
    })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (field === 'diretorSenha' || field === 'diretorSenhaConfirm') {
      setErrors((prev) => {
        const pwd = field === 'diretorSenha' ? value : form.diretorSenha
        const conf = field === 'diretorSenhaConfirm' ? value : form.diretorSenhaConfirm
        const mismatch = pwd && String(conf ?? '').length > 0 && pwd !== (conf ?? '')
        return { ...prev, diretorSenhaConfirm: mismatch ? 'As senhas devem coincidir' : undefined }
      })
    }
  }

  const handleModalidadesChange = (ids) => {
    setForm((prev) => ({ ...prev, varianteIds: ids }))
    if (errors.varianteIds) setErrors((prev) => ({ ...prev, varianteIds: undefined }))
  }

  const [variantes, setVariantes] = useState([])
  const [loadingVariantes, setLoadingVariantes] = useState(true)
  useEffect(() => {
    esporteVariantesService.list()
      .then((data) => setVariantes(Array.isArray(data) ? data : []))
      .catch(() => setVariantes([]))
      .finally(() => setLoadingVariantes(false))
  }, [])

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const errKeys = Object.keys(errors).filter((k) => k !== 'submit')
    if (errKeys.length === 0) return
    const firstErrorField = FIELD_ORDER.find((f) => errors[f])
    if (!firstErrorField) return
    const el = document.getElementById(firstErrorField)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [errors])

  const handleValidationClick = (e) => {
    e.preventDefault()
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    // Em vez de chamar logo submit, abrimos o Modal final.
    setUploadModalOpen(true)
  }

  const handleFinalSubmit = async (extraData) => {
    setSubmitting(true)
    const onlyDigits = (s) => (s || '').replace(/\D/g, '')
    try {
      await escolasService.createPublico({
        nome_escola: form.nomeRazaoSocial.trim(),
        inep: onlyDigits(form.inep).slice(0, 8),
        cnpj: onlyDigits(form.cnpj).slice(0, 14),
        endereco: form.endereco.trim(),
        cidade: form.cidade.trim(),
        uf: form.uf,
        email: form.email.trim(),
        telefone: onlyDigits(form.telefone),
        diretor: {
          nome: form.diretorNome.trim(),
          cpf: onlyDigits(form.diretorCpf).slice(0, 11),
          rg: form.diretorRg.trim(),
          senha: form.diretorSenha,
        },
        coordenador: {
          nome: form.coordenadorNome.trim(),
          cpf: onlyDigits(form.coordenadorCpf).slice(0, 11),
          rg: onlyDigits(form.coordenadorRg),
          endereco: form.coordenadorEndereco.trim(),
          email: form.coordenadorEmail.trim(),
          telefone: onlyDigits(form.coordenadorTelefone),
        },
        variante_ids: form.varianteIds,
        termo_assinatura_url: extraData.termo_assinatura_url,
      })
      setUploadModalOpen(false)
      setSuccess(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      // Se der erro de API lança pro Modal exibir
      throw new Error(err.message || 'Erro ao enviar cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex flex-col flex-1 items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <School className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Solicitação enviada com sucesso!
            </h2>
            <p className="text-gray-600 mb-6">
              Sua solicitação de cadastro foi recebida. Um administrador analisará os dados e, em caso de aprovação, sua escola e o acesso do diretor serão liberados no sistema.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 bg-primary text-white font-semibold hover:bg-primary/90 transition"
            >
              <ArrowLeft size={18} />
              Voltar à página inicial
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (formEncerrado) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex flex-col flex-1 items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Prazo encerrado
            </h2>
            <p className="text-gray-600 mb-6">
              O prazo para envio do formulário de cadastro de escola já foi encerrado. Entre em contato com a SEMCEJ para mais informações.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 bg-primary text-white font-semibold hover:bg-primary/90 transition"
            >
              <ArrowLeft size={18} />
              Voltar à página inicial
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loadingDataLimite) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex flex-1 items-center justify-center p-6">
          <Spin size="large" tip="Verificando prazo de cadastro..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <div className="bg-primary py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold uppercase text-white">
              Cadastro de Escola
            </h1>
            <p className="text-white/70 text-sm">Jogos Escolares Municipais 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <form onSubmit={handleValidationClick} className="space-y-8">
          {errors.submit && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}
          {/* SEÇÃO INSTITUIÇÃO */}
          <SectionCard icon={Building2} title="INSTITUIÇÃO">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="nomeRazaoSocial" className={labelClass}>
                  Nome / Razão Social *
                </label>
                <Input
                  id="nomeRazaoSocial"
                  value={form.nomeRazaoSocial}
                  onChange={(e) => updateField('nomeRazaoSocial', e.target.value)}
                  placeholder="Ex: Escola Municipal João da Silva"
                  status={errors.nomeRazaoSocial ? 'error' : undefined}
                />
                {errors.nomeRazaoSocial && <p className={errorClass}>{errors.nomeRazaoSocial}</p>}
              </div>

              <div>
                <label htmlFor="inep" className={labelClass}>
                  INEP *
                </label>
                <Input
                  id="inep"
                  inputMode="numeric"
                  value={form.inep}
                  onChange={(e) => updateField('inep', maskInep(e.target.value))}
                  placeholder="8 dígitos"
                  maxLength={8}
                  status={errors.inep ? 'error' : undefined}
                />
                {errors.inep && <p className={errorClass}>{errors.inep}</p>}
              </div>

              <div>
                <label htmlFor="cnpj" className={labelClass}>
                  CNPJ *
                </label>
                <Input
                  id="cnpj"
                  inputMode="numeric"
                  value={form.cnpj}
                  onChange={(e) => updateField('cnpj', maskCnpj(e.target.value))}
                  placeholder="00.000.000/0001-00"
                  status={errors.cnpj ? 'error' : undefined}
                />
                {errors.cnpj && <p className={errorClass}>{errors.cnpj}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="endereco" className={labelClass}>
                  Endereço *
                </label>
                <Input
                  id="endereco"
                  value={form.endereco}
                  onChange={(e) => updateField('endereco', e.target.value)}
                  placeholder="Rua, número, complemento"
                  status={errors.endereco ? 'error' : undefined}
                />
                {errors.endereco && <p className={errorClass}>{errors.endereco}</p>}
              </div>

              <div>
                <label htmlFor="cidade" className={labelClass}>
                  Cidade *
                </label>
                <Input
                  id="cidade"
                  value={form.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                  placeholder="Ex: Paço do Lumiar"
                  status={errors.cidade ? 'error' : undefined}
                />
                {errors.cidade && <p className={errorClass}>{errors.cidade}</p>}
              </div>

              <div>
                <label htmlFor="uf" className={labelClass}>
                  UF *
                </label>
                <Select
                  id="uf"
                  value={form.uf || undefined}
                  onChange={(v) => updateField('uf', v)}
                  placeholder="Selecione"
                  options={ufOptions}
                  className="w-full"
                  status={errors.uf ? 'error' : undefined}
                />
                {errors.uf && <p className={errorClass}>{errors.uf}</p>}
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  E-mail *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="escola@email.com"
                  status={errors.email ? 'error' : undefined}
                />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="telefone" className={labelClass}>
                  Telefone *
                </label>
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => updateField('telefone', maskTelefone(e.target.value))}
                  placeholder="(XX) XXXXX-XXXX"
                  status={errors.telefone ? 'error' : undefined}
                />
                {errors.telefone && <p className={errorClass}>{errors.telefone}</p>}
              </div>
            </div>
          </SectionCard>

          {/* SEÇÃO DIRETOR */}
          <SectionCard icon={User} title="DIRETOR">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="diretorNome" className={labelClass}>
                  Nome Completo *
                </label>
                <Input
                  id="diretorNome"
                  value={form.diretorNome}
                  onChange={(e) => updateField('diretorNome', e.target.value)}
                  placeholder="Nome do diretor escolar"
                  status={errors.diretorNome ? 'error' : undefined}
                />
                {errors.diretorNome && <p className={errorClass}>{errors.diretorNome}</p>}
              </div>

              <div>
                <label htmlFor="diretorCpf" className={labelClass}>
                  CPF *
                </label>
                <Input
                  id="diretorCpf"
                  inputMode="numeric"
                  value={form.diretorCpf}
                  onChange={(e) => updateField('diretorCpf', maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  status={errors.diretorCpf ? 'error' : undefined}
                />
                {errors.diretorCpf && <p className={errorClass}>{errors.diretorCpf}</p>}
              </div>

              <div>
                <label htmlFor="diretorRg" className={labelClass}>
                  RG *
                </label>
                <Input
                  id="diretorRg"
                  inputMode="numeric"
                  value={form.diretorRg}
                  onChange={(e) => updateField('diretorRg', maskRg(e.target.value))}
                  placeholder="Apenas números, máx. 15 dígitos"
                  maxLength={15}
                  status={errors.diretorRg ? 'error' : undefined}
                />
                {errors.diretorRg && <p className={errorClass}>{errors.diretorRg}</p>}
              </div>

              <div className="md:col-span-2">
                <div className="flex items-start gap-2 px-3 py-2.5 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    <strong>Atenção:</strong> O acesso ao sistema só será liberado mediante confirmação por parte de um administrador da SEMCEJ.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="diretorSenha" className={labelClass}>
                      Senha (acesso do diretor ao sistema) *
                    </label>
                    <Input.Password
                      id="diretorSenha"
                      value={form.diretorSenha}
                      onChange={(e) => updateField('diretorSenha', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      status={errors.diretorSenha ? 'error' : undefined}
                    />
                    {errors.diretorSenha && <p className={errorClass}>{errors.diretorSenha}</p>}
                  </div>
                  <div>
                    <label htmlFor="diretorSenhaConfirm" className={labelClass}>
                      Confirmar Senha *
                    </label>
                    <Input.Password
                      id="diretorSenhaConfirm"
                      value={form.diretorSenhaConfirm ?? ''}
                      onChange={(e) => updateField('diretorSenhaConfirm', e.target.value)}
                      placeholder="Repita a senha"
                      status={errors.diretorSenhaConfirm ? 'error' : undefined}
                    />
                    {errors.diretorSenhaConfirm && <p className={errorClass}>{errors.diretorSenhaConfirm}</p>}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* SEÇÃO COORDENADOR */}
          <SectionCard icon={Users} title="COORDENADOR DE ESPORTES">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="coordenadorNome" className={labelClass}>
                  Nome Completo *
                </label>
                <Input
                  id="coordenadorNome"
                  value={form.coordenadorNome}
                  onChange={(e) => updateField('coordenadorNome', e.target.value)}
                  placeholder="Nome do coordenador de esportes"
                  status={errors.coordenadorNome ? 'error' : undefined}
                />
                {errors.coordenadorNome && <p className={errorClass}>{errors.coordenadorNome}</p>}
              </div>

              <div>
                <label htmlFor="coordenadorCpf" className={labelClass}>
                  CPF *
                </label>
                <Input
                  id="coordenadorCpf"
                  inputMode="numeric"
                  value={form.coordenadorCpf}
                  onChange={(e) => updateField('coordenadorCpf', maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  status={errors.coordenadorCpf ? 'error' : undefined}
                />
                {errors.coordenadorCpf && <p className={errorClass}>{errors.coordenadorCpf}</p>}
              </div>

              <div>
                <label htmlFor="coordenadorRg" className={labelClass}>
                  RG *
                </label>
                <Input
                  id="coordenadorRg"
                  inputMode="numeric"
                  value={form.coordenadorRg}
                  onChange={(e) => updateField('coordenadorRg', maskRg(e.target.value))}
                  placeholder="Apenas números, máx. 15 dígitos"
                  maxLength={15}
                  status={errors.coordenadorRg ? 'error' : undefined}
                />
                {errors.coordenadorRg && <p className={errorClass}>{errors.coordenadorRg}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="coordenadorEndereco" className={labelClass}>
                  Endereço *
                </label>
                <Input
                  id="coordenadorEndereco"
                  value={form.coordenadorEndereco}
                  onChange={(e) => updateField('coordenadorEndereco', e.target.value)}
                  placeholder="Rua, número, complemento"
                  status={errors.coordenadorEndereco ? 'error' : undefined}
                />
                {errors.coordenadorEndereco && <p className={errorClass}>{errors.coordenadorEndereco}</p>}
              </div>

              <div>
                <label htmlFor="coordenadorEmail" className={labelClass}>
                  E-mail *
                </label>
                <Input
                  id="coordenadorEmail"
                  type="email"
                  value={form.coordenadorEmail}
                  onChange={(e) => updateField('coordenadorEmail', e.target.value)}
                  placeholder="coordenador@email.com"
                  status={errors.coordenadorEmail ? 'error' : undefined}
                />
                {errors.coordenadorEmail && <p className={errorClass}>{errors.coordenadorEmail}</p>}
              </div>

              <div>
                <label htmlFor="coordenadorTelefone" className={labelClass}>
                  Telefone *
                </label>
                <Input
                  id="coordenadorTelefone"
                  value={form.coordenadorTelefone}
                  onChange={(e) => updateField('coordenadorTelefone', maskTelefone(e.target.value))}
                  placeholder="(XX) XXXXX-XXXX"
                  status={errors.coordenadorTelefone ? 'error' : undefined}
                />
                {errors.coordenadorTelefone && <p className={errorClass}>{errors.coordenadorTelefone}</p>}
              </div>
            </div>
          </SectionCard>

          {/* SEÇÃO MODALIDADES */}
          <SectionCard icon={Trophy} title="MODALIDADES" id="varianteIds">
            <p className="text-sm text-gray-600 mb-4">
              Selecione um esporte e marque as combinações (masculino/feminino, infantil/infanto) em que sua escola pretende competir.
            </p>
            <ModalidadesForm
              variantes={variantes}
              value={form.varianteIds || []}
              onChange={handleModalidadesChange}
              error={errors.varianteIds}
              loading={loadingVariantes}
              emptyMessage="Nenhuma modalidade cadastrada no sistema. Entre em contato com a SEMCEJ."
            />
          </SectionCard>

          <div className="flex gap-4 pt-4">
            <Button
              type="default"
              onClick={() => navigate('/')}
            >
              Voltar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
            >
              Gerar Ficha de Adesão
            </Button>
          </div>
        </form>
      </div>

      <ModalAdesaoEscola
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        form={form}
        variantes={variantes}
        onSuccess={handleFinalSubmit}
      />
    </div>
  )
}
