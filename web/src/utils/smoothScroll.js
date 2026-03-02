/**
 * Faz scroll suave até o elemento com o id especificado.
 * @param {string} id - O id do elemento (sem o #)
 * @param {object} options - Opções para scrollIntoView
 */
export function scrollToId(id, options = {}) {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      ...options,
    })
  }
}

/**
 * Handler para usar em links âncora (ex: href="#informacoes")
 * Previne o comportamento padrão e faz scroll suave.
 */
export function handleAnchorClick(e) {
  const href = e.currentTarget.getAttribute('href')
  if (href?.startsWith('#')) {
    const id = href.slice(1)
    if (id && document.getElementById(id)) {
      e.preventDefault()
      scrollToId(id)
    }
  }
}
