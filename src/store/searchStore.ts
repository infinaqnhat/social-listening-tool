import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SearchResult } from '../lib/urlMatching'

export interface HistoryEntry {
  id: number
  keyword: string
  platforms: string[]
  dateFrom: string | null
  dateTo: string | null
  lang: string
  totalResults: number
  timestamp: string
  allResults: SearchResult[]
  liResults: SearchResult[]
  ttResults: SearchResult[]
}

export interface SavedPost {
  url: string
  title: string
  content: string
  platform: string
  folder: string
  savedAt: string
  likes?: number | null
  comments?: number | null
  shares?: number | null
}

// Persisted state — survives page reload (same localStorage keys as legacy app)
interface PersistedState {
  token: string        // sl_apify_token
  claudeKey: string    // sl_claude_key
  savedPosts: SavedPost[]    // sl_saved_posts
  history: HistoryEntry[]    // sl_search_history
}

// Runtime (session) state — not persisted
interface SessionState {
  // Search params
  keyword: string
  dateFrom: string | null
  dateTo: string | null
  lang: string
  totalResults: number
  platforms: Set<string>
  activeTab: 'facebook' | 'linkedin' | 'tiktok'

  // Results
  allResults: SearchResult[]
  liResults: SearchResult[]
  ttResults: SearchResult[]

  // Enrichment tracking (page numbers)
  enrichedPages: Set<number>
  enrichingPages: Set<number>
  liEnrichedPages: Set<number>
  liEnrichingPages: Set<number>
  ttEnrichedPages: Set<number>
  ttEnrichingPages: Set<number>

  // UI
  page: number
  perPage: number
  sortMode: 'default' | 'engagement'
  insightsView: 'results' | 'insights' | 'saved' | 'history'
  running: boolean
  status: string
}

interface Actions {
  setToken: (t: string) => void
  setClaudeKey: (k: string) => void

  togglePlatform: (p: string) => void
  setActivePlatforms: (arr: string[]) => void
  setActiveTab: (t: 'facebook' | 'linkedin' | 'tiktok') => void

  setResults: (platform: 'facebook' | 'linkedin' | 'tiktok', results: SearchResult[]) => void
  appendResults: (platform: 'facebook' | 'linkedin' | 'tiktok', results: SearchResult[]) => void
  updateResult: (platform: 'facebook' | 'linkedin' | 'tiktok', updated: SearchResult) => void

  setSearchParams: (p: Partial<Pick<SessionState, 'keyword' | 'dateFrom' | 'dateTo' | 'lang' | 'totalResults'>>) => void
  setPage: (n: number) => void
  setSortMode: (m: 'default' | 'engagement') => void
  setInsightsView: (v: 'results' | 'insights' | 'saved' | 'history') => void
  setRunning: (b: boolean) => void
  setStatus: (s: string) => void

  markEnrichedPage: (platform: 'facebook' | 'linkedin' | 'tiktok', page: number) => void
  markEnrichingPage: (platform: 'facebook' | 'linkedin' | 'tiktok', page: number) => void
  clearEnrichingPage: (platform: 'facebook' | 'linkedin' | 'tiktok', page: number) => void
  resetEnrichmentState: () => void

  savePost: (post: SavedPost) => void
  unsavePost: (url: string) => void
  updateSavedPostFolder: (url: string, folder: string) => void
  renameFolder: (oldName: string, newName: string) => void
  deleteFolder: (name: string) => void

  addHistory: (entry: HistoryEntry) => void
  deleteHistory: (id: number) => void
  clearHistory: () => void

  resetForNewSearch: () => void
  restoreFromHistory: (entry: HistoryEntry) => void
}

export type Store = PersistedState & SessionState & Actions

const HISTORY_LIMIT = 20

const defaultSession: SessionState = {
  keyword: '',
  dateFrom: null,
  dateTo: null,
  lang: 'vi',
  totalResults: 10,
  platforms: new Set(['facebook']),
  activeTab: 'facebook',
  allResults: [],
  liResults: [],
  ttResults: [],
  enrichedPages: new Set(),
  enrichingPages: new Set(),
  liEnrichedPages: new Set(),
  liEnrichingPages: new Set(),
  ttEnrichedPages: new Set(),
  ttEnrichingPages: new Set(),
  page: 1,
  perPage: 10,
  sortMode: 'default',
  insightsView: 'results',
  running: false,
  status: '',
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── Persisted initial values ──
      token: '',
      claudeKey: '',
      savedPosts: [],
      history: [],

      // ── Session initial values ──
      ...defaultSession,

      // ── Actions ──
      setToken: (t) => set({ token: t }),
      setClaudeKey: (k) => set({ claudeKey: k }),

      togglePlatform: (p) => {
        const platforms = new Set(get().platforms)
        if (platforms.has(p)) {
          if (platforms.size === 1) return
          platforms.delete(p)
        } else {
          platforms.add(p)
        }
        const activeTab = platforms.has(get().activeTab) ? get().activeTab : ([...platforms][0] as 'facebook' | 'linkedin' | 'tiktok')
        set({ platforms, activeTab })
      },

      setActivePlatforms: (arr) => {
        const platforms = new Set(arr.length ? arr : ['facebook'])
        const activeTab = platforms.has(get().activeTab) ? get().activeTab : ([...platforms][0] as 'facebook' | 'linkedin' | 'tiktok')
        set({ platforms, activeTab })
      },

      setActiveTab: (t) => set({ activeTab: t, page: 1 }),

      setResults: (platform, results) => {
        if (platform === 'linkedin') set({ liResults: results })
        else if (platform === 'tiktok') set({ ttResults: results })
        else set({ allResults: results })
      },

      appendResults: (platform, results) => {
        if (platform === 'linkedin') set(s => ({ liResults: [...s.liResults, ...results] }))
        else if (platform === 'tiktok') set(s => ({ ttResults: [...s.ttResults, ...results] }))
        else set(s => ({ allResults: [...s.allResults, ...results] }))
      },

      updateResult: (platform, updated) => {
        const key = platform === 'linkedin' ? 'liResults' : platform === 'tiktok' ? 'ttResults' : 'allResults'
        set(s => ({
          [key]: (s[key] as SearchResult[]).map(r => r.id === updated.id ? updated : r),
        }))
      },

      setSearchParams: (p) => set(p),
      setPage: (n) => set({ page: n }),
      setSortMode: (m) => set({ sortMode: m, page: 1 }),
      setInsightsView: (v) => set({ insightsView: v }),
      setRunning: (b) => set({ running: b }),
      setStatus: (s) => set({ status: s }),

      markEnrichedPage: (platform, page) => {
        const key = platform === 'linkedin' ? 'liEnrichedPages' : platform === 'tiktok' ? 'ttEnrichedPages' : 'enrichedPages'
        set(s => ({ [key]: new Set([...(s[key] as Set<number>), page]) }))
      },
      markEnrichingPage: (platform, page) => {
        const key = platform === 'linkedin' ? 'liEnrichingPages' : platform === 'tiktok' ? 'ttEnrichingPages' : 'enrichingPages'
        set(s => ({ [key]: new Set([...(s[key] as Set<number>), page]) }))
      },
      clearEnrichingPage: (platform, page) => {
        const key = platform === 'linkedin' ? 'liEnrichingPages' : platform === 'tiktok' ? 'ttEnrichingPages' : 'enrichingPages'
        set(s => { const next = new Set(s[key] as Set<number>); next.delete(page); return { [key]: next } })
      },
      resetEnrichmentState: () => set({
        enrichedPages: new Set(), enrichingPages: new Set(),
        liEnrichedPages: new Set(), liEnrichingPages: new Set(),
        ttEnrichedPages: new Set(), ttEnrichingPages: new Set(),
      }),

      savePost: (post) => set(s => {
        const existing = s.savedPosts.filter(p => p.url !== post.url)
        return { savedPosts: [post, ...existing] }
      }),
      unsavePost: (url) => set(s => ({ savedPosts: s.savedPosts.filter(p => p.url !== url) })),
      updateSavedPostFolder: (url, folder) => set(s => ({
        savedPosts: s.savedPosts.map(p => p.url === url ? { ...p, folder } : p),
      })),
      renameFolder: (oldName, newName) => set(s => ({
        savedPosts: s.savedPosts.map(p => p.folder === oldName ? { ...p, folder: newName } : p),
      })),
      deleteFolder: (name) => set(s => ({
        savedPosts: s.savedPosts.filter(p => p.folder !== name),
      })),

      addHistory: (entry) => set(s => {
        const filtered = s.history.filter(e => e.id !== entry.id)
        return { history: [entry, ...filtered].slice(0, HISTORY_LIMIT) }
      }),
      deleteHistory: (id) => set(s => ({ history: s.history.filter(e => e.id !== id) })),
      clearHistory: () => set({ history: [] }),

      resetForNewSearch: () => set({
        allResults: [], liResults: [], ttResults: [],
        enrichedPages: new Set(), enrichingPages: new Set(),
        liEnrichedPages: new Set(), liEnrichingPages: new Set(),
        ttEnrichedPages: new Set(), ttEnrichingPages: new Set(),
        page: 1, sortMode: 'default',
      }),

      restoreFromHistory: (entry) => {
        const fbPages = new Set<number>()
        const liPages = new Set<number>()
        const ttPages = new Set<number>()
        const perPage = get().perPage
        for (let i = 1; i <= Math.ceil((entry.allResults?.length || 0) / perPage); i++) fbPages.add(i)
        for (let i = 1; i <= Math.ceil((entry.liResults?.length || 0) / perPage); i++) liPages.add(i)
        for (let i = 1; i <= Math.ceil((entry.ttResults?.length || 0) / perPage); i++) ttPages.add(i)

        const platforms = new Set(
          entry.platforms?.length ? entry.platforms : ['facebook'],
        )
        const activeTab = ([...platforms][0]) as 'facebook' | 'linkedin' | 'tiktok'

        set({
          keyword: entry.keyword,
          dateFrom: entry.dateFrom,
          dateTo: entry.dateTo,
          lang: entry.lang,
          totalResults: entry.totalResults,
          platforms,
          activeTab,
          allResults: entry.allResults || [],
          liResults: entry.liResults || [],
          ttResults: entry.ttResults || [],
          enrichedPages: fbPages,
          enrichingPages: new Set(),
          liEnrichedPages: liPages,
          liEnrichingPages: new Set(),
          ttEnrichedPages: ttPages,
          ttEnrichingPages: new Set(),
          page: 1,
          sortMode: 'default',
          insightsView: 'results',
          running: false,
        })
      },
    }),
    {
      name: 'sl_store',
      // Only persist user settings — not session/UI state
      partialize: (s) => ({
        token: s.token,
        claudeKey: s.claudeKey,
        savedPosts: s.savedPosts,
        history: s.history,
      }),
    },
  ),
)

// Legacy key compatibility: read sl_apify_token / sl_saved_posts / sl_search_history
// written by the old HTML app and migrate them into the new store on first load.
const migrated = sessionStorage.getItem('sl_migrated_v2')
if (!migrated) {
  const legacyToken = localStorage.getItem('sl_apify_token')
  const legacyKey   = localStorage.getItem('sl_claude_key')
  const legacySaved = localStorage.getItem('sl_saved_posts')
  const legacyHist  = localStorage.getItem('sl_search_history')

  useStore.setState((s) => {
    const patch: Partial<PersistedState> = {}
    if (legacyToken && !s.token)       patch.token      = legacyToken
    if (legacyKey   && !s.claudeKey)   patch.claudeKey  = legacyKey
    if (legacySaved && !s.savedPosts.length) {
      try { patch.savedPosts = JSON.parse(legacySaved) } catch { /* ignore */ }
    }
    if (legacyHist  && !s.history.length) {
      try { patch.history = JSON.parse(legacyHist) } catch { /* ignore */ }
    }
    return patch
  })

  sessionStorage.setItem('sl_migrated_v2', '1')
}
