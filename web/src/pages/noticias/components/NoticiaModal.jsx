import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, message, Upload } from 'antd'
import { SyncOutlined, UploadOutlined } from '@ant-design/icons'
import { noticiasService } from '../../../services/noticiasService'
import { uploadImagemNoticia } from '../../../services/storageService'

const { TextArea } = Input

function generateSlug(title) {
  if (!title) return ''
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function NoticiaModal({ visible, editingNoticia, onClose, onSuccess }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [featuredFile, setFeaturedFile] = useState(null)
  const [featuredPreview, setFeaturedPreview] = useState(null)

  useEffect(() => {
    if (visible) {
      noticiasService.listarCategorias().then(setCategorias).catch(() => setCategorias([]))
    }
  }, [visible])

  useEffect(() => {
    if (visible) {
      if (editingNoticia) {
        form.setFieldsValue({
          ...editingNoticia,
          categories: editingNoticia.categories || [],
        })
        setFeaturedPreview(editingNoticia.featured_image_url || null)
        setFeaturedFile(null)
      } else {
        form.resetFields()
        form.setFieldsValue({ status: 'rascunho', categories: [] })
        setFeaturedPreview(null)
        setFeaturedFile(null)
      }
    }
  }, [visible, editingNoticia, form])

  const handleTitleChange = (e) => {
    const title = e?.target?.value
    if (title && !editingNoticia) {
      form.setFieldsValue({ slug: generateSlug(title) })
    }
  }

  const handleRegenerateSlug = () => {
    const title = form.getFieldValue('title')
    if (title) {
      form.setFieldsValue({ slug: generateSlug(title) })
      message.success('Slug atualizado')
    }
  }

  const handleSubmit = async () => {
    try {
      await form.validateFields()
      setLoading(true)
      const values = form.getFieldsValue(true)

      let featured_image_url = editingNoticia?.featured_image_url || null
      if (featuredFile?.originFileObj) {
        try {
          featured_image_url = await uploadImagemNoticia(featuredFile.originFileObj, 'destaque')
        } catch (err) {
          message.error(err.message || 'Erro ao enviar imagem')
          setLoading(false)
          return
        }
      } else if (!featuredFile && editingNoticia?.featured_image_url) {
        featured_image_url = editingNoticia.featured_image_url
      }

      const payload = {
        title: values.title,
        slug: values.slug,
        content: values.content,
        summary: values.summary || null,
        featured_image_url: featured_image_url || null,
        status: values.status,
        categories: values.categories || [],
        tags: values.tags || [],
        gallery_urls: [],
        documents: null,
        is_active: true,
      }

      if (editingNoticia) {
        await noticiasService.atualizar(editingNoticia.id, payload)
        message.success('Notícia atualizada!')
      } else {
        await noticiasService.criar(payload)
        message.success('Notícia criada com sucesso!')
      }
      onSuccess()
      onClose()
    } catch (err) {
      if (err.errorFields) return
      message.error(err.message || 'Erro ao salvar notícia')
    } finally {
      setLoading(false)
    }
  }

  const normFile = (e) => {
    if (Array.isArray(e)) return e
    if (e?.fileList?.length) {
      setFeaturedFile(e.fileList[0])
      const url = e.fileList[0].originFileObj && URL.createObjectURL(e.fileList[0].originFileObj)
      setFeaturedPreview(url || null)
      return e.fileList
    }
    setFeaturedFile(null)
    setFeaturedPreview(null)
    return []
  }

  return (
    <Modal
      title={editingNoticia ? 'Editar Notícia' : 'Nova Notícia'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
      destroyOnClose
      okText={editingNoticia ? 'Salvar' : 'Criar'}
      cancelButtonProps={{ disabled: loading }}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="title" label="Título" rules={[{ required: true, message: 'O título é obrigatório' }]}>
          <Input placeholder="Título da notícia" onChange={handleTitleChange} />
        </Form.Item>
        <Form.Item
          name="slug"
          label={
            <span>
              Slug (URL) <Button type="link" size="small" icon={<SyncOutlined />} onClick={handleRegenerateSlug} />
            </span>
          }
          rules={[{ required: true, message: 'O slug é obrigatório' }]}
        >
          <Input placeholder="url-amigavel" addonBefore="/" />
        </Form.Item>
        <Form.Item name="summary" label="Resumo">
          <TextArea rows={2} placeholder="Resumo curto (opcional)" />
        </Form.Item>
        <Form.Item name="content" label="Conteúdo" rules={[{ required: true, message: 'O conteúdo é obrigatório' }]}>
          <TextArea rows={6} placeholder="Conteúdo completo da notícia" />
        </Form.Item>
        <Form.Item label="Imagem de destaque">
          <Upload
            listType="picture"
            maxCount={1}
            accept="image/*"
            beforeUpload={() => false}
            valuePropName="fileList"
            getValueFromEvent={normFile}
          >
            <Button icon={<UploadOutlined />}>Selecionar imagem</Button>
          </Upload>
          {editingNoticia?.featured_image_url && !featuredPreview && (
            <div className="mt-2">
              <img
                src={noticiasService.getStorageUrl(editingNoticia.featured_image_url) || editingNoticia.featured_image_url}
                alt="Destaque"
                style={{ maxHeight: 120, borderRadius: 8 }}
              />
            </div>
          )}
        </Form.Item>
        <Form.Item name="categories" label="Categorias">
          <Select
            mode="tags"
            placeholder="Selecione ou digite categorias"
            options={categorias.map((c) => ({ label: c.name, value: c.name }))}
          />
        </Form.Item>
        <Form.Item name="status" label="Status" initialValue="rascunho">
          <Select
            options={[
              { value: 'rascunho', label: 'Rascunho' },
              { value: 'publicado', label: 'Publicado' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
