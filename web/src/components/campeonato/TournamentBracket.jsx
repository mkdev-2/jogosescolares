const TEAM_H = 36
const DIVIDER_H = 1
const MATCH_H = TEAM_H * 2 + DIVIDER_H
const MATCH_GAP = 20
const UNIT = MATCH_H + MATCH_GAP
const ROUND_W = 210
const CONNECTOR_W = 40

const BRACKET_PHASES = [
  'TRINTA_E_DOIS_AVOS', 'DEZESSEIS_AVOS', 'OITAVAS', 'QUARTAS', 'SEMI', 'FINAL',
]

export const FASE_LABEL = {
  TRINTA_E_DOIS_AVOS: '1/32 de Final',
  DEZESSEIS_AVOS: '1/16 de Final',
  OITAVAS: 'Oitavas',
  QUARTAS: 'Quartas de Final',
  SEMI: 'Semifinais',
  FINAL: 'Final',
  TERCEIRO: '3º Lugar',
  GRUPOS: 'Fase de Grupos',
}

function matchTop(roundIdx, matchIdx) {
  if (roundIdx === 0) return matchIdx * UNIT
  const offset = UNIT * (Math.pow(2, roundIdx) - 1) / 2
  return offset + matchIdx * UNIT * Math.pow(2, roundIdx)
}

function columnLeft(roundIdx) {
  return roundIdx * (ROUND_W + CONNECTOR_W)
}

function bracketHeight(firstRoundCount) {
  return firstRoundCount * UNIT - MATCH_GAP
}

function bracketWidth(numRounds) {
  return numRounds * ROUND_W + Math.max(0, numRounds - 1) * CONNECTOR_W
}

function buildConnectorPaths(roundsData) {
  const paths = []
  for (let r = 0; r < roundsData.length - 1; r++) {
    const count = roundsData[r].length
    for (let p = 0; p < Math.floor(count / 2); p++) {
      const topY = matchTop(r, p * 2) + MATCH_H / 2
      const botY = matchTop(r, p * 2 + 1) + MATCH_H / 2
      const midY = (topY + botY) / 2
      const x1 = columnLeft(r) + ROUND_W
      const x2 = columnLeft(r + 1)
      const xMid = x1 + (x2 - x1) / 2
      paths.push(
        `M${x1} ${topY} H${xMid}` +
        ` M${xMid} ${topY} V${botY}` +
        ` M${x1} ${botY} H${xMid}` +
        ` M${xMid} ${midY} H${x2}`
      )
    }
  }
  return paths
}

function BracketTeamSlot({ name, score, isWinner }) {
  return (
    <div
      style={{ height: TEAM_H }}
      className={`flex items-center justify-between px-2.5 gap-1 ${isWinner ? 'bg-emerald-50' : ''}`}
    >
      <span
        className={`text-[11px] truncate flex-1 min-w-0 leading-tight ${
          isWinner
            ? 'font-semibold text-emerald-700'
            : name
            ? 'text-slate-700'
            : 'text-slate-400 italic'
        }`}
      >
        {name || 'A definir'}
      </span>
      {score !== null && score !== undefined && (
        <span
          className={`text-[11px] font-mono shrink-0 ml-1 ${
            isWinner ? 'font-bold text-emerald-700' : 'text-slate-500'
          }`}
        >
          {score}
        </span>
      )}
    </div>
  )
}

function BracketMatchBox({ partida, top, left }) {
  const hasResult = !!partida.resultado_tipo
  const v = partida.vencedor_equipe_id
  const isBye = partida.is_bye

  const visitanteName = isBye && !partida.visitante_equipe_id
    ? 'WO'
    : partida.visitante_nome || (partida.visitante_equipe_id ? `Equipe ${partida.visitante_equipe_id}` : null)

  return (
    <div
      style={{ position: 'absolute', top, left, width: ROUND_W, height: MATCH_H }}
      className={`rounded-lg overflow-hidden bg-white border ${
        isBye ? 'opacity-80' : ''
      } ${hasResult ? 'border-slate-300' : 'border-slate-200'}`}
    >
      <BracketTeamSlot
        name={partida.mandante_nome || (partida.mandante_equipe_id ? `Equipe ${partida.mandante_equipe_id}` : null)}
        score={hasResult ? partida.placar_mandante : null}
        isWinner={v !== null && v === partida.mandante_equipe_id}
      />
      <div style={{ height: DIVIDER_H }} className="bg-slate-100" />
      <BracketTeamSlot
        name={visitanteName}
        score={hasResult ? partida.placar_visitante : null}
        isWinner={v !== null && v === partida.visitante_equipe_id}
      />
    </div>
  )
}

export default function TournamentBracket({ matches }) {
  const mainMatches = matches.filter(
    (m) => BRACKET_PHASES.includes(m.fase) && (!m.is_bye || m.vencedor_equipe_id !== null)
  )
  const terceiroMatches = matches.filter((m) => m.fase === 'TERCEIRO' && !m.is_bye)

  const phasesPresent = BRACKET_PHASES.filter((p) => mainMatches.some((m) => m.fase === p))

  if (phasesPresent.length === 0) {
    return <p className="text-sm text-slate-400">Nenhuma partida eliminatória gerada.</p>
  }

  const matchesByPhase = {}
  for (const p of phasesPresent) {
    matchesByPhase[p] = mainMatches.filter((m) => m.fase === p).sort((a, b) => a.id - b.id)
  }

  const firstCount = matchesByPhase[phasesPresent[0]].length
  const contH = bracketHeight(firstCount)
  const contW = bracketWidth(phasesPresent.length)
  const roundsData = phasesPresent.map((p) => matchesByPhase[p])
  const connPaths = buildConnectorPaths(roundsData)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex" style={{ width: contW }}>
        {phasesPresent.map((phase, i) => (
          <div
            key={phase}
            style={{ width: ROUND_W, marginLeft: i === 0 ? 0 : CONNECTOR_W }}
            className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
          >
            {FASE_LABEL[phase] || phase}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="relative" style={{ width: contW, height: contH }}>
          <svg
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
            width={contW}
            height={contH}
          >
            {connPaths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#e2e8f0" strokeWidth={1.5} strokeLinecap="round" />
            ))}
          </svg>

          {phasesPresent.map((phase, rIdx) =>
            matchesByPhase[phase].map((partida, mIdx) => (
              <BracketMatchBox
                key={partida.id}
                partida={partida}
                top={matchTop(rIdx, mIdx)}
                left={columnLeft(rIdx)}
              />
            ))
          )}
        </div>
      </div>

      {terceiroMatches.length > 0 && (
        <div className="flex flex-col gap-2 pt-4 border-t border-[#f1f5f9]">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Disputa de 3º Lugar
          </p>
          {terceiroMatches.map((p) => (
            <div
              key={p.id}
              style={{ width: ROUND_W * 1.4 }}
              className="border border-slate-200 rounded-lg overflow-hidden bg-white"
            >
              <BracketTeamSlot
                name={p.mandante_nome || (p.mandante_equipe_id ? `Equipe ${p.mandante_equipe_id}` : null)}
                score={p.resultado_tipo ? p.placar_mandante : null}
                isWinner={p.vencedor_equipe_id === p.mandante_equipe_id && p.vencedor_equipe_id !== null}
              />
              <div style={{ height: DIVIDER_H }} className="bg-slate-100" />
              <BracketTeamSlot
                name={p.visitante_nome || (p.visitante_equipe_id ? `Equipe ${p.visitante_equipe_id}` : null)}
                score={p.resultado_tipo ? p.placar_visitante : null}
                isWinner={p.vencedor_equipe_id === p.visitante_equipe_id && p.vencedor_equipe_id !== null}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
