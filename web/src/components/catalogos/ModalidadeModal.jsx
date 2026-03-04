import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import Modal from '../ui/Modal'
import useCategorias from '../../hooks/useCategorias'
import ModalidadeIcon, { MODALIDADE_ICONES } from './ModalidadeIcon'

export default function ModalidadeModal({ isOpen, onClose, modalidade = null, onSuccess, createModalidade, updateModalidade, loading }) {
  const { categorias } = useCategorias()
  const [iconeDropdownOpen, setIconeDropdownOpen] = useState(false)
  const iconeDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria_id: modalidade?.categoria_id,
    icone: modalidade?.icone ?? 'Zap',
    requisitos: '',
    limite_atletas: modalidade?.limite_atletas ?? 3,
    ativa: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (modalidade) {
      setFormData({
        nome: modalidade.nome || '',
        descricao: modalidade.descricao || '',
        categoria_id: modalidade.categoria_id,
        icone: modalidade.icone ?? 'Zap',
        requisitos: modalidade.requisitos || '',
        limite_atletas: modalidade.limite_atletas ?? 3,
        ativa: modalidade.ativa !== undefined ? modalidade.ativa : true,
      })
    } else {
      setFormData({
        nome: '',
        descricao: '',
        categoria_id: categorias[0]?.id,
        icone: 'Zap',
        requisitos: '',
        limite_atletas: 3,
        ativa: true,
      })
    }
    setErrors({})
  }, [modalidade, isOpen, categorias])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (iconeDropdownRef.current && !iconeDropdownRef.current.contains(e.target)) {
        setIconeDropdownOpen(false)
      }
    }
    if (iconeDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [iconeDropdownOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.nome?.trim()) newErrors.nome = 'Nome é obrigatório'
    if (!formData.categoria_id) newErrors.categoria_id = 'Categoria é obrigatória'
    const limite = Number(formData.limite_atletas)
    if (Number.isNaN(limite) || limite < 1) newErrors.limite_atletas = 'Informe o máximo de atletas (mín. 1)'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const dataToSubmit = {
        ...formData,
        categoria_id: formData.categoria_id,
        icone: formData.icone || 'Zap',
        requisitos: formData.requisitos?.trim() || null,
        limite_atletas: Number(formData.limite_atletas) || 3,
      }
      if (modalidade) {
        await updateModalidade(modalidade.id, dataToSubmit)
        onSuccess?.()
        onClose()
      } else {
        await createModalidade(dataToSubmit)
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao salvar modalidade' })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalidade ? 'Editar Modalidade' : 'Nova Modalidade'}
      subtitle={
        modalidade
          ? 'Atualize as informações da modalidade'
          : 'Preencha os dados para criar uma nova modalidade'
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-5 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold border-2 border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#334155] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="modalidade-form"
            className="px-5 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-95 hover:-translate-y-px transition-transform"
            disabled={loading}
          >
            {loading ? 'Salvando...' : modalidade ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      }
      >
      <form
        id="modalidade-form"
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
          <div className="flex gap-2">
            <div className="relative shrink-0" ref={iconeDropdownRef}>
              <span className="text-[0.75rem] text-[#64748b] block mb-1">Ícone</span>
              <button
                type="button"
                onClick={() => setIconeDropdownOpen((v) => !v)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] bg-white hover:border-[#0f766e] transition-colors"
                title="Selecionar ícone"
              >
                <ModalidadeIcon icone={formData.icone} size={22} className="text-[#0f766e]" />
                <ChevronDown size={16} className={`text-[#64748b] transition-transform ${iconeDropdownOpen ? 'rotate-180' : ''}`} />
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
              <div className={`flex items-center gap-2 px-3 py-2.5 border-2 rounded-[8px] bg-white ${
                errors.nome ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
              }`}>
                <ModalidadeIcon icone={formData.icone} size={22} className="text-[#0f766e] shrink-0" />
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: Futebol"
                  className="flex-1 min-w-0 border-0 bg-transparent text-base font-inherit focus:outline-none"
                />
              </div>
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
          <textarea
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            placeholder="Descreva a modalidade..."
            rows={4}
            className="px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 max-[480px]:grid-cols-1 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="categoria_id">
              Categoria <span className="text-[#dc2626]">*</span>
            </label>
            <select
              id="categoria_id"
              name="categoria_id"
              value={formData.categoria_id || ''}
              onChange={handleChange}
              disabled={categorias.length === 0}
              className={`px-3 py-2.5 border-2 rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] ${
                errors.categoria_id ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
              } ${categorias.length === 0 ? 'bg-[#f8fafc] text-[#94a3b8]' : 'bg-white'}`}
            >
              {categorias.length === 0 ? (
                <option value="">—</option>
              ) : (
                categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))
              )}
            </select>
            {categorias.length === 0 && (
              <span className="text-[0.75rem] text-[#64748b]">
                Ainda não há categorias disponíveis. Crie uma categoria antes de cadastrar modalidades.
              </span>
            )}
            {errors.categoria_id && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.categoria_id}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="limite_atletas">
              Máx. atletas por equipe <span className="text-[#dc2626]">*</span>
            </label>
            <input
              id="limite_atletas"
              name="limite_atletas"
              type="number"
              min={1}
              value={formData.limite_atletas}
              onChange={handleChange}
              placeholder="Ex: 3"
              className={`px-3 py-2.5 border-2 rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] ${
                errors.limite_atletas ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
              }`}
            />
            <span className="text-[0.75rem] text-[#64748b]">Limite de vagas por equipe nesta modalidade</span>
            {errors.limite_atletas && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.limite_atletas}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="requisitos">
              Requisitos (opcional)
            </label>
            <input
              id="requisitos"
              name="requisitos"
              type="text"
              value={formData.requisitos}
              onChange={handleChange}
              placeholder="Ex: Necessita quadra"
              className="px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-[#334155] cursor-pointer">
            <input
              type="checkbox"
              name="ativa"
              checked={formData.ativa}
              onChange={handleChange}
              className="w-[1.125rem] h-[1.125rem]"
            />
            Modalidade ativa
          </label>
        </div>
      </form>
    </Modal>
  )
}
