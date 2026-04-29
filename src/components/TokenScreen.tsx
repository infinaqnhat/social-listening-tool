import { useState } from 'react'
import { useStore } from '../store/searchStore'

export default function TokenScreen() {
  const setToken = useStore((s) => s.setToken)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!value.trim()) {
      setError('Please enter your Apify API token.')
      return
    }
    setToken(value.trim())
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 420, width: '100%' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Social Listening Tool</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>Enter your Apify API token to get started.</p>
        <input
          type="text"
          placeholder="apify_api_..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <button
          onClick={handleSave}
          style={{ width: '100%', padding: '10px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}
        >
          Save Token &amp; Start
        </button>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, textAlign: 'center' }}>
          Token is stored locally in your browser — never sent to any server.
        </p>
      </div>
    </div>
  )
}
