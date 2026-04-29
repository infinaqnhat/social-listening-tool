import { startActor, getRunStatus, fetchDatasetItems, POLL_MS } from '../apify'
import type { SearchResult } from '../urlMatching'

let liEnrichAbort: { abort: boolean } | null = null

function normLiUrl(u: string): string {
  try { const p = new URL(u); return (p.protocol + '//' + p.hostname + p.pathname).replace(/\/+$/, '').toLowerCase() }
  catch { return u.toLowerCase().replace(/\/+$/, '') }
}

function matchLiItem(itemUrl: string, itemText: string, results: SearchResult[]): SearchResult | null {
  const pool = results.filter(r => r.state !== 'enriched')
  if (itemUrl) {
    const l1 = pool.find(r => normLiUrl(r.url) === normLiUrl(itemUrl))
    if (l1) return l1
  }
  if (itemText && itemText.length > 20) {
    const haystack = itemText.normalize('NFC').toLowerCase().replace(/\s+/g, ' ')
    const l4 = pool.find(r => {
      const snippet = (r.content || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
      if (snippet.length >= 15 && haystack.includes(snippet.slice(0, 80))) return true
      const titleClean = (r.title || '').normalize('NFC').toLowerCase()
        .replace(/\s*[|–—]\s+.*$/, '').replace(/[.…]+$/, '').replace(/\s+/g, ' ').trim()
      if (titleClean.length >= 20 && haystack.includes(titleClean.slice(0, 60))) return true
      return false
    })
    if (l4) return l4
  }
  return null
}

function applyLiItem(item: Record<string, unknown>, matched: SearchResult): boolean {
  const text = ((item.post_headline || item.text || item.content || '') as string)
  const hasData = item.like_count != null || item.comments_count != null || text
  if (hasData) {
    matched.likes    = (item.like_count    ?? null) as number | null
    matched.comments = (item.comments_count ?? null) as number | null
    matched.shares   = null
    if (text)                      matched.fullText    = text
    if (item.image)                matched.liImage     = item.image as string
    if (item.author_name)          matched.authorName  = item.author_name as string
    if (item.author_image)         matched.authorImage = item.author_image as string
    if (item.followers != null)    matched.followers   = item.followers as number
    matched.state = 'enriched'; return true
  } else { matched.state = 'failed'; return false }
}

export async function enrichLinkedInProgressively(
  results: SearchResult[],
  token: string,
  onProgress: (done: number, total: number) => void,
  onCardUpdate: (r: SearchResult) => void,
  onDone: (count: number) => void,
): Promise<void> {
  if (liEnrichAbort) liEnrichAbort.abort = true
  const abort = { abort: false }
  liEnrichAbort = abort

  const liUrls = results.map(r => r.url).filter(u => u && u.includes('linkedin.com'))
  if (liUrls.length === 0) { onDone(0); return }

  let run: { id: string; defaultDatasetId: string }
  let datasetId: string
  try {
    const r = await startActor('datadoping/linkedin-bulk-post-scraper', { post_urls: liUrls }, token)
    run = r; datasetId = r.defaultDatasetId
  } catch (e) {
    results.forEach(r => { if (r.state === 'pending') { r.state = 'failed'; onCardUpdate(r) } })
    onDone(0); return
  }

  let seenCount = 0, enrichedCount = 0
  const total = liUrls.length

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
        const itemUrl  = ((item.input || item.url || item.postUrl || item.postURL || '') as string)
        const itemText = ((item.post_headline || item.text || item.content || '') as string)
        const matched = matchLiItem(itemUrl, itemText, results)
        if (matched) { const ok = applyLiItem(item, matched); if (ok) enrichedCount++; onCardUpdate(matched) }
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
            const itemUrl  = ((item.input || item.url || item.postUrl || item.postURL || '') as string)
            const itemText = ((item.post_headline || item.text || item.content || '') as string)
            const matched = matchLiItem(itemUrl, itemText, results)
            if (matched) { const ok = applyLiItem(item, matched); if (ok) enrichedCount++; onCardUpdate(matched) }
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

export function abortLinkedInEnrichment(): void {
  if (liEnrichAbort) liEnrichAbort.abort = true
}
