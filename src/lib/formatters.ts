export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return '' }
}

export function escHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const LANG_PATTERNS: Record<string, RegExp> = {
  vi: /[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắặẵặảẻẽẹếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i,
  zh: /[一-鿿]/,
  ja: /[぀-ヿ]/,
  ko: /[가-힯]/,
  th: /[฀-๿]/,
}

export function detectLang(text: string): string {
  if (!text) return ''
  for (const [lang, re] of Object.entries(LANG_PATTERNS)) if (re.test(text)) return lang
  return 'en'
}

export function engagementScore(r: { state: string; likes?: number | null; comments?: number | null; shares?: number | null }): number {
  if (r.state !== 'enriched') return -1
  return (r.likes || 0) + (r.comments || 0) + (r.shares || 0)
}
