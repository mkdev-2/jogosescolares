import { Card, Tag, Space, Button, Row, Col, Empty } from 'antd'
import { EditOutlined, DeleteOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons'
import { noticiasService } from '../../../services/noticiasService'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function NoticiaGrid({ noticias, loading, onEdit, onDelete }) {
  if (!loading && (!noticias || noticias.length === 0)) {
    return <Empty description="Nenhuma notícia encontrada" style={{ padding: '40px' }} />
  }

  return (
    <div className="mt-4 sm:mt-6">
      <Row gutter={[12, 12]}>
        {(noticias || []).map((noticia) => (
          <Col xs={24} sm={12} md={8} lg={6} key={noticia.id}>
            <Card
              hoverable
              cover={
                <div style={{ height: '150px', overflow: 'hidden', background: '#f5f5f5', position: 'relative' }}>
                  {noticia.featured_image_url ? (
                    <img
                      alt={noticia.title}
                      src={noticiasService.getStorageUrl(noticia.featured_image_url) || noticia.featured_image_url}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <FileTextOutlined style={{ fontSize: 48, color: '#ccc' }} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <Tag color={noticia.status === 'publicado' ? 'green' : 'gold'} style={{ marginRight: 0 }}>
                      {noticia.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                    </Tag>
                  </div>
                </div>
              }
              actions={[
                <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(noticia)} key="edit">
                  Editar
                </Button>,
                <Button type="link" danger icon={<DeleteOutlined />} onClick={() => onDelete(noticia.id)} key="del">
                  Excluir
                </Button>,
              ]}
              style={{ borderRadius: 12, overflow: 'hidden', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              <Card.Meta
                title={
                  <div style={{ whiteSpace: 'normal', height: '3em', overflow: 'hidden' }}>{noticia.title}</div>
                }
                description={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      {formatDate(noticia.created_at)}
                    </div>
                    <div style={{ height: '3em', overflow: 'hidden', color: '#595959', fontSize: 13 }}>
                      {noticia.summary || 'Sem resumo disponível...'}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {(noticia.categories || []).slice(0, 2).map((cat) => (
                        <Tag key={cat}>{cat}</Tag>
                      ))}
                    </div>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
