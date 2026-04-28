import {
  MOCK_TOKEN,
  googleRunResponse,
  fbEnrichRunResponse,
  googleSearchItems,
  fbEnrichItems,
  apifyUsageResponse,
} from './fixtures/mock-data.js';

const APIFY_BASE = 'https://api.apify.com/v2';

/**
 * Mock all external CDN URLs that are blocked in this sandbox environment.
 * Must be called before page.goto().
 *
 * - esm.sh: critical — the entire <script type="module"> fails if this import
 *   can't resolve (ES module resolution is strict).
 * - cdn.tailwindcss.com: inject minimal CSS so .hidden keeps working.
 * - cdnjs.cloudflare.com/Chart.js: stub window.Chart to avoid ReferenceErrors.
 */
export async function mockCDNs(page) {
  // esm.sh — return a minimal Anthropic stub module
  await page.route('https://esm.sh/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: `
export default class Anthropic {
  constructor(opts = {}) {}
  messages = {
    create: async () => ({
      id: 'stub',
      content: [{ type: 'text', text: '{"topics":[],"suggestions":[],"sentiment":{"positive":50,"neutral":30,"negative":20}}' }],
      stop_reason: 'end_turn',
    }),
  };
}
export class APIError extends Error {}
`,
    });
  });

  // Tailwind CDN — inject .hidden style so display:none keeps working in tests
  await page.route('https://cdn.tailwindcss.com**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(function(){
  const s = document.createElement('style');
  s.textContent = '.hidden{display:none!important}';
  document.head.appendChild(s);
})();`,
    });
  });

  // Chart.js — stub window.Chart to prevent ReferenceErrors in insights rendering
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.Chart = class Chart {
  constructor(ctx, cfg) {}
  update() {} destroy() {} resize() {}
  static register() {}
};`,
    });
  });
}

/**
 * Write sl_apify_token to localStorage before the page module script runs,
 * so initAuth() finds a token and shows #app instead of #token-screen.
 * Must be called before page.goto().
 */
export async function bypassTokenScreen(page, token = MOCK_TOKEN) {
  await page.addInitScript((t) => {
    localStorage.setItem('sl_apify_token', t);
  }, token);
}

/**
 * Intercept all Apify API calls with deterministic mock responses.
 *
 * The app's three-step flow for a Facebook search:
 *   1. POST /acts/{actorId}/runs  → startActor()
 *   2. GET  /actor-runs/{runId}   → waitForRun() polls until SUCCEEDED
 *   3. GET  /datasets/{id}/items  → fetchDatasetItems() (offset=0 then N)
 *
 * Must be called before page.goto().
 */
export async function mockApifyAPIs(page, options = {}) {
  const {
    googleItems = googleSearchItems,
    enrichItems = fbEnrichItems,
    skipEnrichment = false,
  } = options;

  // 1. startActor: POST /acts/{actorId}/runs
  await page.route(`${APIFY_BASE}/acts/*/runs**`, async (route) => {
    const url = route.request().url();
    const isFbEnrich =
      url.includes('facebook-posts-scraper') ||
      url.includes('apify%2Ffacebook-posts-scraper');
    const isLiEnrich =
      url.includes('linkedin-bulk-post-scraper') ||
      url.includes('datadoping%2Flinkedin-bulk-post-scraper');
    const isTtEnrich =
      url.includes('tiktok-data-scraper') ||
      url.includes('api-ninja%2Ftiktok-data-scraper');

    let body;
    if ((isFbEnrich || isLiEnrich || isTtEnrich) && !skipEnrichment) {
      body = JSON.stringify(fbEnrichRunResponse);
    } else {
      body = JSON.stringify(googleRunResponse);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });

  // 2. waitForRun polling: GET /actor-runs/{runId}
  await page.route(`${APIFY_BASE}/actor-runs/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { status: 'SUCCEEDED' } }),
    });
  });

  // 3. fetchDatasetItems: GET /datasets/{datasetId}/items
  // Returns googleItems on first call (offset=0), [] on subsequent calls.
  // Enrichment datasets (identified by ID) return enrichItems on first call.
  await page.route(`${APIFY_BASE}/datasets/*/items**`, async (route) => {
    const url = route.request().url();
    const offset = parseInt(new URL(url).searchParams.get('offset') || '0', 10);
    const pathMatch = new URL(url).pathname.match(/\/datasets\/([^/]+)\/items/);
    const datasetId = pathMatch ? pathMatch[1] : '';

    const isEnrich =
      datasetId === 'dataset-fb-enrich-abc' ||
      datasetId === 'dataset-li-enrich-abc' ||
      datasetId === 'dataset-tt-enrich-abc';

    const items = offset === 0 ? (isEnrich ? enrichItems : googleItems) : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(items),
    });
  });

  // 4. Apify usage: GET /users/me/limits
  await page.route(`${APIFY_BASE}/users/me/limits**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apifyUsageResponse),
    });
  });
}

/**
 * Write arbitrary key/value pairs to localStorage via addInitScript.
 * Values that are not strings are JSON-serialised automatically.
 * Must be called before page.goto().
 */
export async function seedLocalStorage(page, entries) {
  await page.addInitScript((map) => {
    for (const [key, value] of Object.entries(map)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  }, entries);
}

/**
 * Navigate to path and wait for #app to become visible.
 * bypassTokenScreen (or manual token setup) must be called first.
 * Automatically mocks blocked CDN URLs before navigating.
 */
export async function gotoApp(page, path) {
  await mockCDNs(page);
  await page.goto(path);
  await page.waitForSelector('#app:not(.hidden)', { timeout: 10_000 });
}
