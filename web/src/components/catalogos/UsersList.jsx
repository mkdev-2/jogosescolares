import { useState, useEffect } from 'react'
import { Users, Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { Popconfirm } from 'antd'
import useUsers from '../../hooks/useUsers'
import { usersService } from '../../services/usersService'
import { escolasService } from '../../services/escolasService'

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  DIRETOR: 'Diretor',
  COORDENADOR: 'Coordenador',
  MESARIO: 'Mesário',
}

export default function UsersList({ currentUser, onNewUser, onEditUser }) {
  const { users, loading, error, fetchUsers, deleteUser } = useUsers()
  const [searchTerm, setSearchTerm] = useState('')
  const [escolasMap, setEscolasMap] = useState({})

  useEffect(() => {
    escolasService.list().then((list) => {
      const map = {}
      list.forEach((e) => { map[e.id] = e.nome_escola })
      setEscolasMap(map)
    }).catch(() => setEscolasMap({}))
  }, [])

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !searchTerm ||
      u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.cpf && u.cpf.includes(searchTerm.replace(/\D/g, '')))
    return matchSearch
  })

  const handleDelete = async (user) => {
    try {
      await deleteUser(user.id)
    } catch (err) {
      alert(err.message || 'Erro ao excluir')
    }
  }

  const canCreate = currentUser?.can_create_users ?? false
  const isDiretor = currentUser?.role === 'DIRETOR'
  const maxPerEscola = currentUser?.max_users_per_escola ?? 3
  const usersInSchool = isDiretor ? users.filter((u) => u.escola_id === currentUser?.escola_id) : []

  return (
    <div className="flex flex-col gap-6">
      {isDiretor && (
        <div className="px-4 py-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] rounded-[10px] text-sm">
          <strong>Limite por escola:</strong> Sua escola pode ter no máximo {maxPerEscola} usuários (1 diretor + 2 coordenadores).
          Atualmente: {usersInSchool.length} de {maxPerEscola}.
        </div>
      )}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        <div className="flex items-center justify-between px-5 py-5 bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-[0.875rem] text-[#64748b] m-0 mb-1">
              Total de Usuários
            </p>
            <p className="text-[1.5rem] font-bold text-[#042f2e] m-0">
              {users.length}
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
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e2e8f0] rounded-[10px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
          />
        </div>
        {canCreate && onNewUser && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
            onClick={onNewUser}
          >
            <Plus size={18} className="shrink-0" />
            Novo Usuário
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
          {filteredUsers.length === 0 ? (
            <div className="text-center px-8 py-12 bg-white rounded-[12px] border border-dashed border-[#e2e8f0]">
              <p className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-2">
                Nenhum usuário encontrado
              </p>
              <p className="text-[0.9375rem] text-[#64748b] m-0 mb-5">
                {searchTerm
                  ? 'Tente ajustar o termo de busca'
                  : canCreate ? 'Comece criando um novo usuário' : 'Nenhum usuário vinculado à sua escola'}
              </p>
              {canCreate && onNewUser && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white hover:opacity-95 hover:-translate-y-px transition-transform"
                  onClick={onNewUser}
                >
                  <Plus size={18} className="shrink-0" />
                  Criar Usuário
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
                      CPF
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      E-mail
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Perfil
                    </th>
                    <th className="text-left px-5 py-4 text-[0.8125rem] font-semibold text-[#64748b] uppercase tracking-[0.05em] bg-[#f8fafc] border-b border-[#e2e8f0]">
                      Escola
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
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-4 text-[0.9375rem] font-semibold text-[#042f2e] border-b border-[#f1f5f9]">
                        {u.nome}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] font-mono border-b border-[#f1f5f9]">
                        {usersService.formatCpf(u.cpf)}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {u.email || '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span className="inline-block px-2 py-1 rounded-[6px] text-[0.8125rem] font-medium bg-[#e2e8f0] text-[#475569]">
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        {u.escola_id ? (escolasMap[u.escola_id] || `ID ${u.escola_id}`) : '-'}
                      </td>
                      <td className="px-5 py-4 text-[0.9375rem] text-[#334155] border-b border-[#f1f5f9]">
                        <span
                          className={`inline-block px-2 py-1 rounded-[6px] text-[0.8125rem] font-medium ${
                            u.status === 'ATIVO'
                              ? 'bg-[#ccfbf1] text-[#0f766e]'
                              : 'bg-[#f1f5f9] text-[#64748b]'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right border-b border-[#f1f5f9]">
                        <div className="flex justify-end gap-2">
                          {onEditUser && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9]"
                              onClick={() => onEditUser(u)}
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          <Popconfirm
                            title="Excluir usuário"
                            description={`Tem certeza que deseja excluir o usuário "${u.nome}"?`}
                            onConfirm={() => handleDelete(u)}
                            okText="Sim, excluir"
                            cancelText="Cancelar"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center p-1.5 rounded-[6px] border-0 text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </Popconfirm>
                        </div>
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
