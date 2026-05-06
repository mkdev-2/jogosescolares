import ClassificacaoGrupo from './ClassificacaoGrupo'

export default function GrupoSection({ grupo, campeonatoId, config, wildcardEquipeIds, wildcardRanking }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-3 border-b border-slate-200">
        <h3 className="font-bold text-[#042f2e] m-0 text-sm tracking-wide">GRUPO {grupo.nome}</h3>
      </div>
      <div className="p-4">
        <ClassificacaoGrupo
          campeonatoId={campeonatoId}
          grupoId={grupo.id}
          classificadosDiretos={grupo.classificados_diretos ?? 1}
          config={config}
          wildcardEquipeIds={wildcardEquipeIds}
          wildcardRanking={wildcardRanking}
        />
      </div>
    </div>
  )
}
