export const HEALTH_ENDPOINTS = [
  { url: 'https://unratified.org', label: 'main' },
  { url: 'https://blog.unratified.org', label: 'blog' },
  { url: 'https://observatory.unratified.org', label: 'observatory' },
  { url: 'https://observatory.unratified.org/api/v1/signals', label: 'observatory-api' },
] as const;

export const CONTENT_CHECKS = [
  {
    url: 'https://unratified.org',
    checkType: 'text_present' as const,
    expected: 'Human Rights; Nothing More, Nothing Less.',
    label: 'main-tagline',
  },
  {
    url: 'https://blog.unratified.org',
    checkType: 'text_present' as const,
    expected: 'Unratified Blog',
    label: 'blog-title',
  },
  {
    url: 'https://observatory.unratified.org/api/v1/signals',
    checkType: 'json_valid' as const,
    expected: 'signals',
    label: 'observatory-api-json',
  },
] as const;

export const SITEMAP_CHECKS = [
  {
    url: 'https://unratified.org/sitemap-index.xml',
    minimumPages: 45,
    label: 'main-sitemap',
  },
  {
    url: 'https://blog.unratified.org/sitemap-index.xml',
    minimumPages: 15,
    label: 'blog-sitemap',
  },
] as const;

export const THRESHOLDS = {
  responseTimeWarningMs: 3000,
  responseTimeCriticalMs: 10000,
  alertCooldownHours: 4,
} as const;
