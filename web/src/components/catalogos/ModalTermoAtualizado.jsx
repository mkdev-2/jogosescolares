import { useState } from 'react'
import { FileSignature, AlertCircle, FileText } from 'lucide-react'
import { Button, Checkbox, Upload, message } from 'antd'
import { PlusOutlined, SendOutlined } from '@ant-design/icons'
import Modal from '../ui/Modal'
import { uploadTermoAdesao, getStorageUrl } from '../../services/storageService'
import { escolasService } from '../../services/escolasService'
import TermoAdesaoPrint from './TermoAdesaoPrint'

const MAX_DOC_MB = 10
const ACCEPT_DOC = '.pdf,.jpg,.jpeg,.png'

export default function ModalTermoAtualizado({ 
  open, 
  onClose, 
  onSuccess, 
  escolaId, 
  edicaoId, 
  dados, 
  variantes 
}) {
  const [loading, setLoading] = useState(false)
  const [termoAssinado, setTermoAssinado] = useState(false)
  const [termoUrl, setTermoUrl] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadingFileInfo, setUploadingFileInfo] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [fichaPreviewOpen, setFichaPreviewOpen] = useState(false)

  const docFileList = [
    ...(termoUrl ? [{ uid: 'doc', name: 'Termo Atualizado', status: 'done', url: getStorageUrl(termoUrl) }] : []),
    ...(uploadingFileInfo ? [{ uid: uploadingFileInfo.uid, name: uploadingFileInfo.name, status: 'uploading' }] : []),
  ]

  const handleDocCustomRequest = async ({ file, onSuccess: onUploadSuccess, onError }) => {
    const isPdf = file.type === 'application/pdf'
    const isImage = file.type?.startsWith('image/')
    
    if (!isPdf && !isImage) {
      setSubmitError('Envie um arquivo PDF ou imagem (JPG, PNG).')
      onError(new Error('Tipo de arquivo inválido'))
      setUploadingFileInfo(null)
      return
    }
    
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setSubmitError(`O arquivo excede o limite de ${MAX_DOC_MB}MB.`)
      onError(new Error('Arquivo muito grande'))
      setUploadingFileInfo(null)
      return
    }

    setSubmitError(null)
    setUploadingDoc(true)
    setUploadingFileInfo({ uid: file.uid, name: file.name })
    
    try {
      const url = await uploadTermoAdesao(file)
      setTermoUrl(url)
      onUploadSuccess(url)
      message.success('Documento enviado com sucesso!')
    } catch (err) {
      setSubmitError(err.message || 'Erro ao enviar documentação')
      onError(err)
    } finally {
      setUploadingDoc(false)
      setUploadingFileInfo(null)
    }
  }

  const handleDocChange = ({ fileList }) => {
    if (fileList.length === 0) {
      setTermoUrl('')
      setSubmitError(null)
    }
  }

  const handleClose = () => {
    if (loading || uploadingDoc) return
    setTermoAssinado(false)
    setTermoUrl('')
    setSubmitError(null)
    onClose?.()
  }

  const handleSubmit = async () => {
    if (!termoUrl) {
      setSubmitError('Por favor, anexe o termo assinado para continuar.')
      return
    }

    setLoading(true)
    setSubmitError(null)
    
    try {
      await escolasService.updateTermoAdesao(escolaId, termoUrl, edicaoId)
      message.success('Termo de adesão atualizado com sucesso!')
      onSuccess?.()
      handleClose()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao atualizar termo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Atualizar Termo de Adesão"
      subtitle="Envie a versão assinada do termo com as modalidades finais"
      size="xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button onClick={handleClose} disabled={loading || uploadingDoc}>
            Cancelar
          </Button>
          <Button 
            type="primary" 
            onClick={handleSubmit} 
            loading={loading} 
            disabled={!termoUrl || !termoAssinado || uploadingDoc}
            icon={<SendOutlined />}
            className="bg-[#0f766e] hover:bg-[#0d6961] border-none"
          >
            Enviar Termo Atualizado
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {submitError && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {submitError}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900 m-0">Atenção: Renovação do Documento</p>
            <p className="text-sm text-amber-800 m-0 leading-relaxed">
              Como as modalidades da sua escola foram alteradas após o envio do termo inicial, é necessário gerar, assinar e anexar uma nova via atualizada para validar sua participação.
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0">Passo 1: Gerar Documento</h4>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
                <FileSignature className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">Termo de Adesão Atualizado</span>
                <span className="text-xs text-slate-500">Contém as modalidades finais selecionadas.</span>
              </div>
            </div>
            <Button 
              icon={<PlusOutlined />} 
              onClick={() => setFichaPreviewOpen(true)}
              className="border-teal-600 text-teal-700 hover:text-teal-800 hover:border-teal-700"
            >
              Visualizar e Imprimir
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0">Passo 2: Declaração e Upload</h4>
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-6 shadow-sm">
            <Checkbox 
              checked={termoAssinado} 
              onChange={e => setTermoAssinado(e.target.checked)}
              className="text-sm text-slate-700 font-medium"
            >
              Confirmo que imprimi o termo atualizado e o mesmo foi assinado pelo Diretor da Instituição.
            </Checkbox>

            <div className={`space-y-3 transition-opacity ${!termoAssinado ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 text-slate-700">
                <FileText size={16} />
                <span className="text-sm font-bold">Anexar Arquivo Assinado</span>
              </div>
              
              <Upload
                listType="picture-card"
                maxCount={1}
                accept={ACCEPT_DOC}
                fileList={docFileList}
                customRequest={handleDocCustomRequest}
                onChange={handleDocChange}
                disabled={!termoAssinado || uploadingDoc}
                onPreview={(file) => {
                  const url = file.url || (file.originFileObj && URL.createObjectURL(file.originFileObj))
                  if (url) window.open(url, '_blank')
                }}
              >
                {docFileList.length >= 1 ? null : (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <PlusOutlined style={{ fontSize: 20 }} className="text-slate-400" />
                    <div className="text-xs text-slate-500 font-medium">Fazer Upload</div>
                  </div>
                )}
              </Upload>
              <p className="text-[11px] text-slate-500 italic">
                Formatos aceitos: PDF ou Imagem. Tamanho máximo: {MAX_DOC_MB}MB.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Modal Interno de Impressão */}
      <Modal
        isOpen={fichaPreviewOpen}
        onClose={() => setFichaPreviewOpen(false)}
        title="Visualização para Impressão"
        size="xl"
        footer={null}
      >
        <div className="max-h-[75vh] overflow-y-auto custom-scrollbar bg-slate-100 p-4 rounded-lg">
          <TermoAdesaoPrint
            dados={dados}
            variantes={variantes}
            onClose={() => setFichaPreviewOpen(false)}
          />
        </div>
      </Modal>
    </Modal>
  )
}
