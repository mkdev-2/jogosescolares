import { ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { FASE_LABEL } from './TournamentBracket'
import PartidaArtilheirosCollapse from './PartidaArtilheirosCollapse'

function formatHorario(iso) {
  if (iso == null || String(iso).trim() === '') return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const diaSemana = d.toLocaleString('pt-BR', { weekday: 'long' })
  const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
  const data = d.toLocaleDateString('pt-BR')
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${diaSemanaCapitalizado}, ${data}, ${hora}`
}

function PartidaCard({ partida, grupoNome, highlighted, knockoutTeamsLocked, maxSets, campeonatoId, registraArtilheiro }) {
  const hasResult = !!partida.resultado_tipo
  const isKnockout = partida.fase !== 'GRUPOS'
  const mandanteWon = hasResult && partida.vencedor_equipe_id === partida.mandante_equipe_id
  const visitanteWon = hasResult && partida.vencedor_equipe_id === partida.visitante_equipe_id

  const mandanteNome = isKnockout && !knockoutTeamsLocked
    ? 'A definir'
    : (partida.mandante_nome || 'A definir')
  const visitanteNome = isKnockout && !knockoutTeamsLocked
    ? 'A definir'
    : (partida.visitante_nome || 'A definir')

  const mandanteIndefinido = mandanteNome === 'A definir'
  const visitanteIndefinido = visitanteNome === 'A definir'

  // altura fixa para a célula de sets: garante mesma altura em todos os cards
  const setsMinHeight = maxSets > 0 ? maxSets * 10 : undefined

  return (
    <div
      id={`resultados-partida-${partida.id}`}
      className={`bg-white rounded-lg border px-3 py-2 flex items-start gap-3 transition-colors ${
        highlighted
          ? 'border-teal-400 ring-2 ring-teal-500 ring-offset-1 shadow-md'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {grupoNome != null && (
        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 w-14 text-center leading-tight mt-0.5">
          Gr. {grupoNome}
        </span>
      )}

      <div className="flex flex-col flex-1 min-w-0 gap-1">
      {/* grid 3col × 2row: linha 1 = equipes+placar, linha 2 = data+sets+local */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-2 gap-y-1">
        {/* Linha 1 — equipes e placar geral */}
        <span className={`text-xs truncate text-right leading-tight mt-px ${mandanteIndefinido ? 'italic text-slate-400' : mandanteWon ? 'font-bold text-emerald-700' : 'font-medium text-slate-700'}`}>
          {mandanteNome}
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
            <span className="text-[9px] font-bold text-amber-600 leading-none">WxO</span>
          )}
          {partida.placar_penaltis_mandante != null && (
            <span className="text-[9px] text-slate-400 leading-none mt-0.5 whitespace-nowrap">
              pen. {partida.placar_penaltis_mandante}–{partida.placar_penaltis_visitante}
            </span>
          )}
        </div>
        <span className={`text-xs truncate leading-tight mt-px ${visitanteIndefinido ? 'italic text-slate-400' : visitanteWon ? 'font-bold text-emerald-700' : 'font-medium text-slate-700'}`}>
          {visitanteNome}
        </span>

        {/* Linha 2 — data, sets e local */}
        {formatHorario(partida.inicio_em) ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600 min-w-0">
            <ClockCircleOutlined style={{ fontSize: 10 }} className="shrink-0 pt-2" />
            <span className="truncate pt-2">{formatHorario(partida.inicio_em)}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] italic text-slate-300">
            <ClockCircleOutlined style={{ fontSize: 10 }} />
            Sem data definida
          </span>
        )}

        <div
          className="flex flex-col items-center gap-px"
          style={setsMinHeight ? { minHeight: setsMinHeight } : undefined}
        >
          {hasResult && partida.sets_detalhe?.map((s, i) => (
            <span key={i} className="text-[9px] text-slate-400 leading-none whitespace-nowrap">
              {s.mandante}-{s.visitante}
            </span>
          ))}
        </div>

        {(partida.local?.nome || partida.local?.link_maps) ? (
          <span className="flex items-center justify-end gap-1 text-[10px] text-slate-500 min-w-0">
            <EnvironmentOutlined style={{ fontSize: 10 }} className="shrink-0 pt-2" />
            {partida.local?.nome && <span className="truncate pt-2">{partida.local.nome}</span>}
            {partida.local?.link_maps && (
              <a
                href={partida.local.link_maps}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 font-semibold shrink-0 pt-2"
              >
                Ver Mapa
              </a>
            )}
          </span>
        ) : (
          <span className="flex items-center justify-end gap-1 text-[10px] italic text-slate-300">
            <EnvironmentOutlined style={{ fontSize: 10 }} />
            Sem local definido
          </span>
        )}
      </div>

      <PartidaArtilheirosCollapse
        campeonatoId={campeonatoId}
        partida={partida}
        registraArtilheiro={registraArtilheiro}
      />
      </div>

      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 ${
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
  'OITAVAS', 'QUARTAS', 'SEMI', 'FINAL', 'TERCEIRO',
]

export default function PartidasTimeline({ partidas, grupos, highlightPartidaId, campeonatoId, registraArtilheiro }) {
  const jogos = partidas.filter((p) => !p.is_bye)

  const grupoMap = Object.fromEntries((grupos || []).map((g) => [g.id, g.nome]))

  const maxSets = Math.max(0, ...jogos.map((p) => p.sets_detalhe?.length ?? 0))

  const gruposJogos = jogos.filter((p) => p.fase === 'GRUPOS')
  const knockoutJogos = jogos.filter((p) => p.fase !== 'GRUPOS')

  // Equipes nas eliminatórias só são exibidas após a fase de grupos estar concluída.
  // Em torneios sem grupos (chaveamento puro), os times são pré-definidos e sempre exibidos.
  const knockoutTeamsLocked =
    gruposJogos.length === 0 || gruposJogos.every((p) => !!p.resultado_tipo)

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
                  <PartidaCard
                    key={p.id}
                    partida={p}
                    grupoNome={grupoMap[p.grupo_id]}
                    highlighted={highlightPartidaId != null && Number(highlightPartidaId) === Number(p.id)}
                    maxSets={maxSets}
                    campeonatoId={campeonatoId}
                    registraArtilheiro={registraArtilheiro}
                  />
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
                  <PartidaCard
                    key={p.id}
                    partida={p}
                    grupoNome={null}
                    highlighted={highlightPartidaId != null && Number(highlightPartidaId) === Number(p.id)}
                    knockoutTeamsLocked={knockoutTeamsLocked}
                    maxSets={maxSets}
                    campeonatoId={campeonatoId}
                    registraArtilheiro={registraArtilheiro}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
