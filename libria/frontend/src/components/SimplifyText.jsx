import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { openVLibras, closeVLibrasPanel } from '../utils/vlibras'
import ResponseButtons from './ResponseButtons'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const COMPLEXITY = {
  alto:  { label: 'Alta complexidade',  color: '#f87171' },
  médio: { label: 'Média complexidade', color: '#fbbf24' },
  baixo: { label: 'Baixa complexidade', color: '#34d399' },
}

const STEPS = [
  { n: '1', text: 'Cole um texto complexo no campo acima (notícia, contrato, bula...)' },
  { n: '2', text: 'Escolha o modelo e clique em "Simplificar com IA"' },
  { n: '3', text: 'Leia a versão simplificada em português acessível' },
  { n: '4', text: 'Toque em "Sinalizar em Libras" para o avatar gesticular' },
]

const EXAMPLES = [
  "O beneficiário deverá comparecer à repartição competente munido de documentação hábil, nos termos do regulamento vigente, para efetuar o requerimento do auxílio previdenciário.",
  "Em decorrência das intempéries climáticas registradas nesta data, o estabelecimento de ensino suspenderá as atividades pedagógicas, retomando-as na data subsequente.",
  "O paciente deverá submeter-se a exames complementares para elucidação do diagnóstico e posterior definição da conduta terapêutica mais adequada ao seu quadro clínico.",
]

const card = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', overflow: 'hidden' }
const cardFlat = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px' }

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

// Hook para controlar o fluxo de sinalização
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

export default function SimplifyText() {
  const [inputText, setInputText] = useState('')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [copied, setCopied]       = useState(false)
  const [model, setModel]         = useState('gemini-2.5-flash')
  const [wide, setWide]           = useState(window.innerWidth >= 768)
  const resultRef                 = useRef(null)

  const { signState, trigger: triggerSign, reset: resetSign } = useSignalFlow()

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const charCount   = inputText.length
  const isOverLimit = charCount > 4000
  const complexity  = result ? (COMPLEXITY[result.complexity] ?? COMPLEXITY['médio']) : null

  async function handleSimplify() {
    if (!inputText.trim() || loading || isOverLimit) return
    setLoading(true); setError(null); setResult(null); resetSign()
    try {
      const res = await fetch(`${API_URL}/simplify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, model }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `Erro ${res.status}` }))
        const msg = Array.isArray(err.detail) ? err.detail.map(e => e.msg).join('; ') : (err.detail || 'Erro desconhecido')
        throw new Error(msg)
      }
      const data = await res.json()
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleCopy() {
    if (!result?.simplified) return
    await navigator.clipboard.writeText(result.simplified)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Card de input ─────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1e293b', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Texto para simplificar</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select value={model} onChange={e => setModel(e.target.value)}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontSize: '12px', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}>
              <option value="gemini-2.5-flash">⚡ Flash (rápido)</option>
              <option value="gemini-2.5-pro">🎯 Pro (preciso)</option>
            </select>
            <span style={{ fontSize: '12px', color: isOverLimit ? '#f87171' : '#334155', fontVariantNumeric: 'tabular-nums' }}>{charCount}/4000</span>
          </div>
        </div>

        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Cole aqui notícia, formulário, bula de remédio, contrato..."
          rows={7}
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '14px 16px', color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderTop: '1px solid #1e293b' }}>
          <span style={{ fontSize: '12px', color: '#334155' }}>Exemplo:</span>
          {EXAMPLES.map((ex, i) => (
            <button key={i}
              onClick={() => { setInputText(ex); setResult(null); setError(null); resetSign() }}
              style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', color: '#64748b', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { e.target.style.background = '#312e81'; e.target.style.color = '#a5b4fc' }}
              onMouseLeave={e => { e.target.style.background = '#1e293b'; e.target.style.color = '#64748b' }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* ── Botão principal ───────────────────────────── */}
      <button className="btn-primary" onClick={handleSimplify}
        disabled={!inputText.trim() || loading || isOverLimit}>
        {loading
          ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Simplificando…</>
          : <><Sparkles size={18} /> Simplificar com IA</>
        }
      </button>

      {/* ── Como funciona (estado inicial) ───────────── */}
      {!result && !loading && (
        <div style={cardFlat}>
          <p className="section-label" style={{ marginBottom: '14px' }}>Como funciona</p>
          <div style={{ display: 'grid', gridTemplateColumns: wide ? '1fr 1fr' : '1fr', gap: '12px' }}>
            {STEPS.map(({ n, text }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ minWidth: '22px', height: '22px', borderRadius: '50%', background: '#4f46e5', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginTop: '2px' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Erro ──────────────────────────────────────── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '12px 14px' }}>
          <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontSize: '13px', color: '#f87171', lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      {/* ── Resultado ─────────────────────────────────── */}
      {result && (
        <div ref={resultRef} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Badge complexidade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: complexity.color }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: complexity.color }}>{complexity.label}</span>
            <span style={{ fontSize: '12px', color: '#334155' }}>· {result.model_used}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: wide ? '1fr 1fr' : '1fr', gap: '12px' }}>

            {/* Original */}
            <div style={{ ...cardFlat }}>
              <p className="section-label" style={{ marginBottom: '10px' }}>Texto original</p>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>{result.original}</p>
            </div>

            {/* Simplificado + Sinalizar */}
            <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="section-label" style={{ color: '#818cf8' }}>Versão simplificada</p>
                <button onClick={handleCopy}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1e293b', border: '1px solid #334155', color: '#64748b', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', cursor: 'pointer' }}>
                  {copied ? <><Check size={11} color="#34d399" /> Copiado</> : <><Copy size={11} /> Copiar</>}
                </button>
              </div>

              {/* Hint de estado */}
              {signState === 'greeting' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '8px 12px' }}>
                  <Loader2 size={14} color="#fbbf24" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#fbbf24' }}>Aguarde a saudação do avatar…</span>
                </div>
              )}
              {signState === 'tap' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '8px', padding: '8px 12px' }}>
                  <span style={{ fontSize: '16px' }}>👆</span>
                  <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600 }}>Toque no texto abaixo para sinalizar</span>
                </div>
              )}

              {/* Texto simplificado — destacado quando pronto */}
              <p id="libria-simplified" style={textCardStyle(signState === 'tap')}>
                {result.simplified}
              </p>

              <button
                className="btn-primary"
                onClick={triggerSign}
                disabled={signState === 'greeting'}
                style={signState === 'greeting' ? { opacity: 0.6, cursor: 'not-allowed', boxShadow: 'none' } : {}}>
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

          {/* O que mudou */}
          {result.changes?.length > 0 && (
            <div style={cardFlat}>
              <p className="section-label" style={{ marginBottom: '10px' }}>O que foi simplificado</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.changes.map((change, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>→</span>
                    <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{change}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
