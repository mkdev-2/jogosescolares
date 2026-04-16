import { useState, useEffect, useCallback } from 'react'
import { InputNumber, Select, Switch, Button, Alert, Divider } from 'antd'
import { ChevronUp, Trash2, Plus } from 'lucide-react'
import Modal from '../ui/Modal'
import { esportesService } from '../../services/esportesService'

// ---------------------------------------------------------------------------
// Códigos de critério com rótulos legíveis
// ---------------------------------------------------------------------------
const CRITERIOS_OPCOES = [
  { value: 'CONFRONTO_DIRETO',   label: 'Confronto direto' },
  { value: 'MAIOR_VITORIAS',     label: 'Maior número de vitórias' },
  { value: 'AVERAGE_DIRETO',     label: 'Average direto (entre empatadas)' },
  { value: 'AVERAGE_SEC_DIRETO', label: 'Average secundário direto' },
  { value: 'SALDO_DIRETO',       label: 'Saldo direto' },
  { value: 'AVERAGE_GERAL',      label: 'Average geral' },
  { value: 'AVERAGE_SEC_GERAL',  label: 'Average secundário geral' },
  { value: 'SALDO_GERAL',        label: 'Saldo geral' },
  { value: 'MENOR_CONTRA_GERAL', label: 'Menor placar sofrido (geral)' },
  { value: 'MAIOR_PRO_GERAL',    label: 'Maior placar marcado (geral)' },
  { value: 'SORTEIO',            label: 'Sorteio (terminal)' },
]

const labelPorCodigo = Object.fromEntries(CRITERIOS_OPCOES.map((o) => [o.value, o.label]))

const UNIDADES = ['GOLS', 'CESTAS', 'SETS', 'PONTOS']

// ---------------------------------------------------------------------------
// CriteriaEditor: lista ordenada com mover-para-cima / remover / adicionar
// ---------------------------------------------------------------------------
function CriteriaEditor({ value = [], onChange }) {
  const [adding, setAdding] = useState(false)

  const available = CRITERIOS_OPCOES.filter((o) => !value.includes(o.value))

  const moveUp = (idx) => {
    if (idx === 0) return
    const next = [...value]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next)
  }

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx))

  const add = (code) => {
    onChange([...value, code])
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 && (
        <p className="text-[0.875rem] text-[#94a3b8] italic m-0">Nenhum critério definido</p>
      )}
      {value.map((code, idx) => (
        <div
          key={code}
          className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] rounded-[8px] border border-[#e2e8f0]"
        >
          <span className="w-5 text-center text-[0.75rem] font-bold text-[#94a3b8]">{idx + 1}</span>
          <span className="flex-1 text-[0.875rem] text-[#334155]">
            {labelPorCodigo[code] ?? code}
          </span>
          <button
            type="button"
            title="Mover para cima"
            disabled={idx === 0}
            onClick={() => moveUp(idx)}
            className="p-1 rounded text-[#64748b] hover:text-[#0f766e] hover:bg-[#f0fdfa] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            title="Remover"
            onClick={() => remove(idx)}
            className="p-1 rounded text-[#64748b] hover:text-[#dc2626] hover:bg-[#fef2f2]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      {adding ? (
        <Select
          autoFocus
          placeholder="Selecionar critério..."
          options={available}
          onChange={add}
          onBlur={() => setAdding(false)}
          className="w-full"
          size="small"
          showSearch
          filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
        />
      ) : (
        available.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 self-start text-[0.8125rem] text-[#0f766e] font-medium hover:underline"
          >
            <Plus size={14} />
            Adicionar critério
          </button>
        )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// UnitSelect: combo que mostra as unidades conhecidas + campo livre para outras
// ---------------------------------------------------------------------------
function UnitSelect({ value, onChange, placeholder = 'Nenhuma', allowClear = false }) {
  const isKnown = !value || UNIDADES.includes(value)
  const selectValue = !value ? undefined : isKnown ? value : '__outro__'

  return (
    <div>
      <Select
        value={selectValue}
        allowClear={allowClear}
        placeholder={placeholder}
        onChange={(v) => {
          if (!v) { onChange(''); return }
          if (v !== '__outro__') onChange(v)
          else onChange('OUTRO')
        }}
        className="w-full"
        options={[
          ...UNIDADES.map((u) => ({ value: u, label: u })),
          { value: '__outro__', label: 'Outra...' },
        ]}
      />
      {!isKnown && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Nome da unidade"
          className="mt-2 w-full px-3 py-1.5 text-[0.875rem] border border-[#d9d9d9] rounded-[6px] outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------
const ESTADO_INICIAL = {
  unidade_placar: 'GOLS',
  unidade_placar_sec: '',
  pts_vitoria: 3,
  pts_vitoria_parcial: null,
  pts_empate: 1,
  pts_derrota: 0,
  permite_empate: false,
  wxo_pts_vencedor: 3,
  wxo_pts_perdedor: 0,
  wxo_placar_pro: 1,
  wxo_placar_contra: 0,
  wxo_placar_pro_sec: null,
  wxo_placar_contra_sec: null,
  ignorar_placar_extra: false,
  criterios_desempate_2: [],
  criterios_desempate_3plus: [],
}

function configParaForm(cfg) {
  if (!cfg) return ESTADO_INICIAL
  return {
    unidade_placar: cfg.unidade_placar ?? 'GOLS',
    unidade_placar_sec: cfg.unidade_placar_sec ?? '',
    pts_vitoria: cfg.pts_vitoria ?? 3,
    pts_vitoria_parcial: cfg.pts_vitoria_parcial ?? null,
    pts_empate: cfg.pts_empate ?? 1,
    pts_derrota: cfg.pts_derrota ?? 0,
    permite_empate: cfg.permite_empate ?? false,
    wxo_pts_vencedor: cfg.wxo_pts_vencedor ?? 3,
    wxo_pts_perdedor: cfg.wxo_pts_perdedor ?? 0,
    wxo_placar_pro: cfg.wxo_placar_pro ?? 1,
    wxo_placar_contra: cfg.wxo_placar_contra ?? 0,
    wxo_placar_pro_sec: cfg.wxo_placar_pro_sec ?? null,
    wxo_placar_contra_sec: cfg.wxo_placar_contra_sec ?? null,
    ignorar_placar_extra: cfg.ignorar_placar_extra ?? false,
    criterios_desempate_2: cfg.criterios_desempate_2 ?? [],
    criterios_desempate_3plus: cfg.criterios_desempate_3plus ?? [],
  }
}

// ---------------------------------------------------------------------------
// ConfigPontuacaoModal
// ---------------------------------------------------------------------------
export default function ConfigPontuacaoModal({
  isOpen,
  onClose,
  esporteId,
  esporteNome,
  edicaoId = null,
  onSuccess,
}) {
  const [form, setForm] = useState(ESTADO_INICIAL)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [configExistente, setConfigExistente] = useState(null)

  const set = useCallback((field, value) => setForm((prev) => ({ ...prev, [field]: value })), [])

  useEffect(() => {
    if (!isOpen || !esporteId) return
    setLoading(true)
    setErro(null)
    esportesService
      .getConfigPontuacao(esporteId, edicaoId)
      .then((cfg) => {
        setConfigExistente(cfg)
        setForm(configParaForm(cfg))
      })
      .catch((e) => setErro(e.message || 'Erro ao carregar configuração'))
      .finally(() => setLoading(false))
  }, [isOpen, esporteId, edicaoId])

  const handleSave = async () => {
    setSaving(true)
    setErro(null)
    const payload = {
      unidade_placar: form.unidade_placar || 'GOLS',
      unidade_placar_sec: form.unidade_placar_sec || null,
      pts_vitoria: form.pts_vitoria ?? 0,
      pts_vitoria_parcial: form.pts_vitoria_parcial ?? null,
      pts_empate: form.pts_empate ?? 0,
      pts_derrota: form.pts_derrota ?? 0,
      permite_empate: form.permite_empate,
      wxo_pts_vencedor: form.wxo_pts_vencedor ?? 0,
      wxo_pts_perdedor: form.wxo_pts_perdedor ?? 0,
      wxo_placar_pro: form.wxo_placar_pro ?? 0,
      wxo_placar_contra: form.wxo_placar_contra ?? 0,
      wxo_placar_pro_sec: form.wxo_placar_pro_sec ?? null,
      wxo_placar_contra_sec: form.wxo_placar_contra_sec ?? null,
      ignorar_placar_extra: form.ignorar_placar_extra,
      criterios_desempate_2: form.criterios_desempate_2,
      criterios_desempate_3plus: form.criterios_desempate_3plus,
    }
    try {
      await esportesService.upsertConfigPontuacao(esporteId, payload, edicaoId)
      onSuccess?.()
      onClose()
    } catch (e) {
      setErro(e.message || 'Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const sectionTitle = (text) => (
    <Divider
      orientation="left"
      className="!text-[0.8125rem] !font-semibold !text-[#64748b] !uppercase !tracking-wider !my-5"
    >
      {text}
    </Divider>
  )

  const fLabel = (text, hint) => (
    <div className="mb-1">
      <span className="text-[0.875rem] font-medium text-[#334155]">{text}</span>
      {hint && <p className="text-[0.75rem] text-[#94a3b8] m-0 leading-tight">{hint}</p>}
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`Configurar Pontuação — ${esporteNome}`}
      subtitle={configExistente ? 'Editar configuração existente' : 'Criar nova configuração para esta edição'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="primary" onClick={handleSave} loading={saving} disabled={loading}>
            Salvar configuração
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-[#64748b]">
          <div className="w-8 h-8 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
          <p className="m-0">Carregando...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {erro && (
            <Alert
              type="error"
              message={erro}
              showIcon
              closable
              className="mb-2"
              onClose={() => setErro(null)}
            />
          )}

          {/* Placar */}
          {sectionTitle('Placar')}
          <div className="grid grid-cols-2 gap-4">
            <div>
              {fLabel('Unidade primária', 'Ex: GOLS, CESTAS, SETS')}
              <UnitSelect
                value={form.unidade_placar}
                onChange={(v) => set('unidade_placar', v)}
              />
            </div>
            <div>
              {fLabel('Unidade secundária', 'Vôlei: PONTOS dentro dos sets')}
              <UnitSelect
                value={form.unidade_placar_sec}
                onChange={(v) => set('unidade_placar_sec', v)}
                placeholder="Nenhuma"
                allowClear
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Switch
              checked={form.ignorar_placar_extra}
              onChange={(v) => set('ignorar_placar_extra', v)}
              size="small"
            />
            <span className="text-[0.875rem] text-[#334155]">
              Ignorar placar de prorrogação no saldo/average
              <span className="ml-1 text-[0.75rem] text-[#94a3b8]">(ex: handebol)</span>
            </span>
          </div>

          {/* Pontuação na tabela */}
          {sectionTitle('Pontuação na tabela')}
          <div className="flex items-center gap-3 mb-4">
            <Switch
              checked={form.permite_empate}
              onChange={(v) => set('permite_empate', v)}
              size="small"
            />
            <span className="text-[0.875rem] text-[#334155]">Permite empate</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              {fLabel('Vitória')}
              <InputNumber value={form.pts_vitoria} min={0} className="w-full" onChange={(v) => set('pts_vitoria', v ?? 0)} />
            </div>
            <div>
              {fLabel('Vitória parcial', 'Ex: vôlei 2×1')}
              <InputNumber
                value={form.pts_vitoria_parcial ?? undefined}
                min={0}
                className="w-full"
                placeholder="—"
                onChange={(v) => set('pts_vitoria_parcial', v ?? null)}
              />
            </div>
            {form.permite_empate && (
              <div>
                {fLabel('Empate')}
                <InputNumber value={form.pts_empate} min={0} className="w-full" onChange={(v) => set('pts_empate', v ?? 0)} />
              </div>
            )}
            <div>
              {fLabel('Derrota')}
              <InputNumber value={form.pts_derrota} min={0} className="w-full" onChange={(v) => set('pts_derrota', v ?? 0)} />
            </div>
          </div>

          {/* Walkover */}
          {sectionTitle('Walkover (W×O)')}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-wider m-0">
                Pontos na tabela
              </p>
              <div>
                {fLabel('Vencedor')}
                <InputNumber value={form.wxo_pts_vencedor} min={0} className="w-full" onChange={(v) => set('wxo_pts_vencedor', v ?? 0)} />
              </div>
              <div>
                {fLabel('Perdedor')}
                <InputNumber value={form.wxo_pts_perdedor} min={0} className="w-full" onChange={(v) => set('wxo_pts_perdedor', v ?? 0)} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-wider m-0">
                Placar registrado
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {fLabel('Pro (primário)')}
                  <InputNumber value={form.wxo_placar_pro} min={0} className="w-full" onChange={(v) => set('wxo_placar_pro', v ?? 0)} />
                </div>
                <div>
                  {fLabel('Contra (primário)')}
                  <InputNumber value={form.wxo_placar_contra} min={0} className="w-full" onChange={(v) => set('wxo_placar_contra', v ?? 0)} />
                </div>
                <div>
                  {fLabel('Pro (secundário)', 'Opcional')}
                  <InputNumber
                    value={form.wxo_placar_pro_sec ?? undefined}
                    min={0}
                    className="w-full"
                    placeholder="—"
                    onChange={(v) => set('wxo_placar_pro_sec', v ?? null)}
                  />
                </div>
                <div>
                  {fLabel('Contra (secundário)', 'Opcional')}
                  <InputNumber
                    value={form.wxo_placar_contra_sec ?? undefined}
                    min={0}
                    className="w-full"
                    placeholder="—"
                    onChange={(v) => set('wxo_placar_contra_sec', v ?? null)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Critérios de desempate */}
          {sectionTitle('Desempate entre 2 equipes')}
          <CriteriaEditor
            value={form.criterios_desempate_2}
            onChange={(v) => set('criterios_desempate_2', v)}
          />

          {sectionTitle('Desempate entre 3 ou mais equipes')}
          <CriteriaEditor
            value={form.criterios_desempate_3plus}
            onChange={(v) => set('criterios_desempate_3plus', v)}
          />
        </div>
      )}
    </Modal>
  )
}
