import { useState, useMemo } from 'react'
import { Trophy, Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { Popconfirm, Input, Button, Select, Switch } from 'antd'
import ModalidadeIcon from './ModalidadeIcon'

export default function EsportesList({
  variantes = [],
  loading = false,
  error = null,
  fetchVariantes,
  deleteVariante,
  deleteEsporte,
  onNewEsporte,
  onEditVariante,
  emptyMessageDiretor,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState(null)
  const [filtroNaipe, setFiltroNaipe] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState(null)
  const [exibirUnicos, setExibirUnicos] = useState(true)

  const opcoesCategoria = useMemo(() => {
    const map = new Map()
    variantes.forEach((v) => {
      if (v.categoria_id && v.categoria_nome) map.set(v.categoria_id, v.categoria_nome)
    })
    return Array.from(map.entries()).map(([id, nome]) => ({ value: id, label: nome })).sort((a, b) => a.label.localeCompare(b.label))
  }, [variantes])

  const opcoesNaipe = useMemo(() => {
    const map = new Map()
    variantes.forEach((v) => {
      if (v.naipe_id && v.naipe_nome) map.set(v.naipe_id, v.naipe_nome)
    })
    return Array.from(map.entries()).map(([id, nome]) => ({ value: id, label: nome })).sort((a, b) => a.label.localeCompare(b.label))
  }, [variantes])

  const opcoesTipo = useMemo(() => {
    const map = new Map()
    variantes.forEach((v) => {
      if (v.tipo_modalidade_id && v.tipo_modalidade_nome) map.set(v.tipo_modalidade_id, v.tipo_modalidade_nome)
    })
    return Array.from(map.entries()).map(([id, nome]) => ({ value: id, label: nome })).sort((a, b) => a.label.localeCompare(b.label))
  }, [variantes])

  const filteredVariantes = variantes.filter((v) => {
    const term = searchTerm.toLowerCase()
    const matchSearch = !searchTerm ||
      v.esporte_nome?.toLowerCase().includes(term) ||
      v.categoria_nome?.toLowerCase().includes(term) ||
      v.naipe_nome?.toLowerCase().includes(term) ||
      v.tipo_modalidade_nome?.toLowerCase().includes(term)
    const matchCategoria = !filtroCategoria || v.categoria_id === filtroCategoria
    const matchNaipe = !filtroNaipe || v.naipe_id === filtroNaipe
    const matchTipo = !filtroTipo || v.tipo_modalidade_id === filtroTipo
    return matchSearch && matchCategoria && matchNaipe && matchTipo
  })

  const totalEsportes = useMemo(() => {
    const ids = new Set(filteredVariantes.map((v) => v.esporte_id).filter(Boolean))
    return ids.size
  }, [filteredVariantes])

  const variantesParaExibir = useMemo(() => {
    if (!exibirUnicos) return filteredVariantes
    const seen = new Set()
    return filteredVariantes.filter((v) => {
      if (seen.has(v.esporte_id)) return false
      seen.add(v.esporte_id)
      return true
    })
  }, [filteredVariantes, exibirUnicos])

  const handleDelete = async (v, isEsporteUnico = false) => {
    try {
      if (isEsporteUnico && deleteEsporte) {
        await deleteEsporte(v.esporte_id)
      } else {
        await deleteVariante(v.id)
      }
      fetchVariantes?.()
    } catch (err) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  const getCategoriaBadge = (nome) => {
    if (!nome) return null
    const m = nome.match(/(\d+)\s*a\s*(\d+)/)
    const label = m ? `${m[1]} a ${m[2]}` : nome
    const is1214 = m && m[1] === '12' && m[2] === '14'
    const is1517 = m && m[1] === '15' && m[2] === '17'
    const className = is1214
      ? 'bg-[#f3e8ff] text-[#6b21a8]'
      : is1517
        ? 'bg-[#fee2e2] text-[#b91c1c]'
        : 'bg-[#f1f5f9] text-[#64748b]'
    return { label, className }
  }

  const getNaipeBadge = (nome) => {
    if (!nome) return null
    const label = nome === 'MASCULINO' ? 'Masculino' : nome === 'FEMININO' ? 'Feminino' : nome
    const className = nome === 'MASCULINO'
      ? 'bg-[#dbeafe] text-[#1d4ed8]'
      : nome === 'FEMININO'
        ? 'bg-[#fce7f3] text-[#9d174d]'
        : 'bg-[#f1f5f9] text-[#64748b]'
    return { label, className }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">Total de Variantes</p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">{filteredVariantes.length}</p>
          </div>
          <Trophy size={28} className="text-[#0f766e]" />
        </div>
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">Total de Esportes</p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">{totalEsportes}</p>
          </div>
          <Trophy size={28} className="text-[#0f766e]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por esporte, categoria, naipe ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<Search size={18} className="text-[#64748b]" />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            placeholder="Categoria"
            allowClear
            value={filtroCategoria || undefined}
            onChange={(v) => setFiltroCategoria(v ?? null)}
            options={opcoesCategoria}
            className="min-w-[140px]"
          />
          <Select
            placeholder="Naipe"
            allowClear
            value={filtroNaipe || undefined}
            onChange={(v) => setFiltroNaipe(v ?? null)}
            options={opcoesNaipe}
            className="min-w-[120px]"
          />
          <Select
            placeholder="Tipo"
            allowClear
            value={filtroTipo || undefined}
            onChange={(v) => setFiltroTipo(v ?? null)}
            options={opcoesTipo}
            className="min-w-[130px]"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={!exibirUnicos}
            onChange={(checked) => setExibirUnicos(!checked)}
          />
          <span className="text-[0.875rem] text-[#64748b] whitespace-nowrap">
            {exibirUnicos ? 'Esportes únicos' : 'Todas as variantes'}
          </span>
        </div>
        {onNewEsporte && (
          <Button type="primary" onClick={onNewEsporte} icon={<Plus size={18} />}>
            Novo Esporte
          </Button>
        )}
      </div>

      {error && (
        <div className="px-4 py-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-[10px]">
          <p className="m-0">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-[#64748b]">
          <div className="w-10 h-10 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
          <p className="m-0">Carregando...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {variantesParaExibir.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                {exibirUnicos ? 'Nenhum esporte encontrado' : 'Nenhuma variante encontrada'}
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {emptyMessageDiretor
                  ? 'Sua escola ainda não possui modalidades vinculadas.'
                  : (searchTerm || filtroCategoria || filtroNaipe || filtroTipo)
                    ? 'Tente ajustar os filtros de busca'
                    : 'Crie um novo esporte para gerar variantes automaticamente'}
              </p>
              {onNewEsporte && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95"
                  onClick={onNewEsporte}
                >
                  <Plus size={18} className="shrink-0" />
                  Novo Esporte
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Nome
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Máx. Atletas
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Requisitos
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Status
                    </th>
                    <th className="w-[100px] text-right px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variantesParaExibir.map((v) => {
                    const catBadge = getCategoriaBadge(v.categoria_nome)
                    const naipeBadge = getNaipeBadge(v.naipe_nome)
                    const isEsporteUnico = exibirUnicos
                    return (
                    <tr key={exibirUnicos ? v.esporte_id : v.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span className="font-semibold text-[#042f2e] flex items-center gap-2">
                          <ModalidadeIcon icone={v.esporte_icone} size={18} className="text-[#0f766e] shrink-0" />
                          {v.esporte_nome}
                          {exibirUnicos && (
                            <span className="inline-block px-2 py-0.5 rounded-[6px] text-[0.75rem] font-medium bg-[#f1f5f9] text-[#64748b]">
                              {filteredVariantes.filter((x) => x.esporte_id === v.esporte_id).length} variante(s)
                            </span>
                          )}
                          {!exibirUnicos && (
                          <span className="inline-flex gap-1.5 flex-wrap">
                            {catBadge && (
                              <span className={`inline-block px-2 py-0.5 rounded-[6px] text-[0.75rem] font-medium ${catBadge.className}`}>
                                {catBadge.label}
                              </span>
                            )}
                            {naipeBadge && (
                              <span className={`inline-block px-2 py-0.5 rounded-[6px] text-[0.75rem] font-medium ${naipeBadge.className}`}>
                                {naipeBadge.label}
                              </span>
                            )}
                          </span>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {v.esporte_limite_atletas ?? '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span className="block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {v.esporte_requisitos || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span
                          className={`inline-block px-2 py-1 rounded-[6px] text-[0.8125rem] font-medium ${
                            v.esporte_ativa
                              ? 'bg-[#ccfbf1] text-[#0f766e]'
                              : 'bg-[#f1f5f9] text-[#64748b]'
                          }`}
                        >
                          {v.esporte_ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right border-b border-[#f1f5f9]">
                        <div className="flex justify-end gap-2">
                          {onEditVariante && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9]"
                              onClick={() => onEditVariante(v)}
                              title="Editar esporte"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          {(isEsporteUnico ? deleteEsporte : deleteVariante) && (
                          <Popconfirm
                            title={isEsporteUnico ? 'Excluir esporte' : 'Excluir variante'}
                            description={isEsporteUnico
                              ? `Excluir o esporte "${v.esporte_nome}" e todas as suas variantes?`
                              : `Excluir "${v.esporte_nome} • ${v.categoria_nome} • ${v.naipe_nome}"?`}
                            onConfirm={() => handleDelete(v, isEsporteUnico)}
                            okText="Sim, excluir"
                            cancelText="Cancelar"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                              title={isEsporteUnico ? 'Excluir esporte' : 'Excluir variante'}
                            >
                              <Trash2 size={18} />
                            </button>
                          </Popconfirm>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
