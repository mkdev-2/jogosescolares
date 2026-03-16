import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input, Checkbox, Button, Select } from 'antd'
import Modal from '../ui/Modal'
import ModalidadeIcon, { MODALIDADE_ICONES } from './ModalidadeIcon'
import useCategorias from '../../hooks/useCategorias'
import useNaipes from '../../hooks/useNaipes'
import useTiposModalidade from '../../hooks/useTiposModalidade'

export default function EsporteModal({
  isOpen,
  onClose,
  esporte = null,
  variantesForEdit = [],
  onSuccess,
  createEsporte,
  updateEsporte,
  loading,
}) {
  const [iconeDropdownOpen, setIconeDropdownOpen] = useState(false)
  const iconeDropdownRef = useRef(null)
  const { categorias } = useCategorias()
  const { naipes } = useNaipes()
  const { tipos } = useTiposModalidade()

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    icone: 'Zap',
    requisitos: '',
    limite_atletas: 3,
    ativa: true,
    categoria_ids: [],
    naipe_ids: [],
    tipo_modalidade_ids: [],
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (esporte) {
      const catIds = [...new Set(variantesForEdit.map((v) => v.categoria_id).filter(Boolean))]
      const naipeIds = [...new Set(variantesForEdit.map((v) => v.naipe_id).filter(Boolean))]
      const tipoIds = [...new Set(variantesForEdit.map((v) => v.tipo_modalidade_id).filter(Boolean))]
      const tipoIndividual = tipos.find((t) => t.id === tipoIds[0] && (t.codigo === 'INDIVIDUAIS' || t.nome?.toUpperCase().includes('INDIVIDUAL')))
      const limiteAtletas = tipoIndividual ? 1 : (esporte.limite_atletas ?? 3)
      setFormData({
        nome: esporte.nome || '',
        descricao: esporte.descricao || '',
        icone: esporte.icone ?? 'Zap',
        requisitos: esporte.requisitos || '',
        limite_atletas: limiteAtletas,
        ativa: esporte.ativa !== undefined ? esporte.ativa : true,
        categoria_ids: catIds,
        naipe_ids: naipeIds,
        tipo_modalidade_ids: tipoIds,
      })
    } else {
      const allCatIds = categorias.map((c) => c.id)
      const allNaipeIds = naipes.map((n) => n.id)
      setFormData({
        nome: '',
        descricao: '',
        icone: 'Zap',
        requisitos: '',
        limite_atletas: 3,
        ativa: true,
        categoria_ids: allCatIds,
        naipe_ids: allNaipeIds,
        tipo_modalidade_ids: [],
      })
    }
    setErrors({})
  }, [esporte, variantesForEdit, isOpen, categorias, naipes, tipos])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (iconeDropdownRef.current && !iconeDropdownRef.current.contains(e.target)) {
        setIconeDropdownOpen(false)
      }
    }
    if (iconeDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [iconeDropdownOpen])

  const isTipoIndividual = (() => {
    const tipoId = formData.tipo_modalidade_ids?.[0]
    const t = tipos.find((x) => x.id === tipoId)
    return t?.codigo === 'INDIVIDUAIS' || t?.nome?.toUpperCase().includes('INDIVIDUAL')
  })()

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'limite_atletas' && isTipoIndividual) return
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const toggleCheckbox = (field, id) => {
    setFormData((prev) => {
      const arr = prev[field] || []
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
      return { ...prev, [field]: next }
    })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const toggleAll = (field, allIds) => {
    const allSelected = (formData[field] || []).length === allIds.length
    setFormData((prev) => ({ ...prev, [field]: allSelected ? [] : [...allIds] }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.nome?.trim()) newErrors.nome = 'Nome é obrigatório'
    const limite = Number(formData.limite_atletas)
    if (Number.isNaN(limite) || limite < 1) newErrors.limite_atletas = 'Informe o máximo de atletas (mín. 1)'
    if (!formData.categoria_ids?.length) newErrors.categoria_ids = 'Selecione ao menos uma categoria'
    if (!formData.naipe_ids?.length) newErrors.naipe_ids = 'Selecione ao menos um naipe'
    if (!formData.tipo_modalidade_ids?.length) newErrors.tipo_modalidade_ids = 'Selecione ao menos um tipo de modalidade'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const limiteFinal = isTipoIndividual ? 1 : (Number(formData.limite_atletas) || 3)
      const dataToSubmit = {
        ...formData,
        icone: formData.icone || 'Zap',
        requisitos: formData.requisitos?.trim() || '',
        limite_atletas: limiteFinal,
        categoria_ids: formData.categoria_ids || [],
        naipe_ids: formData.naipe_ids || [],
        tipo_modalidade_ids: formData.tipo_modalidade_ids || [],
      }
      if (esporte) {
        await updateEsporte(esporte.id, dataToSubmit)
        onSuccess?.()
        onClose()
      } else {
        await createEsporte(dataToSubmit)
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao salvar esporte' })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esporte ? 'Editar Esporte' : 'Novo Esporte'}
      subtitle={
        esporte
          ? 'Atualize as informações do esporte e variantes'
          : 'Preencha os dados e selecione categorias, naipes e tipo para criar variantes automaticamente'
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="default" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" form="esporte-form" loading={loading} disabled={loading}>
            {loading ? 'Salvando...' : esporte ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      }
    >
      <form
        id="esporte-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        {errors.submit && (
          <div
            className="px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-[8px] text-sm"
            role="alert"
          >
            {errors.submit}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#334155]" htmlFor="nome">
            Nome <span className="text-[#dc2626]">*</span>
          </label>
          <div className="flex gap-2 items-start">
            <div className="relative shrink-0" ref={iconeDropdownRef}>
              <span className="text-[0.75rem] text-[#64748b] block mb-1">Ícone</span>
              <button
                type="button"
                onClick={() => setIconeDropdownOpen((v) => !v)}
                className="flex items-center justify-center gap-1 px-2 py-1.5 h-8 border border-[#e2e8f0] rounded-[6px] bg-white hover:border-[#0f766e] transition-colors"
                title="Selecionar ícone"
              >
                <ModalidadeIcon icone={formData.icone} size={18} className="text-[#0f766e]" />
                <ChevronDown size={14} className={`text-[#64748b] transition-transform ${iconeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {iconeDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 p-3 bg-white border-2 border-[#e2e8f0] rounded-[8px] shadow-lg min-w-[320px]">
                  <div className="grid grid-cols-5 gap-2">
                    {MODALIDADE_ICONES.map((nome) => (
                      <button
                        key={nome}
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, icone: nome }))
                          setIconeDropdownOpen(false)
                        }}
                        className={`flex items-center justify-center p-2.5 rounded-[6px] transition-colors w-full aspect-square ${
                          formData.icone === nome
                            ? 'bg-[#0f766e] text-white'
                            : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#334155]'
                        }`}
                        title={nome}
                      >
                        <ModalidadeIcon icone={nome} size={22} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <span className="text-[0.75rem] text-[#64748b] invisible">Ícone</span>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleChange({ target: { name: 'nome', value: e.target.value, type: 'text' } })}
                placeholder="Ex: Futebol"
                prefix={<ModalidadeIcon icone={formData.icone} size={22} className="text-[#0f766e] shrink-0" />}
                status={errors.nome ? 'error' : undefined}
              />
            </div>
            <div className="flex flex-col gap-1 shrink-0 pt-6">
              <Checkbox
                checked={formData.ativa}
                onChange={(e) => handleChange({ target: { name: 'ativa', type: 'checkbox', checked: e.target.checked } })}
              >
                Esporte ativo
              </Checkbox>
            </div>
          </div>
          {errors.nome && (
            <span className="text-[0.8rem] text-[#dc2626]">{errors.nome}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#334155]" htmlFor="descricao">
            Descrição
          </label>
          <Input.TextArea
            id="descricao"
            value={formData.descricao}
            onChange={(e) => handleChange({ target: { name: 'descricao', value: e.target.value, type: 'text' } })}
            placeholder="Descreva o esporte..."
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="tipo_modalidade">
              Tipo de modalidade <span className="text-[#dc2626]">*</span>
            </label>
            <Select
              id="tipo_modalidade"
              placeholder="Selecione"
              value={formData.tipo_modalidade_ids?.[0] || undefined}
              onChange={(v) => {
                const tipoSelecionado = tipos.find((t) => t.id === v)
                const isIndividual = tipoSelecionado?.codigo === 'INDIVIDUAIS' || tipoSelecionado?.nome?.toUpperCase().includes('INDIVIDUAL')
                setFormData((p) => ({
                  ...p,
                  tipo_modalidade_ids: v ? [v] : [],
                  limite_atletas: isIndividual ? 1 : (p.limite_atletas === 1 ? 3 : p.limite_atletas),
                }))
              }}
              options={tipos.map((t) => ({ value: t.id, label: t.nome }))}
              className="w-full"
              status={errors.tipo_modalidade_ids ? 'error' : undefined}
            />
            {errors.tipo_modalidade_ids && (
              <span className="text-[0.8rem] text-[#dc2626] block mt-1">{errors.tipo_modalidade_ids}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="limite_atletas">
              Máx. atletas por equipe <span className="text-[#dc2626]">*</span>
            </label>
            <Input
              id="limite_atletas"
              type="number"
              min={1}
              value={isTipoIndividual ? 1 : formData.limite_atletas}
              onChange={(e) => handleChange({ target: { name: 'limite_atletas', value: e.target.value, type: 'text' } })}
              placeholder="Ex: 3"
              status={errors.limite_atletas ? 'error' : undefined}
              disabled={isTipoIndividual}
            />
            <span className="text-[0.75rem] text-[#64748b]">Limite de vagas por equipe neste esporte</span>
            {errors.limite_atletas && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.limite_atletas}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="requisitos">
              Requisitos (opcional)
            </label>
            <Input
              id="requisitos"
              value={formData.requisitos}
              onChange={(e) => handleChange({ target: { name: 'requisitos', value: e.target.value, type: 'text' } })}
              placeholder="Ex: Necessita quadra"
            />
          </div>
        </div>

        <div className="border-t border-[#e2e8f0] pt-5">
          <h4 className="text-sm font-semibold text-[#334155] mb-3">Variantes</h4>
          <p className="text-[0.8125rem] text-[#64748b] mb-4">
            Selecione categorias e naipes. O sistema criará automaticamente todas as combinações.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={(formData.categoria_ids?.length || 0) === categorias.length && categorias.length > 0}
                  indeterminate={(formData.categoria_ids?.length || 0) > 0 && (formData.categoria_ids?.length || 0) < categorias.length}
                  onChange={() => toggleAll('categoria_ids', categorias.map((c) => c.id))}
                />
                <label className="text-sm font-bold cursor-pointer text-[#334155]">Categorias (faixa etária) <span className="text-[#dc2626]">*</span></label>
              </div>
              <div className="flex flex-col gap-2">
                {categorias.map((c) => (
                  <Checkbox
                    key={c.id}
                    checked={formData.categoria_ids?.includes(c.id)}
                    onChange={() => toggleCheckbox('categoria_ids', c.id)}
                  >
                    {c.nome}
                  </Checkbox>
                ))}
              </div>
              {errors.categoria_ids && (
                <span className="text-[0.8rem] text-[#dc2626] block mt-1">{errors.categoria_ids}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={(formData.naipe_ids?.length || 0) === naipes.length && naipes.length > 0}
                  indeterminate={(formData.naipe_ids?.length || 0) > 0 && (formData.naipe_ids?.length || 0) < naipes.length}
                  onChange={() => toggleAll('naipe_ids', naipes.map((n) => n.id))}
                >
                <label className="text-sm font-bold cursor-pointer text-[#334155]">Naipes <span className="text-[#dc2626]">*</span></label>
                </Checkbox>
              </div>
              <div className="flex flex-col gap-2">
                {naipes.map((n) => (
                  <Checkbox
                    key={n.id}
                    checked={formData.naipe_ids?.includes(n.id)}
                    onChange={() => toggleCheckbox('naipe_ids', n.id)}
                  >
                    {n.nome}
                  </Checkbox>
                ))}
              </div>
              {errors.naipe_ids && (
                <span className="text-[0.8rem] text-[#dc2626] block mt-1">{errors.naipe_ids}</span>
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
