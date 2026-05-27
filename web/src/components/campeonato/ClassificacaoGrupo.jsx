import { useState, useEffect } from 'react'
import { Popover } from 'antd'
import { Trophy } from 'lucide-react'
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
  SORTEIO_PENDENTE: 'Sorteio pendente',
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
    case 'SORTEIO_PENDENTE':    return 'Empate não resolvido — aguardando resultado do sorteio'
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

function PositionBadge({ posicao }) {
  if (posicao === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-50">
        <Trophy size={13} className="text-amber-500" />
      </span>
    )
  }
  if (posicao === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-teal-100 text-teal-700 text-xs font-bold">
        2
      </span>
    )
  }
  if (posicao === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-600 text-xs font-bold">
        3
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-6 text-xs font-medium text-slate-400">
      {posicao}
    </span>
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
  const isSorteioPendente = (r) => r.criterio_decisivo === 'SORTEIO_PENDENTE'
  const isClassificado = (r) =>
    grupoConcluido &&
    !isSorteioPendente(r) &&
    (r.posicao <= classificadosDiretos || (wildcardEquipeIds ?? []).includes(r.equipe_id))
  const sorteioPendente = classificacao.some((r) => r.criterio_decisivo === 'SORTEIO_PENDENTE')

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sorteioPendente && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <span>⚠</span>
          <span>Sorteio necessário — empate não resolvido pelos critérios de desempate</span>
        </div>
      )}
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-teal-700 to-teal-600">
            <th className="px-3 py-2.5 text-left text-white/80 font-semibold text-xs w-8">#</th>
            <th className="px-3 py-2.5 text-left text-white/80 font-semibold text-xs">Escola</th>
            <th title="Pontos" className="px-2 py-2.5 text-center text-white font-bold text-xs">PTS</th>
            <th title="Jogos" className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">J</th>
            <th title="Vitórias" className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">V</th>
            <th title="Empates" className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">E</th>
            <th title="Derrotas" className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">D</th>
            <th title={usaSec ? 'Sets a favor' : 'A favor (marcados)'} className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">
              {usaSec ? 'S+' : 'PRÓ'}
            </th>
            <th title={usaSec ? 'Sets contra' : 'Contra (sofridos)'} className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">
              {usaSec ? 'S-' : 'CTR'}
            </th>
            <th title={usaSec ? 'Saldo de sets' : 'Saldo de pontos'} className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">
              SLD
            </th>
            {usaSec && (
              <>
                <th title="Pontos a favor" className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">P+</th>
                <th title="Pontos contra" className="px-2 py-2.5 text-center text-white/70 font-semibold text-xs">P-</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {classificacao.map((r, idx) => {
            const classificado = isClassificado(r)
            const sorteio = isSorteioPendente(r)
            const wc = (wildcardEquipeIds ?? []).includes(r.equipe_id)
            return (
              <tr
                key={r.equipe_id}
                className={`border-b border-slate-100 last:border-0 transition-colors ${
                  sorteio
                    ? 'bg-amber-50 hover:bg-amber-100/60'
                    : classificado
                      ? 'bg-emerald-50 hover:bg-emerald-100/60'
                      : idx % 2 === 0
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <td className="px-3 py-2">
                  <PositionBadge posicao={r.posicao} />
                </td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {sorteio ? (
                    <Popover
                      content={
                        <div style={{ maxWidth: 260 }}>
                          <p className="font-semibold text-amber-700 mb-1">Posição indefinida — sorteio pendente</p>
                          <p className="text-sm text-gray-600 m-0">
                            Esta equipe está empatada e a posição final ainda não foi definida.
                            Use o botão <strong>"Registrar Sorteio"</strong> acima para informar o resultado.
                          </p>
                        </div>
                      }
                      trigger="hover"
                      placement="right"
                      mouseEnterDelay={0.2}
                    >
                      <span className="cursor-default underline decoration-dotted decoration-amber-500 text-amber-900">{r.nome_escola}</span>
                    </Popover>
                  ) : classificado ? (
                    <Popover
                      content={<ClassificadoPopoverContent record={r} isWildcard={wc} wildcardRanking={wildcardRanking} />}
                      trigger="hover"
                      placement="right"
                      mouseEnterDelay={0.2}
                    >
                      <span className="cursor-default underline decoration-dotted decoration-emerald-500">{r.nome_escola}</span>
                    </Popover>
                  ) : (
                    r.nome_escola
                  )}
                </td>
                <td className="px-2 py-2 text-center font-bold text-teal-700 tabular-nums">{r.pts}</td>
                <td className="px-2 py-2 text-center text-slate-600 tabular-nums">{r.J}</td>
                <td className="px-2 py-2 text-center text-slate-600 tabular-nums">{r.V}</td>
                <td className="px-2 py-2 text-center text-slate-600 tabular-nums">{r.E}</td>
                <td className="px-2 py-2 text-center text-slate-600 tabular-nums">{r.D}</td>
                <td className="px-2 py-2 text-center text-slate-600 tabular-nums">{r.pro}</td>
                <td className="px-2 py-2 text-center text-slate-600 tabular-nums">{r.contra}</td>
                <td className={`px-2 py-2 text-center tabular-nums font-medium ${r.saldo > 0 ? 'text-emerald-600' : r.saldo < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                  {r.saldo > 0 ? `+${r.saldo}` : r.saldo}
                </td>
                {usaSec && (
                  <>
                    <td className="px-2 py-2 text-center text-slate-600 tabular-nums">{r.pro_sec}</td>
                    <td className="px-2 py-2 text-center text-slate-600 tabular-nums">{r.contra_sec}</td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </div>
  )
}
