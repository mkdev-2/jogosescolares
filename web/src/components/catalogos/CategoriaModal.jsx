import { useState, useEffect } from 'react'
import { Input, Checkbox, Button } from 'antd'
import Modal from '../ui/Modal'

export default function CategoriaModal({ isOpen, onClose, categoria = null, onSuccess, createCategoria, updateCategoria, loading }) {
  const [formData, setFormData] = useState({
    nome: '',
    idade_min: 12,
    idade_max: 14,
    ativa: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (categoria) {
      setFormData({
        nome: categoria.nome || '',
        idade_min: categoria.idade_min ?? 12,
        idade_max: categoria.idade_max ?? 14,
        ativa: categoria.ativa !== undefined ? categoria.ativa : true,
      })
    } else {
      setFormData({
        nome: '',
        idade_min: 12,
        idade_max: 14,
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
    const min = Number(formData.idade_min)
    const max = Number(formData.idade_max)
    if (Number.isNaN(min) || min < 0) newErrors.idade_min = 'Idade mínima inválida'
    if (Number.isNaN(max) || max < 0) newErrors.idade_max = 'Idade máxima inválida'
    if (min > max) newErrors.idade_max = 'Idade máxima deve ser maior ou igual à mínima'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const dataToSubmit = {
        ...formData,
        idade_min: Number(formData.idade_min),
        idade_max: Number(formData.idade_max),
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
          ? 'Atualize as informações da categoria (faixa etária)'
          : 'Preencha os dados para criar uma nova categoria (faixa etária: ex. 12 a 14 anos)'
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="default" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" form="categoria-form" loading={loading} disabled={loading}>
            {loading ? 'Salvando...' : categoria ? 'Atualizar' : 'Criar'}
          </Button>
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
          <Input
            id="nome"
            value={formData.nome}
            onChange={(e) => handleChange({ target: { name: 'nome', value: e.target.value, type: 'text' } })}
            placeholder="Ex: 12 a 14 anos"
            status={errors.nome ? 'error' : undefined}
          />
          {errors.nome && (
            <span className="text-[0.8rem] text-[#dc2626]">{errors.nome}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="idade_min">
              Idade mínima (anos) <span className="text-[#dc2626]">*</span>
            </label>
            <Input
              id="idade_min"
              type="number"
              min={0}
              max={30}
              value={formData.idade_min}
              onChange={(e) => handleChange({ target: { name: 'idade_min', value: e.target.value, type: 'text' } })}
              placeholder="12"
              status={errors.idade_min ? 'error' : undefined}
            />
            {errors.idade_min && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.idade_min}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#334155]" htmlFor="idade_max">
              Idade máxima (anos) <span className="text-[#dc2626]">*</span>
            </label>
            <Input
              id="idade_max"
              type="number"
              min={0}
              max={30}
              value={formData.idade_max}
              onChange={(e) => handleChange({ target: { name: 'idade_max', value: e.target.value, type: 'text' } })}
              placeholder="14"
              status={errors.idade_max ? 'error' : undefined}
            />
            {errors.idade_max && (
              <span className="text-[0.8rem] text-[#dc2626]">{errors.idade_max}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Checkbox
            checked={formData.ativa}
            onChange={(e) => handleChange({ target: { name: 'ativa', type: 'checkbox', checked: e.target.checked } })}
          >
            Categoria ativa
          </Checkbox>
        </div>
      </form>
    </Modal>
  )
}
