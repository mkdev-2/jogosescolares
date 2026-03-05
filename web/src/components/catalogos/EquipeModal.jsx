import { useState } from 'react'
import { Trophy, User, Users, Search } from 'lucide-react'
import { Input, Select, Checkbox, Button } from 'antd'
import ModalidadeIcon from './ModalidadeIcon'
import Modal from '../ui/Modal'
import { equipesService } from '../../services/equipesService'
import { estudantesService } from '../../services/estudantesService'

const labelClass = 'block text-sm font-medium text-[#334155] mb-1.5'
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
      <Button type="default" onClick={handleClose}>
        Cancelar
      </Button>
      <Button type="primary" onClick={handleSubmit} loading={loading} disabled={loading}>
        {loading ? 'Salvando...' : 'Cadastrar equipe'}
      </Button>
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
              <Select
                id="eq-modalidade"
                value={modalidadeId || undefined}
                onChange={(v) => { setModalidadeId(v || ''); if (errors.modalidade_id) setErrors((x) => ({ ...x, modalidade_id: undefined })) }}
                placeholder="Selecione"
                options={modalidades.map((m) => ({ value: m.id, label: m.nome }))}
                className="w-full"
                status={errors.modalidade_id ? 'error' : undefined}
              />
              {errors.modalidade_id && <p className={errorClass}>{errors.modalidade_id}</p>}
            </div>
            <div>
              <label htmlFor="eq-categoria" className={labelClass}>Categoria *</label>
              <Select
                id="eq-categoria"
                value={categoriaId || undefined}
                onChange={(v) => { setCategoriaId(v || ''); if (errors.categoria_id) setErrors((x) => ({ ...x, categoria_id: undefined })) }}
                placeholder="Selecione"
                options={categorias.map((c) => ({ value: c.id, label: c.nome }))}
                className="w-full"
                status={errors.categoria_id ? 'error' : undefined}
              />
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
              <Select
                id="eq-tecnico"
                value={professorTecnicoId || undefined}
                onChange={(v) => { setProfessorTecnicoId(v || ''); if (errors.professor_tecnico_id) setErrors((x) => ({ ...x, professor_tecnico_id: undefined })) }}
                placeholder="Selecione o técnico"
                options={professoresTecnicos.map((p) => ({ value: p.id, label: `${p.nome}${p.cref ? ` (CREF: ${p.cref})` : ''}` }))}
                className="w-full"
                status={errors.professor_tecnico_id ? 'error' : undefined}
              />
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
            <div className="mb-3">
              <Input
                placeholder="Buscar aluno por nome ou CPF..."
                value={alunoSearch}
                onChange={(e) => setAlunoSearch(e.target.value)}
                prefix={<Search className="w-4 h-4 text-[#64748b]" />}
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
                        <Checkbox
                          checked={jaSelecionado}
                          onChange={() => toggleEstudante(est.id)}
                          disabled={desabilitado}
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
