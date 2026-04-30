import ClassificacaoGrupo from './ClassificacaoGrupo'

export default function GrupoSection({ grupo, partidas, campeonatoId, config, wildcardEquipeIds, wildcardRanking }) {
  const partidasGrupo = partidas.filter((p) => p.grupo_id === grupo.id && !p.is_bye)

  return (
    <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
      <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0]">
        <h3 className="font-bold text-[#042f2e] m-0 text-sm">GRUPO {grupo.nome}</h3>
      </div>
      <div className="p-4 flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">Classificação</p>
          <ClassificacaoGrupo
            campeonatoId={campeonatoId}
            grupoId={grupo.id}
            classificadosDiretos={grupo.classificados_diretos ?? 1}
            config={config}
            wildcardEquipeIds={wildcardEquipeIds}
            wildcardRanking={wildcardRanking}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">Partidas</p>
          <div className="flex flex-col gap-2">
            {partidasGrupo.length === 0 && (
              <p className="text-sm text-[#94a3b8]">Nenhuma partida neste grupo.</p>
            )}
            {partidasGrupo.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]"
              >
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <span
                    className={`text-xs truncate ${
                      p.vencedor_equipe_id === p.mandante_equipe_id
                        ? 'font-bold text-emerald-700'
                        : 'text-[#334155]'
                    }`}
                  >
                    {p.mandante_nome || `Equipe ${p.mandante_equipe_id}`}
                  </span>
                  {p.resultado_tipo ? (
                    <span className="text-xs font-mono text-[#334155] shrink-0 mx-1">
                      {p.placar_mandante}–{p.placar_visitante}
                      {p.resultado_tipo === 'WXO' && (
                        <span className="text-amber-600 text-[10px] ml-1">WxO</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[#94a3b8] text-xs shrink-0 mx-1">vs</span>
                  )}
                  <span
                    className={`text-xs truncate ${
                      p.vencedor_equipe_id === p.visitante_equipe_id
                        ? 'font-bold text-emerald-700'
                        : 'text-[#334155]'
                    }`}
                  >
                    {p.visitante_nome || `Equipe ${p.visitante_equipe_id}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
