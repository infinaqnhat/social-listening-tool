#!/usr/bin/env node
/**
 * Scheduled search runner — executed by GitHub Actions.
 *
 * Reads keyword configs from scheduled-searches.json, runs each search via
 * the Apify API, and saves results as JSON files in /results/.
 *
 * Required env: APIFY_TOKEN
 *
 * scheduled-searches.json shape:
 * [
 *   {
 *     "keyword": "VinFast",
 *     "platforms": ["facebook"],
 *     "totalResults": 20,
 *     "lang": "vi",
 *     "dateFrom": null,
 *     "dateTo": null
 *   }
 * ]
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')

const APIFY_BASE = 'https://api.apify.com/v2'
const POLL_MS    = 5000
const token      = process.env.APIFY_TOKEN

if (!token) {
  console.error('APIFY_TOKEN env var is required')
  process.exit(1)
}

async function startActor(actorId, input) {
  const res = await fetch(`${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Actor start failed: ${res.status}`)
  return (await res.json()).data
}

async function waitForRun(runId) {
  while (true) {
    await new Promise(r => setTimeout(r, POLL_MS))
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${encodeURIComponent(token)}`)
    const { data } = await res.json()
    console.log(`  Run ${runId}: ${data.status}`)
    if (data.status === 'SUCCEEDED') return
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(data.status)) throw new Error(`Run ${data.status}`)
  }
}

async function fetchAllItems(datasetId) {
  const items = []
  let offset = 0
  while (true) {
    const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&offset=${offset}&limit=100&clean=true`)
    const batch = await res.json()
    if (!batch.length) break
    items.push(...batch)
    offset += batch.length
    if (batch.length < 100) break
  }
  return items
}

async function runSearch({ keyword, platforms, totalResults, lang, dateFrom, dateTo }) {
  const platformArr = platforms || ['facebook']
  const results = {}

  for (const platform of platformArr) {
    console.log(`  Searching ${platform} for "${keyword}"…`)

    const input = {
      queries:          keyword,
      site:             platform === 'linkedin' ? 'linkedin.com' : platform === 'tiktok' ? 'tiktok.com' : 'facebook.com',
      countryCode:      'vn',
      languageCode:     lang || 'vi',
      resultsPerPage:   10,
      maxPagesPerQuery: Math.ceil((totalResults || 10) / 10),
    }
    if (dateFrom) input.afterDate  = dateFrom
    if (dateTo)   input.beforeDate = dateTo

    const run = await startActor('apify/google-search-scraper', input)
    await waitForRun(run.id)
    const items = await fetchAllItems(run.defaultDatasetId)

    let organic = []
    for (const item of items) organic = organic.concat(item.organicResults || item.organic || [])

    const filterFn =
      platform === 'linkedin' ? u => u.includes('linkedin.com/pulse') || u.includes('linkedin.com/posts') || u.includes('linkedin.com/feed')
      : platform === 'tiktok' ? u => u.includes('tiktok.com/@') && u.includes('/video/')
      : u => u.includes('facebook.com') && !u.includes('facebook.com/ads') && !u.includes('l.facebook.com')

    results[platform] = organic
      .filter(r => filterFn((r.url || r.link || '').toLowerCase()))
      .map((r, i) => ({
        id: `${platform[0]}-${i}-${(r.url || r.link || '').toLowerCase()}`,
        url: r.url || r.link || '',
        title: r.title || '',
        content: r.description || r.snippet || '',
        platform,
        publishedAt: r.date || r.publishedAt || null,
      }))

    console.log(`  → ${results[platform].length} ${platform} results`)
  }

  return results
}

async function main() {
  const configPath = join(ROOT, 'scheduled-searches.json')
  if (!existsSync(configPath)) {
    console.log('No scheduled-searches.json found — nothing to run.')
    return
  }

  const searches = JSON.parse(readFileSync(configPath, 'utf-8'))
  const outDir   = join(ROOT, 'results')
  mkdirSync(outDir, { recursive: true })

  for (const search of searches) {
    console.log(`\nRunning search: "${search.keyword}"`)
    try {
      const results = await runSearch(search)
      const filename = `${search.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`
      writeFileSync(join(outDir, filename), JSON.stringify({ search, results, runAt: new Date().toISOString() }, null, 2))
      console.log(`  Saved: results/${filename}`)
    } catch (e) {
      console.error(`  FAILED: ${e.message}`)
    }
  }

  console.log('\nAll done.')
}

main().catch(e => { console.error(e); process.exit(1) })
