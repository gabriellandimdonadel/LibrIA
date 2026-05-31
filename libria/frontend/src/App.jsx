import { useState } from 'react'
import SimplifyText from './components/SimplifyText'
import Conversation from './components/Conversation'

const MODES = [
  { id: 'conversation', label: '💬 Conversa'    },
  { id: 'simplifier',   label: '📝 Simplificar' },
]

export default function App() {
  const [mode, setMode] = useState('conversation')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#020617' }}>

      {/* ─── Header ─────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid #1e293b',
        background: 'rgba(2,6,23,0.96)',
        backdropFilter: 'blur(8px)',
      }}>
        <div className="app-container" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Marca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px', lineHeight: 1 }} aria-label="Mão sinalizando">🤟</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                Libr<span style={{ color: '#818cf8' }}>IA</span>
              </span>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                Acessibilidade para a comunidade surda
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['✨ Gemini', '🤟 VLibras'].map(b => (
                <span key={b} style={{ fontSize: '10px', color: '#94a3b8', background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', borderRadius: '20px' }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '4px' }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{
                  flex: 1, padding: '10px 8px',
                  borderRadius: '7px', border: 'none',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.18s',
                  background: mode === m.id ? '#4f46e5' : 'transparent',
                  color: mode === m.id ? '#fff' : '#64748b',
                  boxShadow: mode === m.id ? '0 1px 6px rgba(79,70,229,0.4)' : 'none',
                  whiteSpace: 'nowrap',
                }}>
                {m.label}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* ─── Main ───────────────────────────────────── */}
      <main className="app-container" style={{ flex: 1, padding: '16px 16px 24px' }}>

        {/* Banner de acessibilidade */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'linear-gradient(135deg, rgba(79,70,229,0.14), rgba(99,102,241,0.06))',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '12px', padding: '10px 14px', marginBottom: '14px',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🤟</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', lineHeight: 1 }}>Site acessível em Libras</p>
            <p style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
              Simplifique textos e use o avatar para ver em Língua Brasileira de Sinais.
            </p>
          </div>
          <button
            onClick={() => { const btn = document.querySelector('[vw-access-button]'); if (btn) btn.click() }}
            style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Ativar 🤟
          </button>
        </div>

        {mode === 'simplifier'   && <SimplifyText />}
        {mode === 'conversation' && <Conversation />}
      </main>

      {/* ─── Footer ─────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #1e293b', padding: '12px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', color: '#334155' }}>LibrIA · Acessibilidade é direito, não privilégio.</span>
      </footer>

    </div>
  )
}
