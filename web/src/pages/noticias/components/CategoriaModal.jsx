import { useEffect } from 'react'
import { Modal, Form, Input, message } from 'antd'
import { noticiasService } from '../../../services/noticiasService'

function slugify(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

export default function CategoriaModal({ visible, editingCategoria, onClose, onSuccess }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      if (editingCategoria) {
        form.setFieldsValue(editingCategoria)
      } else {
        form.resetFields()
      }
    }
  }, [visible, editingCategoria, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const slug = values.slug || slugify(values.name)
      const payload = { name: values.name, slug, color: values.color || null, description: values.description || null, is_active: true }
      if (editingCategoria) {
        await noticiasService.atualizarCategoria(editingCategoria.id, payload)
        message.success('Categoria atualizada!')
      } else {
        await noticiasService.criarCategoria(payload)
        message.success('Categoria criada!')
      }
      onSuccess()
      onClose()
    } catch (err) {
      if (err.errorFields) return
      message.error(err.message || 'Erro ao salvar')
    }
  }

  const handleNameChange = (e) => {
    if (!editingCategoria) {
      form.setFieldsValue({ slug: slugify(e?.target?.value || '') })
    }
  }

  return (
    <Modal
      title={editingCategoria ? 'Editar categoria' : 'Nova categoria'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      destroyOnClose
      okText={editingCategoria ? 'Salvar' : 'Criar'}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input placeholder="Nome da categoria" onChange={handleNameChange} />
        </Form.Item>
        <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
          <Input placeholder="slug-url" />
        </Form.Item>
        <Form.Item name="color" label="Cor (hex, opcional)">
          <Input placeholder="#0f766e" />
        </Form.Item>
        <Form.Item name="description" label="Descrição">
          <Input.TextArea rows={2} placeholder="Opcional" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
