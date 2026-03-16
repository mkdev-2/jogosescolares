import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

            // Cores originais dos badges
            const BADGE_COLORS = ['#0f766e', '#b45309', '#0369a1', '#0d9488']

            // Helper para carregar imagem e retornar dados (Preserva transparência e dimensões)
            const loadImg = (url, rounded = false) => new Promise((resolve) => {
                if (!url) { resolve(null); return; }
                const img = new Image()
                img.crossOrigin = 'Anonymous'
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const ratio = img.width / img.height
                    const size = rounded ? Math.min(img.width, img.height) : null
                    canvas.width = rounded ? size : img.width
                    canvas.height = rounded ? size : img.height
                    const ctx = canvas.getContext('2d')

                    if (rounded) {
                        ctx.beginPath()
                        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                        ctx.clip()
                        const xOffset = (img.width - size) / 2
                        const yOffset = (img.height - size) / 2
                        ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, size, size)
                    } else {
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        ctx.drawImage(img, 0, 0)
                    }
                    resolve({
                        data: canvas.toDataURL('image/png'),
                        ratio: ratio,
                        w: img.width,
                        h: img.height
                    })
                }
                img.onerror = () => resolve(null)
                img.src = url
            })

            const bgBase64 = bgUrl ? await loadImg(bgUrl) : null
            const logoSec = await loadImg(logoSecUrl)
            const logoJels = await loadImg(logoJelsUrl)

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const mainFont = 'helvetica'; // Revertendo para helvetica para evitar erros de cmap/unicode

            const pageWidth = doc.internal.pageSize.getWidth()
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

                // == 2. FUNDO ==
                if (bgBase64) {
                    doc.addImage(bgBase64.data, 'PNG', x, yOffset, cardW, cardH)
                } else {
                    doc.setDrawColor(15, 118, 110)
                    doc.setLineWidth(0.5)
                    doc.roundedRect(x, yOffset, cardW, cardH, 3, 3, 'S')
                    doc.setFillColor(15, 118, 110)
                    doc.rect(x, yOffset, cardW, 12, 'F')
                    doc.rect(x, yOffset + cardH - 2, cardW, 2, 'F')
                }

                // == 3. FOTO REDONDA (TAMANHO AJUSTADO) ==
                if (aluno.foto_url) {
                    const fotoRes = await loadImg(getStorageUrl(aluno.foto_url), true)
                    if (fotoRes) {
                        // Anel Externo
                        doc.setDrawColor(226, 232, 240)
                        doc.setLineWidth(0.6)
                        doc.circle(x + 25, yOffset + 42, 19.5, 'S')

                        // Borda principal (Verde JELS)
                        doc.setDrawColor(15, 118, 110)
                        doc.setLineWidth(1)
                        doc.setFillColor(241, 245, 249)
                        doc.circle(x + 25, yOffset + 42, 18, 'FD')
                        doc.addImage(fotoRes.data, 'PNG', x + 7, yOffset + 24, 36, 36)
                    }
                } else {
                    // Placeholder estilizado
                    doc.setDrawColor(226, 232, 240)
                    doc.setLineWidth(0.5)
                    doc.circle(x + 25, yOffset + 42, 19.5, 'S')

                    doc.setDrawColor(203, 213, 225)
                    doc.setFillColor(241, 245, 249)
                    doc.circle(x + 25, yOffset + 42, 18, 'FD')
                }
                // == 4. TEXTOS (COLUNA DIREITA COM SOMBRA) ==
                doc.setTextColor(0, 0, 0)
                let currentItemY = yOffset + 28;

                // Nome do Aluno - Efeito Sombra (Drop Shadow)
                doc.setFont(mainFont, 'bold')
                doc.setFontSize(15)
                const splitNome = doc.splitTextToSize(aluno.nome.toUpperCase(), 32)
                
                // Camada de Sombra
                doc.setTextColor(226, 232, 240)
                doc.text(splitNome, x + 48.3, currentItemY + 0.3)
                
                // Camada Principal
                doc.setTextColor(0, 0, 0)
                doc.text(splitNome, x + 48, currentItemY)

                // Calcula altura do nome para empurrar o próximo item (Mínimo 2 linhas)
                const nomeLineHeight = 6.2;
                const totalLineCount = Math.max(splitNome.length, 2);
                currentItemY += (totalLineCount * nomeLineHeight);

                // Escola
                doc.setFont(mainFont, 'normal')
                doc.setFontSize(12)
                doc.setTextColor(0, 0, 0)
                const splitEscola = doc.splitTextToSize(aluno.escola_nome, 36)
                doc.text(splitEscola, x + 48, currentItemY)

                // Empurra para a área do CPF
                const escolaLineHeight = 4.5;
                currentItemY += (splitEscola.length * escolaLineHeight) + 4;

                // Divisória mais visível
                doc.setDrawColor(203, 213, 225)
                doc.setLineWidth(0.4)
                doc.line(x + 48, currentItemY - 2, x + 82, currentItemY - 2)

                // CPF (Mesmo estilo e tamanho da escola agora)
                doc.setFont(mainFont, 'normal')
                doc.setFontSize(10)
                doc.setTextColor(0, 0, 0)
                doc.text(`CPF: ${estudantesService.formatCpf(aluno.cpf)}`, x + 48, currentItemY + 3)

                currentItemY += 8; // Ajuste para as tags não ficarem coladas

                // == MODALIDADES EM TAGS (AINDA MAIORES) ==
                if (aluno.modalidades && aluno.modalidades.length > 0) {
                    const tagGap = 2.5;
                    const tagH = 10; // Aumentado de 6.5 para 8mm
                    const maxAreaW = 82;

                    // 1. Agrupar em linhas
                    let lines = [[]];
                    let currentLineIdx = 0;
                    let currentLineWidth = 0;

                    aluno.modalidades.forEach((m, idx) => {
                        const label = `${m.esporte_nome} (${m.categoria_nome})`.toUpperCase();
                        doc.setFont(mainFont, 'bold');
                        doc.setFontSize(10); // Aumentado de 8 para 9pt
                        const tagW = doc.getTextWidth(label) + 8; // Mais largura interna

                        if (currentLineWidth + tagW > maxAreaW && lines[currentLineIdx].length > 0) {
                            currentLineIdx++;
                            lines[currentLineIdx] = [];
                            currentLineWidth = 0;
                        }

                        lines[currentLineIdx].push({ label, tagW, colorIdx: idx });
                        currentLineWidth += tagW + tagGap;
                    });

                    // 2. Desenhar as linhas centralizadas
                    let startY = yOffset + 76;
                    lines.forEach(line => {
                        const totalLineW = line.reduce((sum, item) => sum + item.tagW, 0) + (line.length - 1) * tagGap;
                        let lineX = x + (cardW - totalLineW) / 2;
                        
                        line.forEach(item => {
                            const color = BADGE_COLORS[item.colorIdx % BADGE_COLORS.length];
                            const rgb = color.match(/[A-Za-z0-9]{2}/g).map(h => parseInt(h, 16));
                            
                            // 1. Tag Principal (Fundo)
                            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                            doc.roundedRect(lineX, startY, item.tagW, tagH, tagH/2, tagH/2, 'F');
                            
                            // 2. Borda externa sutil (mais escura)
                            doc.setDrawColor(Math.max(0, rgb[0]-40), Math.max(0, rgb[1]-40), Math.max(0, rgb[2]-40));
                            doc.setLineWidth(0.15);
                            doc.roundedRect(lineX, startY, item.tagW, tagH, tagH/2, tagH/2, 'S');

                            // 3. Efeito de brilho/reflexo interno (topo)
                            doc.setDrawColor(255, 255, 255, 0.4);
                            doc.setLineWidth(0.1);
                            doc.line(lineX + tagH/2, startY + 0.5, lineX + item.tagW - tagH/2, startY + 0.5);

                            // 4. Texto centralizado
                            doc.setTextColor(255, 255, 255);
                            doc.text(item.label, lineX + 4, startY + 6.2);
                            lineX += item.tagW + tagGap;
                        });
                        startY += tagH + 3;
                    });
                }

                // Divisória do Rodapé mais visível
                const footerY = yOffset + 96
                doc.setDrawColor(148, 163, 184)
                doc.setLineWidth(0.5)
                doc.line(x + 5, footerY, x + cardW - 5, footerY)

                doc.setFont(mainFont, 'bold')
                doc.setFontSize(7)
                doc.setTextColor(148, 163, 184)
                doc.text('REALIZAÇÃO', x + cardW / 2, footerY + 5, { align: 'center' })

                const maxLogoW = 33
                const maxLogoH = 15
                const gapLogos = 8

                const getDims = (imgRes) => {
                    if (!imgRes) return null
                    let finalW = maxLogoW
                    let finalH = maxLogoW / imgRes.ratio
                    if (finalH > maxLogoH) {
                        finalH = maxLogoH
                        finalW = maxLogoH * imgRes.ratio
                    }
                    return { w: finalW, h: finalH }
                }

                const dSec = getDims(logoSec)
                const dJels = getDims(logoJels)
                const totalW = (dSec ? dSec.w : 0) + (dJels ? dJels.w : 0) + (dSec && dJels ? gapLogos : 0)
                let currentX = x + (cardW - totalW) / 2

                if (logoSec && dSec) {
                    doc.addImage(logoSec.data, 'PNG', currentX, footerY + 6 + (maxLogoH - dSec.h) / 2, dSec.w, dSec.h)
                    currentX += dSec.w + gapLogos
                }
                if (logoJels && dJels) {
                    doc.addImage(logoJels.data, 'PNG', currentX, footerY + 6 + (maxLogoH - dJels.h) / 2, dJels.w, dJels.h)
                }

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

            {gerandoPdf && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/80 backdrop-blur-md">
                    <div className="bg-white rounded-3xl p-12 flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-[#f1f5f9] max-w-sm w-full text-center">
                        <div className="relative">
                            <div className="w-16 h-16 border-[5px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <IdCard size={24} className="text-[#0f766e] opacity-40" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="m-0 text-xl font-bold text-[#042f2e]">Gerando Credenciais</h3>
                            <p className="m-0 text-[#64748b] font-medium">
                                {progressoPdf.total > 0 ? Math.round((progressoPdf.atual / progressoPdf.total) * 100) : 0}% concluído
                            </p>
                            <p className="text-sm text-[#94a3b8] m-0">
                                {progressoPdf.atual} de {progressoPdf.total} processadas
                            </p>
                        </div>
                        <div className="w-full bg-[#f1f5f9] h-3 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-[#0f766e] to-[#2dd4bf] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(15,118,110,0.3)]"
                                style={{ width: `${(progressoPdf.atual / (progressoPdf.total || 1)) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-[#94a3b8] italic">Por favor, não feche esta aba durante o processo.</p>
                    </div>
                </div>,
                document.body
            )}
        </Card>
    )
}
