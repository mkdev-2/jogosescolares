import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Button, message, Upload, Steps, Alert, Divider, DatePicker } from 'antd'
import { SaveOutlined, SyncOutlined, UploadOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { noticiasService } from '../../../services/noticiasService'
import { uploadImagemNoticia } from '../../../services/storageService'
import RichTextEditor from '../../../components/ui/RichTextEditor'

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
  const [currentStep, setCurrentStep] = useState(0)
  const [slugStatus, setSlugStatus] = useState('auto')
  const [categorias, setCategorias] = useState([])
  const [featuredFileList, setFeaturedFileList] = useState([])
  const [galleryFileList, setGalleryFileList] = useState([])

  const steps = [
    { title: 'Básico' },
    { title: 'Conteúdo' },
    { title: 'Categorias' },
    { title: 'Mídia' },
    { title: 'Status' },
  ]

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
          event_date: editingNoticia.event_date ? dayjs(editingNoticia.event_date) : null,
        })
        setSlugStatus('manual')
        setFeaturedFileList(
          editingNoticia.featured_image_url
            ? [
                {
                  uid: '-1',
                  name: 'featured.jpg',
                  status: 'done',
                  url: noticiasService.getStorageUrl(editingNoticia.featured_image_url) || editingNoticia.featured_image_url,
                },
              ]
            : []
        )
        setGalleryFileList(
          (editingNoticia.gallery_urls || []).map((url, i) => ({
            uid: `g-${i}`,
            name: `galeria-${i}.jpg`,
            status: 'done',
            url: noticiasService.getStorageUrl(url) || url,
          }))
        )
      } else {
        form.resetFields()
        form.setFieldsValue({ status: 'rascunho', categories: [] })
        setCurrentStep(0)
        setSlugStatus('auto')
        setFeaturedFileList([])
        setGalleryFileList([])
      }
    }
  }, [visible, editingNoticia, form])

  const handleTitleChange = (e) => {
    const title = e?.target?.value
    if (title && slugStatus === 'auto') {
      form.setFieldsValue({ slug: generateSlug(title) })
    }
  }

  const handleSlugChange = () => setSlugStatus('manual')

  const regenerateSlug = () => {
    const title = form.getFieldValue('title')
    if (title) {
      form.setFieldsValue({ slug: generateSlug(title) })
      setSlugStatus('auto')
      message.success('Slug atualizado')
    }
  }

  const nextStep = async () => {
    try {
      if (currentStep === 0) await form.validateFields(['title', 'slug'])
      if (currentStep === 1) await form.validateFields(['content'])
      setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))
    } catch {
      // validação falhou
    }
  }

  const prevStep = () => setCurrentStep((prev) => Math.max(0, prev - 1))

  const handleSubmit = async () => {
    try {
      await form.validateFields()
      setLoading(true)
      const values = form.getFieldsValue(true)

      let featured_image_url = editingNoticia?.featured_image_url || null
      if (featuredFileList.length > 0 && featuredFileList[0].originFileObj) {
        featured_image_url = await uploadImagemNoticia(featuredFileList[0].originFileObj, 'destaque')
      } else if (featuredFileList.length === 0) {
        featured_image_url = null
      } else if (editingNoticia?.featured_image_url && featuredFileList[0]?.url) {
        featured_image_url = editingNoticia.featured_image_url
      }

      const galleryUrls = []
      galleryFileList
        .filter((f) => f.status === 'done' && f.url && !f.originFileObj)
        .forEach((f) => galleryUrls.push(f.url))
      for (const f of galleryFileList.filter((x) => x.originFileObj)) {
        const url = await uploadImagemNoticia(f.originFileObj, 'galeria')
        galleryUrls.push(url)
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
        gallery_urls: galleryUrls,
        documents: null,
        is_active: true,
        event_date: values.event_date && dayjs.isDayjs(values.event_date) ? values.event_date.toISOString() : values.event_date || null,
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
      message.error(err?.message || 'Erro ao salvar notícia')
    } finally {
      setLoading(false)
    }
  }

  const renderFooter = () => (
    <>
      <Button onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      {currentStep > 0 && (
        <Button onClick={prevStep} disabled={loading}>
          Anterior
        </Button>
      )}
      {currentStep < steps.length - 1 ? (
        <Button type="primary" onClick={nextStep} disabled={loading}>
          Próximo
        </Button>
      ) : (
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={loading}>
          {editingNoticia ? 'Salvar alterações' : 'Salvar publicação'}
        </Button>
      )}
    </>
  )

  return (
    <Modal
      title={editingNoticia ? 'Editar notícia' : 'Nova notícia'}
      open={visible}
      onCancel={onClose}
      footer={renderFooter()}
      width={900}
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
      destroyOnClose
    >
      <Steps
        current={currentStep}
        items={steps}
        size="small"
        style={{ marginBottom: 24 }}
        onChange={(step) => {
          if (step < currentStep) setCurrentStep(step)
        }}
      />

      <Form form={form} layout="vertical">
        {/* Step 0: Básico */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Form.Item
            name="title"
            label="Título da notícia"
            rules={[{ required: true, message: 'O título é obrigatório' }]}
          >
            <Input placeholder="Ex: Título da notícia" onChange={handleTitleChange} />
          </Form.Item>
          <Form.Item
            name="slug"
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>Slug (URL amigável)</span>
                <Button type="link" size="small" icon={<SyncOutlined />} onClick={regenerateSlug}>
                  Regenerar
                </Button>
              </div>
            }
            rules={[{ required: true, message: 'O slug é obrigatório' }]}
            extra="O slug é usado na URL da notícia. Ex: /noticias/seu-slug"
          >
            <Input placeholder="seu-slug-aqui" onChange={handleSlugChange} addonBefore="/" />
          </Form.Item>
        </div>

        {/* Step 1: Conteúdo */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Form.Item
            name="content"
            label="Corpo da notícia"
            rules={[{ required: true, message: 'O conteúdo é obrigatório' }]}
            trigger="onChange"
            valuePropName="value"
          >
            <RichTextEditor placeholder="Escreva aqui o conteúdo completo da notícia..." />
          </Form.Item>
          <Alert
            message="Dica: Use a barra de ferramentas para formatar o texto."
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        </div>

        {/* Step 2: Categorias */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <Form.Item
            name="categories"
            label="Categorias"
            extra="Selecione ou digite categorias"
          >
            <Select
              mode="tags"
              placeholder="Selecione categorias"
              style={{ width: '100%' }}
              options={categorias.map((c) => ({
                value: c.name,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.color && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: c.color,
                        }}
                      />
                    )}
                    {c.name}
                  </div>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="summary"
            label="Resumo (opcional)"
            extra="Breve resumo para exibição nos cards da listagem"
          >
            <TextArea rows={3} placeholder="Breve descrição sobre o que trata esta notícia..." />
          </Form.Item>
        </div>

        {/* Step 3: Mídia */}
        <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
          <Form.Item label="Imagem de destaque">
            <Upload
              listType="picture-card"
              fileList={featuredFileList}
              onChange={({ fileList }) => setFeaturedFileList(fileList.slice(-1))}
              onRemove={() => setFeaturedFileList([])}
              beforeUpload={() => false}
              accept="image/*"
            >
              {featuredFileList.length < 1 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Upload capa</div>
                </div>
              )}
            </Upload>
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
              * Esta imagem aparecerá nos cards e no topo da notícia.
            </p>
          </Form.Item>
          <Divider />
          <Form.Item label="Galeria de imagens">
            <Upload
              listType="picture-card"
              fileList={galleryFileList}
              onChange={({ fileList }) => setGalleryFileList(fileList.slice(0, 12))}
              beforeUpload={() => false}
              accept="image/*"
              multiple
            >
              {galleryFileList.length < 12 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Adicionar</div>
                </div>
              )}
            </Upload>
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
              * Você pode selecionar múltiplas imagens para a galeria (máx. 12).
            </p>
          </Form.Item>
        </div>

        {/* Step 4: Status */}
        <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="status" label="Status da publicação">
              <Select
                options={[
                  { value: 'rascunho', label: 'Rascunho' },
                  { value: 'publicado', label: 'Publicado' },
                ]}
              />
            </Form.Item>
            <Form.Item name="event_date" label="Data do evento (opcional)">
              <DatePicker showTime style={{ width: '100%' }} placeholder="Selecione data e hora" />
            </Form.Item>
          </div>
          <Divider />
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Resumo das configurações</h4>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
              {({ getFieldValue }) => {
                const status = getFieldValue('status')
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Visível no site:</span>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: status === 'publicado' ? '#dcfce7' : '#fef3c7',
                        color: status === 'publicado' ? '#166534' : '#b45309',
                        fontWeight: 500,
                      }}
                    >
                      {status === 'publicado' ? 'Sim' : 'Não (rascunho)'}
                    </span>
                  </div>
                )
              }}
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  )
}
