import { useState, useRef } from 'react'
import { Card, Form, Select, Space, Typography, Spin, Row, Col, Alert, Table, Tag } from 'antd'
import { Download, IdCard, Building2, User } from 'lucide-react'
import { createPortal } from 'react-dom'
import useEstudantes from '../hooks/useEstudantes'
import useEscolas from '../hooks/useEscolas'
import CredencialCrachaPrint from '../components/catalogos/CredencialCrachaPrint'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function Credenciais() {
    const [form] = Form.useForm()
    const { lista: listaEstudantes, loading: loadingEstudantes } = useEstudantes()
    const { lista: listaEscolas, loading: loadingEscolas } = useEscolas()
    const [escolaSelecionada, setEscolaSelecionada] = useState(null)
    const [gerandoPdf, setGerandoPdf] = useState(false)
    const [progressoPdf, setProgressoPdf] = useState({ atual: 0, total: 0 })
    const credenciaisRefs = useRef([])

    const estudantesDaEscola = listaEstudantes.filter(
        (e) => escolaSelecionada && Number(e.escola_id) === Number(escolaSelecionada)
    )

    const escolaObj = listaEscolas.find((e) => Number(e.id) === Number(escolaSelecionada))

    const handleGerarPdf = async () => {
        if (!escolaSelecionada || estudantesDaEscola.length === 0) {
            alert('Nenhum estudante encontrado para esta escola.')
            return
        }

        setGerandoPdf(true)
        setProgressoPdf({ atual: 0, total: estudantesDaEscola.length })

        // Aguarda um pouco para os componentes montarem e as imagens (logos/fotos) carregarem
        await new Promise((r) => setTimeout(r, 2000))

        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const pageWidth = doc.internal.pageSize.getWidth()
            const cardWidth = 90
            const cardHeight = 120
            const marginX = (pageWidth - cardWidth) / 2
            const firstY = 15
            const gapY = 15

            let capturadas = 0
            for (let i = 0; i < estudantesDaEscola.length; i++) {
                const refEl = credenciaisRefs.current[i]
                if (!refEl) {
                    console.warn(`Ref não encontrada para credencial ${i}`)
                    continue
                }

                const cardEl = refEl.querySelector?.('.cracha-card') || refEl
                cardEl.scrollIntoView({ behavior: 'instant', block: 'center' })
                await new Promise((r) => setTimeout(r, 150))

                const canvas = await html2canvas(cardEl, {
                    scale: 3,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    onclone: (_clonedDoc, clonedEl) => {
                        if (clonedEl) {
                            clonedEl.style.overflow = 'visible'
                            const textArea = clonedEl.querySelector('[data-credencial-texto]')
                            if (textArea) textArea.style.overflow = 'visible'
                        }
                    },
                })
                const imgData = canvas.toDataURL('image/png')

                const indexInPage = i % 2
                if (i > 0 && indexInPage === 0) {
                    doc.addPage()
                }

                const y = indexInPage === 0 ? firstY : firstY + cardHeight + gapY
                doc.addImage(imgData, 'PNG', marginX, y, cardWidth, cardHeight)
                capturadas++
                setProgressoPdf({ atual: capturadas, total: estudantesDaEscola.length })
            }

            if (capturadas === 0) {
                alert('Não foi possível capturar as credenciais. Tente novamente.')
                return
            }

            const nomeArquivo = `credenciais-${(escolaObj?.nome_escola || 'escola').replace(/[^a-zA-Z0-9-_àáâãéêíóôõúç\s]/gi, '_')}.pdf`
            doc.save(nomeArquivo)
        } catch (err) {
            console.error(err)
            alert('Erro ao gerar PDF das credenciais. Tente novamente.')
        } finally {
            setGerandoPdf(false)
        }
    }

    return (
        <Card bordered={false} className="shadow-sm">
            <Spin spinning={loadingEscolas || loadingEstudantes}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Space direction="vertical" size="small">
                        <Typography.Title level={4} style={{ margin: 0 }}>
                            <Space>
                                <IdCard size={24} className="text-[#0f766e]" />
                                Gerador de Credenciais
                            </Space>
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            Gere as credenciais dos estudantes vinculados a uma escola específica em formato otimizado para impressão (PDF A4).
                        </Typography.Text>
                    </Space>

                    <Form form={form} layout="vertical">
                        <Row gutter={16}>
                            <Col xs={24} sm={24} md={12}>
                                <Form.Item
                                    label="Selecione a Escola"
                                    required
                                    rules={[{ required: true, message: 'Selecione uma escola' }]}
                                >
                                    <Select
                                        placeholder="Selecione uma escola..."
                                        value={escolaSelecionada}
                                        onChange={(val) => {
                                            setEscolaSelecionada(val)
                                            credenciaisRefs.current = [] // Limpar refs ao mudar
                                        }}
                                        style={{ width: '100%' }}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label || '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        options={listaEscolas.map((escola) => ({
                                            label: escola.nome_escola,
                                            value: escola.id,
                                        }))}
                                        notFoundContent={loadingEscolas ? <Spin size="small" /> : 'Nenhuma escola encontrada'}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        {escolaSelecionada && (
                            <Alert
                                message={
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <div>
                                            <strong>Escola:</strong> {escolaObj?.nome_escola}
                                        </div>
                                        <div>
                                            <strong>Total de Estudantes:</strong> {estudantesDaEscola.length}
                                        </div>
                                    </Space>
                                }
                                type="info"
                                showIcon
                                icon={<Building2 size={20} />}
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        {escolaSelecionada && estudantesDaEscola.length > 0 && (
                            <Space direction="vertical" size="small" style={{ marginTop: 16, width: '100%' }}>
                                <Typography.Text strong>Ações</Typography.Text>
                                <div>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0f766e] text-white hover:bg-[#0d6961] border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-sm transition-all"
                                        onClick={handleGerarPdf}
                                        disabled={gerandoPdf}
                                    >
                                        {gerandoPdf ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Download size={20} />
                                        )}
                                        {gerandoPdf ? 'Processando...' : 'Gerar PDF de Credenciais'}
                                    </button>
                                </div>
                            </Space>
                        )}
                    </Form>

                    {/* Tabela de Pré-visualização */}
                    {escolaSelecionada && estudantesDaEscola.length > 0 && (
                        <Card size="small" style={{ marginTop: 16 }}>
                            <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
                                <Typography.Text strong>
                                    Pré-visualização dos {estudantesDaEscola.length} aluno{estudantesDaEscola.length !== 1 ? 's' : ''} encontrado{estudantesDaEscola.length !== 1 ? 's' : ''}
                                </Typography.Text>
                            </Space>
                            <Table
                                dataSource={estudantesDaEscola}
                                rowKey="id"
                                pagination={{ pageSize: 10 }}
                                size="small"
                                columns={[
                                    {
                                        title: 'Nome',
                                        dataIndex: 'nome',
                                        key: 'nome',
                                        sorter: (a, b) => (a.nome || '').localeCompare(b.nome || ''),
                                        render: (nome) => (
                                            <Space>
                                                <User size={16} className="text-[#64748b]" />
                                                <Typography.Text strong>{nome || 'Sem nome'}</Typography.Text>
                                            </Space>
                                        )
                                    },
                                    {
                                        title: 'Data de Nascimento',
                                        dataIndex: 'data_nascimento',
                                        key: 'data_nascimento',
                                        width: 150,
                                        render: (data) => data ? new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
                                        sorter: (a, b) => {
                                            const dataA = a.data_nascimento ? new Date(a.data_nascimento) : new Date(0);
                                            const dataB = b.data_nascimento ? new Date(b.data_nascimento) : new Date(0);
                                            return dataA - dataB;
                                        }
                                    },
                                    {
                                        title: 'Sexo',
                                        dataIndex: 'sexo',
                                        key: 'sexo',
                                        width: 120,
                                        render: (sexo) => {
                                            const valor = sexo || '';
                                            if (!valor) return '-';
                                            const valorUpper = valor.toString().toUpperCase().trim();
                                            if (valorUpper === 'M' || valorUpper === 'MASCULINO' || valorUpper === 'MASC') {
                                                return <Tag color="blue">Masculino</Tag>;
                                            }
                                            if (valorUpper === 'F' || valorUpper === 'FEMININO' || valorUpper === 'FEM') {
                                                return <Tag color="pink">Feminino</Tag>;
                                            }
                                            return <Tag>{valor}</Tag>;
                                        },
                                        filters: [
                                            { text: 'Masculino', value: 'M' },
                                            { text: 'Feminino', value: 'F' },
                                        ],
                                        onFilter: (value, record) => {
                                            const sexo = (record.sexo || '').toString().toUpperCase().trim();
                                            if (value === 'M') {
                                                return sexo === 'M' || sexo === 'MASCULINO' || sexo === 'MASC';
                                            }
                                            if (value === 'F') {
                                                return sexo === 'F' || sexo === 'FEMININO' || sexo === 'FEM';
                                            }
                                            return false;
                                        }
                                    },
                                    {
                                        title: 'CPF',
                                        dataIndex: 'cpf',
                                        key: 'cpf',
                                        width: 160,
                                        render: (cpf) => <Typography.Text copyable>{cpf || '-'}</Typography.Text>
                                    }
                                ]}
                            />
                        </Card>
                    )}
                </Space>
            </Spin>

            {/* Contêiner "escondido" que renderiza as credenciais silenciosamente para o html2canvas ler */}
            {escolaSelecionada && (
                <div
                    className="fixed top-0 left-0 w-0 h-0 opacity-[0.01] pointer-events-none -z-[50] overflow-visible"
                    data-bulk-root
                >
                    {estudantesDaEscola.map((estudante, index) => (
                        <CredencialCrachaPrint
                            key={estudante.id}
                            ref={(el) => {
                                if (el) credenciaisRefs.current[index] = el
                            }}
                            estudante={estudante}
                            showToolbar={false}
                            layoutMode="single"
                            disablePrintStyles
                        />
                    ))}
                </div>
            )}

            {gerandoPdf &&
                createPortal(
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/90 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl px-12 py-10 flex flex-col items-center gap-6 shadow-2xl border border-[#f1f5f9] max-w-sm w-full text-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-14 h-14 border-[4px] border-[#e2e8f0] border-t-[#0f766e] border-r-[#0f766e] rounded-full animate-spin shadow-sm" />
                            </div>
                            <div className="w-full space-y-2">
                                <h3 className="text-[1.25rem] font-bold text-[#0f766e] m-0">Gerando PDF</h3>
                                <p className="text-[0.9375rem] text-[#64748b] m-0">
                                    Processando {progressoPdf.atual} de {progressoPdf.total} credenciais...
                                </p>
                                <div className="w-full bg-[#f1f5f9] h-2.5 rounded-full overflow-hidden mt-4 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#0f766e] to-[#0d9488] transition-all duration-300 ease-out"
                                        style={{ width: `${Math.max(2, (progressoPdf.atual / (progressoPdf.total || 1)) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-[0.8125rem] text-[#94a3b8] m-0 mt-4 px-2 tracking-wide font-medium">
                                    Por favor, aguarde.
                                </p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </Card>
    )
}
