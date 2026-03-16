import { useState, useEffect } from 'react'
import { Building2, User, Users, GraduationCap, UserCircle, Trophy } from 'lucide-react'
import Modal from '../ui/Modal'
import { escolasService } from '../../services/escolasService'
import { usersService } from '../../services/usersService'

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{label}</span>
    <span className="text-[0.9375rem] text-[#334155]">{value ?? '-'}</span>
  </div>
)

function formatDate(str) {
  if (!str) return '-'
  try {
    const d = new Date(str)
    return d.toLocaleDateString('pt-BR')
  } catch {
    return str
  }
}

const ROLE_LABEL = {
  DIRETOR: 'Diretor',
  COORDENADOR: 'Coordenador',
  MESARIO: 'Mesário',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Administrador',
}

export default function EscolaViewModal({ open, onClose, escolaId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dados, setDados] = useState(null)

  useEffect(() => {
    if (!open || !escolaId) {
      setDados(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    escolasService
      .getDetalhes(escolaId)
      .then((res) => {
        setDados(res)
      })
      .catch((err) => {
        setError(err?.message || 'Erro ao carregar detalhes')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, escolaId])

  if (!open) return null

  const escola = dados?.escola

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={escola?.nome_escola || 'Escola'}
      subtitle="Dados completos da instituição"
      titleLeft={
        <div className="w-14 h-14 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0">
          <Building2 size={28} className="text-[#94a3b8]" />
        </div>
      }
      size="xl"
      footer={
        <button
          type="button"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
          onClick={onClose}
        >
          Fechar
        </button>
      }
    >
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-[#64748b]">
          <div className="w-10 h-10 border-[3px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
          <p className="m-0">Carregando...</p>
        </div>
      )}

      {error && (
        <div className="px-4 py-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-[10px]">
          <p className="m-0">{error}</p>
        </div>
      )}

      {!loading && !error && dados && (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">Dados da Escola</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Nome" value={escola?.nome_escola} />
              <InfoRow label="INEP" value={escola?.inep} />
              <InfoRow label="CNPJ" value={escolasService.formatCnpj(escola?.cnpj)} />
              <InfoRow label="E-mail" value={escola?.email} />
              <InfoRow label="Telefone" value={escolasService.formatTelefone(escola?.telefone)} />
              <InfoRow label="Endereço" value={escola?.endereco} />
              <InfoRow label="Cidade / UF" value={[escola?.cidade, escola?.uf].filter(Boolean).join(' / ')} />
              <InfoRow label="Cadastrado em" value={formatDate(escola?.created_at)} />
            </div>
          </div>

          <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">Diretor</h3>
            </div>
            {dados.diretor ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Nome" value={dados.diretor.nome} />
                <InfoRow label="CPF" value={usersService.formatCpf(dados.diretor.cpf)} />
                <InfoRow label="E-mail" value={dados.diretor.email} />
                <InfoRow label="Status" value={dados.diretor.status} />
              </div>
            ) : (
              <p className="text-sm text-[#64748b] m-0">Nenhum diretor vinculado.</p>
            )}
          </div>

          <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">Resumo</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="px-4 py-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide block mb-1">
                  Alunos
                </span>
                <span className="text-xl font-bold text-[#042f2e]">{dados.total_estudantes ?? 0}</span>
              </div>
              <div className="px-4 py-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide block mb-1">
                  Equipes
                </span>
                <span className="text-xl font-bold text-[#042f2e]">{dados.total_equipes ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">
                Modalidades inscritas ({dados.modalidades?.length ?? 0})
              </h3>
            </div>
            {dados.modalidades?.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(
                  dados.modalidades.reduce((acc, m) => {
                    if (!acc[m.esporte]) acc[m.esporte] = []
                    acc[m.esporte].push(m)
                    return acc
                  }, {})
                ).map(([esporte, variantes]) => (
                  <div
                    key={esporte}
                    className="px-3 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                  >
                    <span className="text-[0.875rem] font-semibold text-[#042f2e] block mb-2">
                      {esporte}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {variantes.map((v) => (
                        <span
                          key={v.variante_id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]"
                        >
                          {v.categoria}
                          <span className="text-[#7dd3fc]">·</span>
                          {v.naipe === 'MASCULINO' ? 'Masc.' : v.naipe === 'FEMININO' ? 'Fem.' : v.naipe}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748b] m-0">Nenhuma modalidade inscrita.</p>
            )}
          </div>

          <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
            <div className="flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-[#64748b]" />
              <h3 className="text-sm font-semibold text-[#042f2e] m-0">
                Usuários vinculados ({dados.usuarios?.length ?? 0})
              </h3>
            </div>
            {dados.usuarios?.length > 0 ? (
              <ul className="list-none m-0 p-0 space-y-2">
                {dados.usuarios.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[0.9375rem] font-medium text-[#334155]">{u.nome}</span>
                      <span className="text-xs text-[#64748b]">
                        {ROLE_LABEL[u.role] || u.role} • {u.status}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#64748b]">
                      {usersService.formatCpf(u.cpf)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#64748b] m-0">Nenhum usuário vinculado.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
