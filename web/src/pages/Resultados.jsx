import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Spin } from 'antd'
import { Trophy, Calendar, ChevronDown, ChevronRight, ExternalLink, Users, Dumbbell, Clock, MapPin, X, SlidersHorizontal } from 'lucide-react'
import { publicCampeonatosService } from '../services/publicCampeonatosService'
import PublicHeader from '../components/landing/PublicHeader'
import FooterInstitucional from '../components/landing/FooterInstitucional'
import { STATUS_LABELS } from '../components/campeonato/statusConfig'
import { FASE_LABEL } from '../components/campeonato/TournamentBracket'
import ModalidadeIcon from '../components/catalogos/ModalidadeIcon'
import GrupoSection from '../components/campeonato/GrupoSection'
import TournamentBracket from '../components/campeonato/TournamentBracket'
import VencedorBanner from '../components/campeonato/VencedorBanner'
import PartidasTimeline from '../components/campeonato/PartidasTimeline'
import { resultadosConfrontoHref } from '../utils/resultadosConfrontoHref'

const STATUS_PILL = {
  GERADO: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-amber-100 text-amber-700',
  FINALIZADO: 'bg-emerald-100 text-emerald-700',
}

function StatusPill({ status }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_PILL[status] || 'bg-slate-100 text-slate-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function StatBadge({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-white/10">
        <Icon size={14} className="text-teal-200" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-extrabold text-white leading-none tabular-nums">{value}</span>
        <span className="text-teal-200/80 text-xs">{label}</span>
      </div>
    </div>
  )
}

function formatProximoConfrontoHorario(iso) {
  if (iso == null || String(iso).trim() === '') return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function scrollResultadosPartidaIntoView(partidaId) {
  window.requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById(`resultados-partida-${partidaId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 280)
  })
}

function ConfrontoCard({ confronto, showSport }) {
  const hasScore = confronto.placar_mandante != null && confronto.placar_visitante != null
  const horarioFmt = formatProximoConfrontoHorario(confronto.inicio_em)
  const horarioLabel = horarioFmt || 'Horário não definido'

  const loc = confronto.local
  const localTexto = loc?.nome != null ? String(loc.nome).trim() : ''
  const localLabel = localTexto || 'Localização não definida'
  const temLinkMaps = Boolean(loc?.link_maps?.trim())

  const href = resultadosConfrontoHref(confronto)
  const podeNavegar = confronto.partida_id != null

  const cardClass =
    'shrink-0 w-56 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-teal-300 transition-all duration-200'

  const conteudo = (
    <>
      <div className="h-1 bg-gradient-to-r from-teal-600 to-teal-400" />
      <div className="p-3 flex flex-col gap-2.5 flex-1">
        {showSport && (
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider truncate">
            {confronto.esporte_nome} · {confronto.categoria_nome}
          </span>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 text-right">
            {confronto.mandante_nome}
          </span>
          {hasScore ? (
            <span className="text-sm font-extrabold text-teal-700 tabular-nums whitespace-nowrap px-1">
              {confronto.placar_mandante} × {confronto.placar_visitante}
            </span>
          ) : (
            <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
              VS
            </span>
          )}
          <span className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
            {confronto.visitante_nome}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 font-medium">
            {FASE_LABEL[confronto.fase] || confronto.fase}
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-50 rounded-full px-2 py-0.5">
            Rd. {confronto.rodada}
          </span>
        </div>

        <div className="mt-0.5 flex flex-col gap-2 border-t border-slate-100 pt-2">
          <div className="flex items-start gap-1.5 text-[10px] leading-snug text-slate-600">
            <Clock size={12} className={`shrink-0 mt-0.5 ${horarioFmt ? 'text-teal-600' : 'text-slate-400'}`} strokeWidth={2.25} />
            <span className={horarioFmt ? '' : 'italic text-slate-400'}>{horarioLabel}</span>
          </div>
          <div className="flex items-start gap-1.5 min-w-0 text-[10px] leading-snug text-slate-600">
            <MapPin size={12} className={`shrink-0 mt-0.5 ${localTexto ? 'text-teal-600' : 'text-slate-400'}`} strokeWidth={2.25} />
            <span className="min-w-0 flex-1">
              <span className={`font-medium ${localTexto ? 'text-slate-700' : 'italic text-slate-400'}`}>{localLabel}</span>
              {temLinkMaps && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.open(loc.link_maps, '_blank', 'noopener,noreferrer')
                  }}
                  className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-teal-600 shrink-0 whitespace-nowrap border-0 bg-transparent p-0 cursor-pointer hover:underline"
                  title="Abrir no mapa"
                >
                  <ExternalLink size={11} />
                  Mapa
                </button>
              )}
            </span>
          </div>
        </div>
      </div>
    </>
  )

  if (!podeNavegar) {
    return <div className={cardClass}>{conteudo}</div>
  }

  return (
    <Link
      to={href}
      className={`${cardClass} no-underline text-inherit outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2`}
    >
      {conteudo}
    </Link>
  )
}

function ProximosConfrontosSection({ confrontos, showSport }) {
  if (confrontos.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={13} className="text-teal-600 shrink-0" />
          <h2 className="text-[10px] font-bold text-teal-700 uppercase tracking-widest m-0">
            Próximos confrontos
          </h2>
        </div>
        <p className="text-sm text-slate-400 m-0">Nenhum confronto pendente no momento.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={13} className="text-teal-600 shrink-0" />
        <h2 className="text-[10px] font-bold text-teal-700 uppercase tracking-widest m-0">
          Próximos confrontos
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {confrontos.map((c) => (
          <ConfrontoCard key={c.partida_id} confronto={c} showSport={showSport} />
        ))}
      </div>
    </section>
  )
}

function SportAccordionSidebar({ esportes, selectedVarianteId, expandedEsporteId, onSelectVariante, onToggleEsporte }) {
  const sorted = [...esportes].sort((a, b) => {
    const aHas = a.variantes.some((v) => v.campeonato !== null) ? 0 : 1
    const bHas = b.variantes.some((v) => v.campeonato !== null) ? 0 : 1
    return aHas - bHas
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Esportes e modalidades
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {sorted.map((esp) => {
          const isOpen = expandedEsporteId === esp.id
          const hasCampeonato = esp.variantes.some((v) => v.campeonato !== null)
          return (
            <div key={esp.id}>
              <button
                type="button"
                onClick={() => onToggleEsporte(esp.id)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left bg-transparent border-0 cursor-pointer"
              >
                <ModalidadeIcon icone={esp.icone} size={14} className={hasCampeonato ? 'text-teal-600 shrink-0' : 'text-slate-400 shrink-0'} />
                <span className="text-sm font-semibold text-slate-700 flex-1 truncate">{esp.nome}</span>
                {isOpen
                  ? <ChevronDown size={13} className="text-slate-400 shrink-0" />
                  : <ChevronRight size={13} className="text-slate-400 shrink-0" />
                }
              </button>
              {isOpen && (
                <div className="border-t border-slate-100">
                  {esp.variantes.map((v) => {
                    const isSelected = selectedVarianteId === v.id
                    const label = `${v.categoria_nome} · ${v.naipe_nome}`
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => onSelectVariante(v)}
                        className={`w-full flex items-center justify-between gap-2 pl-9 pr-3 py-2 text-left transition-colors bg-transparent border-0 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-teal-600 to-teal-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-[11px] leading-snug ${isSelected ? 'font-semibold text-white' : 'text-slate-600'}`}>
                          {label}
                        </span>
                        {v.campeonato ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : (STATUS_PILL[v.campeonato.status] || 'bg-slate-100 text-slate-600')
                          }`}>
                            {STATUS_LABELS[v.campeonato.status] || v.campeonato.status}
                          </span>
                        ) : (
                          <span className={`text-[10px] shrink-0 ${isSelected ? 'text-white/40' : 'text-slate-300'}`}>—</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CampeonatoAside({ campDetail }) {
  const statusVal = campDetail?.status
  const estrutura = campDetail?.estrutura
  const totalEquipes = estrutura?.grupos?.reduce((sum, g) => sum + (g.equipes?.length || 0), 0) || 0
  const finalPartida = estrutura?.partidas?.find((p) => p.fase === 'FINAL' && p.vencedor_equipe_id)

  return (
    <aside className="hidden xl:block w-52 shrink-0 sticky top-24 self-start">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Info</span>
        </div>
        <div className="p-4 flex flex-col gap-4">
          {statusVal && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 m-0">Status</p>
              <StatusPill status={statusVal} />
            </div>
          )}

          {totalEquipes > 0 && (
            <div className="flex items-center gap-2">
              <Users size={14} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 m-0">Equipes</p>
                <p className="text-lg font-extrabold text-slate-700 m-0 leading-tight">{totalEquipes}</p>
              </div>
            </div>
          )}

          {finalPartida && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1 m-0">
                Campeão
              </p>
              <p className="text-sm font-bold text-amber-800 leading-tight m-0">
                {finalPartida.vencedor_nome}
              </p>
            </div>
          )}

          <a
            href={`/resultados/${campDetail.id}`}
            className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 transition-colors no-underline"
          >
            <ExternalLink size={11} />
            Ver página completa
          </a>
        </div>
      </div>
    </aside>
  )
}

export default function Resultados() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsStr = searchParams.toString()
  const processedDeepLinkKeyRef = useRef('')

  const [esportes, setEsportes] = useState([])
  const [proximosGlobal, setProximosGlobal] = useState([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [selectedVarianteId, setSelectedVarianteId] = useState(null)
  const [expandedEsporteId, setExpandedEsporteId] = useState(null)
  const [campDetail, setCampDetail] = useState(null)
  const [proximosCamp, setProximosCamp] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [noChampionship, setNoChampionship] = useState(false)
  const [activeTab, setActiveTab] = useState('grupos')
  const [highlightPartidaId, setHighlightPartidaId] = useState(null)

  useEffect(() => {
    Promise.all([
      publicCampeonatosService.getEsportesComCampeonatos(),
      publicCampeonatosService.getProximosConfrontos(null, 8),
    ])
      .then(([esps, prox]) => {
        setEsportes(esps)
        setProximosGlobal(prox)
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false))
  }, [])

  const fetchAndApplyCampeonato = useCallback((variante, partidaIdToFocus) => {
    if (!variante?.campeonato) {
      setNoChampionship(true)
      setLoadingDetail(false)
      return
    }
    setLoadingDetail(true)
    setNoChampionship(false)
    setCampDetail(null)
    setProximosCamp([])
    Promise.all([
      publicCampeonatosService.getById(variante.campeonato.id),
      publicCampeonatosService.getProximosConfrontos(null, 8, variante.campeonato.id),
    ])
      .then(([detail, prox]) => {
        setCampDetail(detail)
        setProximosCamp(prox)
        const pid =
          partidaIdToFocus != null && Number.isFinite(Number(partidaIdToFocus))
            ? Number(partidaIdToFocus)
            : null
        const found =
          pid != null &&
          (detail?.estrutura?.partidas || []).some(
            (p) => Number(p.id) === pid || String(p.id) === String(pid),
          )
        if (found) {
          setActiveTab('partidas')
          setHighlightPartidaId(pid)
          scrollResultadosPartidaIntoView(pid)
        } else {
          setHighlightPartidaId(null)
          const detailHasGroups = (detail?.estrutura?.grupos?.length || 0) > 0
          const detailHasKnockout = (detail?.estrutura?.partidas || []).some(
            (p) => p.grupo_id === null && !p.is_bye,
          )
          const detailHasAnyPartidas = (detail?.estrutura?.partidas || []).some((p) => !p.is_bye)
          if (!detailHasGroups) {
            if (detailHasKnockout) setActiveTab('eliminatorias')
            else if (detailHasAnyPartidas) setActiveTab('partidas')
          } else {
            setActiveTab('grupos')
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false))
  }, [])

  useEffect(() => {
    if (loadingInit || esportes.length === 0) return

    const pParam = searchParams.get('partida')
    const vParam = searchParams.get('variante')
    const cParam = searchParams.get('campeonato')
    if (!pParam || (!vParam && !cParam)) {
      processedDeepLinkKeyRef.current = ''
      return
    }

    const partidaId = Number(pParam)
    if (!Number.isFinite(partidaId)) return

    let varianteFound = null
    let esporteId = null
    if (vParam) {
      for (const e of esportes) {
        const v = e.variantes.find((x) => String(x.id) === String(vParam))
        if (v) {
          varianteFound = v
          esporteId = e.id
          break
        }
      }
    } else if (cParam) {
      const campeonatoId = Number(cParam)
      if (!Number.isFinite(campeonatoId)) return
      for (const e of esportes) {
        const v = e.variantes.find((x) => x.campeonato?.id === campeonatoId)
        if (v) {
          varianteFound = v
          esporteId = e.id
          break
        }
      }
    }

    if (!varianteFound?.campeonato) return

    const linkKey = `${vParam || cParam}:${pParam}`
    if (processedDeepLinkKeyRef.current === linkKey) return
    processedDeepLinkKeyRef.current = linkKey

    setExpandedEsporteId(esporteId)
    setSelectedVarianteId(varianteFound.id)
    fetchAndApplyCampeonato(varianteFound, partidaId)
  }, [loadingInit, esportes, searchParamsStr, fetchAndApplyCampeonato])

  useEffect(() => {
    if (activeTab !== 'partidas') setHighlightPartidaId(null)
  }, [activeTab])

  function handleSelectVariante(variante) {
    if (selectedVarianteId === variante.id) return
    setSearchParams({}, { replace: true })
    setSelectedVarianteId(variante.id)
    setNoChampionship(false)
    setCampDetail(null)
    setProximosCamp([])
    setActiveTab('grupos')
    setHighlightPartidaId(null)

    if (!variante.campeonato) {
      setNoChampionship(true)
      return
    }

    fetchAndApplyCampeonato(variante, null)
  }

  function handleToggleEsporte(esporteId) {
    setExpandedEsporteId((prev) => (prev === esporteId ? null : esporteId))
  }

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false)

  function openMobileSidebar() {
    setMobileSidebarOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setMobileSidebarVisible(true)))
  }

  function closeMobileSidebar() {
    setMobileSidebarVisible(false)
    setTimeout(() => setMobileSidebarOpen(false), 300)
  }

  function handleMobileSelectVariante(variante) {
    handleSelectVariante(variante)
    closeMobileSidebar()
  }

  const hasGroups = (campDetail?.estrutura?.grupos?.length || 0) > 0
  const hasKnockout = (campDetail?.estrutura?.partidas || []).some((p) => p.grupo_id === null)
  const hasPartidas = (campDetail?.estrutura?.partidas || []).some((p) => !p.is_bye)
  const finalPartida = campDetail?.estrutura?.partidas?.find(
    (p) => p.fase === 'FINAL' && p.vencedor_equipe_id
  )

  const confrontosAtivos = campDetail ? proximosCamp : proximosGlobal
  const showSportLabel = !campDetail

  const selectedEsporte = esportes.find((e) => e.variantes.some((v) => v.id === selectedVarianteId))
  const totalEsportesComCamp = esportes.filter((e) => e.variantes.some((v) => v.campeonato !== null)).length
  const totalCampeonatos = esportes.reduce((sum, e) => sum + e.variantes.filter((v) => v.campeonato !== null).length, 0)

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <PublicHeader />

      <div className="w-full bg-gradient-to-br from-[#042f2e] via-[#0f766e] to-[#0d9488]">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
              <Trophy size={24} className="text-amber-300" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight m-0">Resultados</h1>
              <p className="text-teal-100/70 text-sm m-0 mt-0.5">Campeonatos, classificações e confrontos</p>
            </div>
          </div>
          {!loadingInit && (
            <div className="flex gap-6 flex-wrap">
              <StatBadge icon={Trophy} value={totalCampeonatos} label="Campeonatos" />
              <StatBadge icon={Dumbbell} value={totalEsportesComCamp} label="Esportes" />
              <StatBadge icon={Calendar} value={proximosGlobal.length} label="Confrontos pendentes" />
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
        {loadingInit ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <ProximosConfrontosSection
              confrontos={confrontosAtivos}
              showSport={showSportLabel}
            />

            <div className="lg:hidden">
              <button
                type="button"
                onClick={openMobileSidebar}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm text-left cursor-pointer hover:border-teal-400 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <SlidersHorizontal size={15} className="text-teal-600 shrink-0" />
                  {selectedEsporte ? (
                    <span className="text-sm font-semibold text-slate-700 truncate">
                      {selectedEsporte.nome}
                      {selectedVarianteId && (() => {
                        const v = selectedEsporte.variantes.find((x) => x.id === selectedVarianteId)
                        return v ? <span className="font-normal text-slate-400"> · {v.categoria_nome} · {v.naipe_nome}</span> : null
                      })()}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">Selecionar esporte e modalidade</span>
                  )}
                </span>
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
              </button>

              {mobileSidebarOpen && (
                <>
                  <div
                    className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${mobileSidebarVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={closeMobileSidebar}
                  />
                  <div className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${mobileSidebarVisible ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Esportes e modalidades
                      </span>
                      <button
                        type="button"
                        onClick={closeMobileSidebar}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer text-slate-500"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <SportAccordionSidebar
                        esportes={esportes}
                        selectedVarianteId={selectedVarianteId}
                        expandedEsporteId={expandedEsporteId}
                        onSelectVariante={handleMobileSelectVariante}
                        onToggleEsporte={handleToggleEsporte}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-6 items-start">
              <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl">
                <SportAccordionSidebar
                  esportes={esportes}
                  selectedVarianteId={selectedVarianteId}
                  expandedEsporteId={expandedEsporteId}
                  onSelectVariante={handleSelectVariante}
                  onToggleEsporte={handleToggleEsporte}
                />
              </aside>

              <div className="flex-1 min-w-0 flex gap-4 items-start">
                <div className="flex-1 min-w-0 flex flex-col gap-4">

                  {!selectedVarianteId && (
                    <div className="flex flex-col items-center gap-4 py-16 text-slate-400">
                      <Trophy size={40} strokeWidth={1.5} />
                      <p className="text-base m-0 text-center max-w-xs">
                        Selecione um esporte e modalidade na barra lateral para ver os resultados.
                      </p>
                    </div>
                  )}

                  {selectedVarianteId && loadingDetail && (
                    <div className="flex justify-center py-16">
                      <Spin size="large" />
                    </div>
                  )}

                  {selectedVarianteId && noChampionship && !loadingDetail && (
                    <div className="flex flex-col items-center gap-4 py-16 text-slate-400">
                      <Calendar size={40} strokeWidth={1.5} />
                      <div className="text-center">
                        <p className="text-base font-medium text-slate-600 m-0">
                          Ainda não há campeonato para esta modalidade
                        </p>
                        <p className="text-sm text-slate-400 mt-1 m-0">
                          Fique de olho nas novidades!
                        </p>
                      </div>
                    </div>
                  )}

                  {campDetail && !loadingDetail && (
                    <div className="flex flex-col gap-5">
                      <div className="flex items-start gap-3">
                        {selectedEsporte && (
                          <div className="p-2 rounded-lg bg-teal-50 border border-teal-100 shrink-0 mt-0.5">
                            <ModalidadeIcon icone={selectedEsporte.icone} size={18} className="text-teal-600" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold text-[#042f2e] m-0 tracking-tight">
                              {campDetail.nome}
                            </h2>
                            <StatusPill status={campDetail.status} />
                          </div>
                          <p className="text-sm text-slate-500 m-0 mt-0.5">
                            {[campDetail.esporte_nome, campDetail.categoria_nome, campDetail.naipe_nome]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex gap-1 p-1.5 bg-slate-50 border-b border-slate-100 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setActiveTab('grupos')}
                            disabled={!hasGroups}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              activeTab === 'grupos'
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-800'
                            }`}
                          >
                            Fase de Grupos
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('partidas')}
                            disabled={!hasPartidas}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              activeTab === 'partidas'
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-800'
                            }`}
                          >
                            Partidas
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('eliminatorias')}
                            disabled={!hasKnockout}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              activeTab === 'eliminatorias'
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-800'
                            }`}
                          >
                            <Trophy size={15} />
                            Eliminatórias
                          </button>
                        </div>
                      </div>

                      {activeTab === 'grupos' && (
                        <div className="flex flex-col gap-4">
                          {!hasGroups ? (
                            <p className="text-sm text-slate-400">Este campeonato não possui fase de grupos.</p>
                          ) : (
                            campDetail.estrutura.grupos.map((grupo) => (
                              <GrupoSection
                                key={grupo.id}
                                grupo={grupo}
                                partidas={campDetail.estrutura.partidas}
                                campeonatoId={campDetail.id}
                                config={campDetail.config}
                                wildcardEquipeIds={campDetail.estrutura.wildcard_equipe_ids ?? []}
                                wildcardRanking={campDetail.estrutura.wildcard_ranking ?? []}
                              />
                            ))
                          )}
                        </div>
                      )}

                      {activeTab === 'partidas' && (
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                          <PartidasTimeline
                            partidas={campDetail.estrutura.partidas}
                            grupos={campDetail.estrutura.grupos}
                            highlightPartidaId={highlightPartidaId}
                          />
                        </div>
                      )}

                      {activeTab === 'eliminatorias' && (
                        <div className="flex flex-col gap-4">
                          {campDetail.status === 'FINALIZADO' && finalPartida && (
                            <VencedorBanner
                              vencedorNome={finalPartida.vencedor_nome || `Equipe ${finalPartida.vencedor_equipe_id}`}
                            />
                          )}
                          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                            <TournamentBracket
                              matches={campDetail.estrutura.partidas.filter((p) => p.grupo_id === null)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {campDetail && !loadingDetail && (
                  <CampeonatoAside campDetail={campDetail} />
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <FooterInstitucional />
    </div>
  )
}
