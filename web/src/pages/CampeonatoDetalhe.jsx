import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, DatePicker, Dropdown, Form, InputNumber, Modal, Popover, Radio, Table, Tag, Tooltip, message, Spin } from 'antd'
import {
  AppstoreOutlined,
  BarsOutlined,
  ClockCircleOutlined,
  EditOutlined,
  MoreOutlined,
  PartitionOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ArrowLeft, Trophy } from 'lucide-react'
import { campeonatosService } from '../services/campeonatosService'
import { equipesService } from '../services/equipesService'

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
  GRUPOS: 'Fase de Grupos',
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
  TRINTA_E_DOIS_AVOS: 2,
  DEZESSEIS_AVOS: 3,
  OITAVAS: 4,
  QUARTAS: 5,
  SEMI: 6,
  FINAL: 7,
  TERCEIRO: 8,
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
function RegistrarResultadoModal({ partida, config, campeonatoId, onSuccess, onClose }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const usaSec = config?.unidade_placar === 'SETS'
  const unidadePrimaria = config?.unidade_placar || 'GOLS'
  const unidadeSecundaria = config?.unidade_placar_sec || 'PONTOS'
  const isEditing = !!partida.resultado_tipo

  const initialValues = (() => {
    if (!partida.resultado_tipo) return { resultado_tipo: 'NORMAL' }
    const vals = {
      resultado_tipo: partida.resultado_tipo,
      placar_mandante: partida.placar_mandante,
      placar_visitante: partida.placar_visitante,
      placar_mandante_sec: partida.placar_mandante_sec ?? undefined,
      placar_visitante_sec: partida.placar_visitante_sec ?? undefined,
    }
    if (partida.resultado_tipo === 'WXO') {
      vals.desistente_wxo = partida.vencedor_equipe_id === partida.mandante_equipe_id ? 'VISITANTE' : 'MANDANTE'
    }
    return vals
  })()

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
      title={isEditing ? 'Editar resultado' : 'Registrar resultado'}
      onCancel={onClose}
      onOk={handleSave}
      okText={isEditing ? 'Alterar' : 'Salvar'}
      confirmLoading={saving}
      destroyOnClose
      width={440}
    >
      <p className="text-sm text-[#64748b] mb-4">
        <strong>{partida.mandante_nome || 'Mandante'}</strong>
        {' vs '}
        <strong>{partida.visitante_nome || 'Visitante'}</strong>
      </p>
      <Form form={form} layout="vertical" initialValues={initialValues}>
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
function ClassificacaoGrupo({ campeonatoId, grupoId, classificadosDiretos, config, refreshKey, wildcardEquipeIds, wildcardRanking }) {
  const [classificacao, setClassificacao] = useState([])
  const [loading, setLoading] = useState(true)

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

  return (
    <Table
      rowKey="equipe_id"
      size="small"
      pagination={false}
      loading={loading}
      dataSource={classificacao}
      columns={cols}
      rowClassName={(r) => isClassificado(r) ? 'bg-emerald-50' : ''}
    />
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

function AgendarPartidaModal({ partida, campeonatoId, onSuccess, onClose }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const initialValues = {
    inicio_em: partida.inicio_em ? dayjs(partida.inicio_em) : null,
  }

  const saveAgendamento = async (inicioEm) => {
    setSaving(true)
    try {
      await campeonatosService.agendarPartida(campeonatoId, partida.id, {
        inicio_em: inicioEm ? inicioEm.second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss') : null,
      })
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
      await saveAgendamento(values.inicio_em)
    } catch (err) {
      if (err?.errorFields) return
      message.error(err.message || 'Erro ao agendar partida')
    }
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
            onClick={() => saveAgendamento(null)}
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
        <Form.Item name="inicio_em" label="Data e horário do jogo">
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            placeholder="Selecionar data e horário"
            className="w-full"
          />
        </Form.Item>
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
      {
        key: 'schedule',
        icon: <ClockCircleOutlined />,
        label: 'Definir Horário',
      },
      {
        key: 'result',
        icon: <EditOutlined />,
        label: 'Registrar Resultado',
      },
    ],
    onClick: ({ key }) => {
      if (key === 'schedule') {
        onSchedule(partida)
        return
      }
      onRegister(partida)
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
                              <span className={`text-sm truncate ${partida.vencedor_equipe_id === partida.mandante_equipe_id ? 'font-bold text-emerald-700' : 'font-semibold text-[#1e293b]'}`}>
                                {equipeNome(partida, 'mandante')}
                              </span>
                              <span className="text-center whitespace-nowrap">
                                {placarOuVs(partida)}
                              </span>
                              <span className={`text-sm truncate text-right ${partida.vencedor_equipe_id === partida.visitante_equipe_id ? 'font-bold text-emerald-700' : 'font-semibold text-[#1e293b]'}`}>
                                {equipeNome(partida, 'visitante')}
                              </span>
                            </div>
                          </div>
                          <Dropdown menu={menuPartida(partida)} trigger={['click']} placement="bottomRight">
                            <Button
                              size="small"
                              type="text"
                              icon={<MoreOutlined />}
                              aria-label="Ações da partida"
                            />
                          </Dropdown>
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
function GrupoSection({ grupo, partidas, campeonatoId, config, onRegister, refreshKey, wildcardEquipeIds, wildcardRanking, bloqueado }) {
  const partidasGrupo = partidas.filter((p) => p.grupo_id === grupo.id && !p.is_bye)

  const handlePartidaClick = (p) => {
    if (bloqueado) {
      message.warning('A fase de grupos está encerrada. Resultados não podem ser alterados após o início das eliminatórias.')
      return
    }
    onRegister(p)
  }

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
            classificadosDiretos={grupo.classificados_diretos ?? 1}
            config={config}
            refreshKey={refreshKey}
            wildcardEquipeIds={wildcardEquipeIds}
            wildcardRanking={wildcardRanking}
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
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] transition-colors ${
                  bloqueado ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-teal-400'
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
function BracketMatchBox({ partida, top, left, onRegister }) {
  const hasResult = !!partida.resultado_tipo
  const v = partida.vencedor_equipe_id
  const isBye = partida.is_bye

  const visitanteName = isBye && !partida.visitante_equipe_id
    ? 'WO'
    : partida.visitante_nome || (partida.visitante_equipe_id ? `Equipe ${partida.visitante_equipe_id}` : null)

  return (
    <div
      style={{ position: 'absolute', top, left, width: ROUND_W, height: MATCH_H }}
      className={`rounded-lg overflow-hidden bg-white border transition-all ${
        isBye ? 'cursor-default opacity-80' : 'cursor-pointer hover:border-teal-400 hover:shadow-sm'
      } ${hasResult ? 'border-slate-300' : 'border-slate-200'}`}
      onClick={() => !isBye && onRegister(partida)}
      title={isBye ? 'Classificado por WO' : hasResult ? 'Editar resultado' : 'Registrar resultado'}
    >
      <BracketTeamSlot
        name={partida.mandante_nome || (partida.mandante_equipe_id ? `Equipe ${partida.mandante_equipe_id}` : null)}
        score={hasResult ? partida.placar_mandante : null}
        isWinner={v !== null && v === partida.mandante_equipe_id}
      />
      <div style={{ height: DIVIDER_H }} className="bg-slate-100" />
      <BracketTeamSlot
        name={visitanteName}
        score={hasResult ? partida.placar_visitante : null}
        isWinner={v !== null && v === partida.visitante_equipe_id}
      />
    </div>
  )
}

// ── Tournament bracket ────────────────────────────────────────────────────────
function TournamentBracket({ matches, onRegister }) {
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
  const [activeTab, setActiveTab] = useState('partidas')
  const [modalPartida, setModalPartida] = useState(null)
  const [modalAgendamento, setModalAgendamento] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [vencedorEquipe, setVencedorEquipe] = useState(null)

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

  const handleAgendamentoSalvo = () => {
    setModalAgendamento(null)
    fetchData()
  }

  const hasGroups = (estrutura?.grupos?.length || 0) > 0
  const hasKnockout = (estrutura?.partidas || []).some((p) => p.grupo_id === null)
  const hasPlayablePartidas = (estrutura?.partidas || []).some((p) => !p.is_bye)
  const gruposBloqueados = (estrutura?.partidas || []).some(
    (p) => p.grupo_id === null && !p.is_bye && !!p.resultado_tipo
  )

  useEffect(() => {
    if (estrutura && activeTab === 'grupos' && !hasGroups && hasKnockout) {
      setActiveTab('eliminatorias')
    }
  }, [estrutura, activeTab, hasGroups, hasKnockout])

  useEffect(() => {
    if (estrutura && activeTab === 'partidas' && !hasGroups && hasKnockout && !hasPlayablePartidas) {
      setActiveTab('eliminatorias')
    }
  }, [estrutura, activeTab, hasGroups, hasKnockout, hasPlayablePartidas])

  useEffect(() => {
    if (campeonato?.status !== 'FINALIZADO' || !estrutura) return
    const finalPartida = (estrutura.partidas || []).find(
      (p) => p.fase === 'FINAL' && p.vencedor_equipe_id
    )
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
              disabled={!hasGroups}
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        {/* Tab content */}
        {activeTab === 'partidas' && (
          <PartidasTimeline
            partidas={estrutura.partidas}
            grupos={estrutura.grupos}
            onSchedule={setModalAgendamento}
            onRegister={setModalPartida}
          />
        )}

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
                  wildcardEquipeIds={estrutura.wildcard_equipe_ids ?? []}
                  wildcardRanking={estrutura.wildcard_ranking ?? []}
                  bloqueado={gruposBloqueados}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'eliminatorias' && (
          <div className="flex flex-col gap-4">
            {campeonato?.status === 'FINALIZADO' && (() => {
              const finalPartida = (estrutura.partidas || []).find(
                (p) => p.fase === 'FINAL' && p.vencedor_equipe_id
              )
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
                onRegister={setModalPartida}
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

      {modalAgendamento && (
        <AgendarPartidaModal
          partida={modalAgendamento}
          campeonatoId={campeonatoId}
          onSuccess={handleAgendamentoSalvo}
          onClose={() => setModalAgendamento(null)}
        />
      )}
    </div>
  )
}
