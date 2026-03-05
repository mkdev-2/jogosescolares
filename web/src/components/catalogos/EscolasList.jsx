import { useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { Input } from 'antd'
import { escolasService } from '../../services/escolasService'

function formatDate(str) {
  if (!str) return '-'
  try {
    const d = new Date(str)
    return d.toLocaleDateString('pt-BR')
  } catch {
    return str
  }
}

export default function EscolasList({ lista = [], loading, error }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLista = lista.filter((item) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const nome = (item.nome_escola || '').toLowerCase()
    const cidade = (item.cidade || '').toLowerCase()
    const email = (item.email || '').toLowerCase()
    const inep = (item.inep || '').replace(/\D/g, '')
    const cnpj = (item.cnpj || '').replace(/\D/g, '')
    const searchDigits = searchTerm.replace(/\D/g, '')
    return (
      nome.includes(term) ||
      cidade.includes(term) ||
      email.includes(term) ||
      (searchDigits && inep.includes(searchDigits)) ||
      (searchDigits && cnpj.includes(searchDigits))
    )
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">
              Total de Escolas
            </p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">
              {lista.length}
            </p>
          </div>
          <Building2 size={28} className="text-[#0f766e]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por nome, cidade, e-mail, INEP ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<Search size={18} className="text-[#64748b]" />}
          />
        </div>
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
                Nenhuma escola encontrada
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0">
                {searchTerm
                  ? 'Tente ajustar o termo de busca'
                  : 'Nenhuma escola cadastrada no sistema'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Nome
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      INEP
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      CNPJ
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Cidade / UF
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      E-mail
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Telefone
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Cadastrado em
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLista.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-4 text-[0.9375rem] font-semibold text-[#042f2e] border-b border-[#f1f5f9]">
                        {item.nome_escola || '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] font-mono border-b border-[#f1f5f9]">
                        {item.inep || '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] font-mono border-b border-[#f1f5f9]">
                        {escolasService.formatCnpj(item.cnpj)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {[item.cidade, item.uf].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {item.email || '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] font-mono border-b border-[#f1f5f9]">
                        {escolasService.formatTelefone(item.telefone)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {formatDate(item.created_at)}
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
