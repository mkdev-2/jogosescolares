import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Input, Select, Button } from 'antd'
import { ArrowLeft, CheckCircle, Upload, X, FileText, Camera } from 'lucide-react'
import PublicHeader from '../components/landing/PublicHeader'
import { staffService } from '../services/staffService'
import { uploadFotoStaff, uploadDocumentoStaff } from '../services/storageService'

function isValidCpf(cpf) {
  const d = (cpf || '').replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i)
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0
  if (d1 !== parseInt(d[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i)
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0
  return d2 === parseInt(d[10])
}

function formatCpf(value) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function DocField({ label, accept, value, onChange, error }) {
  const ref = useRef(null)
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {/* style display:none é mais confiável que className="hidden" fora do Tailwind base layer */}
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <div
        onClick={() => ref.current?.click()}
        className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-primary/60 hover:bg-primary/5'}`}
      >
        {value ? (
          <>
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1">{value.name}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null) }}
              className="p-1 hover:bg-red-100 rounded-md transition-colors">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-400">Clique para selecionar — PDF, JPG, PNG (máx. 10 MB)</span>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

const INITIAL = { nome: '', cpf: '', cargo_id: null }

export default function CadastroStaff() {
  const [form, setForm] = useState(INITIAL)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [docFile, setDocFile] = useState(null)
  const [cargos, setCargos] = useState([])
  const [loadingCargos, setLoadingCargos] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [sucesso, setSucesso] = useState(false)
  const fotoInputRef = useRef(null)

  useEffect(() => {
    staffService.listarCargosPublicos()
      .then(setCargos)
      .catch(() => setCargos([]))
      .finally(() => setLoadingCargos(false))
  }, [])

  useEffect(() => {
    if (!fotoFile) { setFotoPreview(null); return }
    const url = URL.createObjectURL(fotoFile)
    setFotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [fotoFile])

  function validate() {
    const errs = {}
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório.'
    const d = form.cpf.replace(/\D/g, '')
    if (!d) errs.cpf = 'CPF é obrigatório.'
    else if (!isValidCpf(d)) errs.cpf = 'CPF inválido.'
    if (!form.cargo_id) errs.cargo_id = 'Selecione um cargo.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitting(true)
    try {
      const foto_url = fotoFile ? await uploadFotoStaff(fotoFile) : null
      const documento_url = docFile ? await uploadDocumentoStaff(docFile) : null
      await staffService.cadastrar({
        nome: form.nome.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        cargo_id: form.cargo_id,
        foto_url,
        documento_url,
      })
      setSucesso(true)
    } catch (err) {
      setErrors({ geral: err.message || 'Erro ao enviar cadastro. Tente novamente.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro realizado!</h2>
            <p className="text-gray-600">
              Seus dados foram registrados com sucesso. Você receberá sua credencial de acesso no credenciamento do evento.
            </p>
          </div>
          <Link to="/" className="text-primary font-semibold hover:underline text-sm">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cadastro de Staff</h1>
          <p className="mt-1 text-gray-500 text-sm">
            Preencha o formulário para receber sua credencial de acesso ao evento.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col gap-5">

          {/* Foto + Nome lado a lado */}
          <div className="flex gap-5 items-start">
            {/* Foto */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => setFotoFile(e.target.files?.[0] || null)} />
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
                className="w-28 h-28 rounded-full border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center overflow-hidden hover:border-[#0f766e] hover:bg-[#f0fdfa] transition-colors relative group"
              >
                {fotoPreview ? (
                  <>
                    <img src={fotoPreview} alt="Prévia da foto" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <Camera className="w-10 h-10 text-[#94a3b8]" />
                )}
              </button>
              <p className="text-xs text-gray-400 text-center w-28 leading-tight">
                {fotoPreview ? 'Clique para alterar' : 'Foto para o crachá'}
              </p>
              {errors.foto && <p className="text-xs text-red-600 text-center">{errors.foto}</p>}
            </div>

            {/* Nome */}
            <div className="flex-1 pt-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nome completo <span className="text-red-500">*</span>
              </label>
              <Input
                size="large"
                placeholder="Digite seu nome completo"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                status={errors.nome ? 'error' : ''}
              />
              {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome}</p>}
            </div>
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              CPF <span className="text-red-500">*</span>
            </label>
            <Input
              size="large"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => setForm((f) => ({ ...f, cpf: formatCpf(e.target.value) }))}
              status={errors.cpf ? 'error' : ''}
              maxLength={14}
            />
            {errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf}</p>}
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Cargo <span className="text-red-500">*</span>
            </label>
            <Select
              size="large"
              className="w-full"
              placeholder={loadingCargos ? 'Carregando...' : 'Selecione seu cargo'}
              loading={loadingCargos}
              value={form.cargo_id}
              onChange={(val) => setForm((f) => ({ ...f, cargo_id: val }))}
              status={errors.cargo_id ? 'error' : ''}
              options={cargos.map((c) => ({ value: c.id, label: c.nome }))}
            />
            {errors.cargo_id && <p className="mt-1 text-xs text-red-600">{errors.cargo_id}</p>}
          </div>

          {/* Documento */}
          <DocField
            label="Documento (RG ou CNH)"
            accept=".pdf,image/*"
            value={docFile}
            onChange={setDocFile}
            error={errors.documento}
          />

          {errors.geral && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errors.geral}
            </div>
          )}

          <Button type="primary" htmlType="submit" size="large" loading={submitting} className="w-full mt-2">
            Enviar cadastro
          </Button>
        </form>
      </div>
    </div>
  )
}
