import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Select } from 'antd'
import {
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  ExternalLink,
  Filter,
  Dumbbell,
  Trophy,
} from 'lucide-react'
import { publicCampeonatosService } from '../services/publicCampeonatosService'
import PublicHeader from '../components/landing/PublicHeader'
import FooterInstitucional from '../components/landing/FooterInstitucional'
import ModalidadeIcon from '../components/catalogos/ModalidadeIcon'
import { resultadosConfrontoHref } from '../utils/resultadosConfrontoHref'

const LIMITE_PARTIDAS = 50

function formatHora(iso) {
  if (iso == null || String(iso).trim() === '') return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDataChave(iso) {
  // Chave estável de agrupamento (yyyy-mm-dd) ou "sem-data"
  if (iso == null || String(iso).trim() === '') return 'sem-data'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'sem-data'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDataExibicao(iso) {
  if (iso == null) return 'Data a definir'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Data a definir'
  const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
  const dataFmt = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  return `${diaSemanaCap}, ${dataFmt}`
}

function isMesmoDia(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function labelRelativoDoDia(iso) {
  if (iso == null) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const hoje = new Date()
  const amanha = new Date()
  amanha.setDate(hoje.getDate() + 1)
  if (isMesmoDia(d, hoje)) return 'Hoje'
  if (isMesmoDia(d, amanha)) return 'Amanhã'
  return null
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

function PartidaCard({ partida }) {
  const hora = formatHora(partida.inicio_em)
  const loc = partida.local
  const localNome = loc?.nome?.trim()
  const temMaps = Boolean(loc?.link_maps?.trim())

  const href = resultadosConfrontoHref(partida)
  const podeNavegar = partida.partida_id != null

  const conteudo = (
    <>
      {/* Coluna do horário */}
      <div className="flex flex-col items-center justify-center w-16 sm:w-20 shrink-0 py-3 px-2 bg-gradient-to-b from-teal-50 to-white border-r border-slate-100">
        {hora ? (
          <>
            <span className="text-lg sm:text-xl font-extrabold text-teal-700 leading-none tabular-nums">
              {hora}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">
              horário
            </span>
          </>
        ) : (
          <span className="text-[10px] italic text-slate-400 text-center leading-tight">
            Horário a definir
          </span>
        )}
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 py-3 px-3 sm:px-4 flex flex-col gap-2">
        {/* Esporte / categoria / naipe */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <ModalidadeIcon
            icone={partida.icone}
            size={12}
            className="text-teal-600 shrink-0"
          />
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider truncate">
            {partida.esporte_nome}
          </span>
          <span className="text-[10px] text-slate-300">·</span>
          <span className="text-[10px] text-slate-500 font-medium truncate">
            {partida.categoria_nome} · {partida.naipe_nome}
          </span>
        </div>

        {/* Times */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 text-right">
            {partida.mandante_nome || 'A definir'}
          </span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 shrink-0">
            VS
          </span>
          <span className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
            {partida.visitante_nome || 'A definir'}
          </span>
        </div>

        {/* Local */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0 border-t border-slate-100 pt-2">
          <MapPin
            size={12}
            className={`shrink-0 ${localNome ? 'text-teal-600' : 'text-slate-400'}`}
            strokeWidth={2.25}
          />
          <span className={`truncate min-w-0 flex-1 ${localNome ? 'font-medium text-slate-700' : 'italic text-slate-400'}`}>
            {localNome || 'Local a definir'}
          </span>
          {temMaps && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.open(loc.link_maps, '_blank', 'noopener,noreferrer')
              }}
              className="ml-1 inline-flex items-center gap-0.5 font-semibold text-teal-600 shrink-0 whitespace-nowrap border-0 bg-transparent p-0 cursor-pointer hover:underline"
              title="Abrir no mapa"
            >
              <ExternalLink size={11} />
              Mapa
            </button>
          )}
        </div>
      </div>
    </>
  )

  const baseClass =
    'flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-teal-300 transition-all duration-200'

  if (!podeNavegar) {
    return <div className={baseClass}>{conteudo}</div>
  }

  return (
    <Link
      to={href}
      className={`${baseClass} no-underline text-inherit outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2`}
    >
      {conteudo}
    </Link>
  )
}

function DiaSection({ chave, partidas }) {
  const primeiroIso = partidas.find((p) => p.inicio_em)?.inicio_em ?? null
  const semData = chave === 'sem-data'
  const tituloPrincipal = semData ? 'Sem data definida' : formatDataExibicao(primeiroIso)
  const labelRelativo = !semData ? labelRelativoDoDia(primeiroIso) : null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3 sticky top-[140px] z-10 bg-[#f8fafc]/95 backdrop-blur-sm py-2 -mx-2 px-2 rounded-lg">
        <div className={`p-2 rounded-lg shrink-0 ${semData ? 'bg-slate-100' : 'bg-teal-50 border border-teal-100'}`}>
          <CalendarDays
            size={16}
            className={semData ? 'text-slate-400' : 'text-teal-600'}
          />
        </div>
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-[#042f2e] m-0 tracking-tight">
            {tituloPrincipal}
          </h2>
          {labelRelativo && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {labelRelativo}
            </span>
          )}
          <span className="text-xs text-slate-500 font-medium">
            {partidas.length} {partidas.length === 1 ? 'partida' : 'partidas'}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {partidas.map((p) => (
          <PartidaCard key={p.partida_id} partida={p} />
        ))}
      </div>
    </section>
  )
}

export default function Agenda() {
  const [partidas, setPartidas] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroEsporte, setFiltroEsporte] = useState(null)
  const [filtroNaipe, setFiltroNaipe] = useState(null)
  const [filtroLocal, setFiltroLocal] = useState(null)

  useEffect(() => {
    let ativo = true
    setLoading(true)
    publicCampeonatosService
      .getProximosConfrontos(null, LIMITE_PARTIDAS)
      .then((data) => {
        if (!ativo) return
        setPartidas(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!ativo) return
        setPartidas([])
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  // Opções de filtros derivadas das partidas carregadas
  const esporteOptions = useMemo(() => {
    const set = new Map()
    for (const p of partidas) {
      if (p.esporte_nome && !set.has(p.esporte_nome)) {
        set.set(p.esporte_nome, { label: p.esporte_nome, value: p.esporte_nome })
      }
    }
    return [...set.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [partidas])

  const naipeOptions = useMemo(() => {
    const set = new Map()
    for (const p of partidas) {
      if (p.naipe_nome && !set.has(p.naipe_nome)) {
        set.set(p.naipe_nome, { label: p.naipe_nome, value: p.naipe_nome })
      }
    }
    return [...set.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [partidas])

  const localOptions = useMemo(() => {
    const set = new Map()
    for (const p of partidas) {
      const nome = p.local?.nome?.trim()
      if (nome && !set.has(nome)) {
        set.set(nome, { label: nome, value: nome })
      }
    }
    return [...set.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [partidas])

  // Aplicar filtros
  const partidasFiltradas = useMemo(() => {
    return partidas.filter((p) => {
      if (filtroEsporte && p.esporte_nome !== filtroEsporte) return false
      if (filtroNaipe && p.naipe_nome !== filtroNaipe) return false
      if (filtroLocal && p.local?.nome !== filtroLocal) return false
      return true
    })
  }, [partidas, filtroEsporte, filtroNaipe, filtroLocal])

  // Agrupamento por dia (ordem cronológica; 'sem-data' por último)
  const gruposPorDia = useMemo(() => {
    const mapa = new Map()
    for (const p of partidasFiltradas) {
      const chave = formatDataChave(p.inicio_em)
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave).push(p)
    }
    const entradas = [...mapa.entries()]
    entradas.sort(([a], [b]) => {
      if (a === 'sem-data') return 1
      if (b === 'sem-data') return -1
      return a.localeCompare(b)
    })
    return entradas
  }, [partidasFiltradas])

  const totalEsportes = esporteOptions.length
  const totalLocais = localOptions.length
  const totalPartidas = partidasFiltradas.length
  const temFiltroAtivo = !!(filtroEsporte || filtroNaipe || filtroLocal)

  function limparFiltros() {
    setFiltroEsporte(null)
    setFiltroNaipe(null)
    setFiltroLocal(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <PublicHeader />

      {/* Hero */}
      <div className="w-full bg-gradient-to-br from-[#042f2e] via-[#0f766e] to-[#0d9488]">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
              <Calendar size={24} className="text-teal-200" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight m-0">
                Agenda de Partidas
              </h1>
              <p className="text-teal-100/70 text-sm m-0 mt-0.5">
                Próximas partidas em ordem cronológica, com horário e local
              </p>
            </div>
          </div>
          {!loading && (
            <div className="flex gap-6 flex-wrap">
              <StatBadge icon={Calendar} value={partidas.length} label="Partidas pendentes" />
              <StatBadge icon={Dumbbell} value={totalEsportes} label="Esportes" />
              <StatBadge icon={MapPin} value={totalLocais} label="Locais" />
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* Barra de filtros */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-[88px] z-20">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={14} className="text-teal-600" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Filtrar agenda
                </span>
                {temFiltroAtivo && (
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="ml-auto text-[11px] font-semibold text-teal-700 hover:text-teal-900 transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select
                  placeholder="Esporte"
                  style={{ width: '100%' }}
                  value={filtroEsporte}
                  onChange={(v) => setFiltroEsporte(v ?? null)}
                  options={esporteOptions}
                  size="large"
                  allowClear
                  onClear={() => setFiltroEsporte(null)}
                />
                <Select
                  placeholder="Naipe"
                  style={{ width: '100%' }}
                  value={filtroNaipe}
                  onChange={(v) => setFiltroNaipe(v ?? null)}
                  options={naipeOptions}
                  size="large"
                  allowClear
                  onClear={() => setFiltroNaipe(null)}
                />
                <Select
                  placeholder="Local"
                  style={{ width: '100%' }}
                  value={filtroLocal}
                  onChange={(v) => setFiltroLocal(v ?? null)}
                  options={localOptions}
                  size="large"
                  allowClear
                  onClear={() => setFiltroLocal(null)}
                />
              </div>
              {temFiltroAtivo && (
                <p className="text-[11px] text-slate-500 mt-2 mb-0">
                  Exibindo <span className="font-bold text-teal-700">{totalPartidas}</span>{' '}
                  {totalPartidas === 1 ? 'partida' : 'partidas'} com os filtros aplicados.
                </p>
              )}
            </div>

            {/* Timeline */}
            {partidasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-slate-400">
                <Trophy size={40} strokeWidth={1.5} />
                <div className="text-center max-w-md">
                  <p className="text-base font-medium text-slate-600 m-0">
                    {temFiltroAtivo
                      ? 'Nenhuma partida encontrada com esses filtros'
                      : 'Nenhuma partida pendente no momento'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1 m-0">
                    {temFiltroAtivo
                      ? 'Tente remover algum filtro ou limpe todos.'
                      : 'Volte mais tarde — as próximas partidas vão aparecer aqui.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {gruposPorDia.map(([chave, lista]) => (
                  <DiaSection key={chave} chave={chave} partidas={lista} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <FooterInstitucional />
    </div>
  )
}
