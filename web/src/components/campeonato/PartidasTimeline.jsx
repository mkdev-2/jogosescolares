import { FASE_LABEL } from './TournamentBracket'

function PartidaCard({ partida, grupoNome }) {
  const hasResult = !!partida.resultado_tipo
  const mandanteWon = hasResult && partida.vencedor_equipe_id === partida.mandante_equipe_id
  const visitanteWon = hasResult && partida.vencedor_equipe_id === partida.visitante_equipe_id

  return (
    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 flex items-center gap-3 hover:border-slate-300 transition-colors">
      {grupoNome != null && (
        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 w-14 text-center leading-tight">
          Gr. {grupoNome}
        </span>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 flex-1 min-w-0">
        <span className={`text-xs truncate text-right ${mandanteWon ? 'font-bold text-emerald-700' : 'font-medium text-slate-700'}`}>
          {partida.mandante_nome || `Equipe ${partida.mandante_equipe_id}`}
        </span>
        <div className="flex flex-col items-center shrink-0">
          {hasResult ? (
            <span className="text-sm font-extrabold text-slate-800 tabular-nums leading-none whitespace-nowrap">
              {partida.placar_mandante}
              <span className="text-slate-400 mx-0.5 font-normal">×</span>
              {partida.placar_visitante}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">vs</span>
          )}
          {partida.resultado_tipo === 'WXO' && (
            <span className="text-[9px] font-bold text-amber-600 mt-0.5 leading-none">WxO</span>
          )}
        </div>
        <span className={`text-xs truncate ${visitanteWon ? 'font-bold text-emerald-700' : 'font-medium text-slate-700'}`}>
          {partida.visitante_nome || `Equipe ${partida.visitante_equipe_id}`}
        </span>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
        hasResult ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
      }`}>
        {hasResult ? 'Enc.' : 'Pend.'}
      </span>
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

const KNOCKOUT_PHASES_ORDER = [
  'TRINTA_E_DOIS_AVOS', 'DEZESSEIS_AVOS', 'OITAVAS', 'QUARTAS', 'SEMI', 'FINAL', 'TERCEIRO',
]

export default function PartidasTimeline({ partidas, grupos }) {
  const jogos = partidas.filter((p) => !p.is_bye)

  const grupoMap = Object.fromEntries((grupos || []).map((g) => [g.id, g.nome]))

  const gruposJogos = jogos.filter((p) => p.fase === 'GRUPOS')
  const knockoutJogos = jogos.filter((p) => p.fase !== 'GRUPOS')

  const porRodada = {}
  for (const p of gruposJogos) {
    if (!porRodada[p.rodada]) porRodada[p.rodada] = []
    porRodada[p.rodada].push(p)
  }
  const rodadas = Object.keys(porRodada).map(Number).sort((a, b) => a - b)

  const knockoutByFase = {}
  for (const p of knockoutJogos) {
    if (!knockoutByFase[p.fase]) knockoutByFase[p.fase] = []
    knockoutByFase[p.fase].push(p)
  }
  const knockoutFases = KNOCKOUT_PHASES_ORDER.filter((f) => knockoutByFase[f])

  if (jogos.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">Nenhuma partida cadastrada.</p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {rodadas.length > 0 && (
        <div className="flex flex-col gap-4">
          <SectionDivider label="Fase de Grupos" />
          {rodadas.map((rodada) => (
            <div key={rodada} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-600">Rodada {rodada}</span>
              </div>
              <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-slate-100 ml-0.5">
                {porRodada[rodada].map((p) => (
                  <PartidaCard key={p.id} partida={p} grupoNome={grupoMap[p.grupo_id]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {knockoutFases.length > 0 && (
        <div className="flex flex-col gap-4">
          <SectionDivider label="Eliminatórias" />
          {knockoutFases.map((fase) => (
            <div key={fase} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-600">{FASE_LABEL[fase] || fase}</span>
              </div>
              <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-slate-100 ml-0.5">
                {knockoutByFase[fase].map((p) => (
                  <PartidaCard key={p.id} partida={p} grupoNome={null} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
