// Mock Apify API response shapes for Playwright tests.
// No real API token or credits are used — all HTTP calls are intercepted.

export const MOCK_TOKEN = 'apify_api_test_token_abc123';
export const MOCK_CLAUDE_KEY = 'sk-ant-test-key-123';

// ── Actor run start responses ─────────────────────────────────────────────────

export const googleRunResponse = {
  data: {
    id: 'run-google-abc',
    defaultDatasetId: 'dataset-google-abc',
    status: 'RUNNING',
  },
};

export const fbEnrichRunResponse = {
  data: {
    id: 'run-fb-enrich-abc',
    defaultDatasetId: 'dataset-fb-enrich-abc',
    status: 'RUNNING',
  },
};

// ── Run status (polling) ──────────────────────────────────────────────────────

export const runStatusSucceeded = { data: { status: 'SUCCEEDED' } };

// ── Google scraper dataset items ──────────────────────────────────────────────
// The app processes item.organicResults || item.organic for each dataset item.
// filterFb requires: url.includes('facebook.com') && not ads/l.facebook

export const googleSearchItems = [
  {
    organicResults: [
      {
        url: 'https://www.facebook.com/TestPage/posts/111000111',
        title: 'Test Post Alpha from TestPage',
        description: 'Alpha post text content for testing purposes.',
      },
      {
        url: 'https://www.facebook.com/AnotherPage/posts/222000222',
        title: 'Test Post Beta from AnotherPage',
        description: 'Beta post text content for testing purposes.',
      },
    ],
  },
];

// ── Facebook enrichment dataset items ────────────────────────────────────────
// Returned by apify/facebook-posts-scraper — matched back to search results.

export const fbEnrichItems = [
  {
    url: 'https://www.facebook.com/TestPage/posts/111000111',
    likes: 150,
    comments: 23,
    shares: 8,
    text: 'Alpha post text content for testing purposes.',
    media: [],
  },
  {
    url: 'https://www.facebook.com/AnotherPage/posts/222000222',
    likes: 42,
    comments: 7,
    shares: 2,
    text: 'Beta post text content for testing purposes.',
    media: [],
  },
];

// ── Apify usage response ──────────────────────────────────────────────────────
// The app calls GET /v2/users/me/limits (NOT /usage/monthly).

export const apifyUsageResponse = {
  data: {
    limits: { maxMonthlyUsageUsd: 49.0 },
    current: { monthlyUsageUsd: 3.27 },
    monthlyUsageCycle: {
      startAt: '2026-04-01T00:00:00.000Z',
      endAt: '2026-04-30T23:59:59.999Z',
    },
  },
};

// ── Pre-seeded localStorage state ─────────────────────────────────────────────

export const preSavedPost = {
  url: 'https://www.facebook.com/PreSavedPage/posts/999000999',
  title: 'Pre-Saved Post for Testing',
  content: 'Pre-saved content.',
  likes: 88,
  comments: 12,
  shares: 3,
  platform: 'facebook',
  folder: 'Uncategorized',
  savedAt: '2026-04-01T10:00:00.000Z',
};

export const preHistoryEntry = {
  id: 1743480000000,
  keyword: 'pre-history keyword',
  platforms: ['facebook'],
  dateFrom: null,
  dateTo: null,
  lang: 'vi',
  totalResults: 10,
  timestamp: '2026-04-01T10:00:00.000Z',
  allResults: [
    {
      id: 'g-0-https://www.facebook.com/HistoryPage/posts/000111',
      url: 'https://www.facebook.com/HistoryPage/posts/000111',
      title: 'History Test Post',
      content: 'History post content.',
      platform: 'facebook',
      state: 'pending',
    },
  ],
  liResults: [],
  ttResults: [],
};
