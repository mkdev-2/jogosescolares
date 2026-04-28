import { Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { Tabs } from 'antd'
import { PieChart, Pie, Sector, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  Building2,
  Trophy,
  UsersRound,
  GraduationCap,
  ClipboardList,
  Activity,
  Clock,
  Calendar,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import usePrazoCadastroAlunos from '../hooks/usePrazoCadastroAlunos'
import Modal from '../components/ui/Modal'
import { equipesService } from '../services/equipesService'
import { estudantesService } from '../services/estudantesService'
import EquipesList from '../components/catalogos/EquipesList'
import EquipeViewModal from '../components/catalogos/EquipeViewModal'
import ModalidadeIcon from '../components/catalogos/ModalidadeIcon'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

/** Retorna a cor da barra de ocupação com base no percentual de preenchimento. */
function ocupacaoColor(pct) {
  if (pct >= 80) return '#10b981'
  if (pct >= 50) return '#3b82f6'
  if (pct >= 20) return '#f59e0b'
  return '#94a3b8'
}


/** Retorna { days, hours, minutes, seconds } até o fim do dia da data limite (23:59:59), ou null se já passou. */
function getRestante(dataLimiteStr, now = new Date()) {
  if (!dataLimiteStr || typeof dataLimiteStr !== 'string') return null
  const fimDoDia = new Date(dataLimiteStr.trim().slice(0, 10) + 'T23:59:59')
  let ms = fimDoDia.getTime() - now.getTime()
  if (ms <= 0) return null
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  ms %= 24 * 60 * 60 * 1000
  const hours = Math.floor(ms / (60 * 60 * 1000))
  ms %= 60 * 60 * 1000
  const minutes = Math.floor(ms / (60 * 1000))
  ms %= 60 * 1000
  const seconds = Math.floor(ms / 1000)
  return { days, hours, minutes, seconds }
}

function StatCard({ title, value, subtitle, icon: Icon, variant = 'primary', to, onClick, progress, progressLabel, progressBarColor, secondaryValue, secondaryLabel }) {
  const defaultProgressColors = {
    primary: '#0f766e',
    secondary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#6366f1',
  }
  const barColor = progressBarColor || defaultProgressColors[variant] || '#0f766e'

  const overlayVariants = {
    primary: 'from-[#0f766e]/10 to-[#0d9488]/10',
    secondary: 'from-blue-500/10 to-indigo-600/10',
    success: 'from-emerald-500/10 to-emerald-600/10',
    warning: 'from-amber-500/10 to-amber-600/10',
    danger: 'from-red-500/10 to-rose-600/10',
    info: 'from-indigo-500/10 to-indigo-600/10',
  }
  const borderVariants = {
    primary: 'border-[#0f766e]/20',
    secondary: 'border-blue-500/20',
    success: 'border-emerald-500/20',
    warning: 'border-amber-500/20',
    danger: 'border-red-500/20',
    info: 'border-indigo-500/20',
  }
  const iconBg = {
    primary: 'bg-[#0f766e] text-white',
    secondary: 'bg-blue-500 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-500 text-white',
    info: 'bg-indigo-500 text-white',
  }
  const formatValue = (val) =>
    typeof val === 'number' ? new Intl.NumberFormat('pt-BR').format(val) : val

  const content = (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex flex-col h-full ${borderVariants[variant] || borderVariants.primary} ${to || onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br opacity-40 ${overlayVariants[variant] || overlayVariants.primary} transition-opacity group-hover:opacity-60`} />

      <div className="relative flex justify-between items-start mb-2 sm:mb-3">
        <p className="text-[11px] sm:text-[12px] font-bold text-[#64748b] uppercase tracking-widest truncate pr-2">
          {title}
        </p>
        <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-md transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${iconBg[variant] || iconBg.primary} shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
        </div>
      </div>

      <p className="relative text-xl sm:text-3xl font-extrabold text-[#042f2e] leading-none mb-1">
        {formatValue(value)}
      </p>
      {secondaryValue !== undefined && (
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="relative text-base sm:text-xl font-extrabold text-[#334155] tabular-nums leading-none">
            {formatValue(secondaryValue)}
          </span>
          {secondaryLabel && (
            <span className="text-[10px] sm:text-xs text-[#94a3b8] font-medium">{secondaryLabel}</span>
          )}
        </div>
      )}
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-[#64748b] font-medium leading-tight">{subtitle}</p>
      )}
      <div className="flex-1" />
      {progress !== undefined && (
        <div className="relative mt-2.5 pt-2 border-t border-[#f1f5f9]">
          <div className="flex justify-between items-center mb-1">
            {progressLabel && (
              <span className="text-[10px] text-[#64748b] font-medium truncate pr-2">{progressLabel}</span>
            )}
            <span className="text-[10px] font-bold shrink-0 tabular-nums" style={{ color: barColor }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: barColor }}
            />
          </div>
        </div>
      )}
      <div className="absolute -right-6 -bottom-6 opacity-[0.05] pointer-events-none transition-opacity group-hover:opacity-[0.08]">
        <Icon size={80} className="text-[#0f766e]" />
      </div>
    </div>
  )

  if (to) {
    return <Link to={to} className="block no-underline h-full">{content}</Link>
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full bg-transparent border-0 p-0 text-left cursor-pointer h-full"
      >
        {content}
      </button>
    )
  }
  return content
}

/**
 * Card combinado que exibe múltiplas métricas lado a lado (layout horizontal).
 * Baseado no padrão do Educa: título + ícone no topo, métricas em colunas, link no rodapé.
 */
function MultiStatCard({ items, loading, cardTitle, cardIcon: CardIcon, cardVariant = 'primary', footerLabel, footerTo, cols = 1 }) {
  const variantIconBg = {
    primary: 'bg-[#0f766e] text-white',
    secondary: 'bg-blue-500 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-500 text-white',
    info: 'bg-indigo-500 text-white',
  }
  const formatValue = (val) =>
    typeof val === 'number' ? new Intl.NumberFormat('pt-BR').format(val) : val

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#0f766e]/20 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] h-full flex flex-col p-4 sm:p-5">
      {/* Ícone decorativo de fundo */}
      {CardIcon && (
        <div className="absolute -right-4 -bottom-4 opacity-[0.04] pointer-events-none">
          <CardIcon size={100} />
        </div>
      )}

      {/* Cabeçalho: título + ícone */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <p className="text-[11px] sm:text-[12px] font-bold text-[#94a3b8] uppercase tracking-widest">
          {cardTitle}
        </p>
        {CardIcon && (
          <div className={`p-1.5 sm:p-2 rounded-xl shadow-md shrink-0 ${variantIconBg[cardVariant]}`}>
            <CardIcon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Métricas — layout em linha (cols=1) ou grade 2×N (cols=2) */}
      {cols === 2 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 content-center">
          {items.map((item, i) => {
            const inner = (
              <>
                <p className="text-[10px] sm:text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-0.5 truncate">
                  {item.title}
                </p>
                <p className="text-lg sm:text-xl font-extrabold text-[#042f2e] tabular-nums leading-none">
                  {loading ? '...' : formatValue(item.value ?? 0)}
                </p>
              </>
            )
            if (item.to) {
              return (
                <Link key={i} to={item.to} className="no-underline group min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-0.5 truncate group-hover:text-[#0f766e] transition-colors">{item.title}</p>
                  <p className="text-lg sm:text-xl font-extrabold text-[#042f2e] tabular-nums leading-none group-hover:text-[#0f766e] transition-colors">{loading ? '...' : formatValue(item.value ?? 0)}</p>
                </Link>
              )
            }
            return <div key={i} className="min-w-0">{inner}</div>
          })}
        </div>
      ) : (
        <div className="flex gap-0 flex-1">
          {items.map((item, i) => {
            const isLast = i === items.length - 1
            const col = (
              <div className={`flex-1 min-w-0 ${!isLast ? 'border-r border-[#f1f5f9] pr-3 sm:pr-4 mr-3 sm:mr-4' : ''}`}>
                <p className="text-[10px] sm:text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1 truncate">
                  {item.title}
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-[#042f2e] tabular-nums leading-none">
                  {loading ? '...' : formatValue(item.value ?? 0)}
                </p>
              </div>
            )
            if (item.to) {
              return (
                <Link key={i} to={item.to} className="no-underline flex-1 min-w-0 group">
                  <div className={`min-w-0 ${!isLast ? 'border-r border-[#f1f5f9] pr-3 sm:pr-4 mr-3 sm:mr-4' : ''}`}>
                    <p className="text-[10px] sm:text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1 truncate group-hover:text-[#0f766e] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#042f2e] tabular-nums leading-none group-hover:text-[#0f766e] transition-colors">
                      {loading ? '...' : formatValue(item.value ?? 0)}
                    </p>
                  </div>
                </Link>
              )
            }
            return <div key={i} className="flex-1 min-w-0">{col}</div>
          })}
        </div>
      )}

      {/* Rodapé com link */}
      {footerTo && footerLabel && (
        <div className="mt-3 pt-3 border-t border-[#f1f5f9]">
          <Link
            to={footerTo}
            className="no-underline text-[11px] font-bold text-[#0f766e] uppercase tracking-widest hover:text-[#0d9488] transition-colors"
          >
            {footerLabel} →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, loading, error } = useDashboard()
  const { dataLimite: prazoCadastroAlunos, bloqueado: prazoEncerrado } = usePrazoCadastroAlunos()
  const [now, setNow] = useState(() => new Date())
  const [tabEquipesModalidade, setTabEquipesModalidade] = useState('')
  const [hoveredLegend, setHoveredLegend] = useState(null)
  const isAdmin = ADMIN_ROLES.includes(user?.role)

  const [equipesCache, setEquipesCache] = useState(null)
  const [openAlunosModal, setOpenAlunosModal] = useState(false)
  const [alunosModalidade, setAlunosModalidade] = useState([])
  const [loadingAlunosModalidade, setLoadingAlunosModalidade] = useState(false)
  const [modalidadeSelecionada, setModalidadeSelecionada] = useState(null)

  // Admin: modal com lista de equipes (com escola) e, ao clicar, lista de alunos daquela equipe.
  const [openEquipesAdminModal, setOpenEquipesAdminModal] = useState(false)
  const [equipesAdminDaModalidade, setEquipesAdminDaModalidade] = useState([])
  const [loadingEquipesAdminDaModalidade, setLoadingEquipesAdminDaModalidade] = useState(false)
  const [modalidadeSelecionadaAdmin, setModalidadeSelecionadaAdmin] = useState(null)
  const [equipeAdminSelecionada, setEquipeAdminSelecionada] = useState(null)

  // Diretor/coordenador: modal com lista de alunos sem documentação
  const [openAlunosSemDocModal, setOpenAlunosSemDocModal] = useState(false)
  const [loadingAlunosSemDoc, setLoadingAlunosSemDoc] = useState(false)
  const [alunosSemDoc, setAlunosSemDoc] = useState([])
  const [alunosSemDocCarregado, setAlunosSemDocCarregado] = useState(false)

  const handleAbrirAlunosSemDocumentacao = async () => {
    if (isAdmin) return
    setOpenAlunosSemDocModal(true)

    if (alunosSemDocCarregado) return
    setLoadingAlunosSemDoc(true)
    try {
      const lista = await estudantesService.listar()
      const filtrados = (Array.isArray(lista) ? lista : []).filter((est) => {
        const url = est?.documentacao_assinada_url
        return !url || !String(url).trim()
      })
      filtrados.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR', { sensitivity: 'base' }))
      setAlunosSemDoc(filtrados)
      setAlunosSemDocCarregado(true)
    } catch (e) {
      setAlunosSemDoc([])
      alert('Erro ao carregar alunos sem documentação. Tente novamente.')
    } finally {
      setLoadingAlunosSemDoc(false)
    }
  }

  const handleAbrirAlunosModalidade = async (item) => {
    if (isAdmin) return
    setModalidadeSelecionada(item)
    setOpenAlunosModal(true)
    setLoadingAlunosModalidade(true)

    try {
      let equipes = equipesCache
      if (!Array.isArray(equipes)) {
        equipes = await equipesService.listar()
        setEquipesCache(equipes)
      }

      const matches = equipes.filter((e) => {
        if (item?.esporte_variante_id) {
          return String(e?.esporte_variante_id ?? '') === String(item?.esporte_variante_id)
        }
        return (
          e?.esporte_nome === item?.esporte_nome &&
          e?.categoria_nome === item?.categoria_nome &&
          e?.naipe_nome === item?.naipe_nome
        )
      })

      const dedup = new Map()
      matches.forEach((eq) => {
        ;(eq?.estudantes || []).forEach((est) => {
          if (!est?.id) return
          dedup.set(est.id, est)
        })
      })

      const alunos = Array.from(dedup.values())
      alunos.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR', { sensitivity: 'base' }))
      setAlunosModalidade(alunos)
    } catch (e) {
      setAlunosModalidade([])
      alert('Erro ao carregar alunos da modalidade. Tente novamente.')
    } finally {
      setLoadingAlunosModalidade(false)
    }
  }

  const handleAbrirEquipesAdminModalidade = async (item) => {
    if (!isAdmin) return
    setModalidadeSelecionadaAdmin(item)
    setOpenEquipesAdminModal(true)
    setEquipeAdminSelecionada(null)
    setLoadingEquipesAdminDaModalidade(true)

    try {
      let equipes = equipesCache
      if (!Array.isArray(equipes)) {
        equipes = await equipesService.listar()
        setEquipesCache(equipes)
      }

      const filtered = equipes.filter((e) => {
        if (item?.esporte_variante_id) {
          return String(e?.esporte_variante_id ?? '') === String(item?.esporte_variante_id)
        }
        return (
          e?.esporte_nome === item?.esporte_nome &&
          e?.categoria_nome === item?.categoria_nome &&
          e?.naipe_nome === item?.naipe_nome
        )
      })

      filtered.sort((a, b) => {
        const ea = a?.escola_nome || ''
        const eb = b?.escola_nome || ''
        return ea.localeCompare(eb, 'pt-BR', { sensitivity: 'base' })
      })

      setEquipesAdminDaModalidade(filtered)
    } catch (e) {
      setEquipesAdminDaModalidade([])
      alert('Erro ao carregar equipes da modalidade. Tente novamente.')
    } finally {
      setLoadingEquipesAdminDaModalidade(false)
    }
  }

  const restante = useMemo(
    () => getRestante(prazoCadastroAlunos, now),
    [prazoCadastroAlunos, now]
  )

  useEffect(() => {
    if (!prazoCadastroAlunos || prazoEncerrado) return
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [prazoCadastroAlunos, prazoEncerrado])

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-[1.75rem] font-bold text-[#042f2e] m-0 mb-2">
            Quadro de Resumo
          </h2>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700">
            <p className="font-semibold">Erro ao carregar dados</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </section>
      </div>
    )
  }

  const stats = data || {}

  const CORES_PIZZA = [
    '#0f766e', // teal-700  (primária da app)
    '#14b8a6', // teal-500
    '#0d9488', // teal-600
    '#2dd4bf', // teal-400
    '#134e4a', // teal-900
    '#115e59', // teal-800
    '#10b981', // emerald-500
    '#059669', // emerald-600
    '#047857', // emerald-700
    '#34d399', // emerald-400
    '#065f46', // emerald-800
    '#0e7490', // cyan-700
    '#0891b2', // cyan-600
    '#06b6d4', // cyan-500
    '#22d3ee', // cyan-400
  ]

  const [filtroPizza, setFiltroPizza] = useState('coletivas')

  const dadosPizza = useMemo(() => {
    const items = Array.isArray(stats.equipes_por_modalidade) ? stats.equipes_por_modalidade : []
    const filtered = items.filter((it) =>
      filtroPizza === 'individuais' ? (it?.limite_atletas ?? 0) === 1 : (it?.limite_atletas ?? 0) > 1
    )
    const mapa = new Map()
    filtered.forEach((it) => {
      const key = it?.esporte_nome || 'Outros'
      mapa.set(key, (mapa.get(key) || 0) + (it?.total_equipes || 0))
    })
    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [stats.equipes_por_modalidade, filtroPizza])

  const equipesPorEsporte = useMemo(() => {
    const items = Array.isArray(stats.equipes_por_modalidade) ? stats.equipes_por_modalidade : []
    const map = new Map()
    items.forEach((it) => {
      const key = it?.esporte_nome || 'Outros'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(it)
    })

    const groups = Array.from(map.entries()).map(([esporte_nome, arr]) => ({
      esporte_nome,
      esporte_icone: arr[0]?.esporte_icone || 'Zap',
      itens: arr,
      // Para admin exibimos número de equipes; para diretor/coordenador, exibimos ocupação (por atletas).
      total: arr.reduce(
        (acc, x) =>
          acc +
          (isAdmin
            ? Number(x?.total_equipes ?? x?.total ?? 0) || 0
            : Number(x?.total_atletas ?? 0) || 0),
        0,
      ),
    }))

    groups.sort((a, b) => b.total - a.total)
    return groups
  }, [stats.equipes_por_modalidade, isAdmin])

  const tabItemsEquipesModalidade = useMemo(() => {
    const renderLista = (itens) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {itens.map((item, idx) => {
          const pct = item?.ocupacao_percent ?? 0
          const totalEquipes = item?.total_equipes ?? item?.total ?? 0
          const totalAtletas = item?.total_atletas ?? 0
          const limiteAtletas = item?.limite_atletas ?? 0
          const vagasTotais = totalEquipes * limiteAtletas
          const vagasRestantes = Math.max(0, vagasTotais - totalAtletas)
          const corBarra = ocupacaoColor(pct)

          return (
            <button
              key={idx}
              type="button"
              onClick={() => (isAdmin ? handleAbrirEquipesAdminModalidade(item) : handleAbrirAlunosModalidade(item))}
              className="bg-white border border-[#f1f5f9] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-left cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30"
            >
              <div className="flex justify-between items-center text-sm mb-3">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full bg-[#0f766e]/10 text-[#0d9488] border border-[#0f766e]/20 font-bold text-[13px] sm:text-[14px] truncate max-w-[70%]"
                  title={item?.modalidade || ''}
                >
                  {item?.modalidade || '-'}
                </span>
                <span className="font-extrabold shrink-0 whitespace-nowrap text-xl sm:text-2xl tabular-nums leading-none" style={{ color: corBarra }}>
                  {Math.round(pct)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#64748b] mb-1.5">
                {isAdmin ? (
                  <span>
                    {new Intl.NumberFormat('pt-BR').format(totalEquipes)} equipe{totalEquipes !== 1 ? 's' : ''}
                    {limiteAtletas > 0 && (
                      <> &middot; {new Intl.NumberFormat('pt-BR').format(totalAtletas)}/{new Intl.NumberFormat('pt-BR').format(vagasTotais)} atletas</>
                    )}
                  </span>
                ) : (
                  <span>
                    {new Intl.NumberFormat('pt-BR').format(totalAtletas)} atleta{totalAtletas !== 1 ? 's' : ''}
                    {limiteAtletas > 0 && vagasTotais > 0 && (
                      <> &middot; {new Intl.NumberFormat('pt-BR').format(vagasRestantes)} vaga{vagasRestantes !== 1 ? 's' : ''} restante{vagasRestantes !== 1 ? 's' : ''}</>
                    )}
                  </span>
                )}
                <span className="font-medium" style={{ color: corBarra }}>ocupação</span>
              </div>
              <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: corBarra }}
                />
              </div>
            </button>
          )
        })}
      </div>
    )

    const groupTabs = equipesPorEsporte.map((g) => {
      return {
        key: `ESP-${g.esporte_nome}`,
        label: (
          <span className="flex items-center gap-1.5">
            <ModalidadeIcon icone={g.esporte_icone} size={14} />
            <span>{g.esporte_nome}</span>
          </span>
        ),
        children: renderLista(g.itens),
      }
    })

    return groupTabs
  }, [equipesPorEsporte, isAdmin, equipesCache]) // equipesCache para garantir que a closure funcione

  useEffect(() => {
    if (!tabItemsEquipesModalidade?.length) return
    const exists = tabItemsEquipesModalidade.some((t) => t.key === tabEquipesModalidade)
    if (!exists) setTabEquipesModalidade(tabItemsEquipesModalidade[0].key)
  }, [tabItemsEquipesModalidade, tabEquipesModalidade])

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-[1.75rem] sm:text-[2rem] font-bold text-[#042f2e] m-0 mb-1">
            Quadro de Resumo
          </h2>
          <p className="text-base text-[#64748b] m-0">
            Visão geral das métricas do sistema de Jogos Escolares
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {isAdmin && !loading && (stats.solicitacoes_pendentes ?? 0) > 0 && (
            <Link
              to="/app/administrativo?tab=usuarios-pendentes"
              className="no-underline flex items-center gap-2 text-sm bg-amber-50 px-3 py-2 rounded-full border border-amber-200 shadow-sm text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <ClipboardList size={15} className="text-amber-500 shrink-0" />
              <span className="font-bold tabular-nums">{stats.solicitacoes_pendentes}</span>
              <span>{stats.solicitacoes_pendentes === 1 ? 'solicitação pendente' : 'solicitações pendentes'}</span>
            </Link>
          )}
          <div className="flex items-center gap-2 text-sm text-[#64748b] bg-white/80 px-4 py-2 rounded-full border border-[#e2e8f0] shadow-sm">
            <Activity size={16} className="text-[#0f766e]" />
            Atualizado em {new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Contagem regressiva prazo cadastro de alunos (apenas diretores/coordenadores) */}
      {!isAdmin && prazoCadastroAlunos && !prazoEncerrado && (
        <section className="rounded-xl border border-red-200 bg-[#fdf5f6] p-3 sm:px-4 sm:py-3.5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 text-[#1e3a4b]">
              <div className="p-2 rounded-lg bg-red-100/50">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-red-800" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg sm:text-xl leading-tight">
                Cadastro de alunos encerra em
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 self-center lg:self-auto">
              {[
                { value: restante?.days ?? 0, label: 'DIAS' },
                { value: restante ? String(restante.hours).padStart(2, '0') : '00', label: 'HORAS' },
                { value: restante ? String(restante.minutes).padStart(2, '0') : '00', label: 'MIN' },
                { value: restante ? String(restante.seconds).padStart(2, '0') : '00', label: 'SEG' },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="min-w-[2.8rem] sm:min-w-[3.5rem] rounded-lg bg-red-500 px-2 py-1.5 sm:px-3 sm:py-2 text-center shadow-lg shadow-red-500/20">
                    <span className="font-black text-white text-xl sm:text-2xl tabular-nums">
                      {value}
                    </span>
                  </div>
                  <span className="text-red-700 text-[9px] sm:text-[10px] font-black mt-1 uppercase tracking-tight">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 mt-3 pt-3 border-t border-red-200/50">
            <div className="flex items-center gap-1.5 text-[#1e3a4b] text-sm font-medium">
              <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>
                Último dia para cadastro:{' '}
                <span className="text-red-600 font-bold">
                  {new Date(prazoCadastroAlunos + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </span>
            </div>
            <span className="hidden sm:inline text-red-300">•</span>
            <span className="text-[#1e3a4b]/80 text-[13px] sm:text-sm italic">
              Após essa data não será possível incluir novos atletas.
            </span>
          </div>
        </section>
      )}

      {/* Saúde da escola (apenas diretores/coordenadores, abaixo do countdown) */}
      {!isAdmin && !loading && (() => {
        const checks = [
          {
            label: 'Equipes',
            ok: (stats.total_equipes ?? 0) > 0,
            warn: false,
            description: (stats.total_equipes ?? 0) > 0
              ? `${stats.total_equipes} cadastrada${stats.total_equipes === 1 ? '' : 's'}`
              : 'Nenhuma equipe ainda',
            to: '/app/gestao?tab=equipes',
          },
          {
            label: 'Atletas vinculados',
            ok: (stats.total_atletas_vinculados ?? 0) > 0,
            warn: (stats.total_atletas_vinculados ?? 0) > 0 && (stats.total_atletas_vinculados ?? 0) < (stats.total_estudantes ?? 0),
            description: (stats.total_atletas_vinculados ?? 0) > 0
              ? `${stats.total_atletas_vinculados} de ${stats.total_estudantes} inscritos`
              : 'Nenhum em equipe',
            to: '/app/gestao?tab=equipes',
          },
          {
            label: 'Documentação',
            ok: (stats.alunos_sem_documentacao ?? 0) === 0,
            warn: (stats.alunos_sem_documentacao ?? 0) > 0,
            description: (stats.alunos_sem_documentacao ?? 0) === 0
              ? 'Todos com doc. assinada'
              : `${stats.alunos_sem_documentacao} sem documentação`,
            to: null,
            onClick: handleAbrirAlunosSemDocumentacao,
          },
          {
            label: 'Professores',
            ok: (stats.total_professores ?? 0) > 0,
            warn: false,
            description: (stats.total_professores ?? 0) > 0
              ? `${stats.total_professores} cadastrado${stats.total_professores === 1 ? '' : 's'}`
              : 'Nenhum professor ainda',
            to: '/app/gestao?tab=professores',
          },
        ]
        const okCount = checks.filter((c) => c.ok && !c.warn).length
        const allOk = okCount === checks.length
        const hasRed = checks.some((c) => !c.ok)

        return (
          <section className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 sm:px-6 py-3 border-b border-[#f1f5f9] bg-[#f8fafc]/50 flex items-center justify-between gap-3">
              <h3 className="text-[0.95rem] sm:text-base font-semibold text-[#042f2e] m-0">Status da Escola</h3>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${allOk ? 'bg-emerald-100 text-emerald-700' : hasRed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {okCount}/{checks.length} em ordem
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#f8fafc]">
              {checks.map((item, i) => {
                const Icon = item.ok && !item.warn ? CheckCircle2 : item.warn ? AlertTriangle : XCircle
                const colorClass = item.ok && !item.warn ? 'text-emerald-500' : item.warn ? 'text-amber-500' : 'text-red-400'
                const descClass = item.ok && !item.warn ? 'text-emerald-700' : item.warn ? 'text-amber-700' : 'text-red-600'
                const content = (
                  <div className="p-3 sm:p-4 flex flex-col gap-1 h-full">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} strokeWidth={2.5} />
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest truncate">{item.label}</span>
                    </div>
                    <p className={`text-[12px] sm:text-[13px] font-semibold leading-tight ${descClass}`}>{item.description}</p>
                  </div>
                )
                if (item.to) return <Link key={i} to={item.to} className="no-underline hover:bg-[#f8fafc] transition-colors">{content}</Link>
                if (item.onClick) return <button key={i} type="button" onClick={item.onClick} className="bg-transparent border-0 p-0 text-left cursor-pointer hover:bg-[#f8fafc] transition-colors w-full">{content}</button>
                return <div key={i}>{content}</div>
              })}
            </div>
          </section>
        )
      })()}

      {/* Cards de métricas */}
      <section className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 items-stretch">
            {/* 1. Atletas Vinculados */}
            <StatCard
              title="Atletas Vinculados"
              value={loading ? '...' : stats.total_atletas_vinculados ?? 0}
              subtitle={
                !loading && (stats.total_estudantes ?? 0) > 0
                  ? `de ${new Intl.NumberFormat('pt-BR').format(stats.total_estudantes)} inscritos`
                  : undefined
              }
              icon={UsersRound}
              variant="secondary"
              to="/app/gestao?tab=alunos"
              progress={
                !loading && (stats.total_estudantes ?? 0) > 0
                  ? ((stats.total_atletas_vinculados ?? 0) / stats.total_estudantes) * 100
                  : undefined
              }
              progressLabel="vinculados a equipes"
            />

            {/* 2. Card combinado: Escolas + Equipes + Professores (admin) | Equipes + Professores (diretor) */}
            <MultiStatCard
              loading={loading}
              cardTitle="Estrutura"
              cardIcon={Building2}
              cardVariant="primary"
              footerLabel="Ver gestão"
              footerTo="/app/gestao"
              items={[
                ...(isAdmin ? [{
                  title: 'Escolas',
                  value: stats.total_escolas ?? 0,
                  to: '/app/gestao?tab=escolas',
                }] : []),
                {
                  title: 'Equipes',
                  value: stats.total_equipes ?? 0,
                  to: '/app/gestao?tab=equipes',
                },
                {
                  title: 'Professores',
                  value: stats.total_professores ?? 0,
                  to: '/app/gestao?tab=professores',
                },
              ]}
            />

            {/* 3. Esportes */}
            <MultiStatCard
              loading={loading}
              cardTitle="Esportes"
              cardIcon={Trophy}
              cardVariant="success"
              footerLabel="Ver atividades"
              footerTo="/app/atividades"
              items={[
                { title: 'Total', value: stats.total_esportes ?? 0, to: '/app/atividades' },
                { title: 'Modalidades', value: stats.total_modalidades ?? 0, to: '/app/atividades' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Alerta: alunos sem documentação */}
      {!loading && (stats.alunos_sem_documentacao ?? 0) > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-lg bg-red-100 shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-red-800 text-sm sm:text-base leading-tight">
                  {new Intl.NumberFormat('pt-BR').format(stats.alunos_sem_documentacao)}{' '}
                  {stats.alunos_sem_documentacao === 1 ? 'aluno sem' : 'alunos sem'} documentação assinada
                </p>
                {(stats.total_estudantes ?? 0) > 0 && (
                  <p className="text-xs text-red-700 mt-0.5">
                    {Math.round((stats.alunos_sem_documentacao / stats.total_estudantes) * 100)}% do total de atletas inscritos ainda não enviaram o anexo.
                  </p>
                )}
              </div>
            </div>
            {isAdmin ? (
              <Link
                to="/app/gestao?tab=alunos"
                className="no-underline shrink-0 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Ver alunos →
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleAbrirAlunosSemDocumentacao}
                className="shrink-0 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors border-0 cursor-pointer whitespace-nowrap"
              >
                Ver lista →
              </button>
            )}
          </div>
        </section>
      )}

      {/* Equipes por modalidade */}
      <section className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]/50">
          <h3 className="text-[1rem] sm:text-lg font-semibold text-[#042f2e] m-0">
            Equipes por Modalidade
          </h3>
          <p className="text-sm text-[#64748b] mt-1 m-0">
            Distribuição de equipes inscritas por esporte, categoria e naipe
          </p>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !stats.equipes_por_modalidade?.length ? (
            <p className="text-[#64748b] text-center py-8">
              Nenhuma equipe cadastrada ainda.
            </p>
          ) : (
            <Tabs
              activeKey={tabEquipesModalidade}
              onChange={setTabEquipesModalidade}
              items={tabItemsEquipesModalidade}
              type="card"
            />
          )}
        </div>
      </section>

      {/* Gráfico de pizza: esportes com mais equipes */}
      {(() => {
        const temDados = dadosPizza.length > 0 && dadosPizza.some((d) => d.value > 0)
        const totalEquipesPizza = dadosPizza.reduce((s, d) => s + d.value, 0)
        return (
          <section className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]/50 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-[1rem] sm:text-lg font-semibold text-[#042f2e] m-0">Equipes por Esporte</h3>
                <p className="text-sm text-[#64748b] mt-0.5 m-0">Distribuição do total de equipes inscritas por modalidade esportiva</p>
              </div>
              <div className="flex rounded-lg border border-[#e2e8f0] overflow-hidden shrink-0">
                {['coletivas', 'individuais'].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setFiltroPizza(op)}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border-0 cursor-pointer transition-colors ${
                      filtroPizza === op
                        ? 'bg-[#0f766e] text-white'
                        : 'bg-white text-[#64748b] hover:bg-[#f8fafc]'
                    }`}
                  >
                    {op === 'coletivas' ? 'Coletivas' : 'Individuais'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !temDados ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Pizza placeholder */}
                  <div className="flex items-center justify-center shrink-0" style={{ width: 260, height: 260 }}>
                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-[#e2e8f0] flex items-center justify-center">
                      <Trophy size={36} className="text-[#cbd5e1]" />
                    </div>
                  </div>
                  {/* Legenda placeholder */}
                  <div className="flex flex-col gap-3 w-full">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#e2e8f0] shrink-0" />
                        <div className="h-3 rounded bg-[#f1f5f9] flex-1" />
                        <div className="h-3 w-12 rounded bg-[#f1f5f9]" />
                        <div className="w-20 h-1.5 bg-[#f1f5f9] rounded-full shrink-0" />
                        <div className="h-3 w-8 rounded bg-[#f1f5f9]" />
                      </div>
                    ))}
                    <p className="text-[#94a3b8] text-xs mt-1">Nenhuma equipe cadastrada — o gráfico será preenchido automaticamente</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Pizza */}
                  <div className="shrink-0" style={{ width: 260, height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosPizza}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                          activeIndex={hoveredLegend ?? undefined}
                          activeShape={(props) => {
                            const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
                            return (
                              <Sector
                                cx={cx}
                                cy={cy}
                                innerRadius={innerRadius - 4}
                                outerRadius={outerRadius + 8}
                                startAngle={startAngle}
                                endAngle={endAngle}
                                fill={fill}
                              />
                            )
                          }}
                        >
                          {dadosPizza.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={CORES_PIZZA[idx % CORES_PIZZA.length]}
                              fillOpacity={hoveredLegend === null || hoveredLegend === idx ? 1 : 0.3}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} equipe${value !== 1 ? 's' : ''}`, name]}
                          contentStyle={{ borderRadius: 8, border: '1px solid #f1f5f9', fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legenda */}
                  <div className="flex flex-col gap-2.5 w-full">
                    {dadosPizza.map((item, idx) => {
                      const pct = totalEquipesPizza > 0 ? Math.round((item.value / totalEquipesPizza) * 100) : 0
                      const cor = CORES_PIZZA[idx % CORES_PIZZA.length]
                      const isActive = hoveredLegend === idx
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 cursor-default rounded-lg px-2 py-0.5 -mx-2 transition-colors"
                          style={{ backgroundColor: isActive ? `${cor}15` : 'transparent' }}
                          onMouseEnter={() => setHoveredLegend(idx)}
                          onMouseLeave={() => setHoveredLegend(null)}
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform" style={{ backgroundColor: cor, transform: isActive ? 'scale(1.4)' : 'scale(1)' }} />
                          <span className="text-[13px] font-medium flex-1 truncate transition-colors" style={{ color: isActive ? cor : '#334155' }}>{item.name}</span>
                          <span className="text-[12px] font-bold tabular-nums shrink-0 transition-colors" style={{ color: isActive ? cor : '#64748b' }}>{item.value} equipe(s)</span>
                          <div className="w-20 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden shrink-0">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: cor }} />
                          </div>
                          <span className="text-[11px] font-bold tabular-nums w-8 text-right shrink-0" style={{ color: cor }}>{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )
      })()}

      {/* Equipes por escola — ranking com barras (apenas admin) */}
      {isAdmin && (() => {
        const lista = Array.isArray(stats.equipes_por_escola) ? stats.equipes_por_escola : []
        const temDados = lista.length > 0
        const maxTotal = temDados ? Math.max(...lista.map((e) => e.total)) : 0
        return (
          <section className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]/50 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[1rem] sm:text-lg font-semibold text-[#042f2e] m-0">Ranking de Escolas</h3>
                <p className="text-sm text-[#64748b] mt-0.5 m-0">Escolas com mais equipes inscritas na edição</p>
              </div>
              <Link to="/app/gestao?tab=escolas" className="no-underline text-xs font-bold text-[#0f766e] hover:text-[#0d9488] transition-colors whitespace-nowrap shrink-0">
                Ver todas →
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !temDados ? (
              <div className="px-4 sm:px-6 py-3 divide-y divide-[#f8fafc]">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <div className="w-6 h-3 rounded bg-[#f1f5f9] shrink-0" />
                    <div className="h-3 rounded bg-[#f1f5f9] flex-1" />
                    <div className="flex items-center gap-2 shrink-0" style={{ width: '45%' }}>
                      <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full" />
                      <div className="w-16 h-3 rounded bg-[#f1f5f9]" />
                    </div>
                  </div>
                ))}
                <p className="text-[#94a3b8] text-xs py-2">Nenhuma escola com equipes cadastradas ainda</p>
              </div>
            ) : (
              <div className="px-4 sm:px-6 py-3 divide-y divide-[#f8fafc]">
                {lista.map((item, idx) => {
                  const pct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0
                  const isTop3 = idx < 3
                  return (
                    <Link key={item.escola_id} to="/app/gestao?tab=escolas" className="no-underline flex items-center gap-3 py-2.5 group">
                      <span className={`w-6 shrink-0 text-center text-[11px] font-black tabular-nums ${isTop3 ? 'text-[#0f766e]' : 'text-[#94a3b8]'}`}>{idx + 1}</span>
                      <span className="text-[13px] font-semibold text-[#334155] truncate flex-1 group-hover:text-[#0f766e] transition-colors" style={{ minWidth: 0 }}>{item.escola_nome}</span>
                      <div className="flex items-center gap-2 shrink-0" style={{ width: '45%' }}>
                        <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: isTop3 ? '#0f766e' : '#94a3b8' }} />
                        </div>
                        <span className={`text-[12px] font-bold tabular-nums w-16 text-right shrink-0 ${isTop3 ? 'text-[#0f766e]' : 'text-[#64748b]'}`}>
                          {item.total} {item.total === 1 ? 'equipe' : 'equipes'}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        )
      })()}

      {/* Modal: alunos por modalidade (diretor/coordenador) */}
      {!isAdmin && (
        <Modal
          isOpen={openAlunosModal}
          onClose={() => setOpenAlunosModal(false)}
          title="Alunos da Modalidade"
          subtitle={modalidadeSelecionada?.modalidade || ''}
          size="lg"
          footer={
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
              onClick={() => setOpenAlunosModal(false)}
            >
              Fechar
            </button>
          }
        >
          {loadingAlunosModalidade ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alunosModalidade.length > 0 ? (
            <ul className="list-none m-0 p-0 space-y-2">
              {alunosModalidade.map((est) => (
                <li
                  key={est.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                >
                  <span className="text-[0.9375rem] font-medium text-[#334155]">{est.nome}</span>
                  <span className="text-xs font-mono text-[#64748b]">{estudantesService.formatCpf(est.cpf)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#64748b] m-0">Nenhum aluno vinculado para esta modalidade.</p>
          )}
        </Modal>
      )}

      {/* Modal: alunos sem documentação (diretor/coordenador) */}
      {!isAdmin && (
        <Modal
          isOpen={openAlunosSemDocModal}
          onClose={() => setOpenAlunosSemDocModal(false)}
          title="Alunos sem documentação"
          subtitle="Alunos que não enviaram o anexo assinado"
          size="lg"
          footer={
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
              onClick={() => setOpenAlunosSemDocModal(false)}
            >
              Fechar
            </button>
          }
        >
          {loadingAlunosSemDoc ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alunosSemDoc.length > 0 ? (
            <ul className="list-none m-0 p-0 space-y-2">
              {alunosSemDoc.map((est) => (
                <li
                  key={est.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                >
                  <span className="text-[0.9375rem] font-medium text-[#334155]">{est.nome}</span>
                  <span className="text-xs font-mono text-[#64748b]">{estudantesService.formatCpf(est.cpf)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#64748b] m-0">Nenhum aluno sem documentação.</p>
          )}
        </Modal>
      )}

      {/* Modal: equipes (admin) da modalidade e alunos por equipe */}
      {isAdmin && (
        <Modal
          isOpen={openEquipesAdminModal}
          onClose={() => {
            setOpenEquipesAdminModal(false)
            setEquipeAdminSelecionada(null)
          }}
          title="Equipes da Modalidade"
          subtitle={modalidadeSelecionadaAdmin?.modalidade || ''}
          size="xl"
          footer={
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
              onClick={() => {
                setOpenEquipesAdminModal(false)
                setEquipeAdminSelecionada(null)
              }}
            >
              Fechar
            </button>
          }
        >
          <EquipesList
            lista={equipesAdminDaModalidade}
            loading={loadingEquipesAdminDaModalidade}
            error={null}
            onViewEquipe={(item) => setEquipeAdminSelecionada(item)}
            showInstituicao={true}
            showFilters={false}
            showTotalEquipes={false}
            escolas={[]}
          />
        </Modal>
      )}

      {/* Segundo modal (admin): detalhes e alunos da equipe */}
      {isAdmin && (
        <EquipeViewModal
          open={!!equipeAdminSelecionada}
          onClose={() => setEquipeAdminSelecionada(null)}
          equipe={equipeAdminSelecionada}
        />
      )}

      {/* Bloco removido: Escolas por Status de Adesão */}
    </div>
  )
}
