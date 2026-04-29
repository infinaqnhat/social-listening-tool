export interface SearchResult {
  id: string
  url: string
  title: string
  content: string
  source: string
  publishedAt: string | null
  detectedLang: string
  platform: 'facebook' | 'linkedin' | 'tiktok'
  likes: number | null
  comments: number | null
  shares: number | null
  plays?: number | null
  state: 'skeleton' | 'pending' | 'enriched' | 'failed'
  fullText?: string
  media?: unknown[]
  liImage?: string
  authorName?: string
  authorImage?: string
  followers?: number
  ttPlayUrl?: string
  ttCoverUrl?: string
}

export function normalizeUrl(url: string): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^m\./, 'www.')
    return (u.protocol + '//' + host + u.pathname).replace(/\/+$/, '').toLowerCase()
  } catch { return url.toLowerCase().replace(/\/+$/, '') }
}

export function extractFbPostKey(url: string): string | null {
  if (!url) return null
  const u = url.toLowerCase()
  let m: RegExpMatchArray | null
  m = u.match(/\/posts\/(pfbid[a-z0-9]+)/); if (m) return 'pfbid:' + m[1]
  m = u.match(/\/posts\/(\d+)/);             if (m) return 'id:'    + m[1]
  m = u.match(/\/permalink\/(\d+)/);         if (m) return 'id:'    + m[1]
  m = u.match(/[?&]story_fbid=(\d+)/);       if (m) return 'id:'    + m[1]
  m = u.match(/[?&]fbid=(\d+)/);             if (m) return 'fbid:'  + m[1]
  m = u.match(/\/reels?\/(\d+)/);            if (m) return 'reel:'  + m[1]
  m = u.match(/\/videos?\/(\d+)/);           if (m) return 'video:' + m[1]
  m = u.match(/[?&]v=(\d+)/);               if (m) return 'video:' + m[1]
  return null
}

export function extractFbPageContext(url: string): string | null {
  if (!url) return null
  const u = url.toLowerCase().replace(/^https?:\/\/(www\.|m\.)?facebook\.com\//, '')
  const m = u.match(/^((?:groups\/)?[^/?#]+\/(?:posts|permalink|videos|reel|photo))\//)
  return m ? m[1] : null
}

// Four-level matching: L1 normalised URL, L2 FB post key, L3 page+type context, L4 text similarity.
// Copy verbatim from social-search.html — do not simplify.
export function matchEnrichItem(
  itemUrl: string,
  results: SearchResult[],
  skipEnriched = false,
  itemText = '',
): SearchResult | null {
  if (!itemUrl && !itemText) return null
  const pool = skipEnriched ? results.filter(r => r.state !== 'enriched') : results

  if (itemUrl) {
    const norm = normalizeUrl(itemUrl)
    const l1 = pool.find(r => normalizeUrl(r.url) === norm)
    if (l1) return l1

    const key = extractFbPostKey(itemUrl)
    if (key) {
      const l2 = pool.find(r => extractFbPostKey(r.url) === key)
      if (l2) return l2
    }

    const ctx = extractFbPageContext(itemUrl)
    if (ctx) {
      const candidates = pool.filter(r => extractFbPageContext(r.url) === ctx)
      if (candidates.length === 1) return candidates[0]
    }
  }

  if (itemText && itemText.length > 20) {
    const haystack = itemText.normalize('NFC').toLowerCase().replace(/\s+/g, ' ')

    const l4 = pool.find(r => {
      const snippet = (r.content || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
      if (snippet.length >= 15 && haystack.includes(snippet.slice(0, 80))) return true

      const titleClean = (r.title || '').normalize('NFC').toLowerCase()
        .replace(/\s*[|–—]\s+.*$/, '')
        .replace(/[.…]+$/, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (titleClean.length >= 20 && haystack.includes(titleClean.slice(0, 60))) return true

      return false
    })
    if (l4) return l4
  }

  return null
}
