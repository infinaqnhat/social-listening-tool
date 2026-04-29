import { useState } from 'react'
import { useStore } from '../store/searchStore'
import { fmtNum, fmtDate } from '../lib/formatters'
import { showToast } from './Toast'
import type { SearchResult } from '../lib/urlMatching'

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '🔵',
  linkedin: '🔷',
  tiktok: '♪',
}

interface Props {
  result: SearchResult
}

export default function ResultCard({ result }: Props) {
  const { savedPosts, savePost, unsavePost } = useStore()
  const [expanded, setExpanded] = useState(false)

  const isSaved = savedPosts.some(p => p.url === result.url)

  const handleSave = () => {
    if (isSaved) {
      unsavePost(result.url)
      showToast('Post removed from saved.')
    } else {
      savePost({
        url: result.url,
        title: result.title,
        content: result.content,
        platform: result.platform,
        folder: 'Uncategorized',
        savedAt: new Date().toISOString(),
        likes: result.likes,
        comments: result.comments,
        shares: result.shares,
      })
      showToast('Post saved!')
    }
  }

  const showContent = result.fullText || result.content
  const truncated = showContent && showContent.length > 200
  const displayContent = expanded || !truncated
    ? showContent
    : showContent?.slice(0, 200) + '…'

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 transition ${
        result.state === 'enriched' ? 'border-green-200' : 'border-gray-200'
      }`}
      data-platform={result.platform}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Platform + date */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-medium text-gray-500">
              {PLATFORM_ICONS[result.platform]} {result.platform.charAt(0).toUpperCase() + result.platform.slice(1)}
            </span>
            {result.publishedAt && (
              <span className="text-xs text-gray-400">{fmtDate(result.publishedAt)}</span>
            )}
            {result.state === 'pending' && (
              <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
            )}
            {result.state === 'failed' && (
              <span className="text-xs text-red-400">Could not enrich</span>
            )}
          </div>

          {/* Title */}
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition line-clamp-2 block mb-1"
          >
            {result.title || result.url}
          </a>

          {/* Content */}
          {displayContent && (
            <div className="text-sm text-gray-600 mb-2">
              <span>{displayContent}</span>
              {truncated && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-1 text-xs text-blue-500 hover:text-blue-700"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Engagement stats */}
          {result.state === 'enriched' && (
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              {result.likes    != null && <span>👍 {fmtNum(result.likes)}</span>}
              {result.comments != null && <span>💬 {fmtNum(result.comments)}</span>}
              {result.shares   != null && <span>🔁 {fmtNum(result.shares)}</span>}
              {result.plays    != null && <span>▶ {fmtNum(result.plays)}</span>}
            </div>
          )}

          {/* Author */}
          {result.authorName && (
            <div className="flex items-center gap-1.5 mt-2">
              {result.authorImage && (
                <img src={result.authorImage} alt="" className="w-5 h-5 rounded-full object-cover" />
              )}
              <span className="text-xs text-gray-500">{result.authorName}</span>
              {result.followers != null && (
                <span className="text-xs text-gray-400">· {fmtNum(result.followers)} followers</span>
              )}
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          title={isSaved ? 'Remove from saved' : 'Save post'}
          className={`shrink-0 p-1.5 rounded transition ${
            isSaved ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-blue-600'
          }`}
        >
          <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
          </svg>
        </button>
      </div>

      {/* Source URL */}
      <p className="text-xs text-gray-400 mt-2 truncate">{result.source}</p>
    </div>
  )
}
