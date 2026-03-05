import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import AnimateOnScroll from '../ui/AnimateOnScroll'

const FOTOS = [
  '/FOTOS_JOGOS_2025_1.jpg',
  '/FOTOS_JOGOS_2025_2.jpg',
  '/FOTOS_JOGOS_2025_3.jpg',
  '/FOTOS_JOGOS_2025_4.jpg',
  '/FOTOS_JOGOS_2025_5.jpg',
  '/FOTOS_JOGOS_2025_6.jpg',
]

export default function GallerySection() {
  const [fotoAberta, setFotoAberta] = useState(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setFotoAberta(null)
    }
    if (fotoAberta) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [fotoAberta])

  const modalContent = fotoAberta && (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[1100]"
      onClick={() => setFotoAberta(null)}
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar foto"
    >
      <button
        type="button"
        onClick={() => setFotoAberta(null)}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={fotoAberta}
        alt="Jogos Escolares 2025"
        className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )

  return (
    <section className="py-20 px-4 bg-amber-50/50">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll animation="up" className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Galeria de <span className="text-primary">Fotos</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Fotos e registros dos Jogos Escolares Municipais
          </p>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FOTOS.map((src, i) => (
            <AnimateOnScroll
              key={src}
              animation="up"
              className={['', 'reveal-delay-100', 'reveal-delay-200', 'reveal-delay-100', 'reveal-delay-200', 'reveal-delay-300'][i]}
            >
              <button
                type="button"
                onClick={() => setFotoAberta(src)}
                className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 cursor-pointer text-left"
              >
                <img
                  src={src}
                  alt={`Jogos Escolares 2025 - Foto ${i + 1}`}
                  className="w-full h-full object-cover object-center"
                />
              </button>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
      {fotoAberta && createPortal(modalContent, document.body)}
    </section>
  )
}
