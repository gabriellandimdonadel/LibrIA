import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Loader2, RotateCcw, Mic, MicOff } from 'lucide-react'
import { openVLibras, closeVLibrasPanel } from '../utils/vlibras'
import { speak, stopSpeaking } from '../utils/speech'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Utilidade: chama a API de simplificação ────────────────────────────────────
async function fetchSimplify(text) {
  const res = await fetch(`${API_URL}/simplify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model: 'gemini-2.5-flash' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Erro ${res.status}` }))
    const msg = Array.isArray(err.detail) ? err.detail.map(e => e.msg).join('; ') : (err.detail || 'Erro desconhecido')
    throw new Error(msg)
  }
  return res.json()
}

// ── Bolha do ouvinte ──────────────────────────────────────────────────────────
function OuvinteBubble({ msg }) {
  const [signState, setSignState] = useState(null)
  const timerRef = useRef(null)

  const handleSign = useCallback(() => {
    clearTimeout(timerRef.current)
    const wasOpen = openVLibras()
    if (wasOpen) {
      setSignState('tap')
      timerRef.current = setTimeout(() => { setSignState(null); closeVLibrasPanel() }, 40000)
    } else {
      setSignState('greeting')
      timerRef.current = setTimeout(() => {
        setSignState('tap')
        timerRef.current = setTimeout(() => { setSignState(null); closeVLibrasPanel() }, 40000)
      }, 3200)
    }
  }, [])

  useEffect(() => () => { clearTimeout(timerRef.current); closeVLibrasPanel() }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <span style={{ fontSize: '10px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', paddingRight: '4px' }}>
        Ouvinte 🎙️
      </span>

      <div style={{ maxWidth: '90%', width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px 4px 14px 14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Status de carregamento */}
        {msg.status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={14} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '13px', color: '#64748b' }}>Simplificando…</span>
          </div>
        )}

        {msg.status === 'error' && (
          <p style={{ fontSize: '13px', color: '#f87171' }}>Erro: {msg.error}</p>
        )}

        {msg.status === 'done' && (
          <>
            {/* Texto original (colapsado visualmente) */}
            <details style={{ cursor: 'pointer' }}>
              <summary style={{ fontSize: '11px', color: '#334155', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#475569' }}>▸</span>
                <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '10px' }}>Texto original</span>
              </summary>
              <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>{msg.original}</p>
            </details>

            {/* Texto simplificado */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Simplificado para Libras
              </p>

              {/* Hint de estado VLibras */}
              {signState === 'greeting' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '7px 10px', marginBottom: '8px' }}>
                  <Loader2 size={12} color="#fbbf24" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#fbbf24' }}>Aguarde a saudação do avatar…</span>
                </div>
              )}
              {signState === 'tap' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '7px 10px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px' }}>👆</span>
                    <span style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 600 }}>Toque no texto para sinalizar</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#475569' }}>Após ver a sinalização, feche o avatar (✕) para ver as respostas</span>
                </div>
              )}

              <p
                id={`msg-${msg.id}`}
                style={{
                  fontSize: '15px', fontWeight: 600, color: '#f8fafc', lineHeight: 1.6,
                  padding: signState === 'tap' ? '10px' : '0',
                  border: signState === 'tap' ? '2px solid #6366f1' : '2px solid transparent',
                  borderRadius: signState === 'tap' ? '8px' : '0',
                  background: signState === 'tap' ? 'rgba(99,102,241,0.08)' : 'transparent',
                  transition: 'all 0.25s',
                  cursor: signState === 'tap' ? 'pointer' : 'default',
                }}
              >
                {msg.simplified}
              </p>
            </div>

            {/* Botão sinalizar */}
            <button
              onClick={handleSign}
              disabled={signState === 'greeting'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px',
                padding: '10px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                opacity: signState === 'greeting' ? 0.6 : 1, transition: 'all 0.15s',
                boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
              }}>
              {signState === 'greeting' ? '⏳ Aguarde…' : signState === 'tap' ? '✓ Toque no texto' : '🤟 Sinalizar em Libras'}
            </button>

          </>
        )}
      </div>
    </div>
  )
}

// ── Bolha do surdo ────────────────────────────────────────────────────────────
function SurdoBubble({ msg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
      <span style={{ fontSize: '10px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: '4px' }}>
        Surdo 🤟
      </span>
      <div style={{ maxWidth: '70%', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '4px 14px 14px 14px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>🔊</span>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#6ee7b7', lineHeight: 1.5 }}>{msg.text}</p>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '32px 20px', textAlign: 'center' }}>
      <span style={{ fontSize: '40px' }}>🤟</span>
      <div>
        <p style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>Modo Conversa</p>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, maxWidth: '340px' }}>
          O ouvinte escreve ou fala uma mensagem.<br />
          A IA simplifica e gera botões de resposta.<br />
          O surdo toca para responder em voz alta.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
        {[
          { icon: '🎙️', label: 'Ouvinte fala ou escreve', sub: 'Microfone contínuo ou teclado' },
          { icon: '🤟', label: 'VLibras sinaliza', sub: 'O avatar gesticula para o surdo' },
          { icon: '💬', label: 'Surdo responde', sub: 'Toca um botão → app fala em voz alta' },
        ].map(({ icon, label, sub }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 14px', textAlign: 'left' }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{label}</p>
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Conversation() {
  const [messages, setMessages]   = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading]     = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [liveText, setLiveText]       = useState('')
  const [micSupported]                = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  const threadRef      = useRef(null)
  const inputRef       = useRef(null)
  const endRef         = useRef(null)
  const recognitionRef = useRef(null)
  const accumulatedRef = useRef('')
  const activeRef      = useRef(false)

  // Auto-scroll para a última mensagem
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => { activeRef.current = false; recognitionRef.current?.abort() }, [])

  const sendOuvinte = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInputText('')
    setLoading(true)

    const id = Date.now()
    setMessages(prev => [...prev, { id, from: 'ouvinte', original: trimmed, status: 'loading', simplified: '', responses: [], replied: false }])

    try {
      const data = await fetchSimplify(trimmed)
      setMessages(prev => prev.map(m =>
        m.id === id
          ? { ...m, status: 'done', simplified: data.simplified, responses: data.responses }
          : m
      ))
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, status: 'error', error: e.message } : m
      ))
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Chamado quando o surdo seleciona uma resposta: marca msg como respondida e adiciona bolha do surdo
  const handleSurdoReply = useCallback((ouviId, text) => {
    setMessages(prev => {
      const marked = prev.map(m => m.id === ouviId ? { ...m, replied: true } : m)
      return [...marked, { id: Date.now() + 1, from: 'surdo', text }]
    })
    // Foca o input para o ouvinte responder
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendOuvinte(inputText)
    }
  }, [inputText, sendOuvinte])

  // Mensagem com respostas pendentes (turno do surdo)
  const pendingMsg = useMemo(() =>
    [...messages].reverse().find(m =>
      m.from === 'ouvinte' && m.status === 'done' && !m.replied && m.responses?.length > 0
    ) ?? null,
  [messages])

  const [pendingSelect, setPendingSelect] = useState(null)

  useEffect(() => { if (!pendingMsg) setPendingSelect(null) }, [pendingMsg])

  const handleChipTap = useCallback((text, i) => {
    if (!pendingMsg) return
    if (pendingSelect?.index === i) {
      // Segundo toque: envia a resposta
      speak(text)
      handleSurdoReply(pendingMsg.id, text)
      setPendingSelect(null)
    } else {
      // Primeiro toque: seleciona (VLibras sinaliza naturalmente)
      setPendingSelect({ index: i })
    }
  }, [pendingMsg, pendingSelect, handleSurdoReply])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR || loading) return

    accumulatedRef.current = ''
    setLiveText('')
    activeRef.current = true

    const recognition = new SR()
    recognition.lang           = 'pt-BR'
    recognition.continuous     = false
    recognition.interimResults = true
    recognitionRef.current     = recognition

    recognition.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t; else interim += t
      }
      if (final) {
        accumulatedRef.current = (accumulatedRef.current + ' ' + final).trim()
      }
      setLiveText((accumulatedRef.current + (interim ? ' ' + interim : '')).trim())
    }

    recognition.onend = () => {
      // Reinicia enquanto usuário não parar — acumula sem enviar
      if (activeRef.current) {
        setTimeout(() => { try { recognition.start() } catch (_) {} }, 100)
      }
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      activeRef.current = false
      setIsListening(false)
      setLiveText('')
    }

    recognition.start()
    setIsListening(true)
  }, [loading])

  const stopListening = useCallback(() => {
    activeRef.current = false           // impede o restart em recognition.onend
    recognitionRef.current?.stop()
    setIsListening(false)

    const captured = accumulatedRef.current.trim()
    accumulatedRef.current = ''
    setLiveText('')
    if (captured) sendOuvinte(captured) // envia tudo de uma vez
  }, [sendOuvinte])

  const handleReset = useCallback(() => {
    activeRef.current = false
    recognitionRef.current?.abort()
    setIsListening(false)
    setLiveText('')
    setMessages([])
    setInputText('')
    closeVLibrasPanel()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 160px)', minHeight: '400px' }}>

      {/* Thread de mensagens */}
      <div
        ref={threadRef}
        className="conv-thread"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '4px' }}
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map(msg =>
            msg.from === 'ouvinte'
              ? <OuvinteBubble key={msg.id} msg={msg} />
              : <SurdoBubble   key={msg.id} msg={msg} />
          )
        )}
        <div ref={endRef} />
      </div>

      {/* Área de input / respostas */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid #1e293b' }}>

        {/* ── Turno do surdo: chips horizontais ─────────────── */}
        {pendingMsg && (
          <div style={{ marginBottom: '10px' }}>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🤟</span>
              <span style={{ fontWeight: 600 }}>
                {pendingSelect != null
                  ? 'Toque novamente para enviar ao ouvinte'
                  : 'Surdo: toque 1× para ver em Libras · 2× para enviar'}
              </span>
            </p>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {pendingMsg.responses.map((text, i) => {
                const sel = pendingSelect?.index === i
                return (
                  <button key={i} onClick={() => handleChipTap(text, i)} style={{
                    flexShrink: 0, padding: '11px 18px', borderRadius: '22px', border: 'none',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    background: sel ? '#4f46e5' : '#1e293b',
                    color: sel ? '#fff' : '#94a3b8',
                    fontSize: '13px', fontWeight: 600, transition: 'all 0.18s',
                    boxShadow: sel ? '0 0 0 3px rgba(79,70,229,0.3), 0 2px 10px rgba(79,70,229,0.4)' : 'none',
                  }}>
                    {sel ? `✓ ${text}` : text}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Indicador de quem deve falar agora (só quando é turno do ouvinte) */}
        {!pendingMsg && messages.length > 0 && (
          <p style={{ fontSize: '11px', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎙️</span>
            <span>{loading ? 'Simplificando mensagem…' : 'Ouvinte: escreva ou fale a mensagem'}</span>
          </p>
        )}

        {/* Input do ouvinte — oculto enquanto surdo responde */}
        <div style={{ display: pendingMsg ? 'none' : 'flex', gap: '8px', alignItems: 'center' }}>

          {/* Botão microfone contínuo */}
          {micSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={loading}
              title={isListening ? 'Parar' : 'Falar (contínuo)'}
              style={{
                width: '46px', height: '46px', borderRadius: '12px', border: 'none', flexShrink: 0,
                background: isListening ? '#ef4444' : '#1e293b',
                color: isListening ? '#fff' : '#64748b',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: isListening ? '0 0 0 4px rgba(239,68,68,0.2), 0 2px 8px rgba(239,68,68,0.4)' : 'none',
              }}>
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}

          {/* Campo de texto ou transcrição ao vivo */}
          <div style={{ flex: 1, background: '#0f172a', border: `1px solid ${isListening ? 'rgba(239,68,68,0.35)' : '#1e293b'}`, borderRadius: '12px', display: 'flex', alignItems: 'center', transition: 'border-color 0.15s', minWidth: 0 }}>
            {isListening ? (
              <p style={{ flex: 1, padding: '12px 14px', fontSize: '14px', color: liveText ? '#f87171' : '#334155', fontStyle: liveText ? 'normal' : 'italic', lineHeight: 1.4, margin: 0 }}>
                {liveText || 'Ouvindo…'}
              </p>
            ) : (
              <input
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ouvinte: escreva a mensagem…"
                disabled={loading}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '12px 14px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'inherit' }}
              />
            )}
          </div>

          {/* Botão enviar (só aparece com texto digitado) */}
          {!isListening && (
            <button
              onClick={() => sendOuvinte(inputText)}
              disabled={!inputText.trim() || loading}
              style={{
                width: '46px', height: '46px', borderRadius: '12px', border: 'none', flexShrink: 0,
                background: inputText.trim() && !loading ? '#4f46e5' : '#1e293b',
                color: inputText.trim() && !loading ? '#fff' : '#334155',
                cursor: inputText.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: inputText.trim() && !loading ? '0 2px 8px rgba(79,70,229,0.3)' : 'none',
              }}>
              {loading
                ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={18} />
              }
            </button>
          )}

          {/* Botão resetar conversa */}
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              title="Reiniciar conversa"
              style={{ width: '46px', height: '46px', borderRadius: '12px', border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#475569' }}>
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        <p style={{ fontSize: '11px', color: '#334155', textAlign: 'center', marginTop: '6px' }}>
          {isListening ? '🔴 Gravando… toque no microfone para parar e enviar' : 'Enter para enviar · 🎙️ gravar mensagem'}
        </p>
      </div>
    </div>
  )
}
