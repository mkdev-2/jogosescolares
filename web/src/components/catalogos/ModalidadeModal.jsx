import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import useModalidades from '../../hooks/useModalidades'
import './ModalidadeModal.css'

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
        <div className="modalidade-modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="modalidade-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Salvando...' : modalidade ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      }
    >
      <form id="modalidade-form" onSubmit={handleSubmit} className="modalidade-form">
        {errors.submit && (
          <div className="form-error" role="alert">
            {errors.submit}
          </div>
        )}

        {!modalidade && (
          <div className="form-group">
            <label htmlFor="id">ID da Modalidade (opcional)</label>
            <input
              id="id"
              name="id"
              type="text"
              value={formData.id}
              onChange={handleChange}
              placeholder="Ex: FUTEBOL, VOLEI, NATACAO"
              className=""
            />
            <span className="helper-text">Identificador único em maiúsculas (sem acentos)</span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="nome">
            Nome <span className="required">*</span>
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Ex: Futebol"
            className={errors.nome ? 'input-error' : ''}
          />
          {errors.nome && <span className="field-error">{errors.nome}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="descricao">Descrição</label>
          <textarea
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            placeholder="Descreva a modalidade..."
            rows={4}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="categoria">
              Categoria <span className="required">*</span>
            </label>
            <select
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className={errors.categoria ? 'input-error' : ''}
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.categoria && (
              <span className="field-error">{errors.categoria}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="requisitos">Requisitos (opcional)</label>
            <input
              id="requisitos"
              name="requisitos"
              type="text"
              value={formData.requisitos}
              onChange={handleChange}
              placeholder="Ex: Necessita quadra"
            />
          </div>
        </div>

        <div className="form-group form-group-checkbox">
          <label>
            <input
              type="checkbox"
              name="ativa"
              checked={formData.ativa}
              onChange={handleChange}
            />
            Modalidade ativa
          </label>
        </div>
      </form>
    </Modal>
  )
}
