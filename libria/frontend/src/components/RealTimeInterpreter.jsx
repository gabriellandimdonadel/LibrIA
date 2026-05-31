import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { openVLibras, closeVLibrasPanel } from '../utils/vlibras'
import ResponseButtons from './ResponseButtons'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Estado do fluxo de sinalização
// null → 'greeting' (avatar abrindo, saudação ~3s) → 'tap' (pronto, toque no texto) → null (reset)
function useSignalFlow() {
  const [signState, setSignState] = useState(null)
  const timerRef = useRef(null)

  const trigger = useCallback(() => {
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

  const reset = useCallback(() => {
    clearTimeout(timerRef.current)
    setSignState(null)
    closeVLibrasPanel()
  }, [])

  useEffect(() => () => { clearTimeout(timerRef.current); closeVLibrasPanel() }, [])

  return { signState, trigger, reset }
}

// Estilos do card de texto a sinalizar
function textCardStyle(active) {
  return {
    fontSize: '15px', fontWeight: 600, color: '#f8fafc', lineHeight: 1.6,
    padding: active ? '12px' : '0',
    border: active ? '2px solid #6366f1' : '2px solid transparent',
    borderRadius: active ? '10px' : '0',
    background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
    cursor: active ? 'pointer' : 'default',
    transition: 'all 0.25s',
  }
}

const S = {
  grid:        { display: 'grid', gridTemplateColumns: '1fr',         gap: '16px' },
  gridDesktop: { display: 'grid', gridTemplateColumns: '200px 1fr',   gap: '16px', alignItems: 'start' },
  micPanel:    { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  card:        { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px' },
  cardHi:      { background: '#0f172a', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '14px', padding: '16px' },
}

export default function RealTimeInterpreter() {
  const [isListening, setIsListening] = useState(false)
  const [liveText, setLiveText]       = useState('')
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [supported, setSupported]     = useState(true)
  const [history, setHistory]         = useState([])
  const [wide, setWide]               = useState(window.innerWidth >= 640)

  const { signState, trigger: triggerSign, reset: resetSign } = useSignalFlow()

  const recognitionRef = useRef(null)
  const accumulatedRef = useRef('')
  const activeRef      = useRef(false)

  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) setSupported(false)
    const onResize = () => setWide(window.innerWidth >= 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const simplify = useCallback(async (text) => {
    if (!text.trim() || text.trim().length < 5) return
    setLoading(true); setError(null); resetSign()
    try {
      const res = await fetch(`${API_URL}/simplify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model: 'gemini-2.5-flash' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `Erro ${res.status}` }))
        const msg = Array.isArray(err.detail) ? err.detail.map(e => e.msg).join('; ') : (err.detail || 'Erro desconhecido')
        throw new Error(msg)
      }
      const data = await res.json()
      setResult(data)
      setHistory(h => [data, ...h].slice(0, 5))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [resetSign])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'pt-BR'; recognition.continuous = false; recognition.interimResults = true
    recognitionRef.current = recognition; activeRef.current = true

    recognition.onstart  = () => { setLiveText(''); accumulatedRef.current = '' }
    recognition.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t; else interim += t
      }
      if (final) accumulatedRef.current += ' ' + final
      setLiveText((accumulatedRef.current + ' ' + interim).trim())
    }
    recognition.onend = () => {
      const captured = accumulatedRef.current.trim()
      if (captured) { setLiveText(captured); simplify(captured) }
      if (activeRef.current) setTimeout(() => { try { recognition.start() } catch (_) {} }, 300)
    }
    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      setError(`Erro no microfone: ${e.error}`)
    }
    recognition.start()
    setIsListening(true); setResult(null); setError(null); resetSign()
  }, [simplify, resetSign])

  const stopListening = useCallback(() => {
    activeRef.current = false; recognitionRef.current?.stop()
    setIsListening(false); setLiveText('')
  }, [])

  useEffect(() => () => { activeRef.current = false; recognitionRef.current?.abort() }, [])

  if (!supported) return (
    <div style={{ ...S.card, textAlign: 'center', padding: '32px 20px' }}>
      <p style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '8px' }}>Navegador não suportado</p>
      <p style={{ color: '#64748b', fontSize: '13px' }}>Use Chrome ou Edge — o Firefox não suporta a Web Speech API.</p>
    </div>
  )

  const STEPS = [
    'Toque no microfone e fale em português',
    'A IA simplifica automaticamente para Libras',
    'Toque "Sinalizar em Libras" para o avatar gesticular',
    'O microfone reinicia para a próxima frase',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={wide ? S.gridDesktop : S.grid}>

        {/* ── Painel do microfone ──────────────────────── */}
        <div style={S.micPanel}>
          <div style={{ position: 'relative' }}>
            {isListening && (
              <>
                <div style={{ position: 'absolute', inset: '-12px', borderRadius: '50%', background: '#ef4444', animation: 'micPulse 1.4s ease-out infinite', opacity: 0.15 }} />
                <div style={{ position: 'absolute', inset: '-24px', borderRadius: '50%', border: '2px solid rgba(239,68,68,0.2)', animation: 'micPulse 1.4s ease-out infinite', animationDelay: '0.4s' }} />
              </>
            )}
            <button
              onClick={() => isListening ? stopListening() : startListening()}
              aria-label={isListening ? 'Parar' : 'Falar'}
              style={{
                width: '96px', height: '96px', borderRadius: '50%', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isListening ? '#ef4444' : '#4f46e5',
                boxShadow: isListening
                  ? '0 0 0 4px rgba(239,68,68,0.2), 0 8px 24px rgba(239,68,68,0.4)'
                  : '0 0 0 4px rgba(79,70,229,0.2), 0 8px 24px rgba(79,70,229,0.4)',
                transition: 'all 0.2s', position: 'relative',
              }}>
              {isListening ? <MicOff size={36} color="#fff" /> : <Mic size={36} color="#fff" />}
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', color: isListening ? '#f87171' : '#e2e8f0' }}>
              {isListening ? 'Ouvindo…' : 'Toque para falar'}
            </p>
            <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
              {isListening ? 'Toque para parar' : 'Chrome ou Edge'}
            </p>
          </div>

          {isListening && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '20px' }}>
              {[14, 20, 12, 18, 10, 16, 8].map((h, i) => (
                <div key={i} style={{ width: '3px', height: `${h}px`, borderRadius: '2px', background: '#f87171', animation: `micPulse ${0.6 + i * 0.1}s ease-in-out infinite alternate` }} />
              ))}
            </div>
          )}
        </div>

        {/* ── Painel de conteúdo ───────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Estado inicial */}
          {!isListening && !result && !loading && !error && (
            <div style={S.card}>
              <p className="section-label" style={{ marginBottom: '14px' }}>Como funciona</p>
              {STEPS.map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 3 ? '10px' : 0 }}>
                  <div style={{ minWidth: '22px', height: '22px', borderRadius: '50%', background: '#4f46e5', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginTop: '2px' }}>{text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Transcrição ao vivo */}
          {(isListening || liveText) && (
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isListening ? '#f87171' : '#475569', ...(isListening ? { animation: 'micPulse 1s ease-in-out infinite' } : {}) }} />
                <span className="section-label">{isListening ? 'Ouvindo' : 'Processando'}</span>
              </div>
              <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
                {liveText || <span style={{ color: '#334155', fontStyle: 'italic' }}>aguardando fala…</span>}
              </p>
            </div>
          )}

          {loading && (
            <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={16} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '13px', color: '#64748b' }}>Simplificando com IA…</span>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ fontSize: '13px', color: '#f87171' }}>{error}</p>
            </div>
          )}

          {/* Resultado */}
          {result && !loading && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              <div style={S.card}>
                <p className="section-label" style={{ marginBottom: '8px' }}>Você disse</p>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{result.original}</p>
              </div>

              <div style={S.cardHi}>
                <p className="section-label" style={{ color: '#818cf8', marginBottom: '10px' }}>Avatar vai sinalizar</p>

                {/* Hint de estado */}
                {signState === 'greeting' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
                    <Loader2 size={14} color="#fbbf24" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#fbbf24' }}>Aguarde a saudação do avatar…</span>
                  </div>
                )}
                {signState === 'tap' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '16px' }}>👆</span>
                    <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600 }}>Toque no texto abaixo para sinalizar</span>
                  </div>
                )}

                {/* Texto simplificado — destacado quando pronto */}
                <p id="libria-simplified-rt" style={textCardStyle(signState === 'tap')}>
                  {result.simplified}
                </p>

                <div style={{ marginTop: '14px' }}>
                  <button
                    className="btn-primary"
                    onClick={triggerSign}
                    style={signState === 'greeting' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
                    {signState === 'greeting'
                      ? '⏳ Aguarde o avatar…'
                      : signState === 'tap'
                        ? '✓ Toque no texto acima'
                        : '🤟 Sinalizar em Libras'
                    }
                  </button>
                </div>
              </div>

              {/* Respostas do surdo */}
              {result.responses?.length > 0 && (
                <ResponseButtons responses={result.responses} />
              )}

            </div>
          )}
        </div>
      </div>

      {/* Histórico */}
      {history.length > 1 && (
        <div>
          <p className="section-label" style={{ marginBottom: '8px' }}>Frases anteriores</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.slice(1).map((item, i) => (
              <div key={i} style={{ ...S.card, padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.original}</p>
                <span style={{ color: '#334155', fontSize: '12px', flexShrink: 0 }}>→</span>
                <p style={{ fontSize: '12px', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.simplified}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
