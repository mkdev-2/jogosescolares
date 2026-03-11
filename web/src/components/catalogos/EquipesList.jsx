import { useState } from 'react'
import { Users, Search, Plus, Trophy, Pencil, Trash2, FileText } from 'lucide-react'
import { Input, Button, Popconfirm, Select } from 'antd'
import ModalidadeIcon from './ModalidadeIcon'

export default function EquipesList({
  lista = [],
  loading,
  error,
  onNewEquipe,
  onEditEquipe,
  onDeleteEquipe,
  onViewEquipe,
  onFichaColetiva,
  showInstituicao = false,
  escolas = [],
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [escolaFilterId, setEscolaFilterId] = useState(null)

  const filteredByEscola = escolaFilterId != null && escolaFilterId !== ''
    ? lista.filter((item) => Number(item.escola_id) === Number(escolaFilterId))
    : lista

  const filteredLista = filteredByEscola.filter((item) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const esporte = (item.esporte_nome || '').toLowerCase()
    const categoria = (item.categoria_nome || '').toLowerCase()
    const naipe = (item.naipe_nome || '').toLowerCase()
    const tecnico = (item.professor_tecnico_nome || item.professor_tecnico?.nome || '').toLowerCase()
    const instituicao = (item.escola_nome || '').toLowerCase()
    return (
      esporte.includes(term) ||
      categoria.includes(term) ||
      naipe.includes(term) ||
      tecnico.includes(term) ||
      (showInstituicao && instituicao.includes(term))
    )
  })

  const getEsporteNome = (item) => item.esporte_nome || '-'
  const getEsporteIcone = (item) => item.esporte_icone || 'Zap'
  const getCategoriaNome = (item) => item.categoria_nome || '-'
  const getNaipeNome = (item) => item.naipe_nome || '-'
  const getTecnicoNome = (item) => item.professor_tecnico_nome || item.professor_tecnico?.nome || '-'
  const getQtdAlunos = (item) => (item.estudantes && item.estudantes.length) || item.estudante_ids?.length || 0

  const isModalidadeColetiva = (item) => {
    const codigo = String(item.tipo_modalidade_codigo || '').trim().toUpperCase()
    const nome = String(item.tipo_modalidade_nome || '').trim().toUpperCase()
    return codigo === 'COLETIVAS' || nome === 'COLETIVAS'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">
              Total de Equipes
            </p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">
              {escolaFilterId != null && escolaFilterId !== '' ? filteredLista.length : lista.length}
            </p>
          </div>
          <Trophy size={28} className="text-[#0f766e]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {showInstituicao && escolas?.length > 0 && (
          <Select
            placeholder="Filtrar por escola"
            allowClear
            value={escolaFilterId ?? undefined}
            onChange={(v) => setEscolaFilterId(v ?? null)}
            options={[
              { value: '', label: 'Todas as escolas' },
              ...escolas.map((e) => ({ value: e.id, label: e.nome_escola || `Escola ${e.id}` })),
            ]}
            className="min-w-[220px]"
          />
        )}
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por esporte, categoria, naipe ou técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<Search size={18} className="text-[#64748b]" />}
          />
        </div>
        {onNewEquipe && (
          <Button type="primary" onClick={onNewEquipe} icon={<Plus size={16} />}>
            Nova equipe
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
          {filteredLista.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                Nenhuma equipe encontrada
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {searchTerm
                  ? 'Tente ajustar o termo de busca'
                  : 'Monte sua primeira equipe selecionando variante, alunos e técnico'}
              </p>
              {onNewEquipe && (
                <Button type="primary" onClick={onNewEquipe} icon={<Plus size={16} />}>
                  Nova equipe
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse min-w-[500px]">
                <thead>
                  <tr>
                    {showInstituicao && (
                      <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                        Instituição
                      </th>
                    )}
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Esporte
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Categoria / Naipe / Tipo
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Técnico
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Alunos
                    </th>
                    {onFichaColetiva && (
                      <th className="w-[80px] text-center px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                        Ficha
                      </th>
                    )}
                    {(onEditEquipe || onDeleteEquipe) && (
                      <th className="w-[100px] text-right px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredLista.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#f8fafc] ${onViewEquipe ? 'cursor-pointer' : ''}`}
                      onClick={() => onViewEquipe?.(item)}
                    >
                      {showInstituicao && (
                        <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                          {item.escola_nome || '-'}
                        </td>
                      )}
                      <td className="px-5 py-4 text-[0.9375rem] font-semibold text-[#042f2e] border-b border-[#f1f5f9]">
                        <span className="inline-flex items-center gap-2">
                          <ModalidadeIcon icone={getEsporteIcone(item)} size={18} className="text-[#0f766e] shrink-0" />
                          {getEsporteNome(item)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {getCategoriaNome(item)} • {getNaipeNome(item)} • {item.tipo_modalidade_nome || '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {getTecnicoNome(item)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {getQtdAlunos(item)} aluno(s)
                      </td>
                      {onFichaColetiva && (
                        <td
                          className="px-5 py-4 text-center border-b border-[#f1f5f9]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isModalidadeColetiva(item) ? (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9]"
                              onClick={() => onFichaColetiva(item)}
                              title="Gerar Ficha Coletiva JELS"
                            >
                              <FileText size={18} />
                            </button>
                          ) : (
                            <span className="text-[#cbd5e1]">–</span>
                          )}
                        </td>
                      )}
                      {(onEditEquipe || onDeleteEquipe) && (
                        <td
                          className="px-5 py-4 text-right border-b border-[#f1f5f9]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-2">
                            {onEditEquipe && (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9]"
                                onClick={() => onEditEquipe(item)}
                                title="Editar equipe"
                              >
                                <Pencil size={18} />
                              </button>
                            )}
                            {onDeleteEquipe && (
                              <Popconfirm
                                title="Excluir equipe"
                                description={`Excluir a equipe "${getEsporteNome(item)} • ${getCategoriaNome(item)} • ${getNaipeNome(item)}"?`}
                                onConfirm={() => onDeleteEquipe(item)}
                                okText="Sim, excluir"
                                cancelText="Cancelar"
                                okButtonProps={{ danger: true }}
                              >
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                                  title="Excluir equipe"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </Popconfirm>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
