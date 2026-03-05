import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input, Checkbox, Button } from 'antd'
import Modal from '../ui/Modal'
import ModalidadeIcon, { MODALIDADE_ICONES } from './ModalidadeIcon'

export default function EsporteModal({ isOpen, onClose, esporte = null, onSuccess, createEsporte, updateEsporte, loading }) {
  const [iconeDropdownOpen, setIconeDropdownOpen] = useState(false)
  const iconeDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    icone: 'Zap',
    requisitos: '',
    limite_atletas: 3,
    ativa: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (esporte) {
      setFormData({
        nome: esporte.nome || '',
        descricao: esporte.descricao || '',
        icone: esporte.icone ?? 'Zap',
        requisitos: esporte.requisitos || '',
        limite_atletas: esporte.limite_atletas ?? 3,
        ativa: esporte.ativa !== undefined ? esporte.ativa : true,
      })
    } else {
      setFormData({
        nome: '',
        descricao: '',
        icone: 'Zap',
        requisitos: '',
        limite_atletas: 3,
        ativa: true,
      })
    }
    setErrors({})
  }, [esporte, isOpen])

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
        icone: formData.icone || 'Zap',
        requisitos: formData.requisitos?.trim() || '',
        limite_atletas: Number(formData.limite_atletas) || 3,
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
          ? 'Atualize as informações do esporte'
          : 'Preencha os dados para criar um novo esporte'
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
          <div className="flex gap-2">
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
            <label className="text-sm font-semibold text-[#334155]" htmlFor="limite_atletas">
              Máx. atletas por equipe <span className="text-[#dc2626]">*</span>
            </label>
            <Input
              id="limite_atletas"
              type="number"
              min={1}
              value={formData.limite_atletas}
              onChange={(e) => handleChange({ target: { name: 'limite_atletas', value: e.target.value, type: 'text' } })}
              placeholder="Ex: 3"
              status={errors.limite_atletas ? 'error' : undefined}
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

        <div className="flex flex-col gap-1.5">
          <Checkbox
            checked={formData.ativa}
            onChange={(e) => handleChange({ target: { name: 'ativa', type: 'checkbox', checked: e.target.checked } })}
          >
            Esporte ativo
          </Checkbox>
        </div>
      </form>
    </Modal>
  )
}
