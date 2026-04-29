import { startActor, getRunStatus, fetchDatasetItems, POLL_MS } from '../apify'
import { matchEnrichItem, extractFbPageContext, extractFbPostKey } from '../urlMatching'
import type { SearchResult } from '../urlMatching'

let enrichAbort: { abort: boolean } | null = null

export async function enrichFacebookProgressively(
  results: SearchResult[],
  token: string,
  onProgress: (done: number, total: number) => void,
  onCardUpdate: (r: SearchResult) => void,
  onDone: (count: number) => void,
): Promise<void> {
  if (enrichAbort) enrichAbort.abort = true
  const abort = { abort: false }
  enrichAbort = abort

  const fbUrls = results.map(r => r.url).filter(u => u && u.includes('facebook.com'))
  if (fbUrls.length === 0) { onDone(0); return }

  let run: { id: string; defaultDatasetId: string }
  let datasetId: string
  try {
    const r = await startActor('apify/facebook-posts-scraper', {
      startUrls:    fbUrls.map(url => ({ url })),
      resultsLimit: fbUrls.length,
      captionText:  false,
    }, token)
    run = r; datasetId = r.defaultDatasetId
  } catch (e) {
    results.forEach(r => { if (r.state === 'pending') { r.state = 'failed'; onCardUpdate(r) } })
    onDone(0); return
  }

  let seenCount = 0, enrichedCount = 0
  const total = fbUrls.length

  const poll = async () => {
    if (abort.abort) {
      results.forEach(r => { if (r.state === 'pending') { r.state = 'failed'; onCardUpdate(r) } })
      onDone(enrichedCount); return
    }
    try {
      const newItems = await fetchDatasetItems(datasetId, token, seenCount, 50) as Record<string, unknown>[]
      seenCount += newItems.length
      for (const item of newItems) {
        if (abort.abort) break
        const itemUrl = (item.url || item.postUrl || '') as string
        const matched = matchEnrichItem(itemUrl, results, true, (item.text || '') as string)
        if (matched) {
          const hasData = item.likes != null || item.comments != null || item.shares != null || item.text
          if (hasData) {
            matched.likes    = (item.likes    ?? null) as number | null
            matched.comments = (item.comments ?? null) as number | null
            matched.shares   = (item.shares   ?? null) as number | null
            if (item.text)  matched.fullText = item.text as string
            if (item.media) matched.media    = item.media as unknown[]
            matched.state = 'enriched'; enrichedCount++
          } else {
            matched.state = 'failed'
          }
          onCardUpdate(matched)
        }
      }
      onProgress(enrichedCount, total)

      if (abort.abort) {
        results.forEach(r => { if (r.state === 'pending') { r.state = 'failed'; onCardUpdate(r) } })
        onDone(enrichedCount); return
      }

      const status = await getRunStatus(run.id, token)
      if (abort.abort) {
        results.forEach(r => { if (r.state === 'pending') { r.state = 'failed'; onCardUpdate(r) } })
        onDone(enrichedCount); return
      }

      if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT', 'TIMING-OUT'].includes(status)) {
        if (['SUCCEEDED', 'TIMED-OUT', 'TIMING-OUT'].includes(status)) {
          const finalItems = await fetchDatasetItems(datasetId, token, seenCount, 200) as Record<string, unknown>[]
          for (const item of finalItems) {
            const itemUrl = (item.url || item.postUrl || '') as string
            const matched = matchEnrichItem(itemUrl, results, true, (item.text || '') as string)
            if (matched) {
              const hasData = item.likes != null || item.comments != null || item.shares != null || item.text
              if (hasData) {
                matched.likes    = (item.likes    ?? null) as number | null
                matched.comments = (item.comments ?? null) as number | null
                matched.shares   = (item.shares   ?? null) as number | null
                if (item.text)  matched.fullText = item.text as string
                if (item.media) matched.media    = item.media as unknown[]
                matched.state = 'enriched'; enrichedCount++
              } else { matched.state = 'failed' }
              onCardUpdate(matched)
            }
          }
        }
        results.forEach(r => { if (r.state === 'pending') { r.state = 'failed'; onCardUpdate(r) } })
        onProgress(enrichedCount, total)
        onDone(enrichedCount); return
      }

      if (enrichedCount >= total) { onDone(enrichedCount); return }
      setTimeout(poll, POLL_MS)
    } catch (e) { if (!abort.abort) setTimeout(poll, POLL_MS * 2) }
  }
  setTimeout(poll, POLL_MS)
}

export function abortFacebookEnrichment(): void {
  if (enrichAbort) enrichAbort.abort = true
}

// Keep references available for URL matching debug logging
export { extractFbPageContext, extractFbPostKey }
