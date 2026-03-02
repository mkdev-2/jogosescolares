import { useEffect, useRef, useState } from 'react'

/**
 * Componente que anima os filhos quando entram no viewport ao rolar a página.
 * @param {string} animation - 'up' | 'in' | 'left'
 * @param {number} threshold - 0 a 1, quanto do elemento precisa estar visível (padrão 0.1)
 * @param {number} rootMargin - margem em px para disparar antes (ex: '50px' para antecipar)
 */
export default function AnimateOnScroll({
  children,
  animation = 'up',
  threshold = 0.1,
  rootMargin = '0px 0px -30px 0px',
  className = '',
  as: Component = 'div',
}) {
  const ref = useRef(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true)
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  const animationClass = {
    up: 'reveal-up',
    in: 'reveal-in',
    left: 'reveal-left',
  }[animation]

  return (
    <Component
      ref={ref}
      className={`${animationClass} ${revealed ? 'revealed' : ''} ${className}`.trim()}
    >
      {children}
    </Component>
  )
}
