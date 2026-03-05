import { useState, useEffect } from 'react'
import { Input, Checkbox, Button } from 'antd'
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
            placeholder="Ex: Coletiva"
            status={errors.nome ? 'error' : undefined}
          />
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
            onChange={(e) => handleChange({ target: { name: 'descricao', value: e.target.value } })}
            placeholder="Descreva a categoria..."
            rows={3}
          />
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
