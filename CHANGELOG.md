# Changelog

## v1.5.0 — 2026-04-22

### Added
- **GitHub Pages support**: Added `index.html` as a copy of `social-search.html` so the app is served automatically at `https://infinaqnhat.github.io/social-listening-tool/`.

### Removed
- **Unused files**: Removed `fb-search.html`, `hello-world.html`, `proxy.js`, and `serve.sh`.

---

## v1.4.0 — 2026-04-22

### Added
- **TikTok search platform** (`social-search.html`): New `♪ TikTok` platform button alongside Facebook and LinkedIn. Uses Google Search scraper with `site:tiktok.com` and filters for valid video URLs (`/@user/video/ID` format).
- **TikTok engagement enrichment** (`social-search.html`): After search, automatically enriches results with likes, comments, shares, and play count via the `api-ninja/tiktok-data-scraper` Apify actor.
- **Inline TikTok video playback** (`social-search.html`): Each TikTok card has a "▶ Play video" button. After enrichment, clicking it plays the direct CDN MP4 video inline in the card (with poster frame and browser controls). Falls back to TikTok oEmbed if the card has not yet been enriched.
- **TikTok in Top Engagement sort** (`social-search.html`): Switching to "🏆 Top Engagement" mode now correctly triggers enrichment for TikTok results, consistent with Facebook and LinkedIn behaviour.
- **TikTok cache support** (`social-search.html`): TikTok results are cached under a separate `tt_cache` key with the same 30-minute TTL as other platforms.

### Fixed
- **Save post on TikTok** (`social-search.html`): The bookmark button on TikTok result cards was silently doing nothing because the post lookup only searched Facebook and LinkedIn results. Now searches all three platforms.
- **Cache check short-circuit** (`social-search.html`): The cache-hit logic used `platform !== 'linkedin'` / `platform !== 'facebook'` guards, which could cause a TikTok search to exit early if Facebook and LinkedIn caches both existed for the same keyword. Rewritten to explicit per-platform checks.

---

## v1.3.1 — 2026-04-20

### Fixed
- **Apify Credit Usage display** (`social-search.html`): Corrected field name from `totalUsageCreditsUsd` to `totalUsageCreditsUsdAfterVolumeDiscount` so the actual monthly spend is shown correctly.
- **Search History buttons** (`social-search.html`): Restore, Delete, and Clear all buttons were silently failing because the handler functions were not exposed to `window`. All three are now registered and work correctly.

---

## v1.3.0 — 2026-04-20

### Added
- **Search History tab** (`social-search.html`): New `🕐 History` tab alongside Results / Insights / Saved. Automatically saves up to 20 completed searches (keyword, platform, date range, language, full results). Each entry can be restored instantly without re-running the Apify actors, or deleted individually. A "Clear all" button wipes the full history.

---

## v1.2.0 — 2026-04-20

### Added
- **Apify Credit Usage** (`social-search.html`): Settings modal now shows a live credit usage section — credits used vs. plan limit, a colour-coded progress bar (blue → yellow → red), remaining credits, and the current billing cycle dates. Fetched from the Apify API each time the settings modal is opened.

---

## v1.1.0 — 2026-04-20

### Changed
- **Save button visibility** (`social-search.html`): Increased default opacity from `0.3` to `0.7` so the bookmark icon is clearly visible at all times.
- **Save button color** (`social-search.html`): Changed default icon color to match the post title color (`#111827` / gray-900). Button turns blue on hover and stays blue when a post is saved.

---

## v1.0.0 — Initial release

- Social search UI (`social-search.html`) with LinkedIn and Facebook post search, filters, pagination, and saved posts.
- Facebook search page (`fb-search.html`).
- Proxy server (`proxy.js`) and dev server script (`serve.sh`).


### Fixed
- **Apify Credit Usage display** (`social-search.html`): Corrected field name from `totalUsageCreditsUsd` to `totalUsageCreditsUsdAfterVolumeDiscount` so the actual monthly spend is shown correctly.
- **Search History buttons** (`social-search.html`): Restore, Delete, and Clear all buttons were silently failing because the handler functions were not exposed to `window`. All three are now registered and work correctly.

---

## v1.3.0 — 2026-04-20

### Added
- **Search History tab** (`social-search.html`): New `🕐 History` tab alongside Results / Insights / Saved. Automatically saves up to 20 completed searches (keyword, platform, date range, language, full results). Each entry can be restored instantly without re-running the Apify actors, or deleted individually. A "Clear all" button wipes the full history.

---

## v1.2.0 — 2026-04-20

### Added
- **Apify Credit Usage** (`social-search.html`): Settings modal now shows a live credit usage section — credits used vs. plan limit, a colour-coded progress bar (blue → yellow → red), remaining credits, and the current billing cycle dates. Fetched from the Apify API each time the settings modal is opened.

---

## v1.1.0 — 2026-04-20

### Changed
- **Save button visibility** (`social-search.html`): Increased default opacity from `0.3` to `0.7` so the bookmark icon is clearly visible at all times.
- **Save button color** (`social-search.html`): Changed default icon color to match the post title color (`#111827` / gray-900). Button turns blue on hover and stays blue when a post is saved.

---

## v1.0.0 — Initial release

- Social search UI (`social-search.html`) with LinkedIn and Facebook post search, filters, pagination, and saved posts.
- Facebook search page (`fb-search.html`).
- Proxy server (`proxy.js`) and dev server script (`serve.sh`).
