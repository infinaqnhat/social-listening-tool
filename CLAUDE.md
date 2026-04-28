# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A fully client-side social media listening tool — a single HTML file served as a static page (GitHub Pages: `https://infinaqnhat.github.io/social-listening-tool/`). There is no build step, no package manager, no server, and no test suite. All logic runs in the browser.

## Files

| File | Purpose |
|---|---|
| `social-search.html` | Main application (canonical source) |
| `index.html` | Copy of `social-search.html` for GitHub Pages — always kept in sync |
| `social-search-redesign.html` | Alternate visual redesign (Google Trends aesthetic); same JS, different HTML/CSS |
| `CHANGELOG.md` | Version history |

**When making functional changes**, edit `social-search.html`. Then copy it to `index.html` to keep GitHub Pages in sync. Changes to the redesign file only are purely visual.

## Development

Open `social-search.html` directly in a browser — no server needed. The file uses `<script type="module">` with ESM imports from CDN (`https://esm.sh/@anthropic-ai/sdk`), so it must be served over HTTP/HTTPS for module imports to work (CORS). Use any static server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080/social-search.html`. You'll need a real Apify API token to trigger searches — the token is stored in `localStorage` (`sl_apify_token`).

## Architecture

The entire app lives inside a single `<script type="module">` block at the bottom of `social-search.html` (~3400 lines). There are no imports from local files. Sections are delimited by `// ── SECTION NAME ──` comments.

### State

One mutable `state` object holds all runtime state:

```js
state.platforms        // Set<string> — active platforms ('facebook', 'linkedin', 'tiktok')
state.activeTab        // which platform tab is shown when 2+ platforms are selected
state.allResults       // Facebook results array
state.liResults        // LinkedIn results array
state.ttResults        // TikTok results array
state.enrichMap        // { url → enriched data } for Facebook
state.liEnrichMap      // same for LinkedIn
state.enrichedPages    // Set of page numbers whose FB enrichment completed
state.liEnrichedPages  // same for LinkedIn
state.ttEnrichedPages  // same for TikTok
state.sortMode         // 'default' | 'engagement'
state.insightsView     // 'results' | 'insights' | 'saved' | 'history'
```

Each result object has a `state` field: `'skeleton' | 'pending' | 'enriched' | 'failed'`.

### Search flow

`doSearch()` fires platform searches in parallel:
1. Checks `localStorage` cache (30-min TTL, keyed by keyword + filters + platform).
2. Calls `runGoogleSearch()` for each active platform — streams results page-by-page as Apify dataset items arrive.
3. Facebook results go through `apify/facebook-posts-scraper` for enrichment (`enrichCurrentPage` / `enrichAllForEngagement`).
4. LinkedIn uses `apify/linkedin-post-search-scraper`.
5. TikTok uses `api-ninja/tiktok-data-scraper`.
6. All three run via `startActor` → `waitForRun` → `fetchDatasetItems` (polling every 3 s).

### URL matching (Facebook)

`matchEnrichItem()` uses four fallback levels to match scraped data back to search results: L1 normalised URL, L2 FB post key (pfbid / numeric ID), L3 page+type context (unambiguous single candidate), L4 text similarity (NFC-normalised Vietnamese-safe substring match). This is the most fragile part of the codebase — be careful when touching URL normalisation.

### Enrichment

Per-page lazy enrichment runs automatically when a page is rendered (`enrichCurrentPage`). Full-run enrichment for all pages is triggered by switching to "Top Engagement" sort mode (`enrichAllForEngagement`). The `engagementEnrichingFb/Li/Tt` flags prevent the per-page enrichment from cancelling a running full enrichment.

### Insights (Claude AI)

`callClaudeForInsights()` sends all enriched post titles + engagement numbers to Claude (`claude-sonnet-4-6` via `@anthropic-ai/sdk`) and receives structured JSON with topics, content suggestions, and sentiment. The Claude API key is stored in `localStorage` (`sl_claude_key`) and is optional.

### Saved posts & folders

Saved posts are stored in `localStorage` (`sl_saved_posts`) as an array of `{ url, title, platform, folder, ... }`. Folders are derived dynamically from `getSavedPosts()` via `getFolders()`. `renderSavedPanel()` re-renders the full saved panel on any change — there is no partial DOM update for saved cards.

### window.* exports

Because the script is a `type="module"`, inline `onclick=` attributes cannot see module-scope functions. Every function called from HTML attributes is explicitly exported at the bottom of the script:

```js
window.doSearch = doSearch;
window.togglePlatform = togglePlatform;
// etc.
```

**Always add a `window.*` export when adding a new function called from an HTML attribute.**

## Branch conventions

- `main` — production (GitHub Pages serves from here)
- Feature work happens on named branches; merge to `main` only after user confirmation
- `index.html` must be kept in sync with `social-search.html` whenever merging to `main`
- Update `CHANGELOG.md` on both the feature branch and `main` after each merge
