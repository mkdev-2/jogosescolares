import { ImageIcon } from 'lucide-react'
import AnimateOnScroll from '../ui/AnimateOnScroll'

export default function GallerySection() {
  const placeholders = Array.from({ length: 6 })

  return (
    <section className="py-20 px-4 bg-amber-50/50">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll animation="up" className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Galeria de <span className="text-primary">Fotos</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Em breve, fotos e registros dos Jogos Escolares Municipais
          </p>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {placeholders.map((_, i) => (
            <AnimateOnScroll
              key={i}
              animation="up"
              className={['', 'reveal-delay-100', 'reveal-delay-200', 'reveal-delay-100', 'reveal-delay-200', 'reveal-delay-300'][i]}
            >
              <div className="aspect-[4/3] bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-gray-500 text-sm">Foto {i + 1}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
