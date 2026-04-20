# Changelog

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
