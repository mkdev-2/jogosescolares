import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, School, Building2, User, Users, Trophy, AlertCircle } from 'lucide-react'
import PublicHeader from '../components/landing/PublicHeader'
import { escolasService } from '../services/escolasService'
import { configuracoesService } from '../services/configuracoesService'

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

const CATEGORIAS = ['12-14', '15-17']
const NAIPES = { M: 'Masculino', F: 'Feminino' }
const TIPOS_MODALIDADE = ['individuais', 'coletivas', 'novas']

const getInitialModalidades = () => {
  const obj = {}
  CATEGORIAS.forEach((cat) => {
    obj[cat] = {}
    Object.keys(NAIPES).forEach((naipe) => {
      obj[cat][naipe] = {}
      TIPOS_MODALIDADE.forEach((tipo) => { obj[cat][naipe][tipo] = false })
    })
  })
  return obj
}

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
  // MODALIDADES
  modalidades: getInitialModalidades(),
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
    err.diretorRg = 'RG é obrigatório (apenas números, máx. 11 dígitos)'
  } else if (diretorRgDigits.length > 11) {
    err.diretorRg = 'RG deve ter no máximo 11 dígitos'
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
    err.coordenadorRg = 'RG é obrigatório (apenas números, máx. 11 dígitos)'
  } else if (coordRgDigits.length > 11) {
    err.coordenadorRg = 'RG deve ter no máximo 11 dígitos'
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

  // MODALIDADES - pelo menos uma selecionada
  let hasModalidade = false
  CATEGORIAS.forEach((cat) => {
    Object.keys(NAIPES).forEach((naipe) => {
      TIPOS_MODALIDADE.forEach((tipo) => {
        if (form.modalidades?.[cat]?.[naipe]?.[tipo]) hasModalidade = true
      })
    })
  })
  if (!hasModalidade) {
    err.modalidades = 'Selecione pelo menos uma modalidade'
  }

  return err
}

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50'
const inputErrorClass = 'border-red-500 focus:ring-red-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
const errorClass = 'text-red-600 text-sm mt-1'

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
  return value.replace(/\D/g, '').slice(0, 11)
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
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

  const updateModalidade = (cat, naipe, tipo, checked) => {
    setForm((prev) => ({
      ...prev,
      modalidades: {
        ...prev.modalidades,
        [cat]: {
          ...prev.modalidades[cat],
          [naipe]: {
            ...prev.modalidades[cat][naipe],
            [tipo]: checked,
          },
        },
      },
    }))
    if (errors.modalidades) setErrors((prev) => ({ ...prev, modalidades: undefined }))
  }

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
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
        modalidades: form.modalidades,
      })
      setSuccess(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao enviar cadastro. Tente novamente.' })
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
              Cadastro enviado com sucesso!
            </h2>
            <p className="text-gray-600 mb-6">
              Sua escola foi cadastrada. Entraremos em contato em breve.
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
        {formEncerrado && (
          <div className="mb-6 px-4 py-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <p className="font-medium">Período de adesão encerrado.</p>
            <p className="text-sm mt-1">O prazo para envio do formulário já foi encerrado. Entre em contato com a SEMCEJ para mais informações.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">
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
                <input
                  id="nomeRazaoSocial"
                  type="text"
                  value={form.nomeRazaoSocial}
                  onChange={(e) => updateField('nomeRazaoSocial', e.target.value)}
                  placeholder="Ex: Escola Municipal João da Silva"
                  className={`${inputClass} ${errors.nomeRazaoSocial ? inputErrorClass : ''}`}
                />
                {errors.nomeRazaoSocial && <p className={errorClass}>{errors.nomeRazaoSocial}</p>}
              </div>

              <div>
                <label htmlFor="inep" className={labelClass}>
                  INEP *
                </label>
                <input
                  id="inep"
                  type="text"
                  inputMode="numeric"
                  value={form.inep}
                  onChange={(e) => updateField('inep', maskInep(e.target.value))}
                  placeholder="8 dígitos"
                  maxLength={8}
                  className={`${inputClass} ${errors.inep ? inputErrorClass : ''}`}
                />
                {errors.inep && <p className={errorClass}>{errors.inep}</p>}
              </div>

              <div>
                <label htmlFor="cnpj" className={labelClass}>
                  CNPJ *
                </label>
                <input
                  id="cnpj"
                  type="text"
                  inputMode="numeric"
                  value={form.cnpj}
                  onChange={(e) => updateField('cnpj', maskCnpj(e.target.value))}
                  placeholder="00.000.000/0001-00"
                  className={`${inputClass} ${errors.cnpj ? inputErrorClass : ''}`}
                />
                {errors.cnpj && <p className={errorClass}>{errors.cnpj}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="endereco" className={labelClass}>
                  Endereço *
                </label>
                <input
                  id="endereco"
                  type="text"
                  value={form.endereco}
                  onChange={(e) => updateField('endereco', e.target.value)}
                  placeholder="Rua, número, complemento"
                  className={`${inputClass} ${errors.endereco ? inputErrorClass : ''}`}
                />
                {errors.endereco && <p className={errorClass}>{errors.endereco}</p>}
              </div>

              <div>
                <label htmlFor="cidade" className={labelClass}>
                  Cidade *
                </label>
                <input
                  id="cidade"
                  type="text"
                  value={form.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                  placeholder="Ex: Paço do Lumiar"
                  className={`${inputClass} ${errors.cidade ? inputErrorClass : ''}`}
                />
                {errors.cidade && <p className={errorClass}>{errors.cidade}</p>}
              </div>

              <div>
                <label htmlFor="uf" className={labelClass}>
                  UF *
                </label>
                <select
                  id="uf"
                  value={form.uf}
                  onChange={(e) => updateField('uf', e.target.value)}
                  className={`${inputClass} ${errors.uf ? inputErrorClass : ''}`}
                >
                  <option value="">Selecione</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
                {errors.uf && <p className={errorClass}>{errors.uf}</p>}
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  E-mail *
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="escola@email.com"
                  className={`${inputClass} ${errors.email ? inputErrorClass : ''}`}
                />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="telefone" className={labelClass}>
                  Telefone *
                </label>
                <input
                  id="telefone"
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => updateField('telefone', maskTelefone(e.target.value))}
                  placeholder="(XX) XXXXX-XXXX"
                  className={`${inputClass} ${errors.telefone ? inputErrorClass : ''}`}
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
                <input
                  id="diretorNome"
                  type="text"
                  value={form.diretorNome}
                  onChange={(e) => updateField('diretorNome', e.target.value)}
                  placeholder="Nome do diretor escolar"
                  className={`${inputClass} ${errors.diretorNome ? inputErrorClass : ''}`}
                />
                {errors.diretorNome && <p className={errorClass}>{errors.diretorNome}</p>}
              </div>

              <div>
                <label htmlFor="diretorCpf" className={labelClass}>
                  CPF *
                </label>
                <input
                  id="diretorCpf"
                  type="text"
                  inputMode="numeric"
                  value={form.diretorCpf}
                  onChange={(e) => updateField('diretorCpf', maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className={`${inputClass} ${errors.diretorCpf ? inputErrorClass : ''}`}
                />
                {errors.diretorCpf && <p className={errorClass}>{errors.diretorCpf}</p>}
              </div>

              <div>
                <label htmlFor="diretorRg" className={labelClass}>
                  RG *
                </label>
                <input
                  id="diretorRg"
                  type="text"
                  inputMode="numeric"
                  value={form.diretorRg}
                  onChange={(e) => updateField('diretorRg', maskRg(e.target.value))}
                  placeholder="Apenas números, máx. 11 dígitos"
                  maxLength={11}
                  className={`${inputClass} ${errors.diretorRg ? inputErrorClass : ''}`}
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
                    <input
                      id="diretorSenha"
                      type="password"
                      value={form.diretorSenha}
                      onChange={(e) => updateField('diretorSenha', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={`${inputClass} ${errors.diretorSenha ? inputErrorClass : ''}`}
                    />
                    {errors.diretorSenha && <p className={errorClass}>{errors.diretorSenha}</p>}
                  </div>
                  <div>
                    <label htmlFor="diretorSenhaConfirm" className={labelClass}>
                      Confirmar Senha *
                    </label>
                    <input
                      id="diretorSenhaConfirm"
                      type="password"
                      value={form.diretorSenhaConfirm ?? ''}
                      onChange={(e) => updateField('diretorSenhaConfirm', e.target.value)}
                      placeholder="Repita a senha"
                      className={`${inputClass} ${errors.diretorSenhaConfirm ? inputErrorClass : ''}`}
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
                <input
                  id="coordenadorNome"
                  type="text"
                  value={form.coordenadorNome}
                  onChange={(e) => updateField('coordenadorNome', e.target.value)}
                  placeholder="Nome do coordenador de esportes"
                  className={`${inputClass} ${errors.coordenadorNome ? inputErrorClass : ''}`}
                />
                {errors.coordenadorNome && <p className={errorClass}>{errors.coordenadorNome}</p>}
              </div>

              <div>
                <label htmlFor="coordenadorCpf" className={labelClass}>
                  CPF *
                </label>
                <input
                  id="coordenadorCpf"
                  type="text"
                  inputMode="numeric"
                  value={form.coordenadorCpf}
                  onChange={(e) => updateField('coordenadorCpf', maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className={`${inputClass} ${errors.coordenadorCpf ? inputErrorClass : ''}`}
                />
                {errors.coordenadorCpf && <p className={errorClass}>{errors.coordenadorCpf}</p>}
              </div>

              <div>
                <label htmlFor="coordenadorRg" className={labelClass}>
                  RG *
                </label>
                <input
                  id="coordenadorRg"
                  type="text"
                  inputMode="numeric"
                  value={form.coordenadorRg}
                  onChange={(e) => updateField('coordenadorRg', maskRg(e.target.value))}
                  placeholder="Apenas números, máx. 11 dígitos"
                  maxLength={11}
                  className={`${inputClass} ${errors.coordenadorRg ? inputErrorClass : ''}`}
                />
                {errors.coordenadorRg && <p className={errorClass}>{errors.coordenadorRg}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="coordenadorEndereco" className={labelClass}>
                  Endereço *
                </label>
                <input
                  id="coordenadorEndereco"
                  type="text"
                  value={form.coordenadorEndereco}
                  onChange={(e) => updateField('coordenadorEndereco', e.target.value)}
                  placeholder="Rua, número, complemento"
                  className={`${inputClass} ${errors.coordenadorEndereco ? inputErrorClass : ''}`}
                />
                {errors.coordenadorEndereco && <p className={errorClass}>{errors.coordenadorEndereco}</p>}
              </div>

              <div>
                <label htmlFor="coordenadorEmail" className={labelClass}>
                  E-mail *
                </label>
                <input
                  id="coordenadorEmail"
                  type="email"
                  value={form.coordenadorEmail}
                  onChange={(e) => updateField('coordenadorEmail', e.target.value)}
                  placeholder="coordenador@email.com"
                  className={`${inputClass} ${errors.coordenadorEmail ? inputErrorClass : ''}`}
                />
                {errors.coordenadorEmail && <p className={errorClass}>{errors.coordenadorEmail}</p>}
              </div>

              <div>
                <label htmlFor="coordenadorTelefone" className={labelClass}>
                  Telefone *
                </label>
                <input
                  id="coordenadorTelefone"
                  type="tel"
                  value={form.coordenadorTelefone}
                  onChange={(e) => updateField('coordenadorTelefone', maskTelefone(e.target.value))}
                  placeholder="(XX) XXXXX-XXXX"
                  className={`${inputClass} ${errors.coordenadorTelefone ? inputErrorClass : ''}`}
                />
                {errors.coordenadorTelefone && <p className={errorClass}>{errors.coordenadorTelefone}</p>}
              </div>
            </div>
          </SectionCard>

          {/* SEÇÃO MODALIDADES */}
          <SectionCard icon={Trophy} title="MODALIDADES">
            <p className="text-sm text-gray-600 mb-4">
              Selecione as modalidades de interesse cruzando Categoria, Naipe e Tipo. Marque pelo menos uma opção.
            </p>
            {errors.modalidades && <p className={`${errorClass} mb-4`}>{errors.modalidades}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Categoria</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Naipe</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Individuais</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Coletivas</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Novas</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIAS.map((cat) =>
                    Object.entries(NAIPES).map(([naipeKey, naipeLabel]) => (
                      <tr key={`${cat}-${naipeKey}`} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-2 font-medium text-gray-800">
                          {cat === '12-14' ? '12 a 14 anos' : '15 a 17 anos'}
                        </td>
                        <td className="py-3 px-2 text-gray-700">{naipeLabel}</td>
                        {TIPOS_MODALIDADE.map((tipo) => (
                          <td key={tipo} className="py-3 px-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.modalidades?.[cat]?.[naipeKey]?.[tipo] ?? false}
                                onChange={(e) => updateModalidade(cat, naipeKey, tipo, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-gray-600 capitalize">{tipo}</span>
                            </label>
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={submitting || formEncerrado}
              className="px-8 py-2.5 rounded-lg bg-primary text-white font-semibold uppercase tracking-wider hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : formEncerrado ? 'Período encerrado' : 'Enviar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
