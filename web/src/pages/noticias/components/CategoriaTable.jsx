import { Table, Button, Space, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'

export default function CategoriaTable({ categorias, loading, onEdit, onDelete }) {
  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name', render: (t) => <span className="font-medium">{t}</span> },
    { title: 'Slug', dataIndex: 'slug', key: 'slug', render: (t) => <span className="text-slate-500">{t}</span> },
    {
      title: 'Cor',
      dataIndex: 'color',
      key: 'color',
      render: (color) =>
        color ? (
          <span className="inline-flex items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
            {color}
          </span>
        ) : (
          '-'
        ),
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
            title="Excluir esta categoria?"
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
    <Table
      columns={columns}
      dataSource={categorias || []}
      loading={loading}
      rowKey="id"
      pagination={{ pageSize: 10, showTotal: (t) => `Total: ${t} categorias` }}
    />
  )
}
