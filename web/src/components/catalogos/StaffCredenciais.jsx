import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Table, Tag, Button, Modal, Input, InputNumber, Select, Space, Typography, Popconfirm,
  Form, Divider, Avatar, message, Tooltip, Checkbox,
} from 'antd'
import { Plus, Settings2, User, FileText, X, Upload, Trash2, Pencil, Check, Camera, IdCard, Medal, Printer, Search, Layers } from 'lucide-react'
import { staffService } from '../../services/staffService'
import { uploadFotoStaff, uploadDocumentoStaff, getStorageUrl } from '../../services/storageService'
import { configuracoesService } from '../../services/configuracoesService'
import StorageImage from '../StorageImage'

const { Text } = Typography

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatCpf(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function maskCpf(cpf) {
  const d = String(cpf || '').replace(/\D/g, '')
  if (d.length !== 11) return cpf || '-'
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

// ── Credencial de Staff (modelo Vira e Cola — mesmo padrão dos alunos) ────────

const PX_TO_MM = 3.2

// Posições padrão idênticas ao PrintableFoldedCredential dos alunos
const DEFAULT_POS = {
  foto:  { x: 32 * PX_TO_MM, y: 17 * PX_TO_MM, size: 36 * PX_TO_MM },
  logos: { x: 25 * PX_TO_MM, y: 56 * PX_TO_MM, w: 50 * PX_TO_MM, h: 10 * PX_TO_MM },
  nome:  { x: 0,              y: 78 * PX_TO_MM, fontSize: 24 },
  info:  { x: 0,              y: 92 * PX_TO_MM, fontSize: 13 },
}

const MASS_PRINT_CSS = `
  @page { margin: 0; size: A4 landscape; }
  @media print {
    body > *:not([data-mass-cracha]) { display: none !important; }
    [data-mass-cracha] { display: block !important; }
    .mass-print-page {
      display: flex !important;
      width: 297mm; height: 210mm;
      align-items: center; justify-content: center;
      page-break-after: always; break-after: page;
      page-break-inside: avoid; break-inside: avoid;
    }
  }
`

const PRINT_CSS = `
  @page { margin: 0; size: A4 landscape; }
  @media print {
    body * { visibility: hidden; }
    [data-staff-cracha], [data-staff-cracha] * { visibility: visible; }
    [data-staff-cracha] {
      position: absolute !important;
      left: 48mm !important;
      top: 30mm !important;
      width: 200mm !important;
      height: 150mm !important;
      padding: 0 !important; margin: 0 !important;
      box-sizing: border-box; background: white; overflow: hidden;
    }
    .no-print { display: none !important; }
  }
`

function formatNome(nome) {
  if (!nome) return '–'
  const parts = nome.trim().split(/\s+/)
  if (parts.length <= 2) return nome.trim()
  return [parts[0], ...parts.slice(1, -1).map((p) => `${p[0]}.`), parts[parts.length - 1]].join(' ')
}

function PrintableStaffCard({ membro, cfg: cfgProp }) {
  const [cfgLocal, setCfgLocal] = useState(null)

  useEffect(() => {
    if (cfgProp === undefined) {
      configuracoesService.get().then(setCfgLocal).catch(() => {})
    }
  }, [cfgProp])

  const cfg = cfgProp !== undefined ? cfgProp : cfgLocal

  let posData = {}
  try { posData = typeof cfg?.layout_credencial === 'string' ? JSON.parse(cfg.layout_credencial) : (cfg?.layout_credencial || {}) }
  catch { posData = {} }

  const p = {
    foto:  { x: (posData.foto?.x  ?? 32) * PX_TO_MM, y: (posData.foto?.y  ?? 17) * PX_TO_MM, size: (posData.foto?.size ?? 36) * PX_TO_MM },
    logos: { x: (posData.logos?.x ?? 25) * PX_TO_MM, y: (posData.logos?.y ?? 56) * PX_TO_MM, w: (posData.logos?.w ?? 50) * PX_TO_MM, h: (posData.logos?.h ?? 10) * PX_TO_MM },
    nome:  { x: (posData.nome?.x  ??  0) * PX_TO_MM, y: (posData.nome?.y  ?? 78) * PX_TO_MM, fontSize: posData.nome?.fontSize ?? 24 },
    info:  { x: (posData.info?.x  ??  0) * PX_TO_MM, y: (posData.info?.y  ?? 92) * PX_TO_MM, fontSize: posData.info?.fontSize ?? 13 },
  }

  return (
    <div
      data-staff-cracha
      style={{ width: '640px', height: '480px', display: 'flex', backgroundColor: '#fff', fontVariantLigatures: 'none' }}
    >
      {/* LADO ESQUERDO: VERSO */}
      <div style={{ width: '320px', height: '480px', position: 'relative', borderRight: '1px dashed #e2e8f0', backgroundColor: '#f8fafc' }}>
        {cfg?.bg_verso_credencial ? (
          <StorageImage path={cfg.bg_verso_credencial} className="w-full h-full object-cover" alt="verso" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-20">
            <Medal size={80} className="text-[#0f766e]" />
            <p className="text-xl font-black mt-4 uppercase">Verso</p>
          </div>
        )}
      </div>

      {/* LADO DIREITO: FRENTE */}
      <div style={{ width: '320px', height: '480px', position: 'relative', backgroundColor: '#f8fafc' }}>
        {/* Background */}
        {cfg?.bg_credencial ? (
          <div className="absolute inset-0">
            <StorageImage path={cfg.bg_credencial} className="w-full h-full object-cover" alt="frente" />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col">
            <div className="h-[10.7%] bg-[#0f766e] flex items-center justify-center">
              <Medal className="text-white opacity-40" size={36} />
            </div>
            <div className="flex-1 bg-white" />
            <div className="h-[1.3%] bg-[#0f766e]" />
          </div>
        )}

        {/* Foto */}
        <div className="absolute" style={{ left: p.foto.x, top: p.foto.y }}>
          <div
            className="rounded-full border-[5px] border-[#3b82f6] bg-white flex items-center justify-center overflow-hidden shadow-lg"
            style={{ width: p.foto.size, height: p.foto.size }}
          >
            {membro?.foto_url
              ? <StorageImage path={membro.foto_url} alt={membro.nome} className="w-full h-full object-cover" />
              : <User size={p.foto.size * 0.5} className="text-slate-200" />}
          </div>
        </div>

        {/* Logos */}
        <div className="absolute flex items-center justify-center" style={{ left: p.logos.x, top: p.logos.y, width: p.logos.w, height: p.logos.h }}>
          <div className="w-full h-full flex items-center justify-center px-3 py-1 rounded bg-white/40 backdrop-blur-sm">
            {cfg?.logo_jels && <StorageImage path={cfg.logo_jels} className="max-w-full max-h-full object-contain" alt="logo" />}
          </div>
        </div>

        {/* Nome */}
        <div className="absolute w-full" style={{ left: p.nome.x, top: p.nome.y }}>
          <div
            className="font-black leading-none text-white drop-shadow-md uppercase text-center p-2"
            style={{ fontSize: p.nome.fontSize, fontFamily: "'Sora', sans-serif" }}
          >
            {formatNome(membro?.nome).toUpperCase()}
          </div>
        </div>

        {/* Cargo (no lugar da info escola/data dos alunos) */}
        <div className="absolute w-full" style={{ left: p.info.x, top: p.info.y }}>
          <div
            className="text-white drop-shadow-md text-center px-2"
            style={{ fontFamily: "'Lato', sans-serif" }}
          >
            <div
              className="font-black"
              style={{ fontSize: Math.max(p.info.fontSize + 3, 17) }}
            >
              {membro?.cargo_nome || '–'}
            </div>
          </div>
        </div>

        {/* Badge STAFF em vermelho — rodapé do crachá */}
        <div className="absolute flex justify-center" style={{ bottom: '18px', left: 0, right: 0 }}>
          <div
            style={{
              backgroundColor: '#dc2626',
              color: '#fff',
              fontFamily: "'Sora', sans-serif",
              fontWeight: 900,
              fontSize: '10px',
              letterSpacing: '4px',
              padding: '3px 14px',
              borderRadius: '4px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            }}
          >
            STAFF
          </div>
        </div>

        {/* Faixa de cores inferior (mesmo padrão dos alunos) */}
        <div className="absolute bottom-0 left-0 right-0 h-3 flex">
          {['#fac20a', '#2563eb', '#16a34a', '#dc2626', '#f97316'].map((c) => (
            <div key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ModalCredencialStaff({ membro, onClose }) {
  return (
    <Modal
      open={!!membro}
      title={
        <span className="flex items-center gap-2">
          <IdCard className="w-4 h-4 text-[#0f766e]" />
          Credencial — {membro?.nome}
        </span>
      }
      onCancel={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Fechar</Button>
          <Button type="primary" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            Imprimir / Exportar PDF
          </Button>
        </div>
      }
      width={700}
      destroyOnClose
    >
      <style>{PRINT_CSS}</style>
      <div className="overflow-x-auto">
        {membro && <PrintableStaffCard membro={membro} />}
      </div>
    </Modal>
  )
}

// ── DocField: campo de upload de documento sem input nativo visível ───────────

function DocField({ label, accept, value, onChange, error }) {
  const ref = useRef(null)
  return (
    <Form.Item label={label} validateStatus={error ? 'error' : ''} help={error}>
      {/* style display:none é mais confiável que className="hidden" dentro do Form.Item do Ant Design */}
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <div
        onClick={() => ref.current?.click()}
        className={`flex items-center gap-2 border-2 border-dashed rounded-lg px-3 py-2.5 cursor-pointer transition-colors
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-[#0f766e]/60 hover:bg-[#f0fdfa]'}`}
      >
        {value ? (
          <>
            <FileText className="w-4 h-4 text-[#0f766e] shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1">{value.name}</span>
            <button type="button" className="p-0.5 hover:bg-red-100 rounded"
              onClick={(e) => { e.stopPropagation(); onChange(null) }}>
              <X className="w-3.5 h-3.5 text-red-500" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400">PDF, JPG, PNG — máx. 10 MB</span>
          </>
        )}
      </div>
    </Form.Item>
  )
}

// ── Modal de cadastro manual ──────────────────────────────────────────────────

function ModalCadastroStaff({ open, onClose, onSaved, cargos }) {
  const [form, setForm] = useState({ nome: '', cpf: '', cargo_id: null })
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [docFile, setDocFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const fotoInputRef = useRef(null)

  useEffect(() => {
    if (!fotoFile) { setFotoPreview(null); return }
    const url = URL.createObjectURL(fotoFile)
    setFotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [fotoFile])

  function reset() {
    setForm({ nome: '', cpf: '', cargo_id: null })
    setFotoFile(null)
    setFotoPreview(null)
    setDocFile(null)
    setErrors({})
  }

  function validate() {
    const errs = {}
    if (!form.nome.trim()) errs.nome = 'Obrigatório'
    const d = form.cpf.replace(/\D/g, '')
    if (!d) errs.cpf = 'Obrigatório'
    else if (!isValidCpf(d)) errs.cpf = 'CPF inválido'
    if (!form.cargo_id) errs.cargo_id = 'Obrigatório'
    return errs
  }

  async function handleOk() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
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
      message.success('Staff cadastrado com sucesso.')
      reset()
      onSaved()
      onClose()
    } catch (err) {
      message.error(err.message || 'Erro ao cadastrar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Cadastrar Staff"
      onCancel={() => { reset(); onClose() }}
      onOk={handleOk}
      okText="Cadastrar"
      cancelText="Cancelar"
      confirmLoading={saving}
      destroyOnClose
    >
      <Form layout="vertical" className="mt-3">
        {/* Foto + Nome lado a lado */}
        <div className="flex gap-4 items-start mb-4">
          {/* Foto */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => setFotoFile(e.target.files?.[0] || null)} />
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center overflow-hidden hover:border-[#0f766e] hover:bg-[#f0fdfa] transition-colors relative group"
            >
              {fotoPreview ? (
                <>
                  <img src={fotoPreview} alt="Prévia" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <Camera className="w-8 h-8 text-[#94a3b8]" />
              )}
            </button>
            <p className="text-xs text-[#94a3b8] text-center w-24 leading-tight m-0">
              {fotoPreview ? 'Clique para alterar' : 'Foto do crachá'}
            </p>
          </div>

          {/* Nome */}
          <div className="flex-1">
            <Form.Item label="Nome completo" required validateStatus={errors.nome ? 'error' : ''} help={errors.nome} style={{ marginBottom: 0 }}>
              <Input
                size="large"
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </Form.Item>
          </div>
        </div>

        <Form.Item label="CPF" required validateStatus={errors.cpf ? 'error' : ''} help={errors.cpf}>
          <Input
            size="large"
            placeholder="000.000.000-00"
            maxLength={14}
            value={form.cpf}
            onChange={(e) => setForm((f) => ({ ...f, cpf: formatCpf(e.target.value) }))}
          />
        </Form.Item>

        <Form.Item label="Cargo" required validateStatus={errors.cargo_id ? 'error' : ''} help={errors.cargo_id}>
          <Select
            size="large"
            className="w-full"
            placeholder="Selecione o cargo"
            value={form.cargo_id}
            onChange={(val) => setForm((f) => ({ ...f, cargo_id: val }))}
            options={cargos.map((c) => ({ value: c.id, label: c.nome }))}
          />
        </Form.Item>

        <DocField
          label="Documento (RG ou CNH)"
          accept=".pdf,image/*"
          value={docFile}
          onChange={setDocFile}
          error={errors.documento}
        />
      </Form>
    </Modal>
  )
}

// ── Campo de doc para edição (existente + opção de substituir) ────────────────

function DocFieldEdit({ existingUrl, newFile, onNewFile, onClear, error }) {
  const ref = useRef(null)
  if (existingUrl && !newFile) {
    return (
      <Form.Item label="Documento (RG ou CNH)" validateStatus={error ? 'error' : ''} help={error}>
        <input ref={ref} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
          onChange={(e) => onNewFile(e.target.files?.[0] || null)} />
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
          <FileText className="w-4 h-4 text-[#0f766e] shrink-0" />
          <a href={existingUrl} target="_blank" rel="noreferrer"
            className="text-sm text-[#0f766e] hover:underline flex-1 truncate">
            Documento atual
          </a>
          <button type="button" className="text-xs text-gray-500 hover:text-gray-800 shrink-0 transition-colors"
            onClick={() => ref.current?.click()}>
            Substituir
          </button>
          <button type="button" className="p-0.5 hover:bg-red-100 rounded transition-colors"
            onClick={onClear}>
            <X className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </Form.Item>
    )
  }
  return (
    <DocField
      label="Documento (RG ou CNH)"
      accept=".pdf,image/*"
      value={newFile}
      onChange={onNewFile}
      error={error}
    />
  )
}

// ── Modal de edição de membro ─────────────────────────────────────────────────

function ModalEditarStaff({ membro, onClose, onSaved, cargos }) {
  const [form, setForm] = useState({ nome: '', cpf: '', cargo_id: null })
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [clearFoto, setClearFoto] = useState(false)
  const [docFile, setDocFile] = useState(null)
  const [clearDoc, setClearDoc] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const fotoInputRef = useRef(null)

  useEffect(() => {
    if (membro) {
      setForm({ nome: membro.nome || '', cpf: maskCpf(membro.cpf) || '', cargo_id: membro.cargo_id || null })
      setFotoFile(null); setFotoPreview(null); setClearFoto(false)
      setDocFile(null); setClearDoc(false); setErrors({})
    }
  }, [membro])

  useEffect(() => {
    if (!fotoFile) { setFotoPreview(null); return }
    const url = URL.createObjectURL(fotoFile)
    setFotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [fotoFile])

  const currentFotoSrc = fotoPreview || (!clearFoto && membro?.foto_url ? getStorageUrl(membro.foto_url) : null)

  function validate() {
    const errs = {}
    if (!form.nome.trim()) errs.nome = 'Obrigatório'
    const d = form.cpf.replace(/\D/g, '')
    if (!d) errs.cpf = 'Obrigatório'
    else if (!isValidCpf(d)) errs.cpf = 'CPF inválido'
    if (!form.cargo_id) errs.cargo_id = 'Obrigatório'
    return errs
  }

  async function handleOk() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      const foto_url = fotoFile ? await uploadFotoStaff(fotoFile) : clearFoto ? null : (membro.foto_url || null)
      const documento_url = docFile ? await uploadDocumentoStaff(docFile) : clearDoc ? null : (membro.documento_url || null)
      await staffService.atualizar(membro.id, {
        nome: form.nome.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        cargo_id: form.cargo_id,
        foto_url,
        documento_url,
      })
      message.success('Staff atualizado com sucesso.')
      onSaved()
      onClose()
    } catch (err) {
      message.error(err.message || 'Erro ao atualizar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!membro}
      title="Editar Staff"
      onCancel={onClose}
      onOk={handleOk}
      okText="Salvar alterações"
      cancelText="Cancelar"
      confirmLoading={saving}
      destroyOnClose
    >
      <Form layout="vertical" className="mt-3">
        <div className="flex gap-4 items-start mb-4">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { setFotoFile(e.target.files?.[0] || null); setClearFoto(false) }} />
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center overflow-hidden hover:border-[#0f766e] hover:bg-[#f0fdfa] transition-colors relative group"
            >
              {currentFotoSrc ? (
                <>
                  <img src={currentFotoSrc} alt="Foto" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <Camera className="w-8 h-8 text-[#94a3b8]" />
              )}
            </button>
            <p className="text-xs text-[#94a3b8] text-center w-24 leading-tight m-0">
              {currentFotoSrc ? 'Clique para alterar' : 'Foto do crachá'}
            </p>
            {currentFotoSrc && (
              <button type="button" className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
                onClick={() => { setFotoFile(null); setClearFoto(true) }}>
                Remover foto
              </button>
            )}
          </div>
          <div className="flex-1">
            <Form.Item label="Nome completo" required validateStatus={errors.nome ? 'error' : ''} help={errors.nome} style={{ marginBottom: 0 }}>
              <Input size="large" placeholder="Nome completo" value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </Form.Item>
          </div>
        </div>

        <Form.Item label="CPF" required validateStatus={errors.cpf ? 'error' : ''} help={errors.cpf}>
          <Input size="large" placeholder="000.000.000-00" maxLength={14} value={form.cpf}
            onChange={(e) => setForm((f) => ({ ...f, cpf: formatCpf(e.target.value) }))} />
        </Form.Item>

        <Form.Item label="Cargo" required validateStatus={errors.cargo_id ? 'error' : ''} help={errors.cargo_id}>
          <Select size="large" className="w-full" placeholder="Selecione o cargo"
            value={form.cargo_id}
            onChange={(val) => setForm((f) => ({ ...f, cargo_id: val }))}
            options={cargos.map((c) => ({ value: c.id, label: c.nome }))} />
        </Form.Item>

        <DocFieldEdit
          existingUrl={membro?.documento_url ? getStorageUrl(membro.documento_url) : null}
          newFile={docFile}
          onNewFile={setDocFile}
          onClear={() => { setDocFile(null); setClearDoc(true) }}
          error={errors.documento}
        />
      </Form>
    </Modal>
  )
}

// ── Modal de credenciais em massa ─────────────────────────────────────────────

function ModalCredenciaisEmMassa({ open, onClose, allStaff }) {
  const [busca, setBusca] = useState('')
  const [selecionados, setSelecionados] = useState(new Set())
  const [cfg, setCfg] = useState(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (open) {
      setSelecionados(new Set(allStaff.map((s) => s.id)))
      setBusca('')
      configuracoesService.get().then(setCfg).catch(() => {})
    }
  }, [open, allStaff])

  const filtrados = useMemo(
    () => allStaff.filter((s) => s.nome.toLowerCase().includes(busca.toLowerCase())),
    [allStaff, busca],
  )

  const todosFiltradosSelecionados = filtrados.length > 0 && filtrados.every((s) => selecionados.has(s.id))
  const algumFiltradoSelecionado = filtrados.some((s) => selecionados.has(s.id))
  const contVisiveis = filtrados.filter((s) => selecionados.has(s.id)).length

  function toggleFiltrados() {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (todosFiltradosSelecionados) filtrados.forEach((s) => next.delete(s.id))
      else filtrados.forEach((s) => next.add(s.id))
      return next
    })
  }

  function toggle(id) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const staffParaImprimir = allStaff.filter((s) => selecionados.has(s.id))

  function handleImprimir() {
    setPrinting(true)
    setTimeout(() => { window.print(); setPrinting(false) }, 200)
  }

  return (
    <>
      {/* Container renderizado direto no <body> via portal — necessário para paginação correta no print */}
      {createPortal(
        <>
          <style>{MASS_PRINT_CSS}</style>
          <div data-mass-cracha style={{ display: 'none' }}>
            {staffParaImprimir.map((m) => (
              <div key={m.id} className="mass-print-page">
                <PrintableStaffCard membro={m} cfg={cfg} />
              </div>
            ))}
          </div>
        </>,
        document.body,
      )}

      <Modal
        open={open}
        title={
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0f766e]" />
            Gerar credenciais em massa
          </span>
        }
        onCancel={onClose}
        footer={
          <div className="flex justify-between items-center">
            <Text type="secondary" className="text-sm">
              {selecionados.size} de {allStaff.length} selecionado(s)
            </Text>
            <Space>
              <Button onClick={onClose}>Cancelar</Button>
              <Button
                type="primary"
                icon={<Printer className="w-4 h-4" />}
                onClick={handleImprimir}
                loading={printing}
                disabled={selecionados.size === 0}
              >
                Imprimir / PDF
              </Button>
            </Space>
          </div>
        }
        width={460}
        destroyOnClose={false}
      >
      <div className="flex flex-col gap-3 mt-1">
        <Input
          prefix={<Search className="w-4 h-4 text-gray-400" />}
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          allowClear
        />

        <div className="flex items-center gap-2 px-1 pb-2 border-b border-gray-100">
          <Checkbox
            checked={todosFiltradosSelecionados}
            indeterminate={algumFiltradoSelecionado && !todosFiltradosSelecionados}
            onChange={toggleFiltrados}
          />
          <Text className="text-sm text-gray-600">
            Selecionar todos ({contVisiveis}/{filtrados.length})
          </Text>
        </div>

        <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1">
          {filtrados.length === 0 ? (
            <div className="text-center text-gray-400 py-6 text-sm">Nenhum resultado.</div>
          ) : (
            filtrados.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <Checkbox checked={selecionados.has(m.id)} onChange={() => toggle(m.id)} />
                <Avatar
                  src={m.foto_url ? getStorageUrl(m.foto_url) : undefined}
                  icon={!m.foto_url ? <User className="w-4 h-4" /> : undefined}
                  size={32}
                  className="shrink-0 bg-gray-200 text-gray-400"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800 truncate">{m.nome}</div>
                  <div className="text-xs text-gray-400">{m.cargo_nome}</div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>
    </Modal>
    </>
  )
}

// ── Modal de gerenciamento de cargos ─────────────────────────────────────────

function ModalCargos({ open, onClose }) {
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoLimite, setNovoLimite] = useState(null)
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [editandoNome, setEditandoNome] = useState('')
  const [editandoLimite, setEditandoLimite] = useState(null)

  async function carregar() {
    setLoading(true)
    try { setCargos(await staffService.listarCargos()) }
    catch { message.error('Erro ao carregar cargos.') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (open) carregar() }, [open])

  async function criarCargo() {
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      await staffService.criarCargo({ nome: novoNome.trim(), limite: novoLimite || null })
      setNovoNome(''); setNovoLimite(null)
      await carregar()
    } catch (err) {
      message.error(err.message || 'Erro ao criar cargo.')
    } finally { setCriando(false) }
  }

  async function salvarEdicao(id) {
    if (!editandoNome.trim()) return
    try {
      await staffService.atualizarCargo(id, { nome: editandoNome.trim(), limite: editandoLimite || null })
      setEditandoId(null)
      await carregar()
    } catch (err) { message.error(err.message || 'Erro ao salvar.') }
  }

  async function toggleAtivo(cargo) {
    try {
      await staffService.atualizarCargo(cargo.id, { ativo: !cargo.ativo })
      await carregar()
    } catch (err) { message.error(err.message || 'Erro ao atualizar.') }
  }

  async function deletar(id) {
    try {
      await staffService.deletarCargo(id)
      await carregar()
    } catch (err) { message.error(err.message || 'Não é possível remover cargo com staff vinculado.') }
  }

  return (
    <Modal
      open={open}
      title="Gerenciar Cargos de Staff"
      onCancel={onClose}
      footer={<Button onClick={onClose}>Fechar</Button>}
      width={580}
      destroyOnClose
    >
      <div className="mt-4 flex flex-col gap-4">
        {/* Criar novo */}
        <div className="flex gap-2">
          <Input
            placeholder="Nome do cargo (ex: Árbitro)"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onPressEnter={criarCargo}
            maxLength={100}
          />
          <InputNumber
            placeholder="Limite"
            min={1}
            value={novoLimite}
            onChange={setNovoLimite}
            style={{ width: 110 }}
          />
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            loading={criando}
            onClick={criarCargo}
            disabled={!novoNome.trim()}
          >
            Criar
          </Button>
        </div>
        <p className="text-xs text-gray-400 -mt-2">Limite de vagas é opcional. Deixe em branco para vagas ilimitadas.</p>

        <Divider className="my-0" />

        {/* Lista */}
        <Table
          dataSource={cargos}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Cargo',
              dataIndex: 'nome',
              render: (nome, row) =>
                editandoId === row.id ? (
                  <Input
                    size="small"
                    value={editandoNome}
                    onChange={(e) => setEditandoNome(e.target.value)}
                    onPressEnter={() => salvarEdicao(row.id)}
                    autoFocus
                  />
                ) : (
                  <Text>{nome}</Text>
                ),
            },
            {
              title: 'Vagas',
              key: 'vagas',
              width: 120,
              render: (_, row) => {
                const esgotado = row.limite !== null && row.total_cadastrados >= row.limite
                if (editandoId === row.id) {
                  return (
                    <InputNumber
                      size="small"
                      placeholder="Sem limite"
                      min={1}
                      value={editandoLimite}
                      onChange={setEditandoLimite}
                      style={{ width: 100 }}
                    />
                  )
                }
                return row.limite !== null ? (
                  <Text className={`text-sm font-mono ${esgotado ? 'text-red-500 font-semibold' : ''}`}>
                    {row.total_cadastrados} / {row.limite}
                    {esgotado && <span className="ml-1 text-[11px]">(esgotado)</span>}
                  </Text>
                ) : (
                  <Text className="text-sm font-mono text-gray-500">{row.total_cadastrados} / ∞</Text>
                )
              },
            },
            {
              title: 'Status',
              dataIndex: 'ativo',
              width: 80,
              render: (ativo) => (
                <Tag color={ativo ? 'green' : 'default'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
              ),
            },
            {
              title: '',
              key: 'acoes',
              width: 110,
              render: (_, row) => (
                <Space size={4}>
                  {editandoId === row.id ? (
                    <>
                      <Tooltip title="Salvar">
                        <Button size="small" type="primary" icon={<Check className="w-3.5 h-3.5" />} onClick={() => salvarEdicao(row.id)} />
                      </Tooltip>
                      <Tooltip title="Cancelar">
                        <Button size="small" icon={<X className="w-3.5 h-3.5" />} onClick={() => setEditandoId(null)} />
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Editar">
                        <Button size="small" icon={<Pencil className="w-3.5 h-3.5" />}
                          onClick={() => { setEditandoId(row.id); setEditandoNome(row.nome); setEditandoLimite(row.limite) }} />
                      </Tooltip>
                      <Popconfirm
                        title="Remover cargo?"
                        description="Só é possível se não houver staff vinculado."
                        onConfirm={() => deletar(row.id)}
                        okText="Remover"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Remover">
                          <Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
                        </Tooltip>
                      </Popconfirm>
                    </>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function StaffCredenciais() {
  const [staff, setStaff] = useState([])
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalCadastro, setModalCadastro] = useState(false)
  const [modalCargos, setModalCargos] = useState(false)
  const [modalMassa, setModalMassa] = useState(false)
  const [membroCredencial, setMembroCredencial] = useState(null)
  const [membroEditar, setMembroEditar] = useState(null)

  async function carregar() {
    setLoading(true)
    try {
      const [staffData, cargosData] = await Promise.all([
        staffService.listar(),
        staffService.listarCargos(),
      ])
      setStaff(staffData || [])
      setCargos((cargosData || []).filter((c) => c.ativo))
    } catch {
      message.error('Erro ao carregar dados de staff.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function handleDeletar(id) {
    try {
      await staffService.deletar(id)
      message.success('Membro excluído.')
      carregar()
    } catch (err) {
      message.error(err.message || 'Erro ao excluir.')
    }
  }

  const columns = [
    {
      title: 'Foto',
      dataIndex: 'foto_url',
      width: 60,
      render: (url) =>
        url ? (
          <Avatar src={getStorageUrl(url)} size={40} />
        ) : (
          <Avatar icon={<User className="w-4 h-4" />} size={40} className="bg-gray-200 text-gray-500" />
        ),
    },
    {
      title: 'Nome',
      dataIndex: 'nome',
      render: (nome) => <Text strong>{nome}</Text>,
    },
    {
      title: 'CPF',
      dataIndex: 'cpf',
      render: (cpf) => <Text className="font-mono text-sm">{maskCpf(cpf)}</Text>,
    },
    {
      title: 'Cargo',
      dataIndex: 'cargo_nome',
      render: (cargo) => <Tag color="blue">{cargo}</Tag>,
    },
    {
      title: 'Documento',
      dataIndex: 'documento_url',
      render: (url) =>
        url ? (
          <a href={getStorageUrl(url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#0f766e] text-sm">
            <FileText className="w-3.5 h-3.5" /> Ver
          </a>
        ) : (
          <Text type="secondary" className="text-xs">—</Text>
        ),
    },
    {
      title: 'Cadastrado em',
      dataIndex: 'created_at',
      render: (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—',
    },
    {
      title: '',
      key: 'acoes',
      width: 112,
      render: (_, row) => (
        <Space size={4}>
          <Popconfirm
            title="Excluir membro?"
            description="Esta ação não pode ser desfeita."
            onConfirm={() => handleDeletar(row.id)}
            okText="Excluir"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Excluir">
              <Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
            </Tooltip>
          </Popconfirm>
          <Tooltip title="Editar">
            <Button size="small" icon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => setMembroEditar(row)} />
          </Tooltip>
          <Tooltip title="Gerar credencial">
            <Button size="small" icon={<IdCard className="w-3.5 h-3.5" />}
              onClick={() => setMembroCredencial(row)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho + ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Membros de Staff ({staff.length})
          </Typography.Title>
          <Text type="secondary" className="text-sm">
            Pessoas cadastradas para credenciamento no evento.
          </Text>
        </div>
        <Space wrap>
          <Button
            icon={<Settings2 className="w-4 h-4" />}
            onClick={() => setModalCargos(true)}
          >
            Gerenciar Cargos
          </Button>
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setModalCadastro(true)}
          >
            Novo Staff
          </Button>
          <Button
            icon={<Layers className="w-4 h-4" />}
            onClick={() => setModalMassa(true)}
            disabled={staff.length === 0}
          >
            Gerar credenciais em massa
          </Button>
        </Space>
      </div>

      {/* Tabela */}
      <Table
        dataSource={staff}
        rowKey="id"
        loading={loading}
        columns={columns}
        pagination={{ pageSize: 15 }}
        size="small"
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Nenhum membro cadastrado ainda.' }}
      />

      <ModalCadastroStaff
        open={modalCadastro}
        onClose={() => setModalCadastro(false)}
        onSaved={carregar}
        cargos={cargos}
      />

      <ModalEditarStaff
        membro={membroEditar}
        onClose={() => setMembroEditar(null)}
        onSaved={carregar}
        cargos={cargos}
      />

      <ModalCargos
        open={modalCargos}
        onClose={() => setModalCargos(false)}
      />

      <ModalCredencialStaff
        membro={membroCredencial}
        onClose={() => setMembroCredencial(null)}
      />

      <ModalCredenciaisEmMassa
        open={modalMassa}
        onClose={() => setModalMassa(false)}
        allStaff={staff}
      />
    </div>
  )
}
