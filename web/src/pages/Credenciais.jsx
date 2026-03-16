import { useState, useEffect, useCallback } from 'react'
import { Card, Form, Select, Space, Typography, Spin, Row, Col, Alert, Table, Tag } from 'antd'
import { Download, IdCard, Building2, User } from 'lucide-react'
import { estudantesService } from '../services/estudantesService'
import useEscolas from '../hooks/useEscolas'
import { configuracoesService } from '../services/configuracoesService'
import { getStorageUrl } from '../services/storageService'
import jsPDF from 'jspdf'

export default function Credenciais() {
    const [form] = Form.useForm()
    const { lista: listaEscolas, loading: loadingEscolas } = useEscolas()
    const [escolaSelecionada, setEscolaSelecionada] = useState(null)
    const [loadingEstudantes, setLoadingEstudantes] = useState(false)
    const [estudantesDaEscola, setEstudantesDaEscola] = useState([])
    const [gerandoPdf, setGerandoPdf] = useState(false)
    const [progressoPdf, setProgressoPdf] = useState({ atual: 0, total: 0 })
    const [escolasExportadas, setEscolasExportadas] = useState(() => {
        try {
            const raw = localStorage.getItem('credenciais_exportadas')
            return raw ? JSON.parse(raw) : {}
        } catch (e) {
            return {}
        }
    })

    const escolaObj = listaEscolas.find((e) => Number(e.id) === Number(escolaSelecionada))

    const fetchEstudantes = useCallback(async () => {
        if (!escolaSelecionada) {
            setEstudantesDaEscola([])
            return
        }
        setLoadingEstudantes(true)
        try {
            const data = await estudantesService.listarParaCredenciais(escolaSelecionada)
            setEstudantesDaEscola(data || [])
        } catch (err) {
            console.error(err)
            setEstudantesDaEscola([])
        } finally {
            setLoadingEstudantes(false)
        }
    }, [escolaSelecionada])

    useEffect(() => {
        fetchEstudantes()
    }, [fetchEstudantes])

    const handleGerarPdf = async () => {
        if (!escolaSelecionada || estudantesDaEscola.length === 0) {
            alert('Nenhum estudante encontrado para esta escola.')
            return
        }

        setGerandoPdf(true)
        setProgressoPdf({ atual: 0, total: estudantesDaEscola.length })

        try {
            // 1. Carregar mídias (logos e fundo)
            const midias = await configuracoesService.getLogos()
            const bgUrl = midias?.bg_credencial ? getStorageUrl(midias.bg_credencial) : null
            const logoSecUrl = midias?.logo_secretaria ? getStorageUrl(midias.logo_secretaria) : null
            const logoJelsUrl = midias?.logo_jels ? getStorageUrl(midias.logo_jels) : null

            // Helper para carregar imagem e retornar base64/buffer
            const loadImg = (url) => new Promise((resolve, reject) => {
                const img = new Image()
                img.crossOrigin = 'Anonymous'
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.width
                    canvas.height = img.height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0)
                    resolve(canvas.toDataURL('image/jpeg', 0.8))
                }
                img.onerror = reject
                img.src = url
            })

            let bgBase64 = null
            if (bgUrl) {
                try { bgBase64 = await loadImg(bgUrl) } catch (e) { console.warn('Erro ao carregar fundo:', e) }
            }

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const pageWidth = doc.internal.pageSize.getWidth()
            // Tamanho padrão credencial: 90x120mm
            const cardW = 90
            const cardH = 120
            const marginX = (pageWidth - cardW) / 2
            const topMargin = 15
            const gapY = 15

            for (let i = 0; i < estudantesDaEscola.length; i++) {
                const aluno = estudantesDaEscola[i]
                const indexInPage = i % 2
                if (i > 0 && indexInPage === 0) doc.addPage()

                const yOffset = indexInPage === 0 ? topMargin : topMargin + cardH + gapY
                const x = marginX

                // 2. Desenhar Fundo
                if (bgBase64) {
                    doc.addImage(bgBase64, 'JPEG', x, yOffset, cardW, cardH)
                } else {
                    // Fallback visual se não houver fundo
                    doc.setDrawColor(15, 118, 110)
                    doc.setLineWidth(1)
                    doc.roundedRect(x, yOffset, cardW, cardH, 5, 5, 'S')
                    doc.setFillColor(15, 118, 110)
                    doc.rect(x, yOffset, cardW, 12, 'F')
                }

                // 3. Foto do Aluno (42x42mm aprox)
                if (aluno.foto_url) {
                    try {
                        const fotoBase64 = await loadImg(getStorageUrl(aluno.foto_url))
                        // Tentar centralizar ou posicionar conforme layout (box esquerda)
                        // No CredencialCrachaPrint, a foto tem 42x42 numa área de padding 4mm
                        doc.setDrawColor(226, 232, 240)
                        doc.circle(x + 25, yOffset + 42, 21, 'S') // Borda círculo (opcional)
                        doc.addImage(fotoBase64, 'JPEG', x + 4, yOffset + 21, 42, 42)
                    } catch (e) {
                        console.warn('Erro foto aluno:', aluno.id)
                    }
                }

                // 4. Textos (Nativo jsPDF)
                doc.setTextColor(4, 47, 46) // #042f2e

                // Nome
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(14)
                const splitNome = doc.splitTextToSize(aluno.nome.toUpperCase(), 40)
                doc.text(splitNome, x + 50, yOffset + 26)

                // Instituição
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(11)
                const splitEscola = doc.splitTextToSize(aluno.escola_nome, 40)
                doc.text(splitEscola, x + 50, yOffset + 38)

                // CPF
                doc.setFontSize(9)
                doc.setTextColor(100, 116, 139) // #64748b
                doc.text('CPF', x + 50, yOffset + 54)
                doc.setTextColor(4, 47, 46)
                doc.setFont('courier', 'bold')
                doc.setFontSize(12)
                doc.text(estudantesService.formatCpf(aluno.cpf), x + 50, yOffset + 60)

                // Modalidades (concatenadas)
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(9)
                const modsText = aluno.modalidades.map(m => `${m.esporte_nome} (${m.categoria_nome} ${m.naipe_nome})`).join(' | ')
                const splitMods = doc.splitTextToSize(modsText, 80)
                doc.text(splitMods, x + 5, yOffset + 85, { align: 'left' })

                setProgressoPdf({ atual: i + 1, total: estudantesDaEscola.length })
            }

            const nomeArquivo = `credenciais-${(escolaObj?.nome_escola || 'escola').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
            doc.save(nomeArquivo)

            const novoExportadas = { ...escolasExportadas, [escolaSelecionada]: new Date().toISOString() }
            setEscolasExportadas(novoExportadas)
            localStorage.setItem('credenciais_exportadas', JSON.stringify(novoExportadas))

        } catch (err) {
            console.error(err)
            alert('Erro ao gerar PDF. Verifique se as imagens estão acessíveis.')
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
                            Gere centenas de credenciais em segundos usando o novo motor de exportação direta em PDF.
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
                                        onChange={setEscolaSelecionada}
                                        style={{ width: '100%' }}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label || '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        options={listaEscolas.map((escola) => ({
                                            label: escola.nome_escola,
                                            value: escola.id,
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        {escolaSelecionada && (
                            <Alert
                                message={
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <div><strong>Escola:</strong> {escolaObj?.nome_escola}</div>
                                        <div><strong>Total de Estudantes:</strong> {estudantesDaEscola.length}</div>
                                    </Space>
                                }
                                type="info"
                                showIcon
                                icon={<Building2 size={20} />}
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        {escolasExportadas[escolaSelecionada] && (
                            <Alert
                                message={
                                    <span>
                                        Exportado em: <strong>{new Date(escolasExportadas[escolaSelecionada]).toLocaleString('pt-BR')}</strong>
                                    </span>
                                }
                                type="success"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        {escolaSelecionada && estudantesDaEscola.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0f766e] text-white hover:bg-[#0d6961] border-0 cursor-pointer disabled:opacity-60 font-bold shadow-lg transition-all"
                                    onClick={handleGerarPdf}
                                    disabled={gerandoPdf}
                                >
                                    {gerandoPdf ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Download size={20} />
                                    )}
                                    {gerandoPdf ? 'Processando...' : 'GERAR PDF (MOLDE TIMBRADO)'}
                                </button>
                            </div>
                        )}
                    </Form>

                    {escolaSelecionada && estudantesDaEscola.length > 0 && (
                        <Card size="small" title={`Estudantes Encontrados (${estudantesDaEscola.length})`}>
                            <Table
                                dataSource={estudantesDaEscola}
                                rowKey="id"
                                pagination={{ pageSize: 15 }}
                                size="small"
                                columns={[
                                    {
                                        title: 'Nome',
                                        dataIndex: 'nome',
                                        render: (n) => <Typography.Text strong>{n}</Typography.Text>
                                    },
                                    {
                                        title: 'CPF',
                                        dataIndex: 'cpf',
                                        render: (c) => estudantesService.formatCpf(c)
                                    },
                                    {
                                        title: 'Modalidades',
                                        dataIndex: 'modalidades',
                                        render: (mods) => (
                                            <Space wrap>
                                                {mods.map((m, idx) => (
                                                    <Tag key={idx} color="blue">{m.esporte_nome}</Tag>
                                                ))}
                                                {mods.length === 0 && <span className="text-gray-400 italic">Nenhuma</span>}
                                            </Space>
                                        )
                                    }
                                ]}
                            />
                        </Card>
                    )}
                </Space>
            </Spin>

            {gerandoPdf && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full">
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#0f766e] rounded-full animate-spin" />
                        <h3 className="m-0 text-[#0f766e]">Gerando Credenciais</h3>
                        <p className="m-0 text-gray-500">
                            {progressoPdf.atual} de {progressoPdf.total} processadas
                        </p>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#0f766e] transition-all"
                                style={{ width: `${(progressoPdf.atual / progressoPdf.total) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </Card>
    )
}
