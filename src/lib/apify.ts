export const APIFY_BASE = 'https://api.apify.com/v2'
export const POLL_MS = 3000

export async function startActor(actorId: string, input: object, token: string): Promise<{ id: string; defaultDatasetId: string }> {
  const res = await fetch(`${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    let detail = ''
    try { const j = await res.json(); detail = j.error?.message || JSON.stringify(j) } catch { detail = await res.text().catch(() => '') }
    throw new Error(`Actor start failed: ${res.status} — ${detail}`)
  }
  return (await res.json()).data
}

export async function getRunStatus(runId: string, token: string): Promise<string> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`)
  return (await res.json()).data.status
}

export async function waitForRun(runId: string, token: string, onTick?: (s: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getRunStatus(runId, token)
        if (onTick) onTick(status)
        if (status === 'SUCCEEDED') { resolve(); return }
        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) { reject(new Error(`Run ${status}`)); return }
        setTimeout(poll, POLL_MS)
      } catch (e) { reject(e) }
    }
    setTimeout(poll, POLL_MS)
  })
}

export async function fetchDatasetItems(datasetId: string, token: string, offset = 0, limit = 100): Promise<unknown[]> {
  const res = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&offset=${offset}&limit=${limit}&clean=true`,
  )
  if (!res.ok) return []
  return res.json()
}

export async function fetchApifyUsage(token: string): Promise<{
  limitUsd: number
  usedUsd: number
  cycleStart: string
  cycleEnd: string
} | null> {
  try {
    const res = await fetch(`${APIFY_BASE}/users/me/limits?token=${encodeURIComponent(token)}`)
    if (!res.ok) return null
    const json = await res.json()
    const d = json.data
    return {
      limitUsd: d.limits?.maxMonthlyUsageUsd ?? 0,
      usedUsd: d.current?.monthlyUsageUsd ?? 0,
      cycleStart: d.monthlyUsageCycle?.startAt ?? '',
      cycleEnd: d.monthlyUsageCycle?.endAt ?? '',
    }
  } catch { return null }
}
