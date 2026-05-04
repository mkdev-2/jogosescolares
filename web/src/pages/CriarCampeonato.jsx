import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Checkbox, Modal, Radio, Select, Spin, Switch, Tabs, Tag, message } from 'antd'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { ArrowLeft, Search, Trophy } from 'lucide-react'
import { campeonatosService } from '../services/campeonatosService'
import { edicoesService } from '../services/edicoesService'
import { esporteVariantesService } from '../services/esporteVariantesService'

// ─── componentes DnD ────────────────────────────────────────────────────────

// ─── tela de sorteio ─────────────────────────────────────────────────────────

import { useDraggable, useDroppable } from '@dnd-kit/core'

/**
 * Card arrastável. Aplica o transform diretamente no elemento — sem DragOverlay —
 * garantindo que o card siga o cursor exatamente de onde foi pego.
 */
function DraggableCard({ equipe, onContextMenu }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `equipe-${equipe.id}`,
    data: { equipe },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 9999 : undefined,
        opacity: isDragging ? 0.75 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
      }}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu() } : undefined}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium select-none bg-white border-[#e2e8f0] text-[#1e293b] hover:border-[#0f766e] hover:bg-[#f0fdfa]">
        <Trophy size={13} className="text-[#0f766e] shrink-0" />
        <span className="truncate max-w-[160px]">{equipe.nome_escola}</span>
      </div>
    </div>
  )
}

function DroppableSlot({ grupoIdx, slotIdx, equipe, onRemove }) {
  const id = `slot-${grupoIdx}-${slotIdx}`
  const { setNodeRef, isOver } = useDroppable({ id })
  const ocupado = equipe !== null

  return (
    <div
      ref={setNodeRef}
      className={[
        'relative flex items-center justify-center min-h-[44px] rounded-lg border-2 border-dashed transition-colors duration-150',
        isOver && !ocupado ? 'border-[#0f766e] bg-[#f0fdfa]' : '',
        isOver && ocupado ? 'border-amber-400 bg-amber-50' : '',
        !isOver ? 'border-[#e2e8f0] bg-[#f8fafc]' : '',
      ].filter(Boolean).join(' ')}
    >
      {ocupado ? (
        <>
          <DraggableCard equipe={equipe} onContextMenu={onRemove} />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fee2e2] transition-colors text-[10px] leading-none z-10"
            title="Devolver à pool"
          >
            ✕
          </button>
        </>
      ) : (
        <span className="text-xs text-[#94a3b8]">Arraste aqui</span>
      )}
    </div>
  )
}

function DroppablePool({ pool, totalPool }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })

  let emptyMsg = null
  if (totalPool === 0) {
    emptyMsg = 'Todas as equipes foram alocadas nos grupos'
  } else if (pool.length === 0) {
    emptyMsg = 'Nenhuma equipe corresponde à busca'
  }

  return (
    <div
      ref={setNodeRef}
      className={[
        'flex flex-wrap gap-2 min-h-[72px] p-3 rounded-xl border-2 border-dashed transition-colors duration-150',
        isOver ? 'border-[#0f766e] bg-[#f0fdfa]' : 'border-[#e2e8f0] bg-[#f8fafc]',
      ].join(' ')}
    >
      {emptyMsg ? (
        <span className="text-xs text-[#94a3b8] self-center w-full text-center">{emptyMsg}</span>
      ) : (
        pool.map((equipe) => <DraggableCard key={equipe.id} equipe={equipe} />)
      )}
    </div>
  )
}

const VAGAS_ELIM_OPTS = [2, 4, 8, 16]

/** Nome exibido do grupo: A…Z, depois 27, 28, … */
function nomeGrupoLabel(index) {
  if (index < 26) return String.fromCharCode(65 + index)
  return String(index + 1)
}

function shuffleEquipes(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pool + grupos com arraste (prefixo mg- nas ids de draggable). */
function ManualGruposPanel({ todosConfirmados, grupos, setGrupos }) {
  const pool = useMemo(() => {
    const emGrupo = new Set(grupos.flatMap((g) => g.equipes.map((e) => e.id)))
    return todosConfirmados.filter((e) => !emGrupo.has(e.id))
  }, [todosConfirmados, grupos])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function findSource(equipeId) {
    if (pool.some((e) => e.id === equipeId)) return { tipo: 'pool' }
    for (let gi = 0; gi < grupos.length; gi += 1) {
      const si = grupos[gi].equipes.findIndex((e) => e.id === equipeId)
      if (si >= 0) return { tipo: 'slot', gi, si }
    }
    return null
  }

  function handleDragEnd({ active, over }) {
    if (!over) return
    const equipeId = parseInt(String(active.id).replace('mg-', ''), 10)
    const destId = String(over.id)
    const src = findSource(equipeId)
    if (!src) return

    const dragging =
      src.tipo === 'pool'
        ? pool.find((e) => e.id === equipeId)
        : grupos[src.gi].equipes[src.si]

    if (destId === 'pool-manual') {
      if (src.tipo === 'pool') return
      setGrupos((prev) =>
        prev.map((g, i) =>
          i === src.gi ? { ...g, equipes: g.equipes.filter((_, j) => j !== src.si) } : g
        )
      )
      return
    }

    const m = destId.match(/^mg-slot-(\d+)-(\d+)$/)
    if (!m) return
    const destGi = parseInt(m[1], 10)
    const destSi = parseInt(m[2], 10)
    const destEq = grupos[destGi]?.equipes[destSi]

    if (src.tipo === 'pool') {
      setGrupos((prev) =>
        prev.map((g, i) => {
          if (i !== destGi) return g
          const next = [...g.equipes]
          if (destEq) {
            next[destSi] = dragging
            return { ...g, equipes: next }
          }
          next.splice(destSi, 0, dragging)
          return { ...g, equipes: next }
        })
      )
      return
    }

    const { gi: srcGi, si: srcSi } = src
    if (srcGi === destGi && srcSi === destSi) return

    if (destEq == null) {
      setGrupos((prev) => {
        const next = prev.map((g) => ({ ...g, equipes: [...g.equipes] }))
        const [moved] = next[srcGi].equipes.splice(srcSi, 1)
        let ins = destSi
        if (srcGi === destGi && destSi > srcSi) ins -= 1
        const cap = next[destGi].equipes.length
        if (ins > cap) ins = cap
        next[destGi].equipes.splice(ins, 0, moved)
        return next
      })
      return
    }

    setGrupos((prev) => {
      const next = prev.map((g) => ({ ...g, equipes: [...g.equipes] }))
      const a = next[srcGi].equipes[srcSi]
      const b = next[destGi].equipes[destSi]
      next[destGi].equipes[destSi] = a
      next[srcGi].equipes[srcSi] = b
      return next
    })
  }

  function removeDaLista(gi, si) {
    setGrupos((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, equipes: g.equipes.filter((_, j) => j !== si) } : g))
    )
  }

  function DroppableGrupoSlot({ gi, si, equipe }) {
    const id = `mg-slot-${gi}-${si}`
    const { setNodeRef, isOver } = useDroppable({ id })
    const ocupado = equipe !== undefined && equipe !== null
    return (
      <div
        ref={setNodeRef}
        className={[
          'min-h-[44px] rounded-lg border-2 border-dashed flex items-center px-1',
          isOver ? 'border-[#0f766e] bg-[#f0fdfa]' : 'border-[#e2e8f0] bg-[#f8fafc]',
        ].join(' ')}
      >
        {ocupado ? (
          <div className="flex items-center gap-1 w-full">
            <div className="flex-1 min-w-0">
              <DraggableCardMg equipe={equipe} />
            </div>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => removeDaLista(gi, si)}
              className="shrink-0 text-[10px] text-[#94a3b8] hover:text-[#ef4444] px-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <span className="text-xs text-[#94a3b8] w-full text-center py-2">Arraste</span>
        )}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="small"
            onClick={() =>
              setGrupos((prev) => [
                ...prev,
                {
                  key: `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  equipes: [],
                },
              ])
            }
          >
            Novo grupo
          </Button>
        </div>

        {grupos.map((g, gi) => (
          <div key={g.key} className="rounded-xl border border-[#e2e8f0] p-3 bg-white flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#0f766e] rounded px-2 py-0.5">
                Grupo {nomeGrupoLabel(gi)}
              </span>
              <Select
                placeholder="Adicionar equipe…"
                className="min-w-[200px]"
                value={null}
                options={pool.map((e) => ({ value: e.id, label: e.nome_escola }))}
                onChange={(id) => {
                  const eq = pool.find((e) => e.id === id)
                  if (!eq) return
                  setGrupos((prev) =>
                    prev.map((x, i) => (i === gi ? { ...x, equipes: [...x.equipes, eq] } : x))
                  )
                }}
              />
              {grupos.length > 1 && (
                <Button
                  size="small"
                  danger
                  type="text"
                  onClick={() => {
                    setGrupos((prev) => prev.filter((_, i) => i !== gi))
                  }}
                >
                  Remover grupo
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {g.equipes.map((eq, si) => (
                <DroppableGrupoSlot key={`${g.key}-${eq.id}-${si}`} gi={gi} si={si} equipe={eq} />
              ))}
              <DroppableGrupoSlot gi={gi} si={g.equipes.length} equipe={null} />
            </div>
          </div>
        ))}

        <div>
          <p className="text-sm font-semibold text-[#334155] mb-2">Ainda não alocadas</p>
          <DroppablePoolManual pool={pool} />
        </div>
      </div>
    </DndContext>
  )
}

function DraggableCardMg({ equipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `mg-${equipe.id}`,
    data: { equipe },
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 9999 : undefined,
        opacity: isDragging ? 0.75 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-medium bg-white border-[#e2e8f0] truncate">
        <Trophy size={12} className="text-[#0f766e] shrink-0" />
        <span className="truncate">{equipe.nome_escola}</span>
      </div>
    </div>
  )
}

function DroppablePoolManual({ pool }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool-manual' })
  return (
    <div
      ref={setNodeRef}
      className={[
        'flex flex-wrap gap-2 min-h-[64px] p-3 rounded-xl border-2 border-dashed',
        isOver ? 'border-[#0f766e] bg-[#f0fdfa]' : 'border-[#e2e8f0] bg-[#f8fafc]',
      ].join(' ')}
    >
      {pool.length === 0 ? (
        <span className="text-xs text-[#94a3b8] w-full text-center">Nenhuma equipe na reserva</span>
      ) : (
        pool.map((equipe) => <DraggableCardMg key={equipe.id} equipe={equipe} />)
      )}
    </div>
  )
}

// ── Pré-visualização da chave (layout em árvore, alinhado ao detalhe do campeonato) ──
const CRIAR_TEAM_H = 36
const CRIAR_DIVIDER_H = 1
const CRIAR_MATCH_H = CRIAR_TEAM_H * 2 + CRIAR_DIVIDER_H
const CRIAR_MATCH_GAP = 20
const CRIAR_UNIT = CRIAR_MATCH_H + CRIAR_MATCH_GAP
const CRIAR_ROUND_W = 210
const CRIAR_CONNECTOR_W = 40

const MANUAL_FASE_HEADER = {
  TRINTA_E_DOIS_AVOS: '1/32 DE FINAL',
  DEZESSEIS_AVOS: '1/16 DE FINAL',
  OITAVAS: 'OITAVAS',
  QUARTAS: 'QUARTAS DE FINAL',
  SEMI: 'SEMIFINAIS',
  FINAL: 'FINAL',
}

function faseColunaPorVagas(vagasCol) {
  if (vagasCol <= 2) return 'FINAL'
  if (vagasCol <= 4) return 'SEMI'
  if (vagasCol <= 8) return 'QUARTAS'
  if (vagasCol <= 16) return 'OITAVAS'
  if (vagasCol <= 32) return 'DEZESSEIS_AVOS'
  return 'TRINTA_E_DOIS_AVOS'
}

function criarMatchTop(roundIdx, matchIdx) {
  if (roundIdx === 0) return matchIdx * CRIAR_UNIT
  const offset = (CRIAR_UNIT * (2 ** roundIdx - 1)) / 2
  return offset + matchIdx * CRIAR_UNIT * 2 ** roundIdx
}

function criarColumnLeft(roundIdx) {
  return roundIdx * (CRIAR_ROUND_W + CRIAR_CONNECTOR_W)
}

function criarBracketHeight(firstRoundCount) {
  return firstRoundCount * CRIAR_UNIT - CRIAR_MATCH_GAP
}

function criarBracketWidth(numRounds) {
  return numRounds * CRIAR_ROUND_W + Math.max(0, numRounds - 1) * CRIAR_CONNECTOR_W
}

function criarBuildConnectorPaths(roundsData) {
  const paths = []
  for (let r = 0; r < roundsData.length - 1; r += 1) {
    const count = roundsData[r].length
    for (let p = 0; p < Math.floor(count / 2); p += 1) {
      const topY = criarMatchTop(r, p * 2) + CRIAR_MATCH_H / 2
      const botY = criarMatchTop(r, p * 2 + 1) + CRIAR_MATCH_H / 2
      const midY = (topY + botY) / 2
      const x1 = criarColumnLeft(r) + CRIAR_ROUND_W
      const x2 = criarColumnLeft(r + 1)
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

function criarPhaseHeaders(vagas) {
  const headers = []
  let n = vagas
  while (n >= 2) {
    const fase = faseColunaPorVagas(n)
    headers.push(MANUAL_FASE_HEADER[fase] || fase)
    if (n === 2) break
    n >>= 1
  }
  return headers
}

function CriarBracketTeamLine({ text, italicPlaceholder, draggable }) {
  return (
    <div
      style={{ height: CRIAR_TEAM_H }}
      className={`flex items-center px-2.5 gap-1 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <span
        className={`text-[11px] truncate flex-1 min-w-0 leading-tight ${
          italicPlaceholder || !text ? 'text-slate-400 italic' : 'text-slate-700'
        }`}
      >
        {text || '*A definir*'}
      </span>
    </div>
  )
}

function CriarBracketSeedSlot({ seedIdx, equipe, editable, allPlaceholder }) {
  const placeholder = allPlaceholder || !equipe
  const label = equipe?.nome_escola || null
  const { setNodeRef: setDrop, isOver } = useDroppable({
    id: `br-slot-${seedIdx}`,
    disabled: !editable,
  })
  const { attributes, listeners, setNodeRef: setDrag, transform, isDragging } = useDraggable({
    id: `br-${equipe?.id ?? `empty-${seedIdx}`}`,
    disabled: !editable || !equipe,
    data: { seedIdx, equipe },
  })
  const setRefs = (node) => {
    setDrop(node)
    if (editable && equipe) setDrag(node)
  }
  return (
    <div
      ref={editable && equipe ? setRefs : setDrop}
      style={
        editable && equipe && transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 20 : undefined }
          : undefined
      }
      {...(editable && equipe ? listeners : {})}
      {...(editable && equipe ? attributes : {})}
      className={isOver && editable ? 'ring-1 ring-[#0f766e] ring-inset rounded-sm bg-teal-50/40' : ''}
    >
      <CriarBracketTeamLine text={label} italicPlaceholder={placeholder} draggable={editable && !!equipe} />
    </div>
  )
}

function CriarBracketMatchBox({ top, left, seedA, seedB, equipeA, equipeB, editable, allPlaceholder }) {
  return (
    <div
      style={{ position: 'absolute', top, left, width: CRIAR_ROUND_W, height: CRIAR_MATCH_H }}
      className="rounded-lg overflow-hidden bg-white border border-slate-200 shadow-sm"
    >
      <CriarBracketSeedSlot
        seedIdx={seedA}
        equipe={equipeA}
        editable={editable}
        allPlaceholder={allPlaceholder}
      />
      <div style={{ height: CRIAR_DIVIDER_H }} className="bg-slate-100" />
      <CriarBracketSeedSlot
        seedIdx={seedB}
        equipe={equipeB}
        editable={editable}
        allPlaceholder={allPlaceholder}
      />
    </div>
  )
}

/** Árvore horizontal: mesma geometria do bracket em CampeonatoDetalhe. */
function ManualBracketTree({ vagas, ordem, allPlaceholder, editable, onDragEnd }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const numRounds = Math.round(Math.log2(vagas))
  const firstCount = vagas / 2
  const roundsData = Array.from({ length: numRounds }, (_, r) => Array(vagas / 2 ** (r + 1)).fill(null))
  const contH = criarBracketHeight(firstCount)
  const contW = criarBracketWidth(numRounds)
  const connPaths = criarBuildConnectorPaths(roundsData)

  const matchBoxes = []
  for (let r = 0; r < numRounds; r += 1) {
    const matches = vagas / 2 ** (r + 1)
    for (let m = 0; m < matches; m += 1) {
      const top = criarMatchTop(r, m)
      const left = criarColumnLeft(r)
      if (r === 0) {
        const ia = m
        const ib = vagas - 1 - m
        const eqA = allPlaceholder ? null : ordem[ia]
        const eqB = allPlaceholder ? null : ordem[ib]
        matchBoxes.push(
          <CriarBracketMatchBox
            key={`m-${r}-${m}`}
            top={top}
            left={left}
            seedA={ia}
            seedB={ib}
            equipeA={eqA}
            equipeB={eqB}
            editable={editable}
            allPlaceholder={allPlaceholder}
          />
        )
      } else {
        matchBoxes.push(
          <div
            key={`m-${r}-${m}`}
            style={{ position: 'absolute', top, left, width: CRIAR_ROUND_W, height: CRIAR_MATCH_H }}
            className="rounded-lg overflow-hidden bg-white border border-slate-200 shadow-sm"
          >
            <CriarBracketTeamLine text={null} italicPlaceholder />
            <div style={{ height: CRIAR_DIVIDER_H }} className="bg-slate-100" />
            <CriarBracketTeamLine text={null} italicPlaceholder />
          </div>
        )
      }
    }
  }

  const inner = (
    <div className="relative" style={{ width: contW, height: contH }}>
      <svg
        className="pointer-events-none text-slate-200"
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
        width={contW}
        height={contH}
      >
        {connPaths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        ))}
      </svg>
      {matchBoxes}
    </div>
  )

  if (editable && onDragEnd) {
    return (
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {inner}
      </DndContext>
    )
  }
  return inner
}

function ManualChaveBracketEditor({ vagas, ordem, setOrdem }) {
  function idxOfEquipe(id) {
    return ordem.findIndex((e) => e.id === id)
  }

  function handleDragEnd({ active, over }) {
    if (!over) return
    const idOver = String(over.id)
    const m = idOver.match(/^br-slot-(\d+)$/)
    if (!m) return
    const j = parseInt(m[1], 10)
    const m2 = String(active.id).match(/^br-(\d+)$/)
    if (!m2) return
    const equipeId = parseInt(m2[1], 10)
    const i = idxOfEquipe(equipeId)
    if (i < 0 || j < 0 || i === j) return
    setOrdem((prev) => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#64748b]">
        Arraste o nome de uma equipe sobre a de outra posição na primeira coluna para trocar os seeds antes de
        criar o campeonato.
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex" style={{ width: criarBracketWidth(Math.round(Math.log2(vagas))) }}>
            {criarPhaseHeaders(vagas).map((label, i) => (
              <div
                key={`hdr-${i}`}
                style={{ width: CRIAR_ROUND_W, marginLeft: i === 0 ? 0 : CRIAR_CONNECTOR_W }}
                className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
              >
                {label}
              </div>
            ))}
          </div>
          <ManualBracketTree
            vagas={vagas}
            ordem={ordem}
            allPlaceholder={false}
            editable
            onDragEnd={handleDragEnd}
          />
        </div>
      </div>
    </div>
  )
}

function ManualChaveSkeletonTree({ vagas }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#64748b]">
        Os confrontos serão definidos após a fase de grupos. A primeira coluna da eliminatória começa com slots a
        definir.
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex" style={{ width: criarBracketWidth(Math.round(Math.log2(vagas))) }}>
            {criarPhaseHeaders(vagas).map((label, i) => (
              <div
                key={`hdr-${i}`}
                style={{ width: CRIAR_ROUND_W, marginLeft: i === 0 ? 0 : CRIAR_CONNECTOR_W }}
                className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
              >
                {label}
              </div>
            ))}
          </div>
          <ManualBracketTree vagas={vagas} ordem={[]} allPlaceholder={true} editable={false} />
        </div>
      </div>
    </div>
  )
}

function TelaSorteio({ equipes, estrutura, onSalvar, salvando }) {
  const [grupos, setGrupos] = useState(() =>
    estrutura.tamanhos_grupos.map((tam, i) => ({
      nome: String.fromCharCode(65 + i),
      slots: Array(tam).fill(null),
    }))
  )
  const [pool, setPool] = useState(equipes)
  const [busca, setBusca] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const poolVazio = pool.length === 0

  function findSource(equipeId) {
    if (pool.some((e) => e.id === equipeId)) return { tipo: 'pool' }
    for (let gi = 0; gi < grupos.length; gi++) {
      for (let si = 0; si < grupos[gi].slots.length; si++) {
        if (grupos[gi].slots[si]?.id === equipeId) return { tipo: 'slot', gi, si }
      }
    }
    return null
  }

  function handleDragEnd({ active, over }) {
    if (!over) return

    const equipeId = parseInt(active.id.replace('equipe-', ''))
    const destId = over.id
    const src = findSource(equipeId)
    if (!src) return

    const draggingEquipe =
      src.tipo === 'pool'
        ? pool.find((e) => e.id === equipeId)
        : grupos[src.gi].slots[src.si]

    if (destId === 'pool') {
      if (src.tipo === 'pool') return
      setGrupos((prev) => {
        const next = prev.map((g) => ({ ...g, slots: [...g.slots] }))
        next[src.gi].slots[src.si] = null
        return next
      })
      setPool((prev) => [...prev, draggingEquipe])
      return
    }

    const parts = destId.split('-')
    const destGi = parseInt(parts[1])
    const destSi = parseInt(parts[2])
    const destEquipe = grupos[destGi].slots[destSi]

    if (src.tipo === 'pool') {
      setPool((prev) => {
        const next = prev.filter((e) => e.id !== equipeId)
        return destEquipe ? [...next, destEquipe] : next
      })
      setGrupos((prev) => {
        const next = prev.map((g) => ({ ...g, slots: [...g.slots] }))
        next[destGi].slots[destSi] = draggingEquipe
        return next
      })
    } else {
      const { gi: srcGi, si: srcSi } = src
      if (srcGi === destGi && srcSi === destSi) return
      setGrupos((prev) => {
        const next = prev.map((g) => ({ ...g, slots: [...g.slots] }))
        next[destGi].slots[destSi] = draggingEquipe
        next[srcGi].slots[srcSi] = destEquipe
        return next
      })
    }
  }

  function handleRemoveFromSlot(gi, si) {
    const equipe = grupos[gi].slots[si]
    if (!equipe) return
    setGrupos((prev) => {
      const next = prev.map((g) => ({ ...g, slots: [...g.slots] }))
      next[gi].slots[si] = null
      return next
    })
    setPool((prev) => [...prev, equipe])
  }

  function handleSalvar() {
    const payload = grupos.map((g) => ({ equipes: g.slots.map((e) => e.id) }))
    onSalvar(payload)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-6">
        {/* Grupos */}
        <div>
          <p className="text-sm font-semibold text-[#334155] mb-3">
            Grupos ({grupos.length}) — arraste as equipes para os slots
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {grupos.map((grupo, gi) => (
              <div key={grupo.nome} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white bg-[#0f766e] rounded px-2 py-0.5">
                    Grupo {grupo.nome}
                  </span>
                  <span className="text-xs text-[#94a3b8]">
                    {grupo.slots.filter(Boolean).length}/{grupo.slots.length}
                  </span>
                </div>
                {grupo.slots.map((equipe, si) => (
                  <DroppableSlot
                    key={si}
                    grupoIdx={gi}
                    slotIdx={si}
                    equipe={equipe}
                    onRemove={() => handleRemoveFromSlot(gi, si)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Pool */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-[#334155]">
              Equipes disponíveis
              {pool.length > 0 && (
                <Tag color="blue" className="ml-2">
                  {pool.length} restante{pool.length !== 1 ? 's' : ''}
                </Tag>
              )}
            </p>
            {pool.length > 0 && (
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar escola..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-7 pr-3 py-1 text-xs rounded-lg border border-[#e2e8f0] bg-white text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#0f766e] transition-colors w-48"
                />
              </div>
            )}
          </div>
          <DroppablePool
            pool={pool.filter((e) => e.nome_escola.toLowerCase().includes(busca.toLowerCase()))}
            totalPool={pool.length}
          />
        </div>

        {/* Ação */}
        <div className="flex justify-end pt-2 border-t border-[#e2e8f0]">
          <Button
            type="primary"
            size="large"
            disabled={!poolVazio}
            loading={salvando}
            onClick={handleSalvar}
          >
            {poolVazio ? 'Salvar Campeonato' : `Alocar ${pool.length} equipe${pool.length !== 1 ? 's' : ''} restante${pool.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>

    </DndContext>
  )
}

// ─── página principal ────────────────────────────────────────────────────────

export default function CriarCampeonato() {
  const navigate = useNavigate()

  const [edicoes, setEdicoes] = useState([])
  const [variantes, setVariantes] = useState([])
  const [campeonatosExistentes, setCampeonatosExistentes] = useState([])
  const [loadingBase, setLoadingBase] = useState(true)

  const [edicaoId, setEdicaoId] = useState(undefined)
  const [varianteId, setVarianteId] = useState(undefined)
  const [modoCadastro, setModoCadastro] = useState('automatico')

  const [equipes, setEquipes] = useState([])
  const [loadingEquipes, setLoadingEquipes] = useState(false)
  const [confirmacaoOpen, setConfirmacaoOpen] = useState(false)
  const [selecionadas, setSelecionadas] = useState([])

  const [etapa, setEtapa] = useState('selecao') // 'selecao' | 'sorteio'
  const [equipesSorteio, setEquipesSorteio] = useState([])
  const [estrutura, setEstrutura] = useState(null)

  const [salvando, setSalvando] = useState(false)
  const [diretoDlg, setDiretoDlg] = useState({ open: false, equipes: [], estrutura: null })

  const [manualTemFaseGrupos, setManualTemFaseGrupos] = useState(true)
  const [manualVagasElim, setManualVagasElim] = useState(8)
  const [manualCamposBloqueados, setManualCamposBloqueados] = useState(false)
  const [manualConfirmadas, setManualConfirmadas] = useState([])
  const [manualGrupos, setManualGrupos] = useState([])
  const [manualChaveOrdem, setManualChaveOrdem] = useState([])
  const [manualTab, setManualTab] = useState('grupos')

  const [equipesCadastradasNaVariante, setEquipesCadastradasNaVariante] = useState([])
  const [loadingEquipesVariante, setLoadingEquipesVariante] = useState(false)

  const resetFluxoManual = useCallback(() => {
    setManualCamposBloqueados(false)
    setManualConfirmadas([])
    setManualGrupos([])
    setManualChaveOrdem([])
    setManualTab('grupos')
    setManualTemFaseGrupos(true)
  }, [])

  useEffect(() => {
    if (modoCadastro !== 'manual') resetFluxoManual()
  }, [modoCadastro, resetFluxoManual])

  useEffect(() => {
    if (!manualTemFaseGrupos) setManualTab('chaves')
  }, [manualTemFaseGrupos])

  useEffect(() => {
    if (modoCadastro !== 'manual' || !varianteId) {
      setEquipesCadastradasNaVariante([])
      setLoadingEquipesVariante(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingEquipesVariante(true)
      try {
        const data = await campeonatosService.getEquipesDaVariante(varianteId, edicaoId)
        if (!cancelled) setEquipesCadastradasNaVariante(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setEquipesCadastradasNaVariante([])
      } finally {
        if (!cancelled) setLoadingEquipesVariante(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [modoCadastro, varianteId, edicaoId])

  useEffect(() => {
    const c = equipesCadastradasNaVariante.length
    const allowed = VAGAS_ELIM_OPTS.filter((n) => n <= c)
    if (allowed.length === 0) return
    setManualVagasElim((prev) => {
      if (allowed.includes(prev)) return prev
      if (allowed.includes(8)) return 8
      return Math.max(...allowed)
    })
  }, [equipesCadastradasNaVariante])

  useEffect(() => {
    const init = async () => {
      try {
        const [edData, varData, campData] = await Promise.all([
          edicoesService.list(),
          esporteVariantesService.list(),
          campeonatosService.list(),
        ])
        setEdicoes(Array.isArray(edData) ? edData : [])
        setVariantes(Array.isArray(varData) ? varData : [])
        setCampeonatosExistentes(Array.isArray(campData) ? campData : [])
      } catch (err) {
        message.error(err.message || 'Erro ao carregar dados iniciais')
      } finally {
        setLoadingBase(false)
      }
    }
    init()
  }, [])

  const variantesFiltradas = useMemo(() => {
    const idsComCampeonato = new Set(campeonatosExistentes.map((c) => c.esporte_variante_id))
    return variantes.filter(
      (v) =>
        (modoCadastro === 'manual' || v.tipo_modalidade_nome === 'COLETIVAS') &&
        !idsComCampeonato.has(v.id) &&
        (!edicaoId || v.edicao_id === edicaoId)
    )
  }, [variantes, campeonatosExistentes, edicaoId, modoCadastro])

  const varianteLabel = useCallback(
    (v) => [v.esporte_nome, v.categoria_nome, v.naipe_nome].filter(Boolean).join(' – '),
    []
  )

  async function handleBuscarEquipes() {
    if (!varianteId) return
    setLoadingEquipes(true)
    try {
      let data = equipesCadastradasNaVariante
      if (modoCadastro !== 'manual' || data.length === 0) {
        data = await campeonatosService.getEquipesDaVariante(varianteId, edicaoId)
        if (modoCadastro === 'manual' && Array.isArray(data)) {
          setEquipesCadastradasNaVariante(data)
        }
      }
      const list = Array.isArray(data) ? data : []
      setEquipes(list)
      setSelecionadas(list.map((e) => e.id))
      setConfirmacaoOpen(true)
    } catch (err) {
      message.error(err.message || 'Erro ao buscar equipes')
    } finally {
      setLoadingEquipes(false)
    }
  }

  async function handleConfirmar() {
    const confirmadas = equipes.filter((e) => selecionadas.includes(e.id))
    if (confirmadas.length < 1) {
      message.warning('Selecione ao menos 1 equipe para criar o campeonato.')
      return
    }

    if (modoCadastro === 'manual') {
      if (!manualTemFaseGrupos && selecionadas.length !== manualVagasElim) {
        message.warning(`Sem fase de grupos, selecione exatamente ${manualVagasElim} equipes.`)
        return
      }
      setManualConfirmadas(confirmadas)
      setManualCamposBloqueados(true)
      setConfirmacaoOpen(false)
      if (manualTemFaseGrupos) {
        setManualGrupos([
          {
            key: `g-${Date.now()}`,
            equipes: [],
          },
        ])
        setManualChaveOrdem([])
        setManualTab('grupos')
      } else {
        setManualGrupos([])
        setManualChaveOrdem(shuffleEquipes(confirmadas))
        setManualTab('chaves')
      }
      return
    }

    let est
    try {
      est = await campeonatosService.getEstruturaGruposPreview(varianteId, edicaoId, confirmadas.length)
      setEstrutura(est)
    } catch (err) {
      message.error(err.message || 'Erro ao calcular estrutura de grupos')
      return
    }
    setConfirmacaoOpen(false)

    if (est.regra === 'DIRETO') {
      setDiretoDlg({ open: true, equipes: confirmadas, estrutura: est })
      return
    }

    setEquipesSorteio(confirmadas)
    setEtapa('sorteio')
  }

  async function handleCriarManualFinal() {
    const idsConfirmadas = new Set(manualConfirmadas.map((e) => e.id))
    if (manualTemFaseGrupos) {
      const emGrupo = new Set(manualGrupos.flatMap((g) => g.equipes.map((e) => e.id)))
      if (emGrupo.size !== manualConfirmadas.length || [...idsConfirmadas].some((id) => !emGrupo.has(id))) {
        message.warning('Distribua todas as equipes confirmadas em algum grupo.')
        return
      }
    } else {
      if (manualChaveOrdem.length !== manualVagasElim) {
        message.warning('Chave inválida: quantidade de equipes não confere com as vagas.')
        return
      }
    }

    const equipe_ids = manualTemFaseGrupos
      ? manualGrupos.flatMap((g) => g.equipes.map((e) => e.id))
      : manualChaveOrdem.map((e) => e.id)

    const payload = {
      esporte_variante_id: varianteId,
      edicao_id: edicaoId || undefined,
      equipe_ids,
      tem_fase_grupos: manualTemFaseGrupos,
      vagas_eliminatoria: manualVagasElim,
      grupos: manualTemFaseGrupos
        ? manualGrupos.map((g, i) => ({
            nome: nomeGrupoLabel(i),
            equipe_ids: g.equipes.map((e) => e.id),
          }))
        : undefined,
      chaveamento_equipe_ids: manualTemFaseGrupos ? undefined : manualChaveOrdem.map((e) => e.id),
    }

    setSalvando(true)
    try {
      const campeonato = await campeonatosService.criarManual(payload)
      message.success('Campeonato manual criado com sucesso!')
      navigate(`/app/campeonatos/${campeonato.id}`)
    } catch (err) {
      message.error(err.message || 'Erro ao criar campeonato manual')
    } finally {
      setSalvando(false)
    }
  }

  async function handleSalvarDireto(equipes) {
    setSalvando(true)
    try {
      await campeonatosService.criarAutomatico({
        esporte_variante_id: varianteId,
        edicao_id: edicaoId || undefined,
        equipe_ids: equipes.map((e) => e.id),
      })
      message.success('Campeonato criado com sucesso!')
      navigate('/app/atividades?tab=campeonatos')
    } catch (err) {
      message.error(err.message || 'Erro ao salvar campeonato')
    } finally {
      setSalvando(false)
    }
  }

  async function handleSalvar(grupos) {
    setSalvando(true)
    try {
      await campeonatosService.criarComSorteio({
        esporte_variante_id: varianteId,
        edicao_id: edicaoId || undefined,
        grupos,
      })
      message.success('Campeonato criado com sucesso!')
      navigate('/app/atividades?tab=campeonatos')
    } catch (err) {
      message.error(err.message || 'Erro ao salvar campeonato')
    } finally {
      setSalvando(false)
    }
  }

  const varianteSelecionada = useMemo(
    () => variantes.find((v) => v.id === varianteId),
    [variantes, varianteId]
  )

  const bloqueioManual = modoCadastro === 'manual' && manualCamposBloqueados

  const podeCriarManual = useMemo(() => {
    if (!bloqueioManual) return false
    if (manualTemFaseGrupos) {
      const em = new Set(manualGrupos.flatMap((g) => g.equipes.map((e) => e.id)))
      if (manualConfirmadas.length === 0) return false
      return (
        em.size === manualConfirmadas.length &&
        manualConfirmadas.every((e) => em.has(e.id))
      )
    }
    return manualChaveOrdem.length === manualVagasElim
  }, [
    bloqueioManual,
    manualTemFaseGrupos,
    manualGrupos,
    manualConfirmadas,
    manualChaveOrdem,
    manualVagasElim,
  ])

  if (loadingBase) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/app/atividades?tab=campeonatos')}
          className="mt-1 text-[#64748b] hover:text-[#0f766e] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
            {etapa === 'sorteio' ? 'Sorteio de Grupos' : 'Criar Campeonato'}
          </h1>
          <p className="text-[0.9375rem] text-[#64748b] m-0 mt-1">
            {etapa === 'sorteio'
              ? `${varianteSelecionada ? varianteLabel(varianteSelecionada) : ''} · ${equipesSorteio.length} equipes confirmadas`
              : modoCadastro === 'manual'
                ? 'Cadastro manual para publicação de confrontos, classificação e resultados'
                : 'Modalidades coletivas · Sorteio manual de grupos'}
          </p>
        </div>
      </div>

      {etapa === 'selecao' && (
        <>
        <div className="flex flex-col gap-4 max-w-lg">
          <div className="flex flex-col gap-3">
            <Radio.Group
              value={modoCadastro}
              disabled={bloqueioManual}
              onChange={(e) => {
                setModoCadastro(e.target.value)
                setVarianteId(undefined)
              }}
              optionType="button"
              buttonStyle="solid"
              options={[
                { label: 'Automático', value: 'automatico' },
                { label: 'Manual', value: 'manual' },
              ]}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#374151]">Edição</label>
              <Select
                placeholder="Selecione a edição (opcional)"
                allowClear
                disabled={bloqueioManual}
                value={edicaoId}
                onChange={(v) => {
                  setEdicaoId(v)
                  setVarianteId(undefined)
                }}
                options={edicoes.map((e) => ({ value: e.id, label: `${e.nome} (${e.ano})` }))}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#374151]">Modalidade</label>
              <Select
                placeholder={modoCadastro === 'manual' ? 'Selecione a modalidade' : 'Selecione a modalidade coletiva'}
                disabled={bloqueioManual}
                value={varianteId}
                onChange={setVarianteId}
                options={variantesFiltradas.map((v) => ({
                  value: v.id,
                  label: varianteLabel(v),
                }))}
                showSearch
                optionFilterProp="label"
                className="w-full"
                notFoundContent={
                  <span className="text-xs text-[#94a3b8]">
                    Nenhuma modalidade disponível
                  </span>
                }
              />
              {modoCadastro === 'manual' && varianteId && (
                <p className="text-xs text-[#64748b] mt-1">
                  {loadingEquipesVariante
                    ? 'Carregando equipes…'
                    : `${equipesCadastradasNaVariante.length} equipe${equipesCadastradasNaVariante.length === 1 ? '' : 's'} cadastrada${equipesCadastradasNaVariante.length === 1 ? '' : 's'} nessa modalidade`}
                </p>
              )}
            </div>

            {modoCadastro === 'manual' && (
              <div className="flex flex-col gap-3 pt-1 border-t border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={manualTemFaseGrupos}
                    disabled={bloqueioManual}
                    onChange={setManualTemFaseGrupos}
                  />
                  <span className="text-sm font-medium text-[#374151] pr-2">
                    {manualTemFaseGrupos ? 'Utilizar Fase de Grupos' : 'Apenas Eliminatórias'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[#374151]">Vagas na chave eliminatória</span>
                  <Radio.Group
                    value={manualVagasElim}
                    disabled={bloqueioManual}
                    onChange={(e) => setManualVagasElim(e.target.value)}
                    options={VAGAS_ELIM_OPTS.map((n) => ({
                      label: String(n),
                      value: n,
                      disabled: n > equipesCadastradasNaVariante.length,
                    }))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="primary"
              size="large"
              loading={loadingEquipes}
              disabled={!varianteId || bloqueioManual}
              onClick={handleBuscarEquipes}
              className="self-start"
            >
              Buscar equipes
            </Button>
            {bloqueioManual && (
              <Button type="link" className="p-0 h-auto" onClick={resetFluxoManual}>
                Editar
              </Button>
            )}
          </div>
        </div>

        {modoCadastro === 'manual' && manualCamposBloqueados && (
          <div className="max-w-3xl w-full flex flex-col gap-4 border-t border-[#e2e8f0] pt-6">
            <Tabs
              activeKey={manualTab}
              onChange={setManualTab}
              items={[
                {
                  key: 'grupos',
                  label: 'Grupos',
                  disabled: !manualTemFaseGrupos,
                  children: manualTemFaseGrupos ? (
                    <ManualGruposPanel
                      todosConfirmados={manualConfirmadas}
                      grupos={manualGrupos}
                      setGrupos={setManualGrupos}
                    />
                  ) : (
                    <p className="text-sm text-[#64748b]">Ative a fase de grupos para distribuir equipes em grupos.</p>
                  ),
                },
                {
                  key: 'chaves',
                  label: 'Chaves',
                  children: manualTemFaseGrupos ? (
                    <ManualChaveSkeletonTree vagas={manualVagasElim} />
                  ) : (
                    <ManualChaveBracketEditor
                      vagas={manualVagasElim}
                      ordem={manualChaveOrdem}
                      setOrdem={setManualChaveOrdem}
                    />
                  ),
                },
              ]}
            />
            <div className="flex justify-end pt-2">
              <Button
                type="primary"
                size="large"
                loading={salvando}
                disabled={!podeCriarManual}
                onClick={handleCriarManualFinal}
              >
                Confirmar e Criar
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      {etapa === 'sorteio' && estrutura && (
        <TelaSorteio equipes={equipesSorteio} estrutura={estrutura} onSalvar={handleSalvar} salvando={salvando} />
      )}

      {/* Modal de confirmação de equipes */}
      <Modal
        open={confirmacaoOpen}
        onCancel={() => setConfirmacaoOpen(false)}
        title="Confirmar equipes participantes"
        width={500}
        footer={
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#64748b]">
              {selecionadas.length} equipe{selecionadas.length !== 1 ? 's' : ''} confirmada
              {selecionadas.length !== 1 ? 's' : ''}
              {selecionadas.length < 1 && (
                <span className="text-red-500 ml-1">(mínimo 1)</span>
              )}
            </span>
            <Button
              type="primary"
              disabled={selecionadas.length < 1}
              loading={salvando && modoCadastro !== 'manual'}
              onClick={handleConfirmar}
            >
              {modoCadastro === 'manual' ? 'Confirmar' : 'Confirmar e sortear'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[#64748b] mb-3">
          Desmarque as equipes que não vão participar. Após confirmar, não serão permitidas
          desistências.
        </p>
        <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
          {equipes.map((equipe) => (
            <label
              key={equipe.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f8fafc] cursor-pointer"
            >
              <Checkbox
                checked={selecionadas.includes(equipe.id)}
                onChange={(e) =>
                  setSelecionadas((prev) =>
                    e.target.checked ? [...prev, equipe.id] : prev.filter((id) => id !== equipe.id)
                  )
                }
              />
              <span className="text-sm text-[#1e293b]">{equipe.nome_escola}</span>
            </label>
          ))}
        </div>
      </Modal>

      {/* Modal de criação direta (N=1, N=2, N=4) */}
      <Modal
        open={diretoDlg.open}
        onCancel={() => setDiretoDlg((d) => ({ ...d, open: false }))}
        width={420}
        footer={null}
        closable={!salvando}
        maskClosable={!salvando}
        styles={{ header: { display: 'none' } }}
      >
        {diretoDlg.estrutura && (
          <div className="flex flex-col gap-5 pt-2">
            {/* ícone + título */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-[#f0fdf4] border border-[#bbf7d0]">
                <Trophy size={18} className="text-[#0f766e]" />
              </div>
              <div>
                <p className="text-[0.9375rem] font-semibold text-[#042f2e] m-0 leading-snug">
                  Criar campeonato com {diretoDlg.estrutura.total_equipes} equipe{diretoDlg.estrutura.total_equipes !== 1 ? 's' : ''}?
                </p>
                <p className="text-sm text-[#64748b] m-0 mt-0.5">
                  {diretoDlg.estrutura.total_equipes === 1
                    ? 'A única equipe será declarada campeã automaticamente, sem disputas.'
                    : `Será disputada uma chave direta entre as ${diretoDlg.estrutura.total_equipes} equipes, sem fase de grupos.`}
                </p>
              </div>
            </div>

            {/* info box */}
            <div className="rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-3">
              <p className="text-xs text-[#166534] m-0 leading-relaxed">
                {diretoDlg.estrutura.total_equipes === 1
                  ? 'O campeonato será encerrado imediatamente após a criação com a equipe declarada campeã.'
                  : 'O chaveamento eliminatório será gerado automaticamente com as equipes confirmadas.'}
              </p>
            </div>

            {/* equipes */}
            <div className="flex flex-col gap-1.5">
              {diretoDlg.equipes.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0f766e] flex-shrink-0" />
                  <span className="text-sm text-[#1e293b]">{e.nome_escola}</span>
                </div>
              ))}
            </div>

            {/* ações */}
            <div className="flex justify-end gap-2 pt-1 border-t border-[#e2e8f0]">
              <Button
                onClick={() => setDiretoDlg((d) => ({ ...d, open: false }))}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                loading={salvando}
                onClick={async () => {
                  await handleSalvarDireto(diretoDlg.equipes)
                  setDiretoDlg((d) => ({ ...d, open: false }))
                }}
              >
                Criar campeonato
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
