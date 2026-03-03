import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ isOpen, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1100]"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-white rounded-[16px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] max-h-[90vh] min-h-[280px] flex flex-col ${
          size === 'lg' ? 'w-full max-w-[640px]' : 'w-full max-w-[500px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#e2e8f0] shrink-0">
          <div>
            <h2 id="modal-title" className="text-[1.25rem] font-semibold text-[#042f2e] m-0">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-[0.875rem] text-[#64748b] m-0">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="text-[1.5rem] text-[#64748b] p-1 leading-none hover:text-[#334155] rounded focus:outline-none focus:ring-2 focus:ring-[#0f766e]"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#e2e8f0] flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
