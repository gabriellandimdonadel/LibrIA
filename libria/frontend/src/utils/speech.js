/**
 * Text-to-Speech em pt-BR usando a Web Speech API nativa do browser.
 * Usado para o surdo tocar uma resposta e o ouvinte ouvir em voz alta.
 */

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text, { onStart, onEnd } = {}) {
  if (!ttsSupported) return
  window.speechSynthesis.cancel()

  const u = new SpeechSynthesisUtterance(text)
  u.lang  = 'pt-BR'
  u.rate  = 0.88
  u.pitch = 1.0

  // Preferência por voz feminina pt-BR se disponível
  const voices = window.speechSynthesis.getVoices()
  const ptVoice = voices.find(v => v.lang === 'pt-BR') ?? voices.find(v => v.lang.startsWith('pt'))
  if (ptVoice) u.voice = ptVoice

  if (onStart) u.onstart = onStart
  if (onEnd)   u.onend   = onEnd

  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel()
}
