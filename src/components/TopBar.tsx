import { useState } from 'react'
import { useStore } from '../store/searchStore'
import { useSearch } from '../hooks/useSearch'
import SettingsModal from './SettingsModal'

const PLATFORM_LABELS: Record<string, string> = {
  facebook: '🔵 Facebook',
  linkedin: '🔷 LinkedIn',
  tiktok:   '♪ TikTok',
}

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d',    label: '7 days' },
  { id: '30d',   label: '30 days' },
  { id: 'custom', label: 'Custom' },
]

export default function TopBar() {
  const store = useStore()
  const { doSearch } = useSearch()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)

  const handlePreset = (preset: string) => {
    setActivePreset(preset)
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().slice(0, 10)

    if (preset === 'today') {
      store.setSearchParams({ dateFrom: fmt(today), dateTo: fmt(today) })
      setShowCustom(false)
    } else if (preset === '7d') {
      const from = new Date(today); from.setDate(today.getDate() - 6)
      store.setSearchParams({ dateFrom: fmt(from), dateTo: fmt(today) })
      setShowCustom(false)
    } else if (preset === '30d') {
      const from = new Date(today); from.setDate(today.getDate() - 29)
      store.setSearchParams({ dateFrom: fmt(from), dateTo: fmt(today) })
      setShowCustom(false)
    } else {
      setShowCustom(true)
    }
  }

  const handleSearch = () => {
    if (!store.keyword.trim()) return
    doSearch()
  }

  const platformPlaceholder = store.platforms.size > 1
    ? 'Search posts…'
    : store.platforms.has('facebook') ? 'Search Facebook posts…'
    : store.platforms.has('linkedin') ? 'Search LinkedIn posts…'
    : 'Search TikTok videos…'

  return (
    <>
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
          {/* Row 1: Brand + Search input + Settings */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900 text-sm whitespace-nowrap">Social Listening</span>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder={platformPlaceholder}
                value={store.keyword}
                onChange={e => store.setSearchParams({ keyword: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={handleSearch}
                disabled={store.running}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {store.running ? 'Searching…' : 'Search'}
              </button>
            </div>
            <button onClick={() => setSettingsOpen(true)} className="text-gray-400 hover:text-gray-700 transition p-1.5 rounded-lg hover:bg-gray-100" title="Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Row 2: Platform toggles + Date presets + Options */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform toggles */}
            {(['facebook', 'linkedin', 'tiktok'] as const).map(p => (
              <button
                key={p}
                onClick={() => store.togglePlatform(p)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  store.platforms.has(p)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}

            <span className="text-gray-300 text-xs">|</span>

            {/* Date presets */}
            {DATE_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  activePreset === p.id
                    ? 'bg-blue-50 text-blue-600 border-blue-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {p.label}
              </button>
            ))}

            <span className="text-gray-300 text-xs">|</span>

            {/* Language */}
            <select
              value={store.lang}
              onChange={e => store.setSearchParams({ lang: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="">Any language</option>
              <option value="vi">Vietnamese</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
            </select>

            {/* Result count */}
            <select
              value={store.totalResults}
              onChange={e => store.setSearchParams({ totalResults: parseInt(e.target.value) })}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              {[10, 20, 30, 50].map(n => (
                <option key={n} value={n}>{n} results</option>
              ))}
            </select>
          </div>

          {/* Custom date row */}
          {showCustom && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">From</label>
              <input
                type="date"
                value={store.dateFrom || ''}
                onChange={e => store.setSearchParams({ dateFrom: e.target.value || null })}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <label className="text-xs text-gray-500">To</label>
              <input
                type="date"
                value={store.dateTo || ''}
                onChange={e => store.setSearchParams({ dateTo: e.target.value || null })}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          )}

          {/* Status bar */}
          {store.status && (
            <p className="text-xs text-blue-600 animate-pulse">{store.status}</p>
          )}
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
