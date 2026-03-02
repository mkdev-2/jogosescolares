import { useEffect, useState } from 'react'

/**
 * Wrapper que aplica transição suave de entrada ao montar.
 * Útil para transições entre páginas/rotas.
 */
export default function PageTransition({ children, className = '' }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true))
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={`page-transition ${ready ? 'page-transition-ready' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
