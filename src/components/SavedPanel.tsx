import { useState } from 'react'
import { useStore } from '../store/searchStore'
import { fmtNum, fmtDate } from '../lib/formatters'
import { showToast } from './Toast'
import type { SavedPost } from '../store/searchStore'

const PLATFORM_ICONS: Record<string, string> = { facebook: '🔵', linkedin: '🔷', tiktok: '♪' }

function SavedCard({ post, folders }: { post: SavedPost; folders: string[] }) {
  const { unsavePost, updateSavedPostFolder } = useStore()
  const [folderVal, setFolderVal] = useState(post.folder || 'Uncategorized')
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolder, setNewFolder] = useState('')

  const handleFolderChange = (val: string) => {
    if (val === '__new__') { setAddingFolder(true); return }
    setFolderVal(val)
    updateSavedPostFolder(post.url, val)
  }

  const handleNewFolder = () => {
    const name = newFolder.trim()
    if (!name) return
    updateSavedPostFolder(post.url, name)
    setFolderVal(name)
    setAddingFolder(false)
    setNewFolder('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">{PLATFORM_ICONS[post.platform]} {post.platform}</span>
            {post.savedAt && <span className="text-xs text-gray-400">{fmtDate(post.savedAt)}</span>}
          </div>
          <a href={post.url} target="_blank" rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition line-clamp-2 block mb-1">
            {post.title || post.url}
          </a>
          {post.content && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{post.content}</p>
          )}
          {(post.likes != null || post.comments != null) && (
            <div className="flex gap-3 text-xs text-gray-400 mb-2">
              {post.likes    != null && <span>👍 {fmtNum(post.likes)}</span>}
              {post.comments != null && <span>💬 {fmtNum(post.comments)}</span>}
              {post.shares   != null && <span>🔁 {fmtNum(post.shares)}</span>}
            </div>
          )}
          {/* Folder assign */}
          {addingFolder ? (
            <div className="flex gap-1 mt-1">
              <input
                autoFocus
                type="text"
                value={newFolder}
                onChange={e => setNewFolder(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNewFolder(); if (e.key === 'Escape') setAddingFolder(false) }}
                placeholder="New folder name…"
                className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <button onClick={handleNewFolder} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Add</button>
              <button onClick={() => setAddingFolder(false)} className="text-xs text-gray-400 hover:text-gray-700 px-1">✕</button>
            </div>
          ) : (
            <select
              value={folderVal}
              onChange={e => handleFolderChange(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 mt-1 focus:outline-none"
            >
              <option value="Uncategorized">📁 Uncategorized</option>
              {folders.filter(f => f !== 'Uncategorized').map(f => (
                <option key={f} value={f}>📁 {f}</option>
              ))}
              <option value="__new__">＋ New folder…</option>
            </select>
          )}
        </div>
        <button
          onClick={() => { unsavePost(post.url); showToast('Post removed from saved.') }}
          className="shrink-0 text-blue-600 hover:text-red-500 transition p-1.5"
          title="Remove"
        >
          <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function SavedPanel() {
  const { savedPosts, renameFolder, deleteFolder } = useStore()
  const [activeFolder, setActiveFolder] = useState('All')
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  const folders = [...new Set(savedPosts.map(p => p.folder || 'Uncategorized'))]
  if (activeFolder !== 'All' && !folders.includes(activeFolder)) setActiveFolder('All')

  const visible = activeFolder === 'All' ? savedPosts : savedPosts.filter(p => (p.folder || 'Uncategorized') === activeFolder)

  const exportJson = () => {
    const data = activeFolder === 'All' ? savedPosts : visible
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `saved-posts-${activeFolder.toLowerCase().replace(/\s+/g, '-')}.json`; a.click()
  }

  if (!savedPosts.length) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-2">🔖</div>
        <p className="text-sm font-medium text-gray-700 mb-1">No saved posts yet</p>
        <p className="text-xs text-gray-400">Click 🔖 on any post card to save it.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Folder tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(['All', ...folders] as string[]).map(f => (
          <div key={f} className="relative inline-flex items-center group">
            <button
              onClick={() => setActiveFolder(f)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition ${
                activeFolder === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {f === 'All' ? `All ${savedPosts.length}` : `📁 ${f} ${savedPosts.filter(p => (p.folder||'Uncategorized') === f).length}`}
            </button>
            {f !== 'All' && f !== 'Uncategorized' && (
              <div className={`hidden group-hover:inline-flex items-center gap-0.5 pl-0.5 pr-2 py-1 rounded-r-full border border-l-0 transition text-gray-400 ${activeFolder === f ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                <button onClick={() => { setRenamingFolder(f); setRenameVal(f) }} title="Rename" className="hover:text-blue-600 text-xs">✏️</button>
                <button onClick={() => { deleteFolder(f); if (activeFolder === f) setActiveFolder('All') }} title="Delete" className="hover:text-red-500 text-xs">🗑</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rename input */}
      {renamingFolder && (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            type="text"
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                renameFolder(renamingFolder, renameVal.trim())
                if (activeFolder === renamingFolder) setActiveFolder(renameVal.trim())
                setRenamingFolder(null)
              }
              if (e.key === 'Escape') setRenamingFolder(null)
            }}
            className="text-xs border border-blue-300 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <button onClick={() => setRenamingFolder(null)} className="text-xs text-gray-400 hover:text-gray-700">Cancel</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">{visible.length} post{visible.length !== 1 ? 's' : ''}</span>
        <div className="ml-auto">
          <button onClick={exportJson} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium">
            💾 Export JSON
          </button>
        </div>
      </div>

      {/* Cards */}
      {visible.length === 0
        ? <div className="text-center py-8 text-gray-400 text-sm">No posts in this folder.</div>
        : <div className="space-y-3">{visible.map(p => <SavedCard key={p.url} post={p} folders={folders} />)}</div>
      }
    </div>
  )
}
