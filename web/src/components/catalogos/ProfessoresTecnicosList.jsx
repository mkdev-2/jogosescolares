import { useState } from 'react'
import { Users, Search, Plus } from 'lucide-react'
import { professoresTecnicosService } from '../../services/professoresTecnicosService'

export default function ProfessoresTecnicosList({ lista = [], loading, error, onNewProfessor }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLista = lista.filter((item) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const nome = (item.nome || '').toLowerCase()
    const cpf = (item.cpf || '').replace(/\D/g, '')
    const cpfSearch = searchTerm.replace(/\D/g, '')
    const cref = (item.cref || '').toLowerCase()
    return (
      nome.includes(term) ||
      (cpfSearch && cpf.includes(cpfSearch)) ||
      cref.includes(term)
    )
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">
              Total de Professores-Técnicos
            </p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">
              {lista.length}
            </p>
          </div>
          <Users size={28} className="text-[#0f766e]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou CREF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e2e8f0] rounded-[10px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
          />
        </div>
        {onNewProfessor && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
            onClick={onNewProfessor}
          >
            <Plus size={18} className="shrink-0" />
            Novo professor-técnico
          </button>
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
                Nenhum professor-técnico encontrado
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {searchTerm
                  ? 'Tente ajustar o termo de busca'
                  : 'Comece cadastrando um novo professor-técnico'}
              </p>
              {onNewProfessor && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
                  onClick={onNewProfessor}
                >
                  <Plus size={18} className="shrink-0" />
                  Cadastrar professor-técnico
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse min-w-[400px]">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Nome
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      CPF
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      CREF
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLista.map((item) => (
                    <tr key={item.id ?? item.cpf ?? item.nome} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-4 text-[0.9375rem] font-semibold text-[#042f2e] border-b border-[#f1f5f9]">
                        {item.nome}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] font-mono border-b border-[#f1f5f9]">
                        {professoresTecnicosService.formatCpf(item.cpf)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {item.cref || '-'}
                      </td>
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
