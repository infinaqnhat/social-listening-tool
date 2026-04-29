import { useEffect } from 'react'
import { useStore } from '../store/searchStore'
import { useEnrichment } from '../hooks/useEnrichment'
import ResultCard from './ResultCard'
import { engagementScore } from '../lib/formatters'
import type { SearchResult } from '../lib/urlMatching'

export default function ResultsView() {
  const store = useStore()
  const { enrichPage, enrichAllForEngagement } = useEnrichment()

  const { activeTab, platforms, allResults, liResults, ttResults, page, perPage, sortMode } = store

  const results: SearchResult[] =
    activeTab === 'linkedin' ? liResults :
    activeTab === 'tiktok'   ? ttResults :
    allResults

  const sorted = sortMode === 'engagement'
    ? [...results].sort((a, b) => engagementScore(b) - engagementScore(a))
    : results

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const pageResults = sorted.slice((page - 1) * perPage, page * perPage)

  // Trigger lazy enrichment when page renders
  useEffect(() => {
    if (store.running) return
    enrichPage(activeTab)
  }, [activeTab, page, store.running])

  // Trigger full enrichment when sort mode switches to engagement
  useEffect(() => {
    if (sortMode !== 'engagement') return
    for (const p of platforms) enrichAllForEngagement(p as 'facebook' | 'linkedin' | 'tiktok')
  }, [sortMode])

  const hasMultiplePlatforms = platforms.size > 1

  if (results.length === 0 && !store.running) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        {store.keyword ? 'No results found.' : 'Enter a keyword above and press Search.'}
      </div>
    )
  }

  return (
    <div>
      {/* Meta bar */}
      {results.length > 0 && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm text-gray-500">
            {results.length} result{results.length !== 1 ? 's' : ''}
            {store.keyword && ` for "${store.keyword}"`}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Sort:</label>
            <select
              value={sortMode}
              onChange={e => store.setSortMode(e.target.value as 'default' | 'engagement')}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none bg-white"
            >
              <option value="default">Most recent</option>
              <option value="engagement">🏆 Top engagement</option>
            </select>
          </div>
        </div>
      )}

      {/* Platform sub-tabs */}
      {hasMultiplePlatforms && (
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {(['facebook', 'linkedin', 'tiktok'] as const).map(p => {
            if (!platforms.has(p)) return null
            const count = p === 'linkedin' ? liResults.length : p === 'tiktok' ? ttResults.length : allResults.length
            return (
              <button
                key={p}
                onClick={() => store.setActiveTab(p)}
                className={`text-xs px-4 py-2 border-b-2 transition font-medium ${
                  activeTab === p
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)} <span className="ml-1 text-gray-400">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {pageResults.map(r => (
          <ResultCard key={r.id} result={r} />
        ))}
        {store.running && results.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => store.setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 transition"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => store.setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
