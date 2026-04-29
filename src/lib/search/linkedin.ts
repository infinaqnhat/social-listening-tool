import { startActor, getRunStatus, fetchDatasetItems, POLL_MS } from '../apify'
import { detectLang } from '../formatters'
import type { SearchResult } from '../urlMatching'

function normalizeLinkedInResult(r: Record<string, unknown>, idx: number): SearchResult {
  const url = (r.url || r.link || '') as string
  const date = (r.date || r.publishedAt || null) as string | null
  let publishedAt: string | null = null
  if (date) { const d = new Date(date); if (!isNaN(d.getTime())) publishedAt = d.toISOString() }
  return {
    id: `li-${idx}-${url}`, url,
    title: (r.title || '') as string,
    content: ((r.description || r.snippet || '') as string),
    source: ((r.displayedUrl || url) as string),
    publishedAt,
    detectedLang: detectLang(((r.title || '') + ' ' + (r.description || '')) as string),
    platform: 'linkedin',
    likes: null, comments: null, shares: null,
    state: 'pending',
  }
}

const filterLi = (r: Record<string, unknown>) => {
  const u = ((r.url || r.link || '') as string).toLowerCase()
  return u.includes('linkedin.com')
    && !u.includes('linkedin.com/jobs')
    && !u.includes('linkedin.com/company/')
    && !u.includes('linkedin.com/in/')
    && !u.includes('linkedin.com/school/')
    && !u.includes('linkedin.com/learning/')
}

export async function runLinkedInSearch(
  keyword: string,
  totalResults: number,
  dateFrom: string | null,
  dateTo: string | null,
  lang: string,
  token: string,
  onStatus: (s: string) => void,
  onNewResults: (results: SearchResult[]) => void,
): Promise<void> {
  onStatus('Starting LinkedIn search…')

  const input: Record<string, unknown> = {
    queries:                  keyword,
    site:                     'linkedin.com',
    countryCode:              'vn',
    languageCode:             lang || 'vi',
    resultsPerPage:           10,
    maxPagesPerQuery:         Math.ceil(totalResults / 10),
    mobileResults:            false,
    includeUnfilteredResults: false,
    saveHtml:                 false,
    saveHtmlToKeyValueStore:  false,
    focusOnPaidAds:           false,
    includeIcons:             false,
  }
  if (dateFrom) input.afterDate  = dateFrom
  if (dateTo)   input.beforeDate = dateTo

  const run = await startActor('apify/google-search-scraper', input, token)
  onStatus('LinkedIn search: RUNNING…')

  let seenItems = 0
  let idxOffset = 0

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const newItems = await fetchDatasetItems(run.defaultDatasetId, token, seenItems, 20) as Record<string, unknown>[]
        if (newItems.length > 0) {
          seenItems += newItems.length
          let organic: Record<string, unknown>[] = []
          for (const item of newItems) organic = organic.concat((item.organicResults || item.organic || []) as Record<string, unknown>[])
          organic = organic.filter(filterLi)
          if (organic.length > 0) {
            onNewResults(organic.map((r, i) => normalizeLinkedInResult(r, idxOffset + i)))
            idxOffset += organic.length
          }
        }

        const status = await getRunStatus(run.id, token)
        onStatus(`LinkedIn search: ${status}…`)

        if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
          const finalItems = await fetchDatasetItems(run.defaultDatasetId, token, seenItems, 500) as Record<string, unknown>[]
          if (finalItems.length > 0) {
            let organic: Record<string, unknown>[] = []
            for (const item of finalItems) organic = organic.concat((item.organicResults || item.organic || []) as Record<string, unknown>[])
            organic = organic.filter(filterLi)
            if (organic.length > 0) onNewResults(organic.map((r, i) => normalizeLinkedInResult(r, idxOffset + i)))
          }
          resolve(); return
        }

        setTimeout(poll, POLL_MS)
      } catch (e) { reject(e) }
    }
    setTimeout(poll, POLL_MS)
  })
}
