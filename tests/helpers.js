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
 */
export async function gotoApp(page, path) {
  await page.goto(path);
  await page.waitForSelector('#app:not(.hidden)', { timeout: 10_000 });
}
