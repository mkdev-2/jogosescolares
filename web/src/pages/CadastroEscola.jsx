import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, School } from 'lucide-react'
import PublicHeader from '../components/landing/PublicHeader'

const INITIAL_FORM = {
  nomeEscola: '',
  tipoEscola: '',
  endereco: '',
  bairro: '',
  telefone: '',
  email: '',
  nomeGestor: '',
  cargoGestor: '',
  telefoneGestor: '',
  numAlunos: '',
  observacoes: '',
}

function validateForm(form) {
  const err = {}
  if (!form.nomeEscola?.trim() || form.nomeEscola.trim().length < 3) {
    err.nomeEscola = 'Nome da escola deve ter pelo menos 3 caracteres'
  }
  if (!form.tipoEscola) err.tipoEscola = 'Selecione o tipo de escola'
  if (!form.endereco?.trim() || form.endereco.trim().length < 5) {
    err.endereco = 'Endereço deve ter pelo menos 5 caracteres'
  }
  if (!form.bairro?.trim() || form.bairro.trim().length < 2) {
    err.bairro = 'Bairro é obrigatório'
  }
  if (!form.telefone?.trim() || form.telefone.replace(/\D/g, '').length < 8) {
    err.telefone = 'Telefone inválido'
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email?.trim() || !emailRe.test(form.email)) {
    err.email = 'E-mail inválido'
  }
  if (!form.nomeGestor?.trim() || form.nomeGestor.trim().length < 3) {
    err.nomeGestor = 'Nome do gestor deve ter pelo menos 3 caracteres'
  }
  if (!form.cargoGestor?.trim() || form.cargoGestor.trim().length < 2) {
    err.cargoGestor = 'Cargo é obrigatório'
  }
  if (!form.telefoneGestor?.trim() || form.telefoneGestor.replace(/\D/g, '').length < 8) {
    err.telefoneGestor = 'Telefone inválido'
  }
  if (!form.numAlunos?.trim()) err.numAlunos = 'Informe o número de alunos'
  return err
}

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50'
const inputErrorClass = 'border-red-500 focus:ring-red-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
const errorClass = 'text-red-600 text-sm mt-1'

export default function CadastroEscola() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setSuccess(true)
    setForm(INITIAL_FORM)
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
        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <School className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-gray-900">Dados da Escola</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="nomeEscola" className={labelClass}>
                  Nome da Escola *
                </label>
                <input
                  id="nomeEscola"
                  type="text"
                  value={form.nomeEscola}
                  onChange={(e) => updateField('nomeEscola', e.target.value)}
                  placeholder="Ex: Escola Municipal João da Silva"
                  className={`${inputClass} ${errors.nomeEscola ? inputErrorClass : ''}`}
                />
                {errors.nomeEscola && <p className={errorClass}>{errors.nomeEscola}</p>}
              </div>

              <div>
                <label htmlFor="tipoEscola" className={labelClass}>
                  Tipo de Escola *
                </label>
                <select
                  id="tipoEscola"
                  value={form.tipoEscola}
                  onChange={(e) => updateField('tipoEscola', e.target.value)}
                  className={`${inputClass} ${errors.tipoEscola ? inputErrorClass : ''}`}
                >
                  <option value="">Selecione</option>
                  <option value="municipal">Municipal</option>
                  <option value="estadual">Estadual</option>
                  <option value="particular">Particular</option>
                </select>
                {errors.tipoEscola && <p className={errorClass}>{errors.tipoEscola}</p>}
              </div>

              <div>
                <label htmlFor="numAlunos" className={labelClass}>
                  Nº de Alunos Participantes *
                </label>
                <input
                  id="numAlunos"
                  type="number"
                  min="1"
                  value={form.numAlunos}
                  onChange={(e) => updateField('numAlunos', e.target.value)}
                  placeholder="Ex: 50"
                  className={`${inputClass} ${errors.numAlunos ? inputErrorClass : ''}`}
                />
                {errors.numAlunos && <p className={errorClass}>{errors.numAlunos}</p>}
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
                <label htmlFor="bairro" className={labelClass}>
                  Bairro *
                </label>
                <input
                  id="bairro"
                  type="text"
                  value={form.bairro}
                  onChange={(e) => updateField('bairro', e.target.value)}
                  placeholder="Bairro"
                  className={`${inputClass} ${errors.bairro ? inputErrorClass : ''}`}
                />
                {errors.bairro && <p className={errorClass}>{errors.bairro}</p>}
              </div>

              <div>
                <label htmlFor="telefone" className={labelClass}>
                  Telefone da Escola *
                </label>
                <input
                  id="telefone"
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => updateField('telefone', e.target.value)}
                  placeholder="(XX) XXXX-XXXX"
                  className={`${inputClass} ${errors.telefone ? inputErrorClass : ''}`}
                />
                {errors.telefone && <p className={errorClass}>{errors.telefone}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="email" className={labelClass}>
                  E-mail da Escola *
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
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
              Dados do Responsável
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="nomeGestor" className={labelClass}>
                  Nome Completo *
                </label>
                <input
                  id="nomeGestor"
                  type="text"
                  value={form.nomeGestor}
                  onChange={(e) => updateField('nomeGestor', e.target.value)}
                  placeholder="Nome do diretor ou responsável"
                  className={`${inputClass} ${errors.nomeGestor ? inputErrorClass : ''}`}
                />
                {errors.nomeGestor && <p className={errorClass}>{errors.nomeGestor}</p>}
              </div>

              <div>
                <label htmlFor="cargoGestor" className={labelClass}>
                  Cargo *
                </label>
                <input
                  id="cargoGestor"
                  type="text"
                  value={form.cargoGestor}
                  onChange={(e) => updateField('cargoGestor', e.target.value)}
                  placeholder="Ex: Diretor(a)"
                  className={`${inputClass} ${errors.cargoGestor ? inputErrorClass : ''}`}
                />
                {errors.cargoGestor && <p className={errorClass}>{errors.cargoGestor}</p>}
              </div>

              <div>
                <label htmlFor="telefoneGestor" className={labelClass}>
                  Telefone do Responsável *
                </label>
                <input
                  id="telefoneGestor"
                  type="tel"
                  value={form.telefoneGestor}
                  onChange={(e) => updateField('telefoneGestor', e.target.value)}
                  placeholder="(XX) XXXXX-XXXX"
                  className={`${inputClass} ${errors.telefoneGestor ? inputErrorClass : ''}`}
                />
                {errors.telefoneGestor && <p className={errorClass}>{errors.telefoneGestor}</p>}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="observacoes" className={labelClass}>
              Observações
            </label>
            <textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => updateField('observacoes', e.target.value)}
              placeholder="Informações adicionais, modalidades de interesse, etc."
              rows={4}
              className={`${inputClass} ${errors.observacoes ? inputErrorClass : ''}`}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Voltar
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-lg bg-primary text-white font-semibold uppercase tracking-wider hover:bg-primary/90 transition"
            >
              Enviar Cadastro
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
