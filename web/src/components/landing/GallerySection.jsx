import { ImageIcon } from 'lucide-react'

export default function GallerySection() {
  const placeholders = Array.from({ length: 6 })

  return (
    <section className="py-20 px-4 bg-amber-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Galeria de <span className="text-primary">Fotos</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Em breve, fotos e registros dos Jogos Escolares Municipais
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {placeholders.map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300"
            >
              <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">Foto {i + 1}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
