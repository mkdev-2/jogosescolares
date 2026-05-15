import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Loader2 } from 'lucide-react'
import ModalidadeIcon from '../catalogos/ModalidadeIcon'
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
      <img
        src={fotoUrl}
        alt=""
        className={`object-cover bg-slate-100 ${base} ${className}`}
        loading="lazy"
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

/** Card estilo dashboard claro (modelo referência) */
function LightCard({ eyebrow, title, subtitle, children, footer, className = '' }) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100/80 ${className}`}
    >
      <div className="h-1 w-full shrink-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {eyebrow ? (
          <p className="m-0 mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">{eyebrow}</p>
        ) : null}
        <h3 className="m-0 font-display text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500 m-0">{subtitle}</p> : null}
        <div className="mt-4 flex-1">{children}</div>
        {footer ? <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">{footer}</div> : null}
      </div>
    </div>
  )
}

function PlaceholderLight({ title, subtitle, message }) {
  return (
    <LightCard title={title} subtitle={subtitle}>
      <p className="m-0 text-xs leading-relaxed text-slate-500">{message}</p>
    </LightCard>
  )
}

const selectLight =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none transition ' +
  'hover:border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60'

const labelLight = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500'

export default function DestaquesRodadaSection() {
  const [items, setItems] = useState([])
  const [allSports, setAllSports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [esporteId, setEsporteId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [naipe, setNaipe] = useState('')
  const [campeonatoId, setCampeonatoId] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      publicCampeonatosService.getDestaquesLanding(),
      publicCampeonatosService.getEsportesComCampeonatos()
    ])
      .then(([list, esportesList]) => {
        const allowed = ['beach soccer', 'voleibol', 'volei de praia', 'vôlei de praia', 'futsal', 'basquetebol']
        
        const safeList = Array.isArray(list) ? list : []
        const filteredList = safeList.filter((it) => {
          const nome = String(it.esporte_nome || '').toLowerCase()
          return allowed.some((a) => nome.includes(a))
        })

        const safeSports = Array.isArray(esportesList) ? esportesList : []
        const filteredSports = safeSports.filter((it) => {
          const nome = String(it.nome || '').toLowerCase()
          return allowed.some((a) => nome.includes(a))
        })

        setItems(filteredList)
        setAllSports(filteredSports)
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
      .sort((a, b) => String(a.label).localeCompare(String(b.label), 'pt-BR'))
  }, [allSports])

  const itemsPorEsporte = useMemo(() => {
    if (!esporteId) return []
    return items.filter((it) => String(it.esporte_id) === esporteId)
  }, [items, esporteId])

  useEffect(() => {
    if (esportesTabs.length === 0) return
    if (!esporteId || !esportesTabs.some((t) => t.value === esporteId)) {
      setEsporteId(esportesTabs[0]?.value || '')
    }
  }, [esportesTabs, esporteId])

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
      <div className="container-portal px-4 py-10 sm:px-6 md:py-12">
        <div className="mb-6 flex flex-col gap-2 md:mb-8">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">Última rodada com resultados</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="m-0 font-display text-2xl font-black uppercase tracking-tight text-emerald-700 sm:text-3xl md:text-4xl">
              Destaques da rodada
            </h2>
            <Link
              to="/resultados"
              className="hidden shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-md transition hover:bg-emerald-700 lg:inline-flex"
            >
              Ver todos os destaques
              <ChevronRight size={18} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Coluna Esquerda: Abas de Modalidades */}
          <div className="w-full shrink-0 lg:w-64 flex flex-col gap-2">
            <p className="m-0 mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Modalidades
            </p>
            <div className="flex flex-row overflow-x-auto lg:flex-col gap-2 pb-2 lg:pb-0 hide-scrollbar">
              {esportesTabs.map((tab) => {
                const active = tab.value === esporteId
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setEsporteId(tab.value)}
                    className={`inline-flex shrink-0 items-center justify-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold uppercase tracking-wide transition ${
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                        : 'border-emerald-200 bg-white text-emerald-800 shadow-sm hover:border-emerald-400 hover:bg-emerald-50/80'
                    }`}
                  >
                    <ModalidadeIcon icone={tab.icone} size={18} className={active ? 'text-white' : 'text-emerald-600'} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Coluna Direita: Cards mapeados por Categoria/Naipe */}
          <div className="flex-1 min-w-0">
            {itemsPorEsporte.length > 0 ? (
              <div className="flex flex-col gap-10">
                {itemsPorEsporte.map((camp) => {
                  const unidade = camp.unidade_placar || ''
                  const labelUnidade = String(unidade).toUpperCase() === 'CESTAS' ? 'cestas' : 'gols'
                  const labelContra =
                    String(unidade).toUpperCase() === 'CESTAS'
                      ? 'cestas sofridas'
                      : String(unidade).toUpperCase() === 'SETS'
                        ? 'sets sofridos'
                        : 'gols sofridos'

                  const top = camp.top_pontuadores || []
                  const primeiro = top[0]
                  const mostrarInd = Boolean(camp.mostrar_pontuadores_individuais)
                  const jogo = camp.jogo_destaque
                  const def = camp.equipe_defesa
                  const mediaSofridos =
                    def && def.jogos_rodada > 0 ? (def.sofridos_rodada / def.jogos_rodada).toFixed(1).replace('.', ',') : '—'

                  const tagModalidade = `${camp.esporte_nome} ${camp.naipe_nome}`.trim()

                  return (
                    <div key={camp.campeonato_id} className="flex flex-col gap-5">
                      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                        <h3 className="m-0 text-lg font-black uppercase text-slate-800">
                          {camp.categoria_nome} - {camp.naipe_nome}
                        </h3>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-200">
                          {camp.campeonato_nome}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {/* 1 — Jogo da rodada */}
                        {jogo ? (
                          <LightCard
                            eyebrow="Destaque"
                            title="Jogo da rodada"
                            subtitle="Maior soma de gols"
                            footer={
                              <span className="font-medium text-slate-600">
                                Rodada {camp.rodada_referencia}
                              </span>
                            }
                          >
                            <div className="flex flex-col items-stretch gap-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                                  <EscolaMark nome={jogo.mandante_nome} />
                                  <span className="text-[11px] font-bold leading-snug text-slate-800 line-clamp-2">
                                    {jogo.mandante_nome}
                                  </span>
                                </div>
                                <div className="flex shrink-0 flex-col items-center gap-1.5 px-1">
                                  <span className="font-display text-2xl font-black tabular-nums text-emerald-700 sm:text-3xl">
                                    {jogo.placar_mandante} × {jogo.placar_visitante}
                                  </span>
                                  {tagModalidade ? (
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
                                      {tagModalidade}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                                  <EscolaMark nome={jogo.visitante_nome} />
                                  <span className="text-[11px] font-bold leading-snug text-slate-800 line-clamp-2">
                                    {jogo.visitante_nome}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </LightCard>
                        ) : (
                          <PlaceholderLight
                            title="Jogo da rodada"
                            subtitle="Maior placar"
                            message="Nenhum confronto com placar nesta rodada."
                          />
                        )}

                        {/* 2 — Equipe em destaque */}
                        {def ? (
                          <LightCard
                            eyebrow="Coletivo"
                            title="Equipe em destaque"
                            subtitle="Menor soma de gols sofridos"
                            footer={<span className="font-medium text-slate-600">Rodada {camp.rodada_referencia}</span>}
                          >
                            <div className="flex flex-col items-center gap-4 text-center">
                              <EscolaMark nome={def.nome_escola} className="!h-16 !w-16 text-base" />
                              <p className="m-0 text-lg font-black leading-tight text-slate-900">{def.nome_escola}</p>
                              <div className="grid w-full grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl bg-slate-50 py-2 ring-1 ring-slate-100">
                                  <p className="m-0 text-lg font-black tabular-nums text-emerald-700">{def.jogos_rodada}</p>
                                  <p className="m-0 mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Jogos</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 py-2 ring-1 ring-slate-100">
                                  <p className="m-0 text-lg font-black tabular-nums text-emerald-700">{def.sofridos_rodada}</p>
                                  <p className="m-0 mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                                    Sofridos
                                  </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 py-2 ring-1 ring-slate-100">
                                  <p className="m-0 text-lg font-black tabular-nums text-emerald-700">{mediaSofridos}</p>
                                  <p className="m-0 mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                                    Média
                                  </p>
                                </div>
                              </div>
                              <p className="m-0 text-[11px] text-slate-500">{labelContra} no critério.</p>
                            </div>
                          </LightCard>
                        ) : (
                          <PlaceholderLight
                            title="Equipe em destaque"
                            subtitle="Coletivo"
                            message="Não foi possível calcular o destaque de equipe para esta rodada."
                          />
                        )}

                        {/* 3 — Destaque individual */}
                        {mostrarInd && primeiro ? (
                          <LightCard
                            eyebrow="Individual"
                            title="Destaque individual"
                            subtitle="Maior número de gols"
                            footer={
                              <span className="text-slate-600">
                                {primeiro.total} {labelUnidade} — {primeiro.escola_nome}
                              </span>
                            }
                          >
                            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                              <AvatarAtleta
                                nome={primeiro.estudante_nome}
                                fotoUrl={primeiro.foto_url}
                                round
                                className="h-24 w-24 shrink-0 border-4 border-emerald-50 shadow-md sm:h-28 sm:w-28"
                              />
                              <div className="min-w-0 flex-1 text-center sm:text-left">
                                <p className="m-0 font-display text-4xl font-black tabular-nums text-emerald-700 sm:text-5xl">
                                  {primeiro.total}
                                  <span className="ml-1 text-base font-bold text-slate-600 sm:text-lg">{labelUnidade}</span>
                                </p>
                                <p className="mt-2 m-0 text-base font-bold text-slate-900">{primeiro.estudante_nome}</p>
                                <p className="mt-0.5 m-0 text-xs text-slate-500">{primeiro.escola_nome}</p>
                              </div>
                            </div>
                          </LightCard>
                        ) : (
                          <PlaceholderLight
                            title="Destaque individual"
                            subtitle="Gols na rodada"
                            message="Disponível em modalidades com registro por atleta (gols ou cestas)."
                          />
                        )}

                        {/* 4 — Artilharia da rodada */}
                        {mostrarInd && top.length > 0 ? (
                          <LightCard
                            eyebrow="Ranking"
                            title="Artilharia da rodada"
                            subtitle="Top 3 jogadores"
                            footer={
                              <Link
                                to={`/resultados/${camp.campeonato_id}`}
                                className="inline-flex items-center gap-1 font-bold text-emerald-700 no-underline hover:text-emerald-900"
                              >
                                Ver ranking completo
                                <ChevronRight size={14} strokeWidth={2.5} />
                              </Link>
                            }
                          >
                            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                              {top.map((p) => (
                                <li
                                  key={p.estudante_id}
                                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-2"
                                >
                                  <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                                      p.posicao === 1
                                        ? 'bg-amber-500'
                                        : p.posicao === 2
                                          ? 'bg-slate-400'
                                          : 'bg-amber-800/80'
                                    }`}
                                  >
                                    {p.posicao}
                                  </span>
                                  <AvatarAtleta nome={p.estudante_nome} fotoUrl={p.foto_url} round className="h-10 w-10 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-slate-900 m-0">{p.estudante_nome}</p>
                                    <p className="truncate text-[10px] text-slate-500 m-0">{p.escola_nome}</p>
                                  </div>
                                  <span className="shrink-0 text-sm font-black tabular-nums text-emerald-700">
                                    {p.total} {labelUnidade}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </LightCard>
                        ) : (
                          <PlaceholderLight
                            title="Artilharia da rodada"
                            subtitle="Top 3"
                            message="Ranking individual quando houver dados de artilharia na rodada."
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center mt-2">
                <p className="m-0 text-sm font-bold text-slate-600">Nenhum destaque disponível para esta modalidade no momento.</p>
                <p className="m-0 mt-2 text-xs text-slate-500 max-w-sm">
                  Os resultados dos destaques aparecerão aqui assim que houverem partidas concluídas na fase de grupos para este esporte.
                </p>
              </div>
            )}

            {itemsPorEsporte.length > 0 && (
              <div className="flex flex-col items-stretch justify-between gap-4 border-t border-slate-200 mt-8 pt-6 sm:flex-row sm:items-center">
                <p className="m-0 text-center text-[11px] text-slate-500 sm:text-left">
                  Dados atualizados em {atualizadoEm}
                </p>
                <Link
                  to="/resultados"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-md transition hover:bg-emerald-700 lg:hidden"
                >
                  Ver todos os destaques
                  <ChevronRight size={18} strokeWidth={2.5} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
