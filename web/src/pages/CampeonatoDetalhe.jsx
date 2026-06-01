import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, DatePicker, Dropdown, Form, Input, InputNumber, Modal, Popover, Radio, Select, Table, Tabs, Tag, Tooltip, message, Spin } from 'antd'
import {
  AppstoreOutlined,
  BarsOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PartitionOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ArrowLeft, ChevronDown, ShieldAlert, Trophy } from 'lucide-react'
import { IoMdFootball } from 'react-icons/io'
import { campeonatosService } from '../services/campeonatosService'
import { equipesService } from '../services/equipesService'
import { locaisService } from '../services/locaisService'
import { useEdicao } from '../contexts/EdicaoContext'

// ── Bracket layout constants ──────────────────────────────────────────────────
const TEAM_H = 36
const DIVIDER_H = 1
const MATCH_H = TEAM_H * 2 + DIVIDER_H   // 73px
const MATCH_GAP = 20                       // gap between matches in round 0
const UNIT = MATCH_H + MATCH_GAP          // 93px per match slot
const ROUND_W = 210                        // width of each match box (px)
const CONNECTOR_W = 40                     // width of connector between rounds (px)

const BRACKET_PHASES = [
  'OITAVAS', 'QUARTAS', 'SEMI', 'FINAL',
]

const FASE_LABEL = {
  GRUPOS: 'Fase de Grupos',
  OITAVAS: 'Oitavas',
  QUARTAS: 'Quartas de Final',
  SEMI: 'Semifinais',
  FINAL: 'Final',
  TERCEIRO: '3º Lugar',
}

const STATUS_COLORS = {
  RASCUNHO: 'default',
  GERADO: 'blue',
  EM_ANDAMENTO: 'gold',
  FINALIZADO: 'green',
  CANCELADO: 'red',
}

const STATUS_LABELS = {
  RASCUNHO: 'Rascunho',
  GERADO: 'Aguardando início',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const FASE_ORDER = {
  GRUPOS: 1,
  OITAVAS: 2,
  QUARTAS: 3,
  SEMI: 4,
  FINAL: 5,
  TERCEIRO: 6,
}

const FASE_OPTIONS_CONFRONTO = Object.entries(FASE_LABEL).map(([value, label]) => ({ value, label }))

function findCampeao(campeonato, partidas) {
  if ((campeonato?.jogos_por_confronto_final ?? 1) > 1) {
    const wins = {}
    for (const p of partidas) {
      if (p.fase === 'FINAL' && p.num_jogo_serie != null && p.vencedor_equipe_id != null) {
        const id = p.vencedor_equipe_id
        wins[id] = wins[id] ?? { count: 0, nome: p.vencedor_nome }
        wins[id].count++
      }
    }
    const entry = Object.entries(wins).find(([, w]) => w.count >= 2)
    return entry ? { vencedor_equipe_id: Number(entry[0]), vencedor_nome: wins[entry[0]].nome } : null
  }
  return partidas.find((p) => p.fase === 'FINAL' && p.vencedor_equipe_id) ?? null
}

function ladoVenceu(partida, lado) {
  const idKey = lado === 'mandante' ? 'mandante_equipe_id' : 'visitante_equipe_id'
  if (partida.vencedor_equipe_id != null && partida[idKey] != null) {
    return partida.vencedor_equipe_id === partida[idKey]
  }
  if (partida.vencedor_nome != null) {
    const nomeKey = lado === 'mandante' ? 'mandante_nome' : 'visitante_nome'
    return partida.vencedor_nome === partida[nomeKey]
  }
  return false
}

function equipeNome(partida, lado) {
  const nomeKey = lado === 'mandante' ? 'mandante_nome' : 'visitante_nome'
  const idKey = lado === 'mandante' ? 'mandante_equipe_id' : 'visitante_equipe_id'
  return partida[nomeKey] || (partida[idKey] ? `Equipe ${partida[idKey]}` : 'A definir')
}

function formatDia(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(value))
}

function sortPartidasOperacional(a, b) {
  return (FASE_ORDER[a.fase] || 99) - (FASE_ORDER[b.fase] || 99) || a.rodada - b.rodada || a.id - b.id
}

// ── Bracket geometry helpers ──────────────────────────────────────────────────
function matchTop(roundIdx, matchIdx) {
  if (roundIdx === 0) return matchIdx * UNIT
  const offset = UNIT * (Math.pow(2, roundIdx) - 1) / 2
  return offset + matchIdx * UNIT * Math.pow(2, roundIdx)
}

function columnLeft(roundIdx) {
  return roundIdx * (ROUND_W + CONNECTOR_W)
}

function bracketHeight(firstRoundCount) {
  return firstRoundCount * UNIT - MATCH_GAP
}

function bracketWidth(numRounds) {
  return numRounds * ROUND_W + Math.max(0, numRounds - 1) * CONNECTOR_W
}

function buildConnectorPaths(roundsData) {
  const paths = []
  for (let r = 0; r < roundsData.length - 1; r++) {
    const count = roundsData[r].length
    for (let p = 0; p < Math.floor(count / 2); p++) {
      const topY = matchTop(r, p * 2) + MATCH_H / 2
      const botY = matchTop(r, p * 2 + 1) + MATCH_H / 2
      const midY = (topY + botY) / 2
      const x1 = columnLeft(r) + ROUND_W
      const x2 = columnLeft(r + 1)
      const xMid = x1 + (x2 - x1) / 2
      // horizontal from top match → junction, vertical, horizontal from bottom match → junction, out to next round
      paths.push(
        `M${x1} ${topY} H${xMid}` +
        ` M${xMid} ${topY} V${botY}` +
        ` M${x1} ${botY} H${xMid}` +
        ` M${xMid} ${midY} H${x2}`
      )
    }
  }
  return paths
}

// ── RegistrarResultadoModal ───────────────────────────────────────────────────

function SetInputRow({ index, nomeMandante, nomeVisitante, sets, onChange }) {
  const set = sets[index] ?? { mandante: null, visitante: null }
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">SET {index + 1}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1 truncate">{nomeMandante}</label>
          <InputNumber
            min={0}
            value={set.mandante}
            onChange={val => onChange(index, 'mandante', val)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1 truncate">{nomeVisitante}</label>
          <InputNumber
            min={0}
            value={set.visitante}
            onChange={val => onChange(index, 'visitante', val)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

function calcularSets(sets) {
  const validos = sets.filter(s => s.mandante !== null && s.visitante !== null)
  const mSets = validos.filter(s => s.mandante > s.visitante).length
  const vSets = validos.filter(s => s.visitante > s.mandante).length
  const mPts = validos.reduce((acc, s) => acc + (s.mandante ?? 0), 0)
  const vPts = validos.reduce((acc, s) => acc + (s.visitante ?? 0), 0)
  return { mSets, vSets, mPts, vPts, preenchidos: validos.length }
}

function RegistrarResultadoModal({ partida, config, campeonatoId, onSuccess, onClose }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const usaSets = config?.unidade_placar === 'SETS'
  const unidadePrimaria = config?.unidade_placar || 'GOLS'
  const isEditing = !!partida.resultado_tipo

  // Estado de sets para sports de sets
  const setsIniciais = (() => {
    if (partida.sets_detalhe?.length) {
      return partida.sets_detalhe.map(s => ({ mandante: s.mandante, visitante: s.visitante }))
    }
    return [{ mandante: null, visitante: null }, { mandante: null, visitante: null }]
  })()
  const [sets, setSets] = useState(setsIniciais)

  const initialValues = (() => {
    if (!partida.resultado_tipo) return { resultado_tipo: 'NORMAL' }
    const vals = { resultado_tipo: partida.resultado_tipo }
    if (!usaSets) {
      vals.placar_mandante = partida.placar_mandante
      vals.placar_visitante = partida.placar_visitante
      vals.placar_mandante_sec = partida.placar_mandante_sec ?? undefined
      vals.placar_visitante_sec = partida.placar_visitante_sec ?? undefined
    }
    if (partida.resultado_tipo === 'WXO') {
      vals.desistente_wxo = partida.vencedor_equipe_id === partida.mandante_equipe_id ? 'VISITANTE' : 'MANDANTE'
    }
    return vals
  })()

  const handleSetChange = (index, side, val) => {
    setSets(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [side]: val }
      return next
    })
  }

  const { mSets, vSets, mPts, vPts, preenchidos } = calcularSets(sets)

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const isWxo = values.resultado_tipo === 'WXO'
      const vencedorWxo = values.desistente_wxo === 'MANDANTE' ? 'VISITANTE' : 'MANDANTE'
      const mandanteVence = !isWxo || vencedorWxo === 'MANDANTE'

      let payload
      if (usaSets && !isWxo) {
        // Validar: deve resultar em 2-0 ou 2-1
        const calc = calcularSets(sets)
        if (calc.preenchidos < 2 || (calc.mSets !== 2 && calc.vSets !== 2)) {
          message.error('Preencha os sets corretamente — o vencedor deve ganhar 2 sets (2×0 ou 2×1).')
          setSaving(false)
          return
        }
        const setsEnviar = sets
          .filter(s => s.mandante !== null && s.visitante !== null)
          .map((s, i) => ({ set: i + 1, mandante: s.mandante, visitante: s.visitante }))
        payload = {
          resultado_tipo: 'NORMAL',
          sets_detalhe: setsEnviar,
        }
      } else {
        payload = {
          resultado_tipo: values.resultado_tipo,
          vencedor_wxo: isWxo ? vencedorWxo : undefined,
          placar_mandante: isWxo
            ? (mandanteVence ? (config?.wxo_placar_pro ?? 1) : (config?.wxo_placar_contra ?? 0))
            : values.placar_mandante,
          placar_visitante: isWxo
            ? (mandanteVence ? (config?.wxo_placar_contra ?? 0) : (config?.wxo_placar_pro ?? 1))
            : values.placar_visitante,
          placar_mandante_sec: usaSets
            ? (mandanteVence ? (config?.wxo_placar_pro_sec ?? 50) : (config?.wxo_placar_contra_sec ?? 0))
            : null,
          placar_visitante_sec: usaSets
            ? (mandanteVence ? (config?.wxo_placar_contra_sec ?? 0) : (config?.wxo_placar_pro_sec ?? 50))
            : null,
        }
      }

      await campeonatosService.registrarResultado(campeonatoId, partida.id, payload)
      message.success('Resultado registrado com sucesso')
      onSuccess(payload)
    } catch (err) {
      if (err?.errorFields) return
      message.error(err.message || 'Erro ao registrar resultado')
    } finally {
      setSaving(false)
    }
  }

  const tipo = Form.useWatch('resultado_tipo', form)
  const desistente = Form.useWatch('desistente_wxo', form)
  const isWxo = tipo === 'WXO'

  const nomeMandante = partida.mandante_nome || 'Mandante'
  const nomeVisitante = partida.visitante_nome || 'Visitante'

  return (
    <Modal
      open
      title={isEditing ? 'Editar resultado' : 'Registrar resultado'}
      onCancel={onClose}
      onOk={handleSave}
      okText={isEditing ? 'Alterar' : 'Salvar'}
      confirmLoading={saving}
      destroyOnClose
      width={440}
    >
      <p className="text-sm text-[#64748b] mb-4">
        <strong>{nomeMandante}</strong>
        {' vs '}
        <strong>{nomeVisitante}</strong>
      </p>
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="resultado_tipo" label="Tipo de resultado">
          <Radio.Group>
            <Radio value="NORMAL">Normal</Radio>
            <Radio value="WXO">WxO (walkover)</Radio>
          </Radio.Group>
        </Form.Item>

        {!isWxo && usaSets && (
          <div className="bg-slate-50 rounded-lg p-3 mb-2">
            {sets.map((_, i) => (
              <SetInputRow
                key={i}
                index={i}
                nomeMandante={nomeMandante}
                nomeVisitante={nomeVisitante}
                sets={sets}
                onChange={handleSetChange}
              />
            ))}
            {preenchidos >= 2 && mSets === 1 && vSets === 1 && sets.length < 3 && (
              <Button
                type="dashed"
                size="small"
                className="w-full mb-3"
                onClick={() => setSets(prev => [...prev, { mandante: null, visitante: null }])}
              >
                + Adicionar SET 3 (desempate)
              </Button>
            )}
            {preenchidos >= 2 && (mSets === 2 || vSets === 2) && (
              <div className="text-xs text-center text-slate-600 border-t pt-2 mt-1">
                <strong>{mSets === 2 ? nomeMandante : nomeVisitante}</strong> vence{' '}
                {Math.max(mSets, vSets)}×{Math.min(mSets, vSets)}
                {' · '}pontos: {mPts}–{vPts}
              </div>
            )}
          </div>
        )}

        {!isWxo && !usaSets && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="placar_mandante"
                label={`${nomeMandante} (${unidadePrimaria})`}
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
              <Form.Item
                name="placar_visitante"
                label={`${nomeVisitante} (${unidadePrimaria})`}
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>
          </>
        )}

        {isWxo && (
          <>
            <Form.Item
              name="desistente_wxo"
              label="Qual equipe cometeu o W.O.?"
              rules={[{ required: true, message: 'Selecione a equipe que desistiu' }]}
            >
              <Radio.Group>
                <Radio value="MANDANTE">{nomeMandante}</Radio>
                <Radio value="VISITANTE">{nomeVisitante}</Radio>
              </Radio.Group>
            </Form.Item>
            {desistente && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded p-3">
                <strong>
                  {desistente === 'MANDANTE' ? nomeVisitante : nomeMandante}
                </strong>{' '}
                vence com placar {config?.wxo_placar_pro ?? 1}–{config?.wxo_placar_contra ?? 0}.
              </p>
            )}
          </>
        )}
      </Form>
    </Modal>
  )
}

// ── RegistrarArtilheirosModal ─────────────────────────────────────────────────
function golsParaEquipe(linhas, equipeId, adversarioId) {
  const normais = linhas.reduce(
    (s, l) => (l.equipeId === equipeId && !l.isGolContra ? s + (l.quantidade || 0) : s),
    0,
  )
  const contraRecebidos = linhas.reduce(
    (s, l) => (l.equipeId === adversarioId && l.isGolContra ? s + (l.quantidade || 0) : s),
    0,
  )
  return normais + contraRecebidos
}

const TIPO_PENALIDADE_LABELS = {
  CARTAO_AMARELO: 'Cartão Amarelo',
  CARTAO_VERMELHO: 'Cartão Vermelho',
  ADVERTENCIA: 'Advertência',
}

function RegistrarArtilheirosModal({ partida, campeonatoId, registraArtilheiro, onClose }) {
  const [atletas, setAtletas] = useState({ mandante: [], visitante: [] })
  const [linhas, setLinhas] = useState([])
  const [penalidades, setPenalidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const placarMandante = partida.placar_mandante ?? 0
  const placarVisitante = partida.placar_visitante ?? 0

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [m, v, artExist, penExist] = await Promise.all([
          equipesService.getById(partida.mandante_equipe_id),
          equipesService.getById(partida.visitante_equipe_id),
          registraArtilheiro ? campeonatosService.getArtilheirosPartida(campeonatoId, partida.id) : Promise.resolve([]),
          campeonatosService.getPenalidadesPartida(campeonatoId, partida.id),
        ])
        setAtletas({ mandante: m.estudantes || [], visitante: v.estudantes || [] })
        setLinhas(artExist.map((a) => ({
          uid: `${a.equipe_id}_${a.estudante_id}_${a.is_gol_contra ? 'gc' : 'n'}`,
          equipeId: a.equipe_id,
          estudanteId: a.estudante_id,
          quantidade: a.quantidade,
          isGolContra: !!a.is_gol_contra,
        })))
        setPenalidades(penExist.map((p) => ({
          uid: String(p.id),
          equipeId: p.equipe_id,
          estudanteId: p.estudante_id,
          tipo: p.tipo,
        })))
      } catch {
        message.error('Erro ao carregar dados da partida')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [campeonatoId, partida.id, partida.mandante_equipe_id, partida.visitante_equipe_id, registraArtilheiro])

  const somaMandante = golsParaEquipe(linhas, partida.mandante_equipe_id, partida.visitante_equipe_id)
  const somaVisitante = golsParaEquipe(linhas, partida.visitante_equipe_id, partida.mandante_equipe_id)
  const somasCorretas = somaMandante === placarMandante && somaVisitante === placarVisitante

  const removeLinha = (uid) => setLinhas((prev) => prev.filter((l) => l.uid !== uid))
  const updateLinha = (uid, field, value) => setLinhas((prev) => prev.map((l) =>
    l.uid !== uid ? l : { ...l, [field]: value }
  ))

  const removePenalidade = (uid) => setPenalidades((prev) => prev.filter((p) => p.uid !== uid))
  const updatePenalidade = (uid, field, value) => setPenalidades((prev) => prev.map((p) =>
    p.uid !== uid ? p : { ...p, [field]: value }
  ))

  const handleSave = async () => {
    setSaving(true)
    try {
      const calls = []
      if (registraArtilheiro) {
        const artilheiros = linhas
          .filter((l) => l.estudanteId && l.quantidade > 0)
          .map((l) => ({
            estudante_id: l.estudanteId,
            equipe_id: l.equipeId,
            quantidade: l.quantidade,
            is_gol_contra: !!l.isGolContra,
          }))
        calls.push(campeonatosService.registrarArtilheiros(campeonatoId, partida.id, { artilheiros }))
      }
      const penalidadesPayload = penalidades
        .filter((p) => p.estudanteId && p.tipo)
        .map((p) => ({ estudante_id: p.estudanteId, equipe_id: p.equipeId, tipo: p.tipo }))
      calls.push(campeonatosService.registrarPenalidades(campeonatoId, partida.id, { penalidades: penalidadesPayload }))
      await Promise.all(calls)
      message.success('Eventos registrados com sucesso')
      onClose()
    } catch (err) {
      message.error(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const filterJogador = (input, opt) => opt?.label?.toLowerCase().includes(input.toLowerCase())

  const opcoesEquipe = {
    [partida.mandante_equipe_id]: atletas.mandante.map((a) => ({ value: a.id, label: a.nome })),
    [partida.visitante_equipe_id]: atletas.visitante.map((a) => ({ value: a.id, label: a.nome })),
  }

  const linhasMandante = linhas.filter((l) => l.equipeId === partida.mandante_equipe_id)
  const linhasVisitante = linhas.filter((l) => l.equipeId === partida.visitante_equipe_id)
  const penMandante = penalidades.filter((p) => p.equipeId === partida.mandante_equipe_id)
  const penVisitante = penalidades.filter((p) => p.equipeId === partida.visitante_equipe_id)

  const addLinhaEquipe = (equipeId, isGolContra = false) =>
    setLinhas((prev) => [...prev, {
      uid: `${Date.now()}_${isGolContra ? 'gc' : 'n'}`,
      equipeId,
      estudanteId: null,
      quantidade: 1,
      isGolContra,
    }])
  const addPenalidadeEquipe = (equipeId) =>
    setPenalidades((prev) => [...prev, { uid: String(Date.now()), equipeId, estudanteId: null, tipo: null }])

  const renderLinhasEquipe = (lista, equipeId) => (
    <div className="flex flex-col gap-2">
      {lista.map((l) => (
        <div key={l.uid} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Select
              showSearch
              placeholder="Buscar jogador..."
              options={opcoesEquipe[equipeId] || []}
              value={l.estudanteId || undefined}
              onChange={(v) => updateLinha(l.uid, 'estudanteId', v)}
              filterOption={filterJogador}
              className="flex-1 min-w-0"
              size="small"
            />
            <InputNumber
              min={1}
              value={l.quantidade}
              onChange={(v) => updateLinha(l.uid, 'quantidade', v ?? 1)}
              className="w-16 shrink-0"
              size="small"
            />
            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => removeLinha(l.uid)} danger className="shrink-0" />
          </div>
          {l.isGolContra && (
            <Tag color="orange" className="w-fit m-0 text-[0.6875rem]">Gol contra (credita ao adversário)</Tag>
          )}
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addLinhaEquipe(equipeId, false)} className="w-full">
          Adicionar artilheiro
        </Button>
        <Button type="dashed" size="small" onClick={() => addLinhaEquipe(equipeId, true)} className="w-full text-amber-700 border-amber-300">
          Adicionar gol contra
        </Button>
      </div>
    </div>
  )

  const renderPenalidadesEquipe = (lista, equipeId) => (
    <div className="flex flex-col gap-2">
      {lista.map((p) => (
        <div key={p.uid} className="flex items-center gap-2">
          <Select
            showSearch
            placeholder="Buscar jogador..."
            options={opcoesEquipe[equipeId] || []}
            value={p.estudanteId || undefined}
            onChange={(v) => updatePenalidade(p.uid, 'estudanteId', v)}
            filterOption={filterJogador}
            className="flex-1 min-w-0"
            size="small"
          />
          <Select
            placeholder="Tipo"
            value={p.tipo || undefined}
            onChange={(v) => updatePenalidade(p.uid, 'tipo', v)}
            className="w-40 shrink-0"
            size="small"
            options={Object.entries(TIPO_PENALIDADE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => removePenalidade(p.uid)} danger className="shrink-0" />
        </div>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addPenalidadeEquipe(equipeId)} className="w-full">
        Adicionar penalidade
      </Button>
    </div>
  )

  const EquipeHeader = ({ nome, soma, placar }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[0.75rem] font-semibold text-[#64748b] uppercase tracking-wider truncate">{nome}</span>
      {placar !== undefined && (
        <span className={`text-[0.8125rem] font-bold ml-auto shrink-0 ${soma === placar ? 'text-emerald-600' : 'text-amber-600'}`}>
          {soma}/{placar}
        </span>
      )}
    </div>
  )

  const tabArtilheiros = (
    <div className="flex flex-col gap-4">
      <div>
        <EquipeHeader nome={partida.mandante_nome || 'Mandante'} soma={somaMandante} placar={placarMandante} />
        {renderLinhasEquipe(linhasMandante, partida.mandante_equipe_id)}
      </div>
      <div className="border-t border-[#e2e8f0] pt-4">
        <EquipeHeader nome={partida.visitante_nome || 'Visitante'} soma={somaVisitante} placar={placarVisitante} />
        {renderLinhasEquipe(linhasVisitante, partida.visitante_equipe_id)}
      </div>
      {!somasCorretas && (linhasMandante.some((l) => l.estudanteId) || linhasVisitante.some((l) => l.estudanteId)) && (
        <p className="text-[0.8125rem] text-amber-600 m-0">
          A soma de pontos de cada equipe deve coincidir com o placar.
        </p>
      )}
    </div>
  )

  const tabPenalidades = (
    <div className="flex flex-col gap-4">
      <div>
        <EquipeHeader nome={partida.mandante_nome || 'Mandante'} />
        {renderPenalidadesEquipe(penMandante, partida.mandante_equipe_id)}
      </div>
      <div className="border-t border-[#e2e8f0] pt-4">
        <EquipeHeader nome={partida.visitante_nome || 'Visitante'} />
        {renderPenalidadesEquipe(penVisitante, partida.visitante_equipe_id)}
      </div>
    </div>
  )

  const tabItems = [
    ...(registraArtilheiro ? [{
      key: 'artilheiros',
      label: <span className="flex items-center gap-1.5"><IoMdFootball />Artilheiros</span>,
      children: tabArtilheiros,
    }] : []),
    {
      key: 'penalidades',
      label: <span className="flex items-center gap-1.5"><ShieldAlert size={14} />Penalidades</span>,
      children: tabPenalidades,
    },
  ]

  const okDisabled = loading || (registraArtilheiro && !somasCorretas)

  return (
    <Modal
      open
      title="Registrar eventos da partida"
      onCancel={onClose}
      onOk={handleSave}
      okText="Salvar"
      cancelText="Pular"
      confirmLoading={saving}
      okButtonProps={{ disabled: okDisabled }}
      destroyOnClose
      width={500}
    >
      {loading ? (
        <div className="flex justify-center py-6"><Spin /></div>
      ) : (
        <Tabs items={tabItems} size="small" className="mt-1" />
      )}
    </Modal>
  )
}

// ── Popover de classificação ──────────────────────────────────────────────────
const CRITERIO_LABEL = {
  PONTOS: 'Pontuação',
  CONFRONTO_DIRETO: 'Confronto Direto',
  MAIOR_VITORIAS: 'Número de Vitórias',
  AVERAGE_DIRETO: 'Average (confronto direto)',
  AVERAGE_SEC_DIRETO: 'Average secundário (confronto direto)',
  SALDO_DIRETO: 'Saldo (confronto direto)',
  AVERAGE_GERAL: 'Average geral',
  AVERAGE_SEC_GERAL: 'Average geral secundário',
  SALDO_GERAL: 'Saldo geral',
  MENOR_CONTRA_GERAL: 'Pontos sofridos',
  MAIOR_PRO_GERAL: 'Pontos marcados',
  SORTEIO: 'Sorteio',
}

function criterioDesc(crit, r) {
  if (!crit) return null
  switch (crit) {
    case 'PONTOS':           return `Maior pontuação no grupo (${r.pts} pts)`
    case 'CONFRONTO_DIRETO': return 'Venceu o confronto direto contra a(s) equipe(s) empatada(s)'
    case 'MAIOR_VITORIAS':   return `Mais vitórias que a próxima equipe (${r.V} vitória${r.V !== 1 ? 's' : ''})`
    case 'AVERAGE_DIRETO':   return 'Melhor average nos confrontos diretos'
    case 'AVERAGE_SEC_DIRETO': return 'Melhor average secundário nos confrontos diretos'
    case 'SALDO_DIRETO':     return 'Melhor saldo de pontos nos confrontos diretos'
    case 'AVERAGE_GERAL':    return `Melhor average geral (${r.pro} pró / ${r.contra} contra)`
    case 'AVERAGE_SEC_GERAL': return 'Melhor average geral secundário'
    case 'SALDO_GERAL':      return `Melhor saldo geral (${r.saldo >= 0 ? '+' : ''}${r.saldo})`
    case 'MENOR_CONTRA_GERAL': return `Menos pontos sofridos (${r.contra})`
    case 'MAIOR_PRO_GERAL':  return `Mais pontos marcados (${r.pro})`
    case 'SORTEIO':          return 'Critérios esgotados — posição definida por sorteio'
    default:                 return null
  }
}

function ClassificadoPopoverContent({ record, isWildcard, wildcardRanking }) {
  if (isWildcard) {
    const wcIdx = (wildcardRanking ?? []).findIndex(w => w.equipe_id === record.equipe_id)
    const wcInfo = wcIdx >= 0 ? wildcardRanking[wcIdx] : null
    const proximo = wcIdx >= 0 && wcIdx + 1 < (wildcardRanking?.length ?? 0)
      ? wildcardRanking[wcIdx + 1]
      : null
    const statsRow = wcInfo ?? record
    const crit = wcInfo?.criterio_decisivo
    const desc = crit ? criterioDesc(crit, statsRow) : null

    return (
      <div style={{ maxWidth: 288 }}>
        <p className="font-semibold text-emerald-700 mb-1">
          Wild Card
          {wcInfo ? ` — ${wcInfo.posicao_no_grupo}° do Grupo ${wcInfo.grupo_nome}` : ''}
        </p>
        {crit ? (
          <div className="mb-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide m-0">Critério decisivo</p>
            <p className="font-medium text-gray-800 m-0">{CRITERIO_LABEL[crit] || crit}</p>
            {desc && <p className="text-xs text-gray-500 mt-0.5 m-0">{desc}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic mb-2 m-0">Critério não determinado</p>
        )}
        <div className="pt-1.5 border-t border-gray-100 grid grid-cols-3 gap-x-3 text-xs text-gray-500">
          <span>Pts: <strong className="text-gray-700">{statsRow.pts}</strong></span>
          <span>Vit: <strong className="text-gray-700">{statsRow.V}</strong></span>
          <span>
            Saldo:{' '}
            <strong className="text-gray-700">
              {statsRow.saldo >= 0 ? '+' : ''}{statsRow.saldo}
            </strong>
          </span>
        </div>
        {proximo && (
          <p className="text-xs text-gray-400 mt-1.5 m-0">
            Superou: {proximo.nome_escola} — Grupo {proximo.grupo_nome} ({proximo.pts} pts)
          </p>
        )}
      </div>
    )
  }

  const crit = record.criterio_decisivo
  const desc = criterioDesc(crit, record)

  return (
    <div style={{ maxWidth: 272 }}>
      <p className="font-semibold text-emerald-700 mb-2">
        {record.posicao}° lugar — Classificado
      </p>
      {crit ? (
        <div className="mb-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide m-0">Critério decisivo</p>
          <p className="font-medium text-gray-800 m-0">{CRITERIO_LABEL[crit] || crit}</p>
          {desc && <p className="text-xs text-gray-500 mt-0.5 m-0">{desc}</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic mb-2">Critério não determinado</p>
      )}
      <div className="pt-2 border-t border-gray-100 grid grid-cols-3 gap-x-3 text-xs text-gray-500">
        <span>Pts: <strong className="text-gray-700">{record.pts}</strong></span>
        <span>Vit: <strong className="text-gray-700">{record.V}</strong></span>
        <span>
          Saldo:{' '}
          <strong className="text-gray-700">
            {record.saldo >= 0 ? '+' : ''}{record.saldo}
          </strong>
        </span>
      </div>
    </div>
  )
}

// ── ClassificacaoGrupo ────────────────────────────────────────────────────────
function ClassificacaoGrupo({ campeonatoId, grupoId, classificadosDiretos, config, refreshKey, wildcardEquipeIds, wildcardRanking, onRefresh }) {
  const { isAdmin } = useEdicao()
  const [classificacao, setClassificacao] = useState([])
  const [loading, setLoading] = useState(true)
  const [sorteioModal, setSorteioModal] = useState(false)
  const [sorteioForm, setSorteioForm] = useState([])
  const [salvandoSorteio, setSalvandoSorteio] = useState(false)

  useEffect(() => {
    campeonatosService
      .getClassificacaoGrupo(campeonatoId, grupoId)
      .then(setClassificacao)
      .catch(() => setClassificacao([]))
      .finally(() => setLoading(false))
  }, [campeonatoId, grupoId, refreshKey])

  const usaSec = config?.unidade_placar === 'SETS'
  const grupoConcluido = classificacao[0]?.grupo_concluido ?? false
  const isClassificado = (r) =>
    grupoConcluido &&
    (r.posicao <= classificadosDiretos || (wildcardEquipeIds ?? []).includes(r.equipe_id))
  const sorteioPendente = classificacao.some((r) => r.criterio_decisivo === 'SORTEIO_PENDENTE')
  const timesEmpatados = classificacao.filter((r) => r.criterio_decisivo === 'SORTEIO_PENDENTE')

  const abrirSorteio = () => {
    setSorteioForm(timesEmpatados.map((r) => ({ equipe_id: r.equipe_id, nome_escola: r.nome_escola, posicao_no_grupo: r.posicao })))
    setSorteioModal(true)
  }

  const salvarSorteio = async () => {
    setSalvandoSorteio(true)
    try {
      const resultados = sorteioForm.map((r) => ({ equipe_id: r.equipe_id, posicao_no_grupo: r.posicao_no_grupo }))
      await campeonatosService.registrarSorteio(campeonatoId, grupoId, resultados)
      message.success('Resultado do sorteio registrado com sucesso.')
      setSorteioModal(false)
      onRefresh?.()
    } catch (e) {
      message.error('Erro ao registrar resultado do sorteio.')
    } finally {
      setSalvandoSorteio(false)
    }
  }

  const th = (sigla, label) => (
    <Tooltip title={label} mouseEnterDelay={0.3}>
      <span style={{ cursor: 'default' }}>{sigla}</span>
    </Tooltip>
  )
  const cols = [
    { title: '#', dataIndex: 'posicao', key: 'posicao', width: 36 },
    {
      title: 'Escola',
      dataIndex: 'nome_escola',
      key: 'nome_escola',
      render: (nome, record) => {
        if (!isClassificado(record)) return nome
        const wc = (wildcardEquipeIds ?? []).includes(record.equipe_id)
        return (
          <Popover
            content={<ClassificadoPopoverContent record={record} isWildcard={wc} wildcardRanking={wildcardRanking} />}
            trigger="hover"
            placement="right"
            mouseEnterDelay={0.2}
          >
            <span className="cursor-default underline decoration-dotted decoration-emerald-500">
              {nome}
            </span>
          </Popover>
        )
      },
    },
    { title: th('PTS', 'Pontos'), dataIndex: 'pts', key: 'pts', width: 48 },
    { title: th('J', 'Jogos'), dataIndex: 'J', key: 'J', width: 36 },
    { title: th('V', 'Vitórias'), dataIndex: 'V', key: 'V', width: 36 },
    { title: th('E', 'Empates'), dataIndex: 'E', key: 'E', width: 36 },
    { title: th('D', 'Derrotas'), dataIndex: 'D', key: 'D', width: 36 },
    {
      title: th(usaSec ? 'S+' : 'PRÓ', usaSec ? 'Sets a favor' : 'A favor (marcados)'),
      dataIndex: 'pro', key: 'pro', width: 50,
    },
    {
      title: th(usaSec ? 'S-' : 'CTR', usaSec ? 'Sets contra' : 'Contra (sofridos)'),
      dataIndex: 'contra', key: 'contra', width: 50,
    },
    {
      title: th('SLD', usaSec ? 'Saldo de sets' : 'Saldo de pontos'),
      dataIndex: 'saldo', key: 'saldo', width: 48,
    },
    ...(usaSec
      ? [
          { title: th('P+', 'Pontos a favor'), dataIndex: 'pro_sec', key: 'pro_sec', width: 50 },
          { title: th('P-', 'Pontos contra'), dataIndex: 'contra_sec', key: 'contra_sec', width: 50 },
        ]
      : []),
  ]

  // Posições disponíveis fixas — derivadas uma vez ao abrir o modal (via sorteioForm inicial)
  const posicaoOptions = [...new Set(sorteioForm.map((r) => r.posicao_no_grupo))].sort((a, b) => a - b)

  const handleSorteioChange = (idx, novaPos) => {
    setSorteioForm((prev) => {
      const antigoOcupante = prev.findIndex((r, i) => i !== idx && r.posicao_no_grupo === novaPos)
      const posAnterior = prev[idx].posicao_no_grupo
      return prev.map((r, i) => {
        if (i === idx) return { ...r, posicao_no_grupo: novaPos }
        if (i === antigoOcupante) return { ...r, posicao_no_grupo: posAnterior }
        return r
      })
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {sorteioPendente && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <span className="font-medium">⚠ Sorteio necessário — empate não resolvido pelos critérios de desempate</span>
          {isAdmin && (
            <Button size="small" onClick={abrirSorteio} className="shrink-0 border-amber-400 text-amber-800 hover:border-amber-600">
              Registrar Sorteio
            </Button>
          )}
        </div>
      )}
      <Table
        rowKey="equipe_id"
        size="small"
        pagination={false}
        loading={loading}
        dataSource={classificacao}
        columns={cols}
        rowClassName={(r) => isClassificado(r) ? 'bg-emerald-50' : ''}
      />
      {isAdmin && (
        <Modal
          title="Registrar Resultado do Sorteio"
          open={sorteioModal}
          onCancel={() => setSorteioModal(false)}
          onOk={salvarSorteio}
          okText="Salvar"
          cancelText="Cancelar"
          confirmLoading={salvandoSorteio}
        >
          <p className="text-sm text-slate-600 mb-4">
            Defina a posição final de cada equipe empatada conforme o resultado do sorteio realizado.
          </p>
          <div className="flex flex-col gap-2">
            {sorteioForm.map((item, idx) => (
              <div key={item.equipe_id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-sm font-medium text-slate-800">{item.nome_escola}</span>
                <Select
                  size="small"
                  style={{ width: 80 }}
                  value={item.posicao_no_grupo}
                  onChange={(val) => handleSorteioChange(idx, val)}
                  options={posicaoOptions.map((p) => ({ value: p, label: `${p}°` }))}
                />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── VencedorBanner ────────────────────────────────────────────────────────────
function VencedorBanner({ vencedorNome, equipe }) {
  const atletas = equipe?.estudantes || []

  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-yellow-200">
      {/* Header dourado */}
      <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 px-8 py-6 flex items-center gap-5">
        <div className="bg-white/25 rounded-full p-4 shrink-0">
          <Trophy size={40} className="text-white drop-shadow" />
        </div>
        <div>
          <p className="text-amber-100 text-[0.7rem] font-bold tracking-[0.2em] uppercase mb-1">
            Campeão
          </p>
          <h2 className="text-white text-[1.75rem] font-extrabold leading-tight drop-shadow-sm">
            {vencedorNome}
          </h2>
        </div>
        {/* Estrelas decorativas */}
        <div className="ml-auto text-white/30 text-[3rem] leading-none select-none hidden sm:block">
          ★★★
        </div>
      </div>

      {/* Atletas */}
      <div className="bg-gradient-to-b from-amber-50 to-white px-8 py-5">
        {atletas.length > 0 ? (
          <>
            <p className="text-amber-700 text-[0.7rem] font-bold tracking-widest uppercase mb-3">
              Atletas campeões
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {atletas.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-amber-100 shadow-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-[0.6rem] font-bold text-amber-600">
                    ★
                  </span>
                  <span className="text-sm text-slate-700 font-medium truncate">{a.nome}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-amber-500 text-sm">Carregando atletas...</p>
        )}
      </div>
    </div>
  )
}

function AgendarPartidaModal({ partida, campeonatoId, onSuccess, onClose, saveOverride }) {
  const { edicaoId } = useEdicao()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [localOptions, setLocalOptions] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await locaisService.list(edicaoId || undefined)
        if (!cancelled) setLocalOptions(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setLocalOptions([])
      }
    })()
    return () => { cancelled = true }
  }, [edicaoId])

  const initialValues = {
    rodada: partida.rodada ?? undefined,
    inicio_em: partida.inicio_em ? dayjs(partida.inicio_em) : null,
    local_id: partida.local_id ?? partida.local?.id ?? undefined,
  }

  const saveAgendamento = async (inicioEm, localId, rodada) => {
    setSaving(true)
    const isoValue = inicioEm ? inicioEm.second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss') : null
    const payload = { inicio_em: isoValue, local_id: localId ?? null, rodada: rodada ?? undefined }
    try {
      if (saveOverride) {
        await saveOverride(partida.id, payload)
      } else {
        await campeonatosService.agendarPartida(campeonatoId, partida.id, payload)
      }
      message.success(inicioEm ? 'Partida agendada com sucesso' : 'Agendamento removido')
      onSuccess()
    } catch (err) {
      message.error(err.message || 'Erro ao agendar partida')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await saveAgendamento(values.inicio_em, values.local_id, values.rodada)
    } catch (err) {
      if (err?.errorFields) return
      message.error(err.message || 'Erro ao agendar partida')
    }
  }

  const clearHorario = async () => {
    const localId = form.getFieldValue('local_id')
    const rodada = form.getFieldValue('rodada')
    await saveAgendamento(null, localId, rodada)
  }

  return (
    <Modal
      open
      title="Agendar partida"
      onCancel={onClose}
      destroyOnClose
      width={460}
      footer={(
        <div className="flex items-center justify-between gap-2">
          <Button
            danger
            type="text"
            disabled={saving || !partida.inicio_em}
            onClick={clearHorario}
          >
            Limpar horário
          </Button>
          <div className="flex items-center gap-2">
            <Button onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="primary" onClick={handleSave} loading={saving}>
              Salvar
            </Button>
          </div>
        </div>
      )}
    >
      <p className="text-sm text-[#64748b] mb-4">
        <strong>{equipeNome(partida, 'mandante')}</strong>
        {' vs '}
        <strong>{equipeNome(partida, 'visitante')}</strong>
      </p>
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="rodada" label="Rodada" rules={[{ type: 'integer', min: 1, message: 'Rodada deve ser ≥ 1' }]}>
          <InputNumber min={1} className="w-full" placeholder="Rodada definida pelo sistema" />
        </Form.Item>
        <Form.Item name="inicio_em" label="Data e horário do jogo">
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            placeholder="Selecionar data e horário"
            className="w-full"
          />
        </Form.Item>
        <Form.Item name="local_id" label="Local">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Selecionar local (opcional)"
            options={localOptions.map((l) => ({ value: l.id, label: l.nome }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function RegistrarResultadoManualModal({ partida, campeonatoId, onSuccess, onClose }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const tipo = Form.useWatch('resultado_tipo', form)
  const placarA = Form.useWatch('placar_a', form)
  const placarB = Form.useWatch('placar_b', form)
  const desistente = Form.useWatch('desistente_wxo', form)
  const isEditing = !!partida.resultado_tipo

  const initialValues = (() => {
    if (!partida.resultado_tipo) return { resultado_tipo: 'NORMAL' }
    return {
      resultado_tipo: partida.resultado_tipo,
      placar_a: partida.placar_mandante,
      placar_b: partida.placar_visitante,
      desistente_wxo: partida.resultado_tipo === 'WXO'
        ? (partida.vencedor_nome === partida.visitante_nome ? 'A' : 'B')
        : undefined,
    }
  })()

  const vencedorLabel = useMemo(() => {
    if (tipo === 'WXO' && desistente) return desistente === 'A' ? partida.visitante_nome : partida.mandante_nome
    if (tipo === 'NORMAL' && placarA != null && placarB != null) {
      if (placarA > placarB) return partida.mandante_nome
      if (placarB > placarA) return partida.visitante_nome
    }
    return null
  }, [tipo, placarA, placarB, desistente, partida])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const isWxo = values.resultado_tipo === 'WXO'
      let vencedorId = null
      if (isWxo && values.desistente_wxo) {
        vencedorId = values.desistente_wxo === 'A' ? partida.participante_b_id : partida.participante_a_id
      } else if (!isWxo && values.placar_a != null && values.placar_b != null) {
        if (values.placar_a > values.placar_b) vencedorId = partida.participante_a_id
        else if (values.placar_b > values.placar_a) vencedorId = partida.participante_b_id
      }
      await campeonatosService.atualizarManualConfronto(campeonatoId, partida.id, {
        resultado_tipo: values.resultado_tipo,
        placar_a: isWxo ? null : values.placar_a,
        placar_b: isWxo ? null : values.placar_b,
        vencedor_participante_id: vencedorId,
      })
      message.success('Resultado registrado com sucesso')
      onSuccess()
    } catch (err) {
      if (err?.errorFields) return
      message.error(err.message || 'Erro ao registrar resultado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={isEditing ? 'Editar resultado' : 'Registrar resultado'}
      onCancel={onClose}
      onOk={handleSave}
      okText={isEditing ? 'Alterar' : 'Salvar'}
      confirmLoading={saving}
      destroyOnClose
      width={420}
    >
      <p className="text-sm text-[#64748b] mb-4">
        <strong>{partida.mandante_nome || 'A'}</strong>{' vs '}<strong>{partida.visitante_nome || 'B'}</strong>
      </p>
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="resultado_tipo" label="Tipo de resultado">
          <Radio.Group>
            <Radio value="NORMAL">Normal</Radio>
            <Radio value="WXO">W.O.</Radio>
          </Radio.Group>
        </Form.Item>
        {tipo !== 'WXO' && (
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <Form.Item
              name="placar_a"
              label={partida.mandante_nome || 'A'}
              rules={[{ required: true, message: 'Obrigatório' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <div className="pb-[5px] text-[#94a3b8] font-semibold text-sm text-center">vs</div>
            <Form.Item
              name="placar_b"
              label={partida.visitante_nome || 'B'}
              rules={[{ required: true, message: 'Obrigatório' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>
        )}
        {tipo === 'WXO' && (
          <Form.Item
            name="desistente_wxo"
            label="Qual equipe cometeu o W.O.?"
            rules={[{ required: true, message: 'Selecione' }]}
          >
            <Radio.Group>
              <Radio value="A">{partida.mandante_nome}</Radio>
              <Radio value="B">{partida.visitante_nome}</Radio>
            </Radio.Group>
          </Form.Item>
        )}
        {vencedorLabel && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2 mt-1">
            <Trophy size={13} className="shrink-0" />
            <span>Vencedor: <strong>{vencedorLabel}</strong></span>
          </div>
        )}
      </Form>
    </Modal>
  )
}

function PartidasTimeline({ partidas, grupos, onSchedule, onRegister }) {
  const hojeRef = useRef(null)
  const hojeKey = dayjs().format('YYYY-MM-DD')

  const partidasValidas = useMemo(() => {
    return (partidas || [])
      .filter((partida) => !partida.is_bye)
      .slice()
      .sort((a, b) => {
        if (a.inicio_em && b.inicio_em) return new Date(a.inicio_em) - new Date(b.inicio_em)
        if (a.inicio_em) return -1
        if (b.inicio_em) return 1
        return sortPartidasOperacional(a, b)
      })
  }, [partidas])

  const gruposPorId = useMemo(() => {
    const map = new Map()
    ;(grupos || []).forEach((grupo) => map.set(grupo.id, grupo))
    return map
  }, [grupos])

  const gruposTimeline = useMemo(() => {
    const datedMap = new Map()
    const semData = []
    partidasValidas.forEach((partida) => {
      if (!partida.inicio_em) {
        semData.push(partida)
        return
      }

      const key = dayjs(partida.inicio_em).format('YYYY-MM-DD')
      if (!datedMap.has(key)) datedMap.set(key, [])
      datedMap.get(key).push(partida)
    })

    if (!datedMap.has(hojeKey)) {
      datedMap.set(hojeKey, [])
    }

    const datedGroups = Array.from(datedMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, items }))

    if (semData.length > 0) {
      datedGroups.push({
        key: 'sem-data',
        items: semData.sort(sortPartidasOperacional),
      })
    }

    return datedGroups
  }, [hojeKey, partidasValidas])

  useEffect(() => {
    if (!hojeRef.current) return
    requestAnimationFrame(() => {
      hojeRef.current?.scrollIntoView({ block: 'start' })
    })
  }, [gruposTimeline])

  if (partidasValidas.length === 0) {
    return (
      <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
        <p className="text-sm text-slate-400 m-0">Nenhuma partida gerada para este campeonato.</p>
      </div>
    )
  }

  const descricaoFase = (partida) => {
    if (partida.grupo_id) {
      const grupo = gruposPorId.get(partida.grupo_id)
      return `Grupo ${grupo?.nome || partida.grupo_id} · Rodada ${partida.rodada}`
    }
    return `${FASE_LABEL[partida.fase] || partida.fase} · Rodada ${partida.rodada}`
  }

  const tituloDia = (key) => {
    if (key === 'sem-data') return 'A definir horário'
    if (key === hojeKey) return 'Hoje'
    if (dayjs(key).isSame(dayjs().add(1, 'day'), 'day')) return 'Amanhã'
    return formatDia(`${key}T12:00:00`)
  }

  const placarOuVs = (partida) => {
    if (!partida.resultado_tipo) {
      return <span className="text-xl font-bold leading-none text-[#94a3b8]">-</span>
    }
    return (
      <span className="font-mono text-xl leading-none text-[#334155] font-bold">
        {partida.placar_mandante}–{partida.placar_visitante}
      </span>
    )
  }

  const criarSlotsHorario = (items) => {
    const map = new Map()
    items.forEach((partida) => {
      const key = partida.inicio_em ? dayjs(partida.inicio_em).format('HH:mm') : 'sem-horario'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(partida)
    })
    return Array.from(map.entries()).map(([key, slotItems]) => ({
      key,
      label: key === 'sem-horario' ? '--:--' : key,
      items: slotItems.sort((a, b) => sortPartidasOperacional(a, b)),
    }))
  }

  const menuPartida = (partida) => ({
    items: [
      onSchedule && {
        key: 'schedule',
        icon: <ClockCircleOutlined />,
        label: 'Definir Horário e Local',
      },
      onRegister && {
        key: 'result',
        icon: <EditOutlined />,
        label: 'Registrar Resultado',
      },
    ].filter(Boolean),
    onClick: ({ key }) => {
      if (key === 'schedule') {
        onSchedule?.(partida)
        return
      }
      onRegister?.(partida)
    },
  })

  return (
    <div className="flex flex-col gap-5">
      {gruposTimeline.map(({ key, items }) => (
        <section
          key={key}
          ref={key === hojeKey ? hojeRef : null}
          className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden scroll-mt-4"
        >
          <div className="px-5 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]">
            <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider m-0">
              {items.length} partida{items.length !== 1 ? 's' : ''}
            </p>
            <h2 className="text-base font-bold text-[#042f2e] m-0 mt-0.5">
              {tituloDia(key)}
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-[4.55rem] top-0 bottom-0 w-px bg-[#e2e8f0]" />
            {items.length === 0 && key === hojeKey ? (
              <div className="relative flex gap-4 px-5 py-4">
                <div className="w-16 shrink-0" />
                <div className="relative shrink-0 pt-2">
                  <span className="block w-3 h-3 rounded-full bg-white border-2 border-[#cbd5e1]" />
                </div>
                <div className="flex-1 min-w-0 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
                  <p className="text-sm font-semibold text-[#334155] m-0">Nenhuma partida agendada hoje</p>
                </div>
              </div>
            ) : criarSlotsHorario(items).map((slot) => (
              <div key={slot.key} className="relative flex gap-4 px-5 py-4 border-b border-[#f8fafc] last:border-b-0">
                <div className="w-16 shrink-0 text-right pt-1">
                  <span className={`text-sm font-bold ${slot.key === 'sem-horario' ? 'text-[#94a3b8]' : 'text-[#0f766e]'}`}>
                    {slot.label}
                  </span>
                </div>
                <div className="relative shrink-0 pt-2">
                  <span className="block w-3 h-3 rounded-full bg-white border-2 border-[#0f766e]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  {slot.items.map((partida) => {
                    const finalizada = !!partida.resultado_tipo
                    return (
                      <div key={partida.id} className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
                                {descricaoFase(partida)}
                              </span>
                              {finalizada && <Tag color="green" className="m-0">Resultado registrado</Tag>}
                            </div>
                            <div className="grid grid-cols-[minmax(0,1fr)_5.25rem_minmax(0,1fr)] items-center gap-3">
                              <span className={`text-sm truncate ${ladoVenceu(partida, 'mandante') ? 'font-bold text-emerald-700' : 'font-semibold text-[#1e293b]'}`}>
                                {equipeNome(partida, 'mandante')}
                              </span>
                              <span className="text-center whitespace-nowrap">
                                {placarOuVs(partida)}
                              </span>
                              <span className={`text-sm truncate text-right ${ladoVenceu(partida, 'visitante') ? 'font-bold text-emerald-700' : 'font-semibold text-[#1e293b]'}`}>
                                {equipeNome(partida, 'visitante')}
                              </span>
                            </div>
                          </div>
                          {(onSchedule || onRegister) && (
                            <Dropdown menu={menuPartida(partida)} trigger={['click']} placement="bottomRight">
                              <Button
                                size="small"
                                type="text"
                                icon={<MoreOutlined />}
                                aria-label="Ações da partida"
                              />
                            </Dropdown>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ── GrupoSection ──────────────────────────────────────────────────────────────
function GrupoSection({ grupo, partidas, campeonatoId, config, onRegister, refreshKey, wildcardEquipeIds, wildcardRanking, bloqueado, isManual, onRefresh }) {
  const partidasGrupo = partidas.filter((p) => p.grupo_id === grupo.id && !p.is_bye)

  const handlePartidaClick = (p) => {
    if (!onRegister) return
    if (bloqueado) {
      message.warning('A fase de grupos está encerrada. Resultados não podem ser alterados após o início das eliminatórias.')
      return
    }
    onRegister(p)
  }

  if (isManual) {
    const equipes = grupo.equipes || []
    return (
      <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
        <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0]">
          <h3 className="font-bold text-[#042f2e] m-0 text-sm">GRUPO {grupo.nome}</h3>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">
            Equipes ({equipes.length})
          </p>
          {equipes.length === 0 ? (
            <p className="text-sm text-[#94a3b8]">Nenhuma equipe neste grupo.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {equipes.map((eq, idx) => (
                <div
                  key={eq.equipe_id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                >
                  <span className="text-xs font-bold text-[#94a3b8] w-5 shrink-0 text-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-[#1e293b] truncate">{eq.nome_escola}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
      <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0]">
        <h3 className="font-bold text-[#042f2e] m-0 text-sm">GRUPO {grupo.nome}</h3>
      </div>
      <div className="p-4 flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex-[3] min-w-0">
          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">Classificação</p>
          <ClassificacaoGrupo
            campeonatoId={campeonatoId}
            grupoId={grupo.id}
            classificadosDiretos={grupo.classificados_diretos ?? 1}
            config={config}
            refreshKey={refreshKey}
            wildcardEquipeIds={wildcardEquipeIds}
            wildcardRanking={wildcardRanking}
            onRefresh={onRefresh}
          />
        </div>
        <div className="flex-[2] min-w-0">
          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">Partidas</p>
          <div className="flex flex-col gap-2">
            {partidasGrupo.length === 0 && (
              <p className="text-sm text-[#94a3b8]">Nenhuma partida neste grupo.</p>
            )}
            {partidasGrupo.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] transition-colors ${
                  bloqueado || !onRegister ? 'cursor-default opacity-80' : 'cursor-pointer hover:border-teal-400'
                }`}
                onClick={() => handlePartidaClick(p)}
              >
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <span
                    className={`text-xs truncate ${
                      p.vencedor_equipe_id === p.mandante_equipe_id
                        ? 'font-bold text-emerald-700'
                        : 'text-[#334155]'
                    }`}
                  >
                    {p.mandante_nome || `Equipe ${p.mandante_equipe_id}`}
                  </span>
                  {p.resultado_tipo ? (
                    <span className="text-xs font-mono text-[#334155] shrink-0 mx-1">
                      {p.placar_mandante}–{p.placar_visitante}
                      {p.resultado_tipo === 'WXO' && (
                        <span className="text-amber-600 text-[10px] ml-1">WxO</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[#94a3b8] text-xs shrink-0 mx-1">vs</span>
                  )}
                  <span
                    className={`text-xs truncate ${
                      p.vencedor_equipe_id === p.visitante_equipe_id
                        ? 'font-bold text-emerald-700'
                        : 'text-[#334155]'
                    }`}
                  >
                    {p.visitante_nome || `Equipe ${p.visitante_equipe_id}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Bracket team slot ─────────────────────────────────────────────────────────
function BracketTeamSlot({ name, score, isWinner }) {
  return (
    <div
      style={{ height: TEAM_H }}
      className={`flex items-center justify-between px-2.5 gap-1 ${isWinner ? 'bg-emerald-50' : ''}`}
    >
      <span
        className={`text-[11px] truncate flex-1 min-w-0 leading-tight ${
          isWinner
            ? 'font-semibold text-emerald-700'
            : name
            ? 'text-slate-700'
            : 'text-slate-400 italic'
        }`}
      >
        {name || 'A definir'}
      </span>
      {score !== null && score !== undefined && (
        <span
          className={`text-[11px] font-mono shrink-0 ml-1 ${
            isWinner ? 'font-bold text-emerald-700' : 'text-slate-500'
          }`}
        >
          {score}
        </span>
      )}
    </div>
  )
}

// ── Bracket match box ─────────────────────────────────────────────────────────
function BracketMatchBox({ partida, top, left, onRegister, slotConcluidoMap }) {
  const hasResult = !!partida.resultado_tipo
  const v = partida.vencedor_equipe_id
  const isBye = partida.is_bye

  // Verifica se o slot (SEED_N) já teve seu grupo classificatório concluído.
  // Slots de rodadas posteriores (R1M1 etc.) sempre retornam true — já são preenchidos
  // pelo backend apenas quando o vencedor é determinado.
  function slotOk(origemSlot) {
    if (hasResult || !origemSlot || !slotConcluidoMap) return true
    const m = origemSlot.match(/^SEED_(\d+)$/)
    if (!m) return true
    return slotConcluidoMap[parseInt(m[1])] ?? true
  }

  const mandanteOk = slotOk(partida.origem_slot_a)
  const visitanteOk = slotOk(partida.origem_slot_b)

  const mandanteName = mandanteOk ? (partida.mandante_nome || (partida.mandante_equipe_id ? `Equipe ${partida.mandante_equipe_id}` : null)) : null
  const visitanteEffectiveName = visitanteOk ? (partida.visitante_nome || (partida.visitante_equipe_id ? `Equipe ${partida.visitante_equipe_id}` : null)) : null
  const visitanteName = isBye && !partida.visitante_equipe_id ? 'WO' : visitanteEffectiveName

  const bothDefined = !!mandanteName && !!visitanteEffectiveName
  const canClick = !isBye && bothDefined && !!onRegister

  return (
    <div
      style={{ position: 'absolute', top, left, width: ROUND_W, height: MATCH_H }}
      className={`rounded-lg overflow-hidden bg-white border transition-all ${
        canClick ? 'cursor-pointer hover:border-teal-400 hover:shadow-sm' : 'cursor-default opacity-80'
      } ${hasResult ? 'border-slate-300' : 'border-slate-200'}`}
      onClick={() => canClick && onRegister(partida)}
      title={isBye ? 'Classificado por WO' : !bothDefined ? 'Aguardando definição de equipes' : hasResult ? 'Editar resultado' : 'Registrar resultado'}
    >
      <BracketTeamSlot
        name={mandanteName}
        score={hasResult ? partida.placar_mandante : null}
        isWinner={mandanteOk && v !== null && v === partida.mandante_equipe_id}
      />
      <div style={{ height: DIVIDER_H }} className="bg-slate-100" />
      <BracketTeamSlot
        name={visitanteName}
        score={hasResult ? partida.placar_visitante : null}
        isWinner={visitanteOk && v !== null && v === partida.visitante_equipe_id}
      />
    </div>
  )
}

// ── Tournament bracket ────────────────────────────────────────────────────────
function TournamentBracket({ matches, onRegister, slotConcluidoMap }) {
  const mainMatches = matches.filter(
    (m) => BRACKET_PHASES.includes(m.fase) && (!m.is_bye || m.vencedor_equipe_id !== null)
  )
  const terceiroMatches = matches.filter((m) => m.fase === 'TERCEIRO' && !m.is_bye)

  const phasesPresent = BRACKET_PHASES.filter((p) => mainMatches.some((m) => m.fase === p))

  if (phasesPresent.length === 0) {
    return <p className="text-sm text-slate-400">Nenhuma partida eliminatória gerada.</p>
  }

  const matchesByPhase = {}
  for (const p of phasesPresent) {
    matchesByPhase[p] = mainMatches.filter((m) => m.fase === p).sort((a, b) => a.id - b.id)
  }

  const firstCount = matchesByPhase[phasesPresent[0]].length
  const contH = bracketHeight(firstCount)
  const contW = bracketWidth(phasesPresent.length)
  const roundsData = phasesPresent.map((p) => matchesByPhase[p])
  const connPaths = buildConnectorPaths(roundsData)

  return (
    <div className="flex flex-col gap-4">
      {/* Column headers */}
      <div className="flex" style={{ width: contW }}>
        {phasesPresent.map((phase, i) => (
          <div
            key={phase}
            style={{ width: ROUND_W, marginLeft: i === 0 ? 0 : CONNECTOR_W }}
            className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
          >
            {FASE_LABEL[phase] || phase}
          </div>
        ))}
      </div>

      {/* Bracket canvas */}
      <div className="overflow-x-auto pb-2">
        <div className="relative" style={{ width: contW, height: contH }}>
          {/* Connector SVG */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
            width={contW}
            height={contH}
          >
            {connPaths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#e2e8f0" strokeWidth={1.5} strokeLinecap="round" />
            ))}
          </svg>

          {/* Match boxes */}
          {phasesPresent.map((phase, rIdx) =>
            matchesByPhase[phase].map((partida, mIdx) => (
              <BracketMatchBox
                key={partida.id}
                partida={partida}
                top={matchTop(rIdx, mIdx)}
                left={columnLeft(rIdx)}
                onRegister={onRegister}
                slotConcluidoMap={slotConcluidoMap}
              />
            ))
          )}
        </div>
      </div>

      {/* 3rd place match */}
      {terceiroMatches.length > 0 && (
        <div className="flex flex-col gap-2 pt-4 border-t border-[#f1f5f9]">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Disputa de 3º Lugar
          </p>
          {terceiroMatches.map((p) => (
            <div
              key={p.id}
              style={{ width: ROUND_W * 1.4 }}
              className={`border border-slate-200 rounded-lg overflow-hidden bg-white transition-all ${
                onRegister ? 'cursor-pointer hover:border-teal-400 hover:shadow-sm' : 'cursor-default opacity-80'
              }`}
              onClick={() => onRegister?.(p)}
            >
              <BracketTeamSlot
                name={p.mandante_nome || (p.mandante_equipe_id ? `Equipe ${p.mandante_equipe_id}` : null)}
                score={p.resultado_tipo ? p.placar_mandante : null}
                isWinner={p.vencedor_equipe_id === p.mandante_equipe_id && p.vencedor_equipe_id !== null}
              />
              <div style={{ height: DIVIDER_H }} className="bg-slate-100" />
              <BracketTeamSlot
                name={p.visitante_nome || (p.visitante_equipe_id ? `Equipe ${p.visitante_equipe_id}` : null)}
                score={p.resultado_tipo ? p.placar_visitante : null}
                isWinner={p.vencedor_equipe_id === p.visitante_equipe_id && p.vencedor_equipe_id !== null}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ManualDataEditor({ campeonatoId, manualData, onRefresh }) {
  const { edicaoId } = useEdicao()
  const [modal, setModal] = useState({ tipo: null, record: null })
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [localOptions, setLocalOptions] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await locaisService.list(edicaoId || undefined)
        if (!cancelled) setLocalOptions(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setLocalOptions([])
      }
    })()
    return () => { cancelled = true }
  }, [edicaoId])

  const participantes = useMemo(() => manualData?.participantes || [], [manualData])
  const participanteOptions = participantes.map((p) => ({ value: p.id, label: p.nome_exibicao }))

  // Watches para o form de confronto
  const modalResultadoTipo = Form.useWatch('resultado_tipo', form)
  const modalPlacarA = Form.useWatch('placar_a', form)
  const modalPlacarB = Form.useWatch('placar_b', form)
  const modalParA = Form.useWatch('participante_a_id', form)
  const modalParB = Form.useWatch('participante_b_id', form)

  // Opções do select "Vencedor" — só os dois participantes escolhidos
  const vencedorOptions = useMemo(() => {
    const opts = []
    if (modalParA) {
      const p = participantes.find((p) => p.id === modalParA)
      if (p) opts.push({ value: p.id, label: p.nome_exibicao })
    }
    if (modalParB) {
      const p = participantes.find((p) => p.id === modalParB)
      if (p) opts.push({ value: p.id, label: p.nome_exibicao })
    }
    return opts
  }, [modalParA, modalParB, participantes])

  // Auto-preenche vencedor com base nos placares
  useEffect(() => {
    if (modal.tipo !== 'confronto' || modalResultadoTipo !== 'NORMAL') return
    if (modalPlacarA == null || modalPlacarB == null) return
    if (modalPlacarA > modalPlacarB && modalParA) {
      form.setFieldValue('vencedor_participante_id', modalParA)
    } else if (modalPlacarB > modalPlacarA && modalParB) {
      form.setFieldValue('vencedor_participante_id', modalParB)
    }
  }, [modalResultadoTipo, modalPlacarA, modalPlacarB, modalParA, modalParB, modal.tipo, form])

  const openModal = (tipo, record = null) => {
    setModal({ tipo, record })
    if (!record) {
      form.resetFields()
      if (tipo === 'classificacao') form.setFieldsValue({ grupo_nome: 'Geral', posicao: (manualData?.classificacao?.length || 0) + 1, ordem: 1 })
      if (tipo === 'confronto') form.setFieldsValue({ fase: 'GRUPOS', rodada: 1, ordem: 1, resultado_tipo: 'NORMAL' })
      return
    }
    const vals = { ...record }
    delete vals.local
    form.setFieldsValue({
      ...vals,
      inicio_em: record.inicio_em ? dayjs(record.inicio_em) : null,
    })
  }

  const closeModal = () => {
    setModal({ tipo: null, record: null })
    form.resetFields()
  }

  const cleanPayload = (values) => {
    const payload = { ...values }
    delete payload.local
    if (payload.inicio_em) payload.inicio_em = payload.inicio_em.toISOString()
    for (const key of ['grupo_nome']) {
      if (typeof payload[key] === 'string') payload[key] = payload[key].trim()
    }
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') payload[key] = null
    })
    return payload
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload = cleanPayload(values)
    setSaving(true)
    try {
      if (modal.tipo === 'confronto') {
        if (modal.record) {
          await campeonatosService.atualizarManualConfronto(campeonatoId, modal.record.id, payload)
        } else {
          await campeonatosService.criarManualConfronto(campeonatoId, payload)
        }
      }
      if (modal.tipo === 'classificacao') {
        if (modal.record) {
          await campeonatosService.atualizarManualClassificacao(campeonatoId, modal.record.id, payload)
        } else {
          await campeonatosService.criarManualClassificacao(campeonatoId, payload)
        }
      }
      message.success('Dados salvos.')
      closeModal()
      onRefresh()
    } catch (err) {
      message.error(err.message || 'Erro ao salvar dados manuais')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (tipo, record) => {
    Modal.confirm({
      title: 'Excluir registro',
      content: 'Esta ação remove o item do campeonato manual.',
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Voltar',
      onOk: async () => {
        if (tipo === 'confronto') await campeonatosService.excluirManualConfronto(campeonatoId, record.id)
        if (tipo === 'classificacao') await campeonatosService.excluirManualClassificacao(campeonatoId, record.id)
        onRefresh()
      },
    })
  }

  const actionRender = (tipo) => (_, record) => (
    <div className="flex gap-2">
      <Button size="small" onClick={() => openModal(tipo, record)}>Editar</Button>
      <Button size="small" danger onClick={() => confirmDelete(tipo, record)}>Excluir</Button>
    </div>
  )

  const modalTitle = {
    confronto: modal.record ? 'Editar confronto' : 'Novo confronto',
    classificacao: modal.record ? 'Editar classificação' : 'Nova classificação',
  }[modal.tipo]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="bg-white rounded-[12px] border border-[#f1f5f9] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-[#042f2e] m-0">Participantes</h3>
        </div>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={participantes}
          columns={[
            { title: 'Nome', dataIndex: 'nome_exibicao', key: 'nome_exibicao' },
            { title: 'Ordem', dataIndex: 'ordem', key: 'ordem', width: 70 },
          ]}
        />
      </section>

      <section className="bg-white rounded-[12px] border border-[#f1f5f9] p-4 xl:col-span-2">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-[#042f2e] m-0">Confrontos e resultados</h3>
          <Button size="small" type="primary" onClick={() => openModal('confronto')}>Adicionar</Button>
        </div>
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 5 }}
          dataSource={manualData?.confrontos || []}
          columns={[
            { title: 'Fase', dataIndex: 'fase', key: 'fase', render: (v) => FASE_LABEL[v] || v },
            { title: 'Confronto', key: 'confronto', render: (_, r) => `${r.participante_a_nome || 'A definir'} x ${r.participante_b_nome || 'A definir'}` },
            { title: 'Local', key: 'local', width: 140, ellipsis: true, render: (_, r) => r.local?.nome || '—' },
            { title: 'Placar', key: 'placar', width: 90, render: (_, r) => r.resultado_tipo ? `${r.placar_a ?? '-'}-${r.placar_b ?? '-'}` : '-' },
            { title: 'Ações', key: 'acoes', width: 140, render: actionRender('confronto') },
          ]}
        />
      </section>

      <section className="bg-white rounded-[12px] border border-[#f1f5f9] p-4 xl:col-span-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-[#042f2e] m-0">Classificação manual</h3>
          <Button size="small" type="primary" onClick={() => openModal('classificacao')}>Adicionar</Button>
        </div>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={manualData?.classificacao || []}
          columns={[
            { title: '#', dataIndex: 'posicao', key: 'posicao', width: 60 },
            { title: 'Participante', dataIndex: 'nome_exibicao', key: 'nome_exibicao' },
            { title: 'PTS', dataIndex: 'pontos', key: 'pontos', width: 70 },
            { title: 'V', dataIndex: 'vitorias', key: 'vitorias', width: 60 },
            { title: 'E', dataIndex: 'empates', key: 'empates', width: 60 },
            { title: 'D', dataIndex: 'derrotas', key: 'derrotas', width: 60 },
            { title: 'Saldo', dataIndex: 'saldo', key: 'saldo', width: 80 },
            { title: 'Ações', key: 'acoes', width: 140, render: actionRender('classificacao') },
          ]}
        />
      </section>

      <Modal
        open={!!modal.tipo}
        title={modalTitle}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {modal.tipo === 'confronto' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Form.Item name="fase" label="Fase" rules={[{ required: true }]}>
                  <Select options={FASE_OPTIONS_CONFRONTO} />
                </Form.Item>
                <Form.Item name="rodada" label="Rodada" rules={[{ required: true }]}>
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
              </div>
              <Form.Item
                name="participante_a_id"
                label="Participante A"
                rules={[{ required: true, message: 'Selecione o Participante A' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Buscar escola..."
                  options={participanteOptions}
                  onChange={() => form.setFieldValue('vencedor_participante_id', undefined)}
                />
              </Form.Item>
              <Form.Item
                name="participante_b_id"
                label="Participante B"
                rules={[{ required: true, message: 'Selecione o Participante B' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Buscar escola..."
                  options={participanteOptions}
                  onChange={() => form.setFieldValue('vencedor_participante_id', undefined)}
                />
              </Form.Item>
              <div className="grid grid-cols-2 gap-3">
                <Form.Item name="inicio_em" label="Data e horário">
                  <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
                </Form.Item>
                <Form.Item name="resultado_tipo" label="Resultado">
                  <Select
                    allowClear
                    options={[
                      { value: 'NORMAL', label: 'Normal' },
                      { value: 'WXO', label: 'W.O.' },
                      { value: 'ADIADA', label: 'Adiada' },
                      { value: 'CANCELADA', label: 'Cancelada' },
                    ]}
                  />
                </Form.Item>
              </div>
              <Form.Item name="local_id" label="Local">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Selecionar local (opcional)"
                  options={localOptions.map((l) => ({ value: l.id, label: l.nome }))}
                />
              </Form.Item>
              {modalResultadoTipo === 'NORMAL' && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <Form.Item
                    name="placar_a"
                    label={participantes.find((p) => p.id === modalParA)?.nome_exibicao || 'Placar A'}
                  >
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                  <div className="pb-[5px] text-[#94a3b8] font-semibold text-sm text-center">vs</div>
                  <Form.Item
                    name="placar_b"
                    label={participantes.find((p) => p.id === modalParB)?.nome_exibicao || 'Placar B'}
                  >
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                </div>
              )}
              <Form.Item name="vencedor_participante_id" label="Vencedor">
                <Select
                  allowClear
                  options={vencedorOptions}
                  placeholder={vencedorOptions.length === 0 ? 'Selecione os participantes primeiro' : 'Selecionar vencedor'}
                />
              </Form.Item>
              <Form.Item name="ordem" label="Ordem de exibição" rules={[{ required: true }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </>
          )}

          {modal.tipo === 'classificacao' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Form.Item name="grupo_nome" label="Grupo" rules={[{ required: true }]}>
                  <Input maxLength={40} />
                </Form.Item>
                <Form.Item name="posicao" label="Posição" rules={[{ required: true }]}>
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
              </div>
              <Form.Item name="participante_id" label="Participante" rules={[{ required: true, message: 'Selecione o participante.' }]}>
                <Select options={participanteOptions} />
              </Form.Item>
              <div className="grid grid-cols-4 gap-3">
                <Form.Item name="pontos" label="PTS"><InputNumber className="w-full" /></Form.Item>
                <Form.Item name="vitorias" label="V"><InputNumber min={0} className="w-full" /></Form.Item>
                <Form.Item name="empates" label="E"><InputNumber min={0} className="w-full" /></Form.Item>
                <Form.Item name="derrotas" label="D"><InputNumber min={0} className="w-full" /></Form.Item>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Form.Item name="pro" label="Pró"><InputNumber className="w-full" /></Form.Item>
                <Form.Item name="contra" label="Contra"><InputNumber className="w-full" /></Form.Item>
                <Form.Item name="saldo" label="Saldo"><InputNumber className="w-full" /></Form.Item>
              </div>
              <Form.Item name="observacao" label="Observação">
                <Input maxLength={255} />
              </Form.Item>
              <Form.Item name="ordem" label="Ordem" rules={[{ required: true }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CampeonatoDetalhe() {
  const { id } = useParams()
  const campeonatoId = parseInt(id, 10)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [estrutura, setEstrutura] = useState(null)
  const [campeonato, setCampeonato] = useState(null)
  const [manualData, setManualData] = useState(null)
  const [config, setConfig] = useState(null)
  const [activeTab, setActiveTab] = useState('partidas')
  const [manualOpen, setManualOpen] = useState(true)
  const [modalPartida, setModalPartida] = useState(null)
  const [modalAgendamento, setModalAgendamento] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [vencedorEquipe, setVencedorEquipe] = useState(null)
  const [modalManualPartida, setModalManualPartida] = useState(null)
  const [modalManualAgendamento, setModalManualAgendamento] = useState(null)
  const [modalArtilheiros, setModalArtilheiros] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [estruturaData, campeonatoData] = await Promise.all([
        campeonatosService.getEstrutura(campeonatoId),
        campeonatosService.getById(campeonatoId),
      ])
      setEstrutura(estruturaData)
      setCampeonato(campeonatoData)
      if (campeonatoData?.origem === 'MANUAL') {
        const manual = await campeonatosService.getManual(campeonatoId)
        setManualData(manual)
      } else {
        setManualData(null)
      }
      try {
        const cfg = await campeonatosService.getConfigPontuacao(campeonatoId)
        setConfig(cfg)
      } catch {
        setConfig(null)
      }
    } catch (err) {
      message.error(err.message || 'Erro ao carregar campeonato')
    } finally {
      setLoading(false)
    }
  }, [campeonatoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleResultadoSalvo = (payload) => {
    const partida = modalPartida
    setModalPartida(null)
    setRefreshKey((k) => k + 1)
    fetchData()
    if (payload?.resultado_tipo !== 'WXO') {
      setModalArtilheiros({
        ...partida,
        placar_mandante: payload?.placar_mandante ?? partida.placar_mandante,
        placar_visitante: payload?.placar_visitante ?? partida.placar_visitante,
        resultado_tipo: payload?.resultado_tipo ?? partida.resultado_tipo,
      })
    }
  }

  const handleAgendamentoSalvo = () => {
    setModalAgendamento(null)
    fetchData()
  }

  const handleManualResultadoSalvo = () => {
    setModalManualPartida(null)
    fetchData()
  }

  const handleManualAgendamentoSalvo = () => {
    setModalManualAgendamento(null)
    fetchData()
  }

  const handleManualRegister = useCallback((partida) => {
    const confronto = (manualData?.confrontos || []).find((c) => c.id === partida.id)
    setModalManualPartida({
      ...partida,
      participante_a_id: confronto?.participante_a_id ?? null,
      participante_b_id: confronto?.participante_b_id ?? null,
    })
  }, [manualData])

  const handleManualAgendarSave = useCallback(async (confrontoId, payload) => {
    await campeonatosService.atualizarManualConfronto(campeonatoId, confrontoId, payload)
  }, [campeonatoId])

  const hasGroups = (estrutura?.grupos?.length || 0) > 0
  const hasKnockout = (estrutura?.partidas || []).some((p) => p.grupo_id === null)
  const hasPlayablePartidas = (estrutura?.partidas || []).some((p) => !p.is_bye)
  const isApenasEliminatorias = campeonato?.origem === 'MANUAL' && campeonato?.tem_fase_grupos === false
  // Mapeia seed number → se o grupo que o originou já concluiu todas as partidas.
  // Seeds são atribuídos sequencialmente pelos grupos ordenados por `ordem`,
  // cada grupo contribuindo `classificados_diretos` seeds.
  // Slots wildcard (equipe_id já é NULL no banco) não precisam de mascaramento aqui.
  const slotConcluidoMap = useMemo(() => {
    if (!hasGroups || !estrutura) return null
    const grupos = [...(estrutura.grupos || [])].sort((a, b) => a.ordem - b.ordem)
    const map = {}
    let seedIdx = 1
    for (const grupo of grupos) {
      const partidasGrupo = (estrutura.partidas || []).filter((p) => p.grupo_id === grupo.id && !p.is_bye)
      const concluido = partidasGrupo.length > 0 && partidasGrupo.every((p) => !!p.resultado_tipo)
      for (let i = 0; i < (grupo.classificados_diretos || 1); i++) {
        map[seedIdx] = concluido
        seedIdx++
      }
    }
    return map
  }, [hasGroups, estrutura])
  const gruposBloqueados = (estrutura?.partidas || []).some(
    (p) => p.grupo_id === null && !p.is_bye && !!p.resultado_tipo
  )

  useEffect(() => {
    if (estrutura && activeTab === 'grupos' && (!hasGroups || isApenasEliminatorias) && hasKnockout) {
      setActiveTab('eliminatorias')
    }
  }, [estrutura, activeTab, hasGroups, hasKnockout, isApenasEliminatorias])

  useEffect(() => {
    if (estrutura && activeTab === 'partidas' && (!hasGroups || isApenasEliminatorias) && hasKnockout && !hasPlayablePartidas) {
      setActiveTab('eliminatorias')
    }
  }, [estrutura, activeTab, hasGroups, hasKnockout, hasPlayablePartidas, isApenasEliminatorias])

  useEffect(() => {
    if (campeonato?.status !== 'FINALIZADO' || !estrutura) return
    const finalPartida = findCampeao(campeonato, estrutura.partidas || [])
    if (!finalPartida) return
    equipesService.getById(finalPartida.vencedor_equipe_id)
      .then(setVencedorEquipe)
      .catch(() => {})
  }, [campeonato, estrutura])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    )
  }

  if (!estrutura) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-[#64748b]">Campeonato não encontrado.</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    )
  }

  const nomeCampeonato = campeonato?.nome || `Campeonato #${campeonatoId}`
  const status = campeonato?.status
  const isManual = campeonato?.origem === 'MANUAL'
  const subtitulo = campeonato
    ? [campeonato.esporte_nome, campeonato.categoria_nome, campeonato.naipe_nome]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[520px] flex-col gap-4 overflow-hidden">
      <div className="shrink-0 bg-[#f8fafc]">
        {/* Header */}
        <header className="flex items-start gap-3">
          <Button
            icon={<ArrowLeft size={16} />}
            type="text"
            onClick={() => navigate(-1)}
            className="mt-1 px-2 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
                {nomeCampeonato}
              </h1>
              {status && (
                <Tag color={STATUS_COLORS[status] || 'default'} className="ml-1">
                  {STATUS_LABELS[status] || status}
                </Tag>
              )}
              {isManual && <Tag color="purple" className="ml-1">Manual</Tag>}
            </div>
            {subtitulo && (
              <p className="text-[0.9375rem] text-[#64748b] m-0 mt-0.5">{subtitulo}</p>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="mt-4 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex gap-0 p-2 border-b border-[#f1f5f9]">
            <button
              type="button"
              onClick={() => setActiveTab('partidas')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer ${
                activeTab === 'partidas'
                  ? 'bg-[#f1f5f9] text-[#0f766e]'
                  : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
              }`}
            >
              <BarsOutlined />
              Partidas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grupos')}
              disabled={!hasGroups || isApenasEliminatorias}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'grupos'
                  ? 'bg-[#f1f5f9] text-[#0f766e]'
                  : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
              }`}
            >
              <AppstoreOutlined />
              Fase de Grupos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('eliminatorias')}
              disabled={!hasKnockout}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'eliminatorias'
                  ? 'bg-[#f1f5f9] text-[#0f766e]'
                  : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
              }`}
            >
              <PartitionOutlined />
              Eliminatórias
            </button>
          </div>
        </div>

        {/* Manual data collapsible */}
        {isManual && (
          <div className="mt-4 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <button
              type="button"
              onClick={() => setManualOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f8fafc] transition-colors border-0 cursor-pointer bg-transparent"
            >
              <span className="text-sm font-semibold text-[#042f2e]">
                Participantes · Confrontos e Resultados · Classificação Manual
              </span>
              <ChevronDown
                size={15}
                className="text-[#64748b] shrink-0 transition-transform duration-200"
                style={{ transform: manualOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {manualOpen && (
              <div className="border-t border-[#f1f5f9] p-4 max-h-[42vh] overflow-y-auto">
                <ManualDataEditor
                  campeonatoId={campeonatoId}
                  manualData={manualData}
                  onRefresh={fetchData}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        {/* Tab content */}
        {activeTab === 'partidas' && (
          <PartidasTimeline
            partidas={estrutura.partidas}
            grupos={estrutura.grupos}
            onSchedule={isManual ? setModalManualAgendamento : setModalAgendamento}
            onRegister={isManual ? handleManualRegister : setModalPartida}
          />
        )}

        {activeTab === 'grupos' && (
          <div className={isManual ? 'grid grid-cols-2 lg:grid-cols-3 gap-4 items-start' : 'flex flex-col gap-4'}>
            {!hasGroups ? (
              <p className="text-sm text-slate-400">Este campeonato não possui fase de grupos.</p>
            ) : (
              estrutura.grupos.map((grupo) => (
                <GrupoSection
                  key={grupo.id}
                  grupo={grupo}
                  partidas={estrutura.partidas}
                  campeonatoId={campeonatoId}
                  config={config}
                  onRegister={isManual ? undefined : setModalPartida}
                  refreshKey={refreshKey}
                  wildcardEquipeIds={estrutura.wildcard_equipe_ids ?? []}
                  wildcardRanking={estrutura.wildcard_ranking ?? []}
                  bloqueado={gruposBloqueados}
                  isManual={isManual}
                  onRefresh={fetchData}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'eliminatorias' && (
          <div className="flex flex-col gap-4">
            {campeonato?.status === 'FINALIZADO' && (() => {
              const finalPartida = findCampeao(campeonato, estrutura.partidas || [])
              return finalPartida ? (
                <VencedorBanner
                  vencedorNome={finalPartida.vencedor_nome || `Equipe ${finalPartida.vencedor_equipe_id}`}
                  equipe={vencedorEquipe}
                />
              ) : null
            })()}
            <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
              <TournamentBracket
                matches={estrutura.partidas.filter((p) => p.grupo_id === null)}
                onRegister={isManual ? handleManualRegister : setModalPartida}
                slotConcluidoMap={slotConcluidoMap}
              />
            </div>
          </div>
        )}
      </div>

      {/* Result modal */}
      {modalPartida && (
        <RegistrarResultadoModal
          partida={modalPartida}
          config={config}
          campeonatoId={campeonatoId}
          onSuccess={handleResultadoSalvo}
          onClose={() => setModalPartida(null)}
        />
      )}

      {/* Artilheiros / Penalidades modal */}
      {modalArtilheiros && (
        <RegistrarArtilheirosModal
          partida={modalArtilheiros}
          campeonatoId={campeonatoId}
          registraArtilheiro={!!config?.registra_artilheiro}
          onClose={() => setModalArtilheiros(null)}
        />
      )}

      {modalAgendamento && (
        <AgendarPartidaModal
          partida={modalAgendamento}
          campeonatoId={campeonatoId}
          onSuccess={handleAgendamentoSalvo}
          onClose={() => setModalAgendamento(null)}
        />
      )}

      {modalManualPartida && (
        <RegistrarResultadoManualModal
          partida={modalManualPartida}
          campeonatoId={campeonatoId}
          onSuccess={handleManualResultadoSalvo}
          onClose={() => setModalManualPartida(null)}
        />
      )}

      {modalManualAgendamento && (
        <AgendarPartidaModal
          partida={modalManualAgendamento}
          campeonatoId={campeonatoId}
          onSuccess={handleManualAgendamentoSalvo}
          onClose={() => setModalManualAgendamento(null)}
          saveOverride={handleManualAgendarSave}
        />
      )}
    </div>
  )
}
