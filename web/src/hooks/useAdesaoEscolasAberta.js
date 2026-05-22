import { useEffect, useState } from 'react'
import { configuracoesService } from '../services/configuracoesService'
import { isCadastroEscolaEncerrado } from '../utils/cadastroEscolaPrazo'

/** Estado compartilhado — uma única consulta à API para todos os consumidores. */
let shared = { loading: true, adesaoAberta: null }
let inflight = null
const subscribers = new Set()

function emit() {
  subscribers.forEach((fn) => fn(shared))
}

function loadAdesaoStatusOnce() {
  if (inflight) return inflight
  inflight = configuracoesService
    .getCadastroDataLimite()
    .then((valor) => {
      shared = {
        loading: false,
        adesaoAberta: !isCadastroEscolaEncerrado(valor),
      }
    })
    .catch(() => {
      shared = { loading: false, adesaoAberta: true }
    })
    .finally(() => {
      emit()
    })
  return inflight
}

/** Adesão das escolas ainda aceita formulário público (/cadastro). */
export function useAdesaoEscolasAberta() {
  const [state, setState] = useState(shared)

  useEffect(() => {
    const onUpdate = (next) => setState({ ...next })
    subscribers.add(onUpdate)
    setState(shared)
    if (shared.loading) {
      loadAdesaoStatusOnce()
    }
    return () => subscribers.delete(onUpdate)
  }, [])

  return state
}
