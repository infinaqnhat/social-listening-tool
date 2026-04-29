import { useStore } from '../store/searchStore'
import type { HistoryEntry } from '../store/searchStore'

function fmtHistoryDate(isoStr: string): string {
  const d = new Date(isoStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return 'Today ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const EMOJI: Record<string, string> = { facebook: '🔵', linkedin: '🔷', tiktok: '♪' }
const NAME: Record<string, string>  = { facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok' }

export default function HistoryPanel() {
  const { history, deleteHistory, clearHistory, restoreFromHistory, setInsightsView } = useStore()

  if (!history.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">No search history yet.</div>
    )
  }

  const handleRestore = (entry: HistoryEntry) => {
    restoreFromHistory(entry)
    setInsightsView('results')
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 transition">
          Clear all
        </button>
      </div>
      <div className="space-y-3">
        {history.map(e => {
          const platArr = e.platforms?.length ? e.platforms : ['facebook']
          const platLabel = platArr.map(p => `${EMOJI[p] || ''} ${NAME[p] || p}`).join(' + ')
          const total = (e.allResults?.length || 0) + (e.liResults?.length || 0) + (e.ttResults?.length || 0)
          const dateRange = (e.dateFrom || e.dateTo) ? `${e.dateFrom || '…'} → ${e.dateTo || '…'}` : 'Any date'

          return (
            <div key={e.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm truncate">{e.keyword}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{platLabel}</span>
                  <span className="text-xs text-gray-400">{total} result{total !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {dateRange} · {e.lang || 'any'} · {fmtHistoryDate(e.timestamp)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRestore(e)}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Restore
                </button>
                <button
                  onClick={() => deleteHistory(e.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition p-1"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
