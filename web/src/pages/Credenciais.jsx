import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Card, Form, Select, Space, Typography, Spin, Row, Col, Alert, Table, Tag } from 'antd'
import { Download, IdCard, Building2, User } from 'lucide-react'
import { estudantesService } from '../services/estudantesService'
import useEscolas from '../hooks/useEscolas'
import { configuracoesService } from '../services/configuracoesService'
import { fetchStorageBlob } from '../services/storageService'
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
    const [credenciaisGeradasPorEscola, setCredenciaisGeradasPorEscola] = useState(() => {
        try {
            const raw = localStorage.getItem('credenciais_alunos_exportados')
            return raw ? JSON.parse(raw) : {}
        } catch (e) {
            return {}
        }
    })
    const [filtroGeracao, setFiltroGeracao] = useState('todos')

    const escolaObj = listaEscolas.find((e) => Number(e.id) === Number(escolaSelecionada))
    const estudantesComDocumentoAssinado = estudantesDaEscola.filter(
        (aluno) => !!String(aluno?.documentacao_assinada_url || '').trim()
    )
    const estudantesComAssinaturaPendente = estudantesDaEscola.length - estudantesComDocumentoAssinado.length
    const credenciaisDaEscola = credenciaisGeradasPorEscola[String(escolaSelecionada)] || {}
    const estudantesSemCredencialGerada = estudantesDaEscola.filter(
        (aluno) => !credenciaisDaEscola[String(aluno.id)]
    )
    const estudantesAptosSemCredencialGerada = estudantesSemCredencialGerada.filter(
        (aluno) => !!String(aluno?.documentacao_assinada_url || '').trim()
    )
    const estudantesSelecionadosParaGeracao = filtroGeracao === 'nao-geradas'
        ? estudantesAptosSemCredencialGerada
        : estudantesComDocumentoAssinado
    const estudantesExibidosNaTabela = filtroGeracao === 'nao-geradas'
        ? estudantesSemCredencialGerada
        : estudantesComDocumentoAssinado

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

        if (estudantesSelecionadosParaGeracao.length === 0) {
            if (filtroGeracao === 'nao-geradas') {
                alert('Nenhum estudante apto sem credencial gerada para esta escola.')
            } else {
                alert('Nenhum estudante com status "Documento assinado" para esta escola.')
            }
            return
        }

        setGerandoPdf(true)
        setProgressoPdf({ atual: 0, total: estudantesSelecionadosParaGeracao.length })

        try {
            await estudantesService.auditarGeracaoCredenciais(escolaSelecionada)

            // 1. Carregar mídias (logos e fundo)
            const midias = await configuracoesService.getLogos()

            // Cores originais dos badges (Substituído Laranja por Roxo)
            const BADGE_COLORS = ['#0f766e', '#6b21a8', '#0369a1', '#0d9488']

            // Carrega via fetch com JWT (gateway pode bloquear <img src> sem Authorization)
            const loadImg = async (storagePath, rounded = false) => {
                if (!storagePath) return null
                let blobUrl = null
                try {
                    const blob = await fetchStorageBlob(storagePath)
                    blobUrl = URL.createObjectURL(blob)
                    const img = new Image()
                    img.crossOrigin = 'anonymous'
                    await new Promise((resolve, reject) => {
                        img.onload = resolve
                        img.onerror = reject
                        img.src = blobUrl
                    })
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
                    return {
                        data: canvas.toDataURL('image/png'),
                        ratio: ratio,
                        w: img.width,
                        h: img.height
                    }
                } catch {
                    return null
                } finally {
                    if (blobUrl) URL.revokeObjectURL(blobUrl)
                }
            }

            const bgBase64 = midias?.bg_credencial ? await loadImg(midias.bg_credencial) : null
            const logoSec = await loadImg(midias?.logo_secretaria)
            const logoJels = await loadImg(midias?.logo_jels)

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const mainFont = 'helvetica'; // Revertendo para helvetica para evitar erros de cmap/unicode

            const pageWidth = doc.internal.pageSize.getWidth()
            const cardW = 90
            const cardH = 120
            const marginX = (pageWidth - cardW) / 2
            const topMargin = 15
            const gapY = 15

            for (let i = 0; i < estudantesSelecionadosParaGeracao.length; i++) {
                const aluno = estudantesSelecionadosParaGeracao[i]
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
                    const fotoRes = await loadImg(aluno.foto_url, true)
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

                    // 2. Desenhar as linhas centralizadas (Subindo a altura inicial para não pegar o rodapé)
                    let startY = yOffset + 68;
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

                setProgressoPdf({ atual: i + 1, total: estudantesSelecionadosParaGeracao.length })
            }

            const nomeArquivo = `credenciais-${(escolaObj?.nome_escola || 'escola').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
            doc.save(nomeArquivo)

            const novoExportadas = { ...escolasExportadas, [escolaSelecionada]: new Date().toISOString() }
            setEscolasExportadas(novoExportadas)
            localStorage.setItem('credenciais_exportadas', JSON.stringify(novoExportadas))

            const escolaKey = String(escolaSelecionada)
            const baseEscola = credenciaisGeradasPorEscola[escolaKey] || {}
            const novosIds = estudantesSelecionadosParaGeracao.reduce((acc, aluno) => {
                acc[String(aluno.id)] = new Date().toISOString()
                return acc
            }, {})
            const novoMapaCredenciais = {
                ...credenciaisGeradasPorEscola,
                [escolaKey]: {
                    ...baseEscola,
                    ...novosIds,
                },
            }
            setCredenciaisGeradasPorEscola(novoMapaCredenciais)
            localStorage.setItem('credenciais_alunos_exportados', JSON.stringify(novoMapaCredenciais))

        } catch (err) {
            console.error(err)
            alert('Erro ao gerar PDF. Verifique se as imagens estão acessíveis.')
        } finally {
            setGerandoPdf(false)
        }
    }

    return (
        <div className="bg-white sm:rounded-[12px] border-y sm:border border-[#f1f5f9] shadow-none sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] -mx-4 sm:mx-0 p-4 sm:p-6">
            <Spin spinning={loadingEscolas || loadingEstudantes}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div className="flex flex-col gap-2">
                        <Typography.Title level={4} style={{ margin: 0, fontSize: 'clamp(1.125rem, 4vw, 1.5rem)' }}>
                            <Space align="start">
                                <IdCard size={28} className="text-[#0f766e] shrink-0 mt-1" />
                                <span className="leading-tight">Gerador de Credenciais</span>
                            </Space>
                        </Typography.Title>
                    </div>
                    <Alert
                        type="warning"
                        showIcon
                        message="A geração de credenciais é permitida apenas para alunos com status 'Documento assinado'."
                    />

                    <Form form={form} layout="vertical" className="mt-2">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={24} md={12}>
                                <Form.Item
                                    label="Selecione a Escola"
                                    required
                                    rules={[{ required: true, message: 'Selecione uma escola' }]}
                                    style={{ marginBottom: 12 }}
                                >
                                    <Select
                                        placeholder="Selecione uma escola..."
                                        value={escolaSelecionada}
                                        onChange={setEscolaSelecionada}
                                        style={{ width: '100%', height: 45 }}
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
                            <Col xs={24} sm={24} md={12}>
                                <Form.Item
                                    label="Filtro de geração"
                                    style={{ marginBottom: 12 }}
                                >
                                    <Select
                                        value={filtroGeracao}
                                        onChange={setFiltroGeracao}
                                        style={{ width: '100%', height: 45 }}
                                        options={[
                                            { label: 'Todos os aptos (Documento assinado)', value: 'todos' },
                                            { label: 'Somente sem credencial gerada', value: 'nao-geradas' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        {escolaSelecionada && (
                            <div className="mb-4">
                                <Alert
                                    message={
                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                            <div className="text-[0.875rem] sm:text-[1rem]"><strong>Escola:</strong> {escolaObj?.nome_escola}</div>
                                            <div className="text-[0.875rem] sm:text-[1rem]"><strong>Total de Estudantes:</strong> {estudantesDaEscola.length}</div>
                                            <div className="text-[0.875rem] sm:text-[1rem]"><strong>Documento assinado:</strong> {estudantesComDocumentoAssinado.length}</div>
                                            <div className="text-[0.875rem] sm:text-[1rem]"><strong>Assinatura pendente:</strong> {estudantesComAssinaturaPendente}</div>
                                        </Space>
                                    }
                                    type="info"
                                    showIcon
                                    icon={<Building2 size={20} />}
                                />
                            </div>
                        )}

                        {escolasExportadas[escolaSelecionada] && (
                            <div className="mb-4">
                                <Alert
                                    message={
                                        <span className="text-[0.875rem]">
                                            Exportado em: <strong>{new Date(escolasExportadas[escolaSelecionada]).toLocaleString('pt-BR')}</strong>
                                        </span>
                                    }
                                    type="success"
                                    showIcon
                                />
                            </div>
                        )}

                        {escolaSelecionada && estudantesDaEscola.length > 0 && (
                            <div className="mt-4">
                                <button
                                    type="button"
                                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0f766e] text-white hover:bg-[#0d6961] border-0 cursor-pointer disabled:opacity-60 font-bold shadow-lg transition-all text-[0.9375rem]"
                                    onClick={handleGerarPdf}
                                    disabled={gerandoPdf || estudantesSelecionadosParaGeracao.length === 0}
                                >
                                    {gerandoPdf ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Download size={20} />
                                    )}
                                    {gerandoPdf ? 'Processando...' : `GERAR PDF (${estudantesSelecionadosParaGeracao.length} SELECIONADOS)`}
                                </button>
                            </div>
                        )}
                    </Form>

                    {escolaSelecionada && estudantesDaEscola.length > 0 && (
                        <Card
                            size="small"
                            title={
                                filtroGeracao === 'nao-geradas'
                                    ? `Estudantes sem credencial gerada (${estudantesExibidosNaTabela.length})`
                                    : `Estudantes Encontrados (${estudantesExibidosNaTabela.length})`
                            }
                            className="shadow-sm sm:rounded-xl -mx-4 sm:mx-0 border-x-0 sm:border-x border-[#f1f5f9]"
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                dataSource={estudantesExibidosNaTabela}
                                rowKey="id"
                                pagination={{ pageSize: 15 }}
                                size="small"
                                scroll={{ x: 'max-content' }}
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
                                        title: 'Status da ficha',
                                        key: 'status_ficha',
                                        render: (_, row) => {
                                            const temDocumentoAssinado = !!String(row?.documentacao_assinada_url || '').trim()
                                            return temDocumentoAssinado
                                                ? <Tag color="green">Documento assinado</Tag>
                                                : <Tag color="orange">Assinatura pendente</Tag>
                                        }
                                    },
                                    {
                                        title: 'Credencial',
                                        key: 'status_credencial',
                                        render: (_, row) => {
                                            const gerada = !!credenciaisDaEscola[String(row?.id)]
                                            return gerada
                                                ? <Tag color="cyan">Gerada</Tag>
                                                : <Tag color="default">Não gerada</Tag>
                                        }
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
        </div>
    )
}
