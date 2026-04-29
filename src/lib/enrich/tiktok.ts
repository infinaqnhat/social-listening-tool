import { startActor, getRunStatus, fetchDatasetItems, POLL_MS } from '../apify'
import type { SearchResult } from '../urlMatching'

let ttEnrichAbort: { abort: boolean } | null = null

function applyTtItem(matched: SearchResult, item: Record<string, unknown>): void {
  const d = (item.data && typeof item.data === 'object') ? (item.data as Record<string, unknown>) : {}
  matched.likes    = ((d.digg_count    ?? item['data.digg_count'])    ?? null) as number | null
  matched.comments = ((d.comment_count ?? item['data.comment_count']) ?? null) as number | null
  matched.shares   = ((d.share_count   ?? item['data.share_count'])   ?? null) as number | null
  matched.plays    = ((d.play_count    ?? item['data.play_count'])     ?? null) as number | null
  const title    = (d.title           ?? item['data.title'])           as string | undefined
  const nickname = ((d.author as Record<string, unknown>)?.nickname ?? item['data.author.nickname']) as string | undefined
  const avatar   = ((d.author as Record<string, unknown>)?.avatar   ?? item['data.author.avatar'])   as string | undefined
  const ctime    = (d.create_time     ?? item['data.create_time'])     as number | undefined
  const playUrl  = (d.play            ?? item['data.play'])            as string | undefined
  const coverUrl = (d.cover           ?? item['data.cover'])           as string | undefined
  if (title)    matched.fullText    = title
  if (nickname) matched.authorName  = nickname
  if (avatar)   matched.authorImage = avatar
  if (ctime)    matched.publishedAt = new Date(ctime * 1000).toISOString()
  if (playUrl)  matched.ttPlayUrl   = playUrl
  if (coverUrl) matched.ttCoverUrl  = coverUrl
}

function ttHasData(item: Record<string, unknown>): boolean {
  const d = (item.data && typeof item.data === 'object') ? (item.data as Record<string, unknown>) : {}
  return (d.digg_count ?? item['data.digg_count']) != null
    || (d.comment_count ?? item['data.comment_count']) != null
    || !!(d.title ?? item['data.title'])
}

export async function enrichTikTokProgressively(
  results: SearchResult[],
  token: string,
  onProgress: (done: number, total: number) => void,
  onCardUpdate: (r: SearchResult) => void,
  onDone: (count: number) => void,
): Promise<void> {
  if (ttEnrichAbort) ttEnrichAbort.abort = true
  const abort = { abort: false }
  ttEnrichAbort = abort

  const ttUrls = results.map(r => r.url).filter(u => u && u.includes('tiktok.com'))
  if (ttUrls.length === 0) { onDone(0); return }

  let run: { id: string; defaultDatasetId: string }
  let datasetId: string
  try {
    const r = await startActor('api-ninja/tiktok-data-scraper', {
      scrapeAllComments:       false,
      scrapeAllHashtagVideos:  false,
      scrapeAllMusicVideos:    false,
      scrapeAllPlaylistVideos: false,
      scrapeAllReplies:        false,
      scrapeAllUserResults:    false,
      videoDetailsList:        ttUrls,
    }, token)
    run = r; datasetId = r.defaultDatasetId
  } catch (e) {
    results.forEach(r => { if (r.state === 'pending') { r.state = 'failed'; onCardUpdate(r) } })
    onDone(0); return
  }

  let seenCount = 0, enrichedCount = 0
  const total = ttUrls.length

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
        const matched = results.find(r => r.state !== 'enriched' && r.url === item.input)
        if (matched) {
          if (ttHasData(item)) { applyTtItem(matched, item); matched.state = 'enriched'; enrichedCount++ }
          else { matched.state = 'failed' }
          onCardUpdate(matched)
        }
      }
      onProgress(enrichedCount, total)
      if (abort.abort) {
        results.forEach(r => { if (r.state === 'pending') { r.state = 'failed'; onCardUpdate(r) } })
        onDone(enrichedCount); return
      }
      const status = await getRunStatus(run.id, token)
      if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT', 'TIMING-OUT'].includes(status)) {
        if (['SUCCEEDED', 'TIMED-OUT', 'TIMING-OUT'].includes(status)) {
          const finalItems = await fetchDatasetItems(datasetId, token, seenCount, 200) as Record<string, unknown>[]
          for (const item of finalItems) {
            const matched = results.find(r => r.state !== 'enriched' && r.url === item.input)
            if (matched) {
              if (ttHasData(item)) { applyTtItem(matched, item); matched.state = 'enriched'; enrichedCount++ }
              else { matched.state = 'failed' }
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

export function abortTikTokEnrichment(): void {
  if (ttEnrichAbort) ttEnrichAbort.abort = true
}
