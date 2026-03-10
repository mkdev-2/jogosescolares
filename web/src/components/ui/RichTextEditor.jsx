import { useRef, useEffect, useState } from 'react'
import { Button, Tooltip } from 'antd'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  RotateCcw,
} from 'lucide-react'

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite o conteúdo aqui...',
  className = '',
}) {
  const editorRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const execCommand = (command, val = '') => {
    document.execCommand(command, false, val)
    editorRef.current?.focus()
    updateValue()
  }

  const updateValue = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertLink = () => {
    const url = prompt('Digite a URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const toolbarButtons = [
    { icon: <Bold size={16} />, cmd: 'bold', label: 'Negrito' },
    { icon: <Italic size={16} />, cmd: 'italic', label: 'Itálico' },
    { icon: <Underline size={16} />, cmd: 'underline', label: 'Sublinhado' },
    { type: 'divider' },
    { icon: <Heading1 size={16} />, cmd: 'formatBlock', val: 'h1', label: 'Título 1' },
    { icon: <Heading2 size={16} />, cmd: 'formatBlock', val: 'h2', label: 'Título 2' },
    { icon: <Heading3 size={16} />, cmd: 'formatBlock', val: 'h3', label: 'Título 3' },
    { type: 'divider' },
    { icon: <List size={16} />, cmd: 'insertUnorderedList', label: 'Lista' },
    { icon: <ListOrdered size={16} />, cmd: 'insertOrderedList', label: 'Lista numerada' },
    { type: 'divider' },
    { icon: <AlignLeft size={16} />, cmd: 'justifyLeft', label: 'Alinhar à esquerda' },
    { icon: <AlignCenter size={16} />, cmd: 'justifyCenter', label: 'Centralizar' },
    { icon: <AlignRight size={16} />, cmd: 'justifyRight', label: 'Alinhar à direita' },
    { type: 'divider' },
    { icon: <LinkIcon size={16} />, cmd: 'link', label: 'Inserir link', action: insertLink },
    { icon: <Unlink size={16} />, cmd: 'unlink', label: 'Remover link' },
    { type: 'divider' },
    { icon: <Quote size={16} />, cmd: 'formatBlock', val: 'blockquote', label: 'Citação' },
    { icon: <Code size={16} />, cmd: 'formatBlock', val: 'pre', label: 'Código' },
    { icon: <RotateCcw size={16} />, cmd: 'removeFormat', label: 'Limpar formatação' },
  ]

  return (
    <div
      className={`border rounded-xl overflow-hidden bg-white transition-all ${
        isFocused ? 'ring-2 ring-[#0f766e]/20 border-[#0f766e]' : 'border-slate-200'
      } ${className}`}
    >
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1">
        {toolbarButtons.map((btn, i) =>
          btn.type === 'divider' ? (
            <div key={`div-${i}`} className="w-px h-6 bg-slate-300 mx-1 self-center" />
          ) : (
            <Tooltip title={btn.label} key={btn.label}>
              <Button
                type="text"
                size="small"
                icon={btn.icon}
                onClick={() => {
                  if (btn.action) {
                    btn.action()
                  } else if (btn.cmd) {
                    execCommand(btn.cmd, btn.val || '')
                  }
                }}
                className="flex items-center justify-center hover:bg-white hover:shadow-sm"
              />
            </Tooltip>
          )
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        onBlur={() => {
          setIsFocused(false)
          updateValue()
        }}
        onFocus={() => setIsFocused(true)}
        onInput={updateValue}
        className="p-4 min-h-[300px] outline-none prose prose-sm max-w-none"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: '1.6',
          color: '#374151',
        }}
        data-placeholder={placeholder}
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        .prose blockquote {
          border-left: 4px solid #e2e8f0;
          padding-left: 1rem;
          font-style: italic;
          color: #64748b;
        }
      `}</style>
    </div>
  )
}
