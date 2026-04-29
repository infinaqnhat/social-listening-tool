import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/searchStore'
import { fetchApifyUsage } from '../lib/apify'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsModal({ open, onClose }: Props) {
  const { token, claudeKey, setToken, setClaudeKey } = useStore()
  const [apifyVal, setApifyVal]   = useState(token)
  const [claudeVal, setClaudeVal] = useState(claudeKey)
  const [err, setErr]   = useState('')
  const [usage, setUsage] = useState<{
    limitUsd: number; usedUsd: number; cycleStart: string; cycleEnd: string
  } | null | 'loading'>('loading')

  useEffect(() => {
    if (!open) return
    setApifyVal(token)
    setClaudeVal(claudeKey)
    setErr('')
    setUsage('loading')
    fetchApifyUsage(token).then(setUsage)
  }, [open, token, claudeKey])

  const handleSave = () => {
    if (!apifyVal.trim()) { setErr('Apify token is required.'); return }
    setToken(apifyVal.trim())
    setClaudeKey(claudeVal.trim())
    onClose()
  }

  const backdropRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Apify API Token</label>
            <input
              type="password"
              placeholder="apify_api_…"
              value={apifyVal}
              onChange={e => setApifyVal(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-400 mt-1">Used to run Facebook and LinkedIn scrapers.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Claude API Key</label>
            <input
              type="password"
              placeholder="sk-ant-…"
              value={claudeVal}
              onChange={e => setClaudeVal(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-400 mt-1">Used to generate Insights. Optional.</p>
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Apify Credit Usage</p>
            {usage === 'loading' && <p className="text-xs text-gray-400 italic">Loading…</p>}
            {usage === null && <p className="text-xs text-red-400">Could not load usage. Check your token.</p>}
            {usage && usage !== 'loading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-700">
                  <span>Used: <strong>${usage.usedUsd.toFixed(2)}</strong></span>
                  <span>Limit: <strong>${usage.limitUsd.toFixed(2)}</strong></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usage.limitUsd > 0 && (usage.usedUsd / usage.limitUsd) >= 0.8
                        ? 'bg-red-500' : (usage.usedUsd / usage.limitUsd) >= 0.5
                        ? 'bg-yellow-400' : 'bg-blue-500'
                    }`}
                    style={{ width: `${usage.limitUsd > 0 ? Math.min(100, (usage.usedUsd / usage.limitUsd) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Remaining: <span className="font-medium text-gray-600">${Math.max(0, usage.limitUsd - usage.usedUsd).toFixed(2)}</span></span>
                  <span>
                    {usage.cycleStart ? new Date(usage.cycleStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'} –{' '}
                    {usage.cycleEnd   ? new Date(usage.cycleEnd).toLocaleDateString('en-US',   { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={handleSave} className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition">
            Save
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
