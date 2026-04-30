import { useState, useEffect } from 'react'
import { Popover, Table, Tooltip } from 'antd'
import { publicCampeonatosService } from '../../services/publicCampeonatosService'

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
    case 'PONTOS':              return `Maior pontuação no grupo (${r.pts} pts)`
    case 'CONFRONTO_DIRETO':    return 'Venceu o confronto direto contra a(s) equipe(s) empatada(s)'
    case 'MAIOR_VITORIAS':      return `Mais vitórias que a próxima equipe (${r.V} vitória${r.V !== 1 ? 's' : ''})`
    case 'AVERAGE_DIRETO':      return 'Melhor average nos confrontos diretos'
    case 'AVERAGE_SEC_DIRETO':  return 'Melhor average secundário nos confrontos diretos'
    case 'SALDO_DIRETO':        return 'Melhor saldo de pontos nos confrontos diretos'
    case 'AVERAGE_GERAL':       return `Melhor average geral (${r.pro} pró / ${r.contra} contra)`
    case 'AVERAGE_SEC_GERAL':   return 'Melhor average geral secundário'
    case 'SALDO_GERAL':         return `Melhor saldo geral (${r.saldo >= 0 ? '+' : ''}${r.saldo})`
    case 'MENOR_CONTRA_GERAL':  return `Menos pontos sofridos (${r.contra})`
    case 'MAIOR_PRO_GERAL':     return `Mais pontos marcados (${r.pro})`
    case 'SORTEIO':             return 'Critérios esgotados — posição definida por sorteio'
    default:                    return null
  }
}

function ClassificadoPopoverContent({ record, isWildcard, wildcardRanking }) {
  if (isWildcard) {
    const wcIdx = (wildcardRanking ?? []).findIndex((w) => w.equipe_id === record.equipe_id)
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
          Wild Card{wcInfo ? ` — ${wcInfo.posicao_no_grupo}° do Grupo ${wcInfo.grupo_nome}` : ''}
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

export default function ClassificacaoGrupo({ campeonatoId, grupoId, classificadosDiretos, config, wildcardEquipeIds, wildcardRanking }) {
  const [classificacao, setClassificacao] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    publicCampeonatosService
      .getClassificacaoGrupo(campeonatoId, grupoId)
      .then(setClassificacao)
      .catch(() => setClassificacao([]))
      .finally(() => setLoading(false))
  }, [campeonatoId, grupoId])

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
            <span className="cursor-default underline decoration-dotted decoration-emerald-500">{nome}</span>
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
