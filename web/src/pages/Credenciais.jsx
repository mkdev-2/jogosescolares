import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Card, Form, Select, Space, Typography, Spin, Row, Col, Alert, Table, Tag } from 'antd'
import { Download, IdCard, User, Medal } from 'lucide-react'
import dayjs from 'dayjs'
import ModalidadeIcon from '../components/catalogos/ModalidadeIcon'
import { estudantesService } from '../services/estudantesService'
import useEscolas from '../hooks/useEscolas'
import { configuracoesService } from '../services/configuracoesService'
import { fetchStorageBlob } from '../services/storageService'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const PX_TO_MM = 3.2

// Mover o componente de captura para FORA do escopo da função principal para evitar erros de referência em produção
const PrintableFoldedCredential = ({ aluno, midias, assets, captureRef }) => {
    if (!aluno) return null
    let posData = {}
    try {
        posData = typeof midias?.layout_credencial === 'string' 
            ? JSON.parse(midias.layout_credencial) 
            : (midias?.layout_credencial || {})
    } catch (e) { posData = {} }

    const p = {
        foto: { x: (posData.foto?.x ?? 32) * PX_TO_MM, y: (posData.foto?.y ?? 17) * PX_TO_MM, size: (posData.foto?.size ?? 36) * PX_TO_MM },
        logos: { x: (posData.logos?.x ?? 25) * PX_TO_MM, y: (posData.logos?.y ?? 56) * PX_TO_MM, w: (posData.logos?.w ?? 50) * PX_TO_MM, h: (posData.logos?.h ?? 10) * PX_TO_MM },
        nome: { x: (posData.nome?.x ?? 0) * PX_TO_MM, y: (posData.nome?.y ?? 78) * PX_TO_MM, fontSize: posData.nome?.fontSize ?? 24 },
        info: { x: (posData.info?.x ?? 0) * PX_TO_MM, y: (posData.info?.y ?? 92) * PX_TO_MM, fontSize: posData.info?.fontSize ?? 12 },
        modalidades: { x: (posData.modalidades?.x ?? 10) * PX_TO_MM, y: (posData.modalidades?.y ?? 105) * PX_TO_MM, w: (posData.modalidades?.w ?? 80) * PX_TO_MM, h: (posData.modalidades?.h ?? 22) * PX_TO_MM, fontSize: posData.modalidades?.fontSize ?? 20 }
    }

    return (
        <div ref={captureRef} style={{ width: '640px', height: '480px', display: 'flex', backgroundColor: '#fff', fontVariantLigatures: 'none' }}>
            
            {/* LADO ESQUERDO: VERSO */}
            <div style={{ width: '320px', height: '480px', position: 'relative', borderRight: '1px dashed #e2e8f0', backgroundColor: '#f8fafc' }}>
                {assets.verso ? (
                    <img src={assets.verso} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                        <Medal size={80} className="text-[#0f766e]" />
                        <p className="text-xl font-black mt-4 uppercase">Verso</p>
                    </div>
                )}
            </div>

            {/* LADO DIREITO: FRENTE (Layout Customizado) */}
            <div style={{ width: '320px', height: '480px', position: 'relative', backgroundColor: '#f8fafc' }}>
                {assets.bg ? (
                    <div className="absolute inset-0"><img src={assets.bg} className="w-full h-full object-cover" /></div>
                ) : (
                    <div className="absolute inset-0 flex flex-col">
                        <div className="h-[10.7%] bg-[#0f766e] flex items-center justify-center"><Medal className="text-white opacity-40" size={36} /></div>
                        <div className="flex-1 bg-white" /><div className="h-[1.3%] bg-[#0f766e]" />
                    </div>
                )}
                
                <div className="absolute" style={{ left: p.foto.x, top: p.foto.y }}>
                    <div className="rounded-full border-[5px] border-[#3b82f6] bg-white flex items-center justify-center overflow-hidden shadow-lg" style={{ width: p.foto.size, height: p.foto.size }}>
                        {assets.foto ? <img src={assets.foto} className="w-full h-full object-cover" /> : <User size={p.foto.size * 0.5} className="text-slate-200" />}
                    </div>
                </div>

                <div className="absolute flex items-center justify-center" style={{ left: p.logos.x, top: p.logos.y, width: p.logos.w, height: p.logos.h }}>
                    <div className="w-full h-full flex items-center justify-center px-3 py-1 rounded bg-white/40 backdrop-blur-sm">
                        {assets.logo && <img src={assets.logo} className="max-w-full max-h-full object-contain" />}
                    </div>
                </div>

                <div className="absolute w-full" style={{ left: p.nome.x, top: p.nome.y }}>
                    <div className="font-black leading-none text-white drop-shadow-md uppercase text-center p-2" style={{ fontSize: p.nome.fontSize, fontFamily: "'Sora', sans-serif" }}>
                        {aluno.nome.toUpperCase()}
                    </div>
                </div>
                
                <div className="absolute w-full" style={{ left: p.info.x, top: p.info.y }}>
                    <div className="text-white drop-shadow-md text-center p-2" style={{ fontSize: p.info.fontSize, fontFamily: "'Lato', sans-serif" }}>
                        <div className="font-bold border-b border-white/20 pb-0.5 mb-0.5">{aluno.escola_nome}</div>
                        <div className="font-medium opacity-100">{dayjs(aluno.data_nascimento).format('DD/MM/YYYY')}</div>
                    </div>
                </div>

                {aluno.modalidades?.length > 0 && (
                    <div className="absolute overflow-hidden" style={{ left: p.modalidades.x, top: p.modalidades.y, width: p.modalidades.w, height: p.modalidades.h }}>
                        <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-blue-100">
                            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                                            {aluno.modalidades.slice(0, 2).map((m, idx) => (
                                                <div key={idx} className="text-[#1d4ed8] font-black leading-none text-center w-full" style={{ fontSize: p.modalidades.fontSize, fontFamily: "'Sora', sans-serif", margin: '2px 0' }}>
                                                    {m.esporte_nome.toUpperCase()}
                                                </div>
                                            ))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 h-3 flex">
                    {['#fac20a', '#2563eb', '#16a34a', '#dc2626', '#f97316'].map(c => <div key={c} style={{ flex: 1, backgroundColor: c }} />)}
                </div>
            </div>
        </div>
    )
}

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
        } catch (e) { return {} }
    })
    const [credenciaisGeradasPorEscola, setCredenciaisGeradasPorEscola] = useState(() => {
        try {
            const raw = localStorage.getItem('credenciais_alunos_exportados')
            return raw ? JSON.parse(raw) : {}
        } catch (e) { return {} }
    })
    const [filtroGeracao, setFiltroGeracao] = useState('todos')
    const [capturandoAluno, setCapturandoAluno] = useState(null)
    const [midiasConfig, setMidiasConfig] = useState(null)
    const [assetsCaptura, setAssetsCaptura] = useState({ foto: null, logo: null, bg: null, verso: null })
    const captureRef = useRef(null)

    const escolaObj = listaEscolas.find((e) => Number(e.id) === Number(escolaSelecionada))
    
    const estudantesAptos = estudantesDaEscola.filter(
        (aluno) =>
            !!String(aluno?.documentacao_assinada_url || '').trim() &&
            !!String(aluno?.foto_url || '').trim()
    )
    const credenciaisDaEscola = credenciaisGeradasPorEscola[String(escolaSelecionada)] || {}
    const estudantesSemCredencialGerada = estudantesAptos.filter(
        (aluno) => !credenciaisDaEscola[String(aluno.id)]
    )
    const estudantesSelecionadosParaGeracao = filtroGeracao === 'nao-geradas'
        ? estudantesSemCredencialGerada
        : estudantesAptos
    const estudantesExibidosNaTabela = filtroGeracao === 'nao-geradas'
        ? estudantesSemCredencialGerada
        : estudantesDaEscola

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

    const loadAssetAsBase64 = async (path) => {
        if (!path) return null
        try {
            const blob = await fetchStorageBlob(path)
            return new Promise((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
            })
        } catch (e) {
            console.error('Erro ao carregar asset:', path, e)
            return null
        }
    }

    const handleGerarPdf = async () => {
        if (!escolaSelecionada || estudantesDaEscola.length === 0) {
            alert('Nenhum estudante encontrado para esta escola.')
            return
        }
        if (estudantesSelecionadosParaGeracao.length === 0) {
            alert('Nenhum estudante apto selecionado.')
            return
        }

        setGerandoPdf(true)
        setProgressoPdf({ atual: 0, total: estudantesSelecionadosParaGeracao.length })

        try {
            await estudantesService.auditarGeracaoCredenciais(escolaSelecionada)
            const midias = await configuracoesService.getNoCache()
            setMidiasConfig(midias)

            const bgBase64 = await loadAssetAsBase64(midias?.bg_credencial)
            const versoBase64 = await loadAssetAsBase64(midias?.bg_verso_credencial)
            const logoBase64 = await loadAssetAsBase64(midias?.logo_jels)

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
            const cardW = 100
            const cardH = 150
            const pageWidth = doc.internal.pageSize.getWidth() // 297mm
            const pageHeight = doc.internal.pageSize.getHeight() // 210mm
            
            // Modelo de Dobra: Frente + Verso lado a lado = 200mm
            const totalW = cardW * 2
            const marginX = (pageWidth - totalW) / 2
            const marginY = (pageHeight - cardH) / 2

            for (let i = 0; i < estudantesSelecionadosParaGeracao.length; i++) {
                const aluno = estudantesSelecionadosParaGeracao[i]
                
                if (i > 0) doc.addPage()
                
                const fotoBase64 = await loadAssetAsBase64(aluno.foto_url)
                
                setAssetsCaptura({ foto: fotoBase64, logo: logoBase64, bg: bgBase64, verso: versoBase64 })
                setCapturandoAluno(aluno)
                setProgressoPdf({ atual: i + 1, total: estudantesSelecionadosParaGeracao.length })
                
                await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 300)))

                if (captureRef.current) {
                    const canvas = await html2canvas(captureRef.current, {
                        scale: 3,
                        useCORS: true,
                        backgroundColor: null,
                        logging: false,
                        allowTaint: true
                    })
                    const imgData = canvas.toDataURL('image/jpeg', 0.95)
                    doc.addImage(imgData, 'JPEG', marginX, marginY, totalW, cardH)
                }
            }

            const nomeArquivo = `credenciais-${(escolaObj?.nome_escola || 'escola').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
            doc.save(nomeArquivo)

            const escolaKey = String(escolaSelecionada)
            const novosIds = estudantesSelecionadosParaGeracao.reduce((acc, aluno) => {
                acc[String(aluno.id)] = new Date().toISOString()
                return acc
            }, {})
            setCredenciaisGeradasPorEscola(prev => ({
                ...prev,
                [escolaKey]: { ...(prev[escolaKey] || {}), ...novosIds }
            }))
            const expData = { ...escolasExportadas, [escolaSelecionada]: new Date().toISOString() }
            setEscolasExportadas(expData)
            localStorage.setItem('credenciais_exportadas', JSON.stringify(expData))

        } catch (err) {
            console.error(err)
            alert('Erro ao gerar PDF.')
        } finally {
            setGerandoPdf(false)
            setCapturandoAluno(null)
            setAssetsCaptura({ foto: null, logo: null, bg: null, verso: null })
        }
    }

    return (
        <div className="bg-white sm:rounded-[12px] border-y sm:border border-[#f1f5f9] shadow-none sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] -mx-4 sm:mx-0 p-4 sm:p-6">
            <Spin spinning={loadingEscolas || loadingEstudantes}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div className="flex flex-col gap-2">
                        <Typography.Title level={4} style={{ margin: 0, fontSize: 'clamp(1.125rem, 4vw, 1.5rem)' }}>
                            <Space align="start"><IdCard size={28} className="text-[#0f766e] shrink-0 mt-1" /><span>Gerador de Credenciais (Dobra)</span></Space>
                        </Typography.Title>
                    </div>
                    <Alert type="info" showIcon message="Modelo 'Vira e Cola': Impressão frente e verso lado a lado para dobradura. Uma credencial por folha A4." />
                    <Form form={form} layout="vertical" className="mt-2">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={24} md={12}>
                                <Form.Item label="Selecione a Escola" required style={{ marginBottom: 12 }}>
                                    <Select placeholder="Selecione uma escola..." value={escolaSelecionada} onChange={setEscolaSelecionada} style={{ width: '100%', height: 45 }} showSearch options={listaEscolas.map(e => ({ label: e.nome_escola, value: e.id }))} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={24} md={12}>
                                <Form.Item label="Filtro de geração" style={{ marginBottom: 12 }}>
                                    <Select value={filtroGeracao} onChange={setFiltroGeracao} style={{ width: '100%', height: 45 }} options={[{ label: 'Todos os alunos', value: 'todos' }, { label: 'Somente aptos sem credencial gerada', value: 'nao-geradas' }]} />
                                </Form.Item>
                            </Col>
                        </Row>
                        {escolaSelecionada && estudantesDaEscola.length > 0 && (
                            <button type="button" className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0f766e] text-white hover:bg-[#0d6961] border-0 cursor-pointer disabled:opacity-60 font-bold shadow-lg transition-all" onClick={handleGerarPdf} disabled={gerandoPdf || estudantesSelecionadosParaGeracao.length === 0}>
                                {gerandoPdf ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={20} />}
                                {gerandoPdf ? 'Processando...' : `GERAR PDF FRENTE/VERSO (${estudantesSelecionadosParaGeracao.length} SELECIONADOS)`}
                            </button>
                        )}
                    </Form>
                    {escolaSelecionada && estudantesDaEscola.length > 0 && (
                        <Card size="small" title={filtroGeracao === 'nao-geradas' ? `Aptos sem credencial gerada (${estudantesExibidosNaTabela.length})` : `Todos os Estudantes (${estudantesExibidosNaTabela.length})`} className="shadow-sm sm:rounded-xl">
                            <Table dataSource={estudantesExibidosNaTabela} rowKey="id" pagination={{ pageSize: 15 }} size="small" scroll={{ x: 'max-content' }} columns={[
                                { title: 'Nome', dataIndex: 'nome', render: n => <Typography.Text strong>{n}</Typography.Text> },
                                { title: 'Nascimento', dataIndex: 'data_nascimento', render: d => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                                { title: 'Status', key: 'status', render: (_, row) => (
                                    <Space direction="vertical" size={2}>
                                        {!!String(row?.foto_url || '').trim() ? <Tag color="green">Com foto</Tag> : <Tag color="red">Sem foto</Tag>}
                                        {!!String(row?.documentacao_assinada_url || '').trim() ? <Tag color="green">Doc. assinado</Tag> : <Tag color="orange">Doc. pendente</Tag>}
                                    </Space>
                                )},
                                { title: 'Modalidades', dataIndex: 'modalidades', render: mods => (
                                    <Space wrap>{mods.map((m, idx) => <Tag key={idx} color="blue" icon={<ModalidadeIcon icone={m.esporte_icone} size={14} />}>{m.esporte_nome}</Tag>)}</Space>
                                )}
                            ]} />
                        </Card>
                    )}
                </Space>
            </Spin>
            {gerandoPdf && createPortal(
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/10 backdrop-blur-md">
                    <div className="bg-white rounded-3xl p-12 flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-[#f1f5f9] max-w-sm w-full text-center">
                        <div className="w-16 h-16 border-[5px] border-[#e2e8f0] border-t-[#0f766e] rounded-full animate-spin" />
                        <div className="w-full">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-[#64748b] uppercase">Processando</span>
                                <span className="text-sm font-black text-[#0f766e]">{progressoPdf.atual} / {progressoPdf.total}</span>
                            </div>
                            <div className="w-full h-3 bg-[#f1f5f9] rounded-full overflow-hidden border">
                                <div className="h-full bg-[#0f766e] transition-all duration-500" style={{ width: `${(progressoPdf.atual / (progressoPdf.total || 1)) * 100}%` }} />
                            </div>
                        </div>
                        <p className="text-sm text-[#64748b] font-medium m-0 italic">Capturando frente e verso para dobradura...</p>
                        <div className="fixed -left-[9999px] -top-[9999px]">
                            <PrintableFoldedCredential aluno={capturandoAluno} midias={midiasConfig} assets={assetsCaptura} captureRef={captureRef} />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
