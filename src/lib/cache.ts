import type { SearchResult } from './urlMatching'

const CACHE_TTL_MS = 30 * 60 * 1000

function cacheKey(keyword: string, dateFrom: string | null, dateTo: string | null, lang: string, totalResults: number, platform: string): string {
  const prefix = platform === 'linkedin' ? 'li_cache' : platform === 'tiktok' ? 'tt_cache' : 'fb_cache'
  const d = [dateFrom || 'x', dateTo || 'x', lang || 'any', totalResults || 10].join('_')
  return `${prefix}_${keyword.toLowerCase().trim().replace(/\s+/g, '_')}_${d}`
}

export function saveCache(
  keyword: string,
  dateFrom: string | null,
  dateTo: string | null,
  lang: string,
  totalResults: number,
  results: SearchResult[],
  enrichedPages: Set<number>,
  platform: string,
): void {
  try {
    localStorage.setItem(
      cacheKey(keyword, dateFrom, dateTo, lang, totalResults, platform),
      JSON.stringify({ results, enrichedPages: [...enrichedPages], savedAt: Date.now() }),
    )
  } catch { /* quota exceeded — silently ignore */ }
}

export function loadCache(
  keyword: string,
  dateFrom: string | null,
  dateTo: string | null,
  lang: string,
  totalResults: number,
  platform: string,
): { results: SearchResult[]; enrichedPages: number[] } | null {
  try {
    const key = cacheKey(keyword, dateFrom, dateTo, lang, totalResults, platform)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { results: SearchResult[]; enrichedPages: number[]; savedAt: number }
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) { localStorage.removeItem(key); return null }
    return parsed
  } catch { return null }
}

export function clearCacheForKeyword(keyword: string): void {
  const kwKey = keyword.toLowerCase().trim().replace(/\s+/g, '_')
  ;['fb_cache', 'li_cache', 'tt_cache'].forEach(prefix => {
    const p = `${prefix}_${kwKey}`
    Object.keys(localStorage)
      .filter(k => k.startsWith(p))
      .forEach(k => localStorage.removeItem(k))
  })
}
