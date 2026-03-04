import { useState } from 'react'
import { Trophy, User, Users, Search } from 'lucide-react'
import ModalidadeIcon from './ModalidadeIcon'
import Modal from '../ui/Modal'
import { equipesService } from '../../services/equipesService'
import { estudantesService } from '../../services/estudantesService'

const labelClass = 'block text-sm font-medium text-[#334155] mb-1.5'
const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-transparent'
const inputErrorClass = 'border-[#dc2626] focus:ring-[#dc2626]'
const errorClass = 'text-[#dc2626] text-sm mt-1'

export default function EquipeModal({
  open,
  onClose,
  onSuccess,
  modalidades = [],
  categorias = [],
  estudantes = [],
  professoresTecnicos = [],
}) {
  const [modalidadeId, setModalidadeId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [estudanteIds, setEstudanteIds] = useState([])
  const [professorTecnicoId, setProfessorTecnicoId] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [alunoSearch, setAlunoSearch] = useState('')

  const selectedModalidade = modalidades.find((m) => m.id === modalidadeId)
  const limiteAtletas = selectedModalidade?.limite_atletas != null ? Number(selectedModalidade.limite_atletas) : null

  const filteredEstudantes = estudantes.filter((e) => {
    if (!alunoSearch.trim()) return true
    const term = alunoSearch.toLowerCase()
    return (e.nome || '').toLowerCase().includes(term) || (e.cpf || '').replace(/\D/g, '').includes(alunoSearch.replace(/\D/g, ''))
  })

  const podeAdicionarMais = limiteAtletas == null || estudanteIds.length < limiteAtletas

  const toggleEstudante = (id) => {
    setEstudanteIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (limiteAtletas != null && prev.length >= limiteAtletas) return prev
      return [...prev, id]
    })
    if (errors.estudante_ids) setErrors((e) => ({ ...e, estudante_ids: undefined }))
  }

  const selectAllAlunos = () => {
    const ids = filteredEstudantes.map((e) => e.id).filter(Boolean)
    if (ids.length === 0) return
    const allSelected = ids.every((id) => estudanteIds.includes(id))
    if (allSelected) {
      setEstudanteIds((prev) => prev.filter((id) => !ids.includes(id)))
    } else {
      const maxToAdd = limiteAtletas != null ? Math.max(0, limiteAtletas - estudanteIds.length) : ids.length
      const toAdd = ids.filter((id) => !estudanteIds.includes(id)).slice(0, maxToAdd)
      setEstudanteIds((prev) => [...new Set([...prev, ...toAdd])])
    }
  }

  const handleClose = () => {
    setModalidadeId('')
    setCategoriaId('')
    setEstudanteIds([])
    setProfessorTecnicoId('')
    setErrors({})
    setSubmitError(null)
    setAlunoSearch('')
    onClose?.()
  }

  const validate = () => {
    const err = {}
    if (!modalidadeId?.trim()) err.modalidade_id = 'Selecione a modalidade'
    if (!categoriaId?.trim()) err.categoria_id = 'Selecione a categoria'
    if (!professorTecnicoId) err.professor_tecnico_id = 'Selecione o professor-técnico'
    if (estudanteIds.length === 0) err.estudante_ids = 'Selecione pelo menos um aluno'
    if (limiteAtletas != null && estudanteIds.length > limiteAtletas) {
      err.estudante_ids = `Máximo de ${limiteAtletas} atleta(s) por equipe nesta modalidade.`
    }
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!validate()) return
    setSubmitError(null)
    setLoading(true)
    try {
      await equipesService.criar({
        modalidade_id: modalidadeId.trim(),
        categoria_id: categoriaId.trim(),
        estudante_ids: estudanteIds,
        professor_tecnico_id: Number(professorTecnicoId),
      })
      handleClose()
      onSuccess?.()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao salvar equipe. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const footer = (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-lg border border-[#e2e8f0] text-[#475569] font-medium hover:bg-[#f1f5f9]">
        Cancelar
      </button>
      <button type="button" onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 rounded-lg bg-[#0f766e] text-white font-semibold hover:opacity-90 disabled:opacity-60">
        {loading ? 'Salvando...' : 'Cadastrar equipe'}
      </button>
    </div>
  )

  return (
    <Modal isOpen={open} onClose={handleClose} title="Nova equipe" subtitle="Selecione modalidade, categoria, alunos e técnico" size="lg" footer={footer}>
      <div className="p-0">
        {submitError && (
          <div className="mb-4 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-lg text-sm">
            {submitError}
          </div>
        )}

        <div className="space-y-6">
          {/* Modalidade e Categoria */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
            <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
              <Trophy className="w-4 h-4 text-[#64748b]" />
              Modalidade e Categoria
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="eq-modalidade" className={labelClass}>Modalidade *</label>
              <div className="flex gap-2 items-center">
                {modalidadeId && modalidades.find((m) => m.id === modalidadeId) && (
                  <ModalidadeIcon
                    icone={modalidades.find((m) => m.id === modalidadeId)?.icone}
                    size={22}
                    className="text-[#0f766e] shrink-0"
                  />
                )}
                <select
                  id="eq-modalidade"
                  value={modalidadeId}
                  onChange={(e) => { setModalidadeId(e.target.value); if (errors.modalidade_id) setErrors((x) => ({ ...x, modalidade_id: undefined })) }}
                  className={`flex-1 ${inputClass} ${errors.modalidade_id ? inputErrorClass : ''}`}
                >
                  <option value="">Selecione</option>
                  {modalidades.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              {errors.modalidade_id && <p className={errorClass}>{errors.modalidade_id}</p>}
            </div>
            <div>
              <label htmlFor="eq-categoria" className={labelClass}>Categoria *</label>
              <select
                id="eq-categoria"
                value={categoriaId}
                onChange={(e) => { setCategoriaId(e.target.value); if (errors.categoria_id) setErrors((x) => ({ ...x, categoria_id: undefined })) }}
                className={`${inputClass} ${errors.categoria_id ? inputErrorClass : ''}`}
              >
                <option value="">Selecione</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errors.categoria_id && <p className={errorClass}>{errors.categoria_id}</p>}
            </div>
          </div>

          {/* Professor-Técnico */}
          <div className="border-t border-[#e2e8f0] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
              <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                <User className="w-4 h-4 text-[#64748b]" />
                Professor-Técnico
              </h3>
            </div>
            <div>
              <label htmlFor="eq-tecnico" className={labelClass}>Técnico *</label>
              <select
                id="eq-tecnico"
                value={professorTecnicoId}
                onChange={(e) => { setProfessorTecnicoId(e.target.value); if (errors.professor_tecnico_id) setErrors((x) => ({ ...x, professor_tecnico_id: undefined })) }}
                className={`${inputClass} ${errors.professor_tecnico_id ? inputErrorClass : ''}`}
              >
                <option value="">Selecione o técnico</option>
                {professoresTecnicos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} {p.cref ? `(CREF: ${p.cref})` : ''}</option>
                ))}
              </select>
              {errors.professor_tecnico_id && <p className={errorClass}>{errors.professor_tecnico_id}</p>}
            </div>
          </div>

          {/* Alunos */}
          <div className="border-t border-[#e2e8f0] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
              <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
                <Users className="w-4 h-4 text-[#64748b]" />
                Alunos da equipe
              </h3>
            </div>
            {errors.estudante_ids && <p className={errorClass}>{errors.estudante_ids}</p>}
            <p className="text-sm text-[#64748b] mb-3">
              Selecione os alunos já cadastrados em Alunos.
              {limiteAtletas != null && (
                <span className="font-medium text-[#0f766e]"> Máximo de {limiteAtletas} atleta(s) por equipe nesta modalidade.</span>
              )}
            </p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input
                type="text"
                placeholder="Buscar aluno por nome ou CPF..."
                value={alunoSearch}
                onChange={(e) => setAlunoSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
            <button type="button" onClick={selectAllAlunos} className="text-sm text-[#0f766e] font-medium mb-2 hover:underline">
              {filteredEstudantes.length && filteredEstudantes.every((e) => estudanteIds.includes(e.id)) ? 'Desmarcar todos' : 'Selecionar todos (lista filtrada)'}
            </button>
            <div className="max-h-[220px] overflow-y-auto border border-[#e2e8f0] rounded-lg p-2 bg-[#f8fafc]">
              {filteredEstudantes.length === 0 ? (
                <p className="text-sm text-[#64748b] py-4 text-center m-0">Nenhum aluno cadastrado. Cadastre em Alunos primeiro.</p>
              ) : (
                <ul className="list-none m-0 p-0 space-y-1">
                  {filteredEstudantes.map((est) => {
                    const jaSelecionado = estudanteIds.includes(est.id)
                    const desabilitado = !jaSelecionado && !podeAdicionarMais
                    return (
                    <li key={est.id}>
                      <label className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer hover:bg-[#e2e8f0]/50 ${desabilitado ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={jaSelecionado}
                          onChange={() => toggleEstudante(est.id)}
                          disabled={desabilitado}
                          className="w-4 h-4 rounded border-[#e2e8f0] text-[#0f766e] focus:ring-[#0f766e]"
                        />
                        <span className="text-sm text-[#334155]">{est.nome}</span>
                        <span className="text-xs text-[#64748b] font-mono">{estudantesService.formatCpf(est.cpf)}</span>
                      </label>
                    </li>
                  );
                  })}
                </ul>
              )}
            </div>
            {estudanteIds.length > 0 && (
              <p className="text-sm text-[#64748b] mt-2 m-0">
                {estudanteIds.length} aluno(s) selecionado(s).
                {limiteAtletas != null && (
                  <span> (máx. {limiteAtletas})</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
