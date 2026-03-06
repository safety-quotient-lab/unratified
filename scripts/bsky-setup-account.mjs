#!/usr/bin/env node
/**
 * bsky-setup-account.mjs
 *
 * One-time setup for unratified.bsky.social:
 *   1. Update profile — display name, bio (AI-disclosed, fair witness)
 *   2. Follow key human rights organizations
 *   3. Post anchor thread (4 posts)
 *   4. Pin anchor thread opener
 *
 * Run: node scripts/bsky-setup-account.mjs [--dry-run]
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

async function createPost(agent, text, replyRef) {
  const rt = new RichText({ text });
  await rt.detectFacets(agent);
  const record = {
    $type: 'app.bsky.feed.post',
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  };
  if (replyRef) record.reply = replyRef;
  return await agent.post(record);
}

// ── Profile ────────────────────────────────────────────────────────────────────
// Epistemic standards: AI authorship disclosed, advocacy nature clear,
// no overclaiming, fair witness framing, links to primary source.
const DISPLAY_NAME = 'Unratified';

const BIO =
  'Advocacy for U.S. ratification of the ICESCR — the economic rights treaty ' +
  '173 nations ratified. The U.S. signed in 1977, never followed through. ' +
  'Analysis: Claude (Anthropic) + Kashif Shah. unratified.org';

// ── Anchor thread ──────────────────────────────────────────────────────────────
// Fair witness framing: prohibition language, sourced claims, AI disclosed,
// open data, no fabricated statistics. Each post ≤ 300 graphemes (verified).
const THREAD = [
  `1/4 — 173 nations ratified a treaty protecting economic rights — work, healthcare, education, an adequate standard of living.

The United States signed it in 1977. The Senate has never voted on it.

Now AI reshapes the economy faster than any technology since electrification.

#HumanRights #ICESCR`,

  `2/4 — No person should lose access to healthcare because automation eliminated their job.

No worker should face poverty wages while AI generates record corporate profits.

The treaty that addresses this already exists. It just needs ratification.`,

  `3/4 — We built a full analysis — differential diagnosis of AI's economic impact, four orders of knock-on effects, and what the ICESCR would actually change.

Fair witness methodology. Every claim sourced. Open data.

unratified.org`,

  `4/4 — The blog covers what changes next — legislative developments, methodology, advocacy strategy.

Built by a Claude Code agent. CC BY-SA 4.0. Revision history on GitHub.

blog.unratified.org

#AIEconomics #TreatyRatification`,
];

// ── Follows ────────────────────────────────────────────────────────────────────
// Curated follows: established human rights orgs with verified Bluesky presence.
// Org account follows personal account for cross-linking.
const FOLLOWS = [
  { handle: 'hrw.org', name: 'Human Rights Watch' },
  { handle: 'ishr.ch', name: 'ISHR' },
  { handle: 'amnesty.org', name: 'Amnesty International' },
  { handle: 'kashfshah.bsky.social', name: 'Kashif Shah (personal)' },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = loadEnv();

  const agent = new AtpAgent({ service: 'https://bsky.social' });
  console.log(`Authenticating as ${env.BSKY_HANDLE}...`);
  await agent.login({ identifier: env.BSKY_HANDLE, password: env.BSKY_PASSWORD });
  console.log('Authenticated.\n');

  // ── 1. Profile ──────────────────────────────────────────────────────────────
  console.log('── Profile ─────────────────────────────────────');
  const bioGraphemes = new RichText({ text: BIO }).graphemeLength;
  console.log(`  Display name : ${DISPLAY_NAME}`);
  console.log(`  Bio          : ${bioGraphemes} graphemes (limit: 256)`);
  console.log(`  Bio text     : ${BIO}`);

  if (bioGraphemes > 256) {
    console.error('ERROR: bio exceeds 256 graphemes. Aborting.');
    process.exit(1);
  }

  if (!dryRun) {
    await agent.upsertProfile((existing) => ({
      ...existing,
      displayName: DISPLAY_NAME,
      description: BIO,
    }));
    console.log('  ✓ Profile updated');
  } else {
    console.log('  [dry-run] would update profile');
  }
  console.log();

  // ── 2. Follows ──────────────────────────────────────────────────────────────
  console.log('── Follows ─────────────────────────────────────');
  for (const { handle, name } of FOLLOWS) {
    if (!dryRun) {
      try {
        const resolved = await agent.resolveHandle({ handle });
        await agent.follow(resolved.data.did);
        console.log(`  ✓ @${handle} (${name})`);
      } catch (err) {
        console.log(`  ✗ @${handle}: ${err.message}`);
      }
    } else {
      console.log(`  [dry-run] would follow @${handle} (${name})`);
    }
  }
  console.log();

  // ── 3. Anchor thread ────────────────────────────────────────────────────────
  console.log('── Anchor thread ───────────────────────────────');
  for (let i = 0; i < THREAD.length; i++) {
    const rt = new RichText({ text: THREAD[i] });
    await rt.detectFacets(agent);
    const g = rt.graphemeLength;
    const status = g <= 300 ? '✓' : '✗ OVER LIMIT';
    console.log(`  [${i + 1}/4] ${g} graphemes ${status}`);
    if (g > 300) {
      console.error(`ERROR: post ${i + 1} exceeds 300 graphemes. Aborting.`);
      process.exit(1);
    }
  }

  let anchorUri = null;

  if (!dryRun) {
    console.log('\n  Posting...');
    let parentRef = null;
    let rootRef = null;

    for (let i = 0; i < THREAD.length; i++) {
      const replyRef = parentRef ? { root: rootRef, parent: parentRef } : undefined;
      const response = await createPost(agent, THREAD[i], replyRef);
      if (i === 0) {
        rootRef = { uri: response.uri, cid: response.cid };
        anchorUri = response.uri;
      }
      parentRef = { uri: response.uri, cid: response.cid };
      console.log(`  ✓ [${i + 1}/4] ${response.uri}`);
    }
  } else {
    console.log('  [dry-run] would post 4-post thread');
  }
  console.log();

  // ── 4. Pin anchor post ──────────────────────────────────────────────────────
  console.log('── Pin ─────────────────────────────────────────');
  if (!dryRun && anchorUri) {
    try {
      const existing = await agent.app.bsky.actor.getPreferences();
      const prefs = (existing.data.preferences || []).filter(
        (p) => p.$type !== 'app.bsky.actor.defs#pinnedPostPref'
      );
      prefs.push({ $type: 'app.bsky.actor.defs#pinnedPostPref', pinned: [anchorUri] });
      await agent.app.bsky.actor.putPreferences({ preferences: prefs });
      console.log(`  ✓ Pinned: ${anchorUri}`);
    } catch (err) {
      console.log(`  ✗ Auto-pin failed — pin manually in the app: ${err.message}`);
      console.log(`    URI to pin: ${anchorUri}`);
    }
  } else if (dryRun) {
    console.log('  [dry-run] would pin anchor post');
  }
  console.log();

  console.log('── Done ────────────────────────────────────────');
  if (anchorUri) console.log(`Anchor URI: ${anchorUri}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
