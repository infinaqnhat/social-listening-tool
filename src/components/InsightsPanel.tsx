import { useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { useStore } from '../store/searchStore'
import { useEnrichment } from '../hooks/useEnrichment'
import { fmtNum } from '../lib/formatters'

interface InsightsData {
  topics: Array<{ topic: string; count: number; examples: string[] }>
  suggestions: Array<{ title: string; reason: string }>
  sentiment: { positive: number; neutral: number; negative: number }
}

export default function InsightsPanel() {
  const store = useStore()
  const { enrichAllForEngagement } = useEnrichment()

  const { allResults, liResults, activeTab, claudeKey, setInsightsView } = store

  const platform = activeTab === 'linkedin' ? 'linkedin' : 'facebook'
  const results  = platform === 'linkedin' ? liResults : allResults
  const total    = results.length
  const enriched = results.filter(r => r.state === 'enriched').length
  const pending  = results.filter(r => r.state === 'pending').length

  const [insightsData, setInsightsData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')

  const triggerEnrichment = async () => {
    setEnrichProgress({ done: 0, total })
    await enrichAllForEngagement(platform)
    setEnrichProgress(null)
  }

  const generateInsights = async () => {
    if (!claudeKey) return
    setLoading(true)
    setError('')
    try {
      const client = new Anthropic({ apiKey: claudeKey, dangerouslyAllowBrowser: true })
      const enrichedResults = results.filter(r => r.state === 'enriched')
      const postsText = enrichedResults.slice(0, 50).map((r, i) =>
        `${i + 1}. "${r.title}" — 👍${fmtNum(r.likes)} 💬${fmtNum(r.comments)} 🔁${fmtNum(r.shares)}`
      ).join('\n')

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Analyze these ${platform} posts and return ONLY valid JSON (no markdown) with this exact shape:
{"topics":[{"topic":"string","count":number,"examples":["string"]}],"suggestions":[{"title":"string","reason":"string"}],"sentiment":{"positive":number,"neutral":number,"negative":number}}

Posts:
${postsText}`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const parsed = JSON.parse(text) as InsightsData
      setInsightsData(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // State A — no results
  if (total === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-3xl mb-2">🔍</div>
        <p className="text-sm">Run a search first to generate insights.</p>
      </div>
    )
  }

  // State B — enrichment needed
  if (pending > 0) {
    return (
      <div className="text-center py-6">
        <div className="text-2xl mb-2">⚡</div>
        <p className="text-sm font-medium text-gray-700 mb-1">Engagement data needed</p>
        <p className="text-xs text-gray-400 mb-4">Load metrics for all {total} posts to generate insights.</p>
        {enrichProgress ? (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Enriching… {enrichProgress.done} / {enrichProgress.total}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${enrichProgress.total > 0 ? Math.round(enrichProgress.done / enrichProgress.total * 100) : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={triggerEnrichment}
            className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            ⚡ Load All Engagement Data
          </button>
        )}
      </div>
    )
  }

  // All enriched — check for Claude key
  if (!claudeKey && !insightsData) {
    return (
      <div className="text-center py-6">
        <div className="text-2xl mb-2">🔑</div>
        <p className="text-sm font-medium text-gray-700 mb-1">Claude API key required</p>
        <p className="text-xs text-gray-400 mb-4">Add your Claude API key in Settings to generate insights.</p>
        <button
          onClick={() => setInsightsView('results')}
          className="inline-flex items-center gap-2 bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-900 transition"
        >
          ⚙️ Open Settings
        </button>
      </div>
    )
  }

  // Ready to generate (or loading)
  if (!insightsData) {
    return (
      <div className="text-center py-6">
        <div className="text-2xl mb-2">✨</div>
        <p className="text-sm font-medium text-gray-700 mb-1">Ready to generate insights</p>
        <p className="text-xs text-gray-400 mb-4">{enriched} posts enriched. Claude will analyze topics and suggest titles.</p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button
          onClick={generateInsights}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
        >
          {loading ? '✨ Generating…' : '✨ Generate Insights'}
        </button>
      </div>
    )
  }

  // State E — data ready
  const { topics, suggestions, sentiment } = insightsData
  const sentTotal = (sentiment.positive + sentiment.neutral + sentiment.negative) || 1

  return (
    <div className="space-y-6">
      {/* Sentiment */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Sentiment</h3>
        <div className="flex gap-3 text-sm">
          <span className="text-green-600">😊 {Math.round(sentiment.positive / sentTotal * 100)}% positive</span>
          <span className="text-gray-500">😐 {Math.round(sentiment.neutral / sentTotal * 100)}% neutral</span>
          <span className="text-red-500">😟 {Math.round(sentiment.negative / sentTotal * 100)}% negative</span>
        </div>
      </div>

      {/* Topics */}
      {topics.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Top Topics</h3>
          <div className="space-y-2">
            {topics.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0">{t.topic}</span>
                <span className="text-xs text-gray-500">{t.count} posts · {t.examples.slice(0, 2).join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Content Suggestions</h3>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="border-l-2 border-purple-300 pl-3">
                <p className="text-sm font-medium text-gray-800">"{s.title}"</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setInsightsData(null)}
        className="text-xs text-gray-400 hover:text-gray-600 transition"
      >
        ↩ Regenerate
      </button>
    </div>
  )
}
