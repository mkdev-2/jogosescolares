import { useEffect, useState } from 'react'
import { configuracoesService } from '../services/configuracoesService'
import { isCadastroEscolaEncerrado } from '../utils/cadastroEscolaPrazo'

/** Adesão das escolas ainda aceita formulário público (/cadastro). */
export function useAdesaoEscolasAberta() {
  const [adesaoAberta, setAdesaoAberta] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    configuracoesService
      .getCadastroDataLimite()
      .then((valor) => {
        setAdesaoAberta(!isCadastroEscolaEncerrado(valor))
      })
      .catch(() => setAdesaoAberta(true))
      .finally(() => setLoading(false))
  }, [])

  return { adesaoAberta, loading }
}
