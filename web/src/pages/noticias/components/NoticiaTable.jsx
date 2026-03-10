import { Table, Button, Space, Tag, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function NoticiaTable({ noticias, loading, onEdit, onDelete }) {
  const columns = [
    {
      title: 'Título',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      fixed: 'left',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{text}</span>
          <span style={{ fontSize: 12, color: '#666' }}>/{record.slug}</span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'publicado' ? 'green' : 'gold'}>
          {status === 'publicado' ? 'Publicado' : 'Rascunho'}
        </Tag>
      ),
    },
    {
      title: 'Data de Criação',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => formatDate(date),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            Editar
          </Button>
          <Popconfirm
            title="Deseja excluir esta notícia?"
            onConfirm={() => onDelete(record.id)}
            okText="Sim"
            cancelText="Não"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Excluir
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <Table
        columns={columns}
        dataSource={noticias || []}
        loading={loading}
        rowKey="id"
        scroll={{ x: 600 }}
        size="small"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Total: ${total} publicações`,
          showSizeChanger: false,
          responsive: true,
        }}
      />
    </div>
  )
}
