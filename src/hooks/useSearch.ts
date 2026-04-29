import { useCallback, useRef } from 'react'
import { useStore, type Store } from '../store/searchStore'
import { runFacebookSearch } from '../lib/search/facebook'
import { runLinkedInSearch } from '../lib/search/linkedin'
import { runTikTokSearch } from '../lib/search/tiktok'
import { loadCache, saveCache } from '../lib/cache'
import type { SearchResult } from '../lib/urlMatching'

export function useSearch() {
  const store = useStore()
  const abortRef = useRef(false)

  const doSearch = useCallback(async () => {
    const { keyword, dateFrom, dateTo, lang, totalResults, platforms, token } = store
    if (!keyword.trim() || !token) return
    if (store.running) return

    abortRef.current = false
    store.resetForNewSearch()
    store.setRunning(true)
    store.setInsightsView('results')
    store.setStatus('Starting search…')

    const platformArr = [...platforms]

    // Per-platform results accumulate here before being stored
    const fbResults: SearchResult[] = []
    const liResults: SearchResult[] = []
    const ttResults: SearchResult[] = []

    // Check caches first
    const cachedFb = platforms.has('facebook') ? loadCache(keyword, dateFrom, dateTo, lang, totalResults, 'facebook') : null
    const cachedLi = platforms.has('linkedin') ? loadCache(keyword, dateFrom, dateTo, lang, totalResults, 'linkedin') : null
    const cachedTt = platforms.has('tiktok')   ? loadCache(keyword, dateFrom, dateTo, lang, totalResults, 'tiktok')   : null

    if (cachedFb) {
      fbResults.push(...cachedFb.results)
      store.setResults('facebook', cachedFb.results)
      cachedFb.enrichedPages.forEach(p => store.markEnrichedPage('facebook', p))
    }
    if (cachedLi) {
      liResults.push(...cachedLi.results)
      store.setResults('linkedin', cachedLi.results)
      cachedLi.enrichedPages.forEach(p => store.markEnrichedPage('linkedin', p))
    }
    if (cachedTt) {
      ttResults.push(...cachedTt.results)
      store.setResults('tiktok', cachedTt.results)
      cachedTt.enrichedPages.forEach(p => store.markEnrichedPage('tiktok', p))
    }

    const allCached = (
      (!platforms.has('facebook') || !!cachedFb) &&
      (!platforms.has('linkedin') || !!cachedLi) &&
      (!platforms.has('tiktok')   || !!cachedTt)
    )

    if (allCached) {
      store.setStatus('')
      store.setRunning(false)
      addHistoryEntry(store, fbResults, liResults, ttResults)
      return
    }

    // Run uncached platforms in parallel
    const promises: Promise<void>[] = []

    if (platforms.has('facebook') && !cachedFb) {
      promises.push(
        runFacebookSearch(keyword, totalResults, dateFrom, dateTo, lang, token,
          (s) => store.setStatus(s),
          (batch) => {
            fbResults.push(...batch)
            store.appendResults('facebook', batch)
          },
        ).catch(e => store.setStatus(`Facebook error: ${e.message}`)),
      )
    }

    if (platforms.has('linkedin') && !cachedLi) {
      promises.push(
        runLinkedInSearch(keyword, totalResults, dateFrom, dateTo, lang, token,
          (s) => store.setStatus(s),
          (batch) => {
            liResults.push(...batch)
            store.appendResults('linkedin', batch)
          },
        ).catch(e => store.setStatus(`LinkedIn error: ${e.message}`)),
      )
    }

    if (platforms.has('tiktok') && !cachedTt) {
      promises.push(
        runTikTokSearch(keyword, totalResults, dateFrom, dateTo, lang, token,
          (s) => store.setStatus(s),
          (batch) => {
            ttResults.push(...batch)
            store.appendResults('tiktok', batch)
          },
        ).catch(e => store.setStatus(`TikTok error: ${e.message}`)),
      )
    }

    await Promise.all(promises)

    // Save results to cache
    if (platforms.has('facebook') && !cachedFb && fbResults.length > 0) {
      saveCache(keyword, dateFrom, dateTo, lang, totalResults, fbResults, new Set(), 'facebook')
    }
    if (platforms.has('linkedin') && !cachedLi && liResults.length > 0) {
      saveCache(keyword, dateFrom, dateTo, lang, totalResults, liResults, new Set(), 'linkedin')
    }
    if (platforms.has('tiktok') && !cachedTt && ttResults.length > 0) {
      saveCache(keyword, dateFrom, dateTo, lang, totalResults, ttResults, new Set(), 'tiktok')
    }

    store.setStatus('')
    store.setRunning(false)
    addHistoryEntry(store, fbResults, liResults, ttResults)

    console.log(`[Search] Complete: ${platformArr.join('+')} — FB:${fbResults.length} LI:${liResults.length} TT:${ttResults.length}`)
  }, [store])

  return { doSearch }
}

function addHistoryEntry(
  store: Store,
  fbResults: SearchResult[],
  liResults: SearchResult[],
  ttResults: SearchResult[],
) {
  const { keyword, platforms, dateFrom, dateTo, lang, totalResults } = store
  const total = fbResults.length + liResults.length + ttResults.length
  if (!keyword.trim() || total === 0) return

  store.addHistory({
    id: Date.now(),
    keyword,
    platforms: [...platforms],
    dateFrom,
    dateTo,
    lang,
    totalResults,
    timestamp: new Date().toISOString(),
    allResults: fbResults,
    liResults,
    ttResults,
  })
}
