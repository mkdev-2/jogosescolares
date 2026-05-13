import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tag, Spin } from 'antd'
import { ArrowLeft, Trophy } from 'lucide-react'
import { publicCampeonatosService } from '../services/publicCampeonatosService'
import PublicHeader from '../components/landing/PublicHeader'
import FooterInstitucional from '../components/landing/FooterInstitucional'
import { STATUS_COLORS, STATUS_LABELS } from '../components/campeonato/statusConfig'
import GrupoSection from '../components/campeonato/GrupoSection'
import TournamentBracket from '../components/campeonato/TournamentBracket'
import VencedorBanner from '../components/campeonato/VencedorBanner'

export default function ResultadoDetalhe() {
  const { id } = useParams()
  const campeonatoId = parseInt(id, 10)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('grupos')
  const [artilheiros, setArtilheiros] = useState([])

  const fetchData = useCallback(async () => {
    try {
      const result = await publicCampeonatosService.getById(campeonatoId)
      setData(result)
      if (result?.config?.registra_artilheiro) {
        publicCampeonatosService.getArtilheirosCampeonato(campeonatoId)
          .then(setArtilheiros)
          .catch(() => {})
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar campeonato')
    } finally {
      setLoading(false)
    }
  }, [campeonatoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const estrutura = data?.estrutura
  const config = data?.config
  const campeonato = data

  const hasGroups = (estrutura?.grupos?.length || 0) > 0
  const hasKnockout = (estrutura?.partidas || []).some((p) => p.grupo_id === null)

  useEffect(() => {
    if (estrutura && !hasGroups && hasKnockout) {
      setActiveTab('eliminatorias')
    }
  }, [estrutura, hasGroups, hasKnockout])

  const nomeCampeonato = campeonato?.nome || `Campeonato #${campeonatoId}`
  const statusVal = campeonato?.status
  const subtitulo = campeonato
    ? [campeonato.esporte_nome, campeonato.categoria_nome, campeonato.naipe_nome]
        .filter(Boolean)
        .join(' · ')
    : ''

  const finalPartida = estrutura?.partidas?.find(
    (p) => p.fase === 'FINAL' && p.vencedor_equipe_id
  )

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <PublicHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-5 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && !data && (
          <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
            <p className="text-base m-0">Campeonato não encontrado.</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex flex-col gap-6">
            <header className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate('/resultados')}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors mt-1 shrink-0 bg-transparent border-0 cursor-pointer px-0"
              >
                <ArrowLeft size={16} />
                Resultados
              </button>
            </header>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
                  {nomeCampeonato}
                </h1>
                {statusVal && (
                  <Tag color={STATUS_COLORS[statusVal] || 'default'}>
                    {STATUS_LABELS[statusVal] || statusVal}
                  </Tag>
                )}
              </div>
              {subtitulo && (
                <p className="text-[0.9375rem] text-[#64748b] m-0 mt-0.5">{subtitulo}</p>
              )}
            </div>

            <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex gap-0 p-2 border-b border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setActiveTab('grupos')}
                  disabled={!hasGroups}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeTab === 'grupos'
                      ? 'bg-[#f1f5f9] text-[#0f766e]'
                      : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
                  }`}
                >
                  Fase de Grupos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('eliminatorias')}
                  disabled={!hasKnockout}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeTab === 'eliminatorias'
                      ? 'bg-[#f1f5f9] text-[#0f766e]'
                      : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
                  }`}
                >
                  <Trophy size={16} />
                  Eliminatórias
                </button>
                {config?.registra_artilheiro && artilheiros.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('artilheiros')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] font-medium text-sm transition-colors border-0 cursor-pointer ${
                      activeTab === 'artilheiros'
                        ? 'bg-[#f1f5f9] text-[#0f766e]'
                        : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
                    }`}
                  >
                    Artilheiros
                  </button>
                )}
              </div>
            </div>

            {activeTab === 'grupos' && (
              <div className="flex flex-col gap-4">
                {!hasGroups ? (
                  <p className="text-sm text-slate-400">Este campeonato não possui fase de grupos.</p>
                ) : (
                  estrutura.grupos.map((grupo) => (
                    <GrupoSection
                      key={grupo.id}
                      grupo={grupo}
                      partidas={estrutura.partidas}
                      campeonatoId={campeonatoId}
                      config={config}
                      wildcardEquipeIds={estrutura.wildcard_equipe_ids ?? []}
                      wildcardRanking={estrutura.wildcard_ranking ?? []}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'eliminatorias' && (
              <div className="flex flex-col gap-4">
                {statusVal === 'FINALIZADO' && finalPartida && (
                  <VencedorBanner
                    vencedorNome={finalPartida.vencedor_nome || `Equipe ${finalPartida.vencedor_equipe_id}`}
                  />
                )}
                <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
                  <TournamentBracket
                    matches={estrutura.partidas.filter((p) => p.grupo_id === null)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'artilheiros' && config?.registra_artilheiro && (
              <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#f1f5f9] bg-[#f8fafc]">
                  <h2 className="text-base font-bold text-[#042f2e] m-0">Artilheiros</h2>
                </div>
                {artilheiros.length === 0 ? (
                  <p className="text-sm text-slate-400 px-5 py-4 m-0">Nenhum artilheiro registrado ainda.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#f1f5f9]">
                        <th className="text-left px-5 py-3 text-[0.75rem] font-semibold text-[#64748b] uppercase tracking-wider w-10">#</th>
                        <th className="text-left px-3 py-3 text-[0.75rem] font-semibold text-[#64748b] uppercase tracking-wider">Jogador</th>
                        <th className="text-left px-3 py-3 text-[0.75rem] font-semibold text-[#64748b] uppercase tracking-wider">Escola</th>
                        <th className="text-right px-5 py-3 text-[0.75rem] font-semibold text-[#64748b] uppercase tracking-wider">Gols</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artilheiros.map((a) => (
                        <tr key={a.estudante_id} className="border-b border-[#f8fafc] last:border-0">
                          <td className="px-5 py-3 text-[#94a3b8] font-medium">{a.posicao}°</td>
                          <td className="px-3 py-3 font-medium text-[#334155]">{a.estudante_nome}</td>
                          <td className="px-3 py-3 text-[#64748b]">{a.escola_nome}</td>
                          <td className="px-5 py-3 text-right font-bold text-[#0f766e]">{a.total_gols}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <FooterInstitucional />
    </div>
  )
}
