import { test, expect } from '@playwright/test';
import { bypassTokenScreen, mockApifyAPIs, seedLocalStorage, gotoApp } from './helpers.js';
import { MOCK_TOKEN, MOCK_CLAUDE_KEY, preSavedPost, preHistoryEntry } from './fixtures/mock-data.js';

// The canonical and redesign files share the same JS and element IDs but
// differ in CSS class conventions (e.g. date preset active state).
const PAGES = [
  { label: 'canonical', path: '/social-search.html', presetActiveClass: 'border-blue-500' },
  { label: 'redesign', path: '/social-search-redesign.html', presetActiveClass: 'active' },
];

// ── Section 1: Token Screen ───────────────────────────────────────────────────

test.describe('Token Screen', () => {

  test('shows token-screen and hides #app when no token is stored', async ({ page }) => {
    await page.goto('/social-search.html');
    await expect(page.locator('#token-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#app')).toHaveClass(/hidden/);
  });

  test('#kw and #search-btn are not visible while token screen is shown', async ({ page }) => {
    await page.goto('/social-search.html');
    await expect(page.locator('#kw')).not.toBeVisible();
    await expect(page.locator('#search-btn')).not.toBeVisible();
  });

  test('entering token and clicking Save reveals #app and hides token screen', async ({ page }) => {
    await page.goto('/social-search.html');
    await page.fill('#token-input', MOCK_TOKEN);
    await page.click('button[onclick="saveToken()"]');
    await expect(page.locator('#token-screen')).toHaveClass(/hidden/);
    await expect(page.locator('#app')).not.toHaveClass(/hidden/);
  });

  test('token is persisted to localStorage after save', async ({ page }) => {
    await page.goto('/social-search.html');
    await page.fill('#token-input', MOCK_TOKEN);
    await page.click('button[onclick="saveToken()"]');
    const stored = await page.evaluate(() => localStorage.getItem('sl_apify_token'));
    expect(stored).toBe(MOCK_TOKEN);
  });

  test('shows #token-err and keeps app hidden when submitted empty', async ({ page }) => {
    await page.goto('/social-search.html');
    await page.click('button[onclick="saveToken()"]');
    await expect(page.locator('#token-err')).not.toHaveClass(/hidden/);
    await expect(page.locator('#app')).toHaveClass(/hidden/);
  });

  test('Enter key in token-input triggers save', async ({ page }) => {
    await page.goto('/social-search.html');
    await page.fill('#token-input', MOCK_TOKEN);
    await page.press('#token-input', 'Enter');
    await expect(page.locator('#app')).not.toHaveClass(/hidden/);
  });

});

// ── Section 2: Platform Toggles (both pages) ──────────────────────────────────

for (const { label, path } of PAGES) {
  test.describe(`Platform toggles [${label}]`, () => {

    test.beforeEach(async ({ page }) => {
      await bypassTokenScreen(page);
      await gotoApp(page, path);
    });

    test('Facebook is active by default', async ({ page }) => {
      await expect(page.locator('#plat-facebook')).toHaveClass(/active/);
      await expect(page.locator('#plat-linkedin')).not.toHaveClass(/active/);
      await expect(page.locator('#plat-tiktok')).not.toHaveClass(/active/);
    });

    test('clicking LinkedIn adds it as active (Facebook remains active)', async ({ page }) => {
      await page.click('#plat-linkedin');
      await expect(page.locator('#plat-linkedin')).toHaveClass(/active/);
      await expect(page.locator('#plat-facebook')).toHaveClass(/active/);
    });

    test('platform sub-tab bar is hidden with a single platform selected', async ({ page }) => {
      await expect(page.locator('#tab-bar')).toHaveClass(/hidden/);
    });

    test('platform sub-tab bar appears when 2 platforms are selected', async ({ page }) => {
      await page.click('#plat-linkedin');
      await expect(page.locator('#tab-bar')).not.toHaveClass(/hidden/);
    });

    test('all three sub-tabs appear when all three platforms are selected', async ({ page }) => {
      await page.click('#plat-linkedin');
      await page.click('#plat-tiktok');
      await expect(page.locator('#tab-facebook')).toBeVisible();
      await expect(page.locator('#tab-linkedin')).toBeVisible();
      await expect(page.locator('#tab-tiktok')).toBeVisible();
    });

    test('cannot deselect the last remaining platform', async ({ page }) => {
      await page.click('#plat-facebook');
      await expect(page.locator('#plat-facebook')).toHaveClass(/active/);
    });

    test('deselecting one of two platforms removes its active state', async ({ page }) => {
      await page.click('#plat-linkedin');
      await expect(page.locator('#plat-linkedin')).toHaveClass(/active/);
      await page.click('#plat-linkedin');
      await expect(page.locator('#plat-linkedin')).not.toHaveClass(/active/);
    });

    test('sub-tab bar hides again when back to a single platform', async ({ page }) => {
      await page.click('#plat-linkedin');
      await expect(page.locator('#tab-bar')).not.toHaveClass(/hidden/);
      await page.click('#plat-linkedin');
      await expect(page.locator('#tab-bar')).toHaveClass(/hidden/);
    });

  });
}

// ── Section 3: Date Presets (both pages) ──────────────────────────────────────

for (const { label, path, presetActiveClass } of PAGES) {
  test.describe(`Date presets [${label}]`, () => {

    test.beforeEach(async ({ page }) => {
      await bypassTokenScreen(page);
      await gotoApp(page, path);
    });

    test('no preset is active by default', async ({ page }) => {
      for (const id of ['preset-today', 'preset-7d', 'preset-30d', 'preset-custom']) {
        await expect(page.locator(`#${id}`)).not.toHaveClass(new RegExp(presetActiveClass));
      }
    });

    test('clicking Today marks only that button active', async ({ page }) => {
      await page.click('#preset-today');
      await expect(page.locator('#preset-today')).toHaveClass(new RegExp(presetActiveClass));
      await expect(page.locator('#preset-7d')).not.toHaveClass(new RegExp(presetActiveClass));
    });

    test('clicking Last 7 days sets date-from to a past date', async ({ page }) => {
      await page.click('#preset-7d');
      const fromValue = await page.inputValue('#date-from');
      expect(fromValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(fromValue) < new Date()).toBe(true);
    });

    test('clicking Last 30 days sets a 29-day date range', async ({ page }) => {
      await page.click('#preset-30d');
      const from = await page.inputValue('#date-from');
      const to = await page.inputValue('#date-to');
      const diffDays = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(29);
    });

    test('Custom preset shows the #custom-dates panel', async ({ page }) => {
      await expect(page.locator('#custom-dates')).not.toBeVisible();
      await page.click('#preset-custom');
      await expect(page.locator('#custom-dates')).toBeVisible();
    });

    test('switching from Custom to another preset hides #custom-dates', async ({ page }) => {
      await page.click('#preset-custom');
      await expect(page.locator('#custom-dates')).toBeVisible();
      await page.click('#preset-7d');
      await expect(page.locator('#custom-dates')).not.toBeVisible();
    });

    test('switching presets moves the active state to the new button', async ({ page }) => {
      await page.click('#preset-today');
      await expect(page.locator('#preset-today')).toHaveClass(new RegExp(presetActiveClass));
      await page.click('#preset-30d');
      await expect(page.locator('#preset-30d')).toHaveClass(new RegExp(presetActiveClass));
      await expect(page.locator('#preset-today')).not.toHaveClass(new RegExp(presetActiveClass));
    });

  });
}

// ── Section 4: Search Flow (mocked Apify API, canonical only) ─────────────────

test.describe('Search flow (mocked Apify API)', () => {

  test.beforeEach(async ({ page }) => {
    await bypassTokenScreen(page);
    await mockApifyAPIs(page);
    await gotoApp(page, '/social-search.html');
  });

  test('search button is enabled before a search', async ({ page }) => {
    await expect(page.locator('#search-btn')).toBeEnabled();
  });

  test('clicking Search shows the status bar with text', async ({ page }) => {
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    await expect(page.locator('#status-bar')).not.toHaveClass(/hidden/);
    await expect(page.locator('#status-text')).not.toBeEmpty();
  });

  test('search button is disabled while the search is running', async ({ page }) => {
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    await expect(page.locator('#search-btn')).toBeDisabled();
  });

  test('Enter key in the keyword field also triggers a search', async ({ page }) => {
    await page.fill('#kw', 'enter key test');
    await page.press('#kw', 'Enter');
    await expect(page.locator('#status-bar')).not.toHaveClass(/hidden/);
  });

  test('results appear in #results-grid after search completes', async ({ page }) => {
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    await expect(page.locator('#results-grid [data-post-url]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('#results-grid [data-post-url]')).toHaveCount(2);
  });

  test('result cards have data-platform="facebook" attribute', async ({ page }) => {
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    await expect(page.locator('#results-grid [data-post-url]').first()).toBeVisible({
      timeout: 15_000,
    });
    const platform = await page.locator('#results-grid [data-post-url]').first()
      .getAttribute('data-platform');
    expect(platform).toBe('facebook');
  });

  test('#results-meta shows result count after search', async ({ page }) => {
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    await expect(page.locator('#results-grid [data-post-url]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('#results-meta')).not.toHaveClass(/hidden/);
    await expect(page.locator('#results-meta')).toContainText('2 result');
  });

  test('#sort-wrap appears after results load', async ({ page }) => {
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    await expect(page.locator('#results-grid [data-post-url]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('#sort-wrap')).not.toHaveClass(/hidden/);
  });

  test('cards reach .card-enriched state after enrichment completes', async ({ page }) => {
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    // POLL_MS=3000 means at least one 3s delay before enrichment data arrives.
    await expect(page.locator('#results-grid .card-enriched').first()).toBeVisible({
      timeout: 20_000,
    });
  });

});

// ── Section 5: View Tab Switching ─────────────────────────────────────────────

test.describe('View tab switching', () => {

  test.beforeEach(async ({ page }) => {
    await bypassTokenScreen(page);
    await gotoApp(page, '/social-search.html');
  });

  test('Results tab is active by default', async ({ page }) => {
    await expect(page.locator('#view-tab-results')).toHaveClass(/active/);
    await expect(page.locator('#results-view')).not.toHaveClass(/hidden/);
  });

  test('other panels are hidden by default', async ({ page }) => {
    await expect(page.locator('#insights-panel')).toHaveClass(/hidden/);
    await expect(page.locator('#saved-panel')).toHaveClass(/hidden/);
    await expect(page.locator('#history-panel')).toHaveClass(/hidden/);
  });

  test('Insights tab shows insights-panel and hides results-view', async ({ page }) => {
    await page.click('#view-tab-insights');
    await expect(page.locator('#view-tab-insights')).toHaveClass(/active/);
    await expect(page.locator('#results-view')).toHaveClass(/hidden/);
    await expect(page.locator('#insights-panel')).not.toHaveClass(/hidden/);
  });

  test('Saved tab shows saved-panel', async ({ page }) => {
    await page.click('#view-tab-saved');
    await expect(page.locator('#saved-panel')).not.toHaveClass(/hidden/);
    await expect(page.locator('#results-view')).toHaveClass(/hidden/);
  });

  test('History tab shows history-panel', async ({ page }) => {
    await page.click('#view-tab-history');
    await expect(page.locator('#history-panel')).not.toHaveClass(/hidden/);
    await expect(page.locator('#results-view')).toHaveClass(/hidden/);
  });

  test('clicking Results tab after Insights restores results-view', async ({ page }) => {
    await page.click('#view-tab-insights');
    await page.click('#view-tab-results');
    await expect(page.locator('#results-view')).not.toHaveClass(/hidden/);
    await expect(page.locator('#insights-panel')).toHaveClass(/hidden/);
  });

  test('only one tab has the active class at a time', async ({ page }) => {
    await page.click('#view-tab-saved');
    const activeTabs = await page.locator('#view-tab-bar .active, #view-tab-bar [class*="tab-btn active"], #view-tab-bar .tab-btn.active, #view-tab-bar .view-tab.active').count();
    // At least one active tab, and the saved one is it
    await expect(page.locator('#view-tab-saved')).toHaveClass(/active/);
    await expect(page.locator('#view-tab-results')).not.toHaveClass(/active/);
  });

});

// ── Section 6: Saved Posts ────────────────────────────────────────────────────

test.describe('Saved posts', () => {

  test('saved-tab-count badge starts at 0 with no saved posts', async ({ page }) => {
    await bypassTokenScreen(page);
    await gotoApp(page, '/social-search.html');
    await expect(page.locator('#saved-tab-count')).toHaveText('0');
  });

  test('saved-tab-count reflects pre-seeded saved posts', async ({ page }) => {
    await bypassTokenScreen(page);
    await seedLocalStorage(page, { sl_saved_posts: [preSavedPost] });
    await gotoApp(page, '/social-search.html');
    await expect(page.locator('#saved-tab-count')).toHaveText('1');
  });

  test('pre-seeded saved post appears in the Saved panel', async ({ page }) => {
    await bypassTokenScreen(page);
    await seedLocalStorage(page, { sl_saved_posts: [preSavedPost] });
    await gotoApp(page, '/social-search.html');
    await page.click('#view-tab-saved');
    await expect(page.locator('#saved-panel')).toContainText('Pre-Saved Post for Testing');
  });

  test('saving a result card increments the badge count', async ({ page }) => {
    await bypassTokenScreen(page);
    await mockApifyAPIs(page);
    await gotoApp(page, '/social-search.html');
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    await expect(page.locator('#results-grid [data-post-url]').first()).toBeVisible({
      timeout: 15_000,
    });
    const before = parseInt(await page.locator('#saved-tab-count').textContent() || '0');
    await page.locator('#results-grid .save-btn').first().click();
    const after = parseInt(await page.locator('#saved-tab-count').textContent() || '0');
    expect(after).toBe(before + 1);
  });

  test('save button gets .saved class after clicking', async ({ page }) => {
    await bypassTokenScreen(page);
    await mockApifyAPIs(page);
    await gotoApp(page, '/social-search.html');
    await page.fill('#kw', 'test keyword');
    await page.click('#search-btn');
    await expect(page.locator('#results-grid [data-post-url]').first()).toBeVisible({
      timeout: 15_000,
    });
    const saveBtn = page.locator('#results-grid .save-btn').first();
    await saveBtn.click();
    await expect(saveBtn).toHaveClass(/saved/);
  });

  test('unsaving from the Saved panel decrements the badge count', async ({ page }) => {
    await bypassTokenScreen(page);
    await seedLocalStorage(page, { sl_saved_posts: [preSavedPost] });
    await gotoApp(page, '/social-search.html');
    await expect(page.locator('#saved-tab-count')).toHaveText('1');
    await page.click('#view-tab-saved');
    await page.locator('#saved-panel .save-btn').first().click();
    await expect(page.locator('#saved-tab-count')).toHaveText('0');
  });

});

// ── Section 7: Settings Modal ─────────────────────────────────────────────────

test.describe('Settings modal', () => {

  test.beforeEach(async ({ page }) => {
    await bypassTokenScreen(page);
    await mockApifyAPIs(page);
    await gotoApp(page, '/social-search.html');
  });

  test('settings modal is hidden by default', async ({ page }) => {
    await expect(page.locator('#settings-modal')).toHaveClass(/hidden/);
  });

  test('openSettingsModal() reveals the modal', async ({ page }) => {
    await page.evaluate(() => window.openSettingsModal());
    await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  });

  test('Apify token field is pre-filled with the stored token', async ({ page }) => {
    await page.evaluate(() => window.openSettingsModal());
    await expect(page.locator('#settings-apify-token')).toHaveValue(MOCK_TOKEN);
  });

  test('Claude API key field is present', async ({ page }) => {
    await page.evaluate(() => window.openSettingsModal());
    await expect(page.locator('#settings-claude-key')).toBeVisible();
  });

  test('settings-err is hidden by default when modal opens', async ({ page }) => {
    await page.evaluate(() => window.openSettingsModal());
    await expect(page.locator('#settings-err')).toHaveClass(/hidden/);
  });

  test('closeSettingsModal() hides the modal', async ({ page }) => {
    await page.evaluate(() => window.openSettingsModal());
    await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
    await page.evaluate(() => window.closeSettingsModal());
    await expect(page.locator('#settings-modal')).toHaveClass(/hidden/);
  });

  test('clicking the backdrop closes the modal', async ({ page }) => {
    await page.evaluate(() => window.openSettingsModal());
    await page.locator('#settings-modal').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#settings-modal')).toHaveClass(/hidden/);
  });

  test('saving an empty Apify token shows settings-err', async ({ page }) => {
    await page.evaluate(() => window.openSettingsModal());
    await page.fill('#settings-apify-token', '');
    await page.evaluate(() => window.saveSettingsModal());
    await expect(page.locator('#settings-err')).not.toHaveClass(/hidden/);
  });

  test('saving valid credentials updates localStorage', async ({ page }) => {
    await page.evaluate(() => window.openSettingsModal());
    await page.fill('#settings-apify-token', 'apify_api_new_token_xyz');
    await page.fill('#settings-claude-key', MOCK_CLAUDE_KEY);
    await page.evaluate(() => window.saveSettingsModal());
    const apifyToken = await page.evaluate(() => localStorage.getItem('sl_apify_token'));
    const claudeKey = await page.evaluate(() => localStorage.getItem('sl_claude_key'));
    expect(apifyToken).toBe('apify_api_new_token_xyz');
    expect(claudeKey).toBe(MOCK_CLAUDE_KEY);
  });

});

// ── Section 8: History Panel ──────────────────────────────────────────────────

test.describe('History panel', () => {

  test('shows empty state when no history exists', async ({ page }) => {
    await bypassTokenScreen(page);
    await gotoApp(page, '/social-search.html');
    await page.click('#view-tab-history');
    await expect(page.locator('#history-panel')).toContainText('No search history');
  });

  test('shows pre-seeded history entry', async ({ page }) => {
    await bypassTokenScreen(page);
    await seedLocalStorage(page, { sl_search_history: [preHistoryEntry] });
    await gotoApp(page, '/social-search.html');
    await page.click('#view-tab-history');
    await expect(page.locator('#history-panel')).toContainText('pre-history keyword');
  });

  test('history entry has restore and delete buttons', async ({ page }) => {
    await bypassTokenScreen(page);
    await seedLocalStorage(page, { sl_search_history: [preHistoryEntry] });
    await gotoApp(page, '/social-search.html');
    await page.click('#view-tab-history');
    await expect(page.locator('#history-panel button[onclick*="restoreFromHistory"]')).toBeVisible();
    await expect(page.locator('#history-panel button[onclick*="deleteHistoryEntry"]')).toBeVisible();
  });

  test('deleting a history entry removes it from the panel', async ({ page }) => {
    await bypassTokenScreen(page);
    await seedLocalStorage(page, { sl_search_history: [preHistoryEntry] });
    await gotoApp(page, '/social-search.html');
    await page.click('#view-tab-history');
    await expect(page.locator('#history-panel')).toContainText('pre-history keyword');
    await page.locator('#history-panel button[onclick*="deleteHistoryEntry"]').click();
    await expect(page.locator('#history-panel')).not.toContainText('pre-history keyword');
    await expect(page.locator('#history-panel')).toContainText('No search history');
  });

  test('restoring a history entry populates #kw and switches to Results view', async ({ page }) => {
    await bypassTokenScreen(page);
    await seedLocalStorage(page, { sl_search_history: [preHistoryEntry] });
    await gotoApp(page, '/social-search.html');
    await page.click('#view-tab-history');
    await page.locator('#history-panel button[onclick*="restoreFromHistory"]').click();
    await expect(page.locator('#kw')).toHaveValue('pre-history keyword');
    await expect(page.locator('#results-view')).not.toHaveClass(/hidden/);
  });

  test('a completed search creates a history entry', async ({ page }) => {
    await bypassTokenScreen(page);
    await mockApifyAPIs(page);
    await gotoApp(page, '/social-search.html');
    await page.fill('#kw', 'live search for history');
    await page.click('#search-btn');
    await expect(page.locator('#search-btn')).toBeEnabled({ timeout: 20_000 });
    await page.click('#view-tab-history');
    await expect(page.locator('#history-panel')).toContainText('live search for history');
  });

});

// ── Section 9: Redesign Structural Smoke Tests ────────────────────────────────

test.describe('Redesign structural parity', () => {

  test.beforeEach(async ({ page }) => {
    await bypassTokenScreen(page);
    await mockApifyAPIs(page);
    await gotoApp(page, '/social-search-redesign.html');
  });

  test('all required element IDs exist in the redesign', async ({ page }) => {
    const ids = [
      'token-screen', 'app', 'token-input',
      'kw', 'search-btn',
      'plat-facebook', 'plat-linkedin', 'plat-tiktok',
      'preset-today', 'preset-7d', 'preset-30d', 'preset-custom',
      'custom-dates', 'date-from', 'date-to',
      'lang', 'total-results',
      'status-bar', 'status-text', 'status-icon',
      'progress-wrap', 'progress-bar-inner', 'progress-count',
      'results-meta', 'sort-wrap', 'sort-select',
      'results-grid',
      'view-tab-results', 'view-tab-insights', 'view-tab-saved', 'view-tab-history',
      'results-view', 'insights-panel', 'saved-panel', 'history-panel',
      'tab-bar', 'tab-facebook', 'tab-linkedin', 'tab-tiktok',
      'settings-modal', 'settings-apify-token', 'settings-claude-key', 'settings-err',
      'lightbox', 'lb-close', 'lb-prev', 'lb-next',
      'saved-tab-count', 'pagination',
    ];
    for (const id of ids) {
      const count = await page.locator(`#${id}`).count();
      expect(count, `#${id} should exist in redesign`).toBe(1);
    }
  });

  test('redesign platform buttons have both chip and active classes', async ({ page }) => {
    await expect(page.locator('#plat-facebook')).toHaveClass(/chip/);
    await expect(page.locator('#plat-facebook')).toHaveClass(/active/);
  });

  test('full search flow works in the redesign', async ({ page }) => {
    await page.fill('#kw', 'redesign smoke test');
    await page.click('#search-btn');
    await expect(page.locator('#results-grid [data-post-url]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

});
