/**
 * URL para abrir /resultados com modalidade + partida (mesmo fluxo do deep link).
 * @param {object} c objeto com partida_id e esporte_variante_id ou campeonato_id
 */
export function resultadosConfrontoHref(c) {
  if (c?.partida_id == null) return '/resultados'
  const qs = new URLSearchParams()
  qs.set('partida', String(c.partida_id))
  if (c.esporte_variante_id != null) qs.set('variante', String(c.esporte_variante_id))
  else if (c.campeonato_id != null) qs.set('campeonato', String(c.campeonato_id))
  return `/resultados?${qs.toString()}`
}
