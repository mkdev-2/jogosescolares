import { useState } from 'react'
import { FileSignature, AlertCircle } from 'lucide-react'
import { Button, Checkbox, Upload } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import Modal from '../ui/Modal'
import { uploadTermoAdesao, getStorageUrl } from '../../services/storageService'
import TermoAdesaoPrint from './TermoAdesaoPrint'

const MAX_DOC_MB = 10
const ACCEPT_DOC = '.pdf,.jpg,.jpeg,.png'

export default function ModalAdesaoEscola({ open, onClose, onSuccess, form, variantes }) {
  const [loading, setLoading] = useState(false)
  const [termoAssinado, setTermoAssinado] = useState(false)
  const [termoUrl, setTermoUrl] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadingFileInfo, setUploadingFileInfo] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  const [fichaPreviewOpen, setFichaPreviewOpen] = useState(false)

  const docFileList = [
    ...(termoUrl ? [{ uid: 'doc', name: 'Termo Assinado', status: 'done', url: getStorageUrl(termoUrl) }] : []),
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
    } catch (err) {
      setSubmitError(err.message || 'Erro ao enviar documentação')
      onError(err)
    } finally {
      setUploadingDoc(false)
      setUploadingFileInfo(null)
    }
  }

  const handleDocChange = ({ fileList }) => {
    if (fileList.length === 0) setTermoUrl('')
  }

  const handleClose = () => {
    setTermoAssinado(false)
    setTermoUrl('')
    setSubmitError(null)
    onClose?.()
  }

  const handleSubmit = async () => {
    if (!termoAssinado || !termoUrl) {
      setSubmitError('Por favor, assinale e envie o termo assinado para concluir o cadastro.')
      return
    }
    setSubmitError(null)
    setLoading(true)
    try {
      await onSuccess?.({ termo_assinatura_url: termoUrl })
      handleClose()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao enviar cadastro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Concluir Solicitação de Cadastro"
      subtitle="Finalize enviando a versão assinada do Termo de Adesão da Instituição"
      size="xl"
      footer={
        <div className="flex justify-between gap-3 w-full">
          <Button type="default" onClick={handleClose} disabled={loading || uploadingDoc}>
            Voltar para Edição
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={loading} disabled={loading || uploadingDoc || !termoUrl}>
            {loading ? 'Enviando...' : 'Enviar para Análise'}
          </Button>
        </div>
      }
    >
      <div className="p-0 space-y-4">
        {submitError && (
          <div className="px-4 py-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] rounded-lg text-sm mb-4">
            {submitError}
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 m-0 leading-relaxed">
            Sua solicitação está quase pronta. Para finalizar, gere o <strong>Termo de Adesão</strong> abaixo, assine, e anexe a versão digitalizada.
          </p>
        </div>

        {/* Botão Gerar Ficha */}
        <div className={`p-4 bg-[#f0fdfa] border border-[#ccfbf1] rounded-lg transition-opacity ${termoAssinado ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0f766e] rounded-lg shrink-0">
                <FileSignature className="w-5 h-5 text-white" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-[#042f2e] m-0">Termo de Adesão Institucional</h5>
                <p className="text-xs text-[#0f766e] m-0">Gere o documento com os dados preenchidos e a tabela de modalidades.</p>
              </div>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setFichaPreviewOpen(true)}
              disabled={termoAssinado}
              className="bg-[#0f766e] hover:bg-[#0d6961] border-none whitespace-nowrap"
            >
              Imprimir Ficha
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <Checkbox
            checked={termoAssinado}
            onChange={(e) => {
              const checked = e.target.checked
              setTermoAssinado(checked)
              if (!checked) setTermoUrl('')
            }}
          >
            Abaixo, declaro que o Termo de Adesão foi impresso, lido e assinado pelo Diretor.
          </Checkbox>
        </div>

        {/* Upload */}
        <div className={`border-t border-[#e2e8f0] pt-6 mt-6 transition-opacity ${!termoAssinado ? 'opacity-50 pointer-events-none' : ''}`}>
          <h4 className="text-sm font-semibold text-[#334155] mb-2">Anexar Termo Assinado e Carimbado</h4>
          <p className="text-sm text-[#64748b] mb-4 m-0">
            {termoAssinado
              ? `PDF, JPG ou PNG, até ${MAX_DOC_MB}MB.`
              : 'Marque a caixinha acima para habilitar o anexo do termo assinado.'}
          </p>

          <Upload
            listType="picture-card"
            maxCount={1}
            accept={ACCEPT_DOC}
            fileList={docFileList}
            customRequest={handleDocCustomRequest}
            onChange={handleDocChange}
            disabled={!termoAssinado || uploadingDoc}
            onPreview={(file) => {
              if (file.url) window.open(file.url, '_blank')
              else if (file.originFileObj) {
                const url = URL.createObjectURL(file.originFileObj)
                window.open(url, '_blank')
              }
            }}
            showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
          >
            {docFileList.length >= 1 ? null : (
              <div className="flex flex-col items-center justify-center gap-1 py-4">
                <PlusOutlined className="text-2xl text-[#94a3b8]" />
                <span className="text-xs text-[#64748b]">Upload Arquivo</span>
              </div>
            )}
          </Upload>
        </div>

      </div>

      <Modal
        isOpen={fichaPreviewOpen}
        onClose={() => setFichaPreviewOpen(false)}
        title="Visualização do Termo de Adesão JELS 2026"
        size="xl"
        footer={null}
      >
        <div className="max-h-[80vh] overflow-y-auto">
          <TermoAdesaoPrint
            dados={form}
            variantes={variantes}
            onClose={() => setFichaPreviewOpen(false)}
          />
        </div>
      </Modal>

    </Modal>
  )
}
