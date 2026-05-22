import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { publicCampeonatosService } from '../../services/publicCampeonatosService'

function ListaEquipe({ titulo, itens }) {
  if (!itens.length) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{titulo}</span>
      <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
        {itens.map((a) => (
          <li
            key={`${a.estudante_id}_${a.is_gol_contra ? 'gc' : 'n'}`}
            className="flex items-center justify-between gap-2 text-[11px] text-slate-700"
          >
            <span className="truncate min-w-0">
              {a.estudante_nome}
              {a.is_gol_contra && (
                <span className="ml-1 text-[10px] font-semibold text-amber-600">(GC)</span>
              )}
            </span>
            <span className="font-bold text-teal-700 tabular-nums shrink-0">
              {a.quantidade}
              <span className="text-[9px] font-normal text-slate-400 ml-0.5">
                {a.quantidade === 1 ? 'gol' : 'gols'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PartidaArtilheirosCollapse({
  campeonatoId,
  partida,
  registraArtilheiro,
}) {
  const [open, setOpen] = useState(false)
  const [artilheiros, setArtilheiros] = useState(null)
  const [loading, setLoading] = useState(false)

  const hasResult = !!partida.resultado_tipo
  const podeExibir = registraArtilheiro && hasResult && partida.resultado_tipo !== 'WXO'

  useEffect(() => {
    if (!open || !podeExibir || artilheiros !== null) return
    setLoading(true)
    publicCampeonatosService
      .getArtilheirosPartida(campeonatoId, partida.id)
      .then(setArtilheiros)
      .catch(() => setArtilheiros([]))
      .finally(() => setLoading(false))
  }, [open, podeExibir, campeonatoId, partida.id, artilheiros])

  if (!podeExibir) return null

  const mandante = (artilheiros || []).filter((a) => a.equipe_id === partida.mandante_equipe_id)
  const visitante = (artilheiros || []).filter((a) => a.equipe_id === partida.visitante_equipe_id)
  const vazio = artilheiros && mandante.length === 0 && visitante.length === 0

  return (
    <div className="border-t border-slate-100 pt-1.5 mt-0.5 w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 hover:text-teal-900 bg-transparent border-0 p-0 cursor-pointer"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Artilheiros
      </button>
      {open && (
        <div className="mt-2 pl-4 flex flex-col gap-2">
          {loading && (
            <div className="flex justify-center py-1">
              <Spin size="small" />
            </div>
          )}
          {!loading && vazio && (
            <p className="text-[10px] text-slate-400 italic m-0">Nenhum artilheiro registrado.</p>
          )}
          {!loading && !vazio && (
            <>
              <ListaEquipe titulo={partida.mandante_nome || 'Mandante'} itens={mandante} />
              <ListaEquipe titulo={partida.visitante_nome || 'Visitante'} itens={visitante} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
