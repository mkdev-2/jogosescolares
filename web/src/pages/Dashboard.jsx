import { Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import {
  Building2,
  Users,
  Trophy,
  UsersRound,
  GraduationCap,
  ClipboardList,
  Activity,
  Clock,
  Calendar,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import usePrazoCadastroAlunos from '../hooks/usePrazoCadastroAlunos'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

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

function StatCard({ title, value, subtitle, icon: Icon, variant = 'primary', to }) {
  const variants = {
    primary: 'from-[#0f766e]/10 to-[#0d9488]/10 border-[#0f766e]/20',
    secondary: 'from-blue-500/10 to-indigo-600/10 border-blue-500/20',
    success: 'from-emerald-500/10 to-emerald-600/10 border-emerald-500/20',
    warning: 'from-amber-500/10 to-amber-600/10 border-amber-500/20',
    info: 'from-indigo-500/10 to-indigo-600/10 border-indigo-500/20',
  }
  const iconBg = {
    primary: 'bg-[#0f766e] text-white',
    secondary: 'bg-blue-500 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-indigo-500 text-white',
  }
  const formatValue = (val) =>
    typeof val === 'number' ? new Intl.NumberFormat('pt-BR').format(val) : val

  const content = (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${variants[variant]} ${to ? 'cursor-pointer' : ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-40" />
      <div className="relative flex justify-between items-start mb-2 sm:mb-3">
        <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest truncate pr-2">
          {title}
        </p>
        <div
          className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-md ${iconBg[variant]} shrink-0`}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
        </div>
      </div>
      <p className="text-xl sm:text-3xl font-extrabold text-[#042f2e] leading-none mb-1">
        {formatValue(value)}
      </p>
      {subtitle && (
        <p className="text-[10px] sm:text-xs text-[#64748b] font-medium leading-tight">{subtitle}</p>
      )}
      <div className="absolute -right-6 -bottom-6 opacity-[0.05] pointer-events-none">
        <Icon size={80} className="text-[#0f766e]" />
      </div>
    </div>
  )

  if (to) {
    return <Link to={to} className="block no-underline">{content}</Link>
  }
  return content
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, loading, error } = useDashboard()
  const { dataLimite: prazoCadastroAlunos, bloqueado: prazoEncerrado } = usePrazoCadastroAlunos()
  const [now, setNow] = useState(() => new Date())
  const isAdmin = ADMIN_ROLES.includes(user?.role)

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
  const maxEquipesModalidade = Math.max(
    ...(stats.equipes_por_modalidade || []).map((e) => e.total),
    1
  )

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
        <div className="flex items-center gap-2 text-sm text-[#64748b] bg-white/80 px-4 py-2 rounded-full border border-[#e2e8f0] shadow-sm">
          <Activity size={16} className="text-[#0f766e]" />
          Atualizado em {new Date().toLocaleDateString('pt-BR')}
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

      {/* Cards de métricas */}
      <section className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Escolas Cadastradas"
          value={loading ? '...' : stats.total_escolas ?? 0}
          icon={Building2}
          variant="primary"
          to={isAdmin ? '/app/gestao?tab=escolas' : undefined}
        />
        <StatCard
          title="Alunos Cadastrados"
          value={loading ? '...' : stats.total_estudantes ?? 0}
          subtitle="Estudantes atletas no sistema"
          icon={Users}
          variant="secondary"
          to="/app/gestao?tab=alunos"
        />
        <StatCard
          title="Modalidades"
          value={loading ? '...' : stats.total_modalidades ?? 0}
          subtitle="Esportes × categoria × naipe"
          icon={Trophy}
          variant="success"
          to="/app/atividades"
        />
        <StatCard
          title="Equipes"
          value={loading ? '...' : stats.total_equipes ?? 0}
          subtitle={`${stats.total_atletas_vinculados ?? 0} atletas vinculados`}
          icon={UsersRound}
          variant="info"
          to="/app/gestao?tab=equipes"
        />
        <StatCard
          title="Professores Técnicos"
          value={loading ? '...' : stats.total_professores ?? 0}
          icon={GraduationCap}
          variant="primary"
          to="/app/gestao?tab=professores"
        />
        {isAdmin && (
          <StatCard
            title="Solicitações Pendentes"
            value={loading ? '...' : stats.solicitacoes_pendentes ?? 0}
            subtitle="Aguardando aprovação"
            icon={ClipboardList}
            variant="warning"
            to="/app/administrativo?tab=usuarios-pendentes"
          />
        )}
      </section>

      {/* Equipes por modalidade */}
      <section className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]/50">
          <h3 className="text-lg font-semibold text-[#042f2e] m-0">
            Equipes por Modalidade
          </h3>
          <p className="text-sm text-[#64748b] mt-1 m-0">
            Distribuição de equipes inscritas por esporte, categoria e naipe
          </p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#0f766e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !stats.equipes_por_modalidade?.length ? (
            <p className="text-[#64748b] text-center py-8">
              Nenhuma equipe cadastrada ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.equipes_por_modalidade.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-[#334155] truncate pr-2">
                      {item.modalidade}
                    </span>
                    <span className="font-bold text-[#0f766e] shrink-0">
                      {new Intl.NumberFormat('pt-BR').format(item.total)} equipes
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#0d9488)] transition-all duration-500"
                      style={{
                        width: `${Math.min((item.total / maxEquipesModalidade) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Equipes por escola (apenas admin) */}
      {isAdmin && stats.equipes_por_escola?.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]/50">
            <h3 className="text-lg font-semibold text-[#042f2e] m-0">
              Top 10 Escolas com Mais Equipes
            </h3>
            <p className="text-sm text-[#64748b] mt-1 m-0">
              Escolas com maior número de equipes inscritas
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {stats.equipes_por_escola.map((item, idx) => (
                <Link
                  key={item.escola_id}
                  to={`/app/gestao?tab=escolas`}
                  className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-[#f1f5f9] transition-colors no-underline"
                >
                  <span className="text-[#334155] font-medium truncate pr-2">
                    {idx + 1}. {item.escola_nome}
                  </span>
                  <span className="text-[#0f766e] font-bold shrink-0">
                    {new Intl.NumberFormat('pt-BR').format(item.total)} equipes
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Escolas por status (apenas admin) */}
      {isAdmin && stats.escolas_por_status?.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]/50">
            <h3 className="text-lg font-semibold text-[#042f2e] m-0">
              Escolas por Status de Adesão
            </h3>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-4">
              {stats.escolas_por_status.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]"
                >
                  <span className="text-sm font-medium text-[#64748b]">
                    {item.status}
                  </span>
                  <span className="text-lg font-bold text-[#0f766e]">
                    {new Intl.NumberFormat('pt-BR').format(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
