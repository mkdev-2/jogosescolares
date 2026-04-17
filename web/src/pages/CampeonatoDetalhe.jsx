import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Form, InputNumber, Modal, Radio, Table, Tag, message, Spin } from 'antd'
import { ArrowLeft, Trophy } from 'lucide-react'
import { campeonatosService } from '../services/campeonatosService'

// ── Bracket layout constants ──────────────────────────────────────────────────
const TEAM_H = 36
const DIVIDER_H = 1
const MATCH_H = TEAM_H * 2 + DIVIDER_H   // 73px
const MATCH_GAP = 20                       // gap between matches in round 0
const UNIT = MATCH_H + MATCH_GAP          // 93px per match slot
const ROUND_W = 210                        // width of each match box (px)
const CONNECTOR_W = 40                     // width of connector between rounds (px)

const BRACKET_PHASES = [
  'TRINTA_E_DOIS_AVOS', 'DEZESSEIS_AVOS', 'OITAVAS', 'QUARTAS', 'SEMI', 'FINAL',
]

const FASE_LABEL = {
  TRINTA_E_DOIS_AVOS: '1/32 de Final',
  DEZESSEIS_AVOS: '1/16 de Final',
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
function RegistrarResultadoModal({ partida, config, campeonatoId, onSuccess, onClose }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const usaSec = config?.unidade_placar === 'SETS'
  const unidadePrimaria = config?.unidade_placar || 'GOLS'
  const unidadeSecundaria = config?.unidade_placar_sec || 'PONTOS'

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const isWxo = values.resultado_tipo === 'WXO'
      const vencedorWxo = values.desistente_wxo === 'MANDANTE' ? 'VISITANTE' : 'MANDANTE'
      const mandanteVence = !isWxo || vencedorWxo === 'MANDANTE'
      const payload = {
        resultado_tipo: values.resultado_tipo,
        vencedor_wxo: isWxo ? vencedorWxo : undefined,
        placar_mandante: isWxo
          ? (mandanteVence ? (config?.wxo_placar_pro ?? 1) : (config?.wxo_placar_contra ?? 0))
          : values.placar_mandante,
        placar_visitante: isWxo
          ? (mandanteVence ? (config?.wxo_placar_contra ?? 0) : (config?.wxo_placar_pro ?? 1))
          : values.placar_visitante,
        placar_mandante_sec: usaSec
          ? (isWxo
              ? (mandanteVence ? (config?.wxo_placar_pro_sec ?? 50) : (config?.wxo_placar_contra_sec ?? 0))
              : values.placar_mandante_sec)
          : null,
        placar_visitante_sec: usaSec
          ? (isWxo
              ? (mandanteVence ? (config?.wxo_placar_contra_sec ?? 0) : (config?.wxo_placar_pro_sec ?? 50))
              : values.placar_visitante_sec)
          : null,
      }
      await campeonatosService.registrarResultado(campeonatoId, partida.id, payload)
      message.success('Resultado registrado com sucesso')
      onSuccess()
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

  return (
    <Modal
      open
      title="Registrar resultado"
      onCancel={onClose}
      onOk={handleSave}
      okText="Salvar"
      confirmLoading={saving}
      destroyOnClose
      width={440}
    >
      <p className="text-sm text-[#64748b] mb-4">
        <strong>{partida.mandante_nome || 'Mandante'}</strong>
        {' vs '}
        <strong>{partida.visitante_nome || 'Visitante'}</strong>
      </p>
      <Form form={form} layout="vertical" initialValues={{ resultado_tipo: 'NORMAL' }}>
        <Form.Item name="resultado_tipo" label="Tipo de resultado">
          <Radio.Group>
            <Radio value="NORMAL">Normal</Radio>
            <Radio value="WXO">WxO (walkover)</Radio>
          </Radio.Group>
        </Form.Item>

        {!isWxo && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="placar_mandante"
                label={`${partida.mandante_nome || 'Mandante'} (${unidadePrimaria})`}
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
              <Form.Item
                name="placar_visitante"
                label={`${partida.visitante_nome || 'Visitante'} (${unidadePrimaria})`}
                rules={[{ required: true, message: 'Obrigatório' }]}
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>
            {usaSec && (
              <div className="grid grid-cols-2 gap-3">
                <Form.Item
                  name="placar_mandante_sec"
                  label={`${partida.mandante_nome || 'Mandante'} (${unidadeSecundaria})`}
                  rules={[{ required: true, message: 'Obrigatório' }]}
                >
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
                <Form.Item
                  name="placar_visitante_sec"
                  label={`${partida.visitante_nome || 'Visitante'} (${unidadeSecundaria})`}
                  rules={[{ required: true, message: 'Obrigatório' }]}
                >
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
              </div>
            )}
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
                <Radio value="MANDANTE">{partida.mandante_nome || 'Mandante'}</Radio>
                <Radio value="VISITANTE">{partida.visitante_nome || 'Visitante'}</Radio>
              </Radio.Group>
            </Form.Item>
            {desistente && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded p-3">
                <strong>
                  {desistente === 'MANDANTE'
                    ? (partida.visitante_nome || 'Visitante')
                    : (partida.mandante_nome || 'Mandante')}
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

// ── ClassificacaoGrupo ────────────────────────────────────────────────────────
function ClassificacaoGrupo({ campeonatoId, grupoId, config, refreshKey }) {
  const [classificacao, setClassificacao] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    campeonatosService
      .getClassificacaoGrupo(campeonatoId, grupoId)
      .then(setClassificacao)
      .catch(() => setClassificacao([]))
      .finally(() => setLoading(false))
  }, [campeonatoId, grupoId, refreshKey])

  const usaSec = config?.unidade_placar === 'SETS'
  const cols = [
    { title: '#', dataIndex: 'posicao', key: 'posicao', width: 36 },
    { title: 'Escola', dataIndex: 'nome_escola', key: 'nome_escola' },
    { title: 'PTS', dataIndex: 'pts', key: 'pts', width: 48 },
    { title: 'J', dataIndex: 'J', key: 'J', width: 36 },
    { title: 'V', dataIndex: 'V', key: 'V', width: 36 },
    { title: 'E', dataIndex: 'E', key: 'E', width: 36 },
    { title: 'D', dataIndex: 'D', key: 'D', width: 36 },
    { title: usaSec ? 'S+' : 'PRÓ', dataIndex: 'pro', key: 'pro', width: 50 },
    { title: usaSec ? 'S-' : 'CTR', dataIndex: 'contra', key: 'contra', width: 50 },
    { title: 'SLD', dataIndex: 'saldo', key: 'saldo', width: 48 },
    ...(usaSec
      ? [
          { title: 'P+', dataIndex: 'pro_sec', key: 'pro_sec', width: 50 },
          { title: 'P-', dataIndex: 'contra_sec', key: 'contra_sec', width: 50 },
        ]
      : []),
  ]

  return (
    <Table
      rowKey="equipe_id"
      size="small"
      pagination={false}
      loading={loading}
      dataSource={classificacao}
      columns={cols}
      rowClassName={(r) =>
        r.posicao === 1
          ? 'bg-emerald-50'
          : r.posicao === 2
          ? 'bg-sky-50'
          : ''
      }
    />
  )
}

// ── GrupoSection ──────────────────────────────────────────────────────────────
function GrupoSection({ grupo, partidas, campeonatoId, config, onRegister, refreshKey }) {
  const partidasGrupo = partidas.filter((p) => p.grupo_id === grupo.id && !p.is_bye)

  return (
    <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
      <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0]">
        <h3 className="font-bold text-[#042f2e] m-0 text-sm">GRUPO {grupo.nome}</h3>
      </div>
      <div className="p-4 flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">Classificação</p>
          <ClassificacaoGrupo
            campeonatoId={campeonatoId}
            grupoId={grupo.id}
            config={config}
            refreshKey={refreshKey}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">Partidas</p>
          <div className="flex flex-col gap-2">
            {partidasGrupo.length === 0 && (
              <p className="text-sm text-[#94a3b8]">Nenhuma partida neste grupo.</p>
            )}
            {partidasGrupo.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] cursor-pointer hover:border-teal-400 transition-colors"
                onClick={() => onRegister(p)}
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
function BracketMatchBox({ partida, top, left, onRegister }) {
  const hasResult = !!partida.resultado_tipo
  const v = partida.vencedor_equipe_id

  return (
    <div
      style={{ position: 'absolute', top, left, width: ROUND_W, height: MATCH_H }}
      className={`rounded-lg overflow-hidden bg-white border transition-all cursor-pointer ${
        hasResult ? 'border-slate-300' : 'border-slate-200'
      } hover:border-teal-400 hover:shadow-sm`}
      onClick={() => onRegister(partida)}
      title={hasResult ? 'Editar resultado' : 'Registrar resultado'}
    >
      <BracketTeamSlot
        name={partida.mandante_nome || (partida.mandante_equipe_id ? `Equipe ${partida.mandante_equipe_id}` : null)}
        score={hasResult ? partida.placar_mandante : null}
        isWinner={v !== null && v === partida.mandante_equipe_id}
      />
      <div style={{ height: DIVIDER_H }} className="bg-slate-100" />
      <BracketTeamSlot
        name={partida.visitante_nome || (partida.visitante_equipe_id ? `Equipe ${partida.visitante_equipe_id}` : null)}
        score={hasResult ? partida.placar_visitante : null}
        isWinner={v !== null && v === partida.visitante_equipe_id}
      />
    </div>
  )
}

// ── Tournament bracket ────────────────────────────────────────────────────────
function TournamentBracket({ matches, onRegister }) {
  const mainMatches = matches.filter((m) => BRACKET_PHASES.includes(m.fase) && !m.is_bye)
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
              className="border border-slate-200 rounded-lg overflow-hidden bg-white cursor-pointer hover:border-teal-400 hover:shadow-sm transition-all"
              onClick={() => onRegister(p)}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CampeonatoDetalhe() {
  const { id } = useParams()
  const campeonatoId = parseInt(id, 10)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [estrutura, setEstrutura] = useState(null)
  const [campeonato, setCampeonato] = useState(null)
  const [config, setConfig] = useState(null)
  const [activeTab, setActiveTab] = useState('grupos')
  const [modalPartida, setModalPartida] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const [estruturaData, campeonatoData] = await Promise.all([
        campeonatosService.getEstrutura(campeonatoId),
        campeonatosService.getById(campeonatoId),
      ])
      setEstrutura(estruturaData)
      setCampeonato(campeonatoData)
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

  const handleResultadoSalvo = () => {
    setModalPartida(null)
    setRefreshKey((k) => k + 1)
    fetchData()
  }

  const hasGroups = (estrutura?.grupos?.length || 0) > 0
  const hasKnockout = (estrutura?.partidas || []).some(
    (p) => p.grupo_id === null && !p.is_bye
  )

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
  const subtitulo = campeonato
    ? [campeonato.esporte_nome, campeonato.categoria_nome, campeonato.naipe_nome]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <div className="flex flex-col gap-6">
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
                {status}
              </Tag>
            )}
          </div>
          {subtitulo && (
            <p className="text-[0.9375rem] text-[#64748b] m-0 mt-0.5">{subtitulo}</p>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex gap-0 p-2 border-b border-[#f1f5f9]">
          <button
            type="button"
            onClick={() => setActiveTab('grupos')}
            disabled={!hasGroups}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'grupos'
                ? 'bg-[#f1f5f9] text-[#0f766e]'
                : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
            }`}
          >
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
            <Trophy size={16} />
            Eliminatórias
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'grupos' && (
        <div className="flex flex-col gap-4">
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
                onRegister={setModalPartida}
                refreshKey={refreshKey}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'eliminatorias' && (
        <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <TournamentBracket
            matches={estrutura.partidas.filter((p) => p.grupo_id === null)}
            onRegister={setModalPartida}
          />
        </div>
      )}

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
    </div>
  )
}
