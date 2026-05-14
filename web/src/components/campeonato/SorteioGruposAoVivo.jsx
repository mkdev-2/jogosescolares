import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button, Tag, Tooltip } from 'antd'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Play, Search, Trophy, Undo2 } from 'lucide-react'
import { destinoRodizio } from './sorteioGruposRodizio'

const Motion = motion

/** Nome exibido do grupo: A…Z, depois 27, 28, … */
function nomeGrupoLabel(index) {
  if (index < 26) return String.fromCharCode(65 + index)
  return String(index + 1)
}

function pickRandomEquipe(pool) {
  if (pool.length === 0) return null
  const i = Math.floor(Math.random() * pool.length)
  return pool[i]
}

/** Faixa longa: decoys, vencedor, depois `REEL_TAIL_ROW_COUNT` linhas para preencher o viewport abaixo da moldura. Decoys só do `poolFonte` (excl. vencedor quando possível). */
function buildRouletteStrip(poolFonte, winner, nDecoys = 78) {
  if (!winner) return []
  const strip = []
  const n = Math.max(24, nDecoys)
  const src = poolFonte.filter((e) => e.id !== winner.id)
  const pickFrom = src.length > 0 ? src : poolFonte
  for (let i = 0; i < n; i += 1) {
    strip.push(pickFrom[Math.floor(Math.random() * pickFrom.length)])
  }
  strip.push(winner)
  for (let t = 0; t < REEL_TAIL_ROW_COUNT; t += 1) {
    strip.push(pickFrom[Math.floor(Math.random() * pickFrom.length)])
  }
  return strip
}

/** Repetições do pool em ordem fixa para a roleta visível em repouso (loop suave). */
function buildIdleStrip(pool) {
  if (pool.length === 0) return []
  const nCycles = Math.max(6, Math.ceil(48 / pool.length))
  const strip = []
  for (let c = 0; c < nCycles; c += 1) {
    for (let i = 0; i < pool.length; i += 1) {
      strip.push(pool[i])
    }
  }
  return strip
}

function DraggableCardSorteio({ equipe, onContextMenu }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `equipe-${equipe.id}`,
    data: { equipe },
  })

  const padSlot = Boolean(onContextMenu)

  return (
    <div
      ref={setNodeRef}
      className="w-full min-w-0 max-w-full"
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
      <Tooltip title={equipe.nome_escola} placement="top" mouseEnterDelay={0.35}>
        <div
          className={[
            'group flex w-full min-w-0 items-center gap-2 rounded-lg border py-2 text-sm font-medium select-none bg-white border-[#e2e8f0] text-[#1e293b]',
            'transition-[box-shadow,background-color,border-color,transform] duration-200 ease-out',
            'hover:border-[#0f766e] hover:bg-[#f0fdfa] hover:shadow-md hover:shadow-[0_6px_20px_-8px_rgba(15,118,110,0.35)] hover:ring-2 hover:ring-[#0f766e]/20',
            'active:scale-[0.99] active:shadow-sm',
            padSlot ? 'pl-3 pr-7' : 'px-3',
          ].join(' ')}
        >
          <Trophy
            size={13}
            className="shrink-0 text-[#0f766e] transition-transform duration-200 group-hover:scale-110 group-hover:text-[#0d9488]"
          />
          <span className="min-w-0 flex-1 truncate transition-colors duration-200 group-hover:text-[#0f766e]">
            {equipe.nome_escola}
          </span>
        </div>
      </Tooltip>
    </div>
  )
}

function DroppableSlotSorteio({ grupoIdx, slotIdx, equipe, onRemove, isSorteioSlotAlvo }) {
  const id = `slot-${grupoIdx}-${slotIdx}`
  const { setNodeRef, isOver } = useDroppable({ id })
  const ocupado = equipe !== null

  let slotClasses =
    'relative flex w-full min-w-0 max-w-full min-h-[44px] items-center justify-center overflow-hidden rounded-lg border-2 transition-colors duration-150'
  if (isOver && !ocupado) {
    slotClasses += ' border-[#0f766e] bg-[#f0fdfa]'
  } else if (isOver && ocupado) {
    slotClasses += ' border-amber-400 bg-amber-50'
  } else if (isSorteioSlotAlvo && !ocupado) {
    slotClasses +=
      ' border-[#059669] border-solid bg-[#d1fae5] shadow-[0_0_0_2px_rgba(16,185,129,0.45),inset_0_0_0_1px_rgba(5,150,105,0.2)]'
  } else if (isSorteioSlotAlvo && ocupado) {
    slotClasses +=
      ' border-[#059669] border-solid bg-[#ecfdf5] shadow-[0_0_0_2px_rgba(16,185,129,0.35)]'
  } else {
    slotClasses += ' border-dashed border-[#e2e8f0] bg-[#f8fafc]'
  }

  return (
    <div ref={setNodeRef} className={slotClasses}>
      {ocupado ? (
        <>
          <DraggableCardSorteio equipe={equipe} onContextMenu={onRemove} />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fee2e2] transition-colors text-xs leading-none z-10"
            title="Devolver à pool"
          >
            ✕
          </button>
        </>
      ) : (
        <span
          className={[
            'text-xs',
            isSorteioSlotAlvo ? 'font-semibold text-[#047857]' : 'text-[#94a3b8]',
          ].join(' ')}
        >
          Arraste aqui
        </span>
      )}
    </div>
  )
}

function DroppablePoolSorteio({ pool, totalPool }) {
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
        'grid min-h-[72px] min-w-0 grid-cols-1 gap-2 rounded-xl border-2 border-dashed p-3 transition-colors duration-150 sm:grid-cols-3',
        isOver ? 'border-[#0f766e] bg-[#f0fdfa]' : 'border-[#e2e8f0] bg-[#f8fafc]',
      ].join(' ')}
    >
      {emptyMsg ? (
        <span className="self-center w-full text-center text-xs text-[#94a3b8]">
          {emptyMsg}
        </span>
      ) : (
        pool.map((equipe) => (
          <div key={equipe.id} className="min-w-0">
            <DraggableCardSorteio equipe={equipe} />
          </div>
        ))
      )}
    </div>
  )
}

/** Linhas visíveis (ímpar): faixa central = slot vencedor. */
const REEL_VISIBLE_ROWS = 5
const REEL_CENTER_ROW = Math.floor(REEL_VISIBLE_ROWS / 2)
/** Linhas na viewport abaixo da faixa central — precisam existir na faixa após o vencedor para não ficar “vazio”. */
const REEL_TAIL_ROW_COUNT = Math.max(0, REEL_VISIBLE_ROWS - 1 - REEL_CENTER_ROW)

function reelWinnerIndex(stripLen) {
  if (stripLen < 1) return -1
  return Math.max(0, stripLen - 1 - REEL_TAIL_ROW_COUNT)
}

/** Alinha a linha `winnerIndex` (topo da célula) com a faixa central do viewport. */
function stripScrollTargetY(winnerIndex, itemHeight) {
  if (winnerIndex < 0) return 0
  return REEL_CENTER_ROW * itemHeight - winnerIndex * itemHeight
}

/** Duração do giro (s): keyframes cobrem várias “voltas” antes da freada. */
const REEL_DURATION_NORMAL = 16
const REEL_DURATION_REDUCED = 2.35

/** Linhas comuns: branco / slate claro (padrão do painel). */
const REEL_STRIP_ROW_EVEN = 'border-b border-[#e2e8f0] bg-white text-[#0f172a]'
const REEL_STRIP_ROW_ODD = 'border-b border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a]'
/** Linha sorteada (atual): teal institucional (#0f766e). */
const REEL_WINNER_ROW_CLASSES =
  'border-b border-[#0f766e]/35 bg-[#ecfdf5] text-[#0f766e] font-bold shadow-[inset_0_0_0_1px_rgba(15,118,110,0.12)]'
/** Linha de escola já sorteada (permanece na faixa, não pode ser sorteada de novo). */
const REEL_HISTORICO_ROW_CLASSES =
  'border-b border-[#e2e8f0] bg-[#f1f5f9] text-[#64748b] font-medium'

/**
 * Reel: `reelY` persiste entre giros; `idleY` só anima em repouso.
 * Destaque do vencedor só após parar (alinha com a moldura central).
 */
function RoletaVirtual({
  reelY,
  strip,
  itemHeight,
  reducedMotion,
  onAnimationComplete,
  mode = 'idle',
  idleCycleLength = 0,
  historicoSorteadoIds = [],
}) {
  const idleY = useMotionValue(0)
  const ty = useTransform([reelY, idleY], ([r, i]) =>
    `translate3d(0, ${Number(r) + Number(i)}px, 0)`,
  )
  const completeRef = useRef(onAnimationComplete)
  const firedRef = useRef(false)
  const idleAnimRef = useRef(null)
  const spinAnimRef = useRef(null)
  const [winnerLanded, setWinnerLanded] = useState(false)

  const viewportH = itemHeight * REEL_VISIBLE_ROWS

  useLayoutEffect(() => {
    completeRef.current = onAnimationComplete
  }, [onAnimationComplete])

  useEffect(() => {
    if (mode === 'settled') {
      setWinnerLanded(true)
      return undefined
    }
    if (mode === 'idle') {
      setWinnerLanded(false)
    }
    return undefined
  }, [mode])

  useEffect(() => {
    if (mode !== 'spin' || strip.length === 0) return undefined

    if (idleAnimRef.current) {
      idleAnimRef.current.stop()
      idleAnimRef.current = null
    }
    /* Continuidade: o scroll do repouso vive em `idleY`; soma em `reelY` antes de zerar,
       para o próximo giro partir exatamente de onde a faixa parou visualmente. */
    const carryIdle = idleY.get()
    const snap = itemHeight
    const merged = reelY.get() + carryIdle
    reelY.set(Math.round(merged / snap) * snap)
    idleY.set(0)

    firedRef.current = false
    setWinnerLanded(false)

    const target = stripScrollTargetY(reelWinnerIndex(strip.length), itemHeight)
    const start = reelY.get()

    const fireOnce = () => {
      if (firedRef.current) return
      firedRef.current = true
      setWinnerLanded(true)
      completeRef.current?.()
    }

    const duration = reducedMotion ? REEL_DURATION_REDUCED : REEL_DURATION_NORMAL

    if (reducedMotion) {
      const controls = animate(reelY, target, {
        duration,
        ease: [0.25, 0.9, 0.35, 1],
        onComplete: fireOnce,
      })
      spinAnimRef.current = controls
      return () => {
        controls.stop()
        spinAnimRef.current = null
      }
    }

    const d = target - start
    const k1 = start + d * 0.58
    const k2 = start + d * 0.9
    const k3 = target

    const controls = animate(reelY, [start, k1, k2, k3], {
      duration,
      times: [0, 0.32, 0.62, 1],
      ease: ['linear', [0.22, 0.82, 0.28, 1], [0.12, 0.9, 0.2, 1]],
      onComplete: fireOnce,
    })
    spinAnimRef.current = controls
    return () => {
      controls.stop()
      spinAnimRef.current = null
    }
  }, [mode, strip, itemHeight, reducedMotion, reelY, idleY])

  useEffect(() => {
    if (mode !== 'idle' || strip.length === 0) {
      if (idleAnimRef.current) {
        idleAnimRef.current.stop()
        idleAnimRef.current = null
      }
      idleY.set(0)
      return undefined
    }
    if (reducedMotion || idleCycleLength <= 0) {
      idleY.set(0)
      return undefined
    }
    idleY.set(0)
    const cyclePx = itemHeight * idleCycleLength
    const controls = animate(idleY, -cyclePx, {
      duration: Math.max(26, idleCycleLength * 4),
      repeat: Infinity,
      ease: 'linear',
    })
    idleAnimRef.current = controls
    return () => {
      controls.stop()
      idleAnimRef.current = null
    }
  }, [mode, strip, itemHeight, reducedMotion, idleY, idleCycleLength])

  const historicoSet = useMemo(() => new Set(historicoSorteadoIds), [historicoSorteadoIds])

  if (strip.length === 0) return null

  const winnerIndex = mode === 'idle' ? -1 : reelWinnerIndex(strip.length)
  const winner = winnerIndex >= 0 ? strip[winnerIndex] : null

  const maskSoft = 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)'

  return (
    <div className="relative w-full">
      <div
        className="relative overflow-hidden rounded-xl border-2 border-[#e2e8f0] bg-white shadow-sm"
        style={{ height: viewportH }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f0fdfa]/50 via-transparent to-[#f8fafc]/90"
          aria-hidden
        />

        <div
          className="absolute inset-0 z-[12] overflow-hidden"
          style={{
            maskImage: maskSoft,
            WebkitMaskImage: maskSoft,
          }}
        >
          <Motion.div className="relative will-change-transform" style={{ transform: ty }}>
            {strip.map((eq, i) => {
              const isWinnerRow =
                winnerIndex >= 0 &&
                i === winnerIndex &&
                (mode === 'settled' || (mode === 'spin' && winnerLanded))
              const isHistoricoRow = !isWinnerRow && historicoSet.has(eq.id)
              const cycleClass = i % 2 === 0 ? REEL_STRIP_ROW_EVEN : REEL_STRIP_ROW_ODD
              const rowClass = isWinnerRow
                ? REEL_WINNER_ROW_CLASSES
                : isHistoricoRow
                  ? REEL_HISTORICO_ROW_CLASSES
                  : cycleClass
              const textColor = isWinnerRow ? '#0f766e' : isHistoricoRow ? '#64748b' : '#0f172a'
              return (
                <div
                  key={`reel-row-${i}-${eq.id}`}
                  className={[
                    'flex items-center justify-center border-b px-3 text-center text-sm font-semibold tracking-tight md:text-base',
                    rowClass,
                  ].join(' ')}
                  style={{ height: itemHeight }}
                >
                  <span className="max-w-[95%] truncate" style={{ color: textColor }}>
                    {eq.nome_escola}
                  </span>
                </div>
              )
            })}
          </Motion.div>
        </div>

        <div
          className="pointer-events-none absolute left-2 right-2 z-[11] rounded-lg border-[3px] border-[#0f766e] bg-transparent shadow-[0_4px_16px_rgba(15,118,110,0.14)] md:left-3 md:right-3"
          style={{ top: REEL_CENTER_ROW * itemHeight, height: itemHeight }}
          aria-hidden
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[13] h-[36%]"
          style={{
            backdropFilter: reducedMotion ? 'none' : 'blur(4px)',
            WebkitBackdropFilter: reducedMotion ? 'none' : 'blur(4px)',
            background: 'linear-gradient(to bottom, rgba(248,250,252,0.97) 0%, rgba(248,250,252,0.55) 45%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[13] h-[36%]"
          style={{
            backdropFilter: reducedMotion ? 'none' : 'blur(4px)',
            WebkitBackdropFilter: reducedMotion ? 'none' : 'blur(4px)',
            background: 'linear-gradient(to top, rgba(248,250,252,0.97) 0%, rgba(248,250,252,0.55) 45%, transparent 100%)',
            maskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 100%)',
          }}
          aria-hidden
        />
      </div>

      {(mode === 'spin' || mode === 'settled') && winner && (
        <span className="sr-only">Sorteado: {winner.nome_escola}</span>
      )}
    </div>
  )
}

/**
 * Etapa de sorteio de grupos com roleta ao vivo e arraste manual.
 */
export default function SorteioGruposAoVivo({ equipes, estrutura, onSalvar, salvando }) {
  const [grupos, setGrupos] = useState(() =>
    estrutura.tamanhos_grupos.map((tam, i) => ({
      nome: nomeGrupoLabel(i),
      slots: Array(tam).fill(null),
    }))
  )
  const [pool, setPool] = useState(equipes)
  const [busca, setBusca] = useState('')
  const [animating, setAnimating] = useState(false)
  const [rouletteStrip, setRouletteStrip] = useState([])
  const [historicoSorteadoIds, setHistoricoSorteadoIds] = useState([])
  const [highlightDest, setHighlightDest] = useState(null)
  const [lastRoleta, setLastRoleta] = useState(null)
  const reducedMotion = useReducedMotion()
  const reelY = useMotionValue(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const poolVazio = pool.length === 0
  const itemHeight = 56

  const pendingApplyRef = useRef(null)
  const dwellTimerRef = useRef(null)

  useEffect(
    () => () => {
      if (dwellTimerRef.current != null) {
        window.clearTimeout(dwellTimerRef.current)
        dwellTimerRef.current = null
      }
    },
    []
  )

  /** Após a animação da roleta, mantém o resultado visível (dwell) antes de aplicar no grupo. */
  const applyRoletaPlacement = useCallback(() => {
    if (!pendingApplyRef.current) return
    if (dwellTimerRef.current != null) {
      window.clearTimeout(dwellTimerRef.current)
      dwellTimerRef.current = null
    }

    const dwellMs = reducedMotion ? 1200 : 2400

    dwellTimerRef.current = window.setTimeout(() => {
      dwellTimerRef.current = null
      const pending = pendingApplyRef.current
      if (!pending) return
      pendingApplyRef.current = null
      const { equipe, gi, si } = pending
      setGrupos((prev) => {
        const next = prev.map((g) => ({ ...g, slots: [...g.slots] }))
        next[gi].slots[si] = equipe
        return next
      })
      setLastRoleta({ equipe, gi, si })
      setHistoricoSorteadoIds((prev) => (prev.includes(equipe.id) ? prev : [...prev, equipe.id]))
      setHighlightDest(null)
      setAnimating(false)
    }, dwellMs)
  }, [reducedMotion])

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

    const equipeId = parseInt(String(active.id).replace('equipe-', ''), 10)
    const destId = String(over.id)
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
      setLastRoleta(null)
      return
    }

    const parts = destId.split('-')
    const destGi = parseInt(parts[1], 10)
    const destSi = parseInt(parts[2], 10)
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
    setLastRoleta(null)
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
    setLastRoleta(null)
  }

  function handleSalvar() {
    const payload = grupos.map((g) => ({ equipes: g.slots.map((e) => e.id) }))
    onSalvar(payload)
  }

  function handleSortearProximo() {
    if (animating || pool.length === 0) return
    const dest = destinoRodizio(grupos)
    if (!dest) return
    const equipe = pickRandomEquipe(pool)
    if (!equipe) return

    pendingApplyRef.current = { equipe, gi: dest.gi, si: dest.si }
    setHighlightDest({ gi: dest.gi, si: dest.si, nomeGrupo: nomeGrupoLabel(dest.gi), slotOrd: dest.si + 1 })

    const appendDecoys = 52
    const firstSpinDecoys = 78
    let strip
    if (rouletteStrip.length > 0) {
      const mid = []
      const poolDecoy = pool.filter((e) => e.id !== equipe.id)
      const pickFrom = poolDecoy.length > 0 ? poolDecoy : pool
      for (let i = 0; i < appendDecoys; i += 1) {
        mid.push(pickFrom[Math.floor(Math.random() * pickFrom.length)])
      }
      const tail = []
      for (let t = 0; t < REEL_TAIL_ROW_COUNT; t += 1) {
        tail.push(pickFrom[Math.floor(Math.random() * pickFrom.length)])
      }
      strip = [...rouletteStrip, ...mid, equipe, ...tail]
    } else {
      strip = buildRouletteStrip(pool, equipe, firstSpinDecoys)
    }
    setPool((prev) => prev.filter((e) => e.id !== equipe.id))
    setRouletteStrip(strip)
    setAnimating(true)
  }

  function handleDesfazerRoleta() {
    if (!lastRoleta || animating) return
    const { equipe, gi, si } = lastRoleta
    setGrupos((prev) => {
      const next = prev.map((g) => ({ ...g, slots: [...g.slots] }))
      if (next[gi]?.slots[si]?.id !== equipe.id) return prev
      next[gi].slots[si] = null
      return next
    })
    setPool((prev) => [...prev, equipe])
    setLastRoleta(null)
    setRouletteStrip([])
    setHistoricoSorteadoIds([])
    reelY.set(0)
  }

  const poolFiltrado = useMemo(
    () => pool.filter((e) => e.nome_escola.toLowerCase().includes(busca.toLowerCase())),
    [pool, busca]
  )

  const idleStrip = useMemo(() => buildIdleStrip(pool), [pool])

  const reelMode = useMemo(() => {
    if (animating) return 'spin'
    if (rouletteStrip.length > 0) return 'settled'
    return 'idle'
  }, [animating, rouletteStrip.length])

  const displayStrip = useMemo(
    () => (rouletteStrip.length > 0 ? rouletteStrip : idleStrip),
    [rouletteStrip, idleStrip],
  )

  const tituloDestaque = highlightDest
    ? `Grupo ${highlightDest.nomeGrupo} · posição ${highlightDest.slotOrd}`
    : null

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 rounded-2xl bg-[#fafafa] p-4 md:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="min-w-0 flex-1">
            <p className="mb-3 text-sm font-semibold text-[#334155]">
              Grupos ({grupos.length}) — arraste para ajustar
            </p>
            <div className="grid min-w-0 grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {grupos.map((grupo, gi) => {
                const isGrupoDaVez = highlightDest != null && highlightDest.gi === gi
                return (
                  <div
                    key={grupo.nome}
                    className={[
                      'flex min-w-0 flex-col gap-2 rounded-xl p-2 transition-all duration-200',
                      isGrupoDaVez
                        ? 'border-2 border-[#059669] bg-gradient-to-b from-[#d1fae5] via-[#ecfdf5] to-[#ccfbf1] shadow-[0_10px_32px_-8px_rgba(5,150,105,0.4)] ring-2 ring-[#10b981]/60 ring-offset-2 ring-offset-[#fafafa]'
                        : 'border-2 border-transparent',
                    ].join(' ')}
                    aria-current={isGrupoDaVez ? 'step' : undefined}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          'rounded px-2 py-0.5 text-xs font-bold text-white shadow-sm',
                          isGrupoDaVez ? 'bg-[#047857] px-2.5 py-1 shadow-md' : 'bg-[#0f766e]',
                        ].join(' ')}
                      >
                        Grupo {grupo.nome}
                      </span>
                      {isGrupoDaVez && (
                        <span className="rounded-full bg-[#10b981] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                          Da vez
                        </span>
                      )}
                      <span className="text-xs text-[#94a3b8]">
                        {grupo.slots.filter(Boolean).length}/{grupo.slots.length}
                      </span>
                    </div>
                    {grupo.slots.map((equipe, si) => (
                      <DroppableSlotSorteio
                        key={si}
                        grupoIdx={gi}
                        slotIdx={si}
                        equipe={equipe}
                        isSorteioSlotAlvo={
                          highlightDest != null && highlightDest.gi === gi && highlightDest.si === si
                        }
                        onRemove={() => handleRemoveFromSlot(gi, si)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {pool.length > 0 && (
            <aside className="flex w-full shrink-0 flex-col items-stretch gap-4 lg:sticky lg:top-4 lg:w-[min(22rem,100%)] lg:self-start">
              {tituloDestaque && (
                <p className="m-0 w-full text-center text-lg font-bold text-[#0f766e] md:text-xl">
                  {tituloDestaque}
                </p>
              )}
              <RoletaVirtual
                reelY={reelY}
                strip={displayStrip}
                mode={reelMode}
                idleCycleLength={pool.length}
                itemHeight={itemHeight}
                reducedMotion={!!reducedMotion}
                historicoSorteadoIds={historicoSorteadoIds}
                onAnimationComplete={applyRoletaPlacement}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                <Button
                  type="primary"
                  size="large"
                  icon={<Play size={18} />}
                  disabled={pool.length === 0 || animating}
                  onClick={handleSortearProximo}
                  style={{ backgroundColor: '#0f766e', borderColor: '#0f766e' }}
                >
                  Girar sorteio
                </Button>
                <Button
                  size="large"
                  icon={<Undo2 size={16} />}
                  disabled={!lastRoleta || animating}
                  onClick={handleDesfazerRoleta}
                >
                  Desfazer último sorteio
                </Button>
              </div>
            </aside>
          )}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Buscar escola..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-48 rounded-lg border border-[#e2e8f0] bg-white py-1 pl-7 pr-3 text-xs text-[#1e293b] placeholder-[#94a3b8] transition-colors focus:border-[#0f766e] focus:outline-none"
                />
              </div>
            )}
          </div>
          <DroppablePoolSorteio pool={poolFiltrado} totalPool={pool.length} />
        </div>

        <div className="flex justify-end border-t border-[#e2e8f0] pt-2">
          <Button
            type="primary"
            size="large"
            disabled={!poolVazio}
            loading={salvando}
            onClick={handleSalvar}
            style={{ backgroundColor: '#0f766e', borderColor: '#0f766e' }}
          >
            {poolVazio ? 'Salvar Campeonato' : `Alocar ${pool.length} equipe${pool.length !== 1 ? 's' : ''} restante${pool.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </DndContext>
  )
}
