#!/usr/bin/env node
// Publish a blog post to ActivityPub via /ap/publish
//
// Usage:
//   node scripts/ap-post.mjs --url "https://blog.unratified.org/2026-03-06-icescr-enforcement..."
//   node scripts/ap-post.mjs --dry-run --url "..."
//
// Reads AP_PUBLISH_TOKEN and AP_BASE_URL from .dev.vars or environment.

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// Load .dev.vars
const devVarsPath = join(__dir, '..', '.dev.vars');
const env = {};
if (existsSync(devVarsPath)) {
  for (const line of readFileSync(devVarsPath, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1 || line.startsWith('#')) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

const AP_BASE_URL = process.env.AP_BASE_URL ?? env.AP_BASE_URL ?? 'https://unratified.org';
const AP_PUBLISH_TOKEN = process.env.AP_PUBLISH_TOKEN ?? env.AP_PUBLISH_TOKEN;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const urlIdx = args.indexOf('--url');
const postUrl = urlIdx !== -1 ? args[urlIdx + 1] : null;

if (!postUrl) {
  console.error('Usage: node scripts/ap-post.mjs --url "https://blog.unratified.org/..."');
  process.exit(1);
}

if (!AP_PUBLISH_TOKEN && !dryRun) {
  console.error('AP_PUBLISH_TOKEN not set. Add to .dev.vars or set in environment.');
  process.exit(1);
}

// Fetch the blog post page and extract metadata from og: tags
async function fetchPostMeta(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'unratified-ap-bot/1.0' } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  const html = await res.text();

  // Match content="..." or content='...' — same quote closes
  const contentOf = (attrStr) => {
    const m = attrStr.match(/content="([^"]*)"/) ?? attrStr.match(/content='([^']*)'/);
    return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&apos;/g, "'") : null;
  };

  const meta = (property) => {
    const m = html.match(new RegExp(`<meta([^>]+property=["']${property}["'][^>]*)>`, 'i'))
      ?? html.match(new RegExp(`<meta([^>]*property=["']${property}["'][^>]*)\/?>`, 'i'));
    return m ? contentOf(m[1]) : null;
  };

  const tag = (name) => {
    const m = html.match(new RegExp(`<meta([^>]+name=["']${name}["'][^>]*)>`, 'i'))
      ?? html.match(new RegExp(`<meta([^>]*name=["']${name}["'][^>]*)\/?>`, 'i'));
    return m ? contentOf(m[1]) : null;
  };

  const rawTitle = meta('og:title') ?? tag('title') ?? 'Untitled';
  const title = rawTitle.replace(/ \| blog\.unratified\.org$/, '').replace(/ \| unratified\.org$/, '').trim();
  const description = meta('og:description') ?? tag('description') ?? '';
  const published = meta('article:published_time') ?? new Date().toISOString();

  // Extract keywords for hashtags
  const keywords = tag('keywords') ?? '';
  const tags = keywords
    .split(',')
    .map((k) => k.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, ''))
    .filter((k) => k.length > 0 && k.length < 30)
    .slice(0, 5);

  return { title, description, published, tags };
}

const meta = await fetchPostMeta(postUrl);

const payload = {
  actor: 'blog',
  post: {
    id: postUrl,
    title: meta.title,
    summary: meta.description,
    url: postUrl,
    published: meta.published,
    tags: ['ICESCR', 'HumanRights', 'RatifyICESCR', ...meta.tags],
  },
};

console.log('Payload:');
console.log(JSON.stringify(payload, null, 2));

if (dryRun) {
  console.log('\n--dry-run: skipping publish');
  process.exit(0);
}

const res = await fetch(`${AP_BASE_URL}/ap/publish`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AP_PUBLISH_TOKEN}`,
  },
  body: JSON.stringify(payload),
});

const result = await res.text();
console.log(`\nResponse ${res.status}:`);
console.log(result);
