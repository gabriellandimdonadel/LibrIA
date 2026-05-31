/**
 * VLibras requer clique real (isTrusted: true) para traduzir.
 * O widget flutua livremente sobre o conteúdo — não é possível controlar
 * sua posição sem quebrar o funcionamento interno.
 *
 * Estratégia: abrir o avatar e rolar o chat para que os botões de resposta
 * fiquem na parte inferior da tela (abaixo do avatar flutuante).
 */
export function openVLibras() {
  const wrapper   = document.querySelector('[vw-plugin-wrapper]')
  const accessBtn = document.querySelector('[vw-access-button]')
  const wasOpen   = Boolean(wrapper && wrapper.offsetHeight > 0)
  if (!wasOpen && accessBtn) accessBtn.click()

  // Rola o chat para o fim: botões de resposta ficam no rodapé, abaixo do VLibras
  setTimeout(() => {
    const thread = document.querySelector('.conv-thread')
    if (thread) thread.scrollTop = thread.scrollHeight
  }, 80)

  return wasOpen
}

// Mantido por compatibilidade com os componentes — não faz nada
export function closeVLibrasPanel() {}
