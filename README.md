# Social Listening Tool

A lightweight, browser-based social media search and monitoring tool. Search Facebook, LinkedIn, and TikTok posts in one place — powered by [Apify](https://apify.com) scrapers and optionally Claude AI for insights.

## Features

- **Multi-platform search** — Search Facebook, LinkedIn, and TikTok simultaneously or individually
- **Engagement metrics** — Automatically enriches results with likes, comments, shares, and views
- **TikTok video playback** — Play TikTok videos inline directly on the result card
- **AI Insights** — Generate topic analysis and content title suggestions using Claude AI (optional)
- **Search History** — Automatically saves the last 20 searches; restore any past search instantly without re-fetching
- **Save posts** — Bookmark posts for later review; export saved posts as Excel or JSON
- **Date filters** — Filter results by today, last 7 days, last 30 days, or a custom date range
- **Sort by engagement** — Re-rank results by total engagement across all platforms
- **Apify credit usage** — Live credit usage display in the settings modal so your team always knows the current spend

## Requirements

- An [Apify](https://apify.com) account and API token (for running search and enrichment actors)
- A Claude API key from [Anthropic](https://console.anthropic.com) (optional — only needed for the Insights tab)

## Usage

1. Open `index.html` (or visit the [GitHub Pages URL](https://infinaqnhat.github.io/social-listening-tool/)) in your browser
2. Enter your Apify API token when prompted (stored locally in your browser — never sent anywhere except Apify)
3. Type a keyword, select a platform, choose a date range, and click **Search**
4. Engagement data loads automatically in the background
5. Open **Settings** (⚙️) to add a Claude API key and view Apify credit usage

## Apify Actors Used

| Platform | Search | Enrichment |
|---|---|---|
| Facebook | `apify/google-search-scraper` | `apify/facebook-posts-scraper` |
| LinkedIn | `apify/google-search-scraper` | `apify/linkedin-post-search-scraper` |
| TikTok | `apify/google-search-scraper` | `api-ninja/tiktok-data-scraper` |

## Privacy

All API tokens and search data are stored only in your browser's `localStorage`. Nothing is sent to any server other than Apify and Anthropic directly from your browser.
