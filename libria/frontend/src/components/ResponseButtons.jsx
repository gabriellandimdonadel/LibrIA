import { useState, useCallback } from 'react'
import { speak, stopSpeaking, ttsSupported } from '../utils/speech'

/**
 * Painel de resposta do surdo.
 * Mostra botões gerados pela IA com respostas contextuais ao texto.
 * Ao tocar, o app lê a frase em voz alta para o ouvinte.
 */
export default function ResponseButtons({ responses = [] }) {
  const [speaking, setSpeaking] = useState(null) // índice da resposta sendo falada

  const handleSpeak = useCallback((text, index) => {
    if (speaking === index) {
      stopSpeaking()
      setSpeaking(null)
      return
    }

    setSpeaking(index)
    speak(text, {
      onEnd: () => setSpeaking(null),
    })
  }, [speaking])

  if (!responses.length) return null

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '14px',
      padding: '16px',
    }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '16px' }}>💬</span>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>
            Resposta do surdo
          </p>
          <p style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
            {ttsSupported
              ? 'Toque em uma resposta — o app vai falar em voz alta para o ouvinte'
              : 'Toque para mostrar a resposta ao ouvinte'}
          </p>
        </div>
      </div>

      {/* Botões de resposta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {responses.map((text, i) => {
          const isActive = speaking === i
          return (
            <button
              key={i}
              onClick={() => handleSpeak(text, i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: isActive
                  ? '1.5px solid #34d399'
                  : '1.5px solid #334155',
                background: isActive
                  ? 'rgba(52,211,153,0.12)'
                  : '#1e293b',
                color: isActive ? '#34d399' : '#cbd5e1',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.18s',
                boxShadow: isActive ? '0 0 0 3px rgba(52,211,153,0.15)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = '#6366f1' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = '#334155' }}
            >
              <span style={{ fontSize: '14px' }}>
                {isActive ? '🔊' : '🤐'}
              </span>
              <span>{isActive ? 'Falando…' : text}</span>
            </button>
          )
        })}
      </div>

      {/* Nota para o ouvinte */}
      {speaking !== null && (
        <p style={{
          marginTop: '12px', fontSize: '11px', color: '#34d399',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span>🔊</span>
          <span>O app está falando em voz alta para o ouvinte…</span>
        </p>
      )}
    </div>
  )
}
