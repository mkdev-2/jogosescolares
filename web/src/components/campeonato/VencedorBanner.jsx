import { Trophy } from 'lucide-react'

export default function VencedorBanner({ vencedorNome }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-yellow-200">
      <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 px-8 py-6 flex items-center gap-5">
        <div className="bg-white/25 rounded-full p-4 shrink-0">
          <Trophy size={40} className="text-white drop-shadow" />
        </div>
        <div>
          <p className="text-amber-100 text-[0.7rem] font-bold tracking-[0.2em] uppercase mb-1">
            Campeão
          </p>
          <h2 className="text-white text-[1.75rem] font-extrabold leading-tight drop-shadow-sm">
            {vencedorNome}
          </h2>
        </div>
        <div className="ml-auto text-white/30 text-[3rem] leading-none select-none hidden sm:block">
          ★★★
        </div>
      </div>
    </div>
  )
}
