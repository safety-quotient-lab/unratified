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

const QUEUE = [
  // Post 6 — The Transparency Card
  `Every post on unratified.org links to its source file and full git revision history.

An AI agent wrote the analysis. A human reviewed it. Every correction and editorial decision — all visible.

If you can't show your work, you can't earn trust.

blog.unratified.org

#OpenSource #AITransparency`,

  // Post 7 — The Reframe
  `"The Senate has ignored this treaty for 49 years."

Reframe: the Senate has never voted because no constituency demanded it.

Most Americans don't know this treaty exists. Each letter changes that.

Your senator has probably never received one.

unratified.org/action/

#RatifyICESCR #humanrights`,

  // Post 8 — The Cross-Partisan Play
  `ICESCR crosses partisan lines.

Conservatives: stability, property rights, self-determination.
Progressives: labor rights, healthcare, educational equity.

Both. The treaty protects both.

Not left vs. right — binding vs. no framework.

unratified.org/action/why-act/

#RatifyICESCR #humanrights`,

  // Post 9 — The Methodology Post
  `Seven AI-economics hypotheses. One discriminator. One surviving composite model.

It makes the strongest case for a 1966 UN treaty most Americans have never heard of.

Full methodology, open data, every inference marked.

blog.unratified.org/2026-03-03-recursive-methodology/

#AI #RatifyICESCR`,

  // Post 10 — The Soft CTA
  `Five minutes. Your senator. 173 nations.

The ICESCR protects the right to work, health, education, and an adequate standard of living. The U.S. signed it in 1977 and never ratified.

Template letters, talking points, senator contact info — all at:

unratified.org/action/

#RatifyICESCR #humanrights`,
];

const LABELS = ['Post 6', 'Post 7', 'Post 8', 'Post 9', 'Post 10'];

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
