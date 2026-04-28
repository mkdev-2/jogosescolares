import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Checkbox, Modal, Select, Spin, Tag, message } from 'antd'
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

  const [equipes, setEquipes] = useState([])
  const [loadingEquipes, setLoadingEquipes] = useState(false)
  const [confirmacaoOpen, setConfirmacaoOpen] = useState(false)
  const [selecionadas, setSelecionadas] = useState([])

  const [etapa, setEtapa] = useState('selecao') // 'selecao' | 'sorteio'
  const [equipesSorteio, setEquipesSorteio] = useState([])
  const [estrutura, setEstrutura] = useState(null)

  const [salvando, setSalvando] = useState(false)
  const [diretoDlg, setDiretoDlg] = useState({ open: false, equipes: [], estrutura: null })

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

  // Filtra apenas COLETIVAS sem campeonato existente
  const variantesFiltradas = useMemo(() => {
    const idsComCampeonato = new Set(campeonatosExistentes.map((c) => c.esporte_variante_id))
    return variantes.filter(
      (v) =>
        v.tipo_modalidade_nome === 'COLETIVAS' &&
        !idsComCampeonato.has(v.id) &&
        (!edicaoId || v.edicao_id === edicaoId)
    )
  }, [variantes, campeonatosExistentes, edicaoId])

  const varianteLabel = useCallback(
    (v) => [v.esporte_nome, v.categoria_nome, v.naipe_nome].filter(Boolean).join(' – '),
    []
  )

  async function handleBuscarEquipes() {
    if (!varianteId) return
    setLoadingEquipes(true)
    try {
      const data = await campeonatosService.getEquipesDaVariante(varianteId, edicaoId)
      setEquipes(data)
      setSelecionadas(data.map((e) => e.id))
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
              : 'Modalidades coletivas · Sorteio manual de grupos'}
          </p>
        </div>
      </div>

      {etapa === 'selecao' && (
        <div className="flex flex-col gap-4 max-w-lg">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#374151]">Edição</label>
              <Select
                placeholder="Selecione a edição (opcional)"
                allowClear
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
                placeholder="Selecione a modalidade coletiva"
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
                    Nenhuma modalidade coletiva disponível
                  </span>
                }
              />
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            loading={loadingEquipes}
            disabled={!varianteId}
            onClick={handleBuscarEquipes}
            className="self-start"
          >
            Buscar equipes
          </Button>
        </div>
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
              onClick={handleConfirmar}
            >
              Confirmar e sortear
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
