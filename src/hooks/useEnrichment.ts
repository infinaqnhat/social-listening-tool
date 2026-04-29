import { useCallback, useRef } from 'react'
import { useStore } from '../store/searchStore'
import { enrichFacebookProgressively, abortFacebookEnrichment } from '../lib/enrich/facebook'
import { enrichLinkedInProgressively, abortLinkedInEnrichment } from '../lib/enrich/linkedin'
import { enrichTikTokProgressively, abortTikTokEnrichment } from '../lib/enrich/tiktok'
import type { SearchResult } from '../lib/urlMatching'

export function useEnrichment() {
  const store = useStore()
  const engagingFb = useRef(false)
  const engagingLi = useRef(false)
  const engagingTt = useRef(false)

  const enrichPage = useCallback(async (platform: 'facebook' | 'linkedin' | 'tiktok') => {
    const { page, perPage, allResults, liResults, ttResults, enrichedPages, enrichingPages,
            liEnrichedPages, liEnrichingPages, ttEnrichedPages, ttEnrichingPages, token } = store

    const results     = platform === 'linkedin' ? liResults : platform === 'tiktok' ? ttResults : allResults
    const enrichedPgs = platform === 'linkedin' ? liEnrichedPages : platform === 'tiktok' ? ttEnrichedPages : enrichedPages
    const enrichingPgs = platform === 'linkedin' ? liEnrichingPages : platform === 'tiktok' ? ttEnrichingPages : enrichingPages

    if (enrichedPgs.has(page) || enrichingPgs.has(page)) return

    const start = (page - 1) * perPage
    const pageResults = results.slice(start, start + perPage).filter(r => r.state === 'pending')
    if (pageResults.length === 0) return

    store.markEnrichingPage(platform, page)

    const onCardUpdate = (r: SearchResult) => store.updateResult(platform, r)
    const onProgress = (_done: number, _total: number) => { /* status shown via store.status */ }
    const onDone = (_count: number) => {
      store.markEnrichedPage(platform, page)
      store.clearEnrichingPage(platform, page)
    }

    const enrichFn =
      platform === 'linkedin' ? enrichLinkedInProgressively :
      platform === 'tiktok'   ? enrichTikTokProgressively :
                                enrichFacebookProgressively

    await enrichFn(pageResults, token, onProgress, onCardUpdate, onDone)
  }, [store])

  const enrichAllForEngagement = useCallback(async (platform: 'facebook' | 'linkedin' | 'tiktok') => {
    if (platform === 'facebook' && engagingFb.current) return
    if (platform === 'linkedin' && engagingLi.current) return
    if (platform === 'tiktok'   && engagingTt.current) return

    const { allResults, liResults, ttResults, token } = store
    const results = platform === 'linkedin' ? liResults : platform === 'tiktok' ? ttResults : allResults
    const pending = results.filter(r => r.state === 'pending')
    if (pending.length === 0) return

    if (platform === 'facebook') engagingFb.current = true
    if (platform === 'linkedin') engagingLi.current = true
    if (platform === 'tiktok')   engagingTt.current = true

    const onCardUpdate = (r: SearchResult) => store.updateResult(platform, r)
    const onProgress = (done: number, total: number) => store.setStatus(`Enriching… ${done}/${total}`)
    const onDone = (_count: number) => {
      if (platform === 'facebook') engagingFb.current = false
      if (platform === 'linkedin') engagingLi.current = false
      if (platform === 'tiktok')   engagingTt.current = false
      store.setStatus('')
    }

    const enrichFn =
      platform === 'linkedin' ? enrichLinkedInProgressively :
      platform === 'tiktok'   ? enrichTikTokProgressively :
                                enrichFacebookProgressively

    await enrichFn(pending, token, onProgress, onCardUpdate, onDone)
  }, [store])

  const abortAll = useCallback(() => {
    abortFacebookEnrichment()
    abortLinkedInEnrichment()
    abortTikTokEnrichment()
  }, [])

  return { enrichPage, enrichAllForEngagement, abortAll }
}
