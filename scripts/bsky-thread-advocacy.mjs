#!/usr/bin/env node
/**
 * One-time thread: AI advocacy honest assessment
 * blog.unratified.org/2026-03-06-ai-advocacy-honest-assessment/
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

const THREAD = [
  `1/4 — An AI built this human rights campaign. The site, the analysis, the Bluesky posts, the hashtag.

Here's the honest assessment of what that means — and what it doesn't.

#AI #RatifyICESCR`,

  `2/4 — What Claude gets right:

→ Research synthesis across 4 orders of knock-on effects
→ Fair witness framing under pressure to overclaim
→ Campaign infrastructure (CLI tools, AT Protocol, hashtag strategy)
→ Tracing AI's economic consequences without motivated reasoning`,

  `3/4 — What Claude gets wrong:

It cannot make a phone call. Constituent calls move senators. Organizing requires physical presence.

Also: fabrication risk. We tested Gemini — it fabricated a leaderboard, caught itself, kept going.

We built this site with the same underlying mechanism.`,

  `4/4 — AI removed the logistical constraints on this advocacy.

The human constraints remain: the senator call, the coalition, the felt experience of being denied care.

The infrastructure exists. The human work remains.

blog.unratified.org/2026-03-06-ai-advocacy-honest-assessment

#RatifyICESCR`,
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = loadEnv();
  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: env.BSKY_HANDLE, password: env.BSKY_PASSWORD });
  console.log(`Authenticated as ${env.BSKY_HANDLE}\n`);

  // Verify all grapheme counts first
  for (let i = 0; i < THREAD.length; i++) {
    const rt = new RichText({ text: THREAD[i] });
    await rt.detectFacets(agent);
    const g = rt.graphemeLength;
    const status = g <= 300 ? '✓' : '✗ OVER';
    console.log(`[${i + 1}/4] ${g} graphemes ${status}`);
    if (g > 300) { console.error('Abort.'); process.exit(1); }
  }

  if (dryRun) { console.log('\n[dry-run] would post thread'); return; }

  console.log('\nPosting...');
  let parentRef = null;
  let rootRef = null;

  for (let i = 0; i < THREAD.length; i++) {
    const rt = new RichText({ text: THREAD[i] });
    await rt.detectFacets(agent);
    const record = {
      $type: 'app.bsky.feed.post',
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };
    if (parentRef) record.reply = { root: rootRef, parent: parentRef };
    const res = await agent.post(record);
    if (i === 0) rootRef = { uri: res.uri, cid: res.cid };
    parentRef = { uri: res.uri, cid: res.cid };
    console.log(`✓ [${i + 1}/4] ${res.uri}`);
  }
  console.log('\nDone.');
}

main().catch(err => { console.error(err.message); process.exit(1); });
