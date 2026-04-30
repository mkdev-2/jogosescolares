import { useEffect, useState } from 'react'
import { Spin, Tag, Select } from 'antd'
import { Trophy, Calendar, ChevronDown, ChevronRight, ExternalLink, Users } from 'lucide-react'
import { publicCampeonatosService } from '../services/publicCampeonatosService'
import PublicHeader from '../components/landing/PublicHeader'
import FooterInstitucional from '../components/landing/FooterInstitucional'
import { STATUS_COLORS, STATUS_LABELS } from '../components/campeonato/statusConfig'
import { FASE_LABEL } from '../components/campeonato/TournamentBracket'
import ModalidadeIcon from '../components/catalogos/ModalidadeIcon'
import GrupoSection from '../components/campeonato/GrupoSection'
import TournamentBracket from '../components/campeonato/TournamentBracket'
import VencedorBanner from '../components/campeonato/VencedorBanner'

function ConfrontoCard({ confronto, showSport }) {
  return (
    <div className="shrink-0 w-52 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:border-teal-300 transition-all">
      <div className="h-1 bg-teal-500" />
      <div className="p-3 flex flex-col gap-2 flex-1">
        {showSport && (
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider truncate">
            {confronto.esporte_nome} · {confronto.categoria_nome}
          </span>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
            {confronto.mandante_nome}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">vs</span>
          <span className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
            {confronto.visitante_nome}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-wrap mt-auto pt-1">
          <span className="text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 font-medium">
            {FASE_LABEL[confronto.fase] || confronto.fase}
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-50 rounded px-1.5 py-0.5">
            Rd. {confronto.rodada}
          </span>
        </div>
      </div>
    </div>
  )
}

function ProximosConfrontosSection({ confrontos, showSport }) {
  if (confrontos.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <h2 className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-1 m-0">
          Próximos confrontos
        </h2>
        <p className="text-sm text-slate-400 m-0">Nenhum confronto pendente no momento.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3 m-0">
        Próximos confrontos
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {confrontos.map((c) => (
          <ConfrontoCard key={c.partida_id} confronto={c} showSport={showSport} />
        ))}
      </div>
    </section>
  )
}

function SportAccordionSidebar({ esportes, selectedVarianteId, expandedEsporteId, onSelectVariante, onToggleEsporte }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Esportes e modalidades
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {esportes.map((esp) => {
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
                        className={`w-full flex items-center justify-between gap-2 pl-9 pr-3 py-2 text-left transition-colors bg-transparent border-0 border-l-2 border-solid cursor-pointer ${
                          isSelected
                            ? 'border-l-teal-500 bg-teal-50/60'
                            : 'border-l-transparent hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-[11px] leading-snug ${isSelected ? 'font-semibold text-teal-700' : 'text-slate-600'}`}>
                          {label}
                        </span>
                        {v.campeonato ? (
                          <Tag color={STATUS_COLORS[v.campeonato.status] || 'default'} style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                            {STATUS_LABELS[v.campeonato.status] || v.campeonato.status}
                          </Tag>
                        ) : (
                          <span className="text-[10px] text-slate-300 shrink-0">—</span>
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
              <Tag color={STATUS_COLORS[statusVal] || 'default'}>
                {STATUS_LABELS[statusVal] || statusVal}
              </Tag>
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

  function handleSelectVariante(variante) {
    if (selectedVarianteId === variante.id) return
    setSelectedVarianteId(variante.id)
    setNoChampionship(false)
    setCampDetail(null)
    setProximosCamp([])
    setActiveTab('grupos')

    if (!variante.campeonato) {
      setNoChampionship(true)
      return
    }

    setLoadingDetail(true)
    Promise.all([
      publicCampeonatosService.getById(variante.campeonato.id),
      publicCampeonatosService.getProximosConfrontos(null, 8, variante.campeonato.id),
    ])
      .then(([detail, prox]) => {
        setCampDetail(detail)
        setProximosCamp(prox)
        const hasGroups = (detail?.estrutura?.grupos?.length || 0) > 0
        const hasKnockout = (detail?.estrutura?.partidas || []).some((p) => p.grupo_id === null)
        if (!hasGroups && hasKnockout) setActiveTab('eliminatorias')
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false))
  }

  function handleToggleEsporte(esporteId) {
    setExpandedEsporteId((prev) => (prev === esporteId ? null : esporteId))
  }

  const mobileOptions = esportes.flatMap((esp) =>
    esp.variantes.map((v) => ({
      label: `${esp.nome} — ${v.categoria_nome} · ${v.naipe_nome}`,
      value: v.id,
    }))
  )

  function handleMobileSelect(varianteId) {
    const variante = esportes.flatMap((e) => e.variantes).find((v) => v.id === varianteId)
    if (variante) handleSelectVariante(variante)
  }

  const hasGroups = (campDetail?.estrutura?.grupos?.length || 0) > 0
  const hasKnockout = (campDetail?.estrutura?.partidas || []).some((p) => p.grupo_id === null)
  const finalPartida = campDetail?.estrutura?.partidas?.find(
    (p) => p.fase === 'FINAL' && p.vencedor_equipe_id
  )

  const confrontosAtivos = campDetail ? proximosCamp : proximosGlobal
  const showSportLabel = !campDetail

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <PublicHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-extrabold text-[#042f2e] tracking-tight m-0">Resultados</h1>
          <p className="text-slate-500 mt-1 text-base m-0">
            Acompanhe campeonatos, classificações e próximos confrontos em tempo real.
          </p>
        </header>

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
              <Select
                placeholder="Selecione um esporte / modalidade"
                style={{ width: '100%' }}
                value={selectedVarianteId}
                onChange={handleMobileSelect}
                options={mobileOptions}
                size="large"
              />
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
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-[#042f2e] m-0 tracking-tight">
                            {campDetail.nome}
                          </h2>
                          <Tag color={STATUS_COLORS[campDetail.status] || 'default'}>
                            {STATUS_LABELS[campDetail.status] || campDetail.status}
                          </Tag>
                        </div>
                        <p className="text-sm text-slate-500 m-0 mt-0.5">
                          {[campDetail.esporte_nome, campDetail.categoria_nome, campDetail.naipe_nome]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex gap-0 p-2 border-b border-slate-100">
                          <button
                            type="button"
                            onClick={() => setActiveTab('grupos')}
                            disabled={!hasGroups}
                            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              activeTab === 'grupos'
                                ? 'bg-[#f1f5f9] text-[#0f766e]'
                                : 'bg-transparent text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Fase de Grupos
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('eliminatorias')}
                            disabled={!hasKnockout}
                            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              activeTab === 'eliminatorias'
                                ? 'bg-[#f1f5f9] text-[#0f766e]'
                                : 'bg-transparent text-slate-700 hover:bg-slate-50'
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
