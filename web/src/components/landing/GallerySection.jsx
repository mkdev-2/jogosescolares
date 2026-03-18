import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const FOTOS = [
  '/FOTOS_JOGOS_2025_1.jpg',
  '/FOTOS_JOGOS_2025_2.jpg',
  '/FOTOS_JOGOS_2025_3.jpg',
  '/FOTOS_JOGOS_2025_4.jpg',
  '/FOTOS_JOGOS_2025_5.jpg',
  '/FOTOS_JOGOS_2025_6.jpg',
]

const FOTOS_INFINITAS = [...FOTOS, ...FOTOS, ...FOTOS]

export default function GallerySection() {
  const [fotoAberta, setFotoAberta] = useState(null)
  const carouselRef = useRef(null)

  // Inicializa no meio para o efeito infinito
  useEffect(() => {
    if (carouselRef.current) {
      const { scrollWidth } = carouselRef.current
      carouselRef.current.scrollLeft = scrollWidth / 3
    }
  }, [])

  const handleInfiniteScroll = () => {
    if (!carouselRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
    
    // Se chegar perto do início (primeiro terço), pula para o meio
    if (scrollLeft <= 5) {
      carouselRef.current.scrollLeft = scrollLeft + (scrollWidth / 3)
    } 
    // Se chegar perto do fim (último terço), pula para o meio
    else if (scrollLeft + clientWidth >= scrollWidth - 5) {
      carouselRef.current.scrollLeft = scrollLeft - (scrollWidth / 3)
    }
  }

  const scroll = (direction) => {
    if (carouselRef.current) {
      const { clientWidth } = carouselRef.current
      const moveDistance = clientWidth / 2
      const target = direction === 'left' 
        ? carouselRef.current.scrollLeft - moveDistance 
        : carouselRef.current.scrollLeft + moveDistance
      
      carouselRef.current.scrollTo({ left: target, behavior: 'smooth' })
    }
  }

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
      className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[1100] backdrop-blur-sm"
      onClick={() => setFotoAberta(null)}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={() => setFotoAberta(null)}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110"
      >
        <X size={24} />
      </button>
      <motion.img
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={fotoAberta}
        alt="Jogos Escolares"
        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )

  return (
    <section className="py-12 bg-white relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-50/20 -skew-x-12 translate-x-1/2 pointer-events-none" />

      <div className="container-portal relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
              <Camera size={18} />
            </div>
            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Registros Oficiais</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-[#042f2e] tracking-tight m-0 uppercase">
            GALERIA DE <span className="text-emerald-600">FOTOS</span>
          </h2>
        </div>
        
        <div className="relative group/carousel px-2 md:px-12">
          {/* Botões Laterais */}
          <button 
            onClick={() => scroll('left')}
            className="absolute left-1 md:left-0 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-white/90 shadow-xl shadow-emerald-900/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all duration-300 md:-translate-x-6 border border-emerald-50 active:scale-95"
          >
            <ChevronLeft size={20} className="md:w-6 md:h-6" />
          </button>

          <button 
            onClick={() => scroll('right')}
            className="absolute right-1 md:right-0 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-white/90 shadow-xl shadow-emerald-900/10 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all duration-300 md:translate-x-6 border border-emerald-50 active:scale-95"
          >
            <ChevronRight size={20} className="md:w-6 md:h-6" />
          </button>

          <div 
            ref={carouselRef}
            onScroll={handleInfiniteScroll}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-6 pt-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {FOTOS_INFINITAS.map((src, i) => (
              <motion.div
                key={`${src}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (i % FOTOS.length) * 0.1 }}
                className="flex-shrink-0 w-72 md:w-80 snap-center"
              >
                <button
                  onClick={() => setFotoAberta(src)}
                  className="group relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/5 border border-slate-100 transition-all duration-500 hover:shadow-emerald-500/20"
                >
                  <img
                    src={src}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                     <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white scale-50 group-hover:scale-100 transition-transform duration-500 ring-2 ring-white/50">
                        <Camera size={24} />
                     </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {fotoAberta && createPortal(modalContent, document.body)}
      
      <style i="gallery-hide-scrollbar">{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
