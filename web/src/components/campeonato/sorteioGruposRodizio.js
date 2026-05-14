/**
 * Contagem de equipes já alocadas em slots (rodízio / preview).
 * @param {Array<{ slots: Array<unknown> }>} grupos
 */
export function countFilledSlots(grupos) {
  let n = 0
  for (const g of grupos) {
    for (const s of g.slots) {
      if (s != null) n += 1
    }
  }
  return n
}

/**
 * Próximo slot por rodízio (P % G, floor(P/G)) com fallback circular
 * se o slot preferido estiver fora do tamanho do grupo ou ocupado.
 * @param {Array<{ slots: Array<unknown> }>} grupos
 * @returns {{ gi: number, si: number } | null}
 */
export function destinoRodizio(grupos) {
  const G = grupos.length
  if (G === 0) return null
  const P = countFilledSlots(grupos)
  const startGi = P % G
  const siPref = Math.floor(P / G)

  for (let t = 0; t < G; t += 1) {
    const curGi = (startGi + t) % G
    const slots = grupos[curGi].slots
    if (siPref < slots.length && slots[siPref] == null) {
      return { gi: curGi, si: siPref }
    }
  }

  const maxLen = Math.max(0, ...grupos.map((g) => g.slots.length))
  for (let si = 0; si < maxLen; si += 1) {
    for (let t = 0; t < G; t += 1) {
      const curGi = (startGi + t) % G
      const slots = grupos[curGi].slots
      if (si < slots.length && slots[si] == null) {
        return { gi: curGi, si }
      }
    }
  }
  return null
}
