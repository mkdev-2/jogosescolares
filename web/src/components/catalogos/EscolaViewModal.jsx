import { useState, useEffect } from 'react'
import { Building2, User, Users, GraduationCap, UserCircle, Trophy, FileText, ExternalLink } from 'lucide-react'
import Modal from '../ui/Modal'
import { escolasService } from '../../services/escolasService'
import { usersService } from '../../services/usersService'
import { getStorageUrl } from '../../services/storageService'

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{label}</span>
    <span className="text-[0.9375rem] text-[#334155]">{value ?? '-'}</span>
  </div>
)

function formatDate(str) {
  if (!str) return '-'
  try {
    const [year, month, day] = str.split('-')
    return new Date(+year, +month - 1, +day).toLocaleDateString('pt-BR')
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

export default function EscolaViewModal({ open, onClose, escolaId, edicaoId = null }) {
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
      .getDetalhes(escolaId, edicaoId)
      .then((res) => {
        setDados(res)
      })
      .catch((err) => {
        setError(err?.message || 'Erro ao carregar detalhes')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, escolaId, edicaoId])

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
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 custom-scrollbar">
                {Object.entries(
                  dados.modalidades.reduce((acc, m) => {
                    if (!acc[m.esporte]) acc[m.esporte] = []
                    acc[m.esporte].push(m)
                    return acc
                  }, {})
                ).map(([esporte, variantes]) => (
                  <div
                    key={esporte}
                    className="min-w-[260px] flex-shrink-0 px-4 py-3.5 rounded-xl bg-white border border-[#e2e8f0] shadow-sm hover:border-[#0f766e]/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#f0fdfa] flex items-center justify-center">
                        <Trophy size={16} className="text-[#0f766e]" />
                      </div>
                      <span className="text-sm font-bold text-[#042f2e]">
                        {esporte}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {variantes.map((v) => (
                        <span
                          key={v.variante_id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] hover:bg-[#e2e8f0] transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e]" />
                          <span className="flex-1">{v.categoria}</span>
                          <span className="text-[#cbd5e1] font-normal">|</span>
                          <span className="text-[#64748b]">{v.naipe === 'MASCULINO' ? 'Masculino' : v.naipe === 'FEMININO' ? 'Feminino' : v.naipe}</span>
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

          {dados.escola?.termo_assinatura_url && (
            <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#64748b]" />
                <h3 className="text-sm font-semibold text-[#042f2e] m-0">
                  Termo de Adesão Anexado
                </h3>
                {dados.termo_desatualizado ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b] text-white uppercase tracking-wider">
                    Pendente Atualização
                  </span>
                ) : dados.termo_atualizado ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0f766e] text-white uppercase tracking-wider">
                    Versão Atualizada
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-end pr-1">
                  {(() => {
                    const url = getStorageUrl(dados.escola.termo_assinatura_url)
                    const nocacheUrl = url + (url.includes('?') ? '&' : '?') + 'nocache=' + Date.now()
                    return (
                      <a 
                        href={nocacheUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[#0f766e] hover:text-[#0d9488]"
                      >
                        <ExternalLink size={14} /> Abrir em nova guia
                      </a>
                    )
                  })()}
                </div>
                <div className="w-full bg-[#f8fafc] rounded-[8px] border border-[#cbd5e1] overflow-hidden flex justify-center items-center">
                  {(() => {
                    const url = getStorageUrl(dados.escola.termo_assinatura_url)
                    const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|bmp)(?:\?|$)/)
                    const nocacheUrl = url + (url.includes('?') ? '&' : '?') + 'nocache=' + Date.now()
                    
                    if (isImage) {
                      return <img src={nocacheUrl} alt="Termo de Adesão" className="max-w-full max-h-[500px] object-contain" referrerPolicy="no-referrer" />
                    }
                    return <iframe src={nocacheUrl} className="w-full h-[500px] border-0" title="Termo de Adesão" referrerPolicy="no-referrer" />
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
