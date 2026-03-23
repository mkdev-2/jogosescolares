import { useState, useEffect, useRef } from 'react'
import { Trophy, User, Users, Search } from 'lucide-react'
import { Input, Select, Checkbox, Button, Tooltip } from 'antd'
import Modal from '../ui/Modal'
import ModalidadeIcon from './ModalidadeIcon'
import { equipesService } from '../../services/equipesService'
import { estudantesService } from '../../services/estudantesService'

const labelClass = 'block text-sm font-medium text-[#334155] mb-1.5'
const errorClass = 'text-[#dc2626] text-sm mt-1'

function formatVarianteLabel(v) {
  return `${v.esporte_nome} • ${v.categoria_nome} • ${v.naipe_nome} • ${v.tipo_modalidade_nome}`
}

function calcularIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--
  }
  return idade
}

function VarianteOptionLabel({ variante }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ModalidadeIcon icone={variante.esporte_icone || 'Zap'} size={16} className="text-[#0f766e] shrink-0" />
      {formatVarianteLabel(variante)}
    </span>
  )
}

export default function EquipeModal({
  open,
  onClose,
  onSuccess,
  variantes = [],
  estudantes = [],
  professoresTecnicos = [],
  equipe = null,
  equipes = [],
  edicaoId = null,
}) {
  const [varianteId, setVarianteId] = useState('')
  const [estudanteIds, setEstudanteIds] = useState([])
  const [professorTecnicoId, setProfessorTecnicoId] = useState('')
  const formTopRef = useRef(null)

  useEffect(() => {
    if (open && equipe) {
      setVarianteId(equipe.esporte_variante_id || '')
      setEstudanteIds(equipe.estudantes?.map((e) => e.id) || [])
      setProfessorTecnicoId(equipe.professor_tecnico_id ? String(equipe.professor_tecnico_id) : '')
    } else if (open && !equipe) {
      setVarianteId('')
      setEstudanteIds([])
      setProfessorTecnicoId('')
    }
  }, [open, equipe])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [alunoSearch, setAlunoSearch] = useState('')

  const selectedVariante = variantes.find((v) => v.id === varianteId)
  const limiteAtletas = selectedVariante?.esporte_limite_atletas != null ? Number(selectedVariante.esporte_limite_atletas) : null

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
    setVarianteId('')
    setEstudanteIds([])
    setProfessorTecnicoId('')
    setErrors({})
    setSubmitError(null)
    setAlunoSearch('')
    onClose?.()
  }

  const validate = () => {
    const err = {}
    if (!varianteId?.trim()) err.esporte_variante_id = 'Selecione a variante (esporte + categoria + naipe + tipo)'
    if (!professorTecnicoId) err.professor_tecnico_id = 'Selecione o professor-técnico'
    if (estudanteIds.length === 0) err.estudante_ids = 'Selecione pelo menos um aluno'
    if (limiteAtletas != null && estudanteIds.length > limiteAtletas) {
      err.estudante_ids = `Máximo de ${limiteAtletas} atleta(s) por equipe nesta variante.`
    }

    // Validação de duplicidade (mesma variante para a mesma escola)
    const varianteExistente = equipes.find(
      (e) => e.esporte_variante_id === varianteId && e.id !== equipe?.id
    )
    if (varianteExistente) {
      err.esporte_variante_id = 'Sua escola já possui uma equipe cadastrada para esta modalidade/categoria/naipe.'
    }

    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!validate()) {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    setSubmitError(null)
    setLoading(true)
    try {
      const payload = {
        esporte_variante_id: varianteId.trim(),
        estudante_ids: estudanteIds,
        professor_tecnico_id: Number(professorTecnicoId),
      }
      if (equipe?.id) {
        await equipesService.atualizar(equipe.id, payload, edicaoId)
      } else {
        await equipesService.criar(payload, edicaoId)
      }
      handleClose()
      onSuccess?.()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao salvar equipe. Tente novamente.')
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        {loading ? 'Salvando...' : equipe ? 'Salvar alterações' : 'Cadastrar equipe'}
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={equipe ? 'Editar equipe' : 'Nova equipe'}
      subtitle="Selecione a variante (esporte + categoria + naipe + tipo), alunos e técnico"
      size="lg"
      footer={footer}
    >
      <div className="p-0">
        <div ref={formTopRef} />
        {submitError && (
          <div className="mb-4 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-lg text-sm">
            {submitError}
          </div>
        )}

        <div className="space-y-6">
          {/* Variante */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-5 bg-[#0f766e] rounded-full" />
            <h3 className="text-base font-semibold text-[#042f2e] flex items-center gap-2 m-0">
              <Trophy className="w-4 h-4 text-[#64748b]" />
              Variante (Esporte + Categoria + Naipe + Tipo)
            </h3>
          </div>
          <div>
            <label htmlFor="eq-variante" className={labelClass}>Variante *</label>
            <Select
              id="eq-variante"
              value={varianteId || undefined}
              onChange={(v) => { setVarianteId(v || ''); if (errors.esporte_variante_id) setErrors((x) => ({ ...x, esporte_variante_id: undefined })) }}
              placeholder="Selecione esporte, categoria, naipe e tipo"
              options={variantes.map((v) => {
                const jaPossuiEquipe = equipes.some(e => e.esporte_variante_id === v.id && e.id !== equipe?.id)
                return {
                  value: v.id,
                  label: jaPossuiEquipe ? (
                    <Tooltip title="Sua escola já possui uma equipe cadastrada para esta modalidade/categoria/naipe.">
                      <div className="opacity-50 cursor-not-allowed w-full">
                        <VarianteOptionLabel variante={v} />
                      </div>
                    </Tooltip>
                  ) : (
                    <VarianteOptionLabel variante={v} />
                  ),
                  searchText: formatVarianteLabel(v).toLowerCase(),
                  disabled: jaPossuiEquipe,
                }
              })}
              className="w-full"
              status={errors.esporte_variante_id ? 'error' : undefined}
              showSearch
              filterOption={(input, opt) =>
                (opt?.searchText ?? '').includes(input.toLowerCase())
              }
            />
            {errors.esporte_variante_id && <p className={errorClass}>{errors.esporte_variante_id}</p>}
            {variantes.length === 0 && (
              <p className="text-[0.75rem] text-[#64748b] mt-1">
                Crie variantes em Atividades antes de montar equipes.
              </p>
            )}
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
                options={professoresTecnicos.map((p) => ({ value: String(p.id), label: `${p.nome}${p.cref ? ` (CREF: ${p.cref})` : ''}` }))}
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
              Selecione os alunos já cadastrados em Alunos. O sistema valida idade e naipe automaticamente.
              {limiteAtletas != null && (
                <span className="font-medium text-[#0f766e]"> Máximo de {limiteAtletas} atleta(s) por equipe.</span>
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
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium text-[#334155] truncate">{est.nome}</span>
                          <div className="flex items-center gap-2 text-[0.75rem] text-[#64748b]">
                            <span className="font-mono">{estudantesService.formatCpf(est.cpf)}</span>
                            <span>•</span>
                            <span>{calcularIdade(est.data_nascimento)} anos</span>
                            <span>•</span>
                            <span>{est.sexo === 'M' ? 'Masculino' : 'Feminino'}</span>
                          </div>
                        </div>
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
