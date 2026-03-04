import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'

export default function CategoriaModal({ isOpen, onClose, categoria = null, onSuccess, createCategoria, updateCategoria, loading }) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativa: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (categoria) {
      setFormData({
        nome: categoria.nome || '',
        descricao: categoria.descricao || '',
        ativa: categoria.ativa !== undefined ? categoria.ativa : true,
      })
    } else {
      setFormData({
        nome: '',
        descricao: '',
        ativa: true,
      })
    }
    setErrors({})
  }, [categoria, isOpen])

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
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const dataToSubmit = {
        ...formData,
        descricao: formData.descricao?.trim() || '',
      }
      if (categoria) {
        await updateCategoria(categoria.id, dataToSubmit)
        onSuccess?.()
        onClose()
      } else {
        await createCategoria(dataToSubmit)
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao salvar categoria' })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoria ? 'Editar Categoria' : 'Nova Categoria'}
      subtitle={
        categoria
          ? 'Atualize as informações da categoria'
          : 'Preencha os dados para criar uma nova categoria (conjunto de modalidades)'
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
            form="categoria-form"
            className="px-5 py-2.5 rounded-[8px] text-[0.9375rem] font-semibold bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_100%)] text-white disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-95 hover:-translate-y-px transition-transform"
            disabled={loading}
          >
            {loading ? 'Salvando...' : categoria ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      }
    >
      <form
        id="categoria-form"
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
          <input
            id="nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Ex: Coletiva"
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
            placeholder="Descreva a categoria..."
            rows={3}
            className="px-3 py-2.5 border-2 border-[#e2e8f0] rounded-[8px] text-base font-inherit transition focus:outline-none focus:border-[#0f766e]"
          />
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
            Categoria ativa
          </label>
        </div>
      </form>
    </Modal>
  )
}
