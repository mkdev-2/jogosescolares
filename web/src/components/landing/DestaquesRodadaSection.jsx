import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy, User, Target, Calendar } from 'lucide-react'
import ModalidadeIcon from '../catalogos/ModalidadeIcon'
import StorageImage from '../StorageImage'
import { publicCampeonatosService } from '../../services/publicCampeonatosService'

function initials(name) {
  if (!name || typeof name !== 'string') return '?'
  const p = name.trim().split(/\s+/)
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function EscolaMark({ nome, className = '' }) {
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-800 ring-1 ring-emerald-100 sm:h-14 sm:w-14 ${className}`}
      aria-hidden
    >
      {initials(nome || '')}
    </div>
  )
}

function AvatarAtleta({ nome, fotoUrl, className = '', round = false }) {
  const base = round ? 'rounded-full' : 'rounded-xl'
  if (fotoUrl) {
    return (
      <StorageImage
        path={fotoUrl}
        alt=""
        className={`object-cover bg-slate-100 ${base} ${className}`}
        loadingClassName={`animate-pulse bg-slate-100 ${base} ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-black text-white ${base} ${className}`}
      aria-hidden
    >
      {initials(nome)}
    </div>
  )
}

/** Card de destaque com faixa escura no cabeçalho. */
function LightCard({
  title,
  subtitle,
  icon: IconComponent,
  children,
  className = '',
  bodyClassName = 'p-6',
}) {
  const shellClass =
    `flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 ${className}`

  return (
    <div className={shellClass}>
      <div className="flex flex-col gap-1 bg-[#044f38] px-5 py-3.5">
        <div className="flex items-center gap-2">
          {IconComponent ? <IconComponent className="shrink-0 text-white" size={16} strokeWidth={2.5} /> : null}
          <h3 className="m-0 font-display text-sm font-black uppercase tracking-wide leading-none text-white">
            {title}
          </h3>
        </div>
        {subtitle ? (
          <p className="m-0 text-[10px] font-bold uppercase tracking-wider leading-none text-emerald-200/80">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className={`flex flex-col ${bodyClassName}`}>{children}</div>
    </div>
  )
}

function PontuacaoDestaque({ total, labelUnidade, compact = false }) {
  const label = total === 1 ? labelUnidade.replace(/s$/, '') : labelUnidade
  return (
    <div className="shrink-0 text-right leading-none">
      <span
        className={`block font-black tabular-nums text-[#044f38] ${compact ? 'text-base' : 'text-xl'}`}
      >
        {total}
      </span>
      <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{label}</span>
    </div>
  )
}

function AtletaDestaqueRow({ atleta, labelUnidade }) {
  const destaque = atleta.posicao === 1
  return (
    <li
      className={`flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 ${
        destaque ? 'bg-emerald-50 ring-1 ring-emerald-100/80' : 'border border-slate-200/90 bg-white'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black shadow-sm ${badgePosicaoClass(atleta.posicao)}`}
      >
        {atleta.posicao}
      </span>
      <AvatarAtleta
        nome={atleta.estudante_nome}
        fotoUrl={atleta.estudante_foto_url}
        className="h-9 w-9 shrink-0 shadow-sm"
        round
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold leading-tight text-[#044f38] line-clamp-1">
          {atleta.estudante_nome}
        </p>
        <p className="m-0 mt-0.5 text-[11px] leading-snug text-slate-500 line-clamp-2">
          {atleta.escola_nome}
        </p>
      </div>
      <PontuacaoDestaque total={atleta.total} labelUnidade={labelUnidade} />
    </li>
  )
}

function RankingPontuadorRow({ atleta, labelUnidade, compact = false }) {
  const podium = atleta.posicao <= 3
  return (
    <li
      className={`flex min-w-0 items-center gap-2 rounded-xl px-2.5 ${
        compact ? 'py-1.5' : 'py-2'
      } ${
        podium ? 'bg-emerald-50/70 ring-1 ring-emerald-100/60' : 'border border-slate-100 bg-white'
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full font-black shadow-sm ${badgePosicaoClass(atleta.posicao)} ${
          compact ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]'
        }`}
      >
        {atleta.posicao}
      </span>
      <span
        className={`min-w-0 flex-1 truncate font-bold text-[#044f38] ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {atleta.estudante_nome}
      </span>
      <PontuacaoDestaque total={atleta.total} labelUnidade={labelUnidade} compact={compact} />
    </li>
  )
}

function ModalidadeSemDestaquesFallback({ nome, icone }) {
  return (
    <div
      role="status"
      className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ModalidadeIcon icone={icone || 'Zap'} size={28} />
      </div>
      <p className="m-0 text-base font-black uppercase tracking-tight text-[#044f38]">
        {nome ? `Sem destaques em ${nome}` : 'Sem destaques nesta modalidade'}
      </p>
      <p className="m-0 mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Ainda não há partidas concluídas na fase de grupos com registros publicados para esta
        modalidade.
      </p>
      <Link
        to="/resultados"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-800 transition hover:bg-emerald-100"
      >
        Ver resultados
      </Link>
    </div>
  )
}

function PlaceholderLight({ title, subtitle, message, icon }) {
  return (
    <LightCard title={title} subtitle={subtitle} icon={icon}>
      <div className="flex flex-col h-full justify-between flex-1 min-h-[220px]">
        <p className="m-0 text-xs font-semibold leading-relaxed text-slate-400 mt-2">{message}</p>
        <div className="mt-auto pt-4 border-t border-slate-100 text-[10px] text-slate-300 font-bold uppercase tracking-wider">
          Sem registros
        </div>
      </div>
    </LightCard>
  )
}

const selectLight =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none transition ' +
  'hover:border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60'

const labelLight = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500'

function badgePosicaoClass(posicao) {
  if (posicao === 1) return 'bg-amber-400 text-white'
  if (posicao === 2) return 'bg-slate-300 text-slate-700'
  if (posicao === 3) return 'bg-amber-700/80 text-white'
  return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/50'
}

/** Ordem das abas de modalidade na landing (destaques). */
function esporteTabSortIndex(nome) {
  const norm = String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (norm.includes('futsal')) return 0
  if (norm.includes('beach') || norm.includes('beachsoccer')) return 1
  if (norm.includes('praia') && norm.includes('volei')) return 3
  if (norm.includes('voleibol') || norm === 'volei') return 2
  if (norm.includes('basquete')) return 4
  return 99
}

/** Campeonato com ao menos um destaque renderizável na landing. */
function campanhaTemDestaques(item) {
  if (!item) return false
  const temJogo = Boolean(item.jogo_destaque)
  const temPont =
    Boolean(item.mostrar_pontuadores_individuais) && (item.top_pontuadores?.length || 0) > 0
  const temDefesa = Boolean(item.equipe_defesa)
  return temJogo || temPont || temDefesa
}

/** Quanto do bloco (3 cards) está preenchido — usado para abrir a categoria mais completa. */
function destaquesPreenchimentoScore(item) {
  if (!item) return 0
  let score = 0
  const top = item.top_pontuadores || []
  const mostrarInd = Boolean(item.mostrar_pontuadores_individuais)

  if (item.jogo_destaque) score += 1
  if (mostrarInd && top.length > 0) {
    score += Math.min(top.length, 3)
    score += Math.min(top.length, 10)
  }
  return score
}

function melhorItemDestaques(items) {
  if (!items?.length) return null
  let best = null
  let bestScore = -1
  for (const item of items) {
    const score = destaquesPreenchimentoScore(item)
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  if (bestScore > 0) return best
  return items.find(campanhaTemDestaques) || items[0]
}

function ordenarEsportesLista(esportes) {
  return [...esportes].sort(
    (a, b) => esporteTabSortIndex(a.nome) - esporteTabSortIndex(b.nome),
  )
}

/** Modalidade cuja melhor categoria tem mais campos do bloco preenchidos. */
function melhorEsporteComDestaques(esportes, destaques) {
  let bestSportId = ''
  let bestScore = -1
  for (const esp of ordenarEsportesLista(esportes)) {
    const camps = destaques.filter((it) => String(it.esporte_id) === String(esp.id))
    const item = melhorItemDestaques(camps)
    const score = item ? destaquesPreenchimentoScore(item) : 0
    if (score > bestScore) {
      bestScore = score
      bestSportId = String(esp.id)
    }
  }
  if (bestSportId) return bestSportId
  return esportes.length ? String(esportes[0].id) : ''
}

function melhorCampanhaComDestaques(camps) {
  const pick = melhorItemDestaques(camps)
  return pick ? String(pick.campeonato_id) : ''
}

export default function DestaquesRodadaSection() {
  const [items, setItems] = useState([])
  const [allSports, setAllSports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [esporteId, setEsporteId] = useState('')
  const [activeCampId, setActiveCampId] = useState('')
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      publicCampeonatosService.getDestaquesLanding(),
      publicCampeonatosService.getEsportesComCampeonatos()
    ])
      .then(([list, esportesList]) => {
        const allowed = ['beach soccer', 'voleibol', 'volei de praia', 'vôlei de praia', 'futsal', 'basquetebol', 'basquete', 'vôlei']

        const safeList = Array.isArray(list) ? list : []
        const filteredList = safeList.filter((it) => {
          const nome = String(it.esporte_nome || '').toLowerCase()
          return allowed.some((a) => nome.includes(a))
        })

        const safeSports = Array.isArray(esportesList) ? esportesList : []
        const filteredSportsWithAllowed = safeSports.filter((it) => {
          const nome = String(it.nome || '').toLowerCase()
          return allowed.some((a) => nome.includes(a))
        })

        // Agrupamento inteligente para eliminar duplicidades de cadastro (ex: Volei de Praia e Vôlei de Praia)
        const normalizar = (str) =>
          String(str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()

        const agrupados = {}
        filteredSportsWithAllowed.forEach((esporte) => {
          const nomeNorm = normalizar(esporte.nome)
          const existente = agrupados[nomeNorm]

          if (!existente) {
            agrupados[nomeNorm] = esporte
          } else {
            // Se houver duplicidade, prioriza o registro que de fato possui campeonatos cadastrados
            const esporteTemCamp = Array.isArray(esporte.variantes) && esporte.variantes.some((v) => v.campeonato !== null)
            const existenteTemCamp = Array.isArray(existente.variantes) && existente.variantes.some((v) => v.campeonato !== null)

            if (esporteTemCamp && !existenteTemCamp) {
              agrupados[nomeNorm] = esporte
            } else if (!esporteTemCamp && !existenteTemCamp) {
              // Se nenhum tem campeonato, prefere o que tiver um ícone definido (diferente de 'Zap' fallback)
              if (esporte.icone && esporte.icone !== 'Zap' && (!existente.icone || existente.icone === 'Zap')) {
                agrupados[nomeNorm] = esporte
              }
            }
          }
        })

        const sportsArr = Object.values(agrupados)
        const melhorGlobal = melhorItemDestaques(filteredList)
        const esporteInicial = melhorGlobal
          ? String(melhorGlobal.esporte_id)
          : melhorEsporteComDestaques(sportsArr, filteredList)
        const campsDoEsporte = filteredList.filter(
          (it) => String(it.esporte_id) === esporteInicial,
        )
        const campInicial = melhorGlobal
          ? String(melhorGlobal.campeonato_id)
          : melhorCampanhaComDestaques(campsDoEsporte)

        setItems(filteredList)
        setAllSports(sportsArr)
        setEsporteId(esporteInicial)
        setActiveCampId(campInicial)
      })
      .catch((e) => {
        setError(e?.message || 'Erro ao carregar destaques')
        setItems([])
        setAllSports([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const esportesTabs = useMemo(() => {
    return allSports
      .map((it) => ({
        value: String(it.id),
        label: it.nome,
        icone: it.icone || 'Zap',
      }))
      .sort((a, b) => {
        const oa = esporteTabSortIndex(a.label)
        const ob = esporteTabSortIndex(b.label)
        if (oa !== ob) return oa - ob
        return String(a.label).localeCompare(String(b.label), 'pt-BR')
      })
  }, [allSports])

  const itemsPorEsporte = useMemo(() => {
    if (!esporteId) return []
    return items.filter((it) => String(it.esporte_id) === esporteId)
  }, [items, esporteId])

  const esporteAtivoTab = useMemo(
    () => esportesTabs.find((t) => t.value === esporteId) || null,
    [esportesTabs, esporteId],
  )

  const modalidadeSemRegistros = Boolean(esporteAtivoTab) && itemsPorEsporte.length === 0

  /** Só corrige aba inválida (ex.: após load); não troca modalidade vazia escolhida pelo usuário. */
  useEffect(() => {
    if (esportesTabs.length === 0) return

    const tabValida = esporteId && esportesTabs.some((t) => t.value === esporteId)
    if (tabValida) return

    const next = melhorEsporteComDestaques(allSports, items)
    if (next && next !== esporteId) setEsporteId(next)
  }, [esportesTabs, esporteId, items, allSports])

  useEffect(() => {
    if (itemsPorEsporte.length === 0) {
      if (activeCampId) setActiveCampId('')
      return
    }

    const campValido = itemsPorEsporte.find(
      (it) => String(it.campeonato_id) === activeCampId,
    )
    if (campValido && campanhaTemDestaques(campValido)) return

    const next = melhorCampanhaComDestaques(itemsPorEsporte)
    if (next !== activeCampId) setActiveCampId(next)
  }, [itemsPorEsporte, activeCampId])

  const atualizadoEm = useMemo(
    () =>
      new Date().toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    [],
  )

  if (loading) {
    return (
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="container-portal flex items-center justify-center gap-3 px-4 py-16 sm:px-6">
          <Loader2 className="animate-spin text-emerald-600" size={28} />
          <span className="text-sm font-medium text-slate-600">Carregando destaques…</span>
        </div>
      </section>
    )
  }

  if (error || esportesTabs.length === 0) {
    return (
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="container-portal px-4 py-10 sm:px-6">
          <h2 className="m-0 mb-2 text-center font-display text-lg font-black uppercase tracking-tight text-emerald-700">
            Destaques da rodada
          </h2>
          <p className="m-0 text-center text-sm text-slate-600">
            {error
              ? error
              : 'Ainda não há resultados de rodada publicados para a edição ativa. Assim que houver partidas concluídas na fase de grupos, os destaques aparecem aqui.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="border-y border-slate-200 bg-gradient-to-b from-white via-slate-50/80 to-slate-50">
      <div className="container-portal px-4 py-6 sm:px-6 md:py-8">
        <div className="mb-6 flex flex-col items-center gap-5 text-center md:mb-8 md:gap-6">
          <div>
            <div className="mb-2 flex items-center justify-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <Trophy size={18} strokeWidth={2.25} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
                Os melhores
              </span>
            </div>
            <h2 className="m-0 font-display text-2xl font-black uppercase tracking-tight text-[#042f2e] md:text-3xl">
              Destaques do <span className="text-emerald-600">campeonato</span>
            </h2>
          </div>

          <div className="flex w-full max-w-4xl flex-col items-center gap-2.5">
            <div className="flex w-full flex-col items-center gap-1.5">
    
              <div className="flex w-full flex-row flex-wrap justify-center gap-2.5 pb-1">
                {esportesTabs.map((tab) => {
                  const active = tab.value === esporteId
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setEsporteId(tab.value)}
                      className={`inline-flex shrink-0 items-center justify-center gap-3 rounded-xl border px-5 py-3.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 ${active
                        ? 'border-transparent bg-[#044f38] text-white shadow-sm'
                        : 'border-slate-200/80 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                      <ModalidadeIcon icone={tab.icone} size={18} className={active ? 'text-white' : 'text-[#044f38]'} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {itemsPorEsporte.length > 1 && (
              <div className="flex flex-wrap justify-center gap-2 rounded-2xl bg-slate-100/50 p-1">
                {itemsPorEsporte.map((camp) => {
                  const active = String(camp.campeonato_id) === activeCampId
                  return (
                    <button
                      key={camp.campeonato_id}
                      type="button"
                      onClick={() => setActiveCampId(String(camp.campeonato_id))}
                      className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 ${active
                        ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-100/30'
                        : 'border border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {camp.naipe_nome} — {camp.categoria_nome}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="w-full min-w-0">
            {modalidadeSemRegistros ? (
              <ModalidadeSemDestaquesFallback
                nome={esporteAtivoTab?.label}
                icone={esporteAtivoTab?.icone}
              />
            ) : itemsPorEsporte.length > 0 ? (
              <div className="flex flex-col">

                {itemsPorEsporte.filter(it => String(it.campeonato_id) === activeCampId).map((camp) => {
                  const unidade = camp.unidade_placar || ''
                  const labelUnidade =
                    String(unidade).toUpperCase() === 'CESTAS'
                      ? 'cestas'
                      : String(unidade).toUpperCase() === 'PONTOS'
                        ? 'pontos'
                        : String(unidade).toUpperCase() === 'SETS'
                          ? 'sets'
                          : 'gols'

                  const top = camp.top_pontuadores || []
                  const topTres = top.slice(0, 3)
                  const topDez = top.slice(0, 10)
                  const mostrarInd = Boolean(camp.mostrar_pontuadores_individuais)
                  const jogo = camp.jogo_destaque
                  const def = camp.equipe_defesa

                  return (
                    <div key={camp.campeonato_id} className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start">
                        {/* 1º: Atletas destaque (layout referência) */}
                        <div className="lg:col-span-1">
                          {mostrarInd && topTres.length > 0 ? (
                            <LightCard
                              title="Atletas destaque"
                              subtitle="Top 3 atletas"
                              icon={User}
                              bodyClassName="px-3.5 py-3"
                            >
                              <ul className="m-0 flex flex-col gap-1.5 p-0 list-none">
                                {topTres.map((p) => (
                                  <AtletaDestaqueRow
                                    key={p.estudante_id}
                                    atleta={p}
                                    labelUnidade={labelUnidade}
                                  />
                                ))}
                              </ul>
                            </LightCard>
                          ) : (
                            <PlaceholderLight
                              title="Atletas destaque"
                              subtitle="Top 3 atletas"
                              message="Visível com registros de atletas."
                              icon={User}
                            />
                          )}
                        </div>

                        {/* 2º: Melhores pontuadores — linhas no mesmo padrão visual */}
                        <div className="lg:col-span-2">
                          {mostrarInd && topDez.length > 0 ? (
                            <LightCard
                              title="Melhores Pontuadores"
                              subtitle="Top 10 atletas"
                              icon={Trophy}
                              bodyClassName="px-3.5 py-3"
                            >
                              <ol className="m-0 grid grid-cols-2 gap-x-2 gap-y-1 p-0 list-none">
                                {topDez.map((p) => (
                                  <RankingPontuadorRow
                                    key={p.estudante_id}
                                    atleta={p}
                                    labelUnidade={labelUnidade}
                                    compact
                                  />
                                ))}
                              </ol>
                            </LightCard>
                          ) : (
                            <PlaceholderLight
                              title="Melhores pontuadores"
                              subtitle="Top 10"
                              message="Ranking individual visível quando houver registro de atletas na rodada."
                              icon={Trophy}
                            />
                          )}
                        </div>

                        {/* Coluna Direita: Jogo da rodada - Ocupa 1/4 */}
                        <div className="lg:col-span-1">
                          {jogo ? (
                            <LightCard
                              title="Jogo da rodada"
                              subtitle={`MAIOR SOMA DE ${String(labelUnidade).toUpperCase()}`}
                              icon={Target}
                              bodyClassName="px-3.5 py-3"
                            >
                              <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-3">
                                <div className="flex items-center justify-center py-1">
                                  <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-5 py-3 font-display text-3xl font-black tabular-nums tracking-tight text-[#044f38] shadow-sm">
                                    {jogo.placar_mandante}
                                    <span className="mx-2.5 text-lg font-black text-emerald-800/25">×</span>
                                    {jogo.placar_visitante}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 px-0.5">
                                  <span className="text-left text-xs font-bold leading-snug text-[#044f38] line-clamp-3">
                                    {jogo.mandante_nome}
                                  </span>
                                  <span className="text-right text-xs font-bold leading-snug text-[#044f38] line-clamp-3">
                                    {jogo.visitante_nome}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 border-t border-slate-200/80 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  <Calendar size={12} className="shrink-0 text-slate-400" strokeWidth={2.5} />
                                  Rodada {camp.rodada_referencia}
                                </div>
                              </div>
                            </LightCard>
                          ) : (
                            <PlaceholderLight
                              title="Jogo da rodada"
                              subtitle={`MAIOR SOMA DE ${String(labelUnidade).toUpperCase()}`}
                              message="Nenhum confronto com placar nesta rodada."
                              icon={Target}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <ModalidadeSemDestaquesFallback
                nome={esporteAtivoTab?.label}
                icone={esporteAtivoTab?.icone}
              />
            )}
          </div>
      </div>

    </section>
  )
}


