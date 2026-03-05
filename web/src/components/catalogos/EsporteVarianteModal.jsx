import { useState, useEffect } from 'react'
import { Select, Button } from 'antd'
import Modal from '../ui/Modal'
import useEsportes from '../../hooks/useEsportes'
import useCategorias from '../../hooks/useCategorias'
import useNaipes from '../../hooks/useNaipes'
import useTiposModalidade from '../../hooks/useTiposModalidade'

const labelClass = 'block text-sm font-medium text-[#334155] mb-1.5'
const errorClass = 'text-[#dc2626] text-sm mt-1'

export default function EsporteVarianteModal({ isOpen, onClose, onSuccess, createVariante, loading }) {
  const { esportes } = useEsportes()
  const { categorias } = useCategorias()
  const { naipes } = useNaipes()
  const { tipos } = useTiposModalidade()

  const [formData, setFormData] = useState({
    esporte_id: '',
    categoria_id: '',
    naipe_id: '',
    tipo_modalidade_id: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      setFormData({
        esporte_id: esportes[0]?.id || '',
        categoria_id: categorias[0]?.id || '',
        naipe_id: naipes[0]?.id || '',
        tipo_modalidade_id: tipos[0]?.id || '',
      })
      setErrors({})
    }
  }, [isOpen, esportes, categorias, naipes, tipos])

  const validate = () => {
    const err = {}
    if (!formData.esporte_id) err.esporte_id = 'Selecione o esporte'
    if (!formData.categoria_id) err.categoria_id = 'Selecione a categoria'
    if (!formData.naipe_id) err.naipe_id = 'Selecione o naipe'
    if (!formData.tipo_modalidade_id) err.tipo_modalidade_id = 'Selecione o tipo de modalidade'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!validate()) return
    try {
      await createVariante(formData)
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao criar variante' })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Variante"
      subtitle="Defina uma combinação válida: esporte + categoria (faixa etária) + naipe + tipo de modalidade"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="default" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={loading} disabled={loading}>
            {loading ? 'Salvando...' : 'Criar variante'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {errors.submit && (
          <div className="px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Esporte *</label>
            <Select
              value={formData.esporte_id || undefined}
              onChange={(v) => setFormData((p) => ({ ...p, esporte_id: v || '' }))}
              placeholder="Selecione"
              options={esportes.map((e) => ({ value: e.id, label: e.nome }))}
              className="w-full"
              status={errors.esporte_id ? 'error' : undefined}
            />
            {errors.esporte_id && <span className={errorClass}>{errors.esporte_id}</span>}
          </div>
          <div>
            <label className={labelClass}>Categoria (faixa etária) *</label>
            <Select
              value={formData.categoria_id || undefined}
              onChange={(v) => setFormData((p) => ({ ...p, categoria_id: v || '' }))}
              placeholder="Selecione"
              options={categorias.map((c) => ({ value: c.id, label: `${c.nome} (${c.idade_min}-${c.idade_max} anos)` }))}
              className="w-full"
              status={errors.categoria_id ? 'error' : undefined}
            />
            {errors.categoria_id && <span className={errorClass}>{errors.categoria_id}</span>}
          </div>
          <div>
            <label className={labelClass}>Naipe *</label>
            <Select
              value={formData.naipe_id || undefined}
              onChange={(v) => setFormData((p) => ({ ...p, naipe_id: v || '' }))}
              placeholder="Selecione"
              options={naipes.map((n) => ({ value: n.id, label: n.nome }))}
              className="w-full"
              status={errors.naipe_id ? 'error' : undefined}
            />
            {errors.naipe_id && <span className={errorClass}>{errors.naipe_id}</span>}
          </div>
          <div>
            <label className={labelClass}>Tipo de modalidade *</label>
            <Select
              value={formData.tipo_modalidade_id || undefined}
              onChange={(v) => setFormData((p) => ({ ...p, tipo_modalidade_id: v || '' }))}
              placeholder="Selecione"
              options={tipos.map((t) => ({ value: t.id, label: t.nome }))}
              className="w-full"
              status={errors.tipo_modalidade_id ? 'error' : undefined}
            />
            {errors.tipo_modalidade_id && <span className={errorClass}>{errors.tipo_modalidade_id}</span>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
