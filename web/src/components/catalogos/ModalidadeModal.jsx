import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import useModalidades from '../../hooks/useModalidades'

export default function ModalidadeModal({ isOpen, onClose, modalidade = null, onSuccess }) {
  const { createModalidade, updateModalidade, loading } = useModalidades()
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    descricao: '',
    categoria: 'Coletiva',
    requisitos: '',
    ativa: true,
  })
  const [errors, setErrors] = useState({})

  const categorias = ['Coletiva', 'Individual', 'Mental', 'Cultural', 'Outras']

  useEffect(() => {
    if (modalidade) {
      setFormData({
        id: modalidade.id || '',
        nome: modalidade.nome || '',
        descricao: modalidade.descricao || '',
        categoria: modalidade.categoria || 'Coletiva',
        requisitos: modalidade.requisitos || '',
        ativa: modalidade.ativa !== undefined ? modalidade.ativa : true,
      })
    } else {
      setFormData({
        id: '',
        nome: '',
        descricao: '',
        categoria: 'Coletiva',
        requisitos: '',
        ativa: true,
      })
    }
    setErrors({})
  }, [modalidade, isOpen])

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
    if (!formData.categoria) newErrors.categoria = 'Categoria é obrigatória'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const dataToSubmit = {
        ...formData,
        requisitos: formData.requisitos?.trim() || null,
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

        {!modalidade && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="id">
              ID da Modalidade (opcional)
            </label>
            <input
              id="id"
              name="id"
              type="text"
              value={formData.id}
              onChange={handleChange}
              placeholder="Ex: FUTEBOL, VOLEI, NATACAO"
              className="px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
            />
            <span className="text-[0.75rem] text-[#64748b]">
              Identificador único em maiúsculas (sem acentos)
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#334155]" htmlFor="nome">
            Nome <span className="text-[#dc2626]">*</span>
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Ex: Futebol"
            className={`px-3 py-2.5 border-2 rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] ${
              errors.nome ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
            }`}
          />
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
            <label className="text-sm font-semibold text-[#334155]" htmlFor="categoria">
              Categoria <span className="text-[#dc2626]">*</span>
            </label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className={`px-3 py-2.5 border-2 rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e] ${
                errors.categoria ? 'border-[#dc2626]' : 'border-[#e2e8f0]'
              }`}
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.categoria && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.categoria}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
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
