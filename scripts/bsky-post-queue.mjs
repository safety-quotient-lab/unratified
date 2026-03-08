#!/usr/bin/env node
/**
 * bsky-post-queue.mjs
 *
 * Posts a queue of pre-written posts with a configurable delay between each.
 * Usage:
 *   node scripts/bsky-post-queue.mjs [--dry-run] [--delay-minutes N]
 */
import { AtpAgent, RichText } from '@atproto/api';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(new URL('.', import.meta.url).pathname, '..', '.dev.vars');
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

// Queue is empty — posts 6–10 already sent Mar 6, posts 13–14 sent Mar 7.
// Add new posts here before running. Use bsky-post.mjs for one-off posts.
const QUEUE = [];

const LABELS = [];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const delayArg = process.argv.indexOf('--delay-minutes');
  const delayMinutes = delayArg !== -1 ? parseInt(process.argv[delayArg + 1], 10) : 3;
  const delayMs = delayMinutes * 60 * 1000;

  const env = loadEnv();
  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: env.BSKY_HANDLE, password: env.BSKY_PASSWORD });
  console.log(`Authenticated as ${env.BSKY_HANDLE}\n`);

  // Pre-flight: verify all grapheme counts
  console.log('=== Grapheme check ===');
  for (let i = 0; i < QUEUE.length; i++) {
    const rt = new RichText({ text: QUEUE[i] });
    await rt.detectFacets(agent);
    const g = rt.graphemeLength;
    const ok = g <= 300 ? '✓' : '✗ OVER';
    console.log(`[${LABELS[i]}] ${g} graphemes ${ok}`);
    if (g > 300 && !dryRun) {
      console.error('Aborting — fix the post above before running.');
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log('\n[dry-run] would post all. Run without --dry-run to execute.');
    return;
  }

  console.log(`\nPosting with ${delayMinutes}-minute gaps...\n`);

  for (let i = 0; i < QUEUE.length; i++) {
    const rt = new RichText({ text: QUEUE[i] });
    await rt.detectFacets(agent);
    const res = await agent.post({
      $type: 'app.bsky.feed.post',
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });
    console.log(`✓ ${LABELS[i]} → ${res.uri}`);

    if (i < QUEUE.length - 1) {
      const waitUntil = new Date(Date.now() + delayMs);
      console.log(`  Next post at ${waitUntil.toLocaleTimeString()}...`);
      await sleep(delayMs);
    }
  }

  console.log('\nDone. All posts published.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
