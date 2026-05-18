import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Loader2, Trophy, User, Target, X, Calendar } from 'lucide-react'
import ModalidadeIcon from '../catalogos/ModalidadeIcon'
import { publicCampeonatosService } from '../../services/publicCampeonatosService'
import StorageImage from '../StorageImage'

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

/** Card estilo dashboard claro com faixa superior verde escura (modelo referência) */
function LightCard({ title, subtitle, icon: IconComponent, children, className = '' }) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow transition-all duration-200 ${className}`}
    >
      {/* Faixa superior verde escura */}
      <div className="bg-[#044f38] px-6 py-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="text-white shrink-0" size={16} strokeWidth={2.5} />}
          <h3 className="m-0 font-display text-sm font-black uppercase tracking-wide text-white leading-none">
            {title}
          </h3>
        </div>
        {subtitle ? (
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/80 m-0 leading-none">
            {subtitle}
          </p>
        ) : null}
      </div>
      {/* Corpo do card */}
      <div className="p-6 flex flex-1 flex-col">{children}</div>
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

export default function DestaquesRodadaSection() {
  const [items, setItems] = useState([])
  const [allSports, setAllSports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [esporteId, setEsporteId] = useState('')
  const [activeCampId, setActiveCampId] = useState('')
  const [modalData, setModalData] = useState(null)

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

        setItems(filteredList)
        setAllSports(Object.values(agrupados))
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

  // Resetar activeCampId quando o esporteId muda
  useEffect(() => {
    if (itemsPorEsporte.length > 0) {
      // Se o activeCampId atual não está na lista do esporte selecionado, reseta pro primeiro
      if (!itemsPorEsporte.find(it => String(it.campeonato_id) === activeCampId)) {
        setActiveCampId(String(itemsPorEsporte[0].campeonato_id))
      }
    } else {
      setActiveCampId('')
    }
  }, [itemsPorEsporte, esporteId])

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
        <div className="mb-8 flex flex-col items-center text-center md:mb-10">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
              <Trophy size={18} strokeWidth={2.25} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
              Os melhores
            </span>
          </div>
          <h2 className="m-0 font-display text-2xl font-black uppercase tracking-tight text-[#042f2e] md:text-3xl">
            Destaques da <span className="text-emerald-600">rodada</span>
          </h2>
        </div>

        <div className="flex flex-col gap-6 md:gap-8">
          {/* Abas de Modalidades no topo (horizontal) */}
          <div className="w-full flex flex-col gap-2.5">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Modalidades
            </p>
            <div className="flex flex-row overflow-x-auto gap-2.5 pb-2.5 hide-scrollbar">
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

          {/* Cards de Destaque em largura total */}
          <div className="w-full min-w-0">
            {itemsPorEsporte.length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* Abas Internas: Categoria / Naipe */}
                {itemsPorEsporte.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
                    {itemsPorEsporte.map((camp) => {
                      const active = String(camp.campeonato_id) === activeCampId
                      return (
                        <button
                          key={camp.campeonato_id}
                          onClick={() => setActiveCampId(String(camp.campeonato_id))}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-sm ring-1 ring-emerald-100/30'
                              : 'text-slate-400 hover:text-slate-600 border border-transparent'
                            }`}
                        >
                          {camp.naipe_nome} — {camp.categoria_nome}
                        </button>
                      )
                    })}
                  </div>
                )}

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
                  const primeiro = top[0]
                  const mostrarInd = Boolean(camp.mostrar_pontuadores_individuais)
                  const jogo = camp.jogo_destaque
                  const def = camp.equipe_defesa

                  return (
                    <div key={camp.campeonato_id} className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-stretch">
                        {/* Coluna Esquerda: Artilharia da rodada (Top 10 Destaques) - Ocupa 2/4 (Metade da tela) */}
                        <div className="lg:col-span-2">
                          {mostrarInd && top.length > 0 ? (
                            <LightCard
                              title="Artilharia da rodada"
                              subtitle={String(camp.naipe_nome).toUpperCase() === 'FEMININO' ? 'TOP 10 ARTILHEIRAS' : 'TOP 10 ARTILHEIROS'}
                              icon={Trophy}
                              className="h-full"
                            >
                              <div className="flex flex-col justify-between h-full flex-1">
                                <div className="mt-2">
                                  <ul className="m-0 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 p-0 list-none">
                                    {top.slice(0, 6).map((p) => {
                                      const positionBg =
                                        p.posicao === 1
                                          ? 'bg-amber-400'
                                          : p.posicao === 2
                                            ? 'bg-slate-300'
                                            : p.posicao === 3
                                              ? 'bg-amber-700/70'
                                              : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/50'
                                      const positionText = p.posicao > 3 ? 'text-slate-500' : 'text-white'

                                      return (
                                        <li
                                          key={p.estudante_id}
                                          className="flex items-center justify-between py-2 border-b border-slate-100/70 last:border-0 sm:[&:nth-last-child(-n+2)]:border-0"
                                        >
                                          <div className="flex items-center min-w-0 flex-1">
                                            <span
                                              className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[9px] font-black shadow-sm ${positionBg} ${positionText}`}
                                              style={{ width: '22px', height: '22px' }}
                                            >
                                              {p.posicao}
                                            </span>
                                            <span className="ml-3 truncate text-sm font-bold text-slate-800">
                                              {p.estudante_nome}
                                            </span>
                                          </div>
                                          <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">
                                            <strong className="text-[#044f38] text-sm font-black mr-0.5">{p.total}</strong> {p.total === 1 ? labelUnidade.replace(/s$/, '') : labelUnidade}
                                          </span>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                </div>
                                {top.length > 6 && (
                                  <div className="mt-auto pt-4 flex justify-center border-t border-slate-100/70">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setModalData({
                                          campeonato_nome: camp.campeonato_nome,
                                          rodada: camp.rodada_referencia,
                                          top,
                                          labelUnidade,
                                        })
                                      }
                                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-800 transition hover:bg-slate-50 active:scale-95 shadow-sm"
                                    >
                                      Ver ranking completo
                                      <ChevronRight size={14} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </LightCard>
                          ) : (
                            <PlaceholderLight
                              title="Artilharia da rodada"
                              subtitle="Top 10"
                              message="Ranking individual visível quando houver registro de atletas na rodada."
                              icon={Trophy}
                            />
                          )}
                        </div>

                        {/* Coluna Central: Atleta Destaque - Ocupa 1/4 */}
                        <div className="lg:col-span-1">
                          {mostrarInd && primeiro ? (
                            <LightCard
                              title="Atleta destaque"
                              subtitle="Melhor desempenho"
                              icon={User}
                              className="h-full"
                            >
                              <div className="flex flex-col items-center justify-center h-full flex-1 py-2 text-center">
                                <AvatarAtleta
                                  nome={primeiro.estudante_nome}
                                  fotoUrl={primeiro.estudante_foto_url}
                                  className="h-12 w-12 rounded-full border-2 border-emerald-50 ring-2 ring-emerald-100/30 shadow-sm"
                                  round
                                />
                                <h4 className="m-0 mt-2 text-sm font-black text-slate-800 uppercase tracking-wide leading-tight line-clamp-1 max-w-[180px]">
                                  {primeiro.estudante_nome}
                                </h4>
                                <p className="m-0 mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider line-clamp-1 max-w-[180px]">
                                  {primeiro.escola_nome}
                                </p>

                                <div className="mt-3.5 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100/50 rounded-full px-3 py-1 shadow-sm">
                                  <span className="text-xs font-semibold text-slate-500">Marcou</span>
                                  <span className="text-xs font-black text-[#044f38]">
                                    {primeiro.total} {primeiro.total === 1 ? labelUnidade.replace(/s$/, '') : labelUnidade}
                                  </span>
                                </div>
                              </div>
                            </LightCard>
                          ) : (
                            <PlaceholderLight
                              title="Atleta destaque"
                              subtitle="Melhor desempenho"
                              message="Visível com registros de atletas."
                              icon={User}
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
                              className="h-full"
                            >
                              <div className="flex flex-col justify-between h-full flex-1 py-1">
                                <div className="flex w-full items-center justify-center py-2 px-1">
                                  <div className="flex items-center justify-center font-display text-4xl font-black tracking-tight tabular-nums text-emerald-950 bg-slate-50/70 px-5 py-2 rounded-2xl border border-slate-100/60 shadow-sm">
                                    {jogo.placar_mandante}
                                    <span className="text-xl text-emerald-800/30 font-black mx-3">×</span>
                                    {jogo.placar_visitante}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                  <div className="text-left flex flex-col min-w-0">
                                    <span className="text-xs font-black text-slate-700 line-clamp-3 leading-snug">
                                      {jogo.mandante_nome}
                                    </span>
                                  </div>
                                  <div className="text-right flex flex-col items-end min-w-0">
                                    <span className="text-xs font-black text-slate-700 line-clamp-3 leading-snug">
                                      {jogo.visitante_nome}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-4 pt-3.5 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 leading-none">
                                  <Calendar size={12} className="text-slate-400 shrink-0" strokeWidth={2.5} />
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
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center mt-2">
                <p className="m-0 text-sm font-bold text-slate-600">Nenhum destaque disponível para esta modalidade no momento.</p>
                <p className="m-0 mt-2 text-xs text-slate-500 max-w-sm">
                  Os resultados dos destaques aparecerão aqui assim que houverem partidas concluídas na fase de grupos para este esporte.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Ranking Completo */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          {/* Backdrop que fecha ao clicar fora */}
          <div
            className="absolute inset-0 cursor-default"
            onClick={() => setModalData(null)}
          />

          {/* Conteúdo do Modal */}
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-100 p-6 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">

            {/* Botão de Fechar */}
            <button
              type="button"
              onClick={() => setModalData(null)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Fechar"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="mb-5 pr-8">
              <div className="flex items-center gap-2 text-emerald-700 mb-1">
                <Trophy size={18} strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-wider">Artilharia da Rodada</span>
              </div>
              <h3 className="m-0 text-lg font-black text-slate-800 leading-tight">
                {modalData.campeonato_nome}
              </h3>
              <p className="m-0 text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                Rodada {modalData.rodada}
              </p>
            </div>

            {/* Lista com Rolagem caso ultrapasse a altura */}
            <div className="overflow-y-auto pr-1 flex-1 hide-scrollbar">
              <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
                {modalData.top.map((p) => {
                  const positionBg =
                    p.posicao === 1
                      ? 'bg-amber-400'
                      : p.posicao === 2
                        ? 'bg-slate-300'
                        : p.posicao === 3
                          ? 'bg-amber-700/70'
                          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/50'
                  const positionText = p.posicao > 3 ? 'text-slate-500' : 'text-white'

                  return (
                    <li
                      key={p.estudante_id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50/70 transition-all duration-150"
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black shadow-sm ${positionBg} ${positionText}`}
                          style={{ width: '24px', height: '24px' }}
                        >
                          {p.posicao}
                        </span>

                        <div className="ml-3.5 min-w-0 flex flex-col">
                          <span className="truncate text-xs font-black text-slate-800 leading-snug">
                            {p.estudante_nome}
                          </span>
                          <span className="truncate text-[10px] font-semibold text-slate-400 mt-0.5 leading-none">
                            {p.escola_nome}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-emerald-700 shrink-0 ml-3 bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-full">
                        {p.total} {p.total === 1 ? modalData.labelUnidade.replace(/s$/, '') : modalData.labelUnidade}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

          </div>
        </div>
      )}
    </section>
  )
}


